<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { createChantFromGitHub, initBrowser } from 'yukichant/browser'

const chantLight = ref(null)
const chantFull = ref(null)
const loading = ref(true)
const loadingStatus = ref('エンコード機能を準備しています')

const direction = ref('encode')
const textInput = ref('')
const spellInput = ref('')
const furiganaOutput = ref('')
const showFurigana = ref(false)
const statusText = ref('')
const statusType = ref('info')
const typoCorrection = ref(true)
const algorithm = ref('jaro-winkler')
const diffs = ref(null)
const copyTextDone = ref(false)
const copySpellDone = ref(false)
const copyFuriganaDone = ref(false)

const isEncode = computed(() => direction.value === 'encode')

let encodeTimer = null
let decodeTimer = null

function setStatus(text, type = 'info') {
  statusText.value = text
  statusType.value = type
}

async function doEncode() {
  diffs.value = null
  if (!textInput.value.trim()) {
    spellInput.value = ''
    furiganaOutput.value = ''
    setStatus('')
    return
  }
  const chant = chantLight.value || chantFull.value
  if (!chant) { setStatus('初期化中です...', 'info'); return }
  try {
    const result = chant.encode(textInput.value.trim(), { furigana: true })
    spellInput.value = result.words
    furiganaOutput.value = result.readings
    setStatus('')
  } catch (err) {
    console.error(err)
    setStatus(`エラー: ${err.message}`, 'error')
  }
}

async function doDecode() {
  if (!spellInput.value.trim()) {
    textInput.value = ''
    furiganaOutput.value = ''
    diffs.value = null
    setStatus('')
    return
  }
  const chant = chantFull.value || chantLight.value
  if (!chant) { setStatus('初期化中です...', 'info'); return }
  try {
    if (typoCorrection.value && !chantFull.value) {
      setStatus('誤字修正機能はまだ読み込み中です...', 'info')
    }
    const option = {}
    if (!typoCorrection.value) option.s = true
    if (algorithm.value === 'levenshtein') option.Levenshtein = true
    let lastDiff = null
    option.onDiff = (d) => { lastDiff = d }
    setStatus('デコード中...', 'info')
    const result = await chant.decode(spellInput.value.trim(), option)
    textInput.value = result
    
    // デコード時もふりがなを表示（エンコードして取得）
    try {
      const encodeResult = (chantLight.value || chantFull.value).encode(result, { furigana: true })
      furiganaOutput.value = encodeResult.readings
    } catch (e) {
      furiganaOutput.value = ''
    }

    diffs.value = lastDiff
    setStatus('')
  } catch (err) {
    console.error(err)
    diffs.value = null
    setStatus(`エラー: ${err.message}`, 'error')
  }
}

function debouncedEncode() {
  clearTimeout(encodeTimer)
  encodeTimer = setTimeout(doEncode, 300)
}

function debouncedDecode() {
  clearTimeout(decodeTimer)
  decodeTimer = setTimeout(doDecode, 500)
}

watch(textInput, () => { if (isEncode.value) debouncedEncode() })
watch(spellInput, () => { if (!isEncode.value) debouncedDecode() })
watch(typoCorrection, () => { if (!isEncode.value && spellInput.value.trim()) debouncedDecode() })
watch(algorithm, () => { if (!isEncode.value && spellInput.value.trim()) debouncedDecode() })

function copyText() {
  if (!textInput.value) return
  navigator.clipboard.writeText(textInput.value).then(() => {
    copyTextDone.value = true
    setTimeout(() => { copyTextDone.value = false }, 1500)
  }).catch(() => setStatus('コピーに失敗しました', 'error'))
}

function copySpell() {
  if (!spellInput.value) return
  navigator.clipboard.writeText(spellInput.value).then(() => {
    copySpellDone.value = true
    setTimeout(() => { copySpellDone.value = false }, 1500)
  }).catch(() => setStatus('コピーに失敗しました', 'error'))
}

function copyFurigana() {
  if (!furiganaOutput.value) return
  navigator.clipboard.writeText(furiganaOutput.value).then(() => {
    copyFuriganaDone.value = true
    setTimeout(() => { copyFuriganaDone.value = false }, 1500)
  }).catch(() => setStatus('コピーに失敗しました', 'error'))
}

onMounted(async () => {
  try {
    loadingStatus.value = 'エンコード機能を準備しています'
    
    // 開発環境ではローカルのViteサーバーから、本番環境ではGitHubから取得
    const isDev = import.meta.env.DEV
    const dataBaseUrl = isDev 
      ? `${window.location.origin}${import.meta.env.BASE_URL}`
      : undefined

    chantLight.value = await createChantFromGitHub({ dataBaseUrl })
    loading.value = false
    setStatus('誤字修正機能を読み込み中...', 'info')
    chantFull.value = await initBrowser({ dataBaseUrl })
    setStatus('')
  } catch (err) {
    console.error('初期化エラー:', err)
    loadingStatus.value = `読み込みに失敗しました: ${err.message}`
    if (chantLight.value) {
      loading.value = false
      setStatus('誤字修正機能の読み込みに失敗しました', 'error')
    }
  }
})
</script>

<template>
  <div class="container">
    <header>
      <h1>yukichant</h1>
      <p class="subtitle">テキストを詠唱呪文に変換するツール</p>
    </header>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p class="loading-text">辞書を読み込み中...</p>
      <p class="loading-sub">{{ loadingStatus }}</p>
    </div>

    <main v-else class="app">
      <div class="panel">
        <div class="field">
          <div class="field-header">
            <label for="text-input">テキスト</label>
            <button
              class="copy-btn"
              :class="{ copied: copyTextDone }"
              title="コピー"
              @click="copyText"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
                <path d="M3 11V3a1.5 1.5 0 011.5-1.5H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <textarea
            id="text-input"
            v-model="textInput"
            placeholder="テキストを入力..."
            rows="3"
            spellcheck="false"
            :readonly="!isEncode"
            :class="{ readonly: !isEncode }"
          ></textarea>
        </div>

        <div class="direction-bar">
          <div class="direction-toggle">
            <button
              class="direction-option"
              :class="{ 'active-encode': isEncode }"
              @click="isEncode ? doEncode() : direction = 'encode'"
            >Encode</button>
            <svg
              class="direction-icon"
              :class="isEncode ? 'encode' : 'decode'"
              width="20" height="20" viewBox="0 0 20 20" fill="none"
            >
              <path d="M10 4v12M10 16l-4-4M10 16l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <button
              class="direction-option"
              :class="{ 'active-decode': !isEncode }"
              @click="direction = 'decode'"
            >Decode</button>
          </div>
        </div>

        <div class="field">
          <div class="field-header">
            <div class="label-with-toggle">
              <label for="spell-input">呪文</label>
              <label class="toggle mini">
                <input type="checkbox" v-model="showFurigana" />
                <span class="toggle-slider"></span>
                <span class="toggle-label">ふりがな</span>
              </label>
            </div>
            <button
              class="copy-btn"
              :class="{ copied: copySpellDone }"
              title="コピー"
              @click="copySpell"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
                <path d="M3 11V3a1.5 1.5 0 011.5-1.5H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <textarea
            id="spell-input"
            v-model="spellInput"
            placeholder="呪文を入力..."
            rows="3"
            spellcheck="false"
            :readonly="isEncode"
            :class="{ readonly: isEncode }"
          ></textarea>
        </div>

        <div v-if="showFurigana && furiganaOutput" class="field furigana-field">
          <div class="field-header">
            <label>ふりがな</label>
            <button
              class="copy-btn"
              :class="{ copied: copyFuriganaDone }"
              title="コピー"
              @click="copyFurigana"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
                <path d="M3 11V3a1.5 1.5 0 011.5-1.5H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div class="furigana-display">
            {{ furiganaOutput }}
          </div>
        </div>

        <div class="options" :class="{ disabled: isEncode }">
          <div class="options-row">
            <label class="toggle">
              <input type="checkbox" v-model="typoCorrection" :disabled="isEncode" />
              <span class="toggle-slider"></span>
              <span class="toggle-label">誤字修正</span>
            </label>
            <div v-show="typoCorrection" class="algorithm-select">
              <label>
                <input type="radio" name="algorithm" value="jaro-winkler" v-model="algorithm" :disabled="isEncode" />
                Jaro-Winkler
              </label>
              <label>
                <input type="radio" name="algorithm" value="levenshtein" v-model="algorithm" :disabled="isEncode" />
                Levenshtein
              </label>
            </div>
          </div>
          <p v-show="isEncode" class="options-hint">デコード時のみ利用できます</p>
        </div>

        <div v-if="diffs" class="diff-display">
          <div class="diff-line">
            <span
              v-for="(d, i) in diffs"
              :key="'o' + i"
              :class="d.changed ? 'old' : 'unchanged'"
            >{{ d.old }}</span>
          </div>
          <div class="diff-line">
            <span
              v-for="(d, i) in diffs"
              :key="'f' + i"
              :class="d.changed ? 'fixed' : 'unchanged'"
            >{{ d.fixed }}</span>
          </div>
        </div>

        <p class="status" :class="statusType">{{ statusText }}</p>
      </div>
    </main>

    <footer>
      <a href="https://github.com/amanoese/yukichant" target="_blank" rel="noopener">GitHub</a>
      <span class="separator">|</span>
      <a href="https://www.npmjs.com/package/yukichant" target="_blank" rel="noopener">npm</a>
    </footer>
  </div>
</template>
