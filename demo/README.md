# yukichant デモページ

yukichantのエンコード/デコード機能をブラウザ上で試せるデモページです。

**公開URL**: https://amanoese.github.io/yukichant/

## 技術構成

- **ビルドツール**: Vite
- **UI**: Vue 3
- **ライブラリ**: yukichant の `src/browser.js`（ブラウザ向けAPI）
- **デプロイ**: GitHub Actions → GitHub Pages

## アーキテクチャ

```
demo/
├── package.json      # デモ専用の依存管理（本体のpackage.jsonとは独立）
├── vite.config.js    # Vite設定
├── index.html        # エントリーHTML
├── main.js           # Vueエントリーポイント
├── App.vue           # メインコンポーネント
├── styles.css        # スタイル（ダークモード対応）
└── README.md         # このファイル
```

### 本体との関係

- `demo/package.json` で yukichant 本体を `"file:.."` で参照
- `import { initBrowser, createChantFromGitHub } from 'yukichant/browser'` でブラウザ向けAPIを使用
- 辞書データ（meisi.json, dousi.json）やkuromoji辞書はGitHub Rawから動的にfetch

### 初期化戦略（段階的ロード）

1. **第1段階**: `createChantFromGitHub()` でエンコード/基本デコード機能を初期化（軽量・高速）
2. **第2段階**: `initBrowser()` で誤字修正機能（kuromoji辞書 + natural TF-IDF）をバックグラウンドで初期化

第1段階が完了した時点でUIを有効化するため、kuromoji辞書（約5MB）のロード完了を待たずにエンコード機能が使えます。

## ローカル開発

```bash
# ルートディレクトリで本体の依存をインストール
npm install

# demo/ に移動してデモの依存をインストール
cd demo
npm install

# 開発サーバー起動
npm run dev
```

http://localhost:5173/yukichant/ でアクセスできます。

## ビルド

```bash
cd demo
npm run build    # demo/dist/ に出力
npm run preview  # ビルド結果をプレビュー
```

## デプロイ

`master` ブランチへのpush時に GitHub Actions（`.github/workflows/deploy-pages.yml`）が自動実行されます。

1. ルートの依存をインストール
2. `demo/` の依存をインストール
3. `demo/` をViteでビルド
4. `demo/dist/` をGitHub Pagesにデプロイ

手動デプロイも GitHub Actions の `workflow_dispatch` から実行可能です。

## チャンクサイズについて

`natural` ライブラリ（TF-IDF計算用）は約8.7MBと大きいですが、`initBrowser()` 内で動的importされるため初期ロードには影響しません。Viteのビルドで別チャンクに分離されています。
