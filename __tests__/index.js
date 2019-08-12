const chant = require('../src/index.js')
const meisi = require('../data/meisi.json')
const dousi = require('../data/dousi.json')

describe('chant',()=>{
  test('encode',()=>{
    let magic_word_head = ['75','6E','6B','6F']
      .map(num=>num.toString(16).toUpperCase())
      .map((key,i)=>(i + 1) % 4 ? meisi[key] : dousi[key] + '。')
      .join('')

    let magic_word = magic_word_head + dousi['0A'] + '。'

    expect(chant.encode('unko\n'))
      .toBe(magic_word)
  })

  test('decode',()=>{
    expect(chant.decode(chant.encode('こんにちは')))
      .toBe('こんにちは')
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
