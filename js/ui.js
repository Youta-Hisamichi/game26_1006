/* 画面（DOM）まわり。ゲームロジックは engine.js / ai.js に任せ、ここは表示と入力だけ。 */
(function () {
  'use strict';
  const R5 = globalThis.R5, RULES = R5.RULES, CARDS = R5.CARDS;

  /* ================= 小さな道具 ================= */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || (v === false && !k.startsWith('aria-'))) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else el.setAttribute(k, v === true ? (k.startsWith('aria-') ? 'true' : '') : String(v));
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  const $ = (s, root = document) => root.querySelector(s);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const thumb = (c) => 'assets/thumb/' + c.img.replace('.png', '.webp');
  const full = (c) => 'assets/card/' + c.img;
  const BACK = { 'こがらなすがた': 'unit_x3', 'はばたくもの': 'unit_x4', 'きょたい': 'unit_x5', 'よろいすがた': 'unit_x1', 'じゅつしゃ': 'unit_x2', 'おそろしいもの': 'unit_x6' };
  const backImg = (c) => 'assets/thumb/' + (BACK[c.form] || 'unit_x1') + '.webp';
  const EMPTY = 'assets/thumb/unit_empty.webp';
  const SLOT_CLS = { me: ['c-red', 'c-purple', '', '', ''], enemy: ['c-green', 'c-blue', '', '', ''] };

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  /* ================= 設定 ================= */
  const SKEY = 'r5.settings.v1';
  const settings = Object.assign({ speed: 'normal', auto: true, strictAP: false, level: 'normal' }, (() => {
    try { return JSON.parse(localStorage.getItem(SKEY) || '{}'); } catch (e) { return {}; }
  })());
  function saveSettings() { try { localStorage.setItem(SKEY, JSON.stringify(settings)); } catch (e) { /* 保存できなくても遊べる */ } }

  /* ================= 状態 ================= */
  const ui = {
    setup: { me: 0, enemy: 0, level: settings.level },
    form: null, game: null, enemyTitle: '', enemyCfg: null,
    snap: null, phase: 'plan', curRound: -1, mineDesc: [], enemyDesc: [], enemySupShown: false,
    skip: false, waiter: null, running: false, logEl: null, runId: 0,
  };
  const app = () => $('#app');
  function mount(el) { app().replaceChildren(el); window.scrollTo(0, 0); }

  /* ================= モーダル ================= */
  let modalStack = [];
  function openModal(content, opts = {}) {
    const back = h('div', { class: 'modal-back' + (opts.sheet ? ' sheet' : '') });
    const box = h('div', { class: 'modal' + (opts.sheet ? ' sheet' : ''), role: 'dialog', 'aria-modal': 'true' }, content);
    back.append(box);
    const api = {
      el: box,
      close() {
        back.remove(); modalStack = modalStack.filter((m) => m !== api);
        document.removeEventListener('keydown', onKey);
        if (opts.onClose) opts.onClose();
      },
    };
    const onKey = (e) => { if (e.key === 'Escape' && modalStack[modalStack.length - 1] === api && !opts.persistent) api.close(); };
    back.addEventListener('mousedown', (e) => { if (e.target === back && !opts.persistent) api.close(); });
    document.addEventListener('keydown', onKey);
    $('#modal-root').append(back);
    modalStack.push(api);
    const first = box.querySelector('button'); if (first) first.focus({ preventScroll: true });
    return api;
  }
  function confirmDialog(msg, okLabel, onOk, cancelLabel = 'キャンセル') {
    const m = openModal(h('div', null, h('p', { style: 'font-size:16px;margin:8px 0 16px' }, msg),
      h('div', { class: 'mfoot' },
        h('button', { class: 'btn', onclick: () => m.close() }, cancelLabel),
        h('button', { class: 'btn primary', onclick: () => { m.close(); onOk(); } }, okLabel))));
  }

  /* ================= カード詳細 ================= */
  function openZoom(cardId, unit) {
    const c = CARDS[cardId], sup = R5.SUPPORTS[c.support];
    const row = (a, b) => h('tr', null, h('td', null, a), h('td', null, b));
    const info = h('div', { class: 'zoom-info' },
      h('h2', null, c.name),
      h('table', null,
        row('コスト', c.cost), row('属性', c.attr),
        row('HP', unit ? `${unit.hp} / ${unit.maxHp}` : c.hp), row('ATK', c.atk), row('AGI', c.agi),
        row('必要AP', `こうげき${c.ap[0]} ／ 技2: ${c.ap[1]} ／ 技3: ${c.ap[2]}`)),
      h('div', { class: 'sup-desc' }, h('b', null, `${sup.icon} しえん：${c.support}`), h('br'), sup.text),
      h('p', { class: 'hint' }, '特技や特性の文章はカード画像に載っています（まだゲームには反映されていません）。'));
    const m = openModal(h('div', null,
      h('div', { class: 'zoom-modal' }, h('img', { src: full(c), alt: c.name }), info),
      h('div', { class: 'mfoot' }, h('button', { class: 'btn', onclick: () => m.close() }, 'とじる'))));
  }
  const zoomBtn = (cardId, unit) => h('button', { class: 'zoom-btn', title: 'カードを拡大', 'aria-label': 'カードを拡大',
    onclick: (e) => { e.stopPropagation(); openZoom(cardId, unit); } }, '🔍');

  /* ================= タイトル ================= */
  function screenTitle() {
    ui.runId++; // 進行中の再生を打ち切る
    if (ui.waiter) { const w = ui.waiter; ui.waiter = null; w(); }
    mount(h('section', { class: 'screen title-screen' },
      h('img', { class: 'title-art', src: 'assets/5R.jpg', alt: '5Round - The treasure of kings -' }),
      h('div', { class: 'title-menu' },
        h('button', { class: 'btn primary big', onclick: screenSetup }, 'ゲームスタート'),
        h('button', { class: 'btn', onclick: openHelp }, 'あそびかた'),
        h('button', { class: 'btn ghost', onclick: openSettings }, 'せってい')),
      h('p', { class: 'credit' }, 'ボードゲーム「5Round」ブラウザ版（試作）')));
  }

  /* ================= デッキ選択 ================= */
  function deckOpt(deck, idx, key, kind) {
    const total = R5.costOf(deck.cards.slice(0, 5));
    return h('button', { class: 'opt', 'aria-pressed': ui.setup[kind] === idx, onclick: () => { ui.setup[kind] = idx; screenSetup(); } },
      h('div', { class: 't' }, h('span', null, deck.title), h('small', null, `コスト${total}`)),
      h('div', { class: 'thumbs' }, deck.cards.slice(0, 5).map((id) => h('img', { src: thumb(CARDS[id]), alt: CARDS[id].name, loading: 'lazy' }))));
  }
  function randomOpt(kind) {
    return h('button', { class: 'opt random', 'aria-pressed': ui.setup[kind] === 'random', onclick: () => { ui.setup[kind] = 'random'; screenSetup(); } },
      h('div', { class: 't' }, h('span', null, 'ランダム'), h('small', null, '47枚から12枚')),
      h('div', { class: 'thumbs' }, '？ ？ ？ ？ ？'));
  }
  function screenSetup() {
    const lv = [['easy', 'やさしい'], ['normal', 'ふつう'], ['hard', 'つよい']];
    mount(h('section', { class: 'screen' }, h('div', { class: 'wrap' },
      h('div', { class: 'screen-head' }, h('h2', null, 'デッキを選ぼう'), h('button', { class: 'btn small ghost', onclick: openHelp }, '？ あそびかた')),
      h('div', { class: 'sec-title' }, 'あなたのデッキ'),
      h('div', { class: 'opt-grid' }, R5.PLAYER_DECKS.map((d, i) => deckOpt(d, i, d.key, 'me')), randomOpt('me')),
      h('div', { class: 'sec-title' }, '相手のデッキ'),
      h('div', { class: 'opt-grid' }, R5.CPU_DECKS.map((d, i) => deckOpt(d, i, d.key, 'enemy')), randomOpt('enemy')),
      h('div', { class: 'sec-title' }, '相手のつよさ'),
      h('div', { class: 'seg' }, lv.map(([k, label]) => h('button', { 'aria-pressed': ui.setup.level === k,
        onclick: () => { ui.setup.level = settings.level = k; saveSettings(); screenSetup(); } }, label))),
      h('p', { class: 'hint', style: 'margin-top:8px' }, '先頭の5枚が最初の編成です。次の画面で入れ替えもできます。'),
      h('div', { class: 'footer-bar' },
        h('button', { class: 'btn', onclick: screenTitle }, '← もどる'),
        h('button', { class: 'btn primary big', onclick: startFormation }, '編成へ →')))));
  }

  /* ================= 編成 ================= */
  function startFormation() {
    const s = ui.setup;
    const deck = s.me === 'random' ? R5.randomDeck(Math.random) : R5.PLAYER_DECKS[s.me].cards.slice();
    const field = s.me === 'random' ? R5.autoField(deck, Math.random, 'normal') : deck.slice(0, RULES.fieldSize);
    ui.form = { deck, field: field.slice(), sel: null };
    screenFormation();
  }
  const formCost = () => ui.form.field.reduce((t, id) => t + (id == null ? 0 : CARDS[id].cost), 0);

  function screenFormation() {
    const f = ui.form;
    const cost = formCost(), filled = f.field.filter((x) => x != null).length;
    const slotEl = (id, i) => {
      const front = i < RULES.frontSize;
      const lbl = R5.SLOT_NAMES.me[i];
      const c = id == null ? null : CARDS[id];
      return h('div', { class: 'fslot' + (front ? ' front' : '') + (f.sel === i ? ' sel' : ''), tabindex: 0, role: 'button',
        'aria-label': `${lbl}の枠${c ? '：' + c.name : '（空）'}`,
        onclick: () => onSlotClick(i), onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSlotClick(i); } } },
        h('span', { class: 'lbl pixel' }, lbl),
        c ? h('div', { class: 'ucard' }, h('img', { src: thumb(c), alt: c.name }), zoomBtn(c.id)) : h('div', { class: 'empty' }, '空き'),
        c ? h('div', { class: 'mini' }, `コスト${c.cost} ⚔${c.atk} ⚡${c.agi} HP${c.hp}`) : null);
    };
    const handCards = f.deck.filter((id) => !f.field.includes(id));
    const hand = h('div', { class: 'hand-grid' }, handCards.map((id) => {
      const c = CARDS[id];
      return h('button', { class: 'hcard', onclick: () => onHandClick(id), 'aria-label': `${c.name} コスト${c.cost}` },
        h('div', { class: 'ucard' }, h('img', { src: thumb(c), alt: c.name, loading: 'lazy' }), zoomBtn(c.id)),
        h('span', { class: 'tag' }, `コ${c.cost}・${c.support}`));
    }));
    const ok = filled === RULES.fieldSize && cost <= RULES.costLimit;
    mount(h('section', { class: 'screen' }, h('div', { class: 'wrap' },
      h('div', { class: 'screen-head' }, h('h2', null, '編成')),
      h('p', { class: 'hint' }, `場に出す${RULES.fieldSize}枚をコスト${RULES.costLimit}以内で選びます。前列（赤・紫）がこうげきを担当、後列は控えです。枠をタップして選び、手札のカードをタップで置き換え。`),
      h('div', { class: 'formation-field' }, f.field.map(slotEl)),
      h('div', { class: 'cost-meter' }, 'コスト ', h('b', { class: cost > RULES.costLimit ? 'over' : '' }, cost), ` / ${RULES.costLimit}`),
      h('div', { class: 'plan-ctl', style: 'justify-content:center' },
        h('button', { class: 'btn small', disabled: f.sel == null || f.field[f.sel] == null, onclick: () => { f.field[f.sel] = null; f.sel = null; screenFormation(); } }, '選んだ枠を外す'),
        h('button', { class: 'btn small', onclick: () => { f.field = R5.autoField(f.deck, Math.random, 'normal'); f.sel = null; screenFormation(); } }, 'おまかせ編成'),
        ui.setup.me === 'random' ? h('button', { class: 'btn small', onclick: startFormation }, 'デッキを引き直す') : null),
      h('div', { class: 'sec-title' }, `手札（残り${handCards.length}枚）　— 場に出さなかったカードは「しえん」に使えます`),
      hand,
      h('div', { class: 'footer-bar' },
        h('button', { class: 'btn', onclick: screenSetup }, '← デッキ選択へ'),
        h('button', { class: 'btn primary big', disabled: !ok, onclick: startGame }, ok ? 'バトル開始！' : (cost > RULES.costLimit ? 'コストオーバー' : '5枚そろえてね'))))));
  }
  function onSlotClick(i) {
    const f = ui.form;
    if (f.sel == null) { f.sel = i; }
    else if (f.sel === i) { f.sel = null; }
    else { const t = f.field[f.sel]; f.field[f.sel] = f.field[i]; f.field[i] = t; f.sel = null; }
    screenFormation();
  }
  function onHandClick(id) {
    const f = ui.form;
    let target = f.sel != null ? f.sel : f.field.indexOf(null);
    if (target < 0) { toast('場がいっぱいです。外す枠を先に選んでください'); return; }
    const next = f.field.slice(); next[target] = id;
    const cost = next.reduce((t, x) => t + (x == null ? 0 : CARDS[x].cost), 0);
    if (cost > RULES.costLimit) { toast(`コストが${RULES.costLimit}を超えます（${cost}）`); return; }
    f.field = next; f.sel = null;
    screenFormation();
  }

  /* ================= ゲーム開始 ================= */
  function buildEnemy() {
    const s = ui.setup;
    let deck, field, title;
    if (s.enemy === 'random') {
      deck = R5.randomDeck(Math.random); field = R5.autoField(deck, Math.random, ui.setup.level); title = 'ランダム編成';
    } else {
      const d = R5.CPU_DECKS[s.enemy];
      deck = d.cards.slice(); field = deck.slice(0, RULES.fieldSize); title = d.title;
    }
    return { deck, field, title };
  }
  function startGame() {
    const en = buildEnemy();
    ui.enemyTitle = en.title;
    ui.game = R5.createGame({ me: { deck: ui.form.deck, field: ui.form.field }, enemy: { deck: en.deck, field: en.field },
      options: { strictAP: settings.strictAP } });
    ui.runId++; ui.snap = null; ui.phase = 'plan'; ui.curRound = -1; ui.running = false;
    ui.mineDesc = []; ui.enemyDesc = []; ui.enemySupShown = false;
    buildBattle();
    log([{ cls: 'head', text: `ゲームスタート！　あなた 対 ${en.title}（${{ easy: 'やさしい', normal: 'ふつう', hard: 'つよい' }[ui.setup.level]}）` }]);
    beginPlanPhase();
  }

  function beginPlanPhase() {
    const g = ui.game;
    ui.phase = 'plan'; ui.curRound = -1; ui.mineDesc = []; ui.enemyDesc = []; ui.enemySupShown = false; ui.snap = null;
    const lv = ui.setup.level;
    const sup = R5.AI.chooseSupport(g, 'enemy', lv, Math.random);
    if (sup) R5.setSupport(g, 'enemy', sup);
    R5.AI.planTurn(g, 'enemy', lv, Math.random);
    renderBattle();
    if (R5.supportCandidates(g.sides.me).length && !g.sides.me.support) setTimeout(() => { if (ui.phase === 'plan' && !ui.game.over) openSupportSheet(true); }, 250);
  }

  /* ================= 戦闘画面（骨組み） ================= */
  function buildBattle() {
    ui.logEl = h('div', { class: 'log', id: 'log', 'aria-label': 'バトルログ' });
    mount(h('section', { class: 'screen' }, h('div', { class: 'battle' },
      h('div', { class: 'b-hdr', id: 'bHdr' }),
      h('div', { id: 'sideEnemy' }),
      h('div', { class: 'side-col', id: 'sideCol' },
        h('div', { class: 'card-box', id: 'planBox' }),
        h('div', { class: 'card-box logbox' }, h('h3', null, 'ログ'), h('div', { id: 'stageCtl' }), ui.logEl)),
      h('div', { id: 'sideMe' }))));
  }
  function log(lines) {
    for (const l of lines) ui.logEl.append(h('p', { class: l.cls, html: l.text }));
    ui.logEl.scrollTop = ui.logEl.scrollHeight;
  }
  const snapNow = () => ui.snap || R5.snapshot(ui.game);
  const unitByUid = (uid) => { for (const k of ['me', 'enemy']) { const u = ui.game.sides[k].units.find((x) => x.uid === uid); if (u) return u; } return null; };

  function renderBattle() {
    if (!$('#bHdr')) return;
    const snap = snapNow();
    renderHeader(snap);
    $('#sideEnemy').replaceChildren(renderSide('enemy', snap));
    $('#sideMe').replaceChildren(renderSide('me', snap));
    renderPlanBox(snap);
    renderStageCtl();
  }

  function renderStageCtl() {
    const box = $('#stageCtl'), g = ui.game;
    if (!box) return;
    const battle = ui.phase === 'battle' && !g.over;
    $('#sideCol').classList.toggle('is-battle', battle);
    if (!battle) { box.replaceChildren(); return; }
    box.replaceChildren(h('div', { class: 'stage-ctl' },
      h('button', { class: 'btn primary', id: 'nextBtn', disabled: !ui.waiter, onclick: onNext }, '次へ ▶'),
      h('button', { class: 'btn', onclick: () => { settings.auto = !settings.auto; saveSettings(); if (settings.auto) onNext(); renderStageCtl(); } }, `オート ${settings.auto ? 'ON' : 'OFF'}`),
      h('button', { class: 'btn', onclick: () => { ui.skip = true; onNext(); } }, 'スキップ ⏭')));
  }

  function renderHeader(snap) {
    const turn = Math.min(snap.turn, RULES.turns);
    const label = ui.game.over ? 'ゲームセット' : ui.phase === 'plan' ? '行動を計画しよう' : `バトル中（${ui.curRound + 1}ラウンド目）`;
    $('#bHdr').replaceChildren(
      h('span', { class: 'turn' }, `ターン ${turn} / ${RULES.turns}`),
      h('span', { class: 'turn-pips', 'aria-hidden': 'true' }, Array.from({ length: RULES.turns }, (_, i) => h('i', { class: i + 1 < turn ? 'done' : i + 1 === turn ? 'now' : '' }))),
      h('span', { class: 'muted' }, label),
      h('span', { class: 'grow' }),
      h('button', { class: 'btn small ghost', onclick: openHelp }, '？'),
      h('button', { class: 'btn small ghost', onclick: openSettings }, '⚙'),
      h('button', { class: 'btn small ghost', onclick: () => confirmDialog('ゲームをやめてタイトルに戻りますか？', 'やめる', screenTitle) }, 'やめる'));
  }

  const FLAG_ICON = { sense: ['👁', 'センス：次のこうげきを回避'], hit: ['🎯', 'ヒット：次のこうげきの命中+3'], brk: ['💥', 'ブレイク：次のこうげきATK+2'], parry: ['🛡', 'パリィ：次のダメージ-2'], quick: ['⚡', 'クイック：AGI・命中・CT+1'] };

  function renderSide(key, snap) {
    const sd = snap[key], g = ui.game, side = g.sides[key];
    const isMe = key === 'me';
    const planning = ui.phase === 'plan' && !g.over;
    const spUse = isMe && planning ? R5.planSpend(side) : 0;

    const flags = h('span', { class: 'flags' }, Object.entries(sd.flags).filter(([, v]) => v).map(([k]) => h('span', { title: FLAG_ICON[k][1] }, FLAG_ICON[k][0])));
    const supUnit = sd.support ? unitByUid(sd.support) : null;
    let supEl;
    if (isMe) {
      const cands = R5.supportCandidates(side).length;
      supEl = h('button', { class: 'supbtn', disabled: !planning, onclick: () => openSupportSheet(false), title: 'しえんユニットを選ぶ' },
        supUnit ? h('img', { src: thumb(supUnit.card), alt: '' }) : h('img', { src: EMPTY, alt: '' }),
        h('span', { class: 'sn' }, 'しえん', h('br'), supUnit ? `${R5.SUPPORTS[supUnit.card.support].icon}${supUnit.card.support}${supUnit.used ? '（使用済）' : ''}` : `選ぶ（控え${cands}）`));
    } else {
      const revealed = ui.enemySupShown && supUnit;
      supEl = h('span', { class: 'supbtn' },
        h('img', { src: supUnit ? (revealed ? thumb(supUnit.card) : backImg(supUnit.card)) : EMPTY, alt: '' }),
        h('span', { class: 'sn' }, 'しえん', h('br'), revealed ? `${R5.SUPPORTS[supUnit.card.support].icon}${supUnit.card.support}` : supUnit ? '？？？' : 'なし'));
    }
    const head = h('div', { class: 'sidehead' },
      h('span', { class: 'who' }, isMe ? 'あなた' : `相手：${ui.enemyTitle}`),
      h('span', { class: 'res', title: 'AP：この数値以上の技が使える。ユニットが倒れる／ターンが進むと増える' }, h('img', { src: 'assets/AP.png', alt: 'AP' }), `AP ${sd.AP}`),
      h('span', { class: 'res', title: 'SP：ガードや強いこうげきに使う。回復しない' }, h('img', { src: 'assets/SP.png', alt: 'SP' }), `SP ${sd.SP}`, spUse ? h('small', null, `→${sd.SP - spUse}`) : null),
      flags, supEl);

    const slots = sd.field.map((fu, i) => {
      const c = CARDS[fu.cardId], front = i < RULES.frontSize;
      const ratio = fu.hp / fu.maxHp;
      const unit = unitByUid(fu.uid);
      const lbl = R5.SLOT_NAMES[key][i];
      return h('div', { class: 'slot ' + (front ? 'front' : 'back') },
        h('span', { class: 'lbl ' + SLOT_CLS[key][i] }, lbl),
        h('div', { class: 'ucard' + (fu.dead ? ' dead' : ''), dataset: { uid: fu.uid }, tabindex: 0, role: 'button', 'aria-label': `${c.name} HP${fu.hp}/${fu.maxHp}`,
          onclick: () => openZoom(c.id, { hp: fu.hp, maxHp: fu.maxHp }), onkeydown: (e) => { if (e.key === 'Enter') openZoom(c.id, { hp: fu.hp, maxHp: fu.maxHp }); } },
          h('img', { src: thumb(c), alt: c.name })),
        h('div', { class: 'hpbar', 'aria-hidden': 'true' }, h('i', { class: ratio <= 0.34 ? 'low' : ratio <= 0.67 ? 'mid' : '', style: `width:${Math.max(0, ratio * 100)}%` })),
        h('div', { class: 'hptext' }, fu.dead ? '戦闘不能' : `HP ${fu.hp}/${fu.maxHp}`),
        h('div', { class: 'mini' }, `⚔${c.atk} ⚡${c.agi}`));
    });
    const board = h('div', { class: 'board' }, slots.slice(0, 2), h('div', { class: 'gap' }), slots.slice(2));
    return h('div', { class: 'sidebox ' + key, dataset: { side: key } }, head, board);
  }

  /* ================= 計画ボックス（右側） ================= */
  function renderPlanBox(snap) {
    const g = ui.game, me = g.sides.me;
    const planning = ui.phase === 'plan' && !g.over;
    const rows = [];
    for (let r = 0; r < RULES.rounds; r++) {
      let mine;
      if (planning) {
        const a = me.plan[r];
        const d = a ? R5.describeAction(g, 'me', a, r) : null;
        mine = h('button', { class: 'pcell mine' + (a ? '' : ' unset'), onclick: () => openActionSheet(r), 'aria-label': `${r + 1}ラウンド目の行動を選ぶ` },
          h('span', { class: 'ic' }, d ? d.icon : '＋'), h('span', { class: 'tx' }, d ? h('b', null, d.short) : 'えらぶ', d && d.route ? h('small', null, d.route) : null));
      } else {
        const d = ui.mineDesc[r];
        mine = h('div', { class: 'pcell mine' }, h('span', { class: 'ic' }, d ? d.icon : '·'), h('span', { class: 'tx' }, d ? h('b', null, d.short) : '—', d && d.route ? h('small', null, d.route) : null));
        mine.style.cssText = 'background:#2a1f20;border-color:#6a3a38';
      }
      const ed = ui.enemyDesc[r];
      const theirs = h('div', { class: 'pcell theirs' + (ed ? '' : ' hidden') }, h('span', { class: 'ic' }, ed ? ed.icon : '？'),
        h('span', { class: 'tx' }, ed ? h('b', null, ed.short) : (planning ? '相手：ひみつ' : '相手：？'), ed && ed.route ? h('small', null, ed.route) : null));
      const req = RULES.roundAgiReq[r];
      rows.push(h('li', { class: 'prow' + (ui.phase === 'battle' && r === ui.curRound ? ' now' : '') + (ui.phase === 'battle' && r < ui.curRound ? ' done' : '') },
        h('div', { class: 'rno' }, `${r + 1}R`, h('small', null, req ? `AGI${req}+` : '制限なし')),
        h('div', { class: 'cells' }, mine, theirs)));
    }
    const box = $('#planBox');
    const kids = [h('h3', null, planning ? '行動プラン' : 'ラウンド'),
      planning ? h('p', { class: 'hint', style: 'margin:0 0 8px' }, '1R＝AGI6以上、2R＝AGI4以上の前列ユニットだけこうげきできます。') : null,
      h('ol', { class: 'plan' }, rows)];

    if (planning) {
      const spend = R5.planSpend(me), left = me.SP - spend;
      const unset = me.plan.filter((a) => !a).length;
      kids.push(h('p', { class: 'sp-note' }, `SP消費予定 `, h('b', null, spend), `（残り${left}）　こうげきは1ターン2回まで／こうげき2=SP1・こうげき3=SP2`),
        h('div', { class: 'plan-ctl' },
          h('button', { class: 'btn', onclick: autoPlanMe, title: 'AIにこのターンの行動を考えてもらう' }, 'おまかせ'),
          h('button', { class: 'btn', onclick: () => { R5.clearPlan(g, 'me'); renderBattle(); }, disabled: me.plan.every((a) => !a) }, 'クリア'),
          h('button', { class: 'btn primary', onclick: onStartTurn }, 'ターン開始 ▶')));
      if (unset) kids.push(h('p', { class: 'hint' }, `未設定が${unset}つ（「なにもしない」になります）`));
    }
    box.replaceChildren(...kids.filter(Boolean));
  }

  function autoPlanMe() {
    const g = ui.game;
    R5.AI.planTurn(g, 'me', 'normal', Math.random);
    renderBattle(); toast('おまかせで行動を決めました');
  }
  function onNext() { if (ui.waiter) { const w = ui.waiter; ui.waiter = null; w(); } }

  /* ================= 行動の選択シート ================= */
  function openActionSheet(r) {
    const g = ui.game, me = g.sides.me, en = g.sides.enemy;
    const opts = R5.listOptions(g, 'me', r);
    const cur = me.plan[r] && me.plan[r].key;
    const view = R5.planView(me, r);
    let m;
    const pick = (key) => { R5.setPlan(g, 'me', r, key); m.close(); renderBattle(); };
    const optBtn = (o, extra) => {
      const d = R5.describeAction(g, 'me', o, r);
      return h('button', { class: 'act-btn' + (o.key === cur ? ' sel' : ''), onclick: () => pick(o.key) },
        h('b', null, `${d.icon} ${extra && extra.title || d.title}`), h('small', null, extra && extra.sub != null ? extra.sub : d.detail));
    };
    const groups = [];

    // こうげき
    const atks = opts.filter((o) => o.kind === 'atk');
    const g1 = h('div', { class: 'act-group' }, h('h4', null, '⚔ こうげき'));
    if (!atks.length) {
      let why = 'こうげきできません';
      if (view.atk >= RULES.maxAttacksPerTurn) why = `こうげきは1ターン${RULES.maxAttacksPerTurn}回までです`;
      else if (!view.order.slice(0, RULES.frontSize).some((u) => R5.alive(u) && u.card.agi >= RULES.roundAgiReq[r])) why = `前列にAGI${RULES.roundAgiReq[r]}以上のユニットがいません（${r + 1}ラウンド目の条件）`;
      else if (!en.field.slice(0, RULES.frontSize).some(R5.alive)) why = '相手の前列にこうげき対象がいません';
      g1.append(h('p', { class: 'why' }, why));
    } else {
      for (let from = 0; from < RULES.frontSize; from++) for (let to = 0; to < RULES.frontSize; to++) {
        const set = atks.filter((o) => o.from === from && o.to === to);
        if (!set.length) continue;
        const d = R5.describeAction(g, 'me', set[0], r);
        const row = h('div', { class: 'act-row' }, h('div', { class: 'route' }, d.detail));
        const u = view.order[from];
        const sub = { 1: '通常', 2: '防御+2・SP1', 3: 'ATK+2・SP2' };
        for (let lv = 1; lv <= 3; lv++) {
          const o = set.find((x) => x.lv === lv);
          if (o) row.append(h('button', { class: 'act-btn' + (o.key === cur ? ' sel' : ''), onclick: () => pick(o.key) }, h('b', null, `こうげき${lv}`), h('small', null, sub[lv])));
          else {
            const need = lv === 1 ? (g.opts.strictAP ? u.card.ap[0] : 1) : u.card.ap[lv - 1];
            const why = me.AP < need ? `AP${need}が必要` : 'SP不足';
            row.append(h('button', { class: 'act-btn', disabled: true }, h('b', null, `こうげき${lv}`), h('small', null, why)));
          }
        }
        g1.append(row);
      }
    }
    groups.push(g1);

    // ガード
    const guards = opts.filter((o) => o.kind === 'guard');
    const gg = h('div', { class: 'act-group' }, h('h4', null, '🛡 ガード（SPを使って防御）'));
    if (guards.length) gg.append(h('div', { class: 'act-grid' }, guards.map((o) => optBtn(o, { title: `ガード×${o.n}`, sub: `このラウンドの被ダメ-${o.n}・SP${o.n}` }))));
    else gg.append(h('p', { class: 'why' }, 'SPが足りません'));
    groups.push(gg);

    // いどう
    const moves = opts.filter((o) => o.kind === 'move');
    const gm = h('div', { class: 'act-group' }, h('h4', null, '↔ いどう（前列と後列を入れ替え）'));
    if (moves.length) gm.append(h('div', { class: 'act-grid' }, moves.map((o) => optBtn(o, { title: R5.describeAction(g, 'me', o, r).route }))));
    else gm.append(h('p', { class: 'why' }, '入れ替えられるユニットがいません'));
    groups.push(gm);

    // しえん
    const sups = opts.filter((o) => o.kind === 'sup');
    const gs = h('div', { class: 'act-group' }, h('h4', null, '✨ しえん（1ターン1回・使うとカードは消費）'));
    if (sups.length) gs.append(h('div', { class: 'act-grid' }, sups.map((o) => optBtn(o))));
    else gs.append(h('p', { class: 'why' }, me.support ? (view.sup ? 'このターンはもう使っています' : '') : 'しえんユニットが選ばれていません（上のしえん欄から選べます）'));
    groups.push(gs);

    groups.push(h('div', { class: 'act-group' }, h('h4', null, '… なにもしない'), h('div', { class: 'act-grid' }, optBtn(opts.find((o) => o.kind === 'pass')))));

    m = openModal(h('div', null, h('h2', null, `${r + 1}ラウンド目の行動`), ...groups,
      h('div', { class: 'mfoot' }, cur ? h('button', { class: 'btn', onclick: () => pick(null) }, 'この行動を取り消す') : null,
        h('button', { class: 'btn', onclick: () => m.close() }, 'とじる'))), { sheet: true });
  }

  /* ================= しえんユニット選択 ================= */
  function openSupportSheet(auto) {
    const g = ui.game, me = g.sides.me;
    if (ui.phase !== 'plan') return;
    const cands = R5.supportCandidates(me);
    const cur = me.support;
    const list = cur && !cands.includes(cur) ? [cur, ...cands] : cands;
    let m;
    const pick = (uid) => { R5.setSupport(g, 'me', uid); m.close(); renderBattle(); };
    const items = list.map((u) => {
      const s = R5.SUPPORTS[u.card.support];
      return h('button', { class: 'sup-item' + (cur === u ? ' sel' : ''), onclick: () => pick(u.uid) },
        h('img', { src: thumb(u.card), alt: u.card.name }),
        h('div', null, h('div', { class: 'nm' }, u.card.name), h('div', { class: 'ab' }, h('b', null, `${s.icon}${u.card.support}`), h('br'), s.text), h('div', { class: 'ab' }, `AGI${u.card.agi}`)));
    });
    m = openModal(h('div', null, h('h2', null, `${Math.min(g.turn, RULES.turns)}ターン目のしえんユニット`),
      h('p', { class: 'hint' }, 'このターンに「しえん」として使うカードを控えから1枚選びます。しえんの行動を実行すると、そのカードは消費されます（使わなければ控えに残ります）。AGIは先行の判定に使われます。'),
      list.length ? h('div', { class: 'sup-grid' }, items) : h('p', null, '控えのカードがありません。'),
      h('div', { class: 'mfoot' }, h('button', { class: 'btn', onclick: () => pick(null) }, 'しえんを使わない'),
        h('button', { class: 'btn', onclick: () => m.close() }, 'とじる'))), { sheet: true });
  }

  /* ================= ターン実行・再生 ================= */
  function onStartTurn() {
    const g = ui.game, me = g.sides.me;
    const unset = me.plan.filter((a) => !a).length;
    if (unset) confirmDialog(`行動が未設定のラウンドが${unset}つあります。「なにもしない」になりますが、開始しますか？`, '開始する', runTurn, 'もどる');
    else runTurn();
  }

  function waitStep(ms) {
    if (ui.skip) return Promise.resolve();
    if (settings.auto) return sleep(ms);
    return new Promise((res) => { ui.waiter = res; renderPlanBoxOnly(); });
  }
  function renderPlanBoxOnly() { if (ui.game) { renderPlanBox(snapNow()); renderStageCtl(); } }

  async function runTurn() {
    if (ui.running) return;
    const g = ui.game, myRun = ++ui.runId;
    ui.running = true; ui.skip = false;
    const me = g.sides.me;
    me.plan = me.plan.map((a) => a || { kind: 'pass', key: 'pass' });
    ui.mineDesc = me.plan.map((a, r) => R5.describeAction(g, 'me', a, r));
    ui.enemyDesc = [];
    R5.startBattle(g);
    ui.phase = 'battle';
    const spBefore = snapNow();
    renderBattle();
    try {
      for (let r = 0; r < RULES.rounds && !g.over; r++) {
        ui.curRound = r;
        const res = R5.playRound(g);
        await playSteps(res.steps, myRun);
        if (ui.runId !== myRun) return;
        if (res.over || res.turnEnded) break;
      }
    } finally { if (ui.runId === myRun) ui.running = false; }
    if (ui.runId !== myRun) return;
    ui.snap = null; ui.skip = false;
    if (g.over) { ui.phase = 'over'; renderBattle(); showResult(); }
    else beginPlanPhase();
  }

  async function playSteps(steps, myRun) {
    const base = { slow: 1800, normal: 1150, fast: 600 }[settings.speed] || 1150;
    for (const st of steps) {
      if (ui.runId !== myRun) return;
      ui.snap = st.snap;
      for (const fx of st.fx) if (fx.t === 'declare' && fx.side === 'enemy') ui.enemyDesc[fx.round] = fx.desc;
      for (const fx of st.fx) if (fx.t === 'sup' && fx.side === 'enemy') ui.enemySupShown = true;
      renderBattle();
      log(st.lines);
      if (!ui.skip) applyFx(st.fx);
      await waitStep(base + Math.min(st.lines.length, 5) * 170);
    }
  }

  function cardNode(uid) { return document.querySelector(`.ucard[data-uid="${uid}"]`); }
  function popup(uid, text, cls) {
    const n = cardNode(uid); if (!n) return;
    n.append(h('span', { class: 'pop ' + cls }, text));
    setTimeout(() => n.querySelector('.pop') && n.querySelector('.pop').remove(), 1050);
  }
  function animate(node, cls, ms) { if (!node) return; node.classList.add(cls); setTimeout(() => node.classList.remove(cls), ms); }
  function applyFx(list) {
    for (const fx of list) {
      switch (fx.t) {
        case 'atk': animate(cardNode(fx.from), fx.side === 'me' ? 'fx-lunge-up' : 'fx-lunge-down', 520); break;
        case 'dmg':
          setTimeout(() => {
            animate(cardNode(fx.uid), 'fx-shake', 420);
            popup(fx.uid, fx.amount > 0 ? `-${fx.amount}${fx.crit ? '!' : ''}` : '0', fx.amount > 0 ? (fx.crit ? 'crit' : 'dmg') : 'miss');
          }, 260);
          break;
        case 'miss': setTimeout(() => popup(fx.uid, 'MISS', 'miss'), 260); break;
        case 'heal': animate(cardNode(fx.uid), 'fx-heal', 600); popup(fx.uid, `+${fx.amount}`, 'heal'); break;
        case 'sup': case 'guard': case 'move': animate(document.querySelector(`.sidebox[data-side="${fx.side}"]`), 'pulse', 700); break;
      }
    }
  }

  /* ================= 結果 ================= */
  function showResult() {
    const g = ui.game, r = g.result;
    const cls = r.winner === 'me' ? 'win' : r.winner === 'enemy' ? 'lose' : 'draw';
    const text = r.winner === 'me' ? '勝利！' : r.winner === 'enemy' ? '敗北…' : '引き分け';
    const reason = r.reason === 'wipeout' ? (r.winner === 'draw' ? '両者全滅' : r.winner === 'me' ? '相手のユニットを全滅させた！' : 'ユニットが全滅してしまった…') : '5ターン終了：生き残ったユニットのコスト合計で勝負';
    log([{ cls: 'head', text: `結果：${text}（あなた${r.me} 対 相手${r.enemy}）` }]);
    const m = openModal(h('div', { class: 'result-box' },
      h('div', { class: 'verdict ' + cls }, text), h('p', { class: 'muted' }, reason),
      h('div', { class: 'score-row' }, h('span', null, 'あなた ', h('b', null, r.me)), h('span', null, '相手 ', h('b', null, r.enemy))),
      h('div', { class: 'mfoot', style: 'justify-content:center' },
        h('button', { class: 'btn primary', onclick: () => { m.close(); startGame(); } }, 'もう一度（同じ編成）'),
        h('button', { class: 'btn', onclick: () => { m.close(); screenFormation(); } }, '編成しなおす'),
        h('button', { class: 'btn', onclick: () => { m.close(); screenTitle(); } }, 'タイトルへ'),
        h('button', { class: 'btn ghost', onclick: () => m.close() }, '盤面を見る'))), { persistent: false });
  }

  /* ================= あそびかた・設定 ================= */
  function openHelp() {
    const t = h('div', { class: 'help', html: `
      <h2>あそびかた</h2>
      <h3>めざすもの</h3>
      <p>5ターン（1ターン＝5ラウンド）で相手のユニットを倒し、終了時に<b>生き残ったユニットのコスト合計</b>が大きい方が勝ち。相手を全滅させれば即勝利です。</p>
      <h3>1ターンの流れ</h3>
      <ul>
        <li><b>編成</b>：12枚のデッキから5枚をコスト15以内で場に出します。前列2枚（赤・紫）が戦い、後列3枚は控えの戦力です。</li>
        <li><b>しえん</b>：場に出していないカード1枚を「しえんユニット」にします。</li>
        <li><b>計画</b>：1〜5ラウンドの行動を先に全部決めます（相手の計画は見えません）。</li>
        <li><b>バトル</b>：5ラウンドぶんが順に実行されます。</li>
      </ul>
      <h3>行動</h3>
      <table>
        <tr><th>行動</th><th>内容</th></tr>
        <tr><td>⚔ こうげき1</td><td>前列のユニットで相手の前列を攻撃。命中判定は2D6で相手のAGI以上なら命中。</td></tr>
        <tr><td>⚔ こうげき2</td><td>こうげき＋このラウンドの自軍の防御+2（SP1・必要APあり）</td></tr>
        <tr><td>⚔ こうげき3</td><td>ATK+2のこうげき（SP2・必要APあり）</td></tr>
        <tr><td>🛡 ガード×N</td><td>SPをN使い、このラウンドの被ダメージを-N</td></tr>
        <tr><td>↔ いどう</td><td>前列と後列のユニットを入れ替える</td></tr>
        <tr><td>✨ しえん</td><td>しえんユニットの効果を発動（1ターン1回、使うとカードは消費）</td></tr>
      </table>
      <p>こうげきは<b>1ターン2回まで</b>。1ラウンド目はAGI6以上、2ラウンド目はAGI4以上のユニットしかこうげきできません。</p>
      <h3>ダメージ</h3>
      <p>ダメージ＝ATK − DEF（ガードなど）。2D6が12以上（クイック中は11以上）で<b>クリティカル</b>、DEFを無視します。ユニットが倒れると、倒れた側のAPが+1されます。</p>
      <h3>AP と SP</h3>
      <ul>
        <li><b>AP</b>：技に必要な数値（カードの赤丸）。AP以下の技が使えます。ターンごとに+1、ユニットが倒れても+1（最大9）。</li>
        <li><b>SP</b>：最初は5。ガードや強いこうげきで消費し、回復しません。使いどころが大事！</li>
      </ul>
      <h3>しえんの種類</h3>
      <table>${Object.entries(R5.SUPPORTS).map(([k, v]) => `<tr><td>${v.icon} ${k}</td><td>${v.text}</td></tr>`).join('')}</table>
      <h3>行動の順番</h3>
      <p>同じラウンドの行動は <b>ガード → いどう → しえん → こうげき</b> の順。同じ種類が重なったらAGIが高い方が先（同値なら2D6）。</p>
      <div class="mfoot"><button class="btn primary" id="helpClose">とじる</button></div>` });
    const m = openModal(t);
    t.querySelector('#helpClose').addEventListener('click', () => m.close());
  }

  function openSettings() {
    const seg = (key, items) => h('div', { class: 'seg' }, items.map(([v, label]) => h('button', { 'aria-pressed': settings[key] === v,
      onclick: (e) => { settings[key] = v; saveSettings(); e.currentTarget.parentNode.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false')); e.currentTarget.setAttribute('aria-pressed', 'true'); } }, label)));
    const sw = (key, onchange) => h('input', { type: 'checkbox', class: 'switch', ...(settings[key] ? { checked: true } : {}),
      onchange: (e) => { settings[key] = e.target.checked; saveSettings(); if (onchange) onchange(); } });
    const m = openModal(h('div', null, h('h2', null, 'せってい'),
      h('div', { class: 'setting-row' }, h('div', null, 'バトルの速さ', h('small', null, 'オート再生時の間隔')), seg('speed', [['slow', 'ゆっくり'], ['normal', 'ふつう'], ['fast', 'はやい']])),
      h('div', { class: 'setting-row' }, h('div', null, 'オート再生', h('small', null, 'OFFにすると「次へ」で1歩ずつ進みます')), sw('auto', renderPlanBoxOnly)),
      h('div', { class: 'setting-row' }, h('div', null, 'カードのAPコストを厳密に適用', h('small', null, 'ONだと「こうげき1」にもカードのAP（赤丸）が必要になります。次のゲームから有効')), sw('strictAP')),
      h('div', { class: 'mfoot' }, h('button', { class: 'btn primary', onclick: () => m.close() }, 'とじる'))));
  }

  /* ================= 起動 ================= */
  window.R5UI = { ui, screenTitle }; // デバッグ・テスト用
  screenTitle();
})();
