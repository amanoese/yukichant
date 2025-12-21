import fs from 'fs';
import path from 'path';

const dirname = path.dirname(new URL(import.meta.url).pathname);

import { distance, closest } from 'fastest-levenshtein';
import { JaroWinklerDistance } from './jaro-winkler.js'; // Jaro-Winkler実装をインポート

import pc from 'picocolors';
import kuromoji from 'kuromoji';
import log from './logger.js';

import fkm from './fuzzy-kanji-match.js';

// Jaro-Winklerインスタンスを作成
const jaroWinkler = new JaroWinklerDistance();

let tokenizer = await new Promise((resolve, reject) => {
  kuromoji
    .builder({ dicPath: `${dirname}/../node_modules/yukidic/dic/` })
    .build(function (err, tokenizer) {
      if (err != null) {
        reject(err);
      }
      resolve(tokenizer);
    });
});

const tokenize = (text) => {
  return tokenizer.tokenize(text);
};

// 文字列の類似度を計算する関数
// Levenshteinフラグが渡された場合はレーベンシュタイン距離を使用
function calculateSimilarity(str1, str2, useLevenshtein = false) {
  if (useLevenshtein) {
    // レーベンシュタイン距離（値が小さいほど似ている）
    return distance(str1, str2);
  } else {
    // Jaro-Winkler距離（値が大きいほど似ている）
    return 1 - jaroWinkler.similarity(str1, str2);
  }
}

// 最も近い単語を見つける関数
function findClosestWord(word, wordList, useLevenshtein = false, option = { v: false, Vv: false }) {
  let closestWord;
  let score;
  let algorithmName;
  
  if (useLevenshtein) {
    // レーベンシュタイン距離を使用
    algorithmName = 'Levenshtein';
    closestWord = closest(word, wordList);
    score = distance(word, closestWord);
  } else {
    // Jaro-Winkler距離を使用
    algorithmName = 'Jaro-Winkler';
    let maxSimilarity = -1;
    closestWord = word;
    
    for (const candidateWord of wordList) {
      const similarity = jaroWinkler.similarity(word, candidateWord);
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        closestWord = candidateWord;
      }
    }
    score = maxSimilarity;
  }
  
  // デバッグ情報の表示（loglevelを使用）
  const color = useLevenshtein ? pc.cyan : pc.yellow;
  log.debug(color(`[${algorithmName}]`), {
    word,
    closestWord,
    [useLevenshtein ? 'distance' : 'similarity']: score,
    wordCount: wordList.length
  });
  
  return closestWord;
}

const exec = (text, option = { is_tfidf: false, v: false, Vv: false, Levenshtein: false }) => {
  let tokens = tokenizer.tokenize(text);
  let ptokens = tokens
    .filter((token) => token.pos_detail_1 === '引用文字列')
    .map((token, i) => ({ i: token.word_position, v: token.surface_form }));
  let ntokens = tokens.filter((token) => token.pos_detail_1 !== '引用文字列');

  if (ntokens.length === 0) {
    return text;
  }

  log.trace('☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆');
  log.trace('ntokens', ntokens.filter((token) => token.pos !== '記号'));
  log.trace('☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆');
  log.trace('ptokens', ptokens);
  log.trace('☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆');

  let fixTokens = organizeUnknownTokens(ntokens, option);
  let fixedTokens = fixTokens
    .filter((token) => token.pos !== '記号')
    // 未知の形態素を修正する
    .map((token) => {
      // 。で終わる文は、。を削除して修正する
      let fixText = token.v.replace(/。$/, '');
      if (option.is_tfidf === true) {
        fixText = nearTokenMatch(fixText, option);
        log.debug('fixText', fixText);
      } else {
        fixText = closest(fixText, fkm.allWord);
      }
      return { ...token, v: fixText };
    });

  let fixedTextTokens = [...ptokens, ...fixedTokens].sort((a, b) => a.i - b.i);
  
  if (option.v) {
    // デバッグオプションで修正前後の文字列を表示する
    let originalText = '';
    let fixedText = '';
    
      fixedTextTokens
        .forEach((token) => {
          const textWidth = Math.max((token.old||"").length, token.v.length);
          if (token.old) {
            originalText += pc.red(token.old.padEnd(textWidth, '　'))
            fixedText += pc.green(token.v.padEnd(textWidth, '　'))
          } else {
            originalText += token.v.padEnd(textWidth, '　')
            fixedText += token.v.padEnd(textWidth, ' 　')
          }
        });  
    console.error(originalText);
    console.error(fixedText);
  
    // 正規化された文字列をもとの文字列
    console.error()
  }

  let fixedText = fixedTextTokens.map((token) => token.v).join('');
  return fixedText;
};

const nearTokenMatch = (tokenStr, option = { isJaroWinklerDistance: false, v: false, Vv: false, Levenshtein: false }) => {
  let minDistance = Infinity;

  log.trace('tokenStr', tokenStr);
  
  let tokens = [...tokenStr];
  for (let i = 0; i < tokens.length; i++) {
    let kanji = tokens[i];
    if (fkm.han.test(kanji)) {
      log.trace('kanji', fkm.maxTfidfSocres(kanji));
      
      for (const result of fkm.maxTfidfSocres(kanji)) {
        let newKanji = result.kanji;
        let text = [...tokens.slice(0, i), newKanji, ...tokens.slice(i + 1)].join('');
        let bestMatchLocal = findClosestWord(text, fkm.allWord, option.Levenshtein, option);
        // もし、最も近い漢字が見つからなかった場合は、次の文字に進む
        let d = calculateSimilarity(text, bestMatchLocal, option.Levenshtein);
        if (d < minDistance) {
          log.trace({
            'd'          : d,
            'minDistance': minDistance,
            'text'       : text,
            'bestMatch'  : bestMatchLocal,
            'kanji'      : kanji,
            'newKanji'   : newKanji
          });
          minDistance = d;
          tokens[i] = newKanji;
          // 一番近い漢字が見つかったら、それを採用して次の文字に進む
          // ただし、最善の漢字ではない可能性がある TODO: 他の候補も検討する
          break;
        }
      }
    }
  }
  return findClosestWord(tokens.join(''), fkm.allWord, option.Levenshtein, option);
};

const organizeUnknownTokens = (ntokens, option = { v: false, Vv: false }) => {
  // tokenの要素から、連続する形態素をまとめる
  let fixTokens = ntokens.reduce((list, token) => {
    let heads = list.slice(0, -1);
    let last = list[list.length - 1];
    let adverb = false;
    // 基本的に辞書にある形態素は引用文字列に分類される
    // そのため、引用文字列以外の形態素は未知の形態素とみなす
    // 未知の形態素に続く副詞は、直前の形態素に付ける
    if (['副詞', '助詞', '助動詞', '記号'].includes(token.pos)) {
      adverb = true;
    }
    
    log.trace(
      token.surface_form,
      token.pos,
      token.pos_detail_1,
      token.pos_detail_2,
      token.pos_detail_3
    );
    // 未知の形態素に続く形態素がない場合は、新しい形態素として追加する
    // 未知の形態素に続く副詞は、直前の形態素に付ける
    if (
      list.length === 0 ||
      (last.adverb === true && adverb === false) ||
      (last.i + last.v.length !== token.word_position) ||
      ((/^[\p{scx=Han}]+$/u).test(token.pos) &&
        last.length >= 2 &&
        last.pos === '名詞')
    ) {
      return [
        ...list,
        {
          i: token.word_position,
          v: token.surface_form,
          old: token.surface_form,
          pos: token.pos,
          adverb
        }
      ];
    }
    // 未知の形態素に続く未知の形態素は、直前の形態素に付ける
    return [
      ...list.slice(0, -1),
      {
        i: last.i,
        v: last.v + token.surface_form,
        old: last.old + token.surface_form,
        adverb
      }
    ];
  }, []);
  return fixTokens;
};

export default { tokenize, exec, organizeUnknownTokens, nearTokenMatch, calculateSimilarity, findClosestWord };
