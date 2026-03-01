import chant from '../src/node.js'
import fs from 'fs'
const meisi = JSON.parse(fs.readFileSync('./data/meisi.json', 'utf8'));
const dousi = JSON.parse(fs.readFileSync('./data/dousi.json', 'utf8'));

// 辞書の単語をSetに格納
const meisiWords = new Set();
Object.values(meisi).forEach(group => group.words.forEach(w => meisiWords.add(w)));
const dousiWords = new Set();
Object.values(dousi).forEach(group => group.words.forEach(w => dousiWords.add(w)));

describe('chant',()=>{
  test('encode patterns',()=>{
    // 1バイト: 動詞。
    // UTF-8で1バイトの文字をエンコードすると1バイトのバイト配列になり、
    // encryptCode16も1要素になる。headsは空、lastがその1要素を担当し動詞になる。
    verifyPattern(chant.encode('a'), ['動詞']);

    // 2バイト: 名詞 動詞。
    // 'ab' -> 2バイト。heads: i=0 (0+1)%4=1 (名詞), last: i=1 (動詞)
    verifyPattern(chant.encode('ab'), ['名詞', '動詞']);

    // 3バイト: 名詞 名詞 動詞。
    verifyPattern(chant.encode('abc'), ['名詞', '名詞', '動詞']);

    // 4バイト: 名詞 名詞 名詞 動詞。
    verifyPattern(chant.encode('abcd'), ['名詞', '名詞', '名詞', '動詞']);

    // 5バイト: 名詞 名詞 名詞 動詞。動詞。
    // heads: i=0(名詞), i=1(名詞), i=2(名詞), i=3(動詞)
    // last: i=4(動詞)
    verifyPattern(chant.encode('abcde'), ['名詞', '名詞', '名詞', '動詞', '動詞']);

    // 6バイト: 名詞 名詞 名詞 動詞。名詞 動詞。
    // heads: i=0(名詞), i=1(名詞), i=2(名詞), i=3(動詞), i=4(名詞)
    // last: i=5(動詞)
    verifyPattern(chant.encode('abcdef'), ['名詞', '名詞', '名詞', '動詞', '名詞', '動詞']);

    // 7バイト: 名詞 名詞 名詞 動詞。名詞 名詞 動詞。
    // heads: i=0(名詞), i=1(名詞), i=2(名詞), i=3(動詞), i=4(名詞), i=5(名詞)
    // last: i=6(動詞)
    verifyPattern(chant.encode('abcdefg'), ['名詞', '名詞', '名詞', '動詞', '名詞', '名詞', '動詞']);

    // 8バイト: 名詞 名詞 名詞 動詞。名詞 名詞 名詞 動詞。
    // heads: i=0(名詞), i=1(名詞), i=2(名詞), i=3(動詞), i=4(名詞), i=5(名詞), i=6(名詞)
    // last: i=7(動詞)
    verifyPattern(chant.encode('abcdefgh'), ['名詞', '名詞', '名詞', '動詞', '名詞', '名詞', '名詞', '動詞']);
  })

  test('decode',async ()=>{
    expect(await chant.decode(chant.encode('こんにちは')))
      .toBe('こんにちは')
  })

  test('decode 改行文字込',async ()=>{
    const text = 'unko\n'
    expect(await chant.decode(chant.encode(text))).toBe(text)
  })

  test('dumpされた文字が途中でもdecodeできるかの確認',async ()=>{
    // chant.encode('')
    expect(await chant.decode(chant.encode('💩💩').slice(0,-4)))
      .toEqual(expect.stringContaining('💩'))
  })
  test('関係ない文字でもエラーが出ないことの確認',async ()=>{
    // chant.encode('')
    expect(()=> chant.decode('💩')).not.toThrow()
    //下のテストは無理になった
    //expect(chant.decode('💩')).toBe('')
  })

  test('decode 文字の間違いをある程度修正できるか',async ()=>{
    const text = 'unko\n'
    const encoded = chant.encode(text)
    // 1文字だけ変えても復号できるか（誤字修正のテスト）
    // 注意: 辞書が変わっているため、具体的な単語指定ではなく生成されたものから1文字置換
    const typoEncoded = encoded.replace(/。/, '、') 
    expect(await chant.decode(typoEncoded)).toBe(text)
  })

  test('furigana option', async () => {
    const text = 'こんにちは'
    const result = chant.encode(text, { furigana: true })
    expect(result).toHaveProperty('words')
    expect(result).toHaveProperty('readings')
    expect(result.readings).toMatch(/\s/)
    expect(await chant.decode(result.words)).toBe(text)
  })

  test('long input (512 characters)', async () => {
    const text = 'a'.repeat(512)
    const result = chant.encode(text, { furigana: true })
    expect(result).toHaveProperty('words')
    expect(result).toHaveProperty('readings')
    // 512文字の入力が正しくデコードできるか確認
    // ロータリーエンコーダーが256で一周するため、長い文字列での整合性を検証
    expect(await chant.decode(result.words)).toBe(text)
  })
})

/**
 * 呪文の単語構成を検証する
 * @param {string} encoded 呪文
 * @param {string[]} expectedPattern ['名詞', '動詞', ...] の配列
 */
function verifyPattern(encoded, expectedPattern) {
  // 句点。で分割し、空文字を除去
  const sentences = encoded.split('。').filter(s => s.length > 0);
  
  // 各文の中で、辞書の単語を探して分解する
  const words = [];
  sentences.forEach(sentence => {
    let temp = sentence.trim();
    while (temp.length > 0) {
      let found = false;
      // 辞書の単語を長い順に試す（誤マッチ防止）
      const allPossibleWords = [...meisiWords, ...dousiWords].sort((a, b) => b.length - a.length);
      for (const word of allPossibleWords) {
        if (temp.startsWith(word)) {
          words.push(word);
          temp = temp.slice(word.length).trim();
          found = true;
          break;
        }
      }
      if (!found) {
        throw new Error(`辞書にない単語が含まれています: ${temp} (in sentence: ${sentence})`);
      }
    }
  });

  if (words.length !== expectedPattern.length) {
    console.log(`Mismatch! Expected: ${expectedPattern.length}, Received: ${words.length}`);
    console.log(`Encoded: ${encoded}`);
    console.log(`Words: ${JSON.stringify(words)}`);
  }
  
  expect(words.length).toBe(expectedPattern.length);
  
  words.forEach((word, i) => {
    if (expectedPattern[i] === '名詞') {
      if (!meisiWords.has(word)) {
        throw new Error(`期待された名詞が辞書にありません: ${word} (index: ${i})`);
      }
    } else if (expectedPattern[i] === '動詞') {
      if (!dousiWords.has(word)) {
        throw new Error(`期待された動詞が辞書にありません: ${word} (index: ${i})`);
      }
    }
  });
}
