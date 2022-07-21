import simpleEnigma from '../src/machine-encrypt.js'


describe('simpleEnigma',()=>{
  test('変換して元に戻せるかの確認',()=>{

    let input = [1,2,3,4,5,6,7,8,9,10]
    let encryptData = simpleEnigma.uint8ArrayEncrypt(input)

    // toBeだとオブジェクト同士の参照が一致しているかまで調べてしまうためtoEqualを使う
    // enigmaと同じ仕組みのため初期位置が同じencoderは,decoderになる
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

  test('辞書にあるすべての単語を出力して問題ないかの確認',()=>{
    // 辞書は名詞が256単語周期、動詞が 256*4単語周期になっている
    // 257 * 4 回 同じデータを入れるとすべてのデータが取り出せる
    let input = Array.from({ length : (257 * 4) }).map(_=> 0)
    let encryptData = simpleEnigma.uint8ArrayEncrypt(input)

    // enigmaと同じ仕組みのため初期位置が同じencoderは,decoderになる
    expect(simpleEnigma.uint8ArrayEncrypt(encryptData))
      .toEqual(input)
  })
  
  test('大きなバイト列をエンコードできるか確認', () => {
    let arr = Array.from((new Array(1000000)).keys()).map((_, i) => i % 256)
    let decoded = simpleEnigma.uint8ArrayEncrypt(simpleEnigma.uint8ArrayEncrypt(arr))
    
    expect(arr).toEqual(decoded)
  })
})
