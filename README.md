# yukichant

[![Actions Status](https://github.com/amanoese/yukichant/workflows/Node%20CI/badge.svg)](https://github.com/amanoese/yukichant/actions)
[![npm version](http://img.shields.io/npm/v/yukichant.svg)](https://npmjs.org/package/yukichant)

yukichantは、テキストデータを詠唱呪文に変換するコマンドです。  
また変換した詠唱呪文は、元のテキストデータにデコードすることができます。  

## Install

```bash
$ npm install -g yukichant
```

## Usage

```bash
## encode text
$ echo Hello,World | chant
巫女よ五行に元に斬る。戦慄の貪欲使命を隠し。嵐は記憶の行く手を砕ける。

## decode text
$ echo 巫女よ五行に元に斬る。戦慄の貪欲使命を隠し。嵐は記憶の行く手を砕ける。 | chant -d
Hello,World

## Random Geneate Magic Words.
$ chant
水面も灰塵に蒼穹を抗え。
```

## 高度な使い方

### 厳密デコードモードと誤字修正

yukichantは、類似度アルゴリズムを使用した誤字修正機能付きの厳密デコードモードをサポートしています。

```bash
## 厳密デコードモード（デフォルト: Jaro-Winklerアルゴリズム）
$ echo 罹刹に烙印を秘術を帰ら。 | chant -d -s
# 自動的に誤字を修正: 罹刹 → 羅刹

## Levenshtein距離アルゴリズムを使用
$ echo 罹刹に烙印を秘術を帰ら。 | chant -d -s --levenshtein
# 異なるアルゴリズムで同様の修正を実行

## TF-IDF重み付けを無効化
$ echo 罹刹に烙印を秘術を帰ら。 | chant -d -s --no-tfidf

## 詳細モードで修正内容を表示
$ echo 罹刹に烙印を秘術を帰ら。 | chant -d -s -v
# どの単語が修正されたかを表示

## より詳細な出力
$ echo 罹刹に烙印を秘術を帰ら。 | chant -d -s -vv
# 類似度スコアと使用されたアルゴリズムの詳細を表示
```

### アルゴリズムの比較

yukichantは誤字修正のために2つの文字列類似度アルゴリズムを提供しています：

- **Jaro-Winkler（デフォルト）**: 日本語テキストに適しており、接頭辞の一致に高い重みを与えます
- **Levenshtein**: 古典的な編集距離アルゴリズムで、必要な最小編集回数をカウントします

用途に応じてアルゴリズムを選択してください：
- 一般的な日本語テキストには **Jaro-Winkler** を使用（推奨）
- より厳密なマッチングには `--levenshtein` フラグで **Levenshtein** を使用

## ライブラリとしての利用

yukichantはCLIだけでなく、Node.jsやブラウザからライブラリとして利用できます。

### Node.js

```bash
$ npm install yukichant
```

```js
import chant from 'yukichant'

// エンコード
const spell = chant.encode('Hello,World')
// => 巫女よ五行に元に斬る。戦慄の貪欲使命を隠し。嵐は記憶の行く手を砕ける。

// デコード
const text = await chant.decode(spell)
// => Hello,World

// 誤字修正付きデコード
const text = await chant.decode(spell, { s: true })

// ランダム呪文生成
const random = chant.generate()
```

### ブラウザ

辞書データはGitHubリポジトリから自動的にfetchされるため、引数なしで利用できます。

#### 基本（エンコード/デコードのみ）

```js
import { createChantFromGitHub } from 'yukichant/browser'

const chant = await createChantFromGitHub()

const spell = chant.encode('Hello,World')
const text = await chant.decode(spell)
```

#### 全機能（誤字修正付き）

```js
import { initBrowser } from 'yukichant/browser'

const chant = await initBrowser()

const spell = chant.encode('Hello,World')
const text = await chant.decode(spell, { s: true })
```

#### データURLのカスタマイズ

辞書データを自前のサーバーに配置する場合や、特定バージョンを指定する場合：

```js
import { initBrowser } from 'yukichant/browser'

const chant = await initBrowser({
  version: 'v3.0.5',                        // リリースタグを指定
  dataBaseUrl: '/local/data',                // meisi.json, dousi.json の配置先
  dicPath: '/local/dic/',                    // kuromoji辞書ファイルの配置先
  kanji2radicalUrl: '/local/kanji2radical.json',  // kanjivg-radical データ
})
```

## Documentation for Developers
[develop](/doc/develop.md)

## Thanks
I named "yukichant" by Nagato Yuki-chan + chant .
because I want to chant magic words like her.

## LICENSE
Apache-2.0

