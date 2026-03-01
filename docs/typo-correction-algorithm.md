# 誤字修正アルゴリズム（typo-correction）概要

このドキュメントは、`src/typo-correction.js` の誤字修正処理（`exec()` を中心）を、Mermaid図で俯瞰できるようにまとめたものです。

## 全体像（`exec()` の流れ）

```mermaid
flowchart TD
  A["入力: 呪文テキスト"] --> B["形態素解析: kuromojiでtokenize"]
  B --> C["トークンを分割: 引用文字列(ptokens) / それ以外(ntokens)"]
  C --> D{"ntokens が空か"}
  D -- "はい" --> E["修正不要: そのまま返す"]
  D -- "いいえ" --> F["organizeUnknownTokens: 連続トークンをひとかたまりに整理"]
  F --> G["記号を除外し、末尾の「。」を一時的に除去"]
  G --> H{"is_tfidf が true か"}
  H -- "true" --> I["nearTokenMatch: TF-IDF漢字候補を試し最良マッチへ寄せる"]
  H -- "false" --> J["findClosestWord: 辞書から最も近い単語を探索"]
  I --> K["候補語に置換（修正対象トークン → 推定語）"]
  J --> K
  K --> L["ptokens と fixedTokens を位置でソートして結合"]
  L --> M["join して修正済みテキスト生成"]
  M --> N["出力: corrected text"]
```

## 未知トークンの補正ロジック（距離系 / TF-IDF系）

```mermaid
flowchart TD
  U["未知トークン（または未知トークンの連続）"] --> V["候補語リストを用意"]
  V --> W{"is_tfidf が true か"}

  W -- "false" --> X{"Levenshtein を使うか"}
  X -- "false" --> Y["Jaro-Winkler でスコア化"]
  X -- "true" --> Z["Levenshtein 距離でスコア化"]
  Y --> S["最良候補を選択"]
  Z --> S

  W -- "true" --> T["nearTokenMatch（TF-IDF）"]
  T --> T1["TF-IDF / 特徴量で重み付け"]
  T1 --> T2["漢字の類似度も加味（fuzzy-kanji-match）"]
  T2 --> S

  S --> R["置換（未知 → 最良候補）"]
```

## `findClosestWord()` の内部ロジック

```mermaid
flowchart TD
  A["入力: word / wordList / useLevenshtein"] --> B{"useLevenshtein が true か"}

  B -- "true" --> C["closest(word, wordList) を採用"]
  C --> D["distance(word, closestWord) を計算"]
  D --> Z["return closestWord"]

  B -- "false" --> E["Jaro-Winkler: wordList 全件を走査し最大 similarity の候補を得る"]
  E --> F{"maxSimilarity が 0.7 未満か"}
  F -- "いいえ" --> Z

  F -- "はい" --> G["Levenshtein: wordList 全件を走査し最小 distance の候補を得る"]
  G --> H["同距離のタイブレーク: 短い語 → 長さ差 → 先頭一致数 → 辞書順"]
  H --> I{"maxSimilarity が 0.5 未満 または minLevenshteinDistance が max(2, word長/2) 以下か"}
  I -- "いいえ" --> Z

  I -- "はい" --> J["Jaro候補の Levenshtein距離（jaroDistance）も計算"]
  J --> K{"minLevenshteinDistance が jaroDistance より小さい  または 同距離で短いか"}
  K -- "はい" --> L["closestWord を Levenshtein候補に差し替え"]
  L --> Z
  K -- "いいえ" --> Z
```

## 分岐に関わる主なオプション（要点）

- **`-s`**: デコード時に **誤字修正を行わない**（入力をそのまま解釈する、strict decode mode）
- **`--levenshtein`**: 距離計算を **Levenshtein** に切り替え（デフォルトは **Jaro-Winkler**）
- **`--no-tfidf` / `is_tfidf=false`**: TF-IDFベースの探索（`nearTokenMatch()`）を使わない
- **`-v / -vv`**: デバッグ出力（修正前後・スコア等の詳細が増える）


