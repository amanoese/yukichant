const chant_cmd = `./src/cli.js`

import fs from 'fs';
import { execSync } from 'child_process';
import help_message from '../test_data/help_message';

describe('chant',()=>{
  test('generate',async ()=>{
    let result = execSync(`${chant_cmd}`)
    expect(result.toString()).toEqual(expect.anything())
  })
  test('--help',async ()=>{
    let result = execSync(`${chant_cmd} --help`)
    expect(result.toString()).toEqual(help_message)
  })
  test('encode to decode',async ()=>{
    let result = execSync(`echo -n unko | ${chant_cmd} | ${chant_cmd} -d`)
    expect(result.toString()).toEqual('unko')
  })
})

describe('CLIオプション', () => {
  // 「魔手よ呪文を指を借り。」= encode('unko') の現在の出力
  const correctSpell = '魔手よ呪文を指を借り。'
  // 一部の漢字を誤字にしたもの
  const typoSpell = '魔手よ呪文を指を借リ。'

  test('-d: 正しい呪文をデコードできる', () => {
    const result = execSync(`echo -n '${correctSpell}' | ${chant_cmd} -d`)
    expect(result.toString()).toBe('unko')
  })

  test('-d: 誤字あり呪文もデフォルトで誤字修正されてデコードできる', () => {
    const result = execSync(`echo -n '${typoSpell}' | ${chant_cmd} -d`)
    // 誤字修正が効いていれば unko になるはず
    expect(result.toString()).toBe('unko')
  })

  test('-d -s: 誤字修正を無効化すると誤字あり呪文は正しくデコードできない', () => {
    const result = execSync(`echo -n '${typoSpell}' | ${chant_cmd} -d -s`)
    expect(result.toString()).not.toBe('unko')
  })

  test('-d -s: 誤字修正を無効化しても正しい呪文はデコードできる', () => {
    const result = execSync(`echo -n '${correctSpell}' | ${chant_cmd} -d -s`)
    expect(result.toString()).toBe('unko')
  })

  test('-d --levenshtein: Levenshteinアルゴリズムで誤字修正デコードできる', () => {
    const result = execSync(`echo -n '${typoSpell}' | ${chant_cmd} -d --levenshtein`)
    expect(result.toString()).toBe('unko')
  })

  test('encode → decode の往復が一致する（複数パターン）', () => {
    const inputs = ['hello', 'テスト', '🍣🍣🍣', 'abc123']
    for (const input of inputs) {
      const result = execSync(`echo -n '${input}' | ${chant_cmd} | ${chant_cmd} -d`)
      expect(result.toString()).toBe(input)
    }
  })
})
