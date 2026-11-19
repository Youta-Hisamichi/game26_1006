/* 相手AI（と、プレイヤー用の「おまかせ」）
 * level: 'easy' | 'normal' | 'hard'
 *   easy   … 行動の約半分がでたらめ
 *   normal … 期待ダメージ・撃破・回復などを点数化して選ぶ（少しだけ揺らぎ）
 *   hard   … さらにガードやいどうも状況で使い分ける
 */
(function (root) {
  'use strict';
  const R5 = root.R5;
  const RULES = R5.RULES;
  const EPS = { easy: 0.5, normal: 0.12, hard: 0.02 };

  // 2D6 が need 以上になる確率
  function hitProb(need) {
    let n = 0;
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b >= need) n++;
    return n / 36;
  }

  /* ---------- しえんユニットの選択 ---------- */
  function chooseSupport(game, sideKey, level, rng) {
    const s = game.sides[sideKey];
    const cands = R5.supportCandidates(s);
    if (!cands.length) return null;
    if (level === 'easy') return cands[Math.floor(rng() * cands.length)].uid;
    const damaged = s.field.some((u) => R5.alive(u) && u.hp < u.maxHp - 1);
    const pref = { 'ブレイク': 5, 'ヒット': 4.6, 'センス': 4, 'パリィ': 3.4, 'クイック': 3.2, 'ヒール': damaged ? 6 : 2 };
    let best = null, bs = -1;
    for (const u of cands) {
      const sc = (pref[u.card.support] || 1) + rng() * 0.8;
      if (sc > bs) { bs = sc; best = u; }
    }
    return best.uid;
  }

  /* ---------- 行動の計画 ---------- */
  function scoreOption(game, sideKey, r, opt, view, level) {
    const s = game.sides[sideKey], o = game.sides[R5.other(sideKey)];
    const turnsLeft = RULES.turns - game.turn + 1;
    switch (opt.kind) {
      case 'atk': {
        const att = view.order[opt.from], tgt = o.field[opt.to];
        const dmg = Math.max(0, att.card.atk + (opt.lv === 3 ? 2 : 0) - 0.7);
        const p = hitProb(tgt.card.agi);
        let sc = dmg * p * 1.4 + 2.2;
        if (tgt.hp <= dmg) sc += (2 + tgt.card.cost) * p;          // 撃破
        sc += (1 - tgt.hp / tgt.maxHp) * 0.8;                       // 弱った敵を狙う
        if (opt.lv === 2) sc += 0.7 - 0.5;                          // 防御+2
        sc -= [0, 0, 0.9, 1.7][opt.lv] / Math.max(1, turnsLeft) * 1.3; // SP節約
        return sc;
      }
      case 'sup': {
        const sup = s.support, name = sup.card.support;
        if (name === 'ヒール') {
          const t = view.order[opt.target];
          const miss = t.maxHp - t.hp;
          return miss >= 2 ? 2.5 + miss : (miss === 1 ? 1.2 : -1);
        }
        // 後でこうげきできるラウンドが残っている場合だけ価値がある
        let later = 0;
        for (let q = r + 1; q < RULES.rounds; q++) if (RULES.roundAgiReq[q] <= 6) later++;
        const need = Math.max(0, RULES.maxAttacksPerTurn - view.atk);
        if (later < 1 || need < 1) return name === 'センス' || name === 'パリィ' ? 0.8 : -0.5;
        return { 'ブレイク': 3.1, 'ヒット': 2.7, 'クイック': 2.6, 'センス': 2.4, 'パリィ': 2.2 }[name] || 1.5;
      }
      case 'move': {
        const f = view.order[opt.a], b = view.order[opt.b];
        const diff = b.hp - f.hp;
        // 前列が弱っていて後列に元気なユニットがいるなら入れ替える
        const sc = diff >= 2 ? 1.6 + diff * 0.3 : -0.6;
        return level === 'hard' ? sc : sc - 0.2;
      }
      case 'guard': {
        if (opt.n > 1) return -1;
        const budget = view.sp / Math.max(1, turnsLeft);
        const threat = o.field.slice(0, RULES.frontSize).some((u) => R5.alive(u) && u.card.atk >= 3);
        return (budget >= 1 ? 0.5 : -0.4) + (threat ? 0.5 : 0) + (level === 'hard' ? 0.3 : 0);
      }
      default: return 0.05;
    }
  }

  function planTurn(game, sideKey, level, rng) {
    level = level || 'normal'; rng = rng || game.rng;
    const eps = EPS[level] != null ? EPS[level] : EPS.normal;
    R5.clearPlan(game, sideKey);
    for (let r = 0; r < RULES.rounds; r++) {
      const opts = R5.listOptions(game, sideKey, r);
      const view = R5.planView(game.sides[sideKey], r);
      let pick;
      if (rng() < eps) {
        const nonPass = opts.filter((o) => o.kind !== 'pass');
        const pool = nonPass.length ? nonPass : opts;
        pick = pool[Math.floor(rng() * pool.length)];
      } else {
        let best = null, bs = -Infinity;
        for (const o of opts) {
          const sc = scoreOption(game, sideKey, r, o, view, level) + rng() * 0.35;
          if (sc > bs) { bs = sc; best = o; }
        }
        pick = best;
      }
      R5.setPlan(game, sideKey, r, pick.key);
    }
  }

  R5.AI = { planTurn, chooseSupport };
})(typeof globalThis !== 'undefined' ? globalThis : this);
