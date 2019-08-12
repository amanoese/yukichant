const chant = require('../src/index.js')
const meisi = require('../data/meisi.json')
const dousi = require('../data/dousi.json')

describe('chant',()=>{
  test('encode',()=>{
    for (let i=0; i<1000; i++) {
      expect(chant.encode('unko\n'))
        .toMatch(/^活力へ快方の塊に刻め。(具現化せよ|踊れ|歌え|紡げ)。$/)
    }
  })

  test('encode 改行文字込',()=>{
    // encodeしたときに、encodeあとの文字がランダムにどれか選ばれるため
    // 乱数を考慮して複数回テストを実行する。
    for (let i=0; i<1000; i++) {
      expect(chant.encode('こんにちは\n'))
        .toMatch(/^時流の季節が胸に値せ。軌跡を胸に時流の賜え。鼓動の時流の季節が宿り。時流の季節が御方を(具現化せよ|踊れ|歌え|紡げ)。$/)
    }
  })

  test('decode',()=>{
    expect(chant.decode(chant.encode('こんにちは')))
      .toBe('こんにちは')
  })

  test('decode 改行文字込',()=>{

    expect(chant.decode('時流の季節が胸に値せ。軌跡を胸に時流の賜え。鼓動の時流の季節が宿り。時流の季節が御方を具現化せよ。')).toBe('こんにちは\n')
    expect(chant.decode('時流の季節が胸に値せ。軌跡を胸に時流の賜え。鼓動の時流の季節が宿り。時流の季節が御方を踊れ。')).toBe('こんにちは\n')
    expect(chant.decode('時流の季節が胸に値せ。軌跡を胸に時流の賜え。鼓動の時流の季節が宿り。時流の季節が御方を歌え。')).toBe('こんにちは\n')
    expect(chant.decode('時流の季節が胸に値せ。軌跡を胸に時流の賜え。鼓動の時流の季節が宿り。時流の季節が御方を紡げ。')).toBe('こんにちは\n')
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
