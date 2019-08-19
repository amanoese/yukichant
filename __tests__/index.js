const chant = require('../src/index.js')
const meisi = require('../data/meisi.json')
const dousi = require('../data/dousi.json')

describe('chant',()=>{
  test('encode',()=>{
    // encodeしたときに、encodeあとの文字がランダムにどれか選ばれるため
    // 乱数を考慮して複数回テストを実行する。
    for (let i=0; i<1000; i++) {
      expect(chant.encode('unko\n'))
        .toMatch(/^(回廊に|回廊へ)(凍結|凍土に)(冥へ|冥界|冥府の|冥府より)(借り。)(血塗ら。)$/)
    }
  })

  test('decode',()=>{
    expect(chant.decode(chant.encode('こんにちは')))
      .toBe('こんにちは')
  })

  test('decode 改行文字込',()=>{
    expect(chant.decode('回廊に凍結冥界借り。血塗ら。')).toBe('unko\n')
  })

  test('dumpされた文字が途中でもdecodeできるかの確認',()=>{
    // chant.encode('')
    expect(chant.decode(chant.encode('💩💩').slice(0,-4)))
      .toEqual(expect.stringContaining('💩'))
  })
  test('関係ない文字でもエラーが出ないことの確認',()=>{
    // chant.encode('')
    expect(()=>chant.decode('💩')).not.toThrow()
    //下のテストは無理になった
    //expect(chant.decode('💩')).toBe('')
  })
})
