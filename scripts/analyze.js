#!/usr/bin/env node
import { readFileSync } from 'fs';
import { join } from 'path';
import { PATHS, MORAE_COUNT, buildTokenizer, getReading, getFirstNMorae } from './helpers.js';

const meisi = JSON.parse(readFileSync(join(PATHS.DATA, 'meisi.json'), 'utf-8'));
const dousi = JSON.parse(readFileSync(join(PATHS.DATA, 'dousi.json'), 'utf-8'));

async function main() {
  const tokenizer = await buildTokenizer();

  console.log(`=== meisi.json の発音分析（先頭${MORAE_COUNT.MEISI}拍）===\n`);
  analyzeDict(tokenizer, meisi, 'meisi');

  console.log(`\n=== dousi.json の発音分析（先頭${MORAE_COUNT.DOUSI}拍）===\n`);
  analyzeDict(tokenizer, dousi, 'dousi');

  console.log(`\n=== 異なるコード間での発音の衝突分析 ===\n`);
  analyzeCrossCodeCollisions(tokenizer, meisi, 'meisi');
  analyzeCrossCodeCollisions(tokenizer, dousi, 'dousi');
}

function analyzeDict(tokenizer, dict, label) {
  const codeReadings = {};
  let sameCodeDiffCount = 0;
  let sameCodeSameCount = 0;
  const n = label === 'meisi' ? MORAE_COUNT.MEISI : MORAE_COUNT.DOUSI;

  for (const [code, words] of Object.entries(dict)) {
    const readings = words.map(w => {
      const raw = getReading(tokenizer, w);
      const firstN = getFirstNMorae(raw, n);
      return { word: w, reading: raw, firstN };
    });
    codeReadings[code] = readings;

    if (words.length > 1) {
      const firstNSet = new Set(readings.map(r => r.firstN));
      if (firstNSet.size > 1) {
        sameCodeDiffCount++;
        console.log(`  [問題] コード ${code}: 同一コード内で最初の${n}拍が異なる`);
        for (const r of readings) {
          console.log(`    "${r.word}" → 読み: ${r.reading} → 最初の${n}拍: ${r.firstN}`);
        }
      } else {
        sameCodeSameCount++;
      }
    }
  }

  console.log(`\n[${label}] 同一コード内の分析結果:`);
  console.log(`  最初の${n}拍が一致: ${sameCodeSameCount} コード`);
  console.log(`  最初の${n}拍が不一致: ${sameCodeDiffCount} コード`);
}

function analyzeCrossCodeCollisions(tokenizer, dict, label) {
  const firstNToCode = {};
  let collisionCount = 0;
  const n = label === 'meisi' ? MORAE_COUNT.MEISI : MORAE_COUNT.DOUSI;

  for (const [code, words] of Object.entries(dict)) {
    for (const w of words) {
      const raw = getReading(tokenizer, w);
      const firstN = getFirstNMorae(raw, n);
      if (!firstNToCode[firstN]) {
        firstNToCode[firstN] = [];
      }
      firstNToCode[firstN].push({ code, word: w, reading: raw });
    }
  }

  console.log(`\n[${label}] 異なるコード間の最初の${n}拍衝突:`);
  const collisions = [];
  for (const [firstN, entries] of Object.entries(firstNToCode)) {
    const uniqueCodes = new Set(entries.map(e => e.code));
    if (uniqueCodes.size > 1) {
      collisionCount++;
      collisions.push({ firstN, entries, codeCount: uniqueCodes.size });
    }
  }

  collisions.sort((a, b) => b.codeCount - a.codeCount);

  for (const { firstN, entries, codeCount } of collisions.slice(0, 30)) {
    const uniqueCodes = [...new Set(entries.map(e => e.code))];
    console.log(`  最初の${n}拍 "${firstN}" → ${codeCount}個のコードで衝突: [${uniqueCodes.join(', ')}]`);
    for (const e of entries) {
      console.log(`    ${e.code}: "${e.word}" (${e.reading})`);
    }
  }

  console.log(`\n  衝突している最初の${n}拍の種類: ${collisionCount}`);
  console.log(`  全ユニークな最初の${n}拍の種類: ${Object.keys(firstNToCode).length}`);
  console.log(`  衝突率: ${(collisionCount / Object.keys(firstNToCode).length * 100).toFixed(1)}%`);
}

main().catch(console.error);
