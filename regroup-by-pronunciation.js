#!/usr/bin/env node
/**
 * meisi.json / dousi.json を「読みの先頭2拍」ベースで再グルーピングする。
 *
 * 制約:
 *   - 同じ先頭漢字の単語が別のコードに分裂しないようにする
 *   - 先頭漢字が同じでも読みの先頭2拍が異なる場合はサブグループに分割する
 *   - 異なるコード間で先頭2拍が衝突しないようにする
 *
 * アルゴリズム:
 *   1. 各単語の読み（先頭2拍）を kuromoji で取得
 *   2. (先頭漢字, 先頭2拍) の組み合わせでサブグループを作成
 *   3. 先頭2拍が同じサブグループ同士をマージ（先頭漢字は異なってもOK）
 *   4. マージ後のグループを語数順にソートし、上位256グループを採用
 *   5. 16進コードに割り当てて出力
 */
import kuromoji from 'kuromoji';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function buildTokenizer() {
  return new Promise((resolve, reject) => {
    kuromoji
      .builder({ dicPath: join(__dirname, 'node_modules', 'yukidic', 'dic') })
      .build((err, tokenizer) => {
        if (err) reject(err);
        else resolve(tokenizer);
      });
  });
}

function getReading(tokenizer, word) {
  const tokens = tokenizer.tokenize(word);
  return tokens.map(t => t.reading || t.surface_form).join('');
}

function katakanaToHiragana(str) {
  return str.replace(/[\u30A1-\u30F6]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

function getFirst2Morae(reading) {
  const hira = katakanaToHiragana(reading);
  const morae = [];
  const smallKana = 'ぁぃぅぇぉゃゅょゎっ';
  for (let i = 0; i < hira.length && morae.length < 2; i++) {
    let mora = hira[i];
    if (i + 1 < hira.length && smallKana.includes(hira[i + 1])) {
      mora += hira[i + 1];
      i++;
    }
    morae.push(mora);
  }
  return morae.join('');
}

function getFirstKanji(word) {
  const m = word.match(/^\p{scx=Han}/u);
  return m ? m[0] : word[0];
}

/**
 * 名詞辞書を再グルーピングする（読みの先頭2拍ベース）
 *
 * 制約:
 *   - 同じ先頭漢字 × 同じ先頭2拍 の単語は必ず同じコードに入る
 *   - 先頭漢字が同じでも読みの先頭2拍が異なれば別コードに分割してよい
 *   - 異なるコード間で先頭2拍が衝突しないようにする
 *   - 256コードを埋めるため、先頭2拍が同じサブグループをマージする
 *
 * アルゴリズム:
 *   1. 各単語の先頭漢字と先頭2拍を取得
 *   2. (先頭漢字, 先頭2拍) でサブグループを作成
 *   3. 先頭2拍が同じサブグループ同士をマージ（先頭漢字が被ってもOK）
 *   4. 語数順にソートして256コードに割り当て
 */
function regroupMeisi(tokenizer, dict, hexOrder) {
  const label = 'meisi';
  const allWords = [];
  for (const [, words] of Object.entries(dict)) {
    for (const w of words) {
      const reading = getReading(tokenizer, w);
      const first2 = getFirst2Morae(reading);
      const firstKanji = getFirstKanji(w);
      allWords.push({ word: w, reading, first2, firstKanji });
    }
  }

  // (先頭漢字, 先頭2拍) でサブグループを作成
  const subGroupMap = new Map();
  for (const entry of allWords) {
    const key = `${entry.firstKanji}|${entry.first2}`;
    if (!subGroupMap.has(key)) {
      subGroupMap.set(key, { firstKanji: entry.firstKanji, first2: entry.first2, words: [] });
    }
    subGroupMap.get(key).words.push(entry.word);
  }

  // 先頭2拍が同じサブグループをマージ
  const first2Groups = new Map();
  for (const sg of subGroupMap.values()) {
    if (!first2Groups.has(sg.first2)) {
      first2Groups.set(sg.first2, []);
    }
    first2Groups.get(sg.first2).push(...sg.words);
  }

  const merged = [...first2Groups.entries()]
    .map(([first2, words]) => ({ first2, words }))
    .sort((a, b) => b.words.length - a.words.length);

  const selected = merged.slice(0, 256);

  const mapping = {};
  for (let i = 0; i < Math.min(selected.length, hexOrder.length); i++) {
    mapping[hexOrder[i]] = selected[i].words;
  }

  const totalWords = Object.values(mapping).reduce((sum, v) => sum + v.length, 0);
  console.error(`[${label}] キー数: ${Object.keys(mapping).length}, 総単語数: ${totalWords}`);
  if (merged.length > 256) {
    const dropped = merged.slice(256);
    const droppedWords = dropped.reduce((sum, g) => sum + g.words.length, 0);
    console.error(`[${label}] 割り当て外: ${dropped.length}グループ (${droppedWords}語)`);
  }
  return mapping;
}

/**
 * 動詞辞書を再グルーピングする（読みの先頭2拍ベース）
 *
 * 動詞は活用形で先頭2拍の末尾が変わるのが自然なので、
 * 同一コード内の先頭2拍不一致を分割しつつ、256キーを維持する。
 *
 * 処理:
 *   1. 各コードの単語を先頭2拍でサブグループに分割
 *   2. 最多の先頭2拍を持つサブグループをそのコードに残す
 *   3. 少数派のサブグループは溢れリストに入れる
 *   4. 溢れた単語を空きスロットに割り当てる
 */
function regroupDousi(tokenizer, dict, hexOrder) {
  const label = 'dousi';

  const mapping = {};
  const overflow = []; // 分割で溢れたサブグループ

  for (const [code, words] of Object.entries(dict)) {
    if (words.length === 0) continue;

    // 先頭2拍ごとにサブグループ化
    const byFirst2 = new Map();
    for (const w of words) {
      const reading = getReading(tokenizer, w);
      const first2 = getFirst2Morae(reading);
      if (!byFirst2.has(first2)) byFirst2.set(first2, []);
      byFirst2.get(first2).push(w);
    }

    if (byFirst2.size === 1) {
      // 先頭2拍が1種類 → そのまま
      mapping[code] = words;
    } else {
      // 最多の先頭2拍をこのコードに残し、残りはoverflowへ
      const sorted = [...byFirst2.entries()].sort((a, b) => b[1].length - a[1].length);
      mapping[code] = sorted[0][1];
      for (let i = 1; i < sorted.length; i++) {
        overflow.push({ first2: sorted[i][0], words: sorted[i][1] });
      }
    }
  }

  // overflowのサブグループを空きスロットに割り当て
  // まず先頭2拍が同じoverflowグループ同士をマージ
  overflow.sort((a, b) => b.words.length - a.words.length);
  const mergedOverflow = [];
  const used = new Set();
  for (let i = 0; i < overflow.length; i++) {
    if (used.has(i)) continue;
    const group = { first2: overflow[i].first2, words: [...overflow[i].words] };
    used.add(i);
    for (let j = i + 1; j < overflow.length; j++) {
      if (used.has(j)) continue;
      if (overflow[j].first2 !== group.first2) continue;
      group.words.push(...overflow[j].words);
      used.add(j);
    }
    mergedOverflow.push(group);
  }
  mergedOverflow.sort((a, b) => b.words.length - a.words.length);

  // 空きコードにoverflowを割り当て
  const usedCodes = new Set(Object.keys(mapping));
  const availableCodes = hexOrder.filter(h => !usedCodes.has(h));
  for (let i = 0; i < Math.min(mergedOverflow.length, availableCodes.length); i++) {
    mapping[availableCodes[i]] = mergedOverflow[i].words;
  }

  const totalWords = Object.values(mapping).reduce((sum, v) => sum + v.length, 0);
  const assignedKeys = Object.keys(mapping).length;
  console.error(`[${label}] キー数: ${assignedKeys}, 総単語数: ${totalWords}`);

  if (mergedOverflow.length > availableCodes.length) {
    const dropped = mergedOverflow.slice(availableCodes.length);
    const droppedWords = dropped.reduce((sum, g) => sum + g.words.length, 0);
    console.error(`[${label}] 割り当て外: ${dropped.length}グループ (${droppedWords}語)`);
  }

  return mapping;
}

function generateMeisiHexOrder() {
  const priority = [10, 227, 129, 130, 131];
  const excludeFromMiddle = new Set([129, 130, 131, 223, 227]);
  const middle = [];
  for (let i = 32; i <= 255; i++) {
    if (!excludeFromMiddle.has(i)) middle.push(i);
  }
  const tail = [];
  for (let i = 0; i <= 31; i++) {
    if (i !== 10) tail.push(i);
  }
  const all = [...priority, ...middle, ...tail, 223];
  return all.map(n => n.toString(16).toUpperCase().padStart(2, '0'));
}

function generateDousiHexOrder() {
  const order = [];
  for (let i = 32; i <= 255; i++) order.push(i);
  for (let i = 0; i <= 31; i++) order.push(i);
  return order.map(n => n.toString(16).toUpperCase().padStart(2, '0'));
}

function formatJson(mapping) {
  const keys = Object.keys(mapping).sort();
  const lines = keys.map(key => {
    const values = mapping[key].map(v => `"${v}"`).join(', ');
    return `  "${key}": [${values}]`;
  });
  return '{\n' + lines.join(',\n') + '\n}\n';
}

async function main() {
  const tokenizer = await buildTokenizer();

  const meisi = JSON.parse(readFileSync(join(__dirname, 'data', 'meisi.json'), 'utf-8'));
  const dousi = JSON.parse(readFileSync(join(__dirname, 'data', 'dousi.json'), 'utf-8'));

  console.error('=== meisi.json の再グルーピング ===');
  const meisiHexOrder = generateMeisiHexOrder();
  const newMeisi = regroupMeisi(tokenizer, meisi, meisiHexOrder);

  console.error('\n=== dousi.json の再グルーピング ===');
  const dousiHexOrder = generateDousiHexOrder();
  const newDousi = regroupDousi(tokenizer, dousi, dousiHexOrder);

  writeFileSync(join(__dirname, 'data', 'meisi.json'), formatJson(newMeisi));
  writeFileSync(join(__dirname, 'data', 'dousi.json'), formatJson(newDousi));

  console.error('\n書き込み完了: data/meisi.json, data/dousi.json');
}

main().catch(console.error);
