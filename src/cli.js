#!/usr/bin/env node
const prog = require('caporal')
const getStdin = require('get-stdin')
const chant = require('./index.js')

prog
.name('yukichant')
.description('yukichant is convert text to magic spell.')
.bin('chant')
.version(require('../package.json').version)
.argument('[text]','input text',null,'')
.option('-d','decode flag')
.action(async (args,option)=>{
  let inputText = args.text || (await getStdin())
  if (inputText == '') {
    console.log(chant.generate())
  } else if (option.d){
    console.log(chant.decode(inputText))
  } else {
    console.log(chant.encode(inputText))
  }
})

prog.parse(process.argv)
