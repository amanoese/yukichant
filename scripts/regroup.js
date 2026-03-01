#!/usr/bin/env node
/**
 * meisi.json / dousi.json を「読みの先頭N拍」ベースで再グルーピングする。
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PATHS, MORAE_COUNT, buildTokenizer, getReading, getFirstNMorae, getFirstKanji, formatJson } from './helpers.js';

function regroupMeisi(tokenizer, dict, hexOrder) {
  const label = 'meisi';
  const MEISI_MORAE_COUNT = 2; // 名詞は2拍を維持
  const allWords = [];
  for (const [, words] of Object.entries(dict)) {
    // 初回生成時は配列、再実行時はオブジェクトの可能性があるため正規化
    const wordList = Array.isArray(words) ? words : words.words;
    for (const w of wordList) {
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
      subGroupMap.set(key, { firstKanji: entry.firstKanji, firstN: entry.firstN, words: [], readings: [] });
    }
    subGroupMap.get(key).words.push(entry.word);
    subGroupMap.get(key).readings.push(entry.reading);
  }

  // 先頭N拍が同じサブグループをマージ
  const firstNGroups = new Map();
  for (const sg of subGroupMap.values()) {
    if (!firstNGroups.has(sg.firstN)) {
      firstNGroups.set(sg.firstN, { firstKanji: new Set(), words: [], readings: [] });
    }
    const group = firstNGroups.get(sg.firstN);
    group.firstKanji.add(sg.firstKanji);
    group.words.push(...sg.words);
    group.readings.push(...sg.readings);
  }

  const merged = [...firstNGroups.entries()]
    .map(([firstN, data]) => ({ 
      mora: firstN, 
      firstKanji: [...data.firstKanji].sort(),
      words: data.words,
      readings: data.readings
    }))
    .sort((a, b) => b.words.length - a.words.length);

  const selected = merged.slice(0, 256);

  const mapping = {};
  for (let i = 0; i < Math.min(selected.length, hexOrder.length); i++) {
    mapping[hexOrder[i]] = selected[i];
  }

  const totalWords = Object.values(mapping).reduce((sum, v) => sum + v.words.length, 0);
  console.error(`[${label}] キー数: ${Object.keys(mapping).length}, 総単語数: ${totalWords}`);
  return mapping;
}

function regroupDousi(tokenizer, dict, hexOrder) {
  const label = 'dousi';
  const allWords = [];
  for (const [, words] of Object.entries(dict)) {
    const wordList = Array.isArray(words) ? words : words.words;
    for (const w of wordList) {
      const reading = getReading(tokenizer, w);
      const firstN = getFirstNMorae(reading, MORAE_COUNT.DOUSI);
      allWords.push({ word: w, reading, firstN });
    }
  }

  // 先頭N拍ごとにグループ化
  const firstNGroups = new Map();
  for (const entry of allWords) {
    if (!firstNGroups.has(entry.firstN)) {
      firstNGroups.set(entry.firstN, { firstKanji: new Set(), words: [], readings: [] });
    }
    const group = firstNGroups.get(entry.firstN);
    group.firstKanji.add(getFirstKanji(entry.word));
    if (!group.words.includes(entry.word)) {
      group.words.push(entry.word);
      group.readings.push(entry.reading);
    }
  }

  const merged = [...firstNGroups.entries()]
    .map(([firstN, data]) => ({
      mora: firstN,
      firstKanji: [...data.firstKanji].sort(),
      words: data.words,
      readings: data.readings
    }))
    .sort((a, b) => b.words.length - a.words.length);

  const selected = merged.slice(0, 256);

  const mapping = {};
  for (let i = 0; i < Math.min(selected.length, hexOrder.length); i++) {
    mapping[hexOrder[i]] = selected[i];
  }

  const totalWords = Object.values(mapping).reduce((sum, v) => sum + v.words.length, 0);
  console.error(`[${label}] キー数: ${Object.keys(mapping).length}, 総単語数: ${totalWords}`);
  return mapping;
}

function generateMeisiHexOrder() {
  const order = [];
  for (let i = 0; i <= 255; i++) {
    order.push(i.toString(16).toUpperCase().padStart(2, '0'));
  }
  return order;
}

function generateDousiHexOrder() {
  const order = [];
  for (let i = 0; i <= 255; i++) {
    order.push(i.toString(16).toUpperCase().padStart(2, '0'));
  }
  return order;
}

async function main() {
  const tokenizer = await buildTokenizer();
  const meisi = JSON.parse(readFileSync(join(PATHS.DATA, 'meisi.json'), 'utf-8'));
  const dousi = JSON.parse(readFileSync(join(PATHS.DATA, 'dousi.json'), 'utf-8'));

  console.error('=== meisi.json の再グルーピング ===');
  const newMeisi = regroupMeisi(tokenizer, meisi, generateMeisiHexOrder());
  console.error('\n=== dousi.json の再グルーピング ===');
  const newDousi = regroupDousi(tokenizer, dousi, generateDousiHexOrder());

  writeFileSync(join(PATHS.DATA, 'meisi.json'), formatJson(newMeisi));
  writeFileSync(join(PATHS.DATA, 'dousi.json'), formatJson(newDousi));
  console.error('\n書き込み完了: data/meisi.json, data/dousi.json');
}

main().catch(console.error);
