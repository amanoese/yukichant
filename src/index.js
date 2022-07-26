import simpleEnigma from './machine-encrypt.js'
import fs from 'fs'
import path from 'path'
const dirname = path.dirname(new URL(import.meta.url).pathname)
const meisi = JSON.parse(fs.readFileSync(`${dirname}/../data/meisi.json`, 'utf8'));
const dousi = JSON.parse(fs.readFileSync(`${dirname}/../data/dousi.json`, 'utf8'));

let default_encoder = (uint8text,{ meisi, dousi }) => {

  //機械式暗号（ロータ型）の仕組みを利用したスクランブラーを配置
  //バイトコードは連続しやすい性質があるが、
  //これによって単語頻出頻度の偏りを少なくし自然な文章を生み出す
  let encryptCode = simpleEnigma.uint8ArrayEncrypt([ ...uint8text ])

  // 2桁の16進数コードへ変換。
  // 名詞、動詞データのキーは2桁の16進数のコードである。
  let encryptCode16 = encryptCode.map(v=>`0${(+v).toString(16).toUpperCase()}`.slice(-2))

  //読みやすさのため動詞の最後には読点を入れる
  let _dousi = Object.fromEntries(
    Object.entries(dousi).map(([k,dousiList])=> {
      return [k,dousiList.map(d=>`${d}。`) ]
    })
  )

  // 最後の文字が異なるようにする関数
  let difference = (arr1,arr2) => arr1.filter(x => {
    return !arr2
      .map(y=>[ ...y ].slice(-1)[0])
      .some(y => new RegExp(`${y}$`).test(x) )
  });

  // 先頭から最後の文字の1つ手前までを先頭として文字列を生成。
  // 生成する文字列は 名詞 名詞 名詞 動詞 + 。 といった規則性になる。
  let heads = []
  for (let i=0,prev_word=[],v="";i < encryptCode16.length;i++) {
    let code = encryptCode16[i]
    // 名詞の場合
    if ( (i+1) % 4 ) {
      // 同じ助動詞を避けるための実装
      let words = difference(meisi[code],prev_word)
      if (words.lenth == 0) { words = meisi[code] }

      let select_w = Math.floor(Math.random() * words.length)
      v = words[select_w]
      heads.push(v)

      // console.log({ prev_word, original:meisi[code], words , selected:v})
      prev_word.push(v)

    // 動詞の場合
    } else {
      // 同じ助動詞を避けるための実装
      let words = difference(_dousi[code],prev_word)
      if (words.lenth == 0) { words = _dousi[code] }

      let select_w = Math.floor(Math.random() * words.length)
      v = words[select_w]
      heads.push(v)

      // console.log({ prev_word, original:_dousi[code], words , selected:v})
      prev_word = []
    }
  }

  // 最後の文字列を必ず動詞で終えることで呪文詠唱となる。
  let last = encryptCode16
    .slice(-1)
    .map(code=> _dousi[code])
    .map(v=> v[Math.floor(Math.random() * v.length)])

  return [ ...heads , last ].join('')
}

let default_decoder = (encodeText,{ meisi, dousi }) => {
  // 元の名詞、動詞のハッシュマップのキーとバリューを逆にすることでデコード用のハッシュマップとする。
  // エンコードに使用しているハッシュマップの値はリストのため、リストの要素をそれぞれコードと紐付ける。
  // ex:
  //   from:
  //     "0A":["汚し", "踊れ", "歌え", "紡げ"]
  //   to:
  //     "汚し。" : "0A"
  //     "踊れ。" : "0A"
  //     "歌え。" : "0A"
  //     "紡げ。" : "0A"
  let decodeHash = {}
  Object.entries(meisi).forEach(([k,v])=> {
    v.forEach(v2=> {
      decodeHash[v2] = k
    })
  })
  Object.entries(dousi).forEach(([k,v])=> {
    v.forEach(v2=> {
      decodeHash[v2] = k
    })
  })

  // デコード用の正規表現に変換。
  // ex: /さざ波|その者|ほうき星よ/g
  let decodeRegExp = new RegExp(Object.keys(decodeHash).join('|'),'g')

  // 読みやすさのために含まれている読点を削除
  let cleanEncodeText = encodeText.replace(/。/g,'')

  // 正規表現にマッチするもののみに絞り込み。
  let textCodeList = cleanEncodeText
    .match(decodeRegExp) || []

  // デコード用のハッシュマップからエンコード前の2桁16進数のコードを復元。
  let encryptCode = textCodeList
    .map(v=>decodeHash[v])
    .map(v=>parseInt(v,16))

  let textCode = simpleEnigma.uint8ArrayEncrypt(encryptCode)
  return Uint8Array.from(textCode)
}

export default {
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
    let uint8text = (new TextEncoder()).encode(text)
    return encoder(uint8text,data)
  },
  decode( text, data = this.data, decoder = default_decoder ){
    let uint8text = decoder(text,data)
    return (new TextDecoder()).decode(uint8text)
  }
}
