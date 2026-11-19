/* 5Round ゲームエンジン（画面に依存しない純粋なロジック）
 *
 * 流れ: createGame → [setSupport / setPlan で5ラウンド分の行動を計画] → startBattle
 *       → playRound を5回（1ターン） → 次ターンの計画… → 5ターンで終了
 *
 * 画面側は playRound が返す steps（ログ行・演出イベント・盤面スナップショット）を順に再生するだけ。
 * 元の R5.html は画面とロジックが混在していたため、ここで全面的に切り出して書き直している。
 */
(function (root) {
  'use strict';
  const R5 = (root.R5 = root.R5 || {});
  const RULES = R5.RULES;
  const other = (k) => (k === 'me' ? 'enemy' : 'me');
  const WHO = { me: 'あなた', enemy: '相手' };

  /* ---------- 乱数 ---------- */
  function makeRng(seed) { // テスト用の再現可能な乱数（mulberry32）
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rng) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ---------- 編成ヘルパー ---------- */
  const costOf = (ids) => ids.reduce((s, id) => s + R5.CARDS[id].cost, 0);

  // 12枚のランダムデッキ
  function randomDeck(rng) {
    return shuffle(R5.CARDS.map((c) => c.id), rng).slice(0, RULES.deckSize);
  }

  // デッキから「コスト上限内で強い5枚」を選び、前列2＋後列3に並べる
  function autoField(deck, rng, level) {
    const cards = deck.map((id) => R5.CARDS[id]);
    let best = null, bestScore = -1;
    const tries = level === 'easy' ? 1 : 60;
    for (let t = 0; t < tries; t++) {
      const pick = shuffle(cards, rng).slice(0, RULES.fieldSize);
      const cost = pick.reduce((s, c) => s + c.cost, 0);
      if (cost > RULES.costLimit) continue;
      const score = pick.reduce((s, c) => s + c.hp * 0.6 + c.atk * 1.2 + c.agi * 0.5, 0) + cost * 0.3;
      if (score > bestScore) { bestScore = score; best = pick; }
    }
    if (!best) { // 念のため: 安い順
      best = cards.slice().sort((a, b) => a.cost - b.cost).slice(0, RULES.fieldSize);
    }
    return orderField(best.map((c) => c.id));
  }

  // 前列にはAGIが高く丈夫なユニットを置く
  function orderField(ids) {
    const s = (id) => { const c = R5.CARDS[id]; return c.agi * 2 + c.hp * 0.5 + c.atk; };
    const sorted = ids.slice().sort((a, b) => s(b) - s(a));
    return sorted;
  }

  /* ---------- ゲーム生成 ---------- */
  function makeSide(key, cfg) {
    const units = cfg.deck.map((cid, i) => {
      const card = R5.CARDS[cid];
      return { uid: key[0] + i, side: key, card, hp: card.hp, maxHp: card.hp, dead: false, used: false };
    });
    const taken = new Set();
    const field = cfg.field.map((cid) => {
      const u = units.find((x) => x.card.id === cid && !taken.has(x.uid));
      if (!u) throw new Error('field card not in deck: ' + cid);
      taken.add(u.uid);
      return u;
    });
    return {
      key, units, field,
      AP: RULES.startAP, SP: RULES.startSP,
      support: null,
      plan: new Array(RULES.rounds).fill(null),
      flags: freshFlags(),
      roundDef: 0,
    };
  }
  function freshFlags() { return { sense: false, hit: false, brk: false, parry: false, quick: false }; }

  function createGame(cfg) {
    for (const k of ['me', 'enemy']) {
      const c = cfg[k];
      if (c.deck.length !== RULES.deckSize) throw new Error(k + ' deck must have ' + RULES.deckSize + ' cards');
      if (c.field.length !== RULES.fieldSize) throw new Error(k + ' field must have ' + RULES.fieldSize + ' cards');
      if (costOf(c.field) > RULES.costLimit) throw new Error(k + ' cost over limit');
    }
    return {
      turn: 1, round: 0, phase: 'plan', over: false, result: null,
      opts: Object.assign({ strictAP: false }, cfg.options || {}),
      rng: cfg.rng || Math.random,
      sides: { me: makeSide('me', cfg.me), enemy: makeSide('enemy', cfg.enemy) },
    };
  }

  /* ---------- 参照 ---------- */
  const alive = (u) => !!u && !u.dead && u.hp > 0;
  const aliveCount = (side) => side.field.filter(alive).length;
  const bench = (side) => side.units.filter((u) => !side.field.includes(u) && !u.used && u !== side.support);
  const supportCandidates = (side) => bench(side);

  /* ---------- 計画（プランニング） ---------- */
  const SP_COST_LV = [0, 0, 1, 2];
  function actionCost(a) {
    if (!a) return 0;
    if (a.kind === 'atk') return SP_COST_LV[a.lv];
    if (a.kind === 'guard') return a.n;
    return 0;
  }
  // r ラウンド目の直前までの計画を反映した「想定盤面」
  function planView(side, upto) {
    const order = side.field.slice();
    let sp = side.SP, atk = 0, sup = false;
    for (let i = 0; i < upto; i++) {
      const a = side.plan[i];
      if (!a) continue;
      sp -= actionCost(a);
      if (a.kind === 'atk') atk++;
      if (a.kind === 'sup') sup = true;
      if (a.kind === 'move') { const t = order[a.a]; order[a.a] = order[a.b]; order[a.b] = t; }
    }
    return { order, sp, atk, sup };
  }

  function actionKey(a) {
    switch (a.kind) {
      case 'atk': return 'atk:' + a.from + ':' + a.to + ':' + a.lv;
      case 'guard': return 'guard:' + a.n;
      case 'move': return 'move:' + a.a + ':' + a.b;
      case 'sup': return a.target == null ? 'sup' : 'sup:' + a.target;
      default: return 'pass';
    }
  }
  const mk = (o) => { o.key = actionKey(o); return o; };

  function apNeeded(game, unit, lv) {
    if (lv === 1) return game.opts.strictAP ? unit.card.ap[0] : 1;
    return unit.card.ap[lv - 1];
  }

  // その時点で選べる行動の一覧
  function listOptions(game, sideKey, r) {
    const s = game.sides[sideKey], o = game.sides[other(sideKey)];
    const v = planView(s, r);
    const out = [mk({ kind: 'pass' })];

    if (v.atk < RULES.maxAttacksPerTurn) {
      const req = RULES.roundAgiReq[r];
      for (let from = 0; from < RULES.frontSize; from++) {
        const u = v.order[from];
        if (!alive(u) || u.card.agi < req) continue;
        for (let to = 0; to < RULES.frontSize; to++) {
          if (!alive(o.field[to])) continue;
          for (let lv = 1; lv <= 3; lv++) {
            if (s.AP < apNeeded(game, u, lv)) continue;
            if (v.sp < SP_COST_LV[lv]) continue;
            out.push(mk({ kind: 'atk', from, to, lv }));
          }
        }
      }
    }
    for (let n = 1; n <= v.sp; n++) out.push(mk({ kind: 'guard', n }));
    for (let a = 0; a < RULES.frontSize; a++) {
      for (let b = RULES.frontSize; b < RULES.fieldSize; b++) {
        if (alive(v.order[a]) && alive(v.order[b])) out.push(mk({ kind: 'move', a, b }));
      }
    }
    if (s.support && !v.sup) {
      if (s.support.card.support === 'ヒール') {
        for (let t = 0; t < RULES.frontSize; t++) if (alive(v.order[t])) out.push(mk({ kind: 'sup', target: t }));
      } else {
        out.push(mk({ kind: 'sup', target: null }));
      }
    }
    return out;
  }

  // 後続の計画が成り立たなくなったものを取り消す
  function validatePlan(game, sideKey) {
    const s = game.sides[sideKey];
    for (let r = 0; r < RULES.rounds; r++) {
      if (!s.plan[r]) continue;
      if (!listOptions(game, sideKey, r).some((o) => o.key === s.plan[r].key)) s.plan[r] = null;
    }
  }
  // key が null なら取り消し。成功すれば true
  function setPlan(game, sideKey, r, key) {
    if (game.phase !== 'plan') return false;
    const s = game.sides[sideKey];
    if (key == null) { s.plan[r] = null; validatePlan(game, sideKey); return true; }
    const opt = listOptions(game, sideKey, r).find((o) => o.key === key);
    if (!opt) return false;
    s.plan[r] = opt;
    validatePlan(game, sideKey);
    return true;
  }
  function clearPlan(game, sideKey) {
    game.sides[sideKey].plan = new Array(RULES.rounds).fill(null);
  }
  function planComplete(game, sideKey) { return game.sides[sideKey].plan.every(Boolean); }
  function planSpend(side) { return side.plan.reduce((s, a) => s + actionCost(a), 0); }

  // しえんユニットの選択（控えから。null で取り消し）
  function setSupport(game, sideKey, uid) {
    if (game.phase !== 'plan') return false;
    const s = game.sides[sideKey];
    if (uid == null) { s.support = null; }
    else {
      const u = supportCandidates(s).find((x) => x.uid === uid) || (s.support && s.support.uid === uid ? s.support : null);
      if (!u) return false;
      s.support = u;
    }
    // しえんの種類が変わるので、しえんの計画は全部取り消す
    s.plan = s.plan.map((a) => (a && a.kind === 'sup' ? null : a));
    validatePlan(game, sideKey);
    return true;
  }

  /* ---------- 表示用の説明文 ---------- */
  const SLOT = R5.SLOT_NAMES;
  function describeAction(game, sideKey, a, r) {
    const s = game.sides[sideKey], o = game.sides[other(sideKey)];
    const order = r == null ? s.field : planView(s, r).order;
    const nm = (u) => (u ? u.card.name : '？');
    switch (a.kind) {
      case 'atk':
        return { icon: '⚔', short: 'こうげき' + a.lv, title: `こうげき${a.lv}`,
          detail: `${SLOT[sideKey][a.from]}（${nm(order[a.from])}）→ ${SLOT[other(sideKey)][a.to]}（${nm(o.field[a.to])}）`,
          route: `${SLOT[sideKey][a.from]}→${SLOT[other(sideKey)][a.to]}` };
      case 'guard':
        return { icon: '🛡', short: 'ガード×' + a.n, title: 'ガード', detail: `防御+${a.n}（SP${a.n}消費）`, route: '' };
      case 'move':
        return { icon: '↔', short: 'いどう', title: 'いどう',
          detail: `${SLOT[sideKey][a.a]}（${nm(order[a.a])}）⇄ ${SLOT[sideKey][a.b]}（${nm(order[a.b])}）`,
          route: `${SLOT[sideKey][a.a]}⇄${SLOT[sideKey][a.b]}` };
      case 'sup': {
        const sup = s.support;
        const name = sup ? sup.card.support : '';
        if (a.target != null) {
          return { icon: R5.SUPPORTS[name].icon, short: 'しえん', title: `しえん ${name}`,
            detail: `${sup.card.name}が${SLOT[sideKey][a.target]}（${nm(order[a.target])}）を回復`, route: SLOT[sideKey][a.target] };
        }
        return { icon: R5.SUPPORTS[name].icon, short: 'しえん', title: `しえん ${name}`,
          detail: `${sup.card.name}：${R5.SUPPORTS[name].text}`, route: '' };
      }
      default:
        return { icon: '…', short: 'なにもしない', title: 'なにもしない', detail: '様子を見る（SP消費なし）', route: '' };
    }
  }

  /* ---------- 戦闘 ---------- */
  function snapshot(game) {
    const side = (s) => ({
      AP: s.AP, SP: s.SP, flags: Object.assign({}, s.flags),
      support: s.support ? s.support.uid : null,
      field: s.field.map((u) => ({ uid: u.uid, cardId: u.card.id, hp: u.hp, maxHp: u.maxHp, dead: u.dead })),
    });
    return { turn: game.turn, round: game.round, me: side(game.sides.me), enemy: side(game.sides.enemy) };
  }

  function startBattle(game) {
    if (game.phase !== 'plan') return false;
    for (const k of ['me', 'enemy']) {
      const s = game.sides[k];
      s.plan = s.plan.map((a) => a || mk({ kind: 'pass' }));
      s.SP -= planSpend(s); // SP は計画の確定時に消費
      if (s.SP < 0) throw new Error('SP underflow');
      s.roundDef = 0;
    }
    game.phase = 'battle';
    game.round = 0;
    return true;
  }

  const PRIORITY = { guard: 0, pass: 0, move: 1, sup: 2, atk: 3 };
  const d6 = (game) => Math.floor(game.rng() * 6) + 1;

  function agiOf(game, s, a) {
    let v = -1;
    if (a.kind === 'atk') v = alive(s.field[a.from]) ? s.field[a.from].card.agi : -1;
    else if (a.kind === 'sup') v = s.support ? s.support.card.agi : -1;
    return v + (s.flags.quick && v >= 0 ? 1 : 0);
  }

  // 1ラウンドぶん実行し、再生用の steps を返す
  function playRound(game) {
    if (game.phase !== 'battle') throw new Error('not in battle phase');
    const steps = [];
    const r = game.round;
    const S = game.sides;
    const mkStep = () => ({ lines: [], fx: [], snap: null });
    const finish = (st) => { st.snap = snapshot(game); steps.push(st); };
    const ln = (st, cls, text) => st.lines.push({ cls, text });

    /* --- 宣言 --- */
    const acts = { me: S.me.plan[r], enemy: S.enemy.plan[r] };
    let st = mkStep();
    ln(st, 'head', `━ ${game.turn}ターン目 ${r + 1}ラウンド目 ━`);
    for (const k of ['me', 'enemy']) {
      const d = describeAction(game, k, acts[k], null);
      ln(st, 'decl-' + k, `${WHO[k]}：${d.icon} ${d.title}　${d.detail}`);
      S[k].roundDef = acts[k].kind === 'guard' ? acts[k].n : (acts[k].kind === 'atk' && acts[k].lv === 2 ? 2 : 0);
      st.fx.push({ t: 'declare', side: k, round: r, action: acts[k], desc: d });
    }

    // 実行順：ガード→いどう→しえん→こうげき。同順なら AGI（同値は2D6）
    let order = ['me', 'enemy'];
    const pm = PRIORITY[acts.me.kind], pe = PRIORITY[acts.enemy.kind];
    if (pm !== pe) {
      order = pm < pe ? ['me', 'enemy'] : ['enemy', 'me'];
    } else if (acts.me.kind === 'atk' || acts.me.kind === 'sup') {
      const am = agiOf(game, S.me, acts.me), ae = agiOf(game, S.enemy, acts.enemy);
      let msg = `${acts.me.kind === 'atk' ? 'こうげき' : 'しえん'}が重なったので AGI で先行を決定（あなた${am} / 相手${ae}）`;
      if (am === ae) {
        let x, y;
        do { x = d6(game) + d6(game); y = d6(game) + d6(game); } while (x === y);
        msg += `　同値のため2D6：${x} 対 ${y}`;
        order = x > y ? ['me', 'enemy'] : ['enemy', 'me'];
      } else {
        order = am > ae ? ['me', 'enemy'] : ['enemy', 'me'];
      }
      ln(st, 'note', msg + `　→ ${WHO[order[0]]}が先行`);
    }
    finish(st);

    /* --- 各行動 --- */
    for (const k of order) {
      if (game.over) break;
      st = mkStep();
      execute(game, k, acts[k], st);
      finish(st);
      checkWipeout(game, steps);
    }

    game.round++;
    let turnEnded = false;
    if (!game.over && game.round >= RULES.rounds) {
      turnEnded = true;
      st = mkStep();
      endTurn(game, st);
      finish(st);
    }
    return { steps, turnEnded, over: game.over };
  }

  function execute(game, k, a, st) {
    const s = game.sides[k], o = game.sides[other(k)];
    const ln = (cls, text) => st.lines.push({ cls, text });
    const me = WHO[k];
    switch (a.kind) {
      case 'guard': ln('guard', `${me}は ガード×${a.n}！ このラウンドの防御+${a.n}`); st.fx.push({ t: 'guard', side: k }); break;
      case 'pass': ln('note', `${me}は様子を見ている…`); break;
      case 'move': {
        const x = s.field[a.a], y = s.field[a.b];
        if (!alive(x) || !alive(y)) { ln('note', `${me}のいどう：対象が倒れていて失敗…`); break; }
        s.field[a.a] = y; s.field[a.b] = x;
        ln('move', `${me}は ${x.card.name} と ${y.card.name} の位置を入れ替えた`);
        st.fx.push({ t: 'move', side: k, a: x.uid, b: y.uid });
        break;
      }
      case 'sup': supportAction(game, k, a, st); break;
      case 'atk': attack(game, k, a, st); break;
    }
  }

  function supportAction(game, k, a, st) {
    const s = game.sides[k];
    const ln = (cls, text) => st.lines.push({ cls, text });
    const sup = s.support;
    if (!sup) { ln('note', 'しえんユニットがいない…'); return; }
    const name = sup.card.support;
    sup.used = true; // 使ったしえんカードは消費
    ln('sup', `${WHO[k]}は しえん「${sup.card.name}の${name}」！　${R5.SUPPORTS[name].text}`);
    st.fx.push({ t: 'sup', side: k, uid: sup.uid });
    switch (name) {
      case 'センス': s.flags.sense = true; break;
      case 'ヒット': s.flags.hit = true; break;
      case 'ブレイク': s.flags.brk = true; break;
      case 'パリィ': s.flags.parry = true; break;
      case 'クイック': s.flags.quick = true; break;
      case 'ヒール': {
        const t = s.field[a.target];
        if (!alive(t)) { ln('note', '回復対象が倒れていて失敗…'); break; }
        const before = t.hp;
        t.hp = Math.min(t.maxHp, t.hp + RULES.healAmount);
        ln('heal', `${t.card.name}のHPが ${t.hp - before} 回復！（HP${t.hp}/${t.maxHp}）`);
        st.fx.push({ t: 'heal', uid: t.uid, amount: t.hp - before });
        break;
      }
    }
  }

  function attack(game, k, a, st) {
    const s = game.sides[k], o = game.sides[other(k)];
    const ln = (cls, text) => st.lines.push({ cls, text });
    const att = s.field[a.from], tgt = o.field[a.to];
    if (!alive(att) || !alive(tgt)) { ln('note', `${WHO[k]}のこうげき：対象が倒れていて失敗…`); return; }
    ln('atk', `${WHO[k]}の こうげき${a.lv}！　${att.card.name} → ${tgt.card.name}`);
    st.fx.push({ t: 'atk', from: att.uid, to: tgt.uid, side: k });

    // センス（相手が回避）。ヒットなら無効化。
    if (o.flags.sense) {
      o.flags.sense = false;
      if (s.flags.hit) ln('note', '相手のセンスは「ヒット」で無効化された！');
      else { ln('miss', 'センスで自動回避された！'); st.fx.push({ t: 'miss', uid: tgt.uid }); return; }
    }

    const d1 = d6(game), d2 = d6(game), raw = d1 + d2;
    const quick = s.flags.quick;
    let ctLine = RULES.critRoll - (quick ? 1 : 0);
    let total = raw;
    const mods = [];
    if (s.flags.hit) { s.flags.hit = false; total += 3; mods.push('ヒット+3'); }
    if (quick) { total += 1; mods.push('クイック+1'); }
    const need = tgt.card.agi;
    const crit = raw >= ctLine;
    const hit = total >= need;
    ln('dice', `命中判定 2D6：${d1}+${d2}${mods.length ? '（' + mods.join('、') + '）' : ''} = <b>${total}</b>　（相手のAGI ${need} 以上で命中）`);
    if (!hit) {
      ln('miss', `${tgt.card.name}に <b>回避</b> された！`);
      st.fx.push({ t: 'miss', uid: tgt.uid });
      return;
    }
    ln('hit', `<b>命中！</b>${crit ? '　<b class="crit">クリティカル！</b>（DEF無効）' : ''}`);

    let atk = att.card.atk;
    const parts = [`ATK${atk}`];
    if (s.flags.brk) { s.flags.brk = false; atk += 2; parts[0] = `ATK${att.card.atk}+2（ブレイク）`; }
    if (a.lv === 3) { atk += 2; parts[0] += '+2（こうげき3）'; }
    let def = crit ? 0 : o.roundDef;
    let dmg = atk - def;
    const calc = [`${parts[0]} − DEF${def}`];
    if (o.flags.parry) { o.flags.parry = false; dmg -= 2; calc.push('− 2（パリィ）'); }
    if (dmg < 0) dmg = 0;
    ln('dmg', `ダメージ：${calc.join(' ')} = <b class="${dmg > 0 ? 'dmg-n' : 'dmg-0'}">${dmg}</b>`);

    tgt.hp -= dmg;
    st.fx.push({ t: 'dmg', uid: tgt.uid, amount: dmg, crit });
    if (tgt.hp <= 0) kill(game, o, tgt, st);
  }

  function kill(game, side, unit, st) {
    unit.hp = 0; unit.dead = true;
    const i = side.field.indexOf(unit);
    side.field.splice(i, 1); side.field.push(unit); // 倒れたユニットは最後尾へ
    side.AP = Math.min(RULES.maxAP, side.AP + 1);
    st.lines.push({ cls: 'kill', text: `<b>${unit.card.name}を たおした！</b>　${WHO[side.key]}のAPが+1（AP${side.AP}）` });
    st.fx.push({ t: 'die', uid: unit.uid });
  }

  function checkWipeout(game, steps) {
    if (game.over) return;
    const me = aliveCount(game.sides.me), en = aliveCount(game.sides.enemy);
    if (me > 0 && en > 0) return;
    const st = { lines: [], fx: [], snap: null };
    game.over = true; game.phase = 'over';
    const winner = me === 0 && en === 0 ? 'draw' : (me === 0 ? 'enemy' : 'me');
    game.result = Object.assign(scoreGame(game), { winner, reason: 'wipeout' });
    st.lines.push({ cls: 'head', text: winner === 'draw' ? '両者全滅…' : `${WHO[other(winner)]}のユニットが全滅！` });
    st.snap = snapshot(game);
    steps.push(st);
  }

  function endTurn(game, st) {
    st.lines.push({ cls: 'head', text: `━ ${game.turn}ターン終了 ━` });
    for (const k of ['me', 'enemy']) {
      const s = game.sides[k];
      s.flags = freshFlags();
      s.roundDef = 0;
      s.support = null; // 使わなかったしえんは控えに戻る（使ったものは used=true で消費済み）
      s.plan = new Array(RULES.rounds).fill(null);
    }
    game.turn++;
    if (game.turn > RULES.turns) {
      game.over = true; game.phase = 'over';
      const sc = scoreGame(game);
      const winner = sc.me === sc.enemy ? 'draw' : (sc.me > sc.enemy ? 'me' : 'enemy');
      game.result = Object.assign(sc, { winner, reason: 'score' });
      st.lines.push({ cls: 'head', text: `ゲームセット！ 生き残りユニットのコスト合計　あなた${sc.me} 対 相手${sc.enemy}` });
      return;
    }
    for (const k of ['me', 'enemy']) game.sides[k].AP = Math.min(RULES.maxAP, game.sides[k].AP + 1);
    game.phase = 'plan';
    game.round = 0;
    st.lines.push({ cls: 'note', text: `${game.turn}ターン目へ。APが+1されました。しえんユニットと行動を選んでください。` });
  }

  // 勝敗スコア：生き残った場のユニットのコスト合計
  function scoreGame(game) {
    const f = (s) => s.field.filter(alive).reduce((t, u) => t + u.card.cost, 0);
    return { me: f(game.sides.me), enemy: f(game.sides.enemy) };
  }

  Object.assign(R5, {
    makeRng, shuffle, costOf, randomDeck, autoField, orderField,
    createGame, listOptions, setPlan, clearPlan, planComplete, planSpend, planView, setSupport,
    supportCandidates, bench, describeAction, startBattle, playRound, snapshot, scoreGame,
    alive, aliveCount, other, WHO,
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
