#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import typoCorrection from '../../src/typo-correction.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// コマンドライン引数の解析
const args = process.argv.slice(2);
const algorithm = args[0] || 'jaro-winkler';

// アルゴリズムに応じたオプション設定
const algorithmOptions = {
  'jaro-winkler': { is_tfidf: false, Levenshtein: false },
  'levenshtein': { is_tfidf: false, Levenshtein: true },
  'tfidf': { is_tfidf: true, Levenshtein: false },
  'tfidf-levenshtein': { is_tfidf: true, Levenshtein: true }
};

const options = algorithmOptions[algorithm];
if (!options) {
  console.error(`エラー: 不明なアルゴリズム "${algorithm}"`);
  console.error('使用可能なアルゴリズム: jaro-winkler, levenshtein, tfidf, tfidf-levenshtein');
  process.exit(1);
}

// テストデータの読み込み
const datasetPath = path.join(__dirname, '../magi_ocr_data/dataset.tsv');
if (!fs.existsSync(datasetPath)) {
  console.error(`エラー: テストデータが見つかりません: ${datasetPath}`);
  process.exit(1);
}

const data = fs.readFileSync(datasetPath, 'utf-8');
const lines = data.split('\n').slice(1); // ヘッダーをスキップ

console.log(`\n=== yukichant 精度テスト ===`);
console.log(`アルゴリズム: ${algorithm}`);
console.log(`オプション: ${JSON.stringify(options)}`);
console.log(`テストケース数: ${lines.filter(l => l.trim()).length}\n`);

// 句読点を正規化する関数（比較用）
function normalizePunctuation(text) {
  return text.replace(/[、。]/g, '');
}

const results = [];
let correct = 0;
let total = 0;
let totalTime = 0;

for (const line of lines) {
  if (!line.trim()) continue;
  
  const [id, ocrResult, expected, description, imageFile] = line.split('\t');
  
  const startTime = performance.now();
  const corrected = typoCorrection.exec(ocrResult, options);
  const endTime = performance.now();
  const executionTime = endTime - startTime;
  
  // 句読点を除去して比較
  const normalizedCorrected = normalizePunctuation(corrected);
  const normalizedExpected = normalizePunctuation(expected);
  const isCorrect = normalizedCorrected === normalizedExpected;
  
  if (isCorrect) {
    correct++;
  }
  total++;
  totalTime += executionTime;
  
  results.push({
    id,
    input: ocrResult,
    expected,
    corrected,
    normalizedExpected,
    normalizedCorrected,
    isCorrect,
    executionTime: executionTime.toFixed(2)
  });
  
  const status = isCorrect ? '✓' : '✗';
  console.log(`[${id}] ${status} ${description}`);
  if (!isCorrect) {
    console.log(`  入力: ${ocrResult}`);
    console.log(`  期待: ${normalizedExpected}`);
    console.log(`  結果: ${normalizedCorrected}`);
  }
}

const accuracy = (correct / total * 100).toFixed(2);
const avgTime = (totalTime / total).toFixed(2);

console.log(`\n=== 結果 ===`);
console.log(`正解率: ${accuracy}% (${correct}/${total})`);
console.log(`平均実行時間: ${avgTime}ms`);

// 結果をTSVファイルに保存
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const resultDir = path.join(__dirname, `../results/${algorithm}`);
fs.mkdirSync(resultDir, { recursive: true });

const resultPath = path.join(resultDir, `${timestamp}_result.tsv`);
const resultTsv = [
  'id\tinput\texpected\tcorrected\tnormalized_expected\tnormalized_corrected\tis_correct\talgorithm\toptions\texecution_time_ms',
  ...results.map(r => 
    `${r.id}\t${r.input}\t${r.expected}\t${r.corrected}\t${r.normalizedExpected}\t${r.normalizedCorrected}\t${r.isCorrect}\t${algorithm}\t${JSON.stringify(options)}\t${r.executionTime}`
  )
].join('\n');

fs.writeFileSync(resultPath, resultTsv, 'utf-8');
console.log(`\n結果を保存しました: ${resultPath}`);

// サマリーを更新
const summaryDir = path.join(__dirname, '../results/summary');
fs.mkdirSync(summaryDir, { recursive: true });
const summaryPath = path.join(summaryDir, 'latest_comparison.tsv');

let summaryData = [];
if (fs.existsSync(summaryPath)) {
  const existingData = fs.readFileSync(summaryPath, 'utf-8');
  const existingLines = existingData.split('\n').slice(1); // ヘッダーをスキップ
  summaryData = existingLines
    .filter(l => l.trim())
    .map(l => {
      const [alg, opt, tot, cor, acc, avg, ts] = l.split('\t');
      return { algorithm: alg, options: opt, total: tot, correct: cor, accuracy: acc, avgTime: avg, timestamp: ts };
    })
    .filter(s => s.algorithm !== algorithm); // 同じアルゴリズムの古い結果を削除
}

summaryData.push({
  algorithm,
  options: JSON.stringify(options),
  total: total.toString(),
  correct: correct.toString(),
  accuracy,
  avgTime,
  timestamp: new Date().toISOString()
});

const summaryTsv = [
  'algorithm\toptions\ttotal\tcorrect\taccuracy\tavg_time_ms\ttimestamp',
  ...summaryData.map(s => 
    `${s.algorithm}\t${s.options}\t${s.total}\t${s.correct}\t${s.accuracy}\t${s.avgTime}\t${s.timestamp}`
  )
].join('\n');

fs.writeFileSync(summaryPath, summaryTsv, 'utf-8');
console.log(`サマリーを更新しました: ${summaryPath}\n`);

