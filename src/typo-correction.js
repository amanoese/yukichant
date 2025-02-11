import fs from 'fs'
import path from 'path'
const dirname = path.dirname(new URL(import.meta.url).pathname)

import {distance, closest} from 'fastest-levenshtein'
import pc from "picocolors"
import kuromoji from 'kuromoji'

import fkm from './fuzzy-kanji-match.js'


let tokenizer = await new Promise((resolve,reject) => {
  kuromoji
  .builder({ dicPath: `${dirname}/../node_modules/yukidic/dic/` })
  .build(function (err, tokenizer) {
    if(err != null) {
      reject(err)
    }
    resolve(tokenizer)
  });
});

const tokenize = (text) => {
  return tokenizer.tokenize(text);
}

const exec = (text,option = { is_tfidf : false, v : false, Vv : false}) => {
  let tokens = tokenizer.tokenize(text);
  let ptokens = tokens.filter(token=>token.pos_detail_1 == '引用文字列')
    .map((token,i)=> ({ i:token.word_position, v:token.surface_form }) )
  let ntokens = tokens.filter(token=>token.pos_detail_1 != '引用文字列')
  if(ntokens.length == 0){
    return text;
  }
  if(option.Vv == true){ console.log('☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆') }
  if(option.Vv == true){ console.log('ntokens',ntokens.filter(token=>token.pos != '記号')) }
  let fixTokens = organizeUnknownTokens(ntokens,option)
  let fixedTokens = fixTokens
    .filter(token=>token.pos != '記号')
    // 未知の形態素を修正する
    .map(token=>{
      //。で終わる文は、。を削除して修正する
      let fixText = token.v.replace(/。$/,'');
      if(option.is_tfidf == true){
        fixText = nearTokenMatch(fixText,option)
      } else {
        fixText = closest(fixText, fkm.allWord)
      }
      return { ...token, v:fixText }
    })

  let fixedTextTokens = [ ...ptokens , ...fixedTokens ].sort((a,b)=>a.i - b.i);
  if(option.v) {
    console.error(fixedTextTokens.map(token=>(token.old ? pc.green(token.v): token.v)).join(''))
  }

  let fixedText = fixedTextTokens
    .map(token=>token.v)
    .join('');

  return fixedText
}

const nearTokenMatch = (tokenStr,option = {v : false, Vv : false}) => {
  // まずは、辞書にある形態素との距離を計算する
  let bestMatch = closest(tokenStr, fkm.allWord)
  // 未知の形態素が辞書にない場合、tfidfで最も近い形態素を探す
  let minDistance = distance(tokenStr,bestMatch)

  if(option.Vv == true){ console.log('tokenStr',tokenStr) }
  let tokens = [ ...tokenStr ]
  for(let i = 0; i < tokens.length; i++){
    let kanji = tokens[i]
    if(fkm.han.test(kanji)) {
      if(option.Vv == true){ console.log('kanji',fkm.maxTfidfSocres(kanji)) }
      for(const result of fkm.maxTfidfSocres(kanji) ){
        let newKanji = result.kanji
        let text = [ ...tokens.slice(0,i), newKanji, ...tokens.slice(i+1) ].join('')
        let bestMatch = closest(text, fkm.allWord)
        let d = distance(text,bestMatch)
        if(d < minDistance){
          if(option.Vv == true){ console.log('d',d,'minDistance',minDistance,'text',text,'bestMatch',bestMatch,'kanji',kanji,'newKanji',newKanji) }
          minDistance = d
          tokens[i] = newKanji
          // 一番近い漢字が見つかったら、それを採用して次の文字に進む
          // ただし、最善の漢字ではない可能性がある TODO: 他の候補も検討する
          break;
        }
      }
    }
  }
  return closest(tokens.join(''), fkm.allWord)
}

const organizeUnknownTokens = (ntokens,option = {v : false, Vv : false}) => {
  // tokenの要素から、連続する形態素をまとめる
  let fixTokens = ntokens
    .reduce((list,token)=>{
      let heads = list.slice(0,-1)
      let last = list[list.length -1]
      let adverb = false
      // 基本的に辞書にある形態素は引用文字列に分類される
      // そのため、引用文字列以外の形態素は未知の形態素とみなす
      // 未知の形態素に続く副詞は、直前の形態素に付ける
      if(['副詞','助詞','助動詞','記号'].includes(token.pos)){
        adverb = true
      }
      if (option.Vv == true) { console.log(token.surface_form,token.pos,token.pos_detail_1, token.pos_detail_2, token.pos_detail_3) }

      // 未知の形態素に続く形態素がない場合は、新しい形態素として追加する
      // 未知の形態素に続く副詞は、直前の形態素に付ける
      if (list.length == 0 ||
          (last.adverb == true && adverb == false) ||
          (last.i + last.v.length != token.word_position) ||
          ((/^[\p{scx=Han}]+$/u).test(token.pos) && last.length >= 2 && last.pos == '名詞')
      ) {
        return [ ...list, { i:token.word_position, v: token.surface_form, old: token.surface_form, pos:token.pos, adverb } ]
      }
      // 未知の形態素に続く未知の形態素は、直前の形態素に付ける
      return [ ...heads, { i:last.i, v:last.v + token.surface_form , old:last.old + token.surface_form, adverb } ]
    },[])
  return fixTokens
}

export default { tokenize, exec, organizeUnknownTokens, nearTokenMatch }
