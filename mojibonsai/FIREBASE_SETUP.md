# みんなのランキング（Firebase Firestore）設定手順

ゲーム側の組み込みは完了しています。次の設定をして `firebase-config.js` に値を入れると有効になります。

1. https://console.firebase.google.com でプロジェクトを作成（Analytics は不要）
2. **Authentication** → 「始める」→ ログイン方法 → **匿名** を有効化
3. **Firestore Database** → 「データベースを作成」（ロケーション例: `asia-northeast1`、本番モード）
4. Firestore の **ルール** タブに `firestore.rules` の内容を貼り付けて公開
5. プロジェクトの設定 → 全般 → マイアプリ → **ウェブアプリ（</>）** を登録し、表示される `apiKey` と `projectId` を `firebase-config.js` に記入
6. （APIキーに制限をかけている場合）許可するサイトに `youta-hisamichi.github.io` を追加

## 仕組み
- 匿名ログイン（REST）でプレイヤーIDを作り、`players/{uid}` に `name / total / best / t` を保存
- 「参加する」を押した人だけが対象。ニックネームと累計点数が公開されます
- 累計の加算は「最近育てていない文字」だけ（ゲーム側の連打対策）
- ランキングは累計の降順で上位20件を表示

## 注意
クライアントだけで動く仕組みのため、ルールで上限（1回の加算 10 億点以内・減算不可）を設けていますが、改ざんを完全には防げません。遊びのランキングとしての運用を想定しています。
