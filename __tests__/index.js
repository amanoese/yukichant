import chant from '../src/node.js'
import fs from 'fs'
const meisi = JSON.parse(fs.readFileSync('./data/meisi.json', 'utf8'));
const dousi = JSON.parse(fs.readFileSync('./data/dousi.json', 'utf8'));

describe('chant',()=>{
  test('encode',()=>{
    // encodeしたときに、encodeあとの文字がランダムにどれか選ばれるため
    // 乱数を考慮して複数回テストを実行する。
    for (let i=0; i<1000; i++) {
      expect(chant.encode('unko\n'))
        .toMatch(/^(目で)(記憶の|記憶に)(不条理の|不浄の|不浄を)(折る。)(成せ。)$/)
    }
  })

  test('decode',async ()=>{
    expect(await chant.decode(chant.encode('こんにちは')))
      .toBe('こんにちは')
  })

  test('decode 改行文字込',async ()=>{
    expect(await chant.decode('目で記憶の不条理の折る。成せ。')).toBe('unko\n')
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
    //                   目で記憶の不条理の折る。成せ。
    //                         記臆
    expect(await chant.decode('目で記臆の不条理の折る。成せ。')).toBe('unko\n')
  })
})
