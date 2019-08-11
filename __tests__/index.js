const chant = require('../src/index.js')

describe('chant',()=>{
  test('encode',()=>{
    expect(chant.encode('こんにちは'))
      .toBe('雫よ狭間の剣に渡れ。狭霧剣に雫よ囚われ。光を雫よ狭間の触れ。雫よ狭間の澄ませ。')
  })

  test('decode',()=>{
    expect(chant.decode('雫よ狭間の剣に渡れ。狭霧剣に雫よ囚われ。光を雫よ狭間の触れ。雫よ狭間の澄ませ。'))
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
