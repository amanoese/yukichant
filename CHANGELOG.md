## [4.1.1](https://github.com/amanoese/yukichant/compare/v4.1.0...v4.1.1) (2026-02-28)

### Bug Fixes

* GitHub Pages上で辞書ファイルのURL解決が失敗する問題を修正 ([f0f7e99](https://github.com/amanoese/yukichant/commit/f0f7e99da49d4ae661678c45e431a7505e0bdf83))

## [4.1.0](https://github.com/amanoese/yukichant/compare/v4.0.0...v4.1.0) (2026-02-28)

### Features

* GitHub Pagesデモページを追加 ([191b910](https://github.com/amanoese/yukichant/commit/191b910ce8fb0c61ba898b5f49ec66e49c36de34))
* デモページのUI改善 ([e36e204](https://github.com/amanoese/yukichant/commit/e36e204dc46680093034803834cdadaf1550ab7f))
* 誤字修正時の差分を色付き2行表示に改善 ([c96b2bb](https://github.com/amanoese/yukichant/commit/c96b2bbddc80a56b58e2210fbf85312169531fa8))

## [4.0.0](https://github.com/amanoese/yukichant/compare/v3.0.5...v4.0.0) (2026-02-28)

### ⚠ BREAKING CHANGES

* Node.js 18.x以前のサポートを廃止。
Node.js 20.x以上が必須になりました。
エントリポイントの構造が変更されています。

Made-with: Cursor
* Node.js 18.x以前はサポート対象外になります

Made-with: Cursor

### Features

* Add Jaro-Winkler algorithm support for typo correction ([4a5c9fa](https://github.com/amanoese/yukichant/commit/4a5c9faec266bdce66a9f9f5d75906ad53035a4c))
* v4.0.0リリース（破壊的変更の明示） ([598a4ad](https://github.com/amanoese/yukichant/commit/598a4ad452c7feb08405f7b7421b4dfdaa06f024))
* サポートNode.jsバージョンを20.x以上に更新 ([6615716](https://github.com/amanoese/yukichant/commit/66157167273b902276fbfdba8cde89ac2eeef9c1))

### Bug Fixes

* BREAKING CHANGEがmajorリリースになるよう修正 ([87f8b62](https://github.com/amanoese/yukichant/commit/87f8b626bcd071ae4dbfc4c6677c48ec200b4c8a))
* ci環境でcommitlintフックをスキップするように修正 ([3f7c8ee](https://github.com/amanoese/yukichant/commit/3f7c8ee56507c3251bfb9cbb2bd7ccdfc32fbf35))
* dry-run実行時の環境変数を上書きしてブランチ認識を修正 ([49760c7](https://github.com/amanoese/yukichant/commit/49760c7fee5b9b56b6c2301f2b0f6acf5195f494))
* リリースプレビューで--branches masterを指定してブランチ認識を修正 ([4ea4ee3](https://github.com/amanoese/yukichant/commit/4ea4ee3fa467e8c2d1df5fd3617436be658147df))
* リリースプレビューにnpmトークン検証を追加 ([2085fb9](https://github.com/amanoese/yukichant/commit/2085fb9cb703d6108bb4da79017b4a31f5ce7f45))
* リリースプレビューのdry-run失敗とコメント表示を修正 ([358b05d](https://github.com/amanoese/yukichant/commit/358b05df2228af59384eeb32e94c6267831046e1))
* リリースプレビューのシェル互換性を修正 ([11d8a9d](https://github.com/amanoese/yukichant/commit/11d8a9d50b1bd13039cf79cf3b1401a39d9c5970))
* リリースプレビューをmasterシミュレートで実行し、コメント差分時のみ追加する方式に変更 ([559514e](https://github.com/amanoese/yukichant/commit/559514eda5b7927a9da50dce03d4404c5b5f4786))
* リリースプレビューをコミットメッセージ直接解析方式に変更 ([2383828](https://github.com/amanoese/yukichant/commit/2383828043248252f39a4358a4f2b0a15946f1cf))

## [3.1.0](https://github.com/amanoese/yukichant/compare/v3.0.5...v3.1.0) (2026-02-28)

### ⚠ BREAKING CHANGES

* Node.js 18.x以前のサポートを廃止。
Node.js 20.x以上が必須になりました。
エントリポイントの構造が変更されています。

Made-with: Cursor
* Node.js 18.x以前はサポート対象外になります

Made-with: Cursor

### Features

* Add Jaro-Winkler algorithm support for typo correction ([4a5c9fa](https://github.com/amanoese/yukichant/commit/4a5c9faec266bdce66a9f9f5d75906ad53035a4c))
* v4.0.0リリース（破壊的変更の明示） ([598a4ad](https://github.com/amanoese/yukichant/commit/598a4ad452c7feb08405f7b7421b4dfdaa06f024))
* サポートNode.jsバージョンを20.x以上に更新 ([6615716](https://github.com/amanoese/yukichant/commit/66157167273b902276fbfdba8cde89ac2eeef9c1))

### Bug Fixes

* ci環境でcommitlintフックをスキップするように修正 ([3f7c8ee](https://github.com/amanoese/yukichant/commit/3f7c8ee56507c3251bfb9cbb2bd7ccdfc32fbf35))
* dry-run実行時の環境変数を上書きしてブランチ認識を修正 ([49760c7](https://github.com/amanoese/yukichant/commit/49760c7fee5b9b56b6c2301f2b0f6acf5195f494))
* リリースプレビューで--branches masterを指定してブランチ認識を修正 ([4ea4ee3](https://github.com/amanoese/yukichant/commit/4ea4ee3fa467e8c2d1df5fd3617436be658147df))
* リリースプレビューにnpmトークン検証を追加 ([2085fb9](https://github.com/amanoese/yukichant/commit/2085fb9cb703d6108bb4da79017b4a31f5ce7f45))
* リリースプレビューのdry-run失敗とコメント表示を修正 ([358b05d](https://github.com/amanoese/yukichant/commit/358b05df2228af59384eeb32e94c6267831046e1))
* リリースプレビューのシェル互換性を修正 ([11d8a9d](https://github.com/amanoese/yukichant/commit/11d8a9d50b1bd13039cf79cf3b1401a39d9c5970))
* リリースプレビューをmasterシミュレートで実行し、コメント差分時のみ追加する方式に変更 ([559514e](https://github.com/amanoese/yukichant/commit/559514eda5b7927a9da50dce03d4404c5b5f4786))
* リリースプレビューをコミットメッセージ直接解析方式に変更 ([2383828](https://github.com/amanoese/yukichant/commit/2383828043248252f39a4358a4f2b0a15946f1cf))

## [3.1.0](https://github.com/amanoese/yukichant/compare/v3.0.5...v3.1.0) (2026-02-28)

### ⚠ BREAKING CHANGES

* Node.js 18.x以前はサポート対象外になります

Made-with: Cursor

### Features

* Add Jaro-Winkler algorithm support for typo correction ([4a5c9fa](https://github.com/amanoese/yukichant/commit/4a5c9faec266bdce66a9f9f5d75906ad53035a4c))
* サポートNode.jsバージョンを20.x以上に更新 ([6615716](https://github.com/amanoese/yukichant/commit/66157167273b902276fbfdba8cde89ac2eeef9c1))

### Bug Fixes

* ci環境でcommitlintフックをスキップするように修正 ([3f7c8ee](https://github.com/amanoese/yukichant/commit/3f7c8ee56507c3251bfb9cbb2bd7ccdfc32fbf35))
* dry-run実行時の環境変数を上書きしてブランチ認識を修正 ([49760c7](https://github.com/amanoese/yukichant/commit/49760c7fee5b9b56b6c2301f2b0f6acf5195f494))
* リリースプレビューで--branches masterを指定してブランチ認識を修正 ([4ea4ee3](https://github.com/amanoese/yukichant/commit/4ea4ee3fa467e8c2d1df5fd3617436be658147df))
* リリースプレビューにnpmトークン検証を追加 ([2085fb9](https://github.com/amanoese/yukichant/commit/2085fb9cb703d6108bb4da79017b4a31f5ce7f45))
* リリースプレビューのdry-run失敗とコメント表示を修正 ([358b05d](https://github.com/amanoese/yukichant/commit/358b05df2228af59384eeb32e94c6267831046e1))
* リリースプレビューのシェル互換性を修正 ([11d8a9d](https://github.com/amanoese/yukichant/commit/11d8a9d50b1bd13039cf79cf3b1401a39d9c5970))
* リリースプレビューをmasterシミュレートで実行し、コメント差分時のみ追加する方式に変更 ([559514e](https://github.com/amanoese/yukichant/commit/559514eda5b7927a9da50dce03d4404c5b5f4786))
* リリースプレビューをコミットメッセージ直接解析方式に変更 ([2383828](https://github.com/amanoese/yukichant/commit/2383828043248252f39a4358a4f2b0a15946f1cf))
