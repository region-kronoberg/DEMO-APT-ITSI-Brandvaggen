const { test } = require('node:test');
const assert = require('node:assert/strict');
const L = require('../app/logic.js');
const C = require('../app/config.js');

const deg = (d) => (d * Math.PI) / 180;

test('vinkelskillnad tar kortaste vägen', () => {
  assert.ok(Math.abs(L.angleDiff(deg(350), deg(10)) - deg(-20)) < 1e-9);
  assert.ok(Math.abs(L.angleDiff(deg(10), deg(350)) - deg(20)) < 1e-9);
});

test('brandväggen blockerar inom sin bredd och släpper igenom utanför', () => {
  assert.equal(L.isBlocked(deg(30), deg(0), 70), true);
  assert.equal(L.isBlocked(deg(40), deg(0), 70), false);
  assert.equal(L.isBlocked(deg(355), deg(10), 70), true); // över nollan
});

test('nya hot dyker upp först i rätt våg', () => {
  const ids = (w) => L.threatsForWave(C.THREATS, w).map((t) => t.id);
  assert.ok(ids(1).every((id) => C.THREATS.find((t) => t.id === id).fromWave <= 1));
  assert.ok(ids(10).length === C.THREATS.length);
});

test('slumpningen respekterar vikterna', () => {
  const pool = [{ id: 'a', weight: 1, fromWave: 1 }, { id: 'b', weight: 3, fromWave: 1 }];
  assert.equal(L.pickThreat(pool, 1, 0.0).id, 'a');
  assert.equal(L.pickThreat(pool, 1, 0.24).id, 'a');
  assert.equal(L.pickThreat(pool, 1, 0.26).id, 'b');
  assert.equal(L.pickThreat(pool, 1, 0.999).id, 'b');
});

test('tempot ökar med vågorna men aldrig orimligt', () => {
  assert.ok(L.spawnInterval(C, 5) < L.spawnInterval(C, 1));
  assert.ok(L.spawnInterval(C, 100) >= 0.25);
  assert.ok(L.speedFactor(C, 3) > L.speedFactor(C, 1));
});

test('kombo ger högst x5', () => {
  assert.equal(L.multiplier(0), 1);
  assert.equal(L.multiplier(5), 2);
  assert.equal(L.multiplier(500), 5);
});
