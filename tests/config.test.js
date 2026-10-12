// Kontroller som körs automatiskt vid varje pull request.
// Om någon av dem fallerar blir flödet rött och ändringen kan inte slås ihop.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../app/config.js');

const isColor = (c) => /^#[0-9A-Fa-f]{6}$/.test(c);

test('grundinställningar finns', () => {
  for (const key of ['VERSION', 'TITLE', 'SUBTITLE', 'NODES', 'THREATS', 'POWERUPS']) {
    assert.ok(C[key] !== undefined, `${key} saknas i config.js`);
  }
});

test('brandväggen har rimlig bredd (20 till 180 grader)', () => {
  assert.ok(C.SHIELD_ARC_DEG >= 20 && C.SHIELD_ARC_DEG <= 180,
    `SHIELD_ARC_DEG är ${C.SHIELD_ARC_DEG}, ska vara mellan 20 och 180`);
});

test('det finns noder att skydda, med korta namn', () => {
  assert.ok(C.NODES.length >= 3 && C.NODES.length <= 10, 'Mellan 3 och 10 noder');
  for (const n of C.NODES) assert.ok(n.short.length <= 4, `Kortnamnet "${n.short}" är för långt (max 4 tecken)`);
});

test('varje hot är korrekt definierat', () => {
  const ids = new Set();
  for (const t of C.THREATS) {
    assert.ok(t.id && !ids.has(t.id), `Hotet "${t.id}" saknar id eller är en dubblett`);
    ids.add(t.id);
    assert.ok(t.name, `Hotet ${t.id} saknar namn`);
    assert.ok(isColor(t.color), `Hotet ${t.id} har ogiltig färg ${t.color}`);
    assert.ok(t.speed > 0 && t.speed <= 300, `Hotet ${t.id} har orimlig hastighet ${t.speed}`);
    assert.ok(Number.isInteger(t.hp) && t.hp >= 1 && t.hp <= 5, `Hotet ${t.id} ska ha 1 till 5 i hp`);
    assert.ok(t.damage > 0 && t.damage <= 50, `Hotet ${t.id} har orimlig skada ${t.damage}`);
    assert.ok(t.weight > 0, `Hotet ${t.id} måste ha weight över 0`);
    assert.ok(t.fromWave >= 1, `Hotet ${t.id} måste ha fromWave 1 eller högre`);
  }
});

test('det finns minst ett hot i första vågen', () => {
  assert.ok(C.THREATS.some((t) => t.fromWave === 1), 'Inget hot har fromWave: 1');
});

test('förstärkningar är korrekt definierade', () => {
  for (const p of C.POWERUPS) assert.ok(isColor(p.color), `${p.name} har ogiltig färg`);
  assert.ok(C.POWERUP_CHANCE >= 0 && C.POWERUP_CHANCE <= 0.5, 'POWERUP_CHANCE ska vara mellan 0 och 0,5');
});
