#!/usr/bin/env node
/**
 * meisi.json / dousi.json を「読みの先頭N拍」ベースで再グルーピングする。
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PATHS, MORAE_COUNT, buildTokenizer, getReading, getFirstNMorae, getFirstKanji, formatJson } from './helpers.js';

function regroupMeisi(tokenizer, dict, hexOrder) {
  const label = 'meisi';
  const allWords = [];
  for (const [, words] of Object.entries(dict)) {
    for (const w of words) {
      const reading = getReading(tokenizer, w);
      const firstN = getFirstNMorae(reading, MORAE_COUNT.MEISI);
      const firstKanji = getFirstKanji(w);
      allWords.push({ word: w, reading, firstN, firstKanji });
    }
  }

  const subGroupMap = new Map();
  for (const entry of allWords) {
    const key = `${entry.firstKanji}|${entry.firstN}`;
    if (!subGroupMap.has(key)) {
      subGroupMap.set(key, { firstKanji: entry.firstKanji, firstN: entry.firstN, words: [] });
    }
    subGroupMap.get(key).words.push(entry.word);
  }

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
  return mapping;
}

function regroupDousi(tokenizer, dict, hexOrder) {
  const label = 'dousi';
  const mapping = {};
  const overflow = [];

  for (const [code, words] of Object.entries(dict)) {
    if (words.length === 0) continue;

    const byFirstN = new Map();
    for (const w of words) {
      const reading = getReading(tokenizer, w);
      const firstN = getFirstNMorae(reading, MORAE_COUNT.DOUSI);
      if (!byFirstN.has(firstN)) byFirstN.set(firstN, []);
      byFirstN.get(firstN).push(w);
    }

    if (byFirstN.size === 1) {
      mapping[code] = words;
    } else {
      const sorted = [...byFirstN.entries()].sort((a, b) => b[1].length - a[1].length);
      mapping[code] = sorted[0][1];
      for (let i = 1; i < sorted.length; i++) {
        overflow.push({ firstN: sorted[i][0], words: sorted[i][1] });
      }
    }
  }

  const finalMapping = { ...mapping };
  const firstNToCode = new Map();
  for (const [code, words] of Object.entries(finalMapping)) {
    const reading = getReading(tokenizer, words[0]);
    const firstN = getFirstNMorae(reading, MORAE_COUNT.DOUSI);
    firstNToCode.set(firstN, code);
  }

  const remainingOverflow = [];
  for (const item of overflow) {
    if (firstNToCode.has(item.firstN)) {
      const code = firstNToCode.get(item.firstN);
      finalMapping[code] = [...new Set([...finalMapping[code], ...item.words])];
    } else {
      remainingOverflow.push(item);
    }
  }

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

  const usedCodes = new Set(Object.keys(finalMapping));
  const availableCodes = hexOrder.filter(h => !usedCodes.has(h));
  for (let i = 0; i < Math.min(mergedOverflow.length, availableCodes.length); i++) {
    finalMapping[availableCodes[i]] = mergedOverflow[i].words;
  }

  const totalWords = Object.values(finalMapping).reduce((sum, v) => sum + v.length, 0);
  console.error(`[${label}] キー数: ${Object.keys(finalMapping).length}, 総単語数: ${totalWords}`);
  return finalMapping;
}

function generateMeisiHexOrder() {
  const priority = [10, 227, 129, 130, 131];
  const excludeFromMiddle = new Set([129, 130, 131, 223]);
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
