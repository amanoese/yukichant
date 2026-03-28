import fs from 'fs'
import path from 'path'
import { createRequire } from 'node:module'
import kuromoji from 'kuromoji'
import natural from 'natural'
import typoCorrection from './typo-correction.js'
import { initTypoCorrection } from './typo-correction.js'
import fkm, { initFuzzyKanjiMatch } from './fuzzy-kanji-match.js'
import { createChant } from './index.js'

const require = createRequire(import.meta.url)

const meisi = JSON.parse(fs.readFileSync(new URL('../data/meisi.json', import.meta.url), 'utf8'));
const dousi = JSON.parse(fs.readFileSync(new URL('../data/dousi.json', import.meta.url), 'utf8'));

const kanji2radicalPath = require.resolve('kanjivg-radical/data/kanji2radical.json')
const kanjiVgRadicalDir = path.dirname(path.dirname(kanji2radicalPath))
const kanji2element = JSON.parse(
  fs.readFileSync(path.join(kanjiVgRadicalDir, 'data', 'kanji2radical.json'), 'utf8')
);

const yukidicBasePath = require.resolve('yukidic/dic/base.dat.gz')
const yukidicDir = path.dirname(path.dirname(yukidicBasePath))
const dicPath = path.join(yukidicDir, 'dic') + path.sep

initFuzzyKanjiMatch({ meisi, dousi, kanji2element, TfIdf: natural.TfIdf });

const tokenizer = await new Promise((resolve, reject) => {
  kuromoji
    .builder({ dicPath })
    .build(function (err, tokenizer) {
      if (err != null) {
        reject(err);
      }
      resolve(tokenizer);
    });
});

initTypoCorrection({ tokenizer, fuzzyKanjiMatch: fkm });

const chant = createChant({
  data: { meisi, dousi },
  typoCorrection,
})

export default chant
