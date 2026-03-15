Develop
---

## install dependency
```bash
$ npm install
```

## execute command
```bash
## run encode
$ npm run dev unko
## run decode
$ npm run dev unko | npm run dev -- -d
```

## generate meisi.json / dousi.json
```bash
$ npm run json-generate
```

## 誤字修正アルゴリズム

### 概要
誤字修正機能は、文字列類似度アルゴリズムを使用して、誤字を含む単語を正しい辞書エントリにマッチングします。

### 利用可能なアルゴリズム

#### 1. Jaro-Winkler距離（デフォルト）
- **実装**: `src/jaro-winkler.js`
- **適用場面**: 日本語テキスト、接頭辞を重視したマッチング
- **パラメータ**:
  - `prefixScale`: 0.1（共通接頭辞の重み）
  - `boostThreshold`: 0.7（接頭辞ブーストを適用する最小スコア）
  - `prefixLength`: 4（考慮する接頭辞の最大長）
- **使用方法**: デフォルト動作、フラグ不要

#### 2. Levenshtein距離
- **ライブラリ**: `fastest-levenshtein`
- **適用場面**: 厳密な編集距離マッチング
- **使用方法**: `--levenshtein` フラグを追加

### アルゴリズムのテスト

```bash
## Jaro-Winkler + TF-IDF でテスト（デフォルト）
$ echo 罹刹に烙印を秘術を帰ら。 | npm run dev -- -d -vv

## Levenshteinでテスト
$ echo 罹刹に烙印を秘術を帰ら。 | npm run dev -- -d --levenshtein -vv

## 誤字修正を無効化したstrict decode
$ echo 罹刹に烙印を秘術を帰ら。 | npm run dev -- -d -s -vv

## ユニットテストの実行
$ npm test
```

### 依存更新（`yukidic`）時の手順

```bash
## 依存を正しい状態にする
$ npm install

## 必要に応じてyukidicを最新化
$ npm install "yukidic@github:amanoese/yukidic"
$ npm install

## 回帰確認
$ npm test
```

### テスト修正時の注意点

- テスト失敗時は、まず**実装バグ**と**辞書更新（`yukidic`）起因の期待値差分**を切り分ける
- 期待値を更新する前に、依存（`yukidic` / `kanjivg-radical`）を `npm install` で復元する
- CLI回帰テストは原則として**固定文字列**を使用し、安易に動的生成へ戻さない
- 誤字系テストは `-d` / `-d -s` / `-d --levenshtein` の3系統で確認する
- 期待値更新後は `npm test` を再実行し、必要に応じてCLIを手動実行して出力を確認する

### CLI回帰テストで使う固定文字列

`__tests__/cli.js` では、辞書更新後の挙動で固定化した以下の文字列を使用します。

- 正常呪文: `破滅を御前に意に従い借り。` → `unko`
- 誤字呪文: `破滅を御前に意に従い借リ。`
  - `-d` では `unko` に復号される
  - `-d -s` では `unko` にならない
  - `-d --levenshtein` では `unko` に復号される

### 実装の詳細

誤字修正のロジックは `src/typo-correction.js` にあります：
- `calculateSimilarity()`: 選択されたアルゴリズムを使用して類似度スコアを計算
- `findClosestWord()`: 辞書から最も近い一致を検索
- `exec()`: 誤字修正を含むテキスト処理のメイン関数

TF-IDF重み付けは `--no-tfidf` フラグで有効/無効を切り替えることができ、単語の重要度スコアを調整します。

## ベンチマーク

### 概要

`benchmark/`ディレクトリには、誤字修正機能の精度を測定するためのテストデータとスクリプトが含まれています。
[Chantプロジェクト（Magi）](https://github.com/xztaityozx/Chant)のOCRテストデータを使用して、各アルゴリズムの精度を比較できます。

### ベンチマークの実行

```bash
## 全アルゴリズム比較 + レポート生成（デフォルト）
$ npm run benchmark

## 単一アルゴリズムのテスト
$ npm run benchmark:single [algorithm]

## 特定のアルゴリズムでテスト
$ npm run benchmark:single jaro-winkler
$ npm run benchmark:single levenshtein
$ npm run benchmark:single tfidf
$ npm run benchmark:single tfidf-levenshtein

## 全アルゴリズムを比較（レポートなし）
$ npm run benchmark:compare

## レポート生成のみ
$ npm run benchmark:report
```

### テストデータの追加

`benchmark/magi_ocr_data/dataset.tsv`にテストケースを追加できます：

```tsv
id	ocr_result	expected	description	image_file
001	罹刹に烙印を秘術を帰ら。	羅刹に烙印を秘術を刻ら。	漢字の誤認識（罹→羅、帰→刻）	
```

### 結果の確認

- 各アルゴリズムの詳細結果: `benchmark/results/{algorithm}/`
- 全体サマリー: `benchmark/results/summary/latest_comparison.tsv`

詳細は `benchmark/README.md` を参照してください。
