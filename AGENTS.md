# AGENTS.md

このドキュメントは、AIエージェント（コーディングアシスタント）がyukichantプロジェクトを理解し、効果的に開発支援を行うためのガイドです。

## 重要な指示

**このプロジェクトでは、すべてのコミュニケーションを日本語で行ってください。**

- コード提案時の説明は日本語で記述する
- コミットメッセージは日本語で記述する
- レビューコメントは日本語で記述する
- エラーメッセージの説明は日本語で記述する
- ドキュメント・コメントは日本語で記述する

## プロジェクト概要

**yukichant**は、テキストデータを日本語の詠唱呪文（魔法の言葉）に変換し、元のテキストに復号できるNode.js製のCLIツールです。

### 主な機能
- **エンコード**: 任意のテキストを呪文風の日本語文章に変換
- **デコード**: 呪文を元のテキストに復号
- **誤字修正**: 呪文のタイポを自動修正してデコード（Jaro-Winkler / Levenshtein）
- **ランダム生成**: ランダムな呪文を生成

### 技術スタック
- **言語**: JavaScript (ES Modules)
- **形態素解析**: kuromoji（yukidic辞書使用）
- **文字列類似度**: Jaro-Winkler（独自実装）、fastest-levenshtein
- **暗号化**: 独自のローター型暗号実装

## アーキテクチャ

### ディレクトリ構造

```
yukichant/
├── src/               # ソースコード
│   ├── cli.js        # CLIエントリーポイント（commander使用）
│   ├── index.js      # メインロジック（encode/decode/generate）
│   ├── node.js       # Node.js環境用エントリーポイント
│   ├── browser.js    # ブラウザ環境用エントリーポイント
│   ├── machine-encrypt.js      # ローター型暗号実装
│   ├── typo-correction.js      # 誤字修正ロジック
│   ├── fuzzy-kanji-match.js    # 漢字類似度マッチング
│   ├── jaro-winkler.js         # Jaro-Winkler実装
│   └── logger.js     # ロギングユーティリティ
├── data/             # 名詞・動詞データ（JSON）
│   ├── meisi.json    # 名詞辞書（16進数コード→名詞リスト）
│   └── dousi.json    # 動詞辞書（16進数コード→動詞リスト）
├── scripts/          # 辞書生成・メンテナンス用スクリプト
│   ├── generate-meisi.js  # 名詞辞書生成
│   ├── generate-dousi.js  # 動詞辞書生成
│   ├── regroup.js         # 辞書の再グループ化
│   ├── analyze.js         # 辞書の分析
│   └── helpers.js         # 共通ユーティリティ
├── dic/              # kuromoji用辞書（yukidic）
├── benchmark/        # ベンチマーク・精度測定
│   ├── magi_ocr_data/  # Magiプロジェクトから取得したOCRテストデータ
│   ├── results/        # 検証結果の保存先（.gitignore対象）
│   └── scripts/        # ベンチマーク実行スクリプト
├── __tests__/        # Jest単体テスト
├── .github/          # GitHub Actionsワークフロー
└── .husky/           # Gitフック設定（commit-msg）
```

### データフロー

#### エンコード
```
テキスト
  → UTF-8バイト配列
  → ローター暗号でスクランブル
  → 16進数（2桁）に変換
  → 名詞/動詞マッピング（4語ごとに動詞）
  → 呪文文字列
```

#### デコード
```
呪文文字列
  → kuromoji形態素解析
  → 辞書マッチング（正規表現）
  → （オプション）誤字修正
  → 16進数コード復元
  → ローター暗号で復号
  → UTF-8テキスト
```

## 重要なコンポーネント

### 1. `src/index.js` - コアロジック

#### `encode(text, option, data, encoder)`
- テキストをUTF-8バイト配列に変換
- `simpleEnigma`でスクランブル
- 16進数コードを名詞・動詞にマッピング
- パターン: `名詞 名詞 名詞 動詞。` の繰り返し

#### `decode(text, option, data, decoder)`
- `kuromoji`で形態素解析
- 辞書から逆引き（名詞/動詞 → 16進数コード）
- オプションで誤字修正（`typo-correction.js`）
- `simpleEnigma`で復号

#### `generate(length, data, generater)`
- ランダムバイト配列を生成
- エンコードして呪文を生成

### 2. `src/typo-correction.js` - 誤字修正

#### 主要関数

##### `exec(text, option)`
誤字修正のメインエントリーポイント
- `kuromoji`で形態素解析
- 未知の形態素を検出・修正
- オプションに応じて類似度アルゴリズムを選択

##### `findClosestWord(word, wordList, useLevenshtein, option)`
最も近い単語を辞書から検索
- `useLevenshtein=true`: Levenshtein距離
- `useLevenshtein=false`: Jaro-Winkler距離（デフォルト）

##### `nearTokenMatch(tokenStr, option)`
TF-IDF重み付けを使った高度なマッチング
- 漢字の部首・構造情報を活用
- `fuzzy-kanji-match.js`と連携

##### `organizeUnknownTokens(ntokens, option)`
連続する未知の形態素をまとめる
- 副詞・助詞の処理
- 形態素の位置情報を保持

#### オプション
- `is_tfidf`: TF-IDF重み付けを使用（デフォルト: false）
- `Levenshtein`: Levenshtein距離を使用（デフォルト: false、Jaro-Winkler）
- `v`: デバッグ出力（修正前後を表示）
- `Vv`: 詳細デバッグ出力（類似度スコアなど）

### 3. `src/machine-encrypt.js` - ローター型暗号

Enigma機を模した暗号化アルゴリズム
- バイトコードの頻度分布を均等化
- 同じ入力に対して異なる暗号文を生成可能

### 4. `src/jaro-winkler.js` - 文字列類似度

#### `JaroWinklerDistance`クラス
- `similarity(s1, s2)`: 0～1の類似度スコア（1が完全一致）
- 接頭辞一致に高い重みを与える（日本語に適している）
- パラメータ:
  - `prefixScale`: 0.1（接頭辞の重み）
  - `boostThreshold`: 0.7
  - `prefixLength`: 4

### 5. データ形式

#### `data/meisi.json`, `data/dousi.json`
```json
{
  "00": {
    "firstKanji": "単",
    "mora": "たんご",
    "words": ["単語1", "単語2", ...],
    "readings": ["タンゴ1", "タンゴ2", ...]
  },
  ...
}
```
- キー: 2桁16進数（00～FF、256種類）
- 値: グループ情報を持つオブジェクト
  - `firstKanji`: グループに含まれる単語の先頭漢字のリスト
  - `mora`: グループで一致している先頭の拍（名詞は2拍、動詞は3拍）
  - `words`: そのコードに対応する単語（サーフェス）のリスト
  - `readings`: 各単語のフル読みのリスト

## 開発ガイドライン

### ブランチ運用と修正ルール
- **`master`ブランチへの直接プッシュは禁止されています。**
- すべての修正は機能ブランチ（feature/fix等）で行い、**Pull Request (PR)** を通じて`master`にマージしてください。
- PRが作成されると、GitHub Actionsによってテストが自動実行されます。

### コーディング規約
- ES Modules（`import`/`export`）を使用
- 非同期処理は`async`/`await`
- 関数型プログラミングスタイル（`map`, `filter`, `reduce`多用）
- Unicode正規表現（`\p{scx=Han}`など）を積極的に使用

### テスト
```bash
npm test  # Jestで単体テスト実行
```

テストファイル: `__tests__/*.js`

### ビルド・実行
```bash
# 開発モード（エンコード）
npm run dev unko

# 開発モード（デコード）
echo "呪文" | npm run dev -- -d

# 誤字修正付きデコード
echo "呪文" | npm run dev -- -d -s

# Levenshteinアルゴリズム使用
echo "呪文" | npm run dev -- -d -s --levenshtein

# デバッグ出力
echo "呪文" | npm run dev -- -d -s -vv
```

### 辞書データ更新
辞書データの生成・更新には `scripts/` 配下のスクリプトを使用します。

```bash
# meisi.json, dousi.json, regroup.js を一括実行
npm run json-generate

# 名詞辞書のみ生成
npm run json-generate:meisi

# 動詞辞書のみ生成
npm run json-generate:dousi

# 辞書の再グループ化（16進数コードの割り当て調整）
npm run json-regroup

# 辞書の分析（カバー率など）
npm run json-analyze
```

### ベンチマーク
```bash
# 全アルゴリズム比較 + レポート生成（デフォルト）
npm run benchmark

# 単一アルゴリズムのテスト
npm run benchmark:single [algorithm]

# 全アルゴリズムの比較（レポートなし）
npm run benchmark:compare

# レポート生成のみ（既存のサマリーから）
npm run benchmark:report

# 最新結果を収集してレポート生成
npm run benchmark:report:latest

# ChatGPT APIを使用したテスト（上位50件、デフォルト: gpt-5-mini）
export OPENAI_API_KEY="sk-..."
npm run benchmark:chatgpt
npm run benchmark:chatgpt -- --model gpt-5 --limit 30
npm run benchmark:chatgpt -- --model gpt-5-nano --limit 100
```

**注意**: ChatGPTの結果は`chatgpt/{model}/`ディレクトリにモデル別に保存されます。レポート生成時に各モデルの最新結果が自動的に集計され、比較レポートに表示されます。

## よくある変更タスク

### 1. 新しい名詞・動詞を追加
- `raw_data/spell.txt`を編集（※元データは引き続き `raw_data/` に配置）
- `npm run json-generate`で再生成
- テストで動作確認

### 2. 誤字修正アルゴリズムの調整
- `src/jaro-winkler.js`のパラメータ調整
- または`src/typo-correction.js`の閾値調整
- `__tests__/typo-correction.js`でテスト

### 3. 新しい類似度アルゴリズムの追加
- `src/typo-correction.js`の`calculateSimilarity()`に条件分岐追加
- `src/cli.js`にコマンドラインオプション追加
- テストケース追加

### 4. 暗号化方式の変更
- `src/machine-encrypt.js`を編集
- エンコード/デコード両方で一貫性を保つ
- バージョン互換性に注意

### 5. ベンチマークデータの追加
- `benchmark/magi_ocr_data/dataset.tsv`にテストケースを追加
- TSV形式: `id`, `ocr_result`, `expected`, `description`, `image_file`
- `npm run benchmark:compare`で全アルゴリズムの精度を測定

## デバッグ Tips

### 形態素解析の確認
```javascript
// typo-correction.jsのexec()内
if (option.Vv === true) {
  console.log('ntokens', ntokens);  // 形態素リスト表示
}
```

### 類似度スコアの確認
```bash
echo "罹刹に烙印を秘術を帰ら。" | npm run dev -- -d -s -vv
# → アルゴリズム名、類似度スコア、候補単語数を表示
```

### 辞書マッチング確認
```javascript
// index.jsのdecode()内
console.log('decodeHash', Object.keys(decodeHash).length);  // 辞書サイズ
console.log('textCodeList', textCodeList);  // マッチした単語リスト
```

## 依存関係

### 重要な外部ライブラリ
- **kuromoji**: 日本語形態素解析（辞書: yukidic）
- **yukidic**: カスタム形態素解析辞書（git submodule）
- **fastest-levenshtein**: 高速Levenshtein距離計算
- **natural**: TF-IDF計算（NLP）
- **commander**: CLIフレームワーク
- **picocolors**: ターミナル色付け

### インストール時の注意
```bash
npm install
# → postinstallでyukidicをgit cloneする
```

## パフォーマンス考慮事項

### ボトルネック
1. **kuromoji初期化**: 初回起動時に辞書読み込みが発生
2. **形態素解析**: 長文のデコード時に時間がかかる
3. **類似度計算**: 辞書サイズ×未知語数に比例

### 最適化ポイント
- kuromojiのtokenizerをキャッシュ（`typo-correction.js`でモジュールスコープ変数）
- `fastest-levenshtein`を使用（C++バインディングで高速）
- 正規表現を事前コンパイル

## セキュリティ考慮事項

### 制限事項
- **暗号学的に安全ではない**: 暗号化は難読化目的のみ
- **既知平文攻撃に弱い**: 辞書が公開されているため
- **機密情報の保護には使用しない**

### 適切な用途
- ✅ テキストの難読化・遊び
- ✅ データのエンコード（可逆圧縮的用途）
- ❌ パスワード保存
- ❌ 暗号通信

## トラブルシューティング

### 問題: デコードが失敗する
- 誤字修正モード（`-s`）を試す
- `-vv`オプションで詳細ログを確認
- 辞書に単語が存在するか確認

### 問題: 形態素解析エラー
- `yukidic`辞書が正しくインストールされているか確認
- `npm install`を再実行

### 問題: テストが失敗する
- Node.jsバージョン確認（>=12.22.8）
- `NODE_OPTIONS=--experimental-vm-modules jest`が必要

## レビュー・コミットガイドライン

### レビュー時のチェックポイント
- エンコード/デコードの一貫性が保たれているか
- 既存の呪文がデコード可能か（後方互換性）
- ユニットテストが追加/更新されているか
- パフォーマンスへの影響
- 日本語のドキュメント・コメントが適切か

### コミットメッセージ
**Conventional Commits形式**で記載すること。semantic-releaseによる自動バージョニングに使用される。
**husky** により、コミット時にメッセージ形式がバリデーションされます（`.husky/commit-msg`）。

フォーマット: `種別: 簡潔な説明`（日本語の説明を推奨）

種別とリリースへの影響:

| 種別 | 内容 | リリースへの影響 |
| :--- | :--- | :--- |
| `feat` | 新機能追加 | **マイナー**リリース (1.0.0 → 1.1.0) |
| `fix` | バグ修正 | **パッチ**リリース (1.0.0 → 1.0.1) |
| `perf` | パフォーマンス改善 | **パッチ**リリース |
| `refactor` | コード整理 | **パッチ**リリース |
| `revert` | 変更の取り消し | **パッチ**リリース |
| `test` | テスト追加/修正 | リリースなし |
| `docs` | ドキュメント更新 | リリースなし |
| `chore` | その他の変更 | リリースなし |
| `ci` | CI設定の変更 | リリースなし |
| `deps` | 依存関係の更新 | リリースなし |
| `release` | リリース作業（自動生成） | リリースなし |
| (Any) | `BREAKING CHANGE:` を含む変更 | **メジャー**リリース (1.0.0 → 2.0.0) |

#### 破壊的変更（`BREAKING CHANGE:`）の判断基準

yukichantでは、**「過去に生成された呪文が正しくデコードできなくなる変更」**を最も重大な破壊的変更と見なします。

| カテゴリ | 破壊的変更と見なす例 |
| :--- | :--- |
| **呪文の互換性** | 暗号化ロジック (`machine-encrypt.js`) の変更、辞書 (`meisi.json`/`dousi.json`) のコード割り当て変更、エンコード形式の変更 |
| **CLI / API** | 既存オプション (`-d`, `-s` 等) の削除・リネーム、`encode`/`decode` 関数の引数・戻り値の型変更 |
| **環境** | Node.js サポートバージョンの切り上げ、必須となる外部バイナリの追加 |

**注意**: 単なる単語の追加（既存のコード割り当てを維持したまま `words` 配列に要素を増やす）や、誤字修正アルゴリズムの精度向上（既存の正しい呪文のデコードに影響しないもの）は、通常 `feat` または `refactor` として扱い、破壊的変更には含めません。

破壊的変更がある場合はフッターに `BREAKING CHANGE:` を記載してください。

例:
```
feat: Levenshtein距離アルゴリズムを追加
fix: デコード時の形態素解析エラーを修正
docs: 誤字修正アルゴリズムの使い方を追加
refactor: 類似度計算処理を関数化
test: typo-correctionのテストケースを追加

feat: 暗号化方式を変更

BREAKING CHANGE: 既存の呪文との互換性がなくなります
```

**注意**: commitlint + huskyにより、ローカルでのコミット時にメッセージ形式がバリデーションされる。形式に沿わないコミットは拒否される。

### リリースフロー

バージョン管理とnpm公開はsemantic-releaseにより完全自動化されている。

1. 開発者がブランチで作業し、Conventional Commits形式でコミット
2. PRを作成すると、GitHub Actionsがdry-runでバージョン予告をPRにコメント
3. PRをmasterにマージすると、semantic-releaseが自動的に:
   - コミットメッセージからバージョンを決定
   - `package.json`のバージョンを更新
   - `CHANGELOG.md`を生成
   - Gitタグを作成
   - npmに公開
   - GitHubリリースを作成

**手動でのバージョン変更やタグ作成は不要。**

## ベンチマーク機能

### 概要

`benchmark/`ディレクトリには、誤字修正機能の精度を測定するためのテストデータとスクリプトが含まれています。

### データソース

- **Magi OCRデータ**: [Chantプロジェクト](https://github.com/xztaityozx/Chant)から取得したOCRテストデータ
- 画像に書かれた呪文をOCRで読み取った結果と正解データのペア
- yukichantの誤字修正機能の精度評価に使用

### ディレクトリ構造

```
benchmark/
├── magi_ocr_data/      # Magiプロジェクトから取得したOCRテストデータ
│   ├── dataset.tsv     # テストデータ（TSV形式）
│   └── images/         # OCR元画像（オプション）
├── results/            # 検証結果の保存先（.gitignore対象）
│   ├── jaro-winkler/   # Jaro-Winklerアルゴリズムの結果
│   ├── levenshtein/    # Levenshteinアルゴリズムの結果
│   ├── tfidf/          # TF-IDF使用時の結果
│   ├── tfidf-levenshtein/  # TF-IDF + Levenshteinの結果
│   ├── chatgpt/        # ChatGPT APIを使用した結果（モデル別）
│   │   ├── gpt-5/      # GPT-5の結果
│   │   ├── gpt-5-mini/ # GPT-5-miniの結果
│   │   └── gpt-5-nano/ # GPT-5-nanoの結果
│   └── summary/        # 全体サマリー
└── scripts/            # ベンチマーク実行スクリプト
    ├── run-accuracy-test.js     # 単一アルゴリズムのテスト
    ├── compare-algorithms.js    # 全アルゴリズムの比較
    ├── generate-report.js       # レポート生成
    ├── run-chatgpt-test.js      # ChatGPT APIテスト
    ├── prompt-template.txt      # ChatGPT用プロンプトテンプレート
    └── README_CHATGPT.md        # ChatGPTテストの詳細ドキュメント
```

### データフォーマット

#### 入力データ（dataset.tsv）
```tsv
id	ocr_result	expected	description	image_file
001	罹刹に烙印を秘術を帰ら。	羅刹に烙印を秘術を刻ら。	漢字の誤認識（罹→羅、帰→刻）	test001.png
```

#### 検証結果（results/{algorithm}/YYYYMMDD_HHMMSS_result.tsv）
```tsv
id	input	expected	corrected	is_correct	algorithm	options	execution_time_ms
001	罹刹に烙印を秘術を帰ら。	羅刹に烙印を秘術を刻ら。	羅刹に烙印を秘術を刻ら。	true	jaro-winkler	{"is_tfidf":false}	45.2
```

### 使用方法

```bash
# 全アルゴリズム比較 + レポート生成（デフォルト）
npm run benchmark

# 単一アルゴリズムのテスト
npm run benchmark:single [algorithm]

# 全アルゴリズムの比較（レポートなし）
npm run benchmark:compare

# レポート生成のみ（精度順にソート、最速・バランス推奨を表示）
npm run benchmark:report

# ChatGPT APIを使用したテスト（上位50件、コスト削減のため）
export OPENAI_API_KEY="sk-..."
npm run benchmark:chatgpt
npm run benchmark:chatgpt -- --model gpt-5 --limit 30
npm run benchmark:chatgpt -- --model gpt-5-nano --limit 100
```

**注意**: ChatGPTの結果は`chatgpt/{model}/`ディレクトリにモデル別に保存されます。レポート生成時に各モデルの最新結果が自動的に集計され、比較レポートに表示されます。

### ChatGPT APIテスト

ChatGPT APIを使用したプロンプトベースの誤字修正テストも利用可能です。

**特徴**:
- プロンプトテンプレートをカスタマイズ可能（`benchmark/scripts/prompt-template.txt`）
- 予算の都合上、デフォルトで上位50件のみテスト
- 複数のモデル（gpt-5-nano, gpt-5-mini, gpt-5）をサポート
- 結果は他のアルゴリズムと同様にサマリーに統合される

**詳細**: `benchmark/scripts/README_CHATGPT.md` を参照

### 精度指標

- **正解率（Accuracy）**: 完全一致した割合
- **平均実行時間**: 1件あたりの平均処理時間（ミリ秒）

### ベンチマーク結果の活用

1. **アルゴリズムの比較**: 各アルゴリズムの精度と速度を比較
2. **パラメータ調整**: アルゴリズムのパラメータを調整して精度向上
3. **リグレッションテスト**: コード変更後の精度低下を検出
4. **デフォルトアルゴリズムの選定**: 最適なアルゴリズムを選択

## 参考リンク

- [kuromoji.js](https://github.com/takuyaa/kuromoji.js)
- [yukidic辞書](https://github.com/amanoese/yukidic)
- [Jaro-Winkler距離](https://en.wikipedia.org/wiki/Jaro%E2%80%93Winkler_distance)
- [Levenshtein距離](https://en.wikipedia.org/wiki/Levenshtein_distance)
- [Enigma暗号機](https://en.wikipedia.org/wiki/Enigma_machine)
- [Chantプロジェクト（Magi）](https://github.com/xztaityozx/Chant) - OCRテストデータの出典

---

**最終更新日: 2026-03-02**

**このドキュメントは、AIエージェントがプロジェクトを理解し、コンテキストに沿った提案を行うためのガイドです。人間の開発者が読む場合は、まず[README.md](./README.md)と[develop.md](./doc/develop.md)を参照してください。**

