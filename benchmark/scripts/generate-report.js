#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const summaryPath = path.join(__dirname, '../results/summary/latest_comparison.tsv');

if (!fs.existsSync(summaryPath)) {
  console.error('エラー: サマリーファイルが見つかりません');
  console.error('先にベンチマークを実行してください: npm run benchmark:compare');
  process.exit(1);
}

const data = fs.readFileSync(summaryPath, 'utf-8');
const lines = data.split('\n').slice(1); // ヘッダーをスキップ

console.log('\n=== yukichant アルゴリズム比較レポート ===\n');

const results = lines
  .filter(l => l.trim())
  .map(line => {
    const [algorithm, options, total, correct, accuracy, avgTime, timestamp] = line.split('\t');
    return {
      algorithm,
      options: JSON.parse(options),
      total: parseInt(total),
      correct: parseInt(correct),
      accuracy: parseFloat(accuracy),
      avgTime: parseFloat(avgTime),
      timestamp: new Date(timestamp)
    };
  })
  .sort((a, b) => b.accuracy - a.accuracy); // 精度の高い順にソート

// テーブル形式で表示
console.log('┌─────────────────────┬──────────┬──────────┬─────────────┐');
console.log('│ アルゴリズム        │ 正解率   │ 正解数   │ 平均時間(ms)│');
console.log('├─────────────────────┼──────────┼──────────┼─────────────┤');

for (const result of results) {
  const alg = result.algorithm.padEnd(20);
  const acc = `${result.accuracy.toFixed(2)}%`.padStart(8);
  const cor = `${result.correct}/${result.total}`.padStart(8);
  const time = result.avgTime.toFixed(2).padStart(11);
  console.log(`│ ${alg}│ ${acc} │ ${cor} │ ${time}  │`);
}

console.log('└─────────────────────┴──────────┴──────────┴─────────────┘');

// 最良のアルゴリズムを表示
const best = results[0];
console.log(`\n🏆 最高精度: ${best.algorithm} (${best.accuracy.toFixed(2)}%)`);

// 最速のアルゴリズムを表示
const fastest = results.reduce((min, r) => r.avgTime < min.avgTime ? r : min);
console.log(`⚡ 最速: ${fastest.algorithm} (${fastest.avgTime.toFixed(2)}ms)`);

// バランスの良いアルゴリズムを提案（精度90%以上で最速）
const balanced = results
  .filter(r => r.accuracy >= 90)
  .reduce((min, r) => r.avgTime < min.avgTime ? r : min, results[0]);

if (balanced.accuracy >= 90) {
  console.log(`⚖️  バランス推奨: ${balanced.algorithm} (精度: ${balanced.accuracy.toFixed(2)}%, 速度: ${balanced.avgTime.toFixed(2)}ms)`);
}

console.log(`\n最終更新: ${results[0].timestamp.toLocaleString('ja-JP')}\n`);

// 詳細結果の場所を表示
console.log('詳細結果:');
for (const result of results) {
  const resultDir = path.join(__dirname, `../results/${result.algorithm}`);
  if (fs.existsSync(resultDir)) {
    const files = fs.readdirSync(resultDir).filter(f => f.endsWith('.tsv'));
    if (files.length > 0) {
      const latestFile = files.sort().reverse()[0];
      console.log(`  - ${result.algorithm}: benchmark/results/${result.algorithm}/${latestFile}`);
    }
  }
}

console.log('');

