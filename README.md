yukichant
---
yukichantは、テキストデータを呪文に変換するコマンドです。

## Install

```bash
$ npm install -g yukichant
```

## Usage

###  genarate

```bash
$ chant
冠を御手を絢爛汚れ。我を意思に雫よ現れよ。仕打ち契約に羽根よ刻み。此処に剣に貫き。
```

### encode
```bash
$ echo -n こんにちは | chant
雫よ狭間の剣に渡れ。狭霧剣に雫よ囚われ。光を雫よ狭間の触れ。雫よ狭間の澄ませ。
```
### decode
```bash
$ echo 雫よ狭間の剣に渡れ。狭霧剣に雫よ囚われ。光を雫よ狭間の触れ。雫よ狭間の澄ませ。 | chant -d
こんにちは
```

