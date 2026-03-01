#!/usr/bin/env node
/**
 * meisi.json / dousi.json を「読みの先頭N拍」ベースで再グルーピングする。
 * N は MORAE_COUNT で指定。2拍のままとする（3拍にしても同音異義語は解消しないため。検証結果は後述）。
 *
 * 制約:
 *   - 同じ先頭漢字の単語が別のコードに分裂しないようにする
 *   - 先頭漢字が同じでも読みの先頭N拍が異なる場合はサブグループに分割する
 *   - 異なるコード間で先頭N拍が衝突しないようにする
 *
 * アルゴリズム:
 *   1. 各単語の読み（先頭N拍）を kuromoji で取得
 *   2. (先頭漢字, 先頭N拍) の組み合わせでサブグループを作成
 *   3. 先頭N拍が同じサブグループ同士をマージ（先頭漢字は異なってもOK）
 *   4. マージ後のグループを語数順にソートし、上位256グループを採用
 *   5. 16進コードに割り当てて出力
 */
const MORAE_COUNT = 3;
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

function getFirstNMorae(reading, n) {
  const hira = katakanaToHiragana(reading);
  const morae = [];
  const smallKana = 'ぁぃぅぇぉゃゅょゎっ';
  for (let i = 0; i < hira.length && morae.length < n; i++) {
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
 * 名詞辞書を再グルーピングする（読みの先頭N拍ベース）
 *
 * 制約:
 *   - 同じ先頭漢字 × 同じ先頭N拍 の単語は必ず同じコードに入る
 *   - 先頭漢字が同じでも読みの先頭N拍が異なれば別コードに分割してよい
 *   - 異なるコード間で先頭N拍が衝突しないようにする
 *   - 256コードを埋めるため、先頭N拍が同じサブグループをマージする
 *
 * アルゴリズム:
 *   1. 各単語の先頭漢字と先頭N拍を取得
 *   2. (先頭漢字, 先頭N拍) でサブグループを作成
 *   3. 先頭N拍が同じサブグループ同士をマージ（先頭漢字が被ってもOK）
 *   4. 語数順にソートして256コードに割り当て
 */
function regroupMeisi(tokenizer, dict, hexOrder) {
  const label = 'meisi';
  const MEISI_MORAE_COUNT = 2; // 名詞は2拍を維持
  const allWords = [];
  for (const [, words] of Object.entries(dict)) {
    for (const w of words) {
      const reading = getReading(tokenizer, w);
      const firstN = getFirstNMorae(reading, MEISI_MORAE_COUNT);
      const firstKanji = getFirstKanji(w);
      allWords.push({ word: w, reading, firstN, firstKanji });
    }
  }

  // (先頭漢字, 先頭N拍) でサブグループを作成
  const subGroupMap = new Map();
  for (const entry of allWords) {
    const key = `${entry.firstKanji}|${entry.firstN}`;
    if (!subGroupMap.has(key)) {
      subGroupMap.set(key, { firstKanji: entry.firstKanji, firstN: entry.firstN, words: [] });
    }
    subGroupMap.get(key).words.push(entry.word);
  }

  // 先頭N拍が同じサブグループをマージ
  const firstNGroups = new Map();
  for (const sg of subGroupMap.values()) {
    if (!firstNGroups.has(sg.firstN)) {
      firstNGroups.set(sg.firstN, []);
    }
    firstNGroups.get(sg.firstN).push(...sg.words);
  }

  const merged = [...firstNGroups.entries()]
    .map(([firstN, words]) => ({ firstN, words }))
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
 * 動詞辞書を再グルーピングする（読みの先頭N拍ベース）
 *
 * 動詞は活用形で先頭N拍の末尾が変わるのが自然なので、
 * 同一コード内の先頭N拍不一致を分割しつつ、256キーを維持する。
 *
 * 処理:
 *   1. 各コードの単語を先頭N拍でサブグループに分割
 *   2. 最多の先頭N拍を持つサブグループをそのコードに残す
 *   3. 少数派のサブグループは溢れリストに入れる
 *   4. 溢れた単語を空きスロットに割り当てる
 *
 * 【変更】3拍で完全一致する読み（同音異義語）は同じコードにマージする。
 */
function regroupDousi(tokenizer, dict, hexOrder) {
  const label = 'dousi';

  const mapping = {};
  const overflow = []; // 分割で溢れたサブグループ

  for (const [code, words] of Object.entries(dict)) {
    if (words.length === 0) continue;

    // 先頭N拍ごとにサブグループ化
    const byFirstN = new Map();
    for (const w of words) {
      const reading = getReading(tokenizer, w);
      const firstN = getFirstNMorae(reading, MORAE_COUNT);
      if (!byFirstN.has(firstN)) byFirstN.set(firstN, []);
      byFirstN.get(firstN).push(w);
    }

    if (byFirstN.size === 1) {
      // 先頭N拍が1種類 → そのまま
      mapping[code] = words;
    } else {
      // 最多の先頭N拍をこのコードに残し、残りはoverflowへ
      const sorted = [...byFirstN.entries()].sort((a, b) => b[1].length - a[1].length);
      mapping[code] = sorted[0][1];
      for (let i = 1; i < sorted.length; i++) {
        overflow.push({ firstN: sorted[i][0], words: sorted[i][1] });
      }
    }
  }

  // overflowのサブグループを空きスロットに割り当て
  // まず先頭N拍が同じoverflowグループ同士をマージ
  // さらに、既存のmappingにあるコードとも先頭N拍が同じならマージする
  const finalMapping = { ...mapping };
  const firstNToCode = new Map();
  for (const [code, words] of Object.entries(finalMapping)) {
    const reading = getReading(tokenizer, words[0]);
    const firstN = getFirstNMorae(reading, MORAE_COUNT);
    firstNToCode.set(firstN, code);
  }

  const remainingOverflow = [];
  for (const item of overflow) {
    if (firstNToCode.has(item.firstN)) {
      // 既存のコードに同じ読み（先頭N拍）があればマージ
      const code = firstNToCode.get(item.firstN);
      finalMapping[code] = [...new Set([...finalMapping[code], ...item.words])];
    } else {
      remainingOverflow.push(item);
    }
  }

  // まだ残っているoverflowをマージ
  const mergedOverflow = [];
  const used = new Set();
  for (let i = 0; i < remainingOverflow.length; i++) {
    if (used.has(i)) continue;
    const group = { firstN: remainingOverflow[i].firstN, words: [...remainingOverflow[i].words] };
    used.add(i);
    for (let j = i + 1; j < remainingOverflow.length; j++) {
      if (used.has(j)) continue;
      if (remainingOverflow[j].firstN !== group.firstN) continue;
      group.words.push(...remainingOverflow[j].words);
      used.add(j);
    }
    mergedOverflow.push(group);
  }
  mergedOverflow.sort((a, b) => b.words.length - a.words.length);

  // 空きコードにoverflowを割り当て
  const usedCodes = new Set(Object.keys(finalMapping));
  const availableCodes = hexOrder.filter(h => !usedCodes.has(h));
  for (let i = 0; i < Math.min(mergedOverflow.length, availableCodes.length); i++) {
    finalMapping[availableCodes[i]] = mergedOverflow[i].words;
  }

  const totalWords = Object.values(finalMapping).reduce((sum, v) => sum + v.length, 0);
  const assignedKeys = Object.keys(finalMapping).length;
  console.error(`[${label}] キー数: ${assignedKeys}, 総単語数: ${totalWords}`);

  if (mergedOverflow.length > availableCodes.length) {
    const dropped = mergedOverflow.slice(availableCodes.length);
    const droppedWords = dropped.reduce((sum, g) => sum + g.words.length, 0);
    console.error(`[${label}] 割り当て外: ${dropped.length}グループ (${droppedWords}語)`);
  }

  return finalMapping;
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
