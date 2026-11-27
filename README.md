# 5Round - The treasure of kings -（ブラウザ版・試作）

ボードゲーム「5Round」のブラウザ版モックです。5ターン × 5ラウンドで、前列2枚のユニットを動かして相手と戦います。

## 遊ぶ

ビルド不要です。`index.html` をブラウザで開くだけで動きます。

```bash
# サーバー経由で開きたい場合
python3 -m http.server 8000
# → http://localhost:8000/
```

## 構成

```
index.html        画面の入口
css/style.css     見た目
js/data.js        カード47枚・デッキ・ルール定数
js/engine.js      ゲームルール（画面に依存しない）
js/ai.js          相手AI・おまかせ
js/ui.js          画面・入力・演出
assets/           カード画像（card/=原寸、thumb/=盤面用の軽量版）
tests/sim.js      AI同士の対戦で不変条件を検査
docs/             次の作業メモ・カードテキスト転記
legacy/           元の R5.html / Vars.js（参考用）
```

## テスト

```bash
node tests/sim.js 600   # AI同士を600戦（Node 18+）
```

## 次にやること

[`docs/NEXT_STEPS.md`](docs/NEXT_STEPS.md) を参照してください（カードの技・特性の未実装部分、ルールの確認事項、優先順位をまとめています）。

## 火おこしRTA（別ゲーム）

`hiokoshi/index.html` を開くだけで遊べる、木の棒で火をおこすタイムアタックです（単一ファイル）。画面を右下⇄左下へ交互にドラッグして棒をこすり、煙→火種→着火までのタイム（速いほど上位）を競います。ランキングは端末内（localStorage）とオンライン（Firebase 等）で、結果画面から画像つきでシェアできます。

Firebase でのリリースとオンラインランキングの手順は [`docs/FIREBASE.md`](docs/FIREBASE.md) を参照。
