#!/usr/bin/env node
import prog from 'caporal'
import getStdin from 'get-stdin'
import chant from './index.js'
import fs from 'fs'
const { version } = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log({version})

prog
.name('yukichant')
.description('yukichant is convert text to magic spell.')
.bin('chant')
.version(version)
.argument('[text]','input text',null,'')
.option('-d','decode flag')
.action(async (args,option)=>{
  let inputText = args.text || (await getStdin())
  if (inputText == '') {
    console.log(chant.generate())
  } else if (option.d){
    process.stdout.write(chant.decode(inputText))
  } else {
    console.log(chant.encode(inputText))
  }
})

prog.parse(process.argv)
