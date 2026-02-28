import {distance, closest} from 'fastest-levenshtein'

let allWord = [];
let han = /^[\p{scx=Han}]$/u;
let kanjiList = [];
let elementList = [];
let tfidf = null;
let _kanji2element = {};
let allHan = [];

/**
 * fuzzy-kanji-matchモジュールを初期化する
 * @param {Object} params
 * @param {Object} params.meisi - 名詞辞書データ
 * @param {Object} params.dousi - 動詞辞書データ
 * @param {Object} params.kanji2element - 漢字→部首対応データ（kanji2radical.json）
 * @param {Function} params.TfIdf - TF-IDFコンストラクタ（natural.TfIdf等）
 */
export function initFuzzyKanjiMatch({ meisi, dousi, kanji2element, TfIdf }) {
  tfidf = new TfIdf();
  _kanji2element = kanji2element;

  allWord = [ ...Object.values(meisi),...Object.values(dousi)].flat();

  allHan = Array.from(new Set(allWord.join('').match(/[\p{scx=Han}]/ug)));

  const kanji2elementStrings = Object.entries(kanji2element).map(([k,v])=>`${k}${v.join('')}`);
  const allHan2element = kanji2elementStrings.filter(v=>allHan.includes(v[0])).sort((a,b)=>a[0].codePointAt()-b[0].codePointAt());
  kanjiList = allHan2element.map(v=>v[0]);
  elementList = allHan2element.map(v=>v.slice(1));

  elementList.forEach(v=>{
    tfidf.addDocument(v.split(''));
  });
}

const maxTfidfSocres = (kanji,isDebug = false) => {
  let kanjiPoint = kanji.codePointAt()
  let element = _kanji2element[kanji];
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
  let element = _kanji2element[kanji];
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
  get allWord() { return allWord; },
  han,
  get chantAllHan() { return allHan; },
  get chantKanjiList() { return kanjiList; },
};
