const chant = require('../src/index.js')
const meisi = require('../data/meisi.json')
const dousi = require('../data/dousi.json')

describe('chant',()=>{
  test('encode',()=>{
    for (let i=0; i<1000; i++) {
      expect(chant.encode('unko\n'))
        .toMatch(/^その者力を竜の響き。(命ず|踊れ|歌え|紡げ)。$/)
    }
  })

  test('encode 改行文字込',()=>{
    // encodeしたときに、encodeあとの文字がランダムにどれか選ばれるため
    // 乱数を考慮して複数回テストを実行する。
    for (let i=0; i<1000; i++) {
      expect(chant.encode('こんにちは\n'))
        .toMatch(/^狂乱の闇の雨を清め。闇へ雨を狂乱の呼び戻す。乙女よ狂乱の闇の賜え。狂乱の闇の加護に(命ず|踊れ|歌え|紡げ)。$/)
    }
  })

  test('decode',()=>{
    expect(chant.decode(chant.encode('こんにちは')))
      .toBe('こんにちは')
  })

  test('decode 改行文字込',()=>{
    expect(chant.decode('狂乱の闇の雨を清め。闇へ雨を狂乱の呼び戻す。乙女よ狂乱の闇の賜え。狂乱の闇の加護に命ず。')).toBe('こんにちは\n')
    expect(chant.decode('狂乱の闇の雨を清め。闇へ雨を狂乱の呼び戻す。乙女よ狂乱の闇の賜え。狂乱の闇の加護に踊れ。')).toBe('こんにちは\n')
    expect(chant.decode('狂乱の闇の雨を清め。闇へ雨を狂乱の呼び戻す。乙女よ狂乱の闇の賜え。狂乱の闇の加護に歌え。')).toBe('こんにちは\n')
    expect(chant.decode('狂乱の闇の雨を清め。闇へ雨を狂乱の呼び戻す。乙女よ狂乱の闇の賜え。狂乱の闇の加護に紡げ。')).toBe('こんにちは\n')
  })

  test('dumpされた文字が途中でもdecodeできるかの確認',()=>{
    // chant.encode('')
    expect(chant.decode(chant.encode('💩💩').slice(0,-4)))
      .toEqual(expect.stringContaining('💩'))
  })
  test('関係ない文字でもエラーが出ないことの確認',()=>{
    // chant.encode('')
    expect(()=>chant.decode('💩')).not.toThrow()
    expect(chant.decode('💩')).toBe('')
  })
})
