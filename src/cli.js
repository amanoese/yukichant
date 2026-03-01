#!/usr/bin/env node
import getStdin from 'get-stdin'
import chant from './node.js'
import fs from 'fs'
import { setLogLevel } from './logger.js'
const { version } = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

import { Command } from 'commander/esm.mjs';
const program = new Command();

program
.name('yukichant')
.description('yukichant is convert text to magic spell.')
.version(version)
.argument('[text]','input text','')
.option('-d','decode flag')
.option('-f, --furigana','display furigana (ruby)')
.option('-s','disable typo correction (strict decode mode)')
.option('--no-tfidf','disable tfidf mode for typo correction')
.option('--levenshtein','use Levenshtein distance algorithm instead of Jaro-Winkler')
.option('-v','verbose mode flag')
.option('-vv','more verbose') // なぜかVv
.action(async (text,option)=>{
  // 内部実装で参照しているオプション名に揃える
  option.is_tfidf = option.tfidf
  option.Levenshtein = option.levenshtein

  if (option.Vv) { option.v = true }
  
  // ログレベルを設定
  setLogLevel(option)
  
  let inputText = text || (await getStdin())
  if (inputText == '') {
    console.log(chant.generate())
  } else if (option.d){
    process.stdout.write(await chant.decode(inputText,option))
  } else {
    const result = chant.encode(inputText, option)
    if (typeof result === 'object') {
      console.error(result.readings)
      console.log(result.words)
    } else {
      console.log(result)
    }
  }
})
.parse(process.argv);
