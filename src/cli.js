#!/usr/bin/env node
import getStdin from 'get-stdin'
import chant from './index.js'
import fs from 'fs'
import path from 'path'
const dirname = path.dirname(new URL(import.meta.url).pathname)
const { version } = JSON.parse(fs.readFileSync(`${dirname}/../package.json`));

import { Command } from 'commander/esm.mjs';
const program = new Command();

program
.name('yukichant')
.description('yukichant is convert text to magic spell.')
.version(version)
.argument('[text]','input text','')
.option('-d','decode flag')
.action(async (text,option)=>{
  let inputText = text || (await getStdin())
  if (inputText == '') {
    console.log(chant.generate())
  } else if (option.d){
    process.stdout.write(chant.decode(inputText))
  } else {
    console.log(chant.encode(inputText))
  }
})
.parse(process.argv);
