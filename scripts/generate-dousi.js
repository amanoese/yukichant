#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { distance } from 'fastest-levenshtein';
import { PATHS, buildTokenizer, removeSmallKanaEnd } from './helpers.js';

function getMeisiList() {
  const output = execSync(`node scripts/generate-meisi.js`, { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
  return output.split('\n').filter(Boolean);
}

function buildReadingToKanjiMap(tokenizer) {
  const tid = tokenizer.token_info_dictionary;
  const map = new Map();

  for (const key of Object.keys(tid.target_map)) {
    for (const id of tid.target_map[key]) {
      const features = tid.getFeatures(id.toString());
      if (!features) continue;
      const f = features.split(',');
      const pos = f[1];
      const conjugation = f[6];
      const baseform = f[7];
      const reading = f[8];
      if (pos !== '動詞' || conjugation !== '基本形') continue;
      if (!baseform || !reading) continue;
      if (!/\p{scx=Han}/u.test(baseform)) continue;

      if (!map.has(reading)) map.set(reading, new Set());
      map.get(reading).add(baseform);
    }
  }
  return map;
}

function extractVerbs(meisiList, readingToKanji) {
  const base64Text = readFileSync(PATHS.SPELL, 'utf-8');
  const decodedText = Buffer.from(base64Text, 'base64').toString('utf-8');
  const mecabOutput = execSync('mecab', { input: decodedText, encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });

  const lines = mecabOutput.replace(/\t/g, ',').split('\n');
  const verbs = new Set();
  const hiraganaBaseforms = new Map();

  for (const line of lines) {
    const f = line.split(',');
    const surface = f[0];
    const pos = f[1] || '';
    const baseform = f[7] || '';
    const reading = f[8] || '';
    if (!/動詞/.test(pos) || /助動詞/.test(pos)) continue;

    if (/\p{scx=Han}/u.test(surface)) {
      verbs.add(surface);
      continue;
    }

    if (/^\p{scx=Hiragana}+$/u.test(surface) && baseform && reading && baseform.length >= 3) {
      if (!hiraganaBaseforms.has(baseform)) {
        hiraganaBaseforms.set(baseform, { surfaces: new Set(), reading: null });
      }
      hiraganaBaseforms.get(baseform).surfaces.add(surface);
    }
  }

  const hiraBaseList = [...hiraganaBaseforms.keys()];
  if (hiraBaseList.length > 0) {
    const mecabBase = execSync('mecab', { input: hiraBaseList.join('\n'), encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
    for (const line of mecabBase.replace(/\t/g, ',').split('\n')) {
      const f = line.split(',');
      const surface = f[0];
      const reading = f[8] || '';
      if (hiraganaBaseforms.has(surface) && reading) {
        hiraganaBaseforms.get(surface).reading = reading;
      }
    }

    const kanjiCandidates = [];
    for (const [, { reading }] of hiraganaBaseforms) {
      if (!reading) continue;
      const kanjiBaseforms = readingToKanji.get(reading);
      if (!kanjiBaseforms) continue;
      for (const kanjiBase of kanjiBaseforms) {
        kanjiCandidates.push({ kanjiBase, expectedReading: reading });
      }
    }

    if (kanjiCandidates.length > 0) {
      const checkInput = kanjiCandidates.map(c => c.kanjiBase).join('\n');
      const checkOutput = execSync('mecab', { input: checkInput, encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
      const checkLines = checkOutput.split('EOS\n').filter(Boolean);

      for (let i = 0; i < kanjiCandidates.length && i < checkLines.length; i++) {
        const firstLine = checkLines[i].trim().split('\n')[0] || '';
        const f = firstLine.replace(/\t/g, ',').split(',');
        const pos = f[1] || '';
        const actualReading = f[8] || '';
        if (/動詞/.test(pos) && !/助動詞/.test(pos) && actualReading === kanjiCandidates[i].expectedReading) {
          verbs.add(kanjiCandidates[i].kanjiBase);
        }
      }
    }
  }

  const meisiSet = new Set(meisiList);
  return [...verbs]
    .filter(w => w.length >= 2 && /\p{scx=Han}/u.test(w) && !meisiSet.has(w))
    .sort();
}

function getMecabInfo(verbs) {
  const input = verbs.join('\n');
  const mecabOutput = execSync('mecab', { input, encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
  const lines = mecabOutput.replace(/\t/g, ',').split('\n');

  const results = [];
  for (const line of lines) {
    const f = line.split(',');
    const surface = f[0];
    const baseform = f[7] || surface;
    if (!surface || surface === 'EOS' || !surface.trim()) continue;
    results.push({ surface, baseform });
  }
  return results;
}

function scoreFilterAndGroup(verbs) {
  const ngWords = readFileSync(PATHS.NG_WORDS, 'utf-8').split('\n').filter(l => l.trim() && !l.startsWith('#'));
  const cleanVerbs = verbs.filter(v => !ngWords.some(ng => v.includes(ng)));
  const filteredVerbs = removeSmallKanaEnd(cleanVerbs);

  const mecabInfo = getMecabInfo(filteredVerbs);
  const baseforms = mecabInfo.map(m => m.baseform);

  const scored = filteredVerbs.map(verb => {
    const count = baseforms.filter(bf => distance(verb, bf) <= 1).length;
    return { verb, count };
  });

  scored.sort((a, b) => b.count - a.count);

  const sortedVerbs = scored.map(s => s.verb);
  const filtered = sortedVerbs.filter(verb => {
    const matchCount = sortedVerbs.filter(other => other.includes(verb)).length;
    return matchCount === 1;
  });

  const filteredSet = new Set(filtered);
  const filteredMecab = getMecabInfo(filtered);
  const groups = new Map();
  for (const { surface, baseform } of filteredMecab) {
    if (!filteredSet.has(surface)) continue;
    if (!groups.has(baseform)) groups.set(baseform, []);
    groups.get(baseform).push(surface);
  }

  const sortedGroups = [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length);

  const result = [];
  for (const [, forms] of sortedGroups) {
    if (result.length >= 256) break;
    result.push(forms);
  }
  return result;
}

function generateHexOrder() {
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
  const readingToKanji = buildReadingToKanjiMap(tokenizer);
  const meisiList = getMeisiList();
  const verbs = extractVerbs(meisiList, readingToKanji);
  const verbGroups = scoreFilterAndGroup(verbs);

  const hexOrder = generateHexOrder();
  const mapping = {};
  for (let i = 0; i < Math.min(verbGroups.length, hexOrder.length); i++) {
    mapping[hexOrder[i]] = verbGroups[i];
  }

  const json = formatJson(mapping);
  writeFileSync(join(PATHS.DATA, 'dousi.json'), json);

  const totalWords = Object.values(mapping).reduce((sum, v) => sum + v.length, 0);
  const multiKeys = Object.values(mapping).filter(v => v.length > 1).length;
  console.error(`キー数: ${Object.keys(mapping).length}, 総単語数: ${totalWords}, 複数候補キー: ${multiKeys}`);
}

main();
