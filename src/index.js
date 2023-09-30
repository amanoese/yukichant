import simpleEnigma from './machine-encrypt.js'
import fs from 'fs'
import path from 'path'
import {distance, closest} from 'fastest-levenshtein'
import kuromoji from 'kuromoji'
import pc from "picocolors"

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

  // 先頭から最後の文字の1つ手前までを先頭として文字列を生成。
  // 生成する文字列は 名詞 名詞 名詞 動詞 + 。 といった規則性になる。
  let heads = encryptCode16
    .slice(0,-1)
    .map((code,i)=> (i + 1) % 4 ? meisi[code] : _dousi[code])
    .map(v=> v[Math.floor(Math.random() * v.length)])

  // 最後の文字列を必ず動詞で終えることで呪文詠唱となる。
  let last = encryptCode16
    .slice(-1)
    .map(code=> _dousi[code])
    .map(v=> v[Math.floor(Math.random() * v.length)])

  return [ ...heads , last ].join('')
}

let default_decoder = async (encodeText,option = {} ,{ meisi, dousi }) => {
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
  let allWord = []
  Object.entries(meisi).forEach(([k,v])=> {
    allWord = [ ...allWord, ...v]
    v.forEach(v2=> {
      decodeHash[v2] = k
    })
  })
  Object.entries(dousi).forEach(([k,v])=> {
    allWord = [ ...allWord, ...v]
    v.forEach(v2=> {
      decodeHash[v2] = k
    })
  })

  let textCodeList = []

  //console.log(allWord)
  //console.log(closest('fast', allWord))

  let tokenizer = await new Promise((resolve,reject) => {
    kuromoji
    .builder({ dicPath: 'dic/' })
    .build(function (err, tokenizer) {
      if(err != null) {
        reject(err)
      }
      resolve(tokenizer)
    });
  });
  const han = /^[\p{scx=Han}]$/u;
  const allHan = Array.from(new Set(allWord.join('').match(/[\p{scx=Han}]/ug)))
  const allFirstHan = Array.from(new Set(allWord.map(v=>v[0]).join('').match(/[\p{scx=Han}]/ug)))

  //if (option.Vv == true) { console.log(allHan) }
  //[ ... "感じ文字列".match(/[\p{scx=Han}]/ug) ]


  // 読みやすさのために含まれている読点を削除(+英字と空白)
  let cleanEncodeText = encodeText.replaceAll(/[。\sA-z]/g,'')

  // tokenizer is ready
  let tokens = tokenizer.tokenize(cleanEncodeText);
  let ptokens = tokens
    .filter(token=>token.pos_detail_1 == '引用文字列')
    .map((token,i)=> ({ i:token.word_position, v:token.surface_form }) )
  let ntokens = tokens
    .filter(token=>token.pos_detail_1 != '引用文字列')

  if(option.s != true && ntokens.length > 0) {
    let fixTokens = ntokens
      .reduce((list,token)=>{
        let heads = list.slice(0,-1)
        let last = list[list.length -1]
        let adverb = false
        if(['副詞','助詞','助動詞','記号'].includes(token.pos)){
          adverb = true
        }
        if (option.Vv == true) { console.log(token.surface_form,token.pos,token.pos_detail_1, token.pos_detail_2, token.pos_detail_3) }

        if (list.length == 0 || (last.adverb == true && adverb == false) || last.i + last.v.length != token.word_position) {
          return [ ...list, { i:token.word_position, v: token.surface_form, old: token.surface_form, pos:token.pos, adverb } ]
        }
        return [ ...heads, { i:last.i, v:last.v + token.surface_form , old:last.old + token.surface_form, adverb } ]
      },[])
      .filter(token=>token.pos != '記号')
      .map((token,i)=> {
        let first = token.v[0]
        if(han.test(first) && !allHan.includes(first)) {
          let point = first.codePointAt()
          //allHan.sort((a,b)=>Math.abs(a.codePointAt() - point) - Math.abs(b.codePointAt() - point))
          allFirstHan.sort((a,b)=>Math.abs(a.codePointAt() - point) - Math.abs(b.codePointAt() - point))
          //if (option.Vv == true) console.log(first,'->',allHan.slice(0,5))
          if (option.Vv == true) console.log(first,'->',allFirstHan.slice(0,5))
          return { ...token , v: token.v.replace(/./,allFirstHan[0]) }
        }
        return token
      })
      .map((token,i)=> ( { ...token , v: closest(token.v, allWord) }) )
      .map((v,i)=>{ option.Vv && console.log(i,v); return v})
    let fixedTokens = [...ptokens,...fixTokens].sort((a,b)=> a.i - b.i);
    if(option.v) {
      console.error(cleanEncodeText)
      console.error(fixedTokens.map(token=>(token.old ? pc.green(token.v): token.v)).join(''))
    }
    cleanEncodeText = fixedTokens.map(v=>v.v).join('')
  }
  // デコード用の正規表現に変換。
  // ex: /さざ波|その者|ほうき星よ/g
  let decodeRegExp = new RegExp(Object.keys(decodeHash).join('|'),'g')

  // 正規表現にマッチするもののみに絞り込み。
  textCodeList = cleanEncodeText.match(decodeRegExp) || []

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
  encode( text, option, data = this.data, encoder = default_encoder ){
    let uint8text = (new TextEncoder()).encode(text)
    return encoder(uint8text,data)
  },
  async decode( text, option, data = this.data, decoder = default_decoder ){
    let uint8text = await decoder(text,option,data)
    return (new TextDecoder()).decode(uint8text)
  }
}
