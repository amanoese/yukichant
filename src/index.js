import simpleEnigma from './machine-encrypt.js'
import typoCorrection from './typo-correction.js'
import fs from 'fs'
import path from 'path'
import {distance, closest} from 'fastest-levenshtein'
import kuromoji from 'kuromoji'
import pc from "picocolors"
import log from './logger.js'

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

  let tokenizer = await new Promise((resolve,reject) => {
    kuromoji
    .builder({ dicPath: `${dirname}/../node_modules/yukidic/dic/` })
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

  // 読みやすさのために含まれている読点を削除(+英字と空白)
  let cleanEncodeText = encodeText.replaceAll(/[。\sA-z]/g,'')

  // オプションによっては、文字列を修正する。
  if(option.s != true) {
    cleanEncodeText = typoCorrection.exec(cleanEncodeText,option)
  }

  log.debug('修正後のテキスト:', cleanEncodeText)
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
  // バイト配列として返却
  return Uint8Array.from(textCode)
}

export default {
  // 名詞と動詞のデータセット
  data : {
    meisi,
    dousi
  },
  /**
   * ランダムな呪文を生成する
   * @param {number} length - 生成するバイト長
   * @param {Object} data - 使用する名詞と動詞のデータ
   * @param {Function} generater - エンコード処理を行う関数
   * @returns {string} 生成された呪文
   */
  generate(length, data = this.data, generater = default_encoder) {
    // ランダムな数値を生成する関数
    let rand = n => (Math.random() * n).toFixed()
    // 指定された長さ（またはランダムな長さ）のランダムなバイト配列を生成
    let uint8text = Uint8Array.from({length:length || +rand(12) + 4}).map(_=>rand(255))
    return generater(uint8text,data)
  },
  /**
   * テキストを呪文に変換する
   * @param {string} text - エンコードするテキスト
   * @param {Object} option - エンコードオプション
   * @param {Object} data - 使用する名詞と動詞のデータ
   * @param {Function} encoder - エンコード処理を行う関数
   * @returns {string} 変換された呪文
   */
  encode( text, option, data = this.data, encoder = default_encoder ){
    // 文字列をUTF-8バイト配列に変換
    let uint8text = (new TextEncoder()).encode(text)
    return encoder(uint8text,data)
  },
  /**
   * 呪文をテキストに復号する
   * @param {string} text - デコードする呪文
   * @param {Object} option - デコードオプション
   * @param {Object} data - 使用する名詞と動詞のデータ
   * @param {Function} decoder - デコード処理を行う関数
   * @returns {string} 復号されたテキスト
   */
  async decode( text, option, data = this.data, decoder = default_decoder ){
    // 呪文からバイト配列に変換
    let uint8text = await decoder(text,option,data)
    // バイト配列を文字列に変換して返却
    return (new TextDecoder()).decode(uint8text)
  }
}
