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
.option('-s','strict decode mode flag')
.option('--no-tfidf','disable tfidf mode flag when strict decode mode flag is enabled')
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
    console.log(chant.encode(inputText))
  }
})
.parse(process.argv);
