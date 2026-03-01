import kuromoji from 'kuromoji';
import { readFileSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// regroup-by-pronunciation.js と同じ拍数で分析（2: 現行 / 3: 検証用）
const MORAE_COUNT = 3;

const meisi = JSON.parse(readFileSync(`${__dirname}/data/meisi.json`, 'utf-8'));
const dousi = JSON.parse(readFileSync(`${__dirname}/data/dousi.json`, 'utf-8'));

function buildTokenizer() {
  return new Promise((resolve, reject) => {
    kuromoji
      .builder({ dicPath: `${__dirname}/node_modules/yukidic/dic/` })
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

async function main() {
  const tokenizer = await buildTokenizer();

  console.log(`=== meisi.json の発音分析（先頭2拍）===\n`);
  analyzeDict(tokenizer, meisi, 'meisi');

  console.log(`\n=== dousi.json の発音分析（先頭${MORAE_COUNT}拍）===\n`);
  analyzeDict(tokenizer, dousi, 'dousi');

  console.log(`\n=== 異なるコード間での発音の衝突分析 ===\n`);
  analyzeCrossCodeCollisions(tokenizer, meisi, 'meisi');
  analyzeCrossCodeCollisions(tokenizer, dousi, 'dousi');
}

function analyzeDict(tokenizer, dict, label) {
  const codeReadings = {};
  let sameCodeDiffCount = 0;
  let sameCodeSameCount = 0;
  const n = label === 'meisi' ? 2 : MORAE_COUNT; // 名詞は2拍、動詞は設定値(3拍)で分析

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
  const n = label === 'meisi' ? 2 : MORAE_COUNT; // 名詞は2拍、動詞は設定値(3拍)で分析

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

  if (collisions.length > 30) {
    console.log(`  ... 他 ${collisions.length - 30} 件の衝突`);
  }

  console.log(`\n  衝突している最初の${n}拍の種類: ${collisionCount}`);
  console.log(`  全ユニークな最初の${n}拍の種類: ${Object.keys(firstNToCode).length}`);
  console.log(`  衝突率: ${(collisionCount / Object.keys(firstNToCode).length * 100).toFixed(1)}%`);
}

main().catch(console.error);
