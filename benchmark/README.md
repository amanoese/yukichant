# yukichant ベンチマーク

このディレクトリには、yukichantの誤字修正機能の精度を測定するためのベンチマークデータとスクリプトが含まれています。

## ディレクトリ構成

```
benchmark/
├── README.md                    # このファイル
├── magi_ocr_data/               # Magiプロジェクトから取得したOCRテストデータ
│   ├── README.md                # データセットの説明・出典
│   ├── dataset.tsv              # テストデータ（TSV形式）
│   └── images/                  # OCR元画像（オプション）
├── results/                     # 検証結果の保存先（.gitignore対象）
│   ├── jaro-winkler/            # Jaro-Winklerアルゴリズムの結果
│   ├── levenshtein/             # Levenshteinアルゴリズムの結果
│   ├── tfidf/                   # TF-IDF使用時の結果
│   ├── tfidf-levenshtein/       # TF-IDF + Levenshteinの結果
│   ├── chatgpt/                 # ChatGPT APIを使用した結果（モデル別）
│   │   ├── gpt-5/               # GPT-5の結果
│   │   ├── gpt-5-mini/          # GPT-5-miniの結果
│   │   └── gpt-5-nano/          # GPT-5-nanoの結果
│   └── summary/                 # 全体サマリー
└── scripts/                     # ベンチマーク実行スクリプト
    ├── run-accuracy-test.js     # 精度テスト実行
    ├── compare-algorithms.js    # アルゴリズム比較
    ├── generate-report.js       # レポート生成
    ├── run-chatgpt-test.js      # ChatGPT APIテスト
    ├── prompt-template.txt      # ChatGPT用プロンプトテンプレート
    └── README_CHATGPT.md        # ChatGPTテストの詳細ドキュメント
```

## 使い方

### 1. テストデータの準備

`magi_ocr_data/dataset.tsv`にテストデータを配置してください。
フォーマットの詳細は`magi_ocr_data/README.md`を参照してください。

### 2. ベンチマークの実行

```bash
# 全アルゴリズム比較 + レポート生成（デフォルト）
npm run benchmark

# 単一アルゴリズムのテスト
npm run benchmark:single [algorithm]

# 全アルゴリズムの比較（レポートなし）
npm run benchmark:compare

# レポート生成のみ
npm run benchmark:report

# ChatGPT APIを使用したテスト（上位50件、デフォルト: gpt-5-mini）
export OPENAI_API_KEY="sk-..."
npm run benchmark:chatgpt

# 異なるモデルでテスト（gpt-5, gpt-5-mini, gpt-5-nano）
npm run benchmark:chatgpt -- --model gpt-5 --limit 30
npm run benchmark:chatgpt -- --model gpt-5-nano --limit 100
```

**ChatGPTテストの詳細**: `scripts/README_CHATGPT.md` を参照してください。

**注意**: ChatGPTの結果は`chatgpt/{model}/`ディレクトリにモデル別に保存されます。レポート生成時に各モデルの最新結果が自動的に集計され、比較レポートに表示されます。

### 3. 結果の確認

- 各アルゴリズムの詳細結果: `results/{algorithm}/`
- 全体サマリー: `results/summary/latest_comparison.tsv`

## アルゴリズムの種類

### 従来のアルゴリズム

1. **jaro-winkler**: Jaro-Winkler距離を使用（デフォルト）
2. **levenshtein**: Levenshtein距離を使用
3. **tfidf**: TF-IDF + Jaro-Winkler距離を使用
4. **tfidf-levenshtein**: TF-IDF + Levenshtein距離を使用

### ChatGPT API

5. **chatgpt-{model}**: ChatGPT APIを使用したプロンプトベースの誤字修正
   - プロンプトテンプレートをカスタマイズ可能
   - 上位50件のみテスト（コスト削減のため）
   - 詳細は `scripts/README_CHATGPT.md` を参照

## 精度指標

- **正解率（Accuracy）**: 完全一致した割合
- **平均実行時間**: 1件あたりの平均処理時間（ミリ秒）

## 注意事項

- `results/`ディレクトリの内容は`.gitignore`で除外されています
- テスト結果はタイムスタンプ付きで保存されるため、履歴を追跡できます
- 大量のテストデータを実行する場合は、処理時間に注意してください

