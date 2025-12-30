# Magi OCRテストデータ

このディレクトリには、[Chantプロジェクト（Magi）](https://github.com/xztaityozx/Chant)から取得したOCRテストデータが含まれています。

## 出典

- プロジェクト: [xztaityozx/Chant](https://github.com/xztaityozx/Chant)
- ライセンス: MIT License
- 用途: 画像に書かれた呪文を読み取り、コマンドにデコードして実行するシステムのOCR精度測定

## データセットフォーマット

### dataset.tsv

TSV（タブ区切り）形式で、以下のカラムを持ちます：

| カラム名 | 説明 | 必須 |
|---------|------|------|
| id | テストケースID（連番） | ○ |
| ocr_result | OCRで読み取った結果（誤字を含む可能性あり） | ○ |
| expected | 正解の呪文文字列 | ○ |
| description | テストケースの説明（誤字パターンなど） | ○ |
| image_file | 元画像ファイル名（images/配下） | △ |

### サンプル

```tsv
id	ocr_result	expected	description	image_file
001	罹刹に烙印を秘術を帰ら。	羅刹に烙印を秘術を刻ら。	漢字の誤認識（罹→羅、帰→刻）	test001.png
002	魔力の源泉を解放せよ	魔力の源泉を解放せよ	正しく認識されたケース	test002.png
003	闇の契約を結び力を得る	闇の契約を結び力を得る	完全一致	test003.png
```

## images/ディレクトリ

OCR処理前の元画像ファイルを保存します（オプション）。

- ファイル名は`dataset.tsv`の`image_file`カラムと対応させてください
- 対応する画像がない場合、`image_file`カラムは空欄でも構いません

## データの追加方法

1. `dataset.tsv`に新しい行を追加
2. 必要に応じて`images/`に画像ファイルを配置
3. `id`は連番で管理（既存の最大値+1）

## 注意事項

- TSVファイルはUTF-8エンコーディングで保存してください
- タブ文字（`\t`）で区切ってください（スペースではありません）
- ヘッダー行は必須です
- 空行は無視されます

