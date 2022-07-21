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

## Documentation for Developers
[develop](/doc/develop.md)

## Thanks
I named "yukichant" by Nagato Yuki-chan + chant .
because I want to chant magic words like her.

## LICENSE
Apache-2.0

