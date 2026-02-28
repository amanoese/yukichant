import { createChantFromGitHub, initBrowser } from 'yukichant/browser'

const $ = (sel) => document.querySelector(sel)
const $$ = (sel) => document.querySelectorAll(sel)

let chantLight = null
let chantFull = null

const ui = {
  loading: $('#loading'),
  loadingStatus: $('#loading-status'),
  app: $('#app'),
  textInput: $('#text-input'),
  spellInput: $('#spell-input'),
  directionToggle: $('#direction-toggle'),
  directionOptions: $$('.direction-option'),
  directionIcon: $('#direction-icon'),
  status: $('#status'),
  copyText: $('#copy-text'),
  copySpell: $('#copy-spell'),
  typoCorrection: $('#typo-correction'),
  algorithmSelect: $('#algorithm-select'),
  decodeOptions: $('#decode-options'),
}

let direction = 'encode'
let encodeTimer = null
let decodeTimer = null

function debounce(fn, ms, timerKey) {
  return (...args) => {
    if (timerKey === 'encode') {
      clearTimeout(encodeTimer)
      encodeTimer = setTimeout(() => fn(...args), ms)
    } else {
      clearTimeout(decodeTimer)
      decodeTimer = setTimeout(() => fn(...args), ms)
    }
  }
}

function setStatus(text, type = 'info') {
  ui.status.textContent = text
  ui.status.className = `status ${type}`
}

async function doEncode() {
  const text = ui.textInput.value.trim()
  if (!text) {
    ui.spellInput.value = ''
    setStatus('')
    return
  }

  const chant = chantLight || chantFull
  if (!chant) {
    setStatus('初期化中です...', 'info')
    return
  }

  try {
    const result = chant.encode(text)
    ui.spellInput.value = result
    setStatus('')
  } catch (err) {
    console.error(err)
    setStatus(`エラー: ${err.message}`, 'error')
  }
}

async function doDecode() {
  const spell = ui.spellInput.value.trim()
  if (!spell) {
    ui.textInput.value = ''
    setStatus('')
    return
  }

  const chant = chantFull || chantLight
  if (!chant) {
    setStatus('初期化中です...', 'info')
    return
  }

  try {
    const useTypo = ui.typoCorrection.checked
    if (useTypo && !chantFull) {
      setStatus('誤字修正機能はまだ読み込み中です...', 'info')
    }

    const option = {}
    if (!useTypo) option.s = true
    const algorithm = $('input[name="algorithm"]:checked')?.value
    if (algorithm === 'levenshtein') option.Levenshtein = true

    setStatus('デコード中...', 'info')
    const result = await chant.decode(spell, option)
    ui.textInput.value = result
    setStatus('')
  } catch (err) {
    console.error(err)
    setStatus(`エラー: ${err.message}`, 'error')
  }
}

const debouncedEncode = debounce(doEncode, 300, 'encode')
const debouncedDecode = debounce(doDecode, 500, 'decode')

function setDirection(dir) {
  direction = dir
  const isEncode = dir === 'encode'

  ui.directionOptions.forEach((opt) => {
    opt.classList.toggle('active', opt.dataset.dir === dir)
  })
  ui.directionIcon.classList.toggle('flipped', !isEncode)

  ui.decodeOptions.classList.toggle('disabled', isEncode)
  ui.typoCorrection.disabled = isEncode
  $$('#algorithm-select input').forEach((r) => { r.disabled = isEncode })
  $('#options-hint').classList.toggle('hidden', !isEncode)

  ui.textInput.readOnly = !isEncode
  ui.spellInput.readOnly = isEncode

  ui.textInput.classList.toggle('readonly', !isEncode)
  ui.spellInput.classList.toggle('readonly', isEncode)
}

function copyToClipboard(text, btn) {
  if (!text) return
  navigator.clipboard.writeText(text).then(() => {
    btn.classList.add('copied')
    setTimeout(() => btn.classList.remove('copied'), 1500)
  }).catch(() => {
    setStatus('コピーに失敗しました', 'error')
  })
}

function initUI() {
  setDirection('encode')

  ui.textInput.addEventListener('input', () => {
    if (direction === 'encode') debouncedEncode()
  })

  ui.spellInput.addEventListener('input', () => {
    if (direction === 'decode') debouncedDecode()
  })

  ui.directionOptions.forEach((opt) => {
    opt.addEventListener('click', () => setDirection(opt.dataset.dir))
  })

  ui.typoCorrection.addEventListener('change', () => {
    ui.algorithmSelect.classList.toggle('hidden', !ui.typoCorrection.checked)
    if (direction === 'decode' && ui.spellInput.value.trim()) debouncedDecode()
  })

  $$('input[name="algorithm"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      if (direction === 'decode' && ui.spellInput.value.trim()) debouncedDecode()
    })
  })

  ui.copyText.addEventListener('click', () => copyToClipboard(ui.textInput.value, ui.copyText))
  ui.copySpell.addEventListener('click', () => copyToClipboard(ui.spellInput.value, ui.copySpell))
}

async function init() {
  initUI()

  try {
    ui.loadingStatus.textContent = 'エンコード機能を準備しています'
    chantLight = await createChantFromGitHub()

    ui.loading.classList.add('hidden')
    ui.app.classList.remove('hidden')

    setStatus('誤字修正機能を読み込み中...', 'info')

    chantFull = await initBrowser()

    setStatus('')
  } catch (err) {
    console.error('初期化エラー:', err)
    ui.loadingStatus.textContent = `読み込みに失敗しました: ${err.message}`

    if (chantLight) {
      ui.loading.classList.add('hidden')
      ui.app.classList.remove('hidden')
      setStatus('誤字修正機能の読み込みに失敗しました', 'error')
    }
  }
}

init()
