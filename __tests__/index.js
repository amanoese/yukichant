const chant = require('../src/index.js')

describe('chant',()=>{
  test('encode',()=>{
    expect(chant.encode('こんにちは'))
      .toBe('雫よ狭間の剣に渡れ。狭霧剣に雫よ囚われ。光を雫よ狭間の触れ。雫よ狭間の澄ませ。')
  })

  test('encode 改行文字込',()=>{
    // encodeしたときに、encodeあとの文字がランダムにどれか選ばれるため
    // 乱数を考慮して複数回テストを実行する。
    for (let i=0; i<1000; i++) {
      expect(chant.encode('こんにちは\n'))
        .toMatch(/^雫よ狭間の剣に渡れ。狭霧剣に雫よ囚われ。光を雫よ狭間の触れ。雫よ狭間の刻印よ(汚し|踊れ|歌え|紡げ)。$/)
    }
  })

  test('decode',()=>{
    expect(chant.decode('雫よ狭間の剣に渡れ。狭霧剣に雫よ囚われ。光を雫よ狭間の触れ。雫よ狭間の澄ませ。'))
      .toBe('こんにちは')
  })

  test('decode 改行文字込',()=>{
    expect(chant.decode('雫よ狭間の剣に渡れ。狭霧剣に雫よ囚われ。光を雫よ狭間の触れ。雫よ狭間の刻印よ汚し。')).toBe('こんにちは\n')
    expect(chant.decode('雫よ狭間の剣に渡れ。狭霧剣に雫よ囚われ。光を雫よ狭間の触れ。雫よ狭間の刻印よ踊れ。')).toBe('こんにちは\n')
    expect(chant.decode('雫よ狭間の剣に渡れ。狭霧剣に雫よ囚われ。光を雫よ狭間の触れ。雫よ狭間の刻印よ歌え。')).toBe('こんにちは\n')
    expect(chant.decode('雫よ狭間の剣に渡れ。狭霧剣に雫よ囚われ。光を雫よ狭間の触れ。雫よ狭間の刻印よ紡げ。')).toBe('こんにちは\n')
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
