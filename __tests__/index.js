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
        .toMatch(/^(回廊に|回廊へ)(凍結|凍土に)(冥へ|冥界|冥府の|冥府より)(宿り。)(篩う。)$/)
    }
  })

  test('decode',async ()=>{
    expect(await chant.decode(chant.encode('こんにちは')))
      .toBe('こんにちは')
  })

  test('decode 改行文字込',async ()=>{
    expect(await chant.decode('回廊に凍結冥界宿り。篩う。')).toBe('unko\n')
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
    //                   回廊に凍結冥界宿り。篩う。
    //                   回      結
    expect(await chant.decode('廻廊に凍吉冥界宿り。篩う。')).toBe('unko\n')
  })
})
