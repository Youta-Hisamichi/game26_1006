// firebase deploy の直前に実行され、公開するバージョン番号を hiokoshi/version.js に書き出す。
// バージョン = 1.0.<コミット数>。コミットが増えるたびに自動で上がる（手動の更新は不要）。
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MAJOR_MINOR = '1.0';
let count = '0', sha = 'nogit';
try {
  count = execSync('git rev-list --count HEAD', { cwd: __dirname }).toString().trim();
  sha = execSync('git rev-parse --short HEAD', { cwd: __dirname }).toString().trim();
} catch (e) { console.warn('git の情報を取得できませんでした。バージョンは dev になります。'); }

const version = sha === 'nogit' ? 'dev' : `${MAJOR_MINOR}.${count}`;
const out = path.join(__dirname, '..', 'hiokoshi', 'version.js');
fs.writeFileSync(out, `window.HIOKOSHI_VERSION = ${JSON.stringify(version)};   // 自動生成（scripts/write-version.js）\nwindow.HIOKOSHI_BUILD = ${JSON.stringify(sha)};\n`);
console.log(`version.js を書き出しました: v${version} (${sha})`);
