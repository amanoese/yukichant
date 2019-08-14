# yukichant

[![Build Status](https://travis-ci.org/amanoese/yukichant.svg?branch=master)](https://travis-ci.org/amanoese/yukichant)
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
破壊の瘴気の誘惑の轟け。明鏡汝は自在に差す。平穏の誘いより贄に踊れ。

## decode text
$ echo 破壊の瘴気の誘惑の轟け。明鏡汝は自在に差す。平穏の誘いより贄に踊れ。 | chant
Hello,World

## Random Geneate Magic Words.
癒や万物の御身の逃れる。静か揺らぎ竜と守れ。強欲の霊の刀剣に閉じ。永劫の散らす。
```

## Develop

install dependency
```bash
$ npm install
```

execute command
```bash
## run encode
$ npm run dev unko
## run decode
$ npm run dev unko | npm run dev -- -d
```

## LICENSE
Apache-2.0

## Thanks
I named "yukichant" by Nagato Yuki-chan + chant .
becouse I want to chant magic words like her.

