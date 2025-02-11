import fs from 'fs'
import path from 'path'
import {distance, closest} from 'fastest-levenshtein'
const dirname = path.dirname(new URL(import.meta.url).pathname)

import natural from 'natural'
var TfIdf = natural.TfIdf;
var tfidf = new TfIdf();

//const kanji2element = JSON.parse(fs.readFileSync(`${dirname}/../node_modules/kanjivg-radical/data/kanji2element.json`, 'utf8'));
const kanji2element = JSON.parse(fs.readFileSync(`${dirname}/../node_modules/kanjivg-radical/data/kanji2radical.json`, 'utf8'));

const meisi = JSON.parse(fs.readFileSync(`${dirname}/../data/meisi.json`, 'utf8'));
const dousi = JSON.parse(fs.readFileSync(`${dirname}/../data/dousi.json`, 'utf8'));

const allWord = [ ...Object.values(meisi),...Object.values(dousi)].flat();
//console.log(allWord);

const han = /^[\p{scx=Han}]$/u;
const allHanOverlap = allWord.join('').match(/[\p{scx=Han}]/ug);
const allHan = Array.from(new Set(allWord.join('').match(/[\p{scx=Han}]/ug)));
const allFirstHan = Array.from(new Set(allWord.map(v=>v[0]).join('').match(/[\p{scx=Han}]/ug)));

// 漢字と部首の対応表
// kが漢字、vが部首
const kanji2elementStrings = Object.entries(kanji2element).map(([k,v])=>`${k}${v.join('')}`);
// allHanに含まれる漢字のみを抽出
const allHan2element = kanji2elementStrings.filter(v=>allHan.includes(v[0])).sort((a,b)=>a[0].codePointAt()-b[0].codePointAt());
const kanjiList = allHan2element.map(v=>v[0]);
const elementList = allHan2element.map(v=>v.slice(1));
//console.log(kanji2elementStrings);
//console.log(allHan2element);

elementList.forEach(v=>{
  tfidf.addDocument(v.split(''));
});

const maxTfidfSocres = (kanji,isDebug = false) => {
  let kanjiPoint = kanji.codePointAt()
  let element = kanji2element[kanji];
  if(isDebug){
    console.log(kanji,element);
  }
  if(!element){
    return kanji;
  }
  let result = [];
  tfidf.tfidfs(element, function(i, measure) {
    result.push([i, measure]);
  });

  // スコアが高い漢字を抽出
  let bestMatches = result
    .map(([index,measure])=> ({
      kanji: kanjiList[index],
      element: elementList[index],
      measure: measure
    })).reduce((acc,v)=>{
      // 0.1以上離れている場合はよりスコアの高い漢字として既存の候補を破棄
      if(acc.length === 0 || v.measure - acc[0].measure > 0.1){
        return [v];
      }
      // 0.1以内の場合は同じスコアの漢字として追加
      if(Math.abs(v.measure - acc[0].measure) < 0.1){
        acc.push(v);
      }
      return acc;
    },[]);
  return bestMatches;
};

const minDistances = (kanji) => {
  let element = kanji2element[kanji];
  let elementStr = element.join('');
  let bestMatches = [];
  let minDistance = 100;
  for(let i=0;i<elementList.length;i++){
    let d  = distance(elementStr,elementList[i]);
    if(d < minDistance){
      minDistance = d;
      bestMatches = [];
    }
    if(d === minDistance){
      bestMatches.push({
        kanji: kanjiList[i],
        element: elementList[i],
        distance: d
      });
    }
  }
  console.log(elementStr);
  console.log(bestMatches);
  return bestMatches;
}

export default  {
  maxTfidfSocres,
  minDistances,
  allWord: allWord,
  han: han,
  chantAllHan: allHan,
  chantKanjiList: kanjiList,
};
