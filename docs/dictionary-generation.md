# 辞書生成ロジック

yukichant の `meisi.json`（名詞辞書）と `dousi.json`（動詞辞書）の生成・再グルーピングのロジックをまとめたドキュメントです。

## 概要

辞書生成は以下の3段階で行われます。

1. **名詞辞書の初回生成** (`scripts/generate-meisi.js`)
2. **動詞辞書の初回生成** (`scripts/generate-dousi.js`)
3. **発音ベースの再グルーピング** (`scripts/regroup.js`)

発音の妥当性を検証するための **発音分析スクリプト** (`scripts/analyze.js`) も用意されています。

```mermaid
flowchart LR
    subgraph 入力
        A[assets/spell.txt]
        B[assets/ng-words.txt]
    end

    subgraph 1.名詞辞書生成
        C[scripts/generate-meisi.js]
        D[data/meisi.json]
    end

    subgraph 2.動詞辞書生成
        E[scripts/generate-dousi.js]
        F[data/dousi.json]
    end

    subgraph 3.発音ベース再グルーピング
        G[scripts/regroup.js]
    end

    subgraph 検証
        H[scripts/analyze.js]
    end

    A --> C
    B --> C
    C --> D
    C -->|名詞リスト| E
    A --> E
    B --> E
    E --> F
    D --> G
    F --> G
    G -->|上書き| D
    G -->|上書き| F
    D --> H
    F --> H
```

### 名詞と動詞の違い

| 項目 | 名詞 (meisi) | 動詞 (dousi) |
|------|-------------|--------------|
| **形態素** | 名詞（+連体化助詞結合語） | 動詞 |
| **初回グルーピング基準** | 先頭の漢字 | 基本形 |
| **形態素解析** | mecab のみ | mecab + kuromoji（IPAdic） |
| **他辞書との関係** | 名詞リストを標準出力（動詞生成で除外に使用） | 名詞リストと重複する語を除外 |
| **16進コード順序** | 0A, E3, 81-83 優先 → 20~FF → 00~1F, DF | 20~FF → 00~1F |
| **再グルーピング方針** | 先頭2拍が同じサブグループをマージ | 先頭3拍で分割し、読みが完全一致する語をマージ |
| **同一コード内の発音一致** | 先頭2拍で一致 | 先頭3拍で一致 |
| **コード間の発音衝突** | 0% (先頭2拍) | 0% (先頭3拍) |
| **JSON構造** | オブジェクト形式（firstKanji [リスト], mora, words, readings） | オブジェクト形式（firstKanji [リスト], mora, words, readings） |

---

## 1. 名詞辞書の初回生成 (scripts/generate-meisi.js)

### 入力

- `assets/spell.txt` … Base64エンコードされた呪文テキスト
- `assets/ng-words.txt` … 除外する単語リスト（1行1語、`#`で始まる行はコメント）

### 処理フロー

```
assets/spell.txt (Base64)
  → デコード
  → mecab で形態素解析
  → 名詞（+助詞結合語）を抽出
  → 重複排除・フィルタリング
  → 部分一致除外
  → NG単語除外
  → 先頭漢字でグルーピング
  → 16進コードに割り当て
  → data/meisi.json 出力
```

```mermaid
flowchart TD
    A[assets/spell.txt Base64] --> B[デコード]
    B --> C[mecab 形態素解析]
    C --> D[名詞+助詞結合語を抽出]
    D --> E[重複排除・フィルタ]
    E --> F[部分一致除外]
    F --> G[NG単語除外]
    G --> H[先頭漢字でグルーピング]
    H --> I[語数順ソート]
    I --> J[上位257グループ採用]
    J --> K[16進コード割り当て]
    K --> L[data/meisi.json 出力]
```

### 詳細

#### 名詞抽出 (extractNouns)

mecab の形態素解析結果から、名詞および「名詞+連体化助詞」の結合語を抽出します。

- 名詞が来たら蓄積を開始
- 連体化助詞（「の」など）が続いた場合は結合
- 連体化助詞の直後に名詞以外が来たらリセット

#### フィルタリング

- **重複排除**: `sort -u` 相当でユニーク化
- **長さ・漢字**: 2文字以上かつ漢字を含む語のみ
- **部分一致除外**: 他の語の部分文字列になっている語を除外
- **NG単語除外**: `assets/ng-words.txt` に含まれる語を除外

#### グルーピング (groupByFirstKanji)

- 各語の**先頭の漢字**でグルーピング
- 語数が多いグループを上位にソート
- 上位257グループを採用（実際は256コードに割り当て）

#### 16進コードの割り当て順序 (generateMeisiHexOrder)

```
優先: 0A, E3, 81, 82, 83
中間: 20~FF（81, 82, 83, DF, E3 を除く）
末尾: 00~1F（0A を除く）, DF
```

### 出力

- `data/meisi.json` … `{ "00": { "firstKanji": [...], "mora": "...", "words": [...], "readings": [...] }, ... }` 形式
- 標準出力 … 名詞リスト（scripts/generate-dousi.js が参照）

```mermaid
flowchart LR
    subgraph 辞書構造["meisi.json / dousi.json"]
        A["00"] --> B["グループ情報オブジェクト"]
        B --> B1["firstKanji (リスト)"]
        B --> B2["mora"]
        B --> B3["words (リスト)"]
        B --> B4["readings (リスト)"]
    end
```

---

## 2. 動詞辞書の初回生成 (scripts/generate-dousi.js)

### 入力

- `assets/spell.txt` … 同上
- `assets/ng-words.txt` … 同上
- `scripts/generate-meisi.js` の標準出力 … 名詞リスト（動詞候補から除外するため）

### 処理フロー

```
scripts/generate-meisi.js 実行 → 名詞リスト取得
assets/spell.txt (Base64)
  → デコード
  → mecab で形態素解析
  → 動詞を抽出（漢字動詞 + ひらがな動詞の漢字変換）
  → 名詞リストと重複する語を除外
  → NG単語除外
  → 類似語スコアリング
  → 部分一致除外
  → 基本形でグルーピング
  → 16進コードに割り当て
  → data/dousi.json 出力
```

```mermaid
flowchart TD
    A[scripts/generate-meisi.js] --> B[名詞リスト取得]
    C[assets/spell.txt Base64] --> D[デコード]
    D --> E[mecab 形態素解析]
    E --> F[動詞抽出]
    F --> F1[漢字動詞]
    F --> F2[ひらがな→漢字変換]
    F1 --> G[名詞と重複除外]
    F2 --> G
    B --> G
    G --> H[NG単語除外]
    H --> I[類似語スコアリング]
    I --> J[部分一致除外]
    J --> K[基本形でグルーピング]
    K --> L[活用形数順ソート]
    L --> M[上位256グループ採用]
    M --> N[data/dousi.json 出力]
```

### 詳細

#### 動詞抽出 (extractVerbs)

- **漢字動詞**: 形態素解析で動詞と判定された漢字表記の語をそのまま採用
- **ひらがな動詞**: 基本形が3文字以上のものについて、IPAdic 辞書で読み→漢字の逆引きを試行。mecab で同じ読みの動詞として認識される場合のみ採用

#### スコアリング・フィルタリング (scoreFilterAndGroup)

- **類似語スコア**: 各動詞について、基本形リスト内で編集距離（Levenshtein）1以内のマッチ数をカウント。スコアが高い順にソート
- **部分一致除外**: 他の語の部分文字列になっている語を除外
- **基本形でグルーピング**: 同じ基本形の活用形を1グループにまとめる
- **活用形数でソート**: 活用形が多い基本形を優先して256グループを選出

#### 16進コードの割り当て順序 (generateHexOrder)

```
20~FF → 00~1F の順
```

---

## 3. 発音ベースの再グルーピング (scripts/regroup.js)

初回生成された辞書を、**読みの先頭N拍**を基準に再グルーピングします。文章（視覚）だけでなく音声でも区別しやすくするためです。

### 前提

- kuromoji（yukidic 辞書）で各単語の読み（カタカナ）を取得
- **先頭N拍（モーラ）**: 拗音（ゃゅょ等）・促音（っ）は1拍として扱う

```mermaid
flowchart LR
    subgraph 入力
        A[data/meisi.json]
        B[data/dousi.json]
    end

    subgraph 処理
        C[kuromojiで読み取得]
        D[先頭N拍を算出]
        E[グルーピング・マージ]
    end

    subgraph 出力
        F[data/meisi.json 上書き]
        G[data/dousi.json 上書き]
    end

    A --> C
    B --> C
    C --> D
    D --> E
    E --> F
    E --> G
```

### 名詞の再グルーピング (regroupMeisi)

#### 制約

- 同じ先頭漢字 × 同じ先頭N拍の単語は必ず同じコードに入る
- 先頭漢字が同じでも読みの先頭N拍が異なる場合はサブグループに分割する
- 異なるコード間で先頭N拍が衝突しないようにする

#### アルゴリズム

1. 各単語の先頭漢字と先頭N拍を kuromoji で取得
2. `(先頭漢字, 先頭N拍)` でサブグループを作成
3. 先頭N拍が同じサブグループ同士をマージ（語数を増やすため）
4. 語数順にソートして上位256グループを採用
5. 16進コードに割り当てて出力

```mermaid
flowchart TD
    A[全単語を走査] --> B[先頭漢字・先頭N拍を取得]
    B --> C["(漢字, N拍) でサブグループ作成"]
    C --> D[先頭N拍が同じサブグループをマージ]
    D --> E[語数順ソート]
    E --> F[上位256グループ採用]
    F --> G[16進コード割り当て]
    G --> H[data/meisi.json 出力]
```

#### 結果

- 同一コード内の先頭2拍不一致: 0
- コード間の先頭2拍衝突率: 0%

### 動詞の再グルーピング (scripts/regroup.js)

#### 制約

- 動詞は活用形で先頭N拍の末尾が変わる（散る/散れ/散らす）のが自然
- 同一コード内の先頭N拍不一致を分割しつつ、256キーを維持
- **読み（先頭N拍）が完全に一致する同音異義語は、同じコードに集約する**

#### アルゴリズム

1. 各コードの単語を先頭N拍でサブグループに分割
2. 最多の先頭N拍を持つサブグループをそのコードに残す
3. 少数派のサブグループは overflow リストに入れる
4. **既存のコードまたは他の overflow グループと先頭N拍が一致する場合、そのコードにマージする**
5. それでも空いているコードに、残りの overflow を割り当て

```mermaid
flowchart TD
    A[各コードを走査] --> B[先頭N拍でサブグループ化]
    B --> C[最多のN拍をコードに残す]
    C --> D[少数派を overflow へ]
    D --> E{既存コードに同じ読みがある?}
    E -->|Yes| F[そのコードにマージ]
    E -->|No| G[overflow 同士でマージ]
    F --> H[空きコードに割り当て]
    G --> H
    H --> I[data/dousi.json 出力]
```

#### 結果

- 同一コード内の先頭3拍不一致: 0
- コード間の先頭3拍衝突率: 0%（同音異義語がすべて同じコードに集約されたため）

#### 名詞と動詞の拍数設定

今回の変更で、名詞と動詞で異なる拍数設定を採用しました。

- **名詞**: **先頭2拍**を維持。名詞は語彙数が多く、3拍にするとグループが細分化されすぎて割り当て外が大量に発生するため、2拍での衝突率0%を優先しています。
- **動詞**: **先頭3拍**を採用。動詞は同音異義語（カケル、シメル等）による衝突を解消するため、3拍かつ「読みが一致する単語を同じコードにまとめる」ロジックを導入しました。

#### 3拍への変更と同音異義語の解消

以前は2拍でグルーピングしていましたが、同音異義語が別々のコードに分散して衝突が発生していました。
今回の変更で動詞に **3拍**（`MORAE_COUNT = 3`）を採用し、かつ **「読みが一致する単語は同じコードにまとめる」** ロジックを導入したことで、音声デコード時の曖昧さが解消されました。

- **3拍マージの結果**: 256キーの中に主要な動詞を収容しつつ、コード間の発音衝突を 0% にすることができました。
- **実装**: `scripts/regroup.js` および `scripts/analyze.js` 内で、対象（meisi/dousi）に応じて拍数を使い分けています。

### 実行方法

```bash
npm run json-generate
```

`data/meisi.json` と `data/dousi.json` が上書きされます。

---

## 4. 発音分析 (scripts/analyze.js)

辞書の音声区別性を検証するスクリプトです。

```mermaid
flowchart TD
    A[data/meisi.json / data/dousi.json] --> B[kuromojiで読み取得]
    B --> C[先頭N拍を算出]
    C --> D[同一コード内分析]
    C --> E[コード間衝突分析]
    D --> F[一致/不一致の件数]
    E --> G[衝突率]
```

### 分析内容

1. **同一コード内の分析**: 同じ16進コードに割り当てられた単語同士で、最初のN拍が一致しているか
2. **コード間の衝突分析**: 異なる16進コードの単語で、最初のN拍が同じものがあるか（衝突率）

### 実行方法

```bash
npm run json-analyze
```

### 出力例

```
=== meisi.json の発音分析（先頭2拍） ===

[meisi] 同一コード内の分析結果:
  最初の2拍が一致: 161 コード
  最初の2拍が不一致: 0 コード

=== 異なるコード間での発音の衝突分析 ===

[meisi] 異なるコード間の最初の2拍衝突:
  衝突している最初の2拍の種類: 0
  衝突率: 0.0%
```

---

## 補足: 先頭N拍の算出

```javascript
// カタカナ → ひらがな変換
function katakanaToHiragana(str) {
  return str.replace(/[\u30A1-\u30F6]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

// 読みから最初のN拍を取得
// 拗音（ぁぃぅぇぉゃゅょゎ）・促音（っ）は直前の文字と合わせて1拍
function getFirstNMorae(reading, n) {
  const hira = katakanaToHiragana(reading);
  const morae = [];
  const smallKana = 'ぁぃぅぇぉゃゅょゎっ';
  for (let i = 0; i < hira.length && morae.length < n; i++) {
    let mora = hira[i];
    if (i + 1 < hira.length && smallKana.includes(hira[i + 1])) {
      mora += hira[i + 1];
      i++;
    }
    morae.push(mora);
  }
  return morae.join('');
}
```

例: 「黄昏」→ タソガレ → 最初の2拍は「たそ」

```mermaid
flowchart LR
    A["黄昏"] --> B[kuromoji]
    B --> C["タソガレ"]
    C --> D[ひらがな変換]
    D --> E["たそがれ"]
    E --> F[最初のN拍抽出]
    F --> G["たそ"]

    style G fill:#e1f5e1
```

```mermaid
flowchart TD
    subgraph 拗音・促音の扱い
        A["きゃ → 1拍"]
        B["きょ → 1拍"]
        C["っ → 直前と合わせて1拍"]
    end

    subgraph 例
        D["流星 リュウセイ → りゅう"]
        E["活殺 カッサツ → かっさ"]
    end
```

---

## 辞書更新の手順

```mermaid
flowchart TD
    A[1. assets/spell.txt / NG単語を編集] --> B[2. scripts/generate-meisi.js]
    B --> C[3. scripts/generate-dousi.js]
    C --> D[4. scripts/regroup.js]
    D --> E[5. scripts/analyze.js で検証]
    E --> F[6. npm test]
```

1. `assets/spell.txt` や `assets/ng-words.txt` を編集（必要な場合）
2. 名詞辞書を再生成: `npm run json-generate:meisi`（出力は dousi 生成で使用）
3. 動詞辞書を再生成: `npm run json-generate:dousi`
4. 発音ベースで再グルーピング: `npm run json-regroup`
5. 検証: `npm run json-analyze`
6. テスト: `npm test`
