#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const summaryPath = path.join(__dirname, '../results/summary/latest_comparison.tsv');
const resultsDir = path.join(__dirname, '../results');

// コマンドライン引数をチェック（--regenerate オプション）
const shouldRegenerate = process.argv.includes('--regenerate');

// 各アルゴリズムの最新結果を収集してサマリーを再生成
function regenerateSummary() {
  const algorithmDirs = ['jaro-winkler', 'levenshtein', 'tfidf', 'tfidf-levenshtein', 'chatgpt'];
  const latestResults = [];

  console.log('\n=== 最新結果を収集中... ===\n');

  for (const algDir of algorithmDirs) {
    const algPath = path.join(resultsDir, algDir);
    
    if (!fs.existsSync(algPath)) {
      console.warn(`⚠️  ${algDir} のディレクトリが見つかりません`);
      continue;
    }

    // ChatGPTの場合は、モデルごとのサブディレクトリを処理
    if (algDir === 'chatgpt') {
      const modelDirs = fs.readdirSync(algPath)
        .filter(f => {
          const stat = fs.statSync(path.join(algPath, f));
          return stat.isDirectory();
        });

      if (modelDirs.length === 0) {
        console.warn(`⚠️  ${algDir} にモデルディレクトリがありません`);
        continue;
      }

      for (const modelDir of modelDirs) {
        const modelPath = path.join(algPath, modelDir);
        const files = fs.readdirSync(modelPath)
          .filter(f => f.endsWith('.tsv'))
          .sort()
          .reverse();

        if (files.length === 0) {
          console.warn(`⚠️  ${algDir}/${modelDir} に結果ファイルがありません`);
          continue;
        }

        const latestFile = files[0];
        const filePath = path.join(modelPath, latestFile);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim());
        
        if (lines.length < 2) {
          console.warn(`⚠️  ${algDir}/${modelDir}/${latestFile} にデータがありません`);
          continue;
        }

        // ヘッダーを解析
        const header = lines[0].split('\t');
        const dataLines = lines.slice(1);

        // 統計を計算
        let correct = 0;
        let total = dataLines.length;
        let totalTime = 0;
        let apiErrors = 0;

        for (const line of dataLines) {
          const values = line.split('\t');
          const row = {};
          header.forEach((h, i) => {
            row[h] = values[i];
          });

          if (row.is_correct === 'true') {
            correct++;
          }
          if (row.execution_time_ms) {
            totalTime += parseFloat(row.execution_time_ms);
          }
          if (row.error && row.error.trim()) {
            apiErrors++;
          }
        }

        const accuracy = (correct / total * 100).toFixed(2);
        const avgTime = (totalTime / total).toFixed(2);

        // タイムスタンプを抽出（ファイル名から）
        const timestampMatch = latestFile.match(/^(.+)\.tsv$/);
        const timestamp = timestampMatch ? timestampMatch[1] : latestFile;

        const algorithmName = `chatgpt-${modelDir}`;
        const options = { model: modelDir, limit: total, apiErrors };

        latestResults.push({
          algorithm: algorithmName,
          options,
          total,
          correct,
          accuracy: parseFloat(accuracy),
          avgTime: parseFloat(avgTime),
          timestamp,
          apiErrors,
          modelDir
        });

        console.log(`✓ ${algorithmName}: ${modelDir}/${latestFile}`);
      }
      continue;
    }

    // 非ChatGPTアルゴリズムの処理
    const files = fs.readdirSync(algPath)
      .filter(f => f.endsWith('.tsv'))
      .sort()
      .reverse();

    if (files.length === 0) {
      console.warn(`⚠️  ${algDir} に結果ファイルがありません`);
      continue;
    }

    // 最新ファイルのみ処理
    const latestFile = files[0];
    const filePath = path.join(algPath, latestFile);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    
    if (lines.length < 2) {
      console.warn(`⚠️  ${algDir}/${latestFile} にデータがありません`);
      continue;
    }

    // ヘッダーを解析
    const header = lines[0].split('\t');
    const dataLines = lines.slice(1);

    // 統計を計算
    let correct = 0;
    let total = dataLines.length;
    let totalTime = 0;
    let apiErrors = 0;

    for (const line of dataLines) {
      const values = line.split('\t');
      const row = {};
      header.forEach((h, i) => {
        row[h] = values[i];
      });

      if (row.is_correct === 'true') {
        correct++;
      }
      if (row.execution_time_ms) {
        totalTime += parseFloat(row.execution_time_ms);
      }
      if (row.error && row.error.trim()) {
        apiErrors++;
      }
    }

    const accuracy = (correct / total * 100).toFixed(2);
    const avgTime = (totalTime / total).toFixed(2);

    // タイムスタンプを抽出（ファイル名から）
    const timestampMatch = latestFile.match(/^(.+)\.tsv$/);
    const timestamp = timestampMatch ? timestampMatch[1] : latestFile;

    let algorithmName = algDir;
    let options = {};

    if (algDir === 'jaro-winkler') {
      options = { is_tfidf: false, Levenshtein: false };
    } else if (algDir === 'levenshtein') {
      options = { is_tfidf: false, Levenshtein: true };
    } else if (algDir === 'tfidf') {
      options = { is_tfidf: true, Levenshtein: false };
    } else if (algDir === 'tfidf-levenshtein') {
      options = { is_tfidf: true, Levenshtein: true };
    }

    latestResults.push({
      algorithm: algorithmName,
      options,
      total,
      correct,
      accuracy: parseFloat(accuracy),
      avgTime: parseFloat(avgTime),
      timestamp,
      apiErrors
    });

    console.log(`✓ ${algorithmName}: ${latestFile}`);
  }

  if (latestResults.length === 0) {
    console.error('\n❌ 結果が見つかりませんでした');
    process.exit(1);
  }

  // サマリーファイルを更新
  const summaryDir = path.join(__dirname, '../results/summary');
  fs.mkdirSync(summaryDir, { recursive: true });

  const summaryTsv = [
    'algorithm\toptions\ttotal\tcorrect\taccuracy\tavg_time_ms\ttimestamp',
    ...latestResults.map(r => 
      `${r.algorithm}\t${JSON.stringify(r.options)}\t${r.total}\t${r.correct}\t${r.accuracy.toFixed(2)}\t${r.avgTime}\t${r.timestamp}`
    )
  ].join('\n');

  fs.writeFileSync(summaryPath, summaryTsv, 'utf-8');
  console.log(`\n✅ サマリーを更新しました: ${summaryPath}\n`);

  return latestResults;
}

// --regenerate オプションが指定された場合、または既存のサマリーがない場合は再生成
if (shouldRegenerate || !fs.existsSync(summaryPath)) {
  if (!fs.existsSync(summaryPath)) {
    console.log('サマリーファイルが見つかりません。最新結果から生成します...');
  }
  regenerateSummary();
}

// サマリーファイルが存在しない場合はエラー
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
      timestamp: timestamp
    };
  })
  .sort((a, b) => b.accuracy - a.accuracy); // 精度の高い順にソート

// テーブル形式で表示
console.log('┌──────────┬─────────────────────────┬──────────┬──────────┬─────────────┐');
console.log('│ 種別     │ アルゴリズム            │ 正解率   │ 正解数   │ 平均時間(ms)│');
console.log('├──────────┼─────────────────────────┼──────────┼──────────┼─────────────┤');

for (const result of results) {
  const type = result.algorithm.startsWith('chatgpt') ? 'ChatGPT' : 'local';
  const typeStr = type.padEnd(8);
  const alg = result.algorithm.padEnd(24);
  const acc = `${result.accuracy.toFixed(2)}%`.padStart(8);
  const cor = `${result.correct}/${result.total}`.padStart(8);
  const time = result.avgTime.toFixed(2).padStart(11);
  console.log(`│ ${typeStr} │ ${alg}│ ${acc} │ ${cor} │ ${time}  │`);
}

console.log('└──────────┴─────────────────────────┴──────────┴──────────┴─────────────┘');

// 最良のアルゴリズムを表示
const best = results[0];
console.log(`\n🏆 最高精度: ${best.algorithm} (${best.accuracy.toFixed(2)}%)`);

// 最速のアルゴリズムを表示（ChatGPTを除く）
const nonChatGPTResults = results.filter(r => !r.algorithm.startsWith('chatgpt'));
if (nonChatGPTResults.length > 0) {
  const fastest = nonChatGPTResults.reduce((min, r) => r.avgTime < min.avgTime ? r : min);
  console.log(`⚡ 最速: ${fastest.algorithm} (${fastest.avgTime.toFixed(2)}ms)`);

  // バランスの良いアルゴリズムを提案（精度50%以上で最速）
  const balanced = nonChatGPTResults
    .filter(r => r.accuracy >= 50)
    .reduce((min, r) => r.avgTime < min.avgTime ? r : min, nonChatGPTResults[0]);

  if (balanced && balanced.accuracy >= 50) {
    console.log(`⚖️  バランス推奨: ${balanced.algorithm} (精度: ${balanced.accuracy.toFixed(2)}%, 速度: ${balanced.avgTime.toFixed(2)}ms)`);
  }
}

// ChatGPT結果の特記事項
const chatgptResults = results.filter(r => r.algorithm.startsWith('chatgpt'));
if (chatgptResults.length > 0) {
  console.log('\n📊 ChatGPT結果:');
  for (const result of chatgptResults) {
    const apiErrors = result.options.apiErrors || 0;
    console.log(`  - ${result.algorithm}: ${result.accuracy.toFixed(2)}% (${result.total}件テスト, APIエラー: ${apiErrors}件)`);
  }
}

console.log('\n📁 詳細結果ファイル:');
for (const result of results) {
  if (result.algorithm.startsWith('chatgpt')) {
    // ChatGPTの場合は、chatgpt/{model}/{timestamp}.tsv
    const modelName = result.modelDir || result.algorithm.replace(/^chatgpt-/, '');
    const fileName = `${result.timestamp}.tsv`;
    console.log(`  - ${result.algorithm}: benchmark/results/chatgpt/${modelName}/${fileName}`);
  } else {
    // 非ChatGPTの場合は、{algorithm}/{timestamp}.tsv
    const fileName = `${result.timestamp}.tsv`;
    console.log(`  - ${result.algorithm}: benchmark/results/${result.algorithm}/${fileName}`);
  }
}

console.log('');

