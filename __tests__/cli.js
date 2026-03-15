const chant_cmd = `./src/cli.js`

import { execFileSync } from 'child_process';
import help_message from '../test_data/help_message';

const runCli = (args = [], input = '') => execFileSync(chant_cmd, args, { input, encoding: 'utf8' });

describe('chant',()=>{
  test('generate',async ()=>{
    let result = runCli()
    expect(result).toEqual(expect.anything())
  })
  test('--help',async ()=>{
    let result = runCli(['--help'])
    expect(result).toEqual(help_message)
  })
  test('encode to decode',async ()=>{
    const encoded = runCli([], 'unko').trim()
    const decoded = runCli(['-d'], encoded)
    expect(decoded).toEqual('unko')
  })
})

describe('CLIオプション', () => {
  const plainText = 'unko'
  const correctSpell = '破滅を御前に意に従い借り。'
  const typoSpell = '破滅を御前に意に従い借リ。'

  test('-d: 正しい呪文をデコードできる', () => {
    const result = runCli(['-d'], correctSpell)
    expect(result).toBe(plainText)
  })

  test('-d: 誤字あり呪文もデフォルトで誤字修正されてデコードできる', () => {
    const result = runCli(['-d'], typoSpell)
    expect(result).toBe(plainText)
  })

  test('-d -s: 誤字修正を無効化すると誤字あり呪文は正しくデコードできない', () => {
    const result = runCli(['-d', '-s'], typoSpell)
    expect(result).not.toBe(plainText)
  })

  test('-d -s: 誤字修正を無効化しても正しい呪文はデコードできる', () => {
    const result = runCli(['-d', '-s'], correctSpell)
    expect(result).toBe(plainText)
  })

  test('-d --levenshtein: Levenshteinアルゴリズムで誤字修正デコードできる', () => {
    const result = runCli(['-d', '--levenshtein'], typoSpell)
    expect(result).toBe(plainText)
  })

  test('encode → decode の往復が一致する（複数パターン）', () => {
    const inputs = ['hello', 'テスト', '🍣🍣🍣', 'abc123']
    for (const input of inputs) {
      const encoded = runCli([], input).trim()
      const decoded = runCli(['-d'], encoded)
      expect(decoded).toBe(input)
    }
  })
})
