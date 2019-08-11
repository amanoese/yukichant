const util  = require('util')

const meisi = require('./data/meisi.json')
const dousi = require('./data/dousi.json')


let default_encoder = (text,{ meisi, dousi }) => {
  let uint8text = (new util.TextEncoder()).encode(text)
  let textCode = [ ...uint8text ].map(v=>(+v).toString(16).toUpperCase())

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

  return (new util.TextDecoder()).decode(Uint8Array.from(textCode))
}

module.exports = {
  data : {
    meisi,
    dousi
  },
  encode( text, data = this.data, encoder = default_encoder ){
    return encoder(text,data)
  },
  decode( text, data = this.data, decoder = default_decoder ){
    return decoder(text,data)
  }
}
