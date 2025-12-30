#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// コマンドライン引数の解析
const args = process.argv.slice(2);

// 使用方法の表示
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
使用方法: node run-chatgpt-test.js [オプション]

オプション:
  --api-key <key>     OpenAI APIキー（または環境変数 OPENAI_API_KEY）
  --model <model>     使用するモデル（デフォルト: gpt-5-mini）
                      利用可能: gpt-5, gpt-5-mini, gpt-5-nano
  --limit <number>    テストケース数の上限（デフォルト: 50）
  --prompt-file <path> プロンプトテンプレートファイルのパス（デフォルト: prompt-template.txt）
  --help, -h          このヘルプを表示

環境変数:
  OPENAI_API_KEY      OpenAI APIキー

例:
  export OPENAI_API_KEY="sk-..."
  node run-chatgpt-test.js
  node run-chatgpt-test.js --model gpt-5 --limit 10
  node run-chatgpt-test.js --model gpt-5-nano --limit 100
  node run-chatgpt-test.js --prompt-file my-prompt.txt
`);
  process.exit(0);
}

// APIキーの取得
let apiKey = process.env.OPENAI_API_KEY;
const apiKeyIndex = args.indexOf('--api-key');
if (apiKeyIndex !== -1 && args[apiKeyIndex + 1]) {
  apiKey = args[apiKeyIndex + 1];
}

if (!apiKey) {
  console.error('エラー: OpenAI APIキーが設定されていません');
  console.error('環境変数 OPENAI_API_KEY を設定するか、--api-key オプションを使用してください');
  console.error('詳細は --help を参照してください');
  process.exit(1);
}

// モデルの取得
let model = 'gpt-5-mini';
const modelIndex = args.indexOf('--model');
if (modelIndex !== -1 && args[modelIndex + 1]) {
  model = args[modelIndex + 1];
}

// 上限数の取得
let limit = 50;
const limitIndex = args.indexOf('--limit');
if (limitIndex !== -1 && args[limitIndex + 1]) {
  limit = parseInt(args[limitIndex + 1], 10);
  if (isNaN(limit) || limit <= 0) {
    console.error('エラー: --limit には正の整数を指定してください');
    process.exit(1);
  }
}

// プロンプトテンプレートファイルのパス
let promptFilePath = path.join(__dirname, 'prompt-template.txt');
const promptFileIndex = args.indexOf('--prompt-file');
if (promptFileIndex !== -1 && args[promptFileIndex + 1]) {
  promptFilePath = path.resolve(args[promptFileIndex + 1]);
}

// プロンプトテンプレートの読み込み
if (!fs.existsSync(promptFilePath)) {
  console.error(`エラー: プロンプトテンプレートファイルが見つかりません: ${promptFilePath}`);
  console.error('デフォルトのテンプレートファイルを作成してください:');
  console.error(`  ${path.join(__dirname, 'prompt-template.txt')}`);
  process.exit(1);
}

const promptTemplate = fs.readFileSync(promptFilePath, 'utf-8');

// テストデータの読み込み
const datasetPath = path.join(__dirname, '../magi_ocr_data/dataset.tsv');
if (!fs.existsSync(datasetPath)) {
  console.error(`エラー: テストデータが見つかりません: ${datasetPath}`);
  process.exit(1);
}

const data = fs.readFileSync(datasetPath, 'utf-8');
const lines = data.split('\n').slice(1).filter(l => l.trim()); // ヘッダーをスキップ

// 上位N件に制限
const testLines = lines.slice(0, limit);

console.log(`\n=== yukichant ChatGPT精度テスト ===`);
console.log(`モデル: ${model}`);
console.log(`テストケース数: ${testLines.length}（上限: ${limit}）`);
console.log(`プロンプトテンプレート: ${promptFilePath}\n`);

// 句読点を正規化する関数（比較用）
function normalizePunctuation(text) {
  return text.replace(/[、。]/g, '');
}

// ChatGPT APIを呼び出す関数
async function callChatGPT(ocrResult) {
  const prompt = promptTemplate.replace('{{OCR_RESULT}}', ocrResult);
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_completion_tokens: 8000  // GPT-5-miniは推論トークンを大量に使用するため（最大128,000トークン対応）、十分な余裕を持たせる
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API Error: ${response.status} ${response.statusText}\n${errorBody}`);
  }

  const result = await response.json();
  return result.choices[0].message.content.trim();
}

// メイン処理
const results = [];
let correct = 0;
let total = 0;
let totalTime = 0;
let apiErrors = 0;

// 並列実行用の処理関数
async function processTestCase(line, index) {
  const [id, ocrResult, expected, description, imageFile] = line.split('\t');
  
  console.log(`[${id}] 処理中... ${description}`);
  
  const startTime = performance.now();
  let corrected = '';
  let error = null;
  
  try {
    corrected = await callChatGPT(ocrResult);
  } catch (err) {
    error = err.message;
    console.error(`  エラー: ${error}`);
  }
  
  const endTime = performance.now();
  const executionTime = endTime - startTime;
  
  // 句読点を除去して比較
  const normalizedCorrected = normalizePunctuation(corrected);
  const normalizedExpected = normalizePunctuation(expected);
  const isCorrect = normalizedCorrected === normalizedExpected;
  
  const result = {
    id,
    input: ocrResult,
    expected,
    corrected,
    normalizedExpected,
    normalizedCorrected,
    isCorrect,
    executionTime: executionTime.toFixed(2),
    error: error || '',
    hasError: !!error,
    description
  };
  
  // 処理完了のログのみ出力
  const status = error ? '⚠' : (isCorrect ? '✓' : '✗');
  console.log(`[${id}] ${status} 完了 (${executionTime.toFixed(0)}ms)`);
  
  return result;
}

// 全テストケースを並列実行
const promises = testLines.map((line, index) => processTestCase(line, index));
const completedResults = await Promise.all(promises);

// 結果を集計
for (const result of completedResults) {
  if (result.isCorrect) {
    correct++;
  }
  if (result.hasError) {
    apiErrors++;
  }
  total++;
  totalTime += parseFloat(result.executionTime);
  results.push(result);
}

const accuracy = (correct / total * 100).toFixed(2);
const avgTime = (totalTime / total).toFixed(2);

console.log(`\n=== 詳細結果 ===`);
for (const result of completedResults) {
  const status = result.hasError ? '⚠' : (result.isCorrect ? '✓' : '✗');
  console.log(`[${result.id}] ${status} ${result.description}`);
  if (!result.isCorrect && !result.hasError) {
    console.log(`  入力: ${result.input}`);
    console.log(`  期待: ${result.normalizedExpected}`);
    console.log(`  結果: ${result.normalizedCorrected}`);
  }
}

console.log(`\n=== サマリー ===`);
console.log(`正解率: ${accuracy}% (${correct}/${total})`);
console.log(`平均実行時間: ${avgTime}ms`);
console.log(`APIエラー数: ${apiErrors}`);

// 結果をTSVファイルに保存（モデルごとにディレクトリを分ける）
const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', 'T');
const resultDir = path.join(__dirname, '../results/chatgpt', model);
fs.mkdirSync(resultDir, { recursive: true });

const algorithmName = `chatgpt-${model}`;
const resultPath = path.join(resultDir, `${timestamp}.tsv`);
const resultTsv = [
  'id\tinput\texpected\tcorrected\tnormalized_expected\tnormalized_corrected\tis_correct\talgorithm\tmodel\texecution_time_ms\terror',
  ...results.map(r => 
    `${r.id}\t${r.input}\t${r.expected}\t${r.corrected}\t${r.normalizedExpected}\t${r.normalizedCorrected}\t${r.isCorrect}\t${algorithmName}\t${model}\t${r.executionTime}\t${r.error}`
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
    .filter(s => s.algorithm !== algorithmName); // 同じアルゴリズムの古い結果を削除
}

summaryData.push({
  algorithm: algorithmName,
  options: JSON.stringify({ model, limit, apiErrors }),
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

