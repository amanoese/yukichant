#!/usr/bin/env node
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n=== yukichant ベンチマーク実行 ===\n');
console.log('全アルゴリズムでベンチマークを実行中...\n');

// compare-algorithms.jsを--quietモードで実行
try {
  execSync(`node ${path.join(__dirname, 'compare-algorithms.js')} --quiet`, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '../..')
  });
} catch (error) {
  console.error('エラー: ベンチマークの実行に失敗しました');
  process.exit(1);
}

console.log('\n');

// generate-report.jsを実行
try {
  execSync(`node ${path.join(__dirname, 'generate-report.js')}`, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '../..')
  });
} catch (error) {
  console.error('エラー: レポート生成に失敗しました');
  process.exit(1);
}

