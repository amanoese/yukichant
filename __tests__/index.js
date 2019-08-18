const chant = require('../src/index.js')
const meisi = require('../data/meisi.json')
const dousi = require('../data/dousi.json')

describe('chant',()=>{
  test('encode',()=>{
    // encodeしたときに、encodeあとの文字がランダムにどれか選ばれるため
    // 乱数を考慮して複数回テストを実行する。
    for (let i=0; i<1000; i++) {
      expect(chant.encode('unko\n'))
        .toMatch(/^(疾走|疾風の|疾風よ)(前の|前を|前途を)(爆炎|爆撃|爆裂)(極め。)(具現化せよ。|踊れ。|歌え。|紡げ。)$/)
    }
  })

  test('decode',()=>{
    expect(chant.decode(chant.encode('こんにちは')))
      .toBe('こんにちは')
  })

  test('decode 改行文字込',()=>{

    expect(chant.decode('疾風の前途を爆炎極め。具現化せよ。')).toBe('unko\n')
    expect(chant.decode('疾風の前途を爆炎極め。踊れ。'        )).toBe('unko\n')
    expect(chant.decode('疾風の前途を爆炎極め。踊れ。'      )).toBe('unko\n')
    expect(chant.decode('疾風の前途を爆炎極め。紡げ。'        )).toBe('unko\n')
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
