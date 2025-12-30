# ChatGPT誤字修正ベンチマーク

## クイックスタート

```bash
# APIキーを安全に入力（bash_historyに残らない）
read -sp "OpenAI API Key: " OPENAI_API_KEY && export OPENAI_API_KEY

# ベンチマーク実行
npm run benchmark:chatgpt

# レポート生成
npm run benchmark:report
```

## 使用方法

```bash
# 基本実行（デフォルト: gpt-5-mini、50件）
npm run benchmark:chatgpt

# オプション指定
npm run benchmark:chatgpt -- --model gpt-5 --limit 10 --prompt-file my-prompt.txt
```

### 主要オプション

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| `--model` | 使用モデル（gpt-5-nano/gpt-5-mini/gpt-5） | gpt-5-mini |
| `--limit` | テスト件数 | 50 |
| `--prompt-file` | カスタムプロンプトファイル | prompt-template.txt |
| `--api-key` | APIキー（環境変数の代わり） | - |

### 推奨モデル

| モデル | 用途 | 50件実行コスト |
|--------|------|----------------|
| gpt-5-nano | 開発・デバッグ | $0.005 |
| gpt-5-mini | 本格評価 | $0.01 |
| gpt-5 | 最終評価 | $0.15 |

## プロンプトのカスタマイズ

`benchmark/scripts/prompt-template.txt` を編集するか、コピーして使用。

**変数**: `{{OCR_RESULT}}` - OCR結果に置換

**改善ポイント**:
- よくある誤認識パターンを追加（罹→羅、帰→刻など）
- Few-shot examples を増やす
- 出力形式を厳密に指定（説明不要、改行不要）

## 結果の確認

```bash
# レポート生成
npm run benchmark:report

# サマリー確認
cat benchmark/results/summary/latest_comparison.tsv

# 誤答のみ抽出
grep "false" $(ls -t benchmark/results/chatgpt/*.tsv | head -1)
```

**出力先**:
- `benchmark/results/chatgpt/{timestamp}.tsv` - 詳細結果
- `benchmark/results/summary/latest_comparison.tsv` - 全アルゴリズム比較

## トラブルシューティング

| エラー | 解決方法 |
|--------|----------|
| APIキーエラー | `export OPENAI_API_KEY="sk-..."` または `--api-key` オプション |
| レート制限（429） | `--limit 10` で件数を減らす、または有料プランにアップグレード |
| 出力形式が不正 | プロンプトに「修正後の呪文のみを1行で出力」を明記 |

## ベストプラクティス

1. **段階的評価**: 10件でテスト → 調整 → 50件で本評価
2. **コスト管理**: 開発は `gpt-5-mini --limit 10`、評価は `gpt-5 --limit 50`
3. **結果分析**: 誤答ケースを確認してプロンプトを改善

## 参考リンク

- [OpenAI API Keys](https://platform.openai.com/api-keys)
- [OpenAI Pricing](https://openai.com/pricing)
- [Prompt Engineering Best Practices](https://platform.openai.com/docs/guides/prompt-engineering)

