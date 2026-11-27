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

const COOL_MS = 10 * 60 * 1000;     // 一度出た「クセ付き宝石」が眠る時間
const SAVE_KEY = 'migaki-gacha:v1';
const MUTE_KEY = 'migaki-gacha:mute';

const RARITY = {
  N:   { score: 10,   w: 70,  boost: 2,   rumble: 350,  amp: 1,   color: '#a3adbd', order: 0 },
  R:   { score: 50,   w: 20,  boost: 8,   rumble: 650,  amp: 2,   color: '#4cc38a', order: 1 },
  SR:  { score: 200,  w: 6,   boost: 30,  rumble: 1100, amp: 3.5, color: '#4da3ff', order: 2 },
  SSR: { score: 1000, w: 1.6, boost: 100, rumble: 1700, amp: 5,   color: '#b86bff', order: 3 },
  UR:  { score: 5000, w: 0.4, boost: 400, rumble: 2400, amp: 7,   color: '#ffd36b', order: 4 },
};
const stars = (r) => '★'.repeat(RARITY[r].order + 1);
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
  // ---- N
  { id: 'quartz',   name: '石英',         r: 'N', shape: 'round',   c: ['#f6f8fc', '#cfd6e6', '#8e99b3'], styles: [], w: 110 },
  { id: 'obsidian', name: '黒曜石',       r: 'N', shape: 'drop',    c: ['#7a7e92', '#2c2e3c', '#0c0d14'], styles: [], w: 110 },
  { id: 'agate',    name: '瑪瑙',         r: 'N', shape: 'cab',     c: ['#f3d9b1', '#c98f5a', '#7a4a2c'], styles: ['horiz'], deco: 'bands' },
  { id: 'fluorite', name: '蛍石',         r: 'N', shape: 'emerald', c: ['#e0d4ff', '#8fd0c4', '#6a4fb0'], styles: ['slow'] },
  // ---- R
  { id: 'garnet',   name: 'ガーネット',   r: 'R', shape: 'brilliant', c: ['#ff9aa8', '#c4162f', '#6a0716'], styles: ['cw'] },
  { id: 'lapis',    name: 'ラピスラズリ', r: 'R', shape: 'cab',     c: ['#6b8cf0', '#1f3a9e', '#0c1a5e'], styles: ['ccw'], deco: 'gold' },
  { id: 'peridot',  name: 'ペリドット',   r: 'R', shape: 'round',   c: ['#eaff96', '#a8d62c', '#5e8c10'], styles: ['vert'] },
  { id: 'citrine',  name: 'シトリン',     r: 'R', shape: 'emerald', c: ['#fff0a0', '#f7b92a', '#b36d08'], styles: ['horiz'] },
  { id: 'amethyst', name: 'アメジスト',   r: 'R', shape: 'oval',    c: ['#ebd2ff', '#a15de0', '#55208f'], styles: ['slow'] },
  { id: 'rosequartz', name: 'ローズクォーツ', r: 'R', shape: 'heart', c: ['#ffe6f0', '#ffa6c4', '#d9608f'], styles: ['tap'] },
  { id: 'moonstone', name: 'ムーンストーン', r: 'R', shape: 'cab',  c: ['#ffffff', '#cfe4ff', '#93b0e0'], styles: ['fast'], deco: 'sheen' },
  // ---- SR
  { id: 'ruby',     name: 'ルビー',       r: 'SR', shape: 'emerald', c: ['#ff7f95', '#e0112f', '#7d0016'], styles: ['cw'] },
  { id: 'sapphire', name: 'サファイア',   r: 'SR', shape: 'brilliant', c: ['#8fc4ff', '#1f63e0', '#0a2a85'], styles: ['ccw'] },
  { id: 'emerald',  name: 'エメラルド',   r: 'SR', shape: 'emerald', c: ['#9dffc9', '#14b36a', '#05603a'], styles: ['vert'] },
  { id: 'topaz',    name: 'インペリアルトパーズ', r: 'SR', shape: 'drop', c: ['#ffe2a0', '#ff9d2e', '#b3500a'], styles: ['horiz'] },
  { id: 'tanzanite', name: 'タンザナイト', r: 'SR', shape: 'oval',  c: ['#cfc2ff', '#5a45d6', '#241a7a'], styles: ['slow'] },
  { id: 'pinktour', name: 'ピンクトルマリン', r: 'SR', shape: 'drop', c: ['#ffc4e1', '#ff5fa6', '#a31a63'], styles: ['tap'] },
  { id: 'aquamarine', name: 'アクアマリン', r: 'SR', shape: 'emerald', c: ['#d6fbff', '#6fdcf0', '#1a8fb0'], styles: ['fast'] },
  // ---- SSR
  { id: 'diamond',  name: 'ダイヤモンド', r: 'SSR', shape: 'brilliant', c: ['#ffffff', '#dff3ff', '#9bc9ee'], styles: ['fast'] },
  { id: 'alexandrite', name: 'アレキサンドライト', r: 'SSR', shape: 'oval', c: ['#7ef0c5', '#4f7de0', '#b53cc4'], grad: ['#8ff7cf', '#4f9ae0', '#b53cc4', '#e03a5a'], styles: ['slow'] },
  { id: 'pigeon',   name: 'ピジョンブラッド', r: 'SSR', shape: 'emerald', c: ['#ff6a82', '#c40a28', '#58000f'], styles: ['cw'] },
  { id: 'kashmir',  name: 'カシミールブルー', r: 'SSR', shape: 'round', c: ['#86b0ff', '#1741c9', '#071a6b'], styles: ['ccw'] },
  { id: 'demantoid', name: 'デマントイド', r: 'SSR', shape: 'brilliant', c: ['#d4ff8a', '#3cc226', '#0a6a12'], styles: ['vert'] },
  { id: 'heliodor', name: 'ゴールデンベリル', r: 'SSR', shape: 'emerald', c: ['#fffbb8', '#ffd400', '#c28a00'], styles: ['horiz'] },
  { id: 'padparadscha', name: 'パパラチア', r: 'SSR', shape: 'drop', c: ['#ffd8b8', '#ff7f6e', '#e0447c'], styles: ['tap'] },
  // ---- UR
  { id: 'opal',     name: '虹彩オパール', r: 'UR', shape: 'cab', c: ['#ffffff', '#9fd8ff', '#c47aff'], grad: ['#ff9ad0', '#ffe27a', '#7affc8', '#7ab8ff', '#c47aff'], deco: 'rainbow', styles: ['cw', 'ccw'] },
  { id: 'sage',     name: '賢者の石',     r: 'UR', shape: 'star', c: ['#fff2a8', '#ff5a3c', '#8a0a2a'], styles: ['cross'] },
  { id: 'stardust', name: '星の涙',       r: 'UR', shape: 'star', c: ['#ffffff', '#9fd8ff', '#6a5cff'], styles: ['slow', 'tap'] },
];
const GEM_BY_ID = Object.fromEntries(GEMS.map((g) => [g.id, g]));

function hintFor(g) {
  if (!g.styles.length) return 'どんな磨き方でも出会える、ふつうの石。';
  return g.styles.map((k) => STYLE_HINT[k]).join(' ＋ ') + '磨くと出やすい';
}

/* ============================================================
   磨き方の解析（純粋関数）
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

// 各宝石の出やすさ。クセ付き宝石は、出た後10分は重み0
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
   宝石SVG
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
  const id = 'g' + (++svgUid);
  const stops = (g.grad || g.c);
  const grad = `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">${stops.map((c, i) => `<stop offset="${(i / (stops.length - 1) * 100).toFixed(0)}%" stop-color="${c}"/>`).join('')}</linearGradient>`;
  const fill = `url(#${id})`;
  let defs = grad, body = '';
  const rnd = mulberry([...g.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7));

  const fan = (center, ring) => ring.map((p, i) => {
    const q = ring[(i + 1) % ring.length];
    const mid = Math.atan2((p[1] + q[1]) / 2 - center[1], (p[0] + q[0]) / 2 - center[0]) * 180 / Math.PI;
    return facetEl([center, p, q], shadeAt(mid));
  }).join('');

  switch (g.shape) {
    case 'brilliant': {
      const A = [28, 18], B = [72, 18], C = [92, 38], D = [50, 92], E = [8, 38], g1 = [38, 38], g2 = [62, 38], M = [50, 18];
      body = `<polygon points="${ptsStr([A, B, C, D, E])}" fill="${fill}"/>`
        + [[[E, A, g1], .2], [[A, M, g1], .55], [[M, g1, g2], .35], [[M, B, g2], .1], [[B, C, g2], -.25], [[E, g1, D], -.1], [[g1, g2, D], .3], [[g2, C, D], -.4]].map(([p, s]) => facetEl(p, s)).join('')
        + `<polygon points="${ptsStr([A, B, C, D, E])}" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="1" stroke-linejoin="round"/>`;
      break;
    }
    case 'emerald': {
      const o = [[28, 8], [72, 8], [92, 26], [92, 74], [72, 92], [28, 92], [8, 74], [8, 26]];
      const n = [[36, 24], [64, 24], [76, 36], [76, 64], [64, 76], [36, 76], [24, 64], [24, 36]];
      const sh = [.55, .25, -.15, -.4, -.4, -.1, .15, .4];
      body = `<polygon points="${ptsStr(o)}" fill="${fill}"/>`
        + o.map((p, i) => { const j = (i + 1) % 8; return facetEl([p, o[j], n[j], n[i]], sh[i]); }).join('')
        + facetEl(n, .12)
        + `<polygon points="${ptsStr([n[0], n[1], [58, 40], [42, 40]])}" fill="#fff" fill-opacity=".28"/>`
        + `<polygon points="${ptsStr(o)}" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="1" stroke-linejoin="round"/>`;
      break;
    }
    case 'round': case 'oval': {
      const sx = g.shape === 'oval' ? 0.8 : 1, N = 12;
      const o = [], n = [];
      for (let i = 0; i < N; i++) { o.push(polar(50, 50, 43 * sx, 43, i * 30 + 15)); n.push(polar(50, 50, 23 * sx, 23, i * 30 + 15)); }
      body = `<polygon points="${ptsStr(o)}" fill="${fill}"/>`
        + o.map((p, i) => { const j = (i + 1) % N; return facetEl([p, o[j], n[j], n[i]], shadeAt(i * 30 + 30)); }).join('')
        + fan([50, 50], n)
        + `<polygon points="${ptsStr(o)}" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="1" stroke-linejoin="round"/>`;
      break;
    }
    case 'star': {
      const o = [];
      for (let i = 0; i < 16; i++) o.push(polar(50, 50, i % 2 ? 22 : 46, i % 2 ? 22 : 46, i * 22.5 - 90));
      body = `<polygon points="${ptsStr(o)}" fill="${fill}"/>` + fan([50, 50], o)
        + `<circle cx="50" cy="50" r="7" fill="#fff" fill-opacity=".75"/>`
        + `<polygon points="${ptsStr(o)}" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="1" stroke-linejoin="round"/>`;
      break;
    }
    case 'drop': case 'heart': {
      const path = g.shape === 'drop'
        ? 'M50 5 C60 26 84 42 84 64 A34 34 0 0 1 16 64 C16 42 40 26 50 5 Z'
        : 'M50 90 C10 62 4 34 22 20 C36 10 48 20 50 30 C52 20 64 10 78 20 C96 34 90 62 50 90 Z';
      const ring = g.shape === 'drop'
        ? [[50, 5], [68, 32], [84, 62], [74, 88], [50, 98], [26, 88], [16, 62], [32, 32]]
        : [[50, 30], [78, 18], [94, 44], [74, 72], [50, 90], [26, 72], [6, 44], [22, 18]];
      defs += `<clipPath id="${id}c"><path d="${path}"/></clipPath>`;
      body = `<path d="${path}" fill="${fill}"/><g clip-path="url(#${id}c)">${fan([50, 56], ring)}</g>`
        + `<path d="${path}" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="1"/>`;
      break;
    }
    case 'cab': default: {
      defs += `<clipPath id="${id}c"><ellipse cx="50" cy="52" rx="42" ry="36"/></clipPath>`;
      let deco = '';
      if (g.deco === 'bands') for (let i = 1; i <= 5; i++) deco += `<ellipse cx="50" cy="52" rx="${42 - i * 7}" ry="${36 - i * 6}" fill="none" stroke="${i % 2 ? '#fff' : '#3a1c08'}" stroke-opacity=".28" stroke-width="2.4"/>`;
      if (g.deco === 'gold') for (let i = 0; i < 26; i++) deco += `<circle cx="${rand2(rnd, 14, 86)}" cy="${rand2(rnd, 24, 80)}" r="${rand2(rnd, .6, 1.6)}" fill="#ffd36b" fill-opacity=".9"/>`;
      if (g.deco === 'rainbow') for (let i = 0; i < 22; i++) deco += `<circle cx="${rand2(rnd, 14, 86)}" cy="${rand2(rnd, 24, 80)}" r="${rand2(rnd, 1, 3.2)}" fill="hsl(${Math.floor(rnd() * 360)} 100% 75%)" fill-opacity=".75"/>`;
      if (g.deco === 'sheen') deco += `<ellipse cx="46" cy="56" rx="34" ry="14" fill="#9cc4ff" fill-opacity=".35" transform="rotate(-18 46 56)"/>`;
      body = `<ellipse cx="50" cy="52" rx="42" ry="36" fill="${fill}"/><g clip-path="url(#${id}c)">${deco}`
        + `<ellipse cx="50" cy="52" rx="42" ry="36" fill="url(#${id}s)"/></g>`
        + `<ellipse cx="36" cy="38" rx="15" ry="7" fill="#fff" fill-opacity=".5" transform="rotate(-28 36 38)"/>`
        + `<ellipse cx="50" cy="52" rx="42" ry="36" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="1"/>`;
      defs += `<radialGradient id="${id}s" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>`;
    }
  }
  // 小さなキラリ
  const sp = (g.r === 'SSR' || g.r === 'UR') ? `<path d="M80 14 L82 22 L90 24 L82 26 L80 34 L78 26 L70 24 L78 22 Z" fill="#fff" fill-opacity=".9"/>` : '';
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>${defs}</defs>${body}${sp}</svg>`;
}
const rand2 = (rnd, a, b) => (a + rnd() * (b - a)).toFixed(1);

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
let lastSqueak = 0;
function squeak() {
  const now = performance.now();
  if (now - lastSqueak < 140) return; lastSqueak = now;
  tone(rand(1800, 2600), 0, 0.06, 'triangle', 0.012);
}

/* ============================================================
   画面まわり
============================================================ */
const el = {
  stage: $('#stage'), ball: $('#ball'), inner: $('#ballInner'), core: $('#core'), slot: $('#gemSlot'), rays: $('#rays'),
  mud: $('#mud'), tease: $('#tease'), fx: $('#fx'), prompt: $('#prompt'), flash: $('#flash'),
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
  const g = c.createRadialGradient(L * .38, L * .32, L * .05, L / 2, L / 2, L * .62);
  g.addColorStop(0, '#8d6a45'); g.addColorStop(.55, '#684a2c'); g.addColorStop(1, '#3b2816');
  c.fillStyle = g; c.fillRect(0, 0, L, L);
  for (let i = 0; i < 240; i++) {
    const r = L * (.02 + rnd() * .07), dark = rnd() < .55;
    c.fillStyle = dark ? `rgba(35,22,10,${.12 + rnd() * .2})` : `rgba(195,155,105,${.08 + rnd() * .14})`;
    c.beginPath(); c.ellipse(rnd() * L, rnd() * L, r, r * (.5 + rnd() * .6), rnd() * TAU, 0, TAU); c.fill();
  }
  for (let i = 0; i < 14; i++) {
    c.fillStyle = `rgba(85,115,50,${.1 + rnd() * .12})`;
    c.beginPath(); c.ellipse(rnd() * L, rnd() * L, L * (.04 + rnd() * .06), L * (.02 + rnd() * .04), rnd() * TAU, 0, TAU); c.fill();
  }
  c.strokeStyle = 'rgba(25,15,6,.5)'; c.lineWidth = 1.2; c.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    let x = rnd() * L, y = rnd() * L; c.beginPath(); c.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += (rnd() - .5) * L * .12; y += (rnd() - .5) * L * .12; c.lineTo(x, y); }
    c.stroke();
  }
  for (let i = 0; i < 100; i++) {
    const x = rnd() * L, y = rnd() * L, r = 1 + rnd() * 3.5;
    c.fillStyle = `rgba(20,12,5,${.3 + rnd() * .3})`; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.fillStyle = 'rgba(230,200,160,.25)'; c.beginPath(); c.arc(x - r * .3, y - r * .3, r * .45, 0, TAU); c.fill();
  }
  const v = c.createRadialGradient(L / 2, L / 2, L * .36, L / 2, L / 2, L * .52);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.5)');
  c.fillStyle = v; c.fillRect(0, 0, L, L);
}

function newBall() {
  const w = Math.max(160, Math.round(el.ball.getBoundingClientRect().width));
  L = w;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  el.mud.width = el.mud.height = Math.round(L * dpr);
  mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  brushR = Math.max(16, el.stage.getBoundingClientRect().width * 0.72 * 0.085);   // 磨き布の大きさは元のまま
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
const probeInside = [];
for (let j = 0; j < PG; j++) for (let i = 0; i < PG; i++) probeInside.push(Math.hypot(i + .5 - PG / 2, j + .5 - PG / 2) < PG / 2 * 0.95);
const probeCount = probeInside.filter(Boolean).length;
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
  const m = p <= 0 ? '水晶玉をなぞって磨こう' : p < .3 ? 'キュッ キュッ…' : p < .6 ? 'いい感じ…！' : p < .85 ? '中に何かある…！' : 'もうすぐ…！！';
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
    if (d > 3) squeak();
  } else stamp(p.x, p.y);
  const R = L / 2, q = { x: (p.x - R) / R, y: (p.y - R) / R, t: p.t, s: strokeId };
  if (!lastS || lastS.s !== strokeId || Math.hypot(q.x - lastS.x, q.y - lastS.y) >= SAMPLE_STEP) { pts.push(q); lastS = q; }
  lastP = p;
  if (e && Math.random() < .3) { const sp = stagePos(e); fxSparkle(sp.x, sp.y); }
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

// 途中で中身を決めて、磨いた部分の光で予告する
function lockGem() {
  const { scores } = analyzeStyle(pts);
  const gem = pickGem(scores, Date.now(), save.cool);
  locked = gem; lockedProb = probOf(gem, scores);
  const order = RARITY[gem.r].order;
  let kind = ['n', 'r', 'sr', 'ssr', 'rainbow'][order];
  if (order <= 1 && Math.random() < 0.07) kind = 'rainbow';   // たまに虹色のブラフ
  el.tease.className = 'tease tease-' + kind;
}

function onDown(e) {
  if (state !== 'polish') return;
  e.preventDefault();
  try { el.mud.setPointerCapture(e.pointerId); } catch (err) { /* 無視 */ }
  ensureAudio();
  down = true; strokeId++; lastP = null; lastS = null;
  el.prompt.classList.add('off');
  feed(toLogical(e), e);
  pad.show = true; movePad(e);
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

/* ---------- FX（キラキラ・紙吹雪・磨き布） ---------- */
const fxc = el.fx.getContext('2d');
let fw = 0, fh = 0;
const parts = [];
const pad = { x: 0, y: 0, a: 0, show: false };
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
function starPath(c, x, y, r) {
  c.beginPath();
  for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * .3 : r, a = i * Math.PI / 4; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath();
}
let lastT = performance.now();
function fxLoop(t) {
  const dt = Math.min(.05, (t - lastT) / 1000); lastT = t;
  fxc.clearRect(0, 0, fw, fh);
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
    const r = brushR * (el.ball.getBoundingClientRect().width / L) * 1.0;
    fxc.globalAlpha = pad.a * .92;
    const g = fxc.createRadialGradient(pad.x - r * .3, pad.y - r * .35, r * .1, pad.x, pad.y, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(.55, '#d3dae6'); g.addColorStop(1, '#8590a3');
    fxc.fillStyle = g; fxc.beginPath(); fxc.arc(pad.x, pad.y, r, 0, TAU); fxc.fill();
    fxc.strokeStyle = 'rgba(255,255,255,.7)'; fxc.lineWidth = 1.5; fxc.stroke();
    fxc.globalAlpha = 1;
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
  el.codex.innerHTML = RARITY_KEYS.map((rk) => {
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
  save.last = { id: gem.id, name: gem.name, r: gem.r, score: R.score };
  writeSave();
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
  $('#rProb').textContent = '確率 ' + fmtPct(prob);
  const top = Object.entries(scores).filter(([, v]) => v >= .25).sort((a, b) => b[1] - a[1]).slice(0, 2);
  el.rStyle.textContent = top.length ? '磨きのクセ：' + top.map(([k, v]) => `${STYLE_SHORT[k]} ${Math.round(v * 100)}%`).join('・') : '磨きのクセ：なし（ふつうに磨いた）';
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
  if (!l) return '磨きガチャで遊んでる！泥だらけの水晶玉を磨いて宝石を集めよう💎 #磨きガチャ';
  return `磨きガチャで【${l.name}】(${stars(l.r)})を磨き出した！ +${fmt(l.score)}pt\nトータル ${fmt(save.total)}pt／図鑑 ${ownedCount()}/${GEMS.length} 💎 #磨きガチャ`;
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
  x.fillStyle = '#ffe9a8'; x.font = `900 60px ${font}`; x.fillText('磨きガチャ', W / 2, 90);
  if (g) {
    const svg = gemSVG(g).replace('<svg viewBox', '<svg width="512" height="512" viewBox');
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    try {
      const img = new Image(); img.src = url; await img.decode();
      x.drawImage(img, W / 2 - 230, 200, 460, 460);
    } catch (e) { /* 画像なしで続行 */ }
    URL.revokeObjectURL(url);
    x.fillStyle = col; x.font = `900 54px ${font}`; x.fillText(stars(g.r), W / 2, 745);
    x.fillStyle = '#fff'; x.font = `900 100px ${font}`; x.fillText(g.name, W / 2, 840, 960);
    x.fillStyle = '#ffe9a8'; x.font = `800 56px ${font}`; x.fillText(`+${fmt(l.score)} pt`, W / 2, 925);
  } else {
    x.fillStyle = '#fff'; x.font = `900 84px ${font}`; x.fillText('泥の水晶玉を磨いて', W / 2, 420); x.fillText('宝石を集めよう', W / 2, 530);
  }
  x.fillStyle = '#cfc8f5'; x.font = `700 38px ${font}`;
  x.fillText(`TOTAL ${fmt(save.total)} pt　／　図鑑 ${ownedCount()}/${GEMS.length}`, W / 2, 1010);
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
if (navigator.share) {
  const nb = $('#nativeBtn'); nb.hidden = false;
  nb.addEventListener('click', async () => {
    const data = { text: shareText(), url: shareUrl() };
    try {
      if (shareBlob) {
        const f = new File([shareBlob], 'migaki-gacha.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [f] })) data.files = [f];
      }
      await navigator.share(data);
    } catch (e) { /* キャンセル */ }
  });
}
$('#copyBtn').addEventListener('click', async () => {
  const txt = shareText() + '\n' + shareUrl();
  try { await navigator.clipboard.writeText(txt); toast('文章をコピーしました'); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('文章をコピーしました'); } catch (e2) { toast('コピーできませんでした'); }
    ta.remove();
  }
});

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

// テスト・調整用
window.Migaki = { analyzeStyle, gemWeights, pickGem, GEMS, RARITY, COOL_MS, get state() { return state; } };
})();
