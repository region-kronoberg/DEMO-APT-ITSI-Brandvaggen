// Ren spellogik utan grafik, så att den går att testa automatiskt.

const Logic = {
  // Kortaste vinkelskillnad mellan två vinklar, i radianer (-PI..PI)
  angleDiff(a, b) {
    let d = (a - b) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  },

  // Träffar ett hot brandväggen?
  isBlocked(threatAngle, shieldAngle, arcDeg) {
    const half = (arcDeg * Math.PI) / 180 / 2;
    return Math.abs(Logic.angleDiff(threatAngle, shieldAngle)) <= half;
  },

  // Svepte brandväggen över hotet när den vreds från prevAngle till shieldAngle?
  isSwept(threatAngle, prevAngle, shieldAngle, arcDeg) {
    const half = (arcDeg * Math.PI) / 180 / 2;
    const d = Logic.angleDiff(threatAngle, prevAngle);
    const moved = Logic.angleDiff(shieldAngle, prevAngle);
    return d >= Math.min(0, moved) - half && d <= Math.max(0, moved) + half;
  },

  // Vilka hot finns i en viss våg?
  threatsForWave(threats, wave) {
    return threats.filter((t) => t.fromWave <= wave);
  },

  // Slumpa ett hot viktat efter weight. rnd är ett tal 0..1
  pickThreat(threats, wave, rnd) {
    const pool = Logic.threatsForWave(threats, wave);
    const total = pool.reduce((s, t) => s + t.weight, 0);
    let r = rnd * total;
    for (const t of pool) {
      r -= t.weight;
      if (r < 0) return t;
    }
    return pool[pool.length - 1];
  },

  spawnInterval(cfg, wave) {
    return Math.max(0.25, cfg.SPAWN_INTERVAL * Math.pow(cfg.SPAWN_SPEEDUP, wave - 1));
  },

  speedFactor(cfg, wave) {
    return 1 + cfg.SPEED_PER_WAVE * (wave - 1);
  },

  // Kombo: varje block i rad höjer multiplikatorn, max x5
  multiplier(streak) {
    return Math.min(5, 1 + Math.floor(streak / 5));
  },
};

if (typeof module !== 'undefined') module.exports = Logic;
