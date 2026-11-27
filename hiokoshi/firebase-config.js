// Firebase コンソールの「プロジェクトの設定 → マイアプリ（ウェブ）」にある設定を貼ります。
// これは公開しても問題ない設定値です（守るのは firestore.rules の役目）。
// null のままなら、オンラインランキングは使わず「この端末」のランキングだけになります。
window.HIOKOSHI_FIREBASE = null;
/* 例:
window.HIOKOSHI_FIREBASE = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  appId: "1:1234567890:web:abcdef"
};
*/
