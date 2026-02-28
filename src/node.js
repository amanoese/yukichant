import fs from 'fs'
import path from 'path'
import kuromoji from 'kuromoji'
import natural from 'natural'
import typoCorrection from './typo-correction.js'
import { initTypoCorrection } from './typo-correction.js'
import fkm, { initFuzzyKanjiMatch } from './fuzzy-kanji-match.js'
import { createChant } from './index.js'

const dirname = path.dirname(new URL(import.meta.url).pathname)
const meisi = JSON.parse(fs.readFileSync(`${dirname}/../data/meisi.json`, 'utf8'));
const dousi = JSON.parse(fs.readFileSync(`${dirname}/../data/dousi.json`, 'utf8'));
const kanji2element = JSON.parse(fs.readFileSync(`${dirname}/../node_modules/kanjivg-radical/data/kanji2radical.json`, 'utf8'));

initFuzzyKanjiMatch({ meisi, dousi, kanji2element, TfIdf: natural.TfIdf });

const tokenizer = await new Promise((resolve, reject) => {
  kuromoji
    .builder({ dicPath: `${dirname}/../node_modules/yukidic/dic/` })
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
