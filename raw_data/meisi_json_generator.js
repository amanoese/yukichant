#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPELL_PATH = join(__dirname, 'spell.txt');
const NG_WORD_PATH = join(__dirname, 'spell_NG_word.txt');
const OUTPUT_PATH = join(__dirname, '..', 'data', 'meisi.json');

// spell.txt をBase64デコードして mecab で形態素解析し、CSV形式の行配列を返す
function runMecab() {
  const base64Text = readFileSync(SPELL_PATH, 'utf-8');
  const decodedText = Buffer.from(base64Text, 'base64').toString('utf-8');
  const output = execSync('mecab', { input: decodedText, encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
  return output.replace(/\t/g, ',').split('\n');
}

// mecab CSV行から名詞（+助詞結合語）を抽出する
//
// 状態遷移:
//   名詞が来たら → 蓄積中の語を出力し、新しい蓄積を開始 (a=1)
//   a==2（連体化助詞の直後）で名詞以外が来たら → リセット
//   a==1 で助詞が来たら → 助詞を結合（連体化なら a=2 で次の語を待つ）
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
  return readFileSync(NG_WORD_PATH, 'utf-8')
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#'));
}

// sort -u | sed -n '/../p' | grep -P '\p{Han}' に相当
// bash の sort はロケール依存の照合順序を使うため、execSync で sort コマンドを呼ぶ
function dedup(words) {
  const unique = [...new Set(words)];
  const sorted = execSync('sort -u', { input: unique.join('\n'), encoding: 'utf-8' })
    .split('\n')
    .filter(Boolean);
  return sorted.filter(w => w.length >= 2 && containsKanji(w));
}

// 部分一致する語を除外する（他の語の部分文字列になっている語を除外）
function removePartialMatches(words) {
  return words.filter(word => {
    const matchCount = words.filter(other => other.includes(word)).length;
    return matchCount === 1;
  });
}

function removeNgWords(words, ngWords) {
  return words.filter(word => !ngWords.some(ng => word.includes(ng)));
}

// 先頭の漢字でグルーピングし、語数が多い順にソートする
// bash版: grep -oP '^\p{Han}' | sort -u → 各漢字でgrep → sort -u → awk NF → sort -nr -k1,1
function groupByFirstKanji(allWords, uniqueWords) {
  // allWords から先頭漢字を抽出して sort -u（ロケール依存順）
  const rawKanjis = allWords
    .map(w => w.match(/^\p{scx=Han}/u))
    .filter(Boolean)
    .map(m => m[0]);
  const sortedKanjis = execSync('sort -u', { input: rawKanjis.join('\n'), encoding: 'utf-8' })
    .split('\n')
    .filter(Boolean);

  // 各漢字でグルーピング
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

  // sort -u → awk '{print NF,$0}' → sort -nr -k1,1 に相当
  // sort コマンドで正確なロケール順ソートを行う
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

// meisi用の16進コード順序を生成する
// 優先: 0A, E3, 81, 82, 83 → 20~FF(81,82,83,DF除く) → 00~1F(0A除く) → DF
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

  // 名詞抽出 → 重複排除・フィルタリング
  const rawNouns = extractNouns(lines);
  const allNouns = dedup(rawNouns);

  // 部分一致除外 → NG単語除外
  const uniqueNouns = removePartialMatches(allNouns);
  const ngWords = loadNgWords();
  const cleanNouns = removeNgWords(uniqueNouns, ngWords);

  // 先頭漢字でグルーピング
  const groups = groupByFirstKanji(allNouns, cleanNouns);

  // 16進マッピング → JSON出力
  const hexOrder = generateMeisiHexOrder();
  const mapping = buildMapping(groups, hexOrder);
  const json = formatJson(mapping);
  writeFileSync(OUTPUT_PATH, json);

  // dousi_json_generator.js から参照するため、名詞リストを標準出力に出力
  process.stdout.write(allNouns.join('\n') + '\n');
}

main();
