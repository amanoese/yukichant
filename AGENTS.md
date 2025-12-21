# AGENTS.md

このドキュメントは、AIエージェント（コーディングアシスタント）がyukichantプロジェクトを理解し、効果的に開発支援を行うためのガイドです。

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
│   ├── machine-encrypt.js      # ローター型暗号実装
│   ├── typo-correction.js      # 誤字修正ロジック
│   ├── fuzzy-kanji-match.js    # 漢字類似度マッチング
│   └── jaro-winkler.js         # Jaro-Winkler実装
├── data/             # 名詞・動詞データ（JSON）
│   ├── meisi.json    # 名詞辞書（16進数コード→名詞リスト）
│   └── dousi.json    # 動詞辞書（16進数コード→動詞リスト）
├── dic/              # kuromoji用辞書（yukidic）
├── __tests__/        # Jest単体テスト
└── raw_data/         # 辞書生成用スクリプト・元データ
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
  "00": ["単語1", "単語2", ...],
  "01": [...],
  ...
  "FF": [...]
}
```
- キー: 2桁16進数（00～FF、256種類）
- 値: その16進数に対応する単語のリスト

## 開発ガイドライン

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
```bash
# meisi.jsonを再生成
./raw_data/meisi_json_generator

# dousi.jsonの生成
./raw_data/json_generator
```

## よくある変更タスク

### 1. 新しい名詞・動詞を追加
- `raw_data/spell.txt`を編集
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
**日本語で記載する**こと。

推奨フォーマット: `[種別] 簡潔な説明`

種別の例:
- `[feat]`: 新機能追加
- `[fix]`: バグ修正
- `[perf]`: パフォーマンス改善
- `[refactor]`: コード整理
- `[test]`: テスト追加/修正
- `[docs]`: ドキュメント更新
- `[deps]`: 依存関係の更新
- `[chore]`: その他の変更

例:
```
[feat] Levenshtein距離アルゴリズムを追加
[fix] デコード時の形態素解析エラーを修正
[docs] 誤字修正アルゴリズムの使い方を追加
[refactor] 類似度計算処理を関数化
[test] typo-correctionのテストケースを追加
```

## 参考リンク

- [kuromoji.js](https://github.com/takuyaa/kuromoji.js)
- [yukidic辞書](https://github.com/amanoese/yukidic)
- [Jaro-Winkler距離](https://en.wikipedia.org/wiki/Jaro%E2%80%93Winkler_distance)
- [Levenshtein距離](https://en.wikipedia.org/wiki/Levenshtein_distance)
- [Enigma暗号機](https://en.wikipedia.org/wiki/Enigma_machine)

---

**このドキュメントは、AIエージェントがプロジェクトを理解し、コンテキストに沿った提案を行うためのガイドです。人間の開発者が読む場合は、まず[README.md](./README.md)と[develop.md](./doc/develop.md)を参照してください。**

