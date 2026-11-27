(() => {
'use strict';

/* ============================================================
   定数・データ
============================================================ */
const TAU = Math.PI * 2;
const $ = (s) => document.querySelector(s);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (n) => Math.round(n).toLocaleString('ja-JP');
const rand = (a, b) => a + Math.random() * (b - a);

const COOL_MS = 10 * 60 * 1000;     // 一度出た「クセ付き恐竜」が眠る時間
const SAVE_KEY = 'dino-horihori:v1';
const MUTE_KEY = 'dino-horihori:mute';

const RARITY = {
  N:   { score: 10,   w: 35,  boost: 2,   rumble: 350,  amp: 1,   color: '#a3adbd', order: 0 },
  R:   { score: 150,  w: 11.7, boost: 12,   rumble: 650,  amp: 2,   color: '#4cc38a', order: 1 },
  SR:  { score: 600,  w: 3.23, boost: 40,  rumble: 1100, amp: 3.5, color: '#4da3ff', order: 2 },
  SSR: { score: 3000, w: 1.02, boost: 120, rumble: 1700, amp: 5,   color: '#b86bff', order: 3 },
  UR:  { score: 15000, w: 0.24, boost: 500, rumble: 2400, amp: 7,   color: '#ffd36b', order: 4 },
};
const stars = (r) => '★'.repeat(RARITY[r].order + 1) + '☆'.repeat(4 - RARITY[r].order);
const RARITY_KEYS = ['UR', 'SSR', 'SR', 'R', 'N'];

const STYLE_HINT = {
  cw: '時計まわりにぐるぐる', ccw: '反時計まわりにぐるぐる', vert: '縦にゴシゴシ', horiz: '横にゴシゴシ',
  slow: 'ゆっくり丁寧に', fast: 'すばやく', tap: 'こまめに指を離しながら', cross: '縦と横をまぜて',
};
const STYLE_SHORT = {
  cw: '時計まわり', ccw: '反時計まわり', vert: '縦ゴシゴシ', horiz: '横ゴシゴシ',
  slow: 'ゆっくり', fast: 'スピード', tap: 'こまめ', cross: '縦横ミックス',
};

// shape: brilliant | emerald | round | oval | drop | heart | star | cab
const GEMS = [
  { id: 'quartz', name: '恐竜の名前の意味', emoji: '📖', img: '', cap: '「恐ろしいトカゲ」という意味。',         r: 'N', shape: 'round',   c: ['#f6f8fc', '#cfd6e6', '#8e99b3'], styles: [], w: 55 },
  { id: 'obsidian', name: '羽毛のある恐竜', emoji: '🪶', img: '', cap: 'ふわふわだった恐竜は多い。',       r: 'N', shape: 'drop',    c: ['#7a7e92', '#2c2e3c', '#0c0d14'], styles: [], w: 55 },
  { id: 'agate', name: 'カムプトサウルス', emoji: '🦖', img: '', cap: '二足歩行もできる草食竜。',         r: 'N', shape: 'cab',     c: ['#f3d9b1', '#c98f5a', '#7a4a2c'], styles: ['horiz'], deco: 'bands' },
  { id: 'fluorite', name: 'ヒプシロフォドン', emoji: '🦖', img: '', cap: 'ちょこちょこ走る小型竜。',         r: 'N', shape: 'emerald', c: ['#e0d4ff', '#8fd0c4', '#6a4fb0'], styles: ['slow'] },
  { id: 'garnet', name: 'トリケラトプス', emoji: '🦖', img: '', cap: '3本の角で突進。',   r: 'R', shape: 'brilliant', c: ['#ff9aa8', '#c4162f', '#6a0716'], styles: ['cw'] },
  { id: 'lapis', name: 'ステゴサウルス', emoji: '🦖', img: '', cap: '背中の板がトレードマーク。', r: 'R', shape: 'cab',     c: ['#6b8cf0', '#1f3a9e', '#0c1a5e'], styles: ['ccw'], deco: 'gold' },
  { id: 'peridot', name: 'ブラキオサウルス', emoji: '🦕', img: '', cap: '首が長すぎて縦長。',   r: 'R', shape: 'round',   c: ['#eaff96', '#a8d62c', '#5e8c10'], styles: ['vert'] },
  { id: 'citrine', name: 'アンキロサウルス', emoji: '🦖', img: '', cap: 'よろいとしっぽのハンマー。',     r: 'R', shape: 'emerald', c: ['#fff0a0', '#f7b92a', '#b36d08'], styles: ['horiz'] },
  { id: 'amethyst', name: 'アパトサウルス', emoji: '🦕', img: '', cap: 'のっしのっし歩く。',   r: 'R', shape: 'oval',    c: ['#ebd2ff', '#a15de0', '#55208f'], styles: ['slow'] },
  { id: 'rosequartz', name: 'プロトケラトプス', emoji: '🦖', img: '', cap: '砂漠で化石がたくさん見つかる。', r: 'R', shape: 'heart', c: ['#ffe6f0', '#ffa6c4', '#d9608f'], styles: ['tap'] },
  { id: 'moonstone', name: 'ヴェロキラプトル', emoji: '🦖', img: '', cap: '意外と小さいが素早い。', r: 'R', shape: 'cab',  c: ['#ffffff', '#cfe4ff', '#93b0e0'], styles: ['fast'], deco: 'sheen' },
  { id: 'ruby', name: 'ティラノサウルス', emoji: '🦖', img: '', cap: '王者。でも腕は短い。',       r: 'SR', shape: 'emerald', c: ['#ff7f95', '#e0112f', '#7d0016'], styles: ['cw'] },
  { id: 'sapphire', name: 'スピノサウルス', emoji: '🦖', img: '', cap: '巨大な背びれの魚食い。',   r: 'SR', shape: 'brilliant', c: ['#8fc4ff', '#1f63e0', '#0a2a85'], styles: ['ccw'] },
  { id: 'emerald', name: 'ディプロドクス', emoji: '🦕', img: '', cap: '首も尻尾も長すぎる。',   r: 'SR', shape: 'emerald', c: ['#9dffc9', '#14b36a', '#05603a'], styles: ['vert'] },
  { id: 'topaz', name: 'イグアノドン', emoji: '🦖', img: '', cap: '親指のスパイクが武器。', r: 'SR', shape: 'drop', c: ['#ffe2a0', '#ff9d2e', '#b3500a'], styles: ['horiz'] },
  { id: 'tanzanite', name: 'アルゼンチノサウルス', emoji: '🦕', img: '', cap: '史上最大級。のそのそ歩く。', r: 'SR', shape: 'oval',  c: ['#cfc2ff', '#5a45d6', '#241a7a'], styles: ['slow'] },
  { id: 'pinktour', name: 'オヴィラプトル', emoji: '🥚', img: '', cap: '卵を抱いて温める恐竜。', r: 'SR', shape: 'drop', c: ['#ffc4e1', '#ff5fa6', '#a31a63'], styles: ['tap'] },
  { id: 'aquamarine', name: 'ディノニクス', emoji: '🦖', img: '', cap: 'かぎ爪の狩人。', r: 'SR', shape: 'emerald', c: ['#d6fbff', '#6fdcf0', '#1a8fb0'], styles: ['fast'] },
  { id: 'diamond', name: 'ユタラプトル', emoji: '🦖', img: '', cap: '最大級のラプトル。', r: 'SSR', shape: 'brilliant', c: ['#ffffff', '#dff3ff', '#9bc9ee'], styles: ['fast'] },
  { id: 'alexandrite', name: 'ギガノトサウルス', emoji: '🦖', img: '', cap: 'ティラノより大きい説。', r: 'SSR', shape: 'oval', c: ['#7ef0c5', '#4f7de0', '#b53cc4'], grad: ['#8ff7cf', '#4f9ae0', '#b53cc4', '#e03a5a'], styles: ['slow'] },
  { id: 'pigeon', name: 'カルカロドントサウルス', emoji: '🦖', img: '', cap: 'ホホジロザメみたいな歯。', r: 'SSR', shape: 'emerald', c: ['#ff6a82', '#c40a28', '#58000f'], styles: ['cw'] },
  { id: 'kashmir', name: 'アロサウルス', emoji: '🦖', img: '', cap: 'ジュラ紀の最強ハンター。', r: 'SSR', shape: 'round', c: ['#86b0ff', '#1741c9', '#071a6b'], styles: ['ccw'] },
  { id: 'demantoid', name: 'スーパーサウルス', emoji: '🦕', img: '', cap: '首が超ロング。', r: 'SSR', shape: 'brilliant', c: ['#d4ff8a', '#3cc226', '#0a6a12'], styles: ['vert'] },
  { id: 'heliodor', name: 'デイノケイルス', emoji: '🦖', img: '', cap: '腕だけ見つかり続けた謎の竜。', r: 'SSR', shape: 'emerald', c: ['#fffbb8', '#ffd400', '#c28a00'], styles: ['horiz'] },
  { id: 'padparadscha', name: 'ティタノサウルス', emoji: '🦕', img: '', cap: '卵の巣ごと大発見。', r: 'SSR', shape: 'drop', c: ['#ffd8b8', '#ff7f6e', '#e0447c'], styles: ['tap'] },
  { id: 'opal', name: 'ティラノサウルス・レックス', emoji: '🦖', img: '', cap: '王の中の王。全身骨格を発掘！', r: 'UR', shape: 'cab', c: ['#ffffff', '#9fd8ff', '#c47aff'], grad: ['#ff9ad0', '#ffe27a', '#7affc8', '#7ab8ff', '#c47aff'], deco: 'rainbow', styles: ['cw', 'ccw'] },
  { id: 'sage', name: 'ブルハトカヤサウルス', emoji: '🦕', img: '', cap: '史上最大かもしれない巨竜。',     r: 'UR', shape: 'star', c: ['#fff2a8', '#ff5a3c', '#8a0a2a'], styles: ['cross'] },
  { id: 'stardust', name: 'パタゴティタン', emoji: '🦕', img: '', cap: 'ゆっくり歩く超巨大竜。',       r: 'UR', shape: 'star', c: ['#ffffff', '#9fd8ff', '#6a5cff'], styles: ['slow', 'tap'] },
  { id: 'm_pien', name: 'ジュラ紀の名前の由来', emoji: '🏔️', img: '', cap: 'スイスのジュラ山脈が由来。', r: 'N', shape: 'round', c: ['#f0f2f8', '#b8c0d4', '#6c7690'], styles: [], w: 55 },
  { id: 'm_natsu', name: '恐竜の卵の殻', emoji: '🥚', img: '', cap: '意外と薄くて割れやすい。', r: 'N', shape: 'round', c: ['#f0f2f8', '#b8c0d4', '#6c7690'], styles: [], w: 55 },
  { id: 'm_paw', name: 'ヘテロドントサウルス', emoji: '🦖', img: '', cap: '牙みたいな歯がある小型竜。', r: 'N', shape: 'round', c: ['#b9f5c9', '#2eb86a', '#0a6a3a'], styles: ["'vert'"] },
  { id: 'm_dash', name: 'ガリミムス', emoji: '🦖', img: '', cap: 'ダチョウ型。時速60kmで走る。', r: 'N', shape: 'round', c: ['#ffffff', '#cfe9ff', '#8fb0d8'], styles: ["'fast'"] },
  { id: 'm_dog', name: '琥珀の中の蚊', emoji: '🦟', img: '', cap: '映画の名シーンの発想の元。', r: 'R', shape: 'round', c: ['#ff9aa8', '#c4162f', '#6a0716'], styles: ["'cw'"] },
  { id: 'm_robo', name: '恐竜のDNA', emoji: '🧬', img: '', cap: '実際には残らないと言われる。', r: 'R', shape: 'round', c: ['#8fc4ff', '#1f63e0', '#0a2a85'], styles: ["'ccw'"] },
  { id: 'm_crab', name: 'コップの水の波紋', emoji: '💧', img: '', cap: '足音が近づく名シーン。', r: 'R', shape: 'round', c: ['#fff0a0', '#f7b92a', '#b36d08'], styles: ["'horiz'"] },
  { id: 'm_elev', name: 'カマラサウルス', emoji: '🦕', img: '', cap: '首がぐいっと縦に伸びる。', r: 'R', shape: 'round', c: ['#b9f5c9', '#2eb86a', '#0a6a3a'], styles: ["'vert'"] },
  { id: 'm_deli', name: '最古級の恐竜化石', emoji: '🦴', img: '', cap: '約2億3000万年前の地層から。', r: 'R', shape: 'round', c: ['#ffffff', '#cfe9ff', '#8fb0d8'], styles: ["'fast'"] },
  { id: 'm_coffee', name: 'ティラノの視力', emoji: '👁️', img: '', cap: 'かなり目がよかった説。', r: 'SR', shape: 'round', c: ['#ff9aa8', '#c4162f', '#6a0716'], styles: ["'cw'"] },
  { id: 'm_slot', name: 'ティラノの咬合力', emoji: '🦷', img: '', cap: 'ワニの数倍の噛む力。', r: 'SR', shape: 'round', c: ['#8fc4ff', '#1f63e0', '#0a2a85'], styles: ["'ccw'"] },
  { id: 'm_hero', name: '恐竜テーマパークの島', emoji: '🏝️', img: '', cap: '島のパークは安全…とは限らない。', r: 'SR', shape: 'round', c: ['#fff0a0', '#f7b92a', '#b36d08'], styles: ["'horiz'"] },
  { id: 'm_enter', name: 'ステゴサウルスの小さな脳', emoji: '🧠', img: '', cap: '脳はクルミ大と言われる。', r: 'SR', shape: 'round', c: ['#ffd0e4', '#ff7fb0', '#c0306f'], styles: ["'tap'"] },
  { id: 'm_nap', name: 'ブラキオの高血圧', emoji: '❤️', img: '', cap: '首が長すぎて血を送るのが大変。', r: 'SR', shape: 'round', c: ['#e0c8ff', '#9a5de0', '#4a1f8f'], styles: ["'slow'"] },
  { id: 'm_loop', name: '鳥は恐竜の子孫', emoji: '🐔', img: '', cap: 'ニワトリは今も生きる恐竜の親戚。', r: 'SSR', shape: 'round', c: ['#ff9aa8', '#c4162f', '#6a0716'], styles: ["'cw'"] },
  { id: 'm_time', name: '6600万年前の隕石衝突', emoji: '☄️', img: '', cap: '恐竜絶滅のきっかけと言われる。', r: 'SSR', shape: 'round', c: ['#8fc4ff', '#1f63e0', '#0a2a85'], styles: ["'ccw'"] },
  { id: 'm_ladder', name: '恐竜はゆっくり消えた', emoji: '⏳', img: '', cap: '絶滅には長い時間がかかった。', r: 'SSR', shape: 'round', c: ['#b9f5c9', '#2eb86a', '#0a6a3a'], styles: ["'vert'"] },
  { id: 'm_monkey', name: '実物大ヴェロキラプトル', emoji: '🦃', img: '', cap: '映画より七面鳥くらいの大きさ。', r: 'SSR', shape: 'round', c: ['#ffffff', '#cfe9ff', '#8fb0d8'], styles: ["'fast'"] },
  { id: 'm_trend', name: 'トロオドン', emoji: '🦖', img: '', cap: '頭がいいと言われる恐竜。', r: 'UR', shape: 'round', c: ['#ffffff', '#cfe9ff', '#8fb0d8'], styles: ["'fast'", "'tap'"] },
  { id: 'm_zen', name: 'ドレッドノータス', emoji: '🦕', img: '', cap: '「何も恐れない」名前の巨竜。', r: 'UR', shape: 'round', c: ['#e0c8ff', '#9a5de0', '#4a1f8f'], styles: ["'slow'", "'cw'"] },
  { id: 'm_chicken', name: 'ニワトリティラノ', emoji: '🐔', img: '', cap: 'ニワトリを恐竜に戻す研究は実在する。', r: 'SR', shape: 'round', c: ['#ffe0b0', '#ff9a4a', '#b3501a'], styles: ['tap'] },
];
const GEM_BY_ID = Object.fromEntries(GEMS.map((g) => [g.id, g]));

function hintFor(g) {
  if (!g.styles.length) return 'どんな掘り方でも出会える、ふつうの恐竜ネタ。';
  return g.styles.map((k) => STYLE_HINT[k]).join(' ＋ ') + '掘ると出やすい';
}

/* ============================================================
   掘り方の解析（純粋関数）
   points: [{x,y,t,s}]  x,y は水晶玉の半径を1とした座標、t はms、s はストローク番号
============================================================ */
const SAMPLE_STEP = 0.1;   // 解析用に間引く距離（半径=1）
const CH_LEN = 1.8;        // 円運動を判定する区間の長さ

function analyzeStyle(pts) {
  const scores = { cw: 0, ccw: 0, vert: 0, horiz: 0, slow: 0, fast: 0, tap: 0, cross: 0 };
  const info = { total: 0, speed: 0, strokes: 0 };
  if (!pts || pts.length < 6) return { scores, info };

  let total = 0, vLen = 0, hLen = 0, active = 0, cwLen = 0, ccwLen = 0;
  const strokes = new Set();
  let prev = null, prevAng = null;
  let ch = { len: 0, net: 0, abs: 0 };

  for (const p of pts) {
    strokes.add(p.s);
    if (!prev || prev.s !== p.s) { prev = p; prevAng = null; ch = { len: 0, net: 0, abs: 0 }; continue; }
    const dx = p.x - prev.x, dy = p.y - prev.y, len = Math.hypot(dx, dy), dt = p.t - prev.t;
    if (len < 1e-6) { prev = p; continue; }
    total += len;
    if (dt < 300) active += dt;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (ay > ax * 2.47) vLen += len; else if (ax > ay * 2.47) hLen += len;
    const ang = Math.atan2(dy, dx);
    if (prevAng !== null) {
      let d = ang - prevAng;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      d = clamp(d, -0.8, 0.8);
      ch.net += d; ch.abs += Math.abs(d);   // 画面はy下向きなので正が時計まわり
    }
    ch.len += len; prevAng = ang; prev = p;
    if (ch.len >= CH_LEN) {
      if (Math.abs(ch.net) > 2 && Math.abs(ch.net) / (ch.abs || 1) > 0.6) {
        if (ch.net > 0) cwLen += ch.len; else ccwLen += ch.len;
      }
      ch = { len: 0, net: 0, abs: 0 };
    }
  }
  info.total = total; info.strokes = strokes.size;
  if (total < 2) return { scores, info };

  const v = active > 0 ? total / (active / 1000) : 0;   // 半径/秒
  info.speed = v;
  const vf = vLen / total, hf = hLen / total;
  scores.cw = clamp(cwLen / total / 0.4);
  scores.ccw = clamp(ccwLen / total / 0.4);
  scores.vert = clamp((vf - 0.4) / 0.3);
  scores.horiz = clamp((hf - 0.4) / 0.3);
  scores.cross = clamp((Math.min(vf, hf) - 0.27) / 0.13);
  scores.slow = clamp((3 - v) / 1.5);
  scores.fast = clamp((v - 4.5) / 3.5);
  const n = strokes.size;
  scores.tap = clamp((n - 5) / 6) * (total / n < 1.2 ? 1 : 0.4);
  return { scores, info };
}

function matchOf(g, s) {
  if (!g.styles.length) return 0;
  return Math.min(...g.styles.map((k) => s[k] || 0));
}

// 各恐竜の出やすさ。クセ付き恐竜は、出た後10分は重み0
function gemWeights(scores, now, cool) {
  return GEMS.map((g) => {
    const R = RARITY[g.r];
    if (g.styles.length && (cool[g.id] || 0) > now) return 0;
    const base = g.w != null ? g.w : R.w;
    const boost = g.styles.length ? R.boost * Math.pow(matchOf(g, scores), 1.4) : 0;
    return base * (1 + boost);
  });
}
function probOf(gem, scores, cool = save.cool) {
  const ws = gemWeights(scores, Date.now(), cool), sum = ws.reduce((a, b) => a + b, 0);
  return ws[GEMS.indexOf(gem)] / sum;
}
const fmtPct = (p) => { const v = p * 100; return (v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v.toFixed(2)) + '%'; };
function baseRates() {
  const zero = { cw: 0, ccw: 0, vert: 0, horiz: 0, slow: 0, fast: 0, tap: 0, cross: 0 };
  const ws = gemWeights(zero, 0, {}), sum = ws.reduce((a, b) => a + b, 0), out = {};
  GEMS.forEach((g, i) => { out[g.r] = (out[g.r] || 0) + ws[i] / sum; });
  return out;
}
function pickGem(scores, now, cool, rnd = Math.random) {
  const ws = gemWeights(scores, now, cool);
  let sum = ws.reduce((a, b) => a + b, 0);
  let x = rnd() * sum;
  for (let i = 0; i < GEMS.length; i++) { x -= ws[i]; if (x < 0) return GEMS[i]; }
  return GEMS[0];
}

/* ============================================================
   恐竜SVG
============================================================ */
let svgUid = 0;
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ptsStr = (a) => a.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
const polar = (cx, cy, rx, ry, deg) => { const a = deg * Math.PI / 180; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; };
const shadeAt = (deg) => Math.cos((deg + 130) * Math.PI / 180) * 0.6;   // 左上から光
const facetEl = (poly, s) => s >= 0
  ? `<polygon points="${ptsStr(poly)}" fill="#fff" fill-opacity="${(s * 0.65).toFixed(2)}" stroke="#fff" stroke-opacity=".38" stroke-width=".6" stroke-linejoin="round"/>`
  : `<polygon points="${ptsStr(poly)}" fill="#000" fill-opacity="${(-s * 0.6).toFixed(2)}" stroke="#fff" stroke-opacity=".25" stroke-width=".6" stroke-linejoin="round"/>`;

function gemSVG(g) {
  const id = 'g' + (++svgUid), stops = g.grad || g.c, seal = g.r === 'SSR' || g.r === 'UR';
  const grad = `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">${stops.map((c, i) => `<stop offset="${(i / (stops.length - 1) * 100).toFixed(0)}%" stop-color="${c}"/>`).join('')}</linearGradient>`;
  let shape;
  if (seal) {
    const o = [];
    for (let i = 0; i < 32; i++) o.push(polar(50, 50, i % 2 ? 41 : 47, i % 2 ? 41 : 47, i * 11.25));
    shape = `<polygon points="${ptsStr(o)}" fill="url(#${id})" stroke="#fff" stroke-opacity=".7" stroke-width="1.2" stroke-linejoin="round"/>`;
  } else shape = `<circle cx="50" cy="50" r="44" fill="url(#${id})" stroke="#fff" stroke-opacity=".6" stroke-width="1.2"/>`;
  const sp = seal ? `<path d="M80 12 L82 20 L90 22 L82 24 L80 32 L78 24 L70 22 L78 20 Z" fill="#fff" fill-opacity=".95"/>` : '';
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>${grad}</defs>${shape}`
    + `<circle cx="50" cy="50" r="34" fill="#fff" fill-opacity=".28" stroke="#fff" stroke-opacity=".55" stroke-width=".8"/>`
    + (g.img ? `<image href="${g.img}" x="17" y="17" width="66" height="66" preserveAspectRatio="xMidYMid meet"/>`
      : `<text x="50" y="52" text-anchor="middle" dominant-baseline="central" font-size="40" font-family="'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif">${g.emoji}</text>`)
    + `<ellipse cx="34" cy="26" rx="14" ry="6" fill="#fff" fill-opacity=".45" transform="rotate(-28 34 26)"/>${sp}</svg>`;
}
const rand2 = (rnd, a, b) => (a + rnd() * (b - a)).toFixed(1);


/* ============================================================
   水晶のかたち（0〜100の座標の多角形）
============================================================ */
function resamplePoly(p, n) {
  const m = p.length, cum = [0];
  for (let i = 0; i < m; i++) { const a = p[i], b = p[(i + 1) % m]; cum.push(cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const tot = cum[m], out = []; let j = 0;
  for (let k = 0; k < n; k++) {
    const d = tot * k / n; while (cum[j + 1] < d) j++;
    const a = p[j], b = p[(j + 1) % m], t = (d - cum[j]) / ((cum[j + 1] - cum[j]) || 1);
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}
function smoothPoly(p, k, it) {
  let cur = p; const n = p.length;
  for (let t = 0; t < it; t++) cur = cur.map((_, i) => { let x = 0, y = 0; for (let d = -k; d <= k; d++) { const q = cur[(i + d + n) % n]; x += q[0]; y += q[1]; } return [x / (2 * k + 1), y / (2 * k + 1)]; });
  return cur;
}
function fitPoly(p) {
  const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const s = 98 / Math.max(x1 - x0, y1 - y0), ox = 50 - (x0 + x1) / 2 * s, oy = 50 - (y0 + y1) / 2 * s;
  return p.map((q) => [q[0] * s + ox, q[1] * s + oy]);
}
const param = (f, n = 360) => Array.from({ length: n }, (_, i) => f(i / n * TAU));
const SHAPES = [
  { id: 'round', name: 'まん丸', w: 3, gen: () => param((t) => [Math.cos(t), Math.sin(t)]) },
  { id: 'egg', name: 'たまご', w: 2, gen: () => param((t) => [.85 * Math.cos(t) * (1 + .2 * Math.sin(t)), Math.sin(t)]) },
  { id: 'heart', name: 'ハート', w: 2, gen: () => param((t) => [16 * Math.pow(Math.sin(t), 3), -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]) },
  { id: 'star', name: '星', w: 2, gen: () => smoothPoly(resamplePoly(Array.from({ length: 10 }, (_, i) => { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 24 : 50; return [Math.cos(a) * r, Math.sin(a) * r]; }), 360), 4, 2) },
  { id: 'drop', name: 'しずく', w: 2, gen: () => param((t) => [Math.sin(t) * Math.sin(t / 2), -Math.cos(t)]) },
  { id: 'hex', name: '六角', w: 2, gen: () => smoothPoly(resamplePoly(Array.from({ length: 6 }, (_, i) => { const a = i * Math.PI / 3; return [Math.cos(a) * 50, Math.sin(a) * 50]; }), 360), 9, 2) },
  { id: 'diamond', name: 'ひし形', w: 2, gen: () => smoothPoly(resamplePoly([[50, 0], [88, 50], [50, 100], [12, 50]], 360), 7, 2) },
  { id: 'tri', name: '三角', w: 1, gen: () => smoothPoly(resamplePoly([[50, 6], [96, 88], [4, 88]], 360), 14, 2) },
  { id: 'flower', name: 'お花', w: 2, gen: () => param((t) => { const r = .76 + .24 * Math.cos(6 * t); return [Math.cos(t) * r, Math.sin(t) * r]; }) },
  { id: 'cube', name: 'まる四角', w: 2, gen: () => param((t) => { const c = Math.cos(t), s = Math.sin(t); return [Math.sign(c) * Math.pow(Math.abs(c), .5), Math.sign(s) * Math.pow(Math.abs(s), .5)]; }) },
].map((s) => ({ ...s, pts: resamplePoly(fitPoly(s.gen()), 120) }));
function pickShape(prevId) {
  const list = SHAPES.filter((s) => s.id !== prevId), sum = list.reduce((a, s) => a + s.w, 0);
  let x = Math.random() * sum; for (const s of list) { x -= s.w; if (x < 0) return s; }
  return list[0];
}
function inPoly(x, y, p) {
  let ins = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    if ((p[i][1] > y) !== (p[j][1] > y) && x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) ins = !ins;
  }
  return ins;
}

/* ============================================================
   セーブ
============================================================ */
let save = { total: 0, polished: 0, counts: {}, cool: {}, last: null };
function loadSave() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (raw && typeof raw === 'object') save = Object.assign(save, raw);
  } catch (e) { /* 無視 */ }
}
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* 無視 */ } }
const ownedCount = () => GEMS.filter((g) => save.counts[g.id] > 0).length;

/* ============================================================
   サウンド
============================================================ */
let actx = null, muted = false;
try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { /* 無視 */ }
function ensureAudio() {
  if (muted) return null;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
  } catch (e) { actx = null; }
  return actx;
}
function tone(freq, t0, dur, type = 'sine', vol = 0.07) {
  const a = ensureAudio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq;
  const t = a.currentTime + t0;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + dur + 0.05);
}
function chime(order) {
  const scale = [523.25, 587.33, 659.25, 783.99, 880, 987.77, 1174.66, 1318.5];
  const n = 2 + order * 2;
  for (let i = 0; i < n; i++) tone(scale[Math.min(i, scale.length - 1)] * (order >= 3 ? 1 : 1), i * 0.09, 0.5, order >= 3 ? 'triangle' : 'sine', 0.06);
  if (order >= 2) tone(261.63, 0, 0.9, 'triangle', 0.05);
}
let strikeN = 0, lastStrike = 0;
function pok() {
  const a = ensureAudio(); if (!a) return;
  const t = a.currentTime, f = (strikeN % 2 ? 430 : 310) * rand(.96, 1.04);
  const o = a.createOscillator(), g = a.createGain();
  o.type = 'triangle'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * .42, t + .08);
  g.gain.setValueAtTime(.16, t); g.gain.exponentialRampToValueAtTime(.001, t + .1);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + .11);
  const c = a.createOscillator(), cg = a.createGain();
  c.type = 'square'; c.frequency.setValueAtTime(1100, t); c.frequency.exponentialRampToValueAtTime(260, t + .025);
  cg.gain.setValueAtTime(.05, t); cg.gain.exponentialRampToValueAtTime(.001, t + .03);
  c.connect(cg).connect(a.destination); c.start(t); c.stop(t + .035);
}
let lastSqueak = 0;
function squeak() {
  const now = performance.now();
  if (now - lastSqueak < 110) return; lastSqueak = now;
  tone(rand(130, 240), 0, 0.05, 'square', 0.025);
}

/* ============================================================
   画面まわり
============================================================ */
const el = {
  stage: $('#stage'), ball: $('#ball'), inner: $('#ballInner'), core: $('#core'), slot: $('#gemSlot'), rays: $('#rays'),
  mud: $('#mud'), shape: $('#shape'), rim: $('#rimPoly'), tease: $('#tease'), fx: $('#fx'), prompt: $('#prompt'), flash: $('#flash'),
  hud: $('#hud'), msg: $('#msg'), bar: $('#bar'), result: $('#result'),
  rBadge: $('#rBadge'), rName: $('#rName'), rNew: $('#rNew'), rScore: $('#rScore'), rStyle: $('#rStyle'),
  next: $('#nextBtn'), total: $('#total'), dex: $('#dexCount'), pol: $('#polishCount'), codex: $('#codex'),
  toast: $('#toast'),
};
const mctx = el.mud.getContext('2d');

let L = 300;               // 泥キャンバスの論理サイズ(px)
let brushR = 26;
let state = 'polish';      // polish | reveal | result
let locked = null, lockedProb = 0, shineTimer = 0;
let pts = [], strokeId = 0, lastP = null, lastS = null, down = false;

function paintMud() {
  const c = mctx, rnd = Math.random;
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, L, L);
  c.save(); c.beginPath(); curShape.pts.forEach((q, i) => c[i ? 'lineTo' : 'moveTo'](q[0] / 100 * L, q[1] / 100 * L)); c.closePath(); c.clip();
  const g = c.createRadialGradient(L * .38, L * .3, L * .05, L / 2, L / 2, L * .65);
  g.addColorStop(0, '#9b9485'); g.addColorStop(.55, '#6f695d'); g.addColorStop(1, '#403c35');
  c.fillStyle = g; c.fillRect(0, 0, L, L);
  // 地層のしま
  for (let i = 0; i < 9; i++) {
    const y0 = L * (i / 9) + rnd() * L * .05, amp = L * (.01 + rnd() * .025), ph = rnd() * 6;
    c.fillStyle = i % 2 ? `rgba(150,110,70,${.12 + rnd() * .12})` : `rgba(30,26,20,${.1 + rnd() * .12})`;
    c.beginPath(); c.moveTo(0, y0);
    for (let x = 0; x <= L; x += 8) c.lineTo(x, y0 + Math.sin(x / L * 7 + ph) * amp);
    for (let x = L; x >= 0; x -= 8) c.lineTo(x, y0 + L * (.04 + rnd() * .01) + Math.sin(x / L * 5 + ph) * amp);
    c.closePath(); c.fill();
  }
  for (let i = 0; i < 200; i++) {
    const r = L * (.01 + rnd() * .05), dark = rnd() < .5;
    c.fillStyle = dark ? `rgba(25,22,18,${.1 + rnd() * .2})` : `rgba(215,200,170,${.06 + rnd() * .12})`;
    c.beginPath(); c.ellipse(rnd() * L, rnd() * L, r, r * (.5 + rnd() * .6), rnd() * TAU, 0, TAU); c.fill();
  }
  c.strokeStyle = 'rgba(20,16,12,.65)'; c.lineWidth = 1.4; c.lineCap = 'round'; c.lineJoin = 'round';
  for (let i = 0; i < 22; i++) {
    let x = rnd() * L, y = rnd() * L; c.beginPath(); c.moveTo(x, y);
    for (let k = 0; k < 7; k++) { x += (rnd() - .5) * L * .16; y += (rnd() - .35) * L * .1; c.lineTo(x, y); }
    c.stroke();
  }
  for (let i = 0; i < 110; i++) {
    const x = rnd() * L, y = rnd() * L, r = 1 + rnd() * 4;
    c.fillStyle = `rgba(30,26,20,${.3 + rnd() * .3})`; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.fillStyle = 'rgba(235,225,200,.28)'; c.beginPath(); c.arc(x - r * .3, y - r * .3, r * .45, 0, TAU); c.fill();
  }
  const v = c.createRadialGradient(L / 2, L / 2, L * .36, L / 2, L / 2, L * .55);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)');
  c.fillStyle = v; c.fillRect(0, 0, L, L);
  c.restore();
}

let curShape = SHAPES[0];
function newBall() {
  curShape = pickShape(curShape.id);
  const clip = 'polygon(' + curShape.pts.map((q) => q[0].toFixed(2) + '% ' + q[1].toFixed(2) + '%').join(',') + ')';
  el.shape.style.setProperty('--clip', clip);
  el.shape.classList.remove('open');
  el.rim.setAttribute('points', curShape.pts.map((q) => q[0].toFixed(2) + ',' + q[1].toFixed(2)).join(' '));
  setProbeShape(curShape.pts);
  const w = Math.max(160, Math.round(el.ball.getBoundingClientRect().width));
  L = w;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  el.mud.width = el.mud.height = Math.round(L * dpr);
  mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  brushR = Math.max(22, el.stage.getBoundingClientRect().width * 0.72 * 0.14);
  paintMud();
  lastMeasure = 0;
  locked = null; el.tease.className = 'tease tease-n'; el.tease.style.opacity = .2;
  pts = []; strokeId = 0; lastP = null; lastS = null; down = false;
  el.mud.classList.remove('gone'); el.mud.classList.add('fresh');
  el.prompt.classList.remove('off');
  setProgress(0);
}

function stamp(x, y) {
  const r = brushR, g = mctx.createRadialGradient(x, y, r * .2, x, y, r);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.65, 'rgba(0,0,0,.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  mctx.globalCompositeOperation = 'destination-out';
  mctx.fillStyle = g; mctx.beginPath(); mctx.arc(x, y, r, 0, TAU); mctx.fill();
  mctx.globalCompositeOperation = 'source-over';
}

// 実際に見える泥の量を、縮小コピーで測る（見た目と判定を一致させる）
const PG = 48;
const probeA = document.createElement('canvas'), probeB = document.createElement('canvas');
probeA.width = probeA.height = 96; probeB.width = probeB.height = PG;
const pa = probeA.getContext('2d', { willReadFrequently: true }), pb = probeB.getContext('2d', { willReadFrequently: true });
let probeInside = [], probeCount = 1;
function setProbeShape(pts) {
  probeInside = [];
  for (let j = 0; j < PG; j++) for (let i = 0; i < PG; i++) probeInside.push(inPoly((i + .5) / PG * 100, (j + .5) / PG * 100, pts));
  probeCount = probeInside.filter(Boolean).length || 1;
}
function measureClean() {
  pa.clearRect(0, 0, 96, 96); pa.drawImage(el.mud, 0, 0, 96, 96);
  pb.clearRect(0, 0, PG, PG); pb.drawImage(probeA, 0, 0, PG, PG);
  const d = pb.getImageData(0, 0, PG, PG).data;
  let dirty = 0;
  for (let k = 0; k < PG * PG; k++) if (probeInside[k] && d[k * 4 + 3] > 40) dirty++;
  return 1 - dirty / probeCount;
}
let lastMeasure = 0;

function setProgress(p) {
  el.bar.style.width = (p * 100).toFixed(1) + '%';
  const m = p <= 0 ? `${curShape.name}の岩をハンマーでほりほり` : p < .3 ? 'コツ コツ…' : p < .6 ? 'いい感じ…！' : p < .85 ? '中に何かある…！' : 'もうすぐ…！！';
  if (el.msg.textContent !== m) el.msg.textContent = m;
}

function toLogical(e) {
  const r = el.mud.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * L, y: (e.clientY - r.top) / r.height * L, t: e.timeStamp };
}

function feed(p, e) {
  if (lastP) {
    const d = Math.hypot(p.x - lastP.x, p.y - lastP.y), n = Math.max(1, Math.ceil(d / (brushR * .4)));
    for (let i = 1; i <= n; i++) stamp(lastP.x + (p.x - lastP.x) * i / n, lastP.y + (p.y - lastP.y) * i / n);
  } else stamp(p.x, p.y);
  const R = L / 2, q = { x: (p.x - R) / R, y: (p.y - R) / R, t: p.t, s: strokeId };
  if (!lastS || lastS.s !== strokeId || Math.hypot(q.x - lastS.x, q.y - lastS.y) >= SAMPLE_STEP) { pts.push(q); lastS = q; }
  lastP = p;
  if (e && Math.random() < .45) { const sp = stagePos(e); fxChip(sp.x, sp.y); if (Math.random() < .3) fxSparkle(sp.x, sp.y); }
  if (performance.now() - lastMeasure >= 90) checkProgress();
}

function checkProgress() {
  lastMeasure = performance.now();
  const prog = measureClean();
  setProgress(Math.min(1, prog / 0.97));
  if (state === 'polish') {
    if (!locked && prog >= 0.3 && pts.length >= 12) lockGem();
    el.tease.style.opacity = (0.2 + Math.min(1, prog / 0.97) * 0.8).toFixed(2);
  }
  if (prog >= 0.97 && state === 'polish') { down = false; finish(); }
}
setInterval(() => { if (state === 'polish' && strokeId > 0) checkProgress(); }, 200);

// 途中で中身を決めて、掘った部分の光で予告する
function lockGem() {
  const { scores } = analyzeStyle(pts);
  const gem = pickGem(scores, Date.now(), save.cool);
  locked = gem; lockedProb = probOf(gem, scores);
  const order = RARITY[gem.r].order;
  let kind = ['n', 'r', 'sr', 'ssr', 'rainbow'][order];
  if (order <= 1 && Math.random() < 0.07) kind = 'rainbow';   // たまに虹色のブラフ
  el.tease.className = 'tease tease-' + kind;
}

// ポコポコ叩くリズム：押している間、一定間隔でハンマーが振り下ろされる
const STRIKE_MS = 125;
function strike(now) {
  lastStrike = now; strikeN++;
  if (lastP) stamp(lastP.x, lastP.y);
  fxChip(pad.x, pad.y); fxChip(pad.x, pad.y);
  if (strikeN % 3 === 0) fxSparkle(pad.x, pad.y);
  pad.ring = 1;
  pok();
  try { if (navigator.vibrate) navigator.vibrate(6); } catch (e) { /* 無視 */ }
  if (el.shape.animate) el.shape.animate([{ transform: 'translateY(2.5px) scale(.992)' }, { transform: 'none' }], { duration: 110, easing: 'ease-out' });
}

function onDown(e) {
  if (state !== 'polish') return;
  e.preventDefault();
  try { el.mud.setPointerCapture(e.pointerId); } catch (err) { /* 無視 */ }
  ensureAudio();
  down = true; strokeId++; lastP = null; lastS = null;
  el.prompt.classList.add('off');
  pad.show = true; movePad(e);
  feed(toLogical(e), e);
  strike(performance.now());
}
function onMove(e) {
  movePad(e);
  if (!down || state !== 'polish') return;
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
  if (evs.length > 1) for (const ev of evs) { if (state === 'polish') feed(toLogical(ev), ev); }
  else feed(toLogical(e), e);
}
function onUp(e) {
  down = false; lastP = null;
  if (e.pointerType !== 'mouse') pad.show = false;
}
el.mud.addEventListener('pointerdown', onDown);
el.mud.addEventListener('pointermove', onMove);
el.mud.addEventListener('pointerup', onUp);
el.mud.addEventListener('pointercancel', onUp);
el.mud.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { pad.show = true; movePad(e); } });
el.mud.addEventListener('pointerleave', () => { if (!down) pad.show = false; });
el.mud.addEventListener('contextmenu', (e) => e.preventDefault());

/* ---------- FX（キラキラ・紙吹雪・ハンマー） ---------- */
const fxc = el.fx.getContext('2d');
let fw = 0, fh = 0;
const parts = [];
const pad = { x: 0, y: 0, a: 0, show: false, ring: 0 };
function fxResize() {
  const r = el.stage.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
  fw = r.width; fh = r.height;
  el.fx.width = Math.round(fw * dpr); el.fx.height = Math.round(fh * dpr);
  fxc.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function stagePos(e) { const r = el.stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
function movePad(e) { const p = stagePos(e); pad.x = p.x; pad.y = p.y; }
function fxSparkle(x, y, color) {
  parts.push({ k: 's', x, y, vx: rand(-30, 30), vy: rand(-70, -10), age: 0, max: rand(.4, .9), size: rand(2, color ? 8 : 5), color: color || (Math.random() < .5 ? '#fff' : '#ffe9a8') });
}
function fxBurst(x, y, color, n) {
  const pal = [color, '#fff', '#ffd36b', '#ff9ad0', '#7ab8ff'];
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), sp = rand(120, 460);
    parts.push({ k: Math.random() < .5 ? 'c' : 's', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, g: 520, age: 0, max: rand(.8, 1.7), size: rand(3, 8), rot: rand(0, TAU), vr: rand(-8, 8), color: pal[Math.floor(Math.random() * pal.length)] });
  }
}
function fxChip(x, y) {
  const pal = ['#8a8372', '#a89f8a', '#5a554a', '#c9bda0', '#6b5a44'];
  for (let i = 0; i < 2; i++) parts.push({ k: 'c', x, y, vx: rand(-110, 110), vy: rand(-220, -60), g: 800, age: 0, max: rand(.4, .8), size: rand(3, 7), rot: rand(0, TAU), vr: rand(-12, 12), color: pal[Math.floor(Math.random() * pal.length)] });
}
function starPath(c, x, y, r) {
  c.beginPath();
  for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * .3 : r, a = i * Math.PI / 4; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath();
}
let lastT = performance.now();
function fxLoop(t) {
  const dt = Math.min(.05, (t - lastT) / 1000); lastT = t;
  fxc.clearRect(0, 0, fw, fh);
  if (down && state === 'polish' && t - lastStrike >= STRIKE_MS) strike(t);
  pad.ring = Math.max(0, pad.ring - dt * 7);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.age += dt;
    if (p.age >= p.max) { parts.splice(i, 1); continue; }
    p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    const life = 1 - p.age / p.max;
    fxc.globalAlpha = clamp(life * 1.4);
    fxc.fillStyle = p.color;
    if (p.k === 's') { starPath(fxc, p.x, p.y, p.size * (.5 + life)); fxc.fill(); }
    else { p.rot += p.vr * dt; fxc.save(); fxc.translate(p.x, p.y); fxc.rotate(p.rot); fxc.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); fxc.restore(); }
  }
  fxc.globalAlpha = 1;
  pad.a += ((pad.show && state === 'polish' ? 1 : 0) - pad.a) * Math.min(1, dt * 14);
  if (pad.a > .02) {
    const r = brushR * (el.ball.getBoundingClientRect().width / L), s = r * 1.5;
    const u = Math.min(1, (t - lastStrike) / STRIKE_MS);
    const ang = down ? -0.55 - 0.7 * Math.sin(u * Math.PI) : -0.9 - 0.08 * Math.sin(t / 300);
    const sq = down ? 1 - 0.1 * (1 - u) * (1 - u) : 1;
    fxc.save(); fxc.globalAlpha = pad.a * .95; fxc.translate(pad.x, pad.y);
    fxc.strokeStyle = `rgba(255,255,255,${.3 + pad.ring * .5})`; fxc.lineWidth = 1.5 + pad.ring * 1.5; fxc.setLineDash([4, 4]); fxc.beginPath(); fxc.arc(0, 0, r * (1 + pad.ring * .18), 0, TAU); fxc.stroke(); fxc.setLineDash([]);
    fxc.rotate(ang); fxc.scale(sq, sq);
    fxc.fillStyle = '#8b5a2b'; fxc.beginPath(); fxc.roundRect(-s * .1, s * .15, s * .2, s * 1.7, s * .08); fxc.fill();
    fxc.strokeStyle = '#4a2c10'; fxc.lineWidth = 1.2; fxc.stroke();
    const hg = fxc.createLinearGradient(0, -s * .3, 0, s * .3); hg.addColorStop(0, '#e6e9ef'); hg.addColorStop(.5, '#9aa3b2'); hg.addColorStop(1, '#5b6474');
    fxc.fillStyle = hg; fxc.beginPath(); fxc.roundRect(-s * .6, -s * .3, s * 1.2, s * .6, s * .1); fxc.fill();
    fxc.strokeStyle = '#2f3542'; fxc.stroke();
    fxc.restore();
  }
  requestAnimationFrame(fxLoop);
}

/* ---------- スコア表示 ---------- */
let shownTotal = 0, tweenId = 0;
function renderScores(animate) {
  el.dex.textContent = `${ownedCount()}/${GEMS.length}`;
  el.pol.textContent = fmt(save.polished);
  const from = shownTotal, to = save.total;
  cancelAnimationFrame(tweenId);
  if (!animate || from === to) { shownTotal = to; el.total.textContent = fmt(to); return; }
  const t0 = performance.now(), dur = 900;
  const step = (now) => {
    const k = clamp((now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    shownTotal = from + (to - from) * e; el.total.textContent = fmt(shownTotal);
    if (k < 1) tweenId = requestAnimationFrame(step); else shownTotal = to;
  };
  tweenId = requestAnimationFrame(step);
}

/* ---------- 図鑑 ---------- */
function renderCodex() {
  const now = Date.now(), rates = baseRates();
  const own = ownedCount(), pct = Math.floor(own / GEMS.length * 100);
  const sum = `<div class="dexsum"><div><small>コンプ率</small><br><b>${pct}%</b></div><div class="dexbar"><i style="width:${own / GEMS.length * 100}%"></i></div><small>${own}/${GEMS.length}種</small></div>`;
  el.codex.innerHTML = sum + RARITY_KEYS.map((rk) => {
    const list = GEMS.filter((g) => g.r === rk), have = list.filter((g) => save.counts[g.id] > 0).length;
    const cards = list.map((g) => {
      const n = save.counts[g.id] || 0, color = RARITY[g.r].color;
      if (!n) return `<div class="card unknown ${g.r}" style="--rc:${color}">${gemSVG(g)}<span class="nm">？？？</span><span class="rbadge" style="opacity:.5"><span class="badge ${g.r}">${g.r}</span><span class="stars">${stars(g.r)}</span></span></div>`;
      const cd = g.styles.length && (save.cool[g.id] || 0) > now ? `<span class="sleep" data-until="${save.cool[g.id]}"></span>` : '';
      return `<div class="card known ${g.r}" style="--rc:${color}">${cd}${gemSVG(g)}<span class="nm">${g.name}</span><span class="rbadge"><span class="badge ${g.r}">${g.r}</span><span class="stars">${stars(g.r)}</span></span><span class="meta">${fmt(RARITY[g.r].score)}pt ・ ×${n}</span><span class="hint">${hintFor(g)}</span></div>`;
    }).join('');
    return `<div class="grp"><div class="grp-h"><span class="badge ${rk}">${rk}</span><span class="stars">${stars(rk)}</span><span>${have}/${list.length}　${fmt(RARITY[rk].score)}pt　基本確率 ${fmtPct(rates[rk])}</span></div><div class="grid">${cards}</div></div>`;
  }).join('');
  tickSleep();
}
function tickSleep() {
  const now = Date.now(); let expired = false;
  document.querySelectorAll('.sleep').forEach((s) => {
    const left = Number(s.dataset.until) - now;
    if (left <= 0) { expired = true; return; }
    const m = Math.floor(left / 60000), sec = Math.floor(left / 1000) % 60;
    s.textContent = `💤${m}:${String(sec).padStart(2, '0')}`;
  });
  if (expired) renderCodex();
}
setInterval(tickSleep, 1000);

/* ---------- 結果の流れ ---------- */
async function finish() {
  state = 'reveal';
  const { scores } = analyzeStyle(pts);
  const now = Date.now();
  const gem = locked || pickGem(scores, now, save.cool);
  const prob = locked ? lockedProb : probOf(gem, scores);
  const R = RARITY[gem.r];
  const isNew = !(save.counts[gem.id] > 0);

  setProgress(1);
  el.mud.classList.remove('fresh'); el.mud.classList.add('gone');
  pad.show = false;
  el.stage.style.setProperty('--rc', R.color);
  el.ball.style.setProperty('--rc', R.color);
  el.ball.style.setProperty('--amp', R.amp);
  await sleep(500);

  // 溜め
  el.msg.textContent = '…！';
  el.ball.style.setProperty('--dur', R.rumble + 'ms');
  el.ball.classList.add('rumble', 'charge');
  const cx = fw / 2, cy = el.ball.offsetTop + el.ball.offsetHeight / 2;
  await sleep(R.rumble);
  el.ball.classList.remove('rumble', 'charge');

  // 登場
  el.tease.style.opacity = 0;
  el.shape.classList.add('open');
  el.flash.classList.remove('go'); void el.flash.offsetWidth; el.flash.classList.add('go');
  el.slot.innerHTML = gemSVG(gem) + '<i class="glint"></i>'.repeat(4);
  el.slot.className = 'gem-slot pop';
  startShine(R);
  el.rays.classList.add('on');
  fxBurst(cx, cy, R.color, 24 + R.order * 26);
  chime(R.order);

  // 記録
  save.counts[gem.id] = (save.counts[gem.id] || 0) + 1;
  save.total += R.score;
  save.polished += 1;
  if (gem.styles.length) save.cool[gem.id] = now + COOL_MS;
  save.last = { id: gem.id, name: gem.name, r: gem.r, score: R.score, cap: gem.cap };
  writeSave();
  pushScore();
  renderScores(true);
  renderCodex();

  await sleep(900);
  el.slot.className = 'gem-slot idle';
  showResult(gem, scores, isNew, prob);
}

function showResult(gem, scores, isNew, prob) {
  const R = RARITY[gem.r];
  el.rBadge.textContent = gem.r; el.rBadge.className = 'badge ' + gem.r;
  el.rName.textContent = gem.name;
  el.rNew.hidden = !isNew;
  el.rScore.textContent = fmt(R.score);
  $('#rStars').textContent = stars(gem.r);
  $('#rCap').textContent = gem.cap;
  $('#rProb').textContent = '確率 ' + fmtPct(prob);
  const top = Object.entries(scores).filter(([, v]) => v >= .25).sort((a, b) => b[1] - a[1]).slice(0, 2);
  el.rStyle.textContent = top.length ? '掘りのクセ：' + top.map(([k, v]) => `${STYLE_SHORT[k]} ${Math.round(v * 100)}%`).join('・') : '掘りのクセ：なし（ふつうに掘った）';
  el.hud.hidden = true; el.result.hidden = false;
  state = 'result';
  updateShareLink();
  el.next.focus({ preventScroll: true });
}

function startShine(R) {
  clearInterval(shineTimer);
  shineTimer = setInterval(() => {
    const cx = fw / 2, cy = el.ball.offsetTop + el.ball.offsetHeight / 2, rr = el.ball.offsetWidth * 0.3;
    for (let i = 0; i < 1 + R.order; i++) fxSparkle(cx + rand(-rr, rr), cy + rand(-rr, rr * .8), i % 2 ? '#fff' : R.color);
  }, 140);
}

function nextBall() {
  if (state !== 'result') return;
  clearInterval(shineTimer);
  el.result.hidden = true; el.hud.hidden = false;
  el.rays.classList.remove('on');
  el.slot.className = 'gem-slot'; el.slot.innerHTML = '';
  state = 'polish';
  newBall();
}
el.next.addEventListener('click', nextBall);

/* ---------- シェア ---------- */
function shareUrl() { return location.href.split('#')[0]; }
function shareText() {
  const l = save.last;
  if (!l) return '恐竜ほりほりで遊んでる！ハンマーで岩を掘って恐竜を集めよう🦖 #恐竜ほりほり';
  return `恐竜ほりほりで【${l.name}】(${stars(l.r)})を掘り当てた！${l.cap ? '「' + l.cap + '」' : ''} +${fmt(l.score)}pt\nトータル ${fmt(save.total)}pt／図鑑 ${ownedCount()}/${GEMS.length}（${Math.floor(ownedCount() / GEMS.length * 100)}%） 🦖 #恐竜ほりほり`;
}
function toast(msg) {
  el.toast.textContent = msg; el.toast.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.toast.classList.remove('show'), 2200);
}
let shareBlob = null, shareDataUrl = '';
async function makeShareImage() {
  const W = 1080, cv = document.createElement('canvas'); cv.width = cv.height = W;
  const x = cv.getContext('2d'), l = save.last, g = l && GEM_BY_ID[l.id];
  const col = g ? RARITY[g.r].color : '#ffd36b', font = '"Hiragino Maru Gothic ProN","Hiragino Sans","Yu Gothic UI","Meiryo",sans-serif';
  const bg = x.createRadialGradient(W / 2, 430, 60, W / 2, 430, 900);
  bg.addColorStop(0, '#34267a'); bg.addColorStop(.6, '#180f3d'); bg.addColorStop(1, '#0a0720');
  x.fillStyle = bg; x.fillRect(0, 0, W, W);
  const rnd = mulberry(11);
  for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(255,255,255,${.2 + rnd() * .5})`; x.beginPath(); x.arc(rnd() * W, rnd() * W, 1 + rnd() * 2.2, 0, TAU); x.fill(); }
  x.save(); x.translate(W / 2, 430); x.globalAlpha = .22; x.fillStyle = col;
  for (let i = 0; i < 18; i++) { x.rotate(TAU / 18); x.beginPath(); x.moveTo(0, 0); x.lineTo(-60, -900); x.lineTo(60, -900); x.closePath(); x.fill(); }
  x.restore();
  const glow = x.createRadialGradient(W / 2, 430, 20, W / 2, 430, 330);
  glow.addColorStop(0, col + 'cc'); glow.addColorStop(1, col + '00'); x.fillStyle = glow; x.fillRect(0, 60, W, 740);
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = '#ffe9a8'; x.font = `900 60px ${font}`; x.fillText('恐竜ほりほり', W / 2, 90);
  if (g) {
    const svg = gemSVG(g).replace('<svg viewBox', '<svg width="512" height="512" viewBox');
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    try {
      const img = new Image(); img.src = url; await img.decode();
      x.drawImage(img, W / 2 - 230, 200, 460, 460);
    } catch (e) { /* 画像なしで続行 */ }
    URL.revokeObjectURL(url);
    x.fillStyle = col; x.font = `900 54px ${font}`; x.fillText(stars(g.r), W / 2, 745);
    x.fillStyle = '#fff'; x.font = `900 92px ${font}`; x.fillText(g.name, W / 2, 830, 980);
    x.fillStyle = '#d9d2ff'; x.font = `700 40px ${font}`; x.fillText(g.cap || '', W / 2, 898, 980);
    x.fillStyle = '#ffe9a8'; x.font = `800 56px ${font}`; x.fillText(`+${fmt(l.score)} pt`, W / 2, 965);
  } else {
    x.fillStyle = '#fff'; x.font = `900 84px ${font}`; x.fillText('ハンマーで岩を掘って', W / 2, 420); x.fillText('恐竜を集めよう', W / 2, 530);
  }
  x.fillStyle = '#cfc8f5'; x.font = `700 38px ${font}`;
  x.fillText(`TOTAL ${fmt(save.total)} pt　／　図鑑 ${ownedCount()}/${GEMS.length}（${Math.floor(ownedCount() / GEMS.length * 100)}%）`, W / 2, 1035);
  shareDataUrl = cv.toDataURL('image/png');
  shareBlob = await new Promise((r) => cv.toBlob(r, 'image/png'));
  $('#shareThumb').src = shareDataUrl; $('#imgSaveBtn').href = shareDataUrl;
}
function updateShareLink() {
  const t = shareText(), u = shareUrl(), tu = t + '\n' + u;
  $('#xBtn').href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(t) + '&url=' + encodeURIComponent(u);
  $('#lineBtn').href = 'https://line.me/R/share?text=' + encodeURIComponent(tu);
  $('#fbBtn').href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(u) + '&quote=' + encodeURIComponent(t);
  $('#bskyBtn').href = 'https://bsky.app/intent/compose?text=' + encodeURIComponent(tu);
  $('#thBtn').href = 'https://www.threads.net/intent/post?text=' + encodeURIComponent(tu);
  makeShareImage().catch(() => {});
}
async function copyImage() {
  if (!shareBlob || !navigator.clipboard || !window.ClipboardItem) return false;
  try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': shareBlob })]); return true; } catch (e) { return false; }
}
// 各サービスは画像を直接受け取れないので、押したときに画像をコピーしておく（投稿画面で貼り付け）
['xBtn', 'lineBtn', 'fbBtn', 'bskyBtn', 'thBtn'].forEach((id) => {
  $('#' + id).addEventListener('click', async () => { if (await copyImage()) toast('画像をコピーしました。投稿画面で貼り付けてね'); });
});
$('#imgCopyBtn').addEventListener('click', async () => toast(await copyImage() ? '画像をコピーしました' : 'この環境では画像コピーできません。「画像保存」を使ってね'));
function serviceList() {
  const t = shareText(), u = shareUrl(), tu = t + '\n' + u, e = encodeURIComponent;
  return [
    ['𝕏', 's-x', 'https://twitter.com/intent/tweet?text=' + e(t) + '&url=' + e(u)],
    ['LINE', 's-line', 'https://line.me/R/share?text=' + e(tu)],
    ['Facebook', 's-fb', 'https://www.facebook.com/sharer/sharer.php?u=' + e(u) + '&quote=' + e(t)],
    ['Bluesky', 's-bsky', 'https://bsky.app/intent/compose?text=' + e(tu)],
    ['Threads', 's-th', 'https://www.threads.net/intent/post?text=' + e(tu)],
    ['Mastodon', 's-ms', 'https://mastodonshare.com/?text=' + e(tu)],
    ['Telegram', 's-tg', 'https://t.me/share/url?url=' + e(u) + '&text=' + e(t)],
    ['WhatsApp', 's-wa', 'https://wa.me/?text=' + e(tu)],
    ['Reddit', 's-rd', 'https://www.reddit.com/submit?url=' + e(u) + '&title=' + e(t.split('\n')[0])],
    ['はてブ', 's-hb', 'https://b.hatena.ne.jp/entry/panel/?url=' + e(u) + '&btitle=' + e(t.split('\n')[0])],
  ];
}
const sheet = $('#sheet');
function openSheet() {
  $('#sheetGrid').innerHTML = serviceList().map(([n, c, href]) => `<a class="btn ${c}" target="_blank" rel="noopener" href="${href}">${n}</a>`).join('')
    + '<button class="btn" data-act="img" type="button">画像コピー</button><button class="btn" data-act="txt" type="button">文章コピー</button>';
  sheet.hidden = false;
}
const closeSheet = () => { sheet.hidden = true; };
sheet.addEventListener('click', async (ev) => {
  if (ev.target === sheet) return closeSheet();
  const a = ev.target.closest('a'), b = ev.target.closest('button[data-act]');
  if (a && await copyImage()) toast('画像をコピーしました。投稿画面で貼り付けてね');
  if (b && b.dataset.act === 'img') toast(await copyImage() ? '画像をコピーしました' : 'この環境では画像コピーできません');
  if (b && b.dataset.act === 'txt') $('#copyBtn').click();
});
$('#sheetClose').addEventListener('click', closeSheet);
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeSheet(); });
// 端末の共有シートが使えればそれを開き、使えなければ一覧を出す
$('#allBtn').addEventListener('click', async () => {
  if (navigator.share) {
    const data = { text: shareText(), url: shareUrl() };
    try {
      if (shareBlob) {
        const f = new File([shareBlob], 'migaki-gacha.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [f] })) data.files = [f];
      }
      await navigator.share(data);
      return;
    } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  openSheet();
});
$('#copyBtn').addEventListener('click', async () => {
  const txt = shareText() + '\n' + shareUrl();
  try { await navigator.clipboard.writeText(txt); toast('文章をコピーしました'); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('文章をコピーしました'); } catch (e2) { toast('コピーできませんでした'); }
    ta.remove();
  }
});


/* ============================================================
   ランキング（共有データベースが使えるときだけ表示）
============================================================ */
let rankDb = null, rankUser = null, myId = null, canWrite = null, rankRows = [], rankTab = 'total', rankSynced = false, rankSeq = 0, pushChain = Promise.resolve();
const bestOrder = () => GEMS.reduce((m, g) => (save.counts[g.id] > 0 ? Math.max(m, RARITY[g.r].order) : m), -1);
function myScoreDoc() { return { total: save.total, dex: ownedCount(), best: bestOrder(), polished: save.polished, updated: Date.now() }; }
function pushScore() {
  if (!rankDb || !myId || canWrite === false || save.polished < 1) return;
  const ref = rankDb.doc('dino_scores/' + myId);
  pushChain = pushChain.then(() => ref.set(myScoreDoc())).catch(() => {});
}
async function renderRank() {
  const seq = ++rankSeq;
  const key = rankTab === 'dex' ? (r) => r.dex * 1e9 + r.total : (r) => r.total * 1e3 + r.dex;
  const rows = rankRows.filter((r) => typeof r.total === 'number').sort((a, b) => key(b) - key(a));
  let shown = rows.slice(0, 20);
  const myIdx = rows.findIndex((r) => r.id === myId);
  if (myIdx >= 20) shown = shown.concat([rows[myIdx]]);
  const ps = rankUser ? await rankUser.profiles(shown.map((r) => r.id)) : {};
  if (seq !== rankSeq) return;
  const ol = $('#rankList'); ol.textContent = '';
  if (!shown.length) { const li = document.createElement('li'); li.textContent = 'まだ誰も載っていません。最初の1位になろう！'; li.style.display = 'block'; ol.appendChild(li); return; }
  shown.forEach((r) => {
    const rank = rows.indexOf(r) + 1, p = ps[r.id], isMe = r.id === myId;
    const li = document.createElement('li'); if (isMe) li.className = 'me';
    const pos = document.createElement('span'); pos.className = 'pos'; pos.textContent = rank;
    const img = document.createElement('img'); img.alt = ''; if (p && p.avatarUrl) img.src = p.avatarUrl;
    const who = document.createElement('div'); who.className = 'who';
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = (p && p.name) || (isMe ? 'あなた' : '名無しの発掘隊');
    if (isMe) { const y = document.createElement('i'); y.className = 'you'; y.textContent = 'YOU'; y.style.fontStyle = 'normal'; nm.appendChild(y); }
    const sub = document.createElement('span'); sub.className = 'sub';
    sub.textContent = rankTab === 'dex' ? `${fmt(r.total)}pt ・ 最高 ${r.best >= 0 ? RARITY_KEYS[4 - r.best] : '-'}` : `図鑑 ${r.dex}/${GEMS.length} ・ 最高 ${r.best >= 0 ? RARITY_KEYS[4 - r.best] : '-'}`;
    who.append(nm, sub);
    const val = document.createElement('span'); val.className = 'val'; val.textContent = rankTab === 'dex' ? `${r.dex}種` : `${fmt(r.total)}pt`;
    li.append(pos, img, who, val); ol.appendChild(li);
  });
}
async function initRanking() {
  try {
    if (!window.claude || !window.claude.use) return;
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    if (!db) return;
    rankDb = db; rankUser = user;
    myId = user ? await user.id() : null;
    canWrite = user ? await user.can('data.write') : null;
    $('#rankSec').hidden = false;
    const note = $('#rankNote');
    note.textContent = !myId ? 'この環境ではあなたのスコアは記録されません。' : canWrite === false ? '閲覧のみの権限のため、あなたのスコアはランキングに載りません。' : '掘るたびにスコアが自動で登録されます。';
    const timer = setTimeout(() => { note.textContent = 'ランキングに接続できません。しばらくしてから開き直してください。'; }, 10000);
    db.collection('dino_scores').limit(200).onSnapshot((snap) => {
      if (!snap.metadata.fromCache) clearTimeout(timer);
      rankRows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderRank();
      if (!rankSynced) { rankSynced = true; pushScore(); }
    }, () => { clearTimeout(timer); note.textContent = 'ランキングを読み込めませんでした。'; });
    document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => {
      rankTab = b.dataset.tab; document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('on', x === b)); renderRank();
    }));
  } catch (e) { /* ランキングなしで続行 */ }
}

/* ---------- その他 ---------- */
const muteBtn = $('#mute');
const drawMute = () => { muteBtn.textContent = muted ? '🔇' : '🔊'; };
muteBtn.addEventListener('click', () => {
  muted = !muted; try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) { /* 無視 */ }
  drawMute(); if (!muted) { ensureAudio(); tone(880, 0, .15); }
});
$('#resetBtn').addEventListener('click', () => {
  const b = $('#resetBtn');
  if (!b.dataset.arm) { b.dataset.arm = '1'; b.textContent = '本当に消す？もう一度押すと消去'; setTimeout(() => { delete b.dataset.arm; b.textContent = 'データを消去'; }, 4000); return; }
  delete b.dataset.arm; b.textContent = 'データを消去';
  save = { total: 0, polished: 0, counts: {}, cool: {}, last: null };
  writeSave(); shownTotal = 0; renderScores(false); renderCodex();
  if (rankDb && myId) rankDb.doc('dino_scores/' + myId).delete().catch(() => {});
});
window.addEventListener('resize', fxResize);

loadSave();
drawMute();
shownTotal = save.total;
renderScores(false);
renderCodex();
updateShareLink();
fxResize();
newBall();
requestAnimationFrame(fxLoop);

initRanking();

// テスト・調整用
window.Migaki = { analyzeStyle, gemWeights, pickGem, GEMS, RARITY, COOL_MS, get state() { return state; } };
})();
