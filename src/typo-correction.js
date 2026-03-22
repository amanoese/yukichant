import { distance, closest } from 'fastest-levenshtein';
import { diffChars } from 'diff';
import { JaroWinklerDistance } from './jaro-winkler.js';
import log from './logger.js';
import pc from 'picocolors';

const jaroWinkler = new JaroWinklerDistance();

function colorDiffLines(oldStr, newStr) {
  const parts = diffChars(oldStr, newStr);
  let origLine = '';
  let fixLine = '';
  for (const part of parts) {
    if (part.added) {
      fixLine += pc.green(pc.bold(part.value));
    } else if (part.removed) {
      origLine += pc.red(pc.strikethrough(part.value));
    } else {
      origLine += pc.dim(part.value);
      fixLine += pc.dim(part.value);
    }
  }
  return { origLine, fixLine };
}

let tokenizer = null;
let fkm = null;

/**
 * typo-correctionモジュールを初期化する
 * @param {Object} params
 * @param {Object} params.tokenizer - kuromoji等のtokenizerインスタンス（tokenize(text)メソッドを持つ）
 * @param {Object} params.fuzzyKanjiMatch - fuzzy-kanji-matchモジュール
 */
export function initTypoCorrection({ tokenizer: _tokenizer, fuzzyKanjiMatch }) {
  tokenizer = _tokenizer;
  fkm = fuzzyKanjiMatch;
}

const tokenize = (text) => {
  if (!tokenizer) {
    throw new Error('typo-correctionが初期化されていません。initTypoCorrection()を先に呼び出してください。');
  }
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
    // 1回目のスコアリング: 現在のJaro-Winkler設定で全候補を評価
    const jaroScored = wordList
      .map((candidateWord, index) => ({
        index,
        candidateWord,
        similarity: jaroWinkler.similarity(word, candidateWord),
      }))
      .sort((a, b) => {
        if (b.similarity !== a.similarity) {
          return b.similarity - a.similarity;
        }
        return a.index - b.index;
      });

    const bestJaro = jaroScored[0];
    const secondJaro = jaroScored[1];
    const gapThreshold =
      typeof option.jaroGapThreshold === 'number'
        ? option.jaroGapThreshold
        : typeof option.jaroLevenshteinGapThreshold === 'number'
          ? option.jaroLevenshteinGapThreshold
        : 0.02;

    closestWord = bestJaro?.candidateWord ?? word;
    score = bestJaro?.similarity ?? 0;

    // 上位差が小さいときだけ「接頭辞一致を強めたJaro-Winkler」で再判定する
    if (secondJaro && bestJaro.similarity - secondJaro.similarity <= gapThreshold) {
      // 1位との差が閾値以内の候補だけを曖昧候補として再比較対象にする
      const ambiguousCandidates = jaroScored
        .filter((item) => bestJaro.similarity - item.similarity <= gapThreshold)
        .map((item) => ({
          index: item.index,
          candidateWord: item.candidateWord,
          baseSimilarity: item.similarity,
        }));

      const boostedPrefixScale =
        typeof option.jaroBoostedPrefixScale === 'number'
          ? option.jaroBoostedPrefixScale
          : 0.3;
      const boostedJaroWinkler = new JaroWinklerDistance(
        boostedPrefixScale,
        jaroWinkler.boostThreshold,
        jaroWinkler.prefixLength
      );

      // 2回目のスコアリング:
      // 1) boostedSimilarity 2) baseSimilarity 3) 元の候補順 の順で決着
      const boostedScored = ambiguousCandidates
        .map((item) => ({
          ...item,
          boostedSimilarity: boostedJaroWinkler.similarity(word, item.candidateWord),
        }))
        .sort((a, b) => {
          if (b.boostedSimilarity !== a.boostedSimilarity) {
            return b.boostedSimilarity - a.boostedSimilarity;
          }
          if (b.baseSimilarity !== a.baseSimilarity) {
            return b.baseSimilarity - a.baseSimilarity;
          }
          return a.index - b.index;
        });

      // 同点の最終タイブレークは「先に現れた候補」を採用する
      closestWord = boostedScored[0]?.candidateWord ?? closestWord;
      score = boostedScored[0]?.boostedSimilarity ?? score;
      algorithmName = 'Jaro-Winkler(boosted)';
    }
  }
  
  log.debug(`[${algorithmName}]`, {
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

  log.debug('----------------------------------');
  log.debug('ntokens', ntokens.filter((token) => token.pos !== '記号'));
  log.debug('----------------------------------');
  log.debug('ptokens', ptokens);
  log.debug('----------------------------------');

  let fixTokens = organizeUnknownTokens(ntokens, option);
  let fixedTokens = fixTokens
    .filter((token) => token.pos !== '記号')
    // 未知の形態素を修正する
    .map((token) => {
      // 。で終わる文は、。を削除して修正する
      let fixText = token.v.replace(/。$/, '');
      const originalText = fixText;
      if (option.is_tfidf === true) {
        fixText = nearTokenMatch(fixText, option);
      } else {
        fixText = findClosestWord(fixText, fkm.allWord, option.Levenshtein, option);
      }
      if (originalText !== fixText) {
        const { origLine, fixLine } = colorDiffLines(originalText, fixText);
        log.debug('----------------------------------');
        log.debug(origLine);
        log.debug(fixLine);
        log.debug('----------------------------------');
      }
      return { ...token, v: fixText };
    });

  let fixedTextTokens = [...ptokens, ...fixedTokens].sort((a, b) => a.i - b.i);
  
  const hasChanges = fixedTextTokens.some((token) => token.old && token.old !== token.v);
  if (hasChanges) {
    const diffs = fixedTextTokens.map((token) => ({
      old: token.old || token.v,
      fixed: token.v,
      changed: !!(token.old && token.old !== token.v),
    }));

    if (typeof option.onDiff === 'function') {
      option.onDiff(diffs);
    }

    if (option.v) {
      const oldText = diffs.map(d => d.old).join('');
      const fixedText = diffs.map(d => d.fixed).join('');
      const { origLine, fixLine } = colorDiffLines(oldText, fixedText);
      console.error(origLine);
      console.error(fixLine);
    }
  } else if (typeof option.onDiff === 'function') {
    option.onDiff(null);
  }

  let fixedText = fixedTextTokens.map((token) => token.v).join('');
  return fixedText;
};

const nearTokenMatch = (tokenStr, option = { isJaroWinklerDistance: false, v: false, Vv: false, Levenshtein: false }) => {
  log.debug('tokenStr', tokenStr);
  
  let tokens = [...tokenStr];
  // bestMatch: 現時点での全体最良候補（文字列）
  // bestDistance: bestMatchと入力の距離（小さいほど良い）
  let bestMatch = null;
  let bestDistance = Infinity;
  
  // 各漢字を順番に置き換えて、最適な組み合わせを見つける
  // 各位置で最適な候補を選び、それを次の位置の評価に使用する
  let currentTokens = [...tokens];
  
  for (let i = 0; i < tokens.length; i++) {
    let kanji = tokens[i];
    if (fkm.han.test(kanji)) {
      log.debug('kanji', fkm.maxTfidfSocres(kanji));
      
      let bestKanji = kanji;
      let bestLocalDistance = Infinity;
      
      // この位置だけを差し替えた候補文字列を作り、局所的に最良の漢字を選ぶ
      for (const result of fkm.maxTfidfSocres(kanji)) {
        let newKanji = result.kanji;
        let testTokens = [...currentTokens];
        testTokens[i] = newKanji;
        let testText = testTokens.join('');
        
        // 置き換えた後の文字列全体に対して最適なマッチを見つける
        let bestMatchLocal = findClosestWord(testText, fkm.allWord, option.Levenshtein, option);
        // 置き換えた後の文字列と最適なマッチの距離を計算
        let d = calculateSimilarity(testText, bestMatchLocal, option.Levenshtein);
        
        log.debug({
          'd'          : d,
          'bestLocalDistance': bestLocalDistance,
          'testText'   : testText,
          'bestMatch'  : bestMatchLocal,
          'kanji'      : kanji,
          'newKanji'   : newKanji
        });
        
        // より良い候補が見つかった場合
        if (d < bestLocalDistance) {
          bestLocalDistance = d;
          bestKanji = newKanji;
        }
      }
      
      // 局所最適だった漢字を採用して、次の位置の探索に引き継ぐ
      currentTokens[i] = bestKanji;
      
      // 採用後の全文字列で再評価し、グローバル最良候補を更新する
      let currentText = currentTokens.join('');
      let currentBestMatch = findClosestWord(currentText, fkm.allWord, option.Levenshtein, option);
      let currentDistance = calculateSimilarity(currentText, currentBestMatch, option.Levenshtein);
      
      if (currentDistance < bestDistance) {
        bestDistance = currentDistance;
        bestMatch = currentBestMatch;
      }
    }
  }
  
  // 逐次探索で最良候補が得られていれば、それを最終結果として返す
  if (bestMatch !== null) {
    return bestMatch;
  }
  
  // 漢字置換が1回も走らなかった場合のフォールバック（元文字列を直接マッチ）
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
    
    log.debug(
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
      // 動詞の直後に名詞が来た場合は連結しない
      (last.pos === '動詞' && token.pos === '名詞') ||
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
