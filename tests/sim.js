/* AI 同士で大量に対戦させ、エンジンの不変条件を検査するスモークテスト。 node tests/sim.js [対戦数] */
require('../js/data.js'); require('../js/engine.js'); require('../js/ai.js');
const R5 = globalThis.R5, RULES = R5.RULES;
const N = +process.argv[2] || 600;
let fail = 0;
const assert = (c, msg, ctx) => { if (!c) { fail++; if (fail < 10) console.error('ASSERT', msg, ctx || ''); } };

function mkCfg(rng, i) {
  const deckOf = (k) => {
    const m = (i + k) % 6;
    if (m < 4) { const d = (k ? R5.CPU_DECKS : R5.PLAYER_DECKS)[m].cards; return { deck: d.slice(), field: d.slice(0, 5) }; }
    const deck = R5.randomDeck(rng); return { deck, field: R5.autoField(deck, rng, 'normal') };
  };
  return { me: deckOf(0), enemy: deckOf(1), rng, options: { strictAP: i % 3 === 0 } };
}

const stats = { me: 0, enemy: 0, draw: 0, wipe: 0, rounds: 0 };
for (let i = 0; i < N; i++) {
  const rng = R5.makeRng(1000 + i);
  const levels = ['easy', 'normal', 'hard'];
  const lv = { me: levels[i % 3], enemy: levels[(i >> 1) % 3] };
  const g = R5.createGame(mkCfg(rng, i));
  let guard = 0;
  while (!g.over && guard++ < 20) {
    for (const k of ['me', 'enemy']) {
      const uid = R5.AI.chooseSupport(g, k, lv[k], rng);
      if (uid) assert(R5.setSupport(g, k, uid), 'setSupport failed', uid);
      R5.AI.planTurn(g, k, lv[k], rng);
      assert(R5.planComplete(g, k), 'plan incomplete');
      const s = g.sides[k];
      assert(R5.planSpend(s) <= s.SP, 'SP overspend', { sp: s.SP, spend: R5.planSpend(s) });
      assert(s.plan.filter((a) => a.kind === 'atk').length <= RULES.maxAttacksPerTurn, 'too many attacks');
      assert(s.plan.filter((a) => a.kind === 'sup').length <= 1, 'support twice');
    }
    R5.startBattle(g);
    for (let r = 0; r < RULES.rounds && !g.over; r++) {
      const res = R5.playRound(g);
      stats.rounds++;
      assert(res.steps.length >= 1 && res.steps.every((s) => s.snap), 'bad steps');
      for (const k of ['me', 'enemy']) {
        const s = g.sides[k];
        assert(s.field.length === 5, 'field size', s.field.length);
        assert(new Set(s.field.map((u) => u.uid)).size === 5, 'dup unit in field');
        s.field.forEach((u, idx) => {
          assert(u.hp >= 0 && u.hp <= u.maxHp, 'hp range', u.hp);
          assert(u.dead === (u.hp <= 0), 'dead flag');
        });
        // 死亡ユニットは生存ユニットより後ろ
        const firstDead = s.field.findIndex((u) => u.dead);
        if (firstDead >= 0) assert(s.field.slice(firstDead).every((u) => u.dead), 'dead not at back', s.field.map((u) => u.dead));
        assert(s.SP >= 0, 'SP negative'); assert(s.AP >= 1 && s.AP <= RULES.maxAP, 'AP range', s.AP);
      }
      if (res.turnEnded) break;
    }
  }
  assert(g.over && g.result, 'game did not end', { turn: g.turn, phase: g.phase });
  if (g.result) { stats[g.result.winner]++; if (g.result.reason === 'wipeout') stats.wipe++; }
}
console.log(JSON.stringify(stats), fail ? 'FAILED ' + fail : 'OK');
process.exit(fail ? 1 : 0);
