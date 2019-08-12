/*

このテストではdata/*.jsonのバリューの重複がないことを検証する。

data/dousi.jsonとdata/meisi.jsonのバリュー(呪文)の文字列は重複してはならない。
後から要素を追加した際に、重複が発生すると正常にdecodeできなくなる懸念があるためである。

*/

const meisi = require('../data/meisi.json')
const dousi = require('../data/dousi.json')

describe('meisi', () => {
  test('meisiの値に重複するものが存在しない', () => {
    let valueCount = 0
    let valueHash = {}
    Object.entries(meisi).forEach(([k,v])=> {
      valueCount += v.length
      v.forEach(v2=> {
        valueHash[v2] = true
      })
    })
    
    expect(Object.keys(valueHash).length === valueCount).toBeTruthy()
  })
})

describe('dousi', () => {
  test('dousiの値に重複するものが存在しない', () => {
    let valueCount = 0
    let valueHash = {}
    Object.entries(dousi).forEach(([k,v])=> {
      valueCount += v.length
      v.forEach(v2=> {
        valueHash[v2] = true
      })
    })

    expect(Object.keys(valueHash).length === valueCount).toBeTruthy()
  })
})