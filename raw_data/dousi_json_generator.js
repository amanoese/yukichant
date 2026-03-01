#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { distance } from 'fastest-levenshtein';

const require = createRequire(import.meta.url);
const kuromoji = require('kuromoji');

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPELL_PATH = join(__dirname, 'spell.txt');
const NG_WORD_PATH = join(__dirname, 'spell_NG_word.txt');
const OUTPUT_PATH = join(__dirname, '..', 'data', 'dousi.json');
const MEISI_GENERATOR_PATH = join(__dirname, 'meisi_json_generator.js');
const KUROMOJI_DIC_PATH = join(__dirname, '..', 'node_modules', 'kuromoji', 'dict');

function getMeisiList() {
  const output = execSync(`node "${MEISI_GENERATOR_PATH}"`, { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
  return output.split('\n').filter(Boolean);
}

// kuromoji同梱のIPAdic辞書から基本形の読み(カタカナ)→漢字基本形の逆引き辞書を構築する
// token_info_dictionary の features 形式:
//   surface_form,品詞,品詞細分類,*,*,活用型,活用形,基本形,読み,発音
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

// spell.txt をBase64デコードして mecab で形態素解析し、動詞を抽出する
// ひらがなのみの動詞はIPAdic辞書で基本形の読みから漢字変換を試みる
function extractVerbs(meisiList, readingToKanji) {
  const base64Text = readFileSync(SPELL_PATH, 'utf-8');
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

    // ひらがな動詞 → 基本形の読みを記録（後でまとめて変換）
    // 基本形が2文字以下の短い動詞（する、いる、かう等）は誤マッチが多いため除外
    if (/^\p{scx=Hiragana}+$/u.test(surface) && baseform && reading && baseform.length >= 3) {
      if (!hiraganaBaseforms.has(baseform)) {
        hiraganaBaseforms.set(baseform, { surfaces: new Set(), reading: null });
      }
      hiraganaBaseforms.get(baseform).surfaces.add(surface);
    }
  }

  // ひらがな基本形をmecabで解析して基本形の読みを取得
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

    // 基本形の読みでIPAdic辞書を逆引きし、漢字基本形を取得
    // 漢字基本形がmecabで同じ読みの動詞として認識される場合のみ採用
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

// mecab で各動詞の基本形を取得する
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

// NG単語除外 → 類似語スコアリング → 部分一致除外 → 基本形でグルーピング
function scoreFilterAndGroup(verbs) {
  const ngWords = readFileSync(NG_WORD_PATH, 'utf-8').split('\n').filter(l => l.trim() && !l.startsWith('#'));
  const cleanVerbs = verbs.filter(v => !ngWords.some(ng => v.includes(ng)));

  const mecabInfo = getMecabInfo(cleanVerbs);
  const baseforms = mecabInfo.map(m => m.baseform);

  // 各動詞について基本形リスト内で編集距離1以内のマッチ数をカウント
  const scored = cleanVerbs.map(verb => {
    const count = baseforms.filter(bf => distance(verb, bf) <= 1).length;
    return { verb, count };
  });

  scored.sort((a, b) => b.count - a.count);

  // 部分一致除外
  const sortedVerbs = scored.map(s => s.verb);
  const filtered = sortedVerbs.filter(verb => {
    const matchCount = sortedVerbs.filter(other => other.includes(verb)).length;
    return matchCount === 1;
  });

  // 基本形でグルーピング: { 基本形: [活用形1, 活用形2, ...] }
  const filteredSet = new Set(filtered);
  const filteredMecab = getMecabInfo(filtered);
  const groups = new Map();
  for (const { surface, baseform } of filteredMecab) {
    if (!filteredSet.has(surface)) continue;
    if (!groups.has(baseform)) groups.set(baseform, []);
    groups.get(baseform).push(surface);
  }

  // 活用形が多い基本形を優先して256キー分を選出
  const sortedGroups = [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length);

  const result = [];
  for (const [, forms] of sortedGroups) {
    if (result.length >= 256) break;
    result.push(forms);
  }
  return result;
}

// dousi用の16進コード順序を生成する（20~FF, 00~1F の順）
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

function initKuromojiTokenizer() {
  return new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: KUROMOJI_DIC_PATH }).build((err, tokenizer) => {
      if (err) reject(err);
      else resolve(tokenizer);
    });
  });
}

async function main() {
  const tokenizer = await initKuromojiTokenizer();
  const readingToKanji = buildReadingToKanjiMap(tokenizer);
  const meisiList = getMeisiList();
  const verbs = extractVerbs(meisiList, readingToKanji);
  const verbGroups = scoreFilterAndGroup(verbs);

  const hexOrder = generateHexOrder();
  const mapping = {};
  for (let i = 0; i < Math.min(verbGroups.length, hexOrder.length); i++) {
    mapping[hexOrder[i]] = verbGroups[i];
  }

  // 0A は固定値
  mapping['0A'] = ['具現化せよ', '踊れ', '歌え', '紡げ'];

  const json = formatJson(mapping);
  writeFileSync(OUTPUT_PATH, json);

  // 統計情報
  const totalWords = Object.values(mapping).reduce((sum, v) => sum + v.length, 0);
  const multiKeys = Object.values(mapping).filter(v => v.length > 1).length;
  console.error(`キー数: ${Object.keys(mapping).length}, 総単語数: ${totalWords}, 複数候補キー: ${multiKeys}`);
}

main();
