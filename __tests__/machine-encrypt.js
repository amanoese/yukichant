const simpleEnigma = require('../src/machine-encrypt.js')


describe('simpleEnigma',()=>{
  test('変換して元に戻せるかの確認',()=>{

    let input = [1,2,3,4,5,6,7,8,9,10]
    let encryptData = simpleEnigma.uint8ArrayEncrypt(input)

    // toBeだとオブジェクト同士の参照が一致しているかまで
    //調べてしまうためtoEqualを使う
    expect(simpleEnigma.uint8ArrayEncrypt(encryptData))
      .toEqual(input)
  })

  test('連続したバイト列が偏り少なく出力される確認',()=>{

    //すべて0の500このリスト
    let continuSameNumber = Array.from({ length : 500 }).map(_=> 0)
    let result = simpleEnigma.uint8ArrayEncrypt(continuSameNumber)

    let result_count = Array.from({ length : 256 }).map(_=> 0)

    result.forEach(v=>{
      result_count[v] += 1
    })

    expect(Math.max(...result_count))
      .toBeLessThan(15)
  })
})
