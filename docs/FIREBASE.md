# Firebase でのリリースとオンラインランキング

- **リリース**: Firebase Hosting（`hiokoshi/` をそのまま公開）
- **ランキング**: Firestore（`scores` コレクション、1人1ドキュメントの最速タイムの記録）+ 匿名ログイン

## 1. 初回セットアップ（コンソール）

1. [Firebase コンソール](https://console.firebase.google.com/) でプロジェクトを作成
2. **Authentication → Sign-in method → 匿名** を有効化
3. **Firestore Database → データベースを作成**（本番モード）
4. **プロジェクトの設定 → マイアプリ → ウェブアプリを追加** し、表示される設定値を `hiokoshi/firebase-config.js` に貼る
5. `.firebaserc` の `YOUR_FIREBASE_PROJECT_ID` をプロジェクトIDに書き換える

## 2. デプロイ

```bash
npm i -g firebase-tools
firebase login
firebase deploy              # Hosting + Firestore ルールを一度に
# 個別に: firebase deploy --only hosting / --only firestore:rules
```

公開URLは `https://<プロジェクトID>.web.app/` です。

## 3. 仕組み

- 結果画面で匿名ログイン（uid）→ `scores/<uid>` に `{n, t, a, d, u}`（t = 着火タイム秒）を保存。自己ベストのタイムを縮めたときだけ更新
- 正確さランキングは `accuracy/<uid>`（`{n, t, a, d, u}`、正確さ `a` が上回るときだけ更新）に保存。同率はタイムが速い順
- 名前の変更は、自分のドキュメントの `n` だけを書き換える更新として許可（記録は変えられません）
- コンボランキングは `combo/<uid>`（`{n, t, a, c, d, u}`、最大コンボ `c` が上回るときだけ更新）に保存。同率はタイムが速い順
- ランキング画面は `scores` を `t` の昇順（速い順）で10件取得（単一フィールドなので追加のインデックス設定は不要）
- `firestore.rules` で、本人のドキュメントだけ、値の範囲チェックつき、タイム更新のみ、削除不可に制限

## 4. 注意

- タイムはブラウザから送るため、`firestore.rules` の範囲チェック（タイム1秒以上など）を超えない不正は防げません。厳密にするなら Cloud Functions でプレイ内容を検証する構成が必要です
- 匿名ログインはブラウザのデータを消すと別人扱いになり、ランキングに別の行として載ります
- 設定を空（`null`）のまま公開すると、オンラインランキングは出ず、「この端末」のランキングだけになります
