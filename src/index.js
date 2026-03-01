import simpleEnigma from './machine-encrypt.js'
export let default_encoder = (uint8text,{ meisi, dousi }, option = {}) => {

  //機械式暗号（ロータ型）の仕組みを利用したスクランブラーを配置
  //バイトコードは連続しやすい性質があるが、
  //これによって単語頻出頻度の偏りを少なくし自然な文章を生み出す
  let encryptCode = simpleEnigma.uint8ArrayEncrypt([ ...uint8text ])

  // 2桁の16進数コードへ変換。
  // 名詞、動詞データのキーは2桁の16進数のコードである。
  let encryptCode16 = encryptCode.map(v=>`0${(+v).toString(16).toUpperCase()}`.slice(-2))

  //読みやすさのため動詞の最後には読点を入れる
  let _dousi = Object.fromEntries(
    Object.entries(dousi).map(([k,entry])=> {
      // 後方互換性のため、entryが配列（旧形式）の場合はオブジェクトに変換する
      const normalizedEntry = Array.isArray(entry) 
        ? { words: entry, readings: entry } // 旧形式には読みがないので単語を読みに流用
        : entry;
      return [k, { ...normalizedEntry, words: normalizedEntry.words.map(d=>`${d}。`) } ]
    })
  )

  // 先頭から最後の文字の1つ手前までを先頭として文字列を生成。
  // 生成する文字列は 名詞 名詞 名詞 動詞 + 。 といった規則性になる。
  let heads = encryptCode16
    .slice(0,-1)
    .map((code,i)=> (i + 1) % 4 ? meisi[code] : _dousi[code])
    .map(v=> {
      // 後方互換性のため、vが配列（旧形式）の場合はオブジェクトに変換する
      const normalizedV = Array.isArray(v)
        ? { words: v, readings: v }
        : v;
      const index = Math.floor(Math.random() * normalizedV.words.length)
      return { word: normalizedV.words[index], reading: normalizedV.readings[index] }
    })

  // 最後の文字列を必ず動詞で終えることで呪文詠唱となる。
  let last = encryptCode16
    .slice(-1)
    .map(code=> _dousi[code])
    .map(v=> {
      // 後方互換性のため、vが配列（旧形式）の場合はオブジェクトに変換する
      const normalizedV = Array.isArray(v)
        ? { words: v, readings: v }
        : v;
      const index = Math.floor(Math.random() * normalizedV.words.length)
      return { word: normalizedV.words[index], reading: normalizedV.readings[index] }
    })

  const words = [ ...heads , ...last ]
  if (option.furigana) {
    return {
      words: words.map(v => v.word).join(''),
      readings: words.map(v => v.reading).join(' ')
    }
  }

  return words.map(v => v.word).join('')
}

export let default_decoder = (typoCorrection) => async (encodeText,option = {} ,{ meisi, dousi }) => {
  // 元の名詞、動詞のハッシュマップのキーとバリューを逆にすることでデコード用のハッシュマップとする。
  // エンコードに使用しているハッシュマップの値はリストのため、リストの要素をそれぞれコードと紐付ける。
  // ex:
  //   from:
  //     "0A":["単語1", "単語2", "単語3"]
  //   to:
  //     "単語1。" : "0A"
  //     "単語2。" : "0A"
  //     "単語3。" : "0A"
  let decodeHash = {}
  let allWord = []
  Object.entries(meisi).forEach(([k,entry])=> {
    // 後方互換性のため、entryが配列（旧形式）の場合はオブジェクトに変換する
    const normalizedEntry = Array.isArray(entry) ? { words: entry } : entry;
    const v = normalizedEntry.words
    allWord = [ ...allWord, ...v]
    v.forEach(v2=> {
      decodeHash[v2] = k
    })
  })
  Object.entries(dousi).forEach(([k,entry])=> {
    // 後方互換性のため、entryが配列（旧形式）の場合はオブジェクトに変換する
    const normalizedEntry = Array.isArray(entry) ? { words: entry } : entry;
    const v = normalizedEntry.words
    allWord = [ ...allWord, ...v]
    v.forEach(v2=> {
      decodeHash[v2] = k
    })
  })

  let textCodeList = []

  // 読みやすさのために含まれている読点を削除(+英字と空白、ふりがな)
  let cleanEncodeText = encodeText.replaceAll(/[。\sA-z]/g,'')

  // オプションによっては、文字列を修正する。
  if(option.s != true && typoCorrection) {
    cleanEncodeText = typoCorrection.exec(cleanEncodeText,option)
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

  // デコード時も同じ回数だけローターを回す必要がある
  let textCode = simpleEnigma.uint8ArrayEncrypt(encryptCode)
  // バイト配列として返却
  return Uint8Array.from(textCode)
}

/**
 * yukichantインスタンスを生成するファクトリ関数
 * @param {Object} params - 初期化パラメータ
 * @param {Object} params.data - { meisi, dousi } 辞書データ
 * @param {Object|null} params.typoCorrection - 誤字修正モジュール（null でデコード時の誤字修正を無効化）
 * @returns {Object} encode/decode/generate メソッドを持つオブジェクト
 */
export function createChant({ data, typoCorrection = null }) {
  const decoder = default_decoder(typoCorrection)
  return {
    data,
    /**
     * ランダムな呪文を生成する
     * @param {number} length - 生成するバイト長
     * @param {Object} _data - 使用する名詞と動詞のデータ
     * @param {Function} generater - エンコード処理を行う関数
     * @returns {string} 生成された呪文
     */
    generate(length, option = {}, _data = this.data, generater = default_encoder) {
      let rand = n => (Math.random() * n).toFixed()
      let uint8text = Uint8Array.from({length:length || +rand(12) + 4}).map(_=>rand(255))
      return generater(uint8text,_data, option)
    },
    /**
     * テキストを呪文に変換する
     * @param {string} text - エンコードするテキスト
     * @param {Object} option - エンコードオプション
     * @param {Object} _data - 使用する名詞と動詞のデータ
     * @param {Function} encoder - エンコード処理を行う関数
     * @returns {string} 変換された呪文
     */
    encode( text, option, _data = this.data, encoder = default_encoder ){
      let uint8text = (new TextEncoder()).encode(text)
      return encoder(uint8text,_data, option)
    },
    /**
     * 呪文をテキストに復号する
     * @param {string} text - デコードする呪文
     * @param {Object} option - デコードオプション
     * @param {Object} _data - 使用する名詞と動詞のデータ
     * @param {Function} _decoder - デコード処理を行う関数
     * @returns {string} 復号されたテキスト
     */
    async decode( text, option, _data = this.data, _decoder = decoder ){
      let uint8text = await _decoder(text,option,_data)
      return (new TextDecoder()).decode(uint8text)
    }
  }
}
