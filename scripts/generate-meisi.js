#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { PATHS } from './helpers.js';

// spell.txt をBase64デコードして mecab で形態素解析し、CSV形式の行配列を返す
function runMecab() {
  const base64Text = readFileSync(PATHS.SPELL, 'utf-8');
  const decodedText = Buffer.from(base64Text, 'base64').toString('utf-8');
  const output = execSync('mecab', { input: decodedText, encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
  return output.replace(/\t/g, ',').split('\n');
}

// mecab CSV行から名詞（+助詞結合語）を抽出する
function extractNouns(lines) {
  const results = [];
  let s = '';
  let a = 0;

  for (const line of lines) {
    const f = line.split(',');
    const surface = f[0];
    const pos = f[1] || '';
    const posDetail = f[2] || '';

    if (/名詞/.test(pos) || /EOF/.test(surface)) {
      if (s) results.push(s);
      a = 1;
      s = surface;
    }

    if (a === 2) {
      a = 0;
      s = '';
    }

    if (a === 1 && /助詞/.test(pos)) {
      a = 0;
      if (/連体化/.test(posDetail)) {
        a = 2;
      }
      s = s + surface;
    }
  }

  return results;
}

function containsKanji(word) {
  return /\p{scx=Han}/u.test(word);
}

function loadNgWords() {
  return readFileSync(PATHS.NG_WORDS, 'utf-8')
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#'));
}

function dedup(words) {
  const unique = [...new Set(words)];
  const sorted = execSync('sort -u', { input: unique.join('\n'), encoding: 'utf-8' })
    .split('\n')
    .filter(Boolean);
  return sorted.filter(w => w.length >= 2 && containsKanji(w));
}

function removePartialMatches(words) {
  return words.filter(word => {
    const matchCount = words.filter(other => other.includes(word)).length;
    return matchCount === 1;
  });
}

function removeNgWords(words, ngWords) {
  return words.filter(word => !ngWords.some(ng => word.includes(ng)));
}

function groupByFirstKanji(allWords, uniqueWords) {
  const rawKanjis = allWords
    .map(w => w.match(/^\p{scx=Han}/u))
    .filter(Boolean)
    .map(m => m[0]);
  const sortedKanjis = execSync('sort -u', { input: rawKanjis.join('\n'), encoding: 'utf-8' })
    .split('\n')
    .filter(Boolean);

  const groupLines = [];
  const seen = new Set();
  for (const kanji of sortedKanjis) {
    const wordsInGroup = uniqueWords.filter(w => w.startsWith(kanji));
    if (wordsInGroup.length === 0) continue;
    const line = wordsInGroup.join(' ');
    if (seen.has(line)) continue;
    seen.add(line);
    groupLines.push(line);
  }

  const numberedLines = groupLines.map(line => {
    const count = line.split(' ').length;
    return `${count} ${line}`;
  });
  const sorted = execSync('sort -nr -k1,1', { input: numberedLines.join('\n'), encoding: 'utf-8' })
    .split('\n')
    .filter(Boolean);

  return sorted
    .slice(0, 257)
    .map(line => line.replace(/^\d+ /, '').split(' '));
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

function buildMapping(groups, hexOrder) {
  const mapping = {};
  for (let i = 0; i < Math.min(groups.length, hexOrder.length); i++) {
    mapping[hexOrder[i]] = groups[i];
  }
  return mapping;
}

function formatJson(mapping) {
  const keys = Object.keys(mapping).sort();
  const lines = keys.map(key => {
    const values = mapping[key].map(v => `"${v}"`).join(',');
    return `  "${key}": [${values}]`;
  });
  return '{\n' + lines.join(',\n') + '\n}\n';
}

function main() {
  const lines = runMecab();
  const rawNouns = extractNouns(lines);
  const allNouns = dedup(rawNouns);
  const uniqueNouns = removePartialMatches(allNouns);
  const ngWords = loadNgWords();
  const cleanNouns = removeNgWords(uniqueNouns, ngWords);
  const groups = groupByFirstKanji(allNouns, cleanNouns);
  const hexOrder = generateMeisiHexOrder();
  const mapping = buildMapping(groups, hexOrder);
  const json = formatJson(mapping);
  writeFileSync(join(PATHS.DATA, 'meisi.json'), json);
  process.stdout.write(allNouns.join('\n') + '\n');
}

main();
