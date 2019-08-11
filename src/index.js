const util  = require('util')

const meisi = require('../data/meisi.json')
const dousi = require('../data/dousi.json')


let default_encoder = (uint8text,{ meisi, dousi }) => {
  let textCode = [ ...uint8text ].map(v=>`0${(+v).toString(16).toUpperCase()}`.slice(-2))

  let heads = textCode.slice(0,-1).map((code,i)=> (i + 1) % 4 ? meisi[code] : dousi[code] + '。' )
  let last  = textCode.slice(-1).map(code=> dousi[code] + '。' )
  return [ ...heads , last ].join('')
}

let default_decoder = (encodeText,{ meisi, dousi }) => {
  let decodeHash = Object.fromEntries([
    ...Object.entries(meisi).map(([k,v])=>[v,k]),
    ...Object.entries(dousi).map(([k,v])=>[v,k])
  ])

  let decodeRegExp = new RegExp(Object.keys(decodeHash).join('|'),'g')

  let textCodeList = encodeText
    .replace('。','')
    .match(decodeRegExp) || []

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
