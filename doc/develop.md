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

## generate meisi.json
```bash
$ ./raw_data/meisi_json_generator
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
## Jaro-Winklerでテスト（デフォルト）
$ echo 罹刹に烙印を秘術を帰ら。 | npm run dev -- -d -s -vv

## Levenshteinでテスト
$ echo 罹刹に烙印を秘術を帰ら。 | npm run dev -- -d -s --levenshtein -vv

## ユニットテストの実行
$ npm test
```

### 実装の詳細

誤字修正のロジックは `src/typo-correction.js` にあります：
- `calculateSimilarity()`: 選択されたアルゴリズムを使用して類似度スコアを計算
- `findClosestWord()`: 辞書から最も近い一致を検索
- `exec()`: 誤字修正を含むテキスト処理のメイン関数

TF-IDF重み付けは `--no-tfidf` フラグで有効/無効を切り替えることができ、単語の重要度スコアを調整します。
