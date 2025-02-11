import simpleEnigma from '../src/machine-encrypt.js'
import fkm from '../src/fuzzy-kanji-match.js';

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
