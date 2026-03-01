import kuromoji from 'kuromoji';
import { readFileSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

async function main() {
  const tokenizer = await buildTokenizer();

  console.log('=== meisi.json の発音分析 ===\n');
  analyzeDict(tokenizer, meisi, 'meisi');

  console.log('\n=== dousi.json の発音分析 ===\n');
  analyzeDict(tokenizer, dousi, 'dousi');

  console.log('\n=== 異なるコード間での最初の2拍の衝突分析 ===\n');
  analyzeCrossCodeCollisions(tokenizer, meisi, 'meisi');
  analyzeCrossCodeCollisions(tokenizer, dousi, 'dousi');
}

function analyzeDict(tokenizer, dict, label) {
  const codeReadings = {};
  let sameCodeDiffCount = 0;
  let sameCodeSameCount = 0;

  for (const [code, words] of Object.entries(dict)) {
    const readings = words.map(w => {
      const raw = getReading(tokenizer, w);
      const first2 = getFirst2Morae(raw);
      return { word: w, reading: raw, first2 };
    });
    codeReadings[code] = readings;

    if (words.length > 1) {
      const first2Set = new Set(readings.map(r => r.first2));
      if (first2Set.size > 1) {
        sameCodeDiffCount++;
        console.log(`  [問題] コード ${code}: 同一コード内で最初の2拍が異なる`);
        for (const r of readings) {
          console.log(`    "${r.word}" → 読み: ${r.reading} → 最初の2拍: ${r.first2}`);
        }
      } else {
        sameCodeSameCount++;
      }
    }
  }

  console.log(`\n[${label}] 同一コード内の分析結果:`);
  console.log(`  最初の2拍が一致: ${sameCodeSameCount} コード`);
  console.log(`  最初の2拍が不一致: ${sameCodeDiffCount} コード`);
}

function analyzeCrossCodeCollisions(tokenizer, dict, label) {
  const first2ToCode = {};
  let collisionCount = 0;

  for (const [code, words] of Object.entries(dict)) {
    for (const w of words) {
      const raw = getReading(tokenizer, w);
      const first2 = getFirst2Morae(raw);
      if (!first2ToCode[first2]) {
        first2ToCode[first2] = [];
      }
      first2ToCode[first2].push({ code, word: w, reading: raw });
    }
  }

  console.log(`\n[${label}] 異なるコード間の最初の2拍衝突:`);
  const collisions = [];
  for (const [first2, entries] of Object.entries(first2ToCode)) {
    const uniqueCodes = new Set(entries.map(e => e.code));
    if (uniqueCodes.size > 1) {
      collisionCount++;
      collisions.push({ first2, entries, codeCount: uniqueCodes.size });
    }
  }

  collisions.sort((a, b) => b.codeCount - a.codeCount);

  for (const { first2, entries, codeCount } of collisions.slice(0, 30)) {
    const uniqueCodes = [...new Set(entries.map(e => e.code))];
    console.log(`  最初の2拍 "${first2}" → ${codeCount}個のコードで衝突: [${uniqueCodes.join(', ')}]`);
    for (const e of entries) {
      console.log(`    ${e.code}: "${e.word}" (${e.reading})`);
    }
  }

  if (collisions.length > 30) {
    console.log(`  ... 他 ${collisions.length - 30} 件の衝突`);
  }

  console.log(`\n  衝突している最初の2拍の種類: ${collisionCount}`);
  console.log(`  全ユニークな最初の2拍の種類: ${Object.keys(first2ToCode).length}`);
  console.log(`  衝突率: ${(collisionCount / Object.keys(first2ToCode).length * 100).toFixed(1)}%`);
}

main().catch(console.error);
