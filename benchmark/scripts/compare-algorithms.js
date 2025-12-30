#!/usr/bin/env node
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const algorithms = ['jaro-winkler', 'levenshtein', 'tfidf', 'tfidf-levenshtein'];

// コマンドライン引数の解析
const args = process.argv.slice(2);
const isQuiet = args.includes('--quiet') || args.includes('-q');

if (!isQuiet) {
  console.log('\n=== yukichant アルゴリズム比較 ===\n');
  console.log('全てのアルゴリズムでベンチマークを実行します...\n');
}

for (const algorithm of algorithms) {
  if (!isQuiet) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`アルゴリズム: ${algorithm}`);
    console.log('='.repeat(60));
  } else {
    process.stderr.write(`${algorithm}... `);
  }
  
  try {
    execSync(`node ${path.join(__dirname, 'run-accuracy-test.js')} ${algorithm}`, {
      stdio: isQuiet ? 'pipe' : 'inherit',
      cwd: path.join(__dirname, '../..')
    });
    if (isQuiet) {
      process.stderr.write('完了\n');
    }
  } catch (error) {
    if (isQuiet) {
      process.stderr.write('失敗\n');
    }
    console.error(`エラー: ${algorithm}の実行に失敗しました`);
  }
}

if (!isQuiet) {
  console.log('\n' + '='.repeat(60));
  console.log('全てのアルゴリズムの実行が完了しました');
  console.log('='.repeat(60));
  console.log('\n結果サマリーを確認するには:');
  console.log('  npm run benchmark:report');
  console.log('  または');
  console.log('  cat benchmark/results/summary/latest_comparison.tsv\n');
}

