/**
 * yukichant ブラウザ向けエントリポイント
 *
 * 基本的な使い方（encode/decode のみ、誤字修正なし）:
 *   import { createChant } from 'yukichant/browser'
 *
 *   const chant = await createChantFromGitHub()
 *   chant.encode('Hello,World')
 *   await chant.decode(spell)
 *
 * 全機能（誤字修正付き）:
 *   import { initBrowser } from 'yukichant/browser'
 *
 *   const chant = await initBrowser()
 *   const spell = chant.encode('Hello,World')
 *   const text = await chant.decode(spell, { s: true })  // 誤字修正付き
 */
import kuromoji from 'kuromoji'
import { createChant } from './index.js'
import typoCorrection, { initTypoCorrection } from './typo-correction.js'
import fkm, { initFuzzyKanjiMatch } from './fuzzy-kanji-match.js'
import pkg from '../package.json' with { type: 'json' }

export { createChant, default_encoder, default_decoder } from './index.js'

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com'
const YUKICHANT_REPO = 'amanoese/yukichant'
const YUKIDIC_REPO = 'amanoese/yukidic'
const KANJIVG_RADICAL_REPO = 'yagays/kanjivg-radical'

/**
 * GitHubリポジトリからデフォルトのURLを生成する
 * @param {string} [version] - yukichantのリリースタグ（省略時はパッケージバージョン）
 * @returns {Object} 各データのURL
 */
function getDefaultUrls(version = `v${pkg.version}`) {
  return {
    dataBaseUrl: `${GITHUB_RAW_BASE}/${YUKICHANT_REPO}/${version}/data`,
    dicPath: `${GITHUB_RAW_BASE}/${YUKIDIC_REPO}/master/dic/`,
    kanji2radicalUrl: `${GITHUB_RAW_BASE}/${KANJIVG_RADICAL_REPO}/master/data/kanji2radical.json`,
  }
}

/**
 * GitHubから辞書データを取得してyukichantインスタンスを生成する（誤字修正なし）
 * @param {Object} [params]
 * @param {string} [params.version] - yukichantのリリースタグ
 * @param {string} [params.dataBaseUrl] - meisi.json, dousi.json の配置先URL
 * @returns {Promise<Object>} encode/decode/generate メソッドを持つオブジェクト
 */
export async function createChantFromGitHub({ version, dataBaseUrl } = {}) {
  const urls = getDefaultUrls(version)
  const base = dataBaseUrl || urls.dataBaseUrl

  const [meisi, dousi] = await Promise.all([
    fetch(`${base}/meisi.json`).then(r => r.json()),
    fetch(`${base}/dousi.json`).then(r => r.json()),
  ])

  return createChant({ data: { meisi, dousi } })
}

/**
 * ブラウザ環境でyukichantの全機能（誤字修正付き）を初期化する
 * 引数を省略するとGitHubリポジトリから自動でデータを取得する
 *
 * @param {Object} [params]
 * @param {string} [params.version] - yukichantのリリースタグ（省略時はパッケージバージョン）
 * @param {string} [params.dataBaseUrl] - meisi.json, dousi.json の配置先URL
 * @param {string} [params.dicPath] - kuromoji辞書ファイルの配置先URL
 * @param {string} [params.kanji2radicalUrl] - kanji2radical.json のURL
 * @param {Function} [params.TfIdf] - TF-IDFコンストラクタ（省略時は natural.TfIdf を動的import）
 * @returns {Promise<Object>} encode/decode/generate メソッドを持つオブジェクト
 */
export async function initBrowser({
  version,
  dataBaseUrl,
  dicPath,
  kanji2radicalUrl,
  TfIdf,
} = {}) {
  const urls = getDefaultUrls(version)
  const _dataBaseUrl = dataBaseUrl || urls.dataBaseUrl
  const _dicPath = dicPath || urls.dicPath
  const _kanji2radicalUrl = kanji2radicalUrl || urls.kanji2radicalUrl

  const [meisi, dousi, kanji2element] = await Promise.all([
    fetch(`${_dataBaseUrl}/meisi.json`).then(r => r.json()),
    fetch(`${_dataBaseUrl}/dousi.json`).then(r => r.json()),
    fetch(_kanji2radicalUrl).then(r => r.json()),
  ])

  if (!TfIdf) {
    const tfidfModule = await import('natural/lib/natural/tfidf/index.js')
    TfIdf = tfidfModule.TfIdf
  }

  initFuzzyKanjiMatch({ meisi, dousi, kanji2element, TfIdf })

  const tokenizer = await new Promise((resolve, reject) => {
    kuromoji
      .builder({ dicPath: _dicPath })
      .build(function (err, tokenizer) {
        if (err != null) reject(err)
        resolve(tokenizer)
      })
  })

  initTypoCorrection({ tokenizer, fuzzyKanjiMatch: fkm })

  return createChant({
    data: { meisi, dousi },
    typoCorrection,
  })
}
