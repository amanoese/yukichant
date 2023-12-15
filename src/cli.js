#!/usr/bin/env node
import getStdin from 'get-stdin'
import chant from './index.js'
import fs from 'fs'
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
.option('-v','verbose mode flag')
.option('-vv','more verbose') // なぜかVv
.action(async (text,option)=>{
  if (option.Vv) { option.v = true }
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
