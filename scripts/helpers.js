import kuromoji from 'kuromoji';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const PATHS = {
  ASSETS: join(__dirname, '..', 'assets'),
  DATA: join(__dirname, '..', 'data'),
  SPELL: join(__dirname, '..', 'assets', 'spell.txt'),
  NG_WORDS: join(__dirname, '..', 'assets', 'ng-words.txt'),
  KUROMOJI_DIC: join(__dirname, '..', 'node_modules', 'yukidic', 'dic'),
};

export const MORAE_COUNT = {
  MEISI: 2,
  DOUSI: 3,
};

export function buildTokenizer() {
  return new Promise((resolve, reject) => {
    kuromoji
      .builder({ dicPath: PATHS.KUROMOJI_DIC })
      .build((err, tokenizer) => {
        if (err) reject(err);
        else resolve(tokenizer);
      });
  });
}

export function getReading(tokenizer, word) {
  const tokens = tokenizer.tokenize(word);
  return tokens.map(t => t.reading || t.surface_form).join('');
}

export function katakanaToHiragana(str) {
  return str.replace(/[\u30A1-\u30F6]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

export function getFirstNMorae(reading, n) {
  const hira = katakanaToHiragana(reading);
  const morae = [];
  const smallKana = 'ぁぃぅぇぉゃゅょゎっ';
  for (let i = 0; i < hira.length && morae.length < n; i++) {
    let mora = hira[i];
    if (i + 1 < hira.length && smallKana.includes(hira[i + 1])) {
      mora += hira[i + 1];
      i++;
    }
    morae.push(mora);
  }
  return morae.join('');
}

export function getFirstKanji(word) {
  const m = word.match(/^\p{scx=Han}/u);
  return m ? m[0] : word[0];
}

export function formatJson(mapping) {
  const keys = Object.keys(mapping).sort();
  const lines = keys.map(key => {
    const entry = mapping[key];
    const firstKanji = entry.firstKanji.map(v => `"${v}"`).join(', ');
    const words = entry.words.map(v => `"${v}"`).join(', ');
    const readings = entry.readings.map(v => `"${v}"`).join(', ');
    return `  "${key}": {\n    "firstKanji": [${firstKanji}],\n    "mora": "${entry.mora}",\n    "words": [${words}],\n    "readings": [${readings}]\n  }`;
  });
  return '{\n' + lines.join(',\n') + '\n}\n';
}
