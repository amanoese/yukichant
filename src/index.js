require('core-js')
const util  = require('util')

const meisi = require('../data/meisi.json')
const dousi = require('../data/dousi.json')


let default_encoder = (uint8text,{ meisi, dousi }) => {
  // 2桁の16進数コードへ変換。
  // 名詞、動詞データのキーは2桁の16進数のコードである。
  let textCode = [ ...uint8text ].map(v=>`0${(+v).toString(16).toUpperCase()}`.slice(-2))

  // 先頭から最後の文字の1つ手前までを先頭として文字列を生成。
  // 生成する文字列は 名詞 名詞 名詞 動詞 + 。 といった規則性になる。
  let heads = textCode
    .slice(0,-1)
    .map((code,i)=> (i + 1) % 4 ? meisi[code] : dousi[code])
    .map(v=> v[Math.floor(Math.random() * v.length)])

  // 最後の文字列を必ず動詞で終えることで呪文詠唱となる。
  let last = textCode
    .slice(-1)
    .map(code=> dousi[code])
    .map(v=> v[Math.floor(Math.random() * v.length)])

  return [ ...heads , last ].join('')
}

let default_decoder = (encodeText,{ meisi, dousi }) => {
  // 元の名詞、動詞のハッシュマップのキーとバリューを逆にすることでデコード用のハッシュマップとする。
  // エンコードに使用しているハッシュマップの値はリストのため、後続の正規表現化のために先に結合する。
  let decodeHash = Object.fromEntries([
    ...Object.entries(meisi).map(([k,v])=>[v.join('|'),k]),
    ...Object.entries(dousi).map(([k,v])=>[v.join('|'),k])
  ])

  // デコード用の正規表現に変換。
  // ex: /さざ波|その者|ほうき星よ/g
  let decodeRegExp = new RegExp(Object.keys(decodeHash).join('|'),'g')

  // 正規表現にマッチするもののみに絞り込み。
  let textCodeList = encodeText
    .match(decodeRegExp) || []

  // デコード用のハッシュマップからエンコード前の2桁16進数のコードを復元。
  let textCode = textCodeList
    .map(v=>decodeHash[v])
    .map(v=>parseInt(v,16))

  return Uint8Array.from(textCode)
}

module.exports = {
  data : {
    meisi,
    dousi
  },
  generate(length, data = this.data, generater = default_encoder) {
    let rand = n => (Math.random() * n).toFixed()
    let uint8text = Uint8Array.from({length:length || +rand(12) + 4}).map(_=>rand(255))
    return generater(uint8text,data)
  },
  encode( text, data = this.data, encoder = default_encoder ){
    let uint8text = (new util.TextEncoder()).encode(text)
    return encoder(uint8text,data)
  },
  decode( text, data = this.data, decoder = default_decoder ){
    let uint8text = decoder(text,data)
    return (new util.TextDecoder()).decode(uint8text)
  }
}
