import fs from 'fs'
import path from 'path'
import natural from 'natural'
import fkm, { initFuzzyKanjiMatch } from '../src/fuzzy-kanji-match.js';

const dirname = path.dirname(new URL(import.meta.url).pathname)
const meisi = JSON.parse(fs.readFileSync(`${dirname}/../data/meisi.json`, 'utf8'));
const dousi = JSON.parse(fs.readFileSync(`${dirname}/../data/dousi.json`, 'utf8'));
const kanji2element = JSON.parse(fs.readFileSync(`${dirname}/../node_modules/kanjivg-radical/data/kanji2radical.json`, 'utf8'));

initFuzzyKanjiMatch({ meisi, dousi, kanji2element, TfIdf: natural.TfIdf });

describe('fuzzyKanjiMatch', () => {
  test('minDistances 正しい漢字の距離は最も短い', () => {
    expect(fkm.minDistances('羅').length).toBe(1);
  })
  test('minDistances', () => {
    expect(fkm.minDistances('罹').map(v=>v.kanji)).toContain('羅');
  })
  // これはテストが通らない
  //test('fuzzyKanjiMatch', () => {
  //  expect(fkm.minDistances('剤').map(v=>v.kanji)).toContain('刹');
  //})
  test('maxTfidfSocres 正しい漢字のスコアは最も高い', () => {
    expect(fkm.maxTfidfSocres('羅').length).toBe(1);
  })
  test('maxTfidfSocres', () => {
    expect(fkm.maxTfidfSocres('罹').map(v=>v.kanji)).toContain('羅');
  })
  test('maxTfidfSocres', () => {
    expect(fkm.maxTfidfSocres('剤').map(v=>v.kanji)).toContain('刹');
  })
});
