# yukichant

[![Actions Status](https://github.com/amanoese/yukichant/workflows/Node%20CI/badge.svg)](https://github.com/amanoese/yukichant/actions)
[![npm version](http://img.shields.io/npm/v/yukichant.svg)](https://npmjs.org/package/yukichant)

yukichantは、テキストデータを詠唱呪文（魔法の言葉）に変換するコマンドです。  
また変換した詠唱呪文は、元のテキストデータにデコードすることができます。  

## 特徴

- **エンコード/デコード**: 任意のテキストを日本語の呪文風文章に変換し、復号できます。
- **誤字修正**: 類似度アルゴリズム（Jaro-Winkler / Levenshtein）を使用して、呪文のタイポを自動修正してデコードできます。
- **マルチプラットフォーム**: CLI、Node.js、ブラウザ環境で動作します。
- **カスタマイズ可能**: 独自の辞書データや形態素解析（kuromoji）を使用しています。

## Install

```bash
$ npm install -g yukichant
```

## Usage

```bash
## encode text
$ echo Hello,World | chant
氷結は悪鬼の乱舞照らし。死装束の竜王よ悪夢の立つ。三の無常に調べを折れ。

## decode text
$ echo 氷結は悪鬼の乱舞照らし。死装束の竜王よ悪夢の立つ。三の無常に調べを折れ。 | chant -d
Hello,World

## Random Generate Magic Words.
$ chant
水面も灰塵に蒼穹を抗え。
```

## 高度な使い方

### 誤字修正付きデコード

yukichantは、類似度アルゴリズムを使用した誤字修正機能付きのデコードをサポートしています。

```bash
## 誤字修正モード（デフォルト）
$ echo 氷血は悪鬼の乱舞照らし。死装束の竜王よ悪夢の立つ。三の無常に調べを折れ。 | chant -d
# 自動的に誤字を修正: 氷血 → 氷結
# => Hello,World

## 厳密デコードモード（誤字修正を無効化）
$ echo 氷血は悪鬼の乱舞照らし。死装束の竜王よ悪夢の立つ。三の無常に調べを折れ。 | chant -d -s
# 誤字修正が行われないため、正しくデコードできない

## Levenshtein距離アルゴリズムを使用
$ echo 氷血は悪鬼の乱舞照らし。 | chant -d --levenshtein

## TF-IDF重み付けを無効化
$ echo 氷血は悪鬼の乱舞照らし。 | chant -d --no-tfidf

## 詳細モードで修正内容を表示
$ echo 氷血は悪鬼の乱舞照らし。 | chant -d -v
# どの単語が修正されたかを表示

## より詳細な出力
$ echo 氷血は悪鬼の乱舞照らし。 | chant -d -vv
# 類似度スコアと使用されたアルゴリズムの詳細を表示
```

### アルゴリズムの比較

yukichantは誤字修正のために2つの文字列類似度アルゴリズムを提供しています：

- **Jaro-Winkler（デフォルト）**: 日本語テキストに適しており、接頭辞の一致に高い重みを与えます。
- **Levenshtein**: 古典的な編集距離アルゴリズムで、必要な最小編集回数をカウントします。

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
// => 氷結は悪鬼の乱舞照らし。死装束の竜王よ悪夢の立つ。三の無常に調べを折れ。

// デコード
const text = await chant.decode(spell)
// => Hello,World

// 誤字修正付きデコード（デフォルトで有効）
const correctedText = await chant.decode(spell.replace('氷結', '氷血'))
// => Hello,World

// 誤字修正を無効化
const strictText = await chant.decode(spell.replace('氷結', '氷血'), { s: true })

// ランダム呪文生成
const random = chant.generate()
```

### ブラウザ

辞書データはGitHubリポジトリから自動的にfetchされるため、引数なしで利用できます。

#### 基本（エンコード/デコードのみ、誤字修正なし）

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
const text = await chant.decode(spell) // デフォルトで誤字修正が有効
```

#### データURLのカスタマイズ

辞書データを自前のサーバーに配置する場合や、特定バージョンを指定する場合：

```js
import { initBrowser } from 'yukichant/browser'

const chant = await initBrowser({
  version: 'v5.0.1',                        // リリースタグを指定
  dataBaseUrl: '/local/data',                // meisi.json, dousi.json の配置先
  dicPath: '/local/dic/',                    // kuromoji辞書ファイルの配置先
  kanji2radicalUrl: '/local/kanji2radical.json',  // kanjivg-radical データ
})
```

## Documentation

- [開発者ガイド (Develop Guide)](/docs/develop.md)
- [誤字修正アルゴリズムの詳細 (Typo Correction Algorithm)](/docs/typo-correction-algorithm.md)
- [辞書生成について (Dictionary Generation)](/docs/dictionary-generation.md)

## Thanks

I named "yukichant" by Nagato Yuki-chan + chant .
because I want to chant magic words like her.

## LICENSE

Apache-2.0

