/* Brandväggen: ett litet försvarsspel för IT Säkerhet och infrastruktur.
   Inställningar finns i config.js, testbar logik i logic.js. */
(() => {
  'use strict';
  const C = CONFIG;
  const TAU = Math.PI * 2;
  const $ = (id) => document.getElementById(id);

  const canvas = $('game');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, S = 0, DPR = 1, cx = 0, cy = 0;
  let rCore, rNode, rShield, rSpawn, nodeSize;
  let gridImg = null;

  // ---------- Tillstånd ----------
  const state = {
    mode: 'attract', // attract | play | over
    t: 0, score: 0, streak: 0, wave: 1, waveTime: 0, spawnTimer: 1,
    integrity: C.START_INTEGRITY, shield: -Math.PI / 2, shieldTarget: -Math.PI / 2,
    shieldFlash: 0, pulseCd: 0, pulseAnim: 0, mfa: 0, shake: 0, coreFlash: 0,
    blocked: 0,
  };
  let threats = [], powerups = [], particles = [], floats = [], stars = [];
  const nodes = C.NODES.map((n, i) => ({ ...n, i, flash: 0, x: 0, y: 0, a: 0 }));
  const keys = {};

  // ---------- Ljud ----------
  let actx = null, muted = false;
  try { muted = localStorage.getItem('bv-muted') === '1'; } catch (e) {}
  function audio() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    return actx;
  }
  function tone(freq, dur, type = 'sine', vol = 0.12, slide = 0, delay = 0) {
    if (muted || state.mode === 'attract') return;
    const a = audio(); if (!a) return;
    const t0 = a.currentTime + delay;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  const sfx = {
    block: () => tone(880 + Math.random() * 200, 0.08, 'triangle', 0.08, 400),
    kill: () => { tone(520, 0.12, 'square', 0.05, 600); },
    hit: () => { tone(140, 0.35, 'sawtooth', 0.12, -90); },
    power: () => { [660, 880, 1320].forEach((f, i) => tone(f, 0.12, 'triangle', 0.08, 0, i * 0.07)); },
    pulse: () => tone(200, 0.6, 'sine', 0.2, 900),
    wave: () => { [440, 660].forEach((f, i) => tone(f, 0.18, 'triangle', 0.07, 0, i * 0.12)); },
  };

  // ---------- Storlek ----------
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    S = Math.min(W, H);
    cx = W / 2; cy = H / 2 + (H > W ? 0 : S * 0.02);
    const k = H > W * 1.2 ? 1.3 : 1; // större spelplan i stående mobil
    rCore = S * 0.075 * k; rNode = S * 0.2 * k; rShield = S * 0.285 * k; nodeSize = S * 0.038 * k;
    rSpawn = Math.hypot(W, H) / 2 + 40;
    buildGrid();
    if (!stars.length) for (let i = 0; i < 140; i++) stars.push(newStar(true));
  }

  function buildGrid() {
    const size = Math.ceil(Math.hypot(W, H));
    const g = document.createElement('canvas');
    g.width = size; g.height = size;
    const x = g.getContext('2d');
    const r = Math.max(18, S * 0.035), hw = Math.sqrt(3) * r;
    x.strokeStyle = 'rgba(80,170,255,0.07)'; x.lineWidth = 1;
    for (let row = -1; row * r * 1.5 < size + r; row++) {
      for (let col = -1; col * hw < size + hw; col++) {
        const px = col * hw + (row % 2 ? hw / 2 : 0), py = row * r * 1.5;
        hexPath(x, px, py, r); x.stroke();
      }
    }
    gridImg = g;
  }

  function hexPath(c, x, y, r, rot = Math.PI / 6) {
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = rot + (i * TAU) / 6;
      i ? c.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)) : c.moveTo(x + r * Math.cos(a), y + r * Math.sin(a));
    }
    c.closePath();
  }

  function newStar(anywhere) {
    const a = Math.random() * TAU;
    const d = anywhere ? Math.random() * rSpawn : rSpawn;
    return { a, d, v: 20 + Math.random() * 50, s: Math.random() * 1.6 + 0.4 };
  }

  // ---------- Spelflöde ----------
  function reset(mode) {
    Object.assign(state, {
      mode, t: 0, score: 0, streak: 0, wave: mode === 'attract' ? 4 : 1, waveTime: 0, spawnTimer: 1.2,
      integrity: C.START_INTEGRITY, shieldFlash: 0, pulseCd: 0, pulseAnim: 0, mfa: 0, shake: 0, blocked: 0,
    });
    threats = []; powerups = []; floats = [];
    nodes.forEach((n) => (n.flash = 0));
  }

  function startGame() {
    audio(); if (actx && actx.state === 'suspended') actx.resume();
    reset('play');
    $('start').classList.add('hidden'); $('over').classList.add('hidden'); $('hud').classList.remove('hidden');
    banner('Våg 1', 'Skydda nätverket');
    sfx.wave();
    updateHud();
  }

  function gameOver() {
    state.mode = 'over';
    let best = 0;
    try { best = +localStorage.getItem('bv-best') || 0; } catch (e) {}
    const isBest = state.score > best;
    if (isBest) { try { localStorage.setItem('bv-best', state.score); } catch (e) {} }
    $('finalScore').textContent = state.score.toLocaleString('sv-SE');
    $('finalInfo').textContent = `Du nådde våg ${state.wave} och stoppade ${state.blocked} hot.`;
    $('best').textContent = isBest ? 'Nytt rekord!' : best ? `Rekord: ${best.toLocaleString('sv-SE')}` : '';
    setTimeout(() => { $('hud').classList.add('hidden'); $('over').classList.remove('hidden'); }, 900);
    for (let i = 0; i < 120; i++) burst(cx, cy, '#FF5A3C', 1);
  }

  let bannerTimer = 0;
  function banner(text, small) {
    const b = $('banner');
    b.innerHTML = `${text}${small ? `<small>${small}</small>` : ''}`;
    b.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => b.classList.remove('show'), 1800);
  }

  // ---------- Skapa hot ----------
  function spawn() {
    const type = Logic.pickThreat(C.THREATS, state.wave, Math.random());
    const target = Math.floor(Math.random() * nodes.length);
    const a = Math.random() * TAU;
    const count = type.swarm || 1;
    for (let i = 0; i < count; i++) {
      const aa = a + (Math.random() - 0.5) * 0.25;
      const dd = rSpawn + i * 22;
      threats.push({
        type, hp: type.hp, target, x: cx + Math.cos(aa) * dd, y: cy + Math.sin(aa) * dd,
        speed: type.speed * Logic.speedFactor(C, state.wave) * (S / 800) * (0.9 + Math.random() * 0.2),
        size: (type.swarm ? 0.012 : 0.022) * S * (type.hp > 1 ? 1.25 : 1),
        phase: Math.random() * TAU, passed: false, trail: [], spin: 0, kb: 0,
      });
    }
    if (state.mode === 'play' && Math.random() < C.POWERUP_CHANCE) {
      const p = C.POWERUPS[Math.floor(Math.random() * C.POWERUPS.length)];
      const pa = Math.random() * TAU;
      powerups.push({ p, x: cx + Math.cos(pa) * rSpawn, y: cy + Math.sin(pa) * rSpawn, a: pa, rot: 0, gone: false });
    }
  }

  // ---------- Effekter ----------
  function burst(x, y, color, power = 1) {
    const n = Math.round(14 * power);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = (60 + Math.random() * 260) * power * (S / 900);
      particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, decay: 0.8 + Math.random() * 1.4, color, s: 1 + Math.random() * 2.5 });
    }
  }
  function floatText(x, y, text, color) { floats.push({ x, y, text, color, life: 1 }); }

  // ---------- Uppdatering ----------
  function shieldArc() { return C.SHIELD_ARC_DEG * (state.mfa > 0 ? 1.8 : 1); }

  function nearestThreatAngle() {
    let best = null, bd = Infinity;
    for (const t of threats) {
      if (t.passed) continue;
      const d = Math.hypot(t.x - cx, t.y - cy);
      if (d < bd) { bd = d; best = t; }
    }
    return best ? Math.atan2(best.y - cy, best.x - cx) : state.shieldTarget + 0.01;
  }

  function update(dt) {
    state.t += dt;
    const playing = state.mode === 'play';

    // noder kretsar långsamt
    nodes.forEach((n, i) => {
      n.a = -Math.PI / 2 + (i * TAU) / nodes.length + state.t * 0.04;
      n.x = cx + Math.cos(n.a) * rNode; n.y = cy + Math.sin(n.a) * rNode;
      n.flash = Math.max(0, n.flash - dt * 2);
    });

    // brandväggen
    if (state.mode === 'attract') state.shieldTarget = nearestThreatAngle();
    if (keys.left) state.shieldTarget -= C.SHIELD_KEY_SPEED * dt;
    if (keys.right) state.shieldTarget += C.SHIELD_KEY_SPEED * dt;
    state.shield += Logic.angleDiff(state.shieldTarget, state.shield) * Math.min(1, dt * (state.mode === 'attract' ? 7 : 20));
    state.shieldFlash = Math.max(0, state.shieldFlash - dt * 4);
    state.coreFlash = Math.max(0, state.coreFlash - dt * 2);
    state.shake = Math.max(0, state.shake - dt * 30);
    state.pulseAnim = Math.max(0, state.pulseAnim - dt * 1.6);
    if (playing) { state.pulseCd = Math.max(0, state.pulseCd - dt); state.mfa = Math.max(0, state.mfa - dt); }

    // vågor
    if (state.mode !== 'over') {
      state.waveTime += dt;
      if (playing && state.waveTime >= C.WAVE_SECONDS) {
        state.waveTime = 0; state.wave++;
        const fresh = C.THREATS.find((t) => t.fromWave === state.wave);
        banner(`Våg ${state.wave}`, fresh ? `Nytt hot: ${fresh.name}` : 'Hoten blir snabbare');
        sfx.wave();
      }
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawn();
        state.spawnTimer = Logic.spawnInterval(C, state.wave) * (0.7 + Math.random() * 0.6) * (state.mode === 'attract' ? 1.3 : 1);
      }
    }

    // hot
    for (const t of threats) {
      const n = nodes[t.target];
      let dx = n.x - t.x, dy = n.y - t.y;
      const dist = Math.hypot(dx, dy) || 1;
      dx /= dist; dy /= dist;
      let vx = dx * t.speed, vy = dy * t.speed;
      if (t.type.zigzag) { const z = Math.sin(state.t * 6 + t.phase) * t.speed * 1.1; vx += -dy * z; vy += dx * z; }
      if (t.kb > 0) { // studs efter träff
        const ox = t.x - cx, oy = t.y - cy, od = Math.hypot(ox, oy) || 1;
        vx = (ox / od) * t.kb; vy = (oy / od) * t.kb; t.kb = Math.max(0, t.kb - dt * 900 * (S / 800));
      }
      t.x += vx * dt; t.y += vy * dt; t.spin += dt * 2;
      t.trail.push(t.x, t.y); if (t.trail.length > 16) t.trail.splice(0, 2);

      const dc = Math.hypot(t.x - cx, t.y - cy);
      if (!t.passed && dc <= rShield + t.size * 0.5 && t.kb === 0) {
        const ang = Math.atan2(t.y - cy, t.x - cx);
        if (Logic.isBlocked(ang, state.shield, shieldArc())) {
          t.hp--; state.shieldFlash = 1; sfx.block();
          burst(t.x, t.y, t.type.color, t.hp > 0 ? 0.5 : 1);
          if (t.hp > 0) { t.kb = 420 * (S / 800); }
          else {
            t.dead = true;
            if (playing) {
              state.streak++; state.blocked++;
              const pts = t.type.points * Logic.multiplier(state.streak);
              state.score += pts;
              floatText(t.x, t.y, `+${pts}`, t.type.color);
              if (!t.type.swarm) floatText(t.x, t.y - S * 0.03, `${t.type.name} stoppat`, '#e8f3ff');
              sfx.kill();
            }
          }
        } else t.passed = true;
      }
      if (!t.dead && Math.hypot(n.x - t.x, n.y - t.y) < nodeSize) {
        t.dead = true; n.flash = 1; burst(t.x, t.y, '#FF5A3C', 1.2);
        if (playing) {
          state.integrity = Math.max(0, state.integrity - t.type.damage);
          state.streak = 0; state.shake = 12; state.coreFlash = 1; sfx.hit();
          floatText(n.x, n.y - nodeSize * 1.6, `${n.short} drabbat`, '#FF5A3C');
          if (state.integrity <= 0) gameOver();
        }
      }
    }
    threats = threats.filter((t) => !t.dead);

    // förstärkningar
    for (const pu of powerups) {
      const speed = 70 * (S / 800);
      pu.x -= Math.cos(pu.a) * speed * dt; pu.y -= Math.sin(pu.a) * speed * dt; pu.rot += dt * 2;
      const dc = Math.hypot(pu.x - cx, pu.y - cy);
      if (dc <= rShield && !pu.checked) {
        pu.checked = true;
        if (Logic.isBlocked(Math.atan2(pu.y - cy, pu.x - cx), state.shield, shieldArc())) { applyPower(pu); pu.gone = true; }
      }
      if (dc < rNode * 0.8) pu.gone = true;
    }
    powerups = powerups.filter((p) => !p.gone);

    // stjärnor/datapaket
    for (const s of stars) { s.d -= s.v * dt; if (s.d < rCore) Object.assign(s, newStar(false)); }

    // partiklar
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; p.life -= p.decay * dt; }
    particles = particles.filter((p) => p.life > 0);
    if (particles.length > 900) particles.splice(0, particles.length - 900);
    for (const f of floats) { f.y -= 40 * dt; f.life -= dt * 0.9; }
    floats = floats.filter((f) => f.life > 0);

    if (playing) updateHud();
  }

  function applyPower(pu) {
    const p = pu.p;
    sfx.power(); burst(pu.x, pu.y, p.color, 1.4);
    floatText(pu.x, pu.y, `${p.name}: ${p.desc}`, p.color);
    if (p.id === 'mfa') state.mfa = p.duration || 8;
    if (p.id === 'backup') state.integrity = Math.min(C.START_INTEGRITY, state.integrity + 25);
    if (p.id === 'patch') clearThreats((t) => true);
  }

  function clearThreats(pred) {
    for (const t of threats) {
      if (!pred(t)) continue;
      t.dead = true; burst(t.x, t.y, t.type.color, 0.8);
      if (state.mode === 'play') { state.score += t.type.points; state.blocked++; }
    }
    threats = threats.filter((t) => !t.dead);
  }

  function pulse() {
    if (state.mode !== 'play' || state.pulseCd > 0) return;
    state.pulseCd = C.PULSE_COOLDOWN; state.pulseAnim = 1; sfx.pulse();
    const R = S * C.PULSE_RADIUS;
    clearThreats((t) => Math.hypot(t.x - cx, t.y - cy) < R);
  }

  // ---------- HUD ----------
  let lastHud = '';
  function updateHud() {
    const m = Logic.multiplier(state.streak);
    const key = `${state.score}|${state.wave}|${Math.round(state.integrity)}|${m}|${Math.ceil(state.pulseCd)}|${Math.ceil(state.mfa)}`;
    if (key === lastHud) return; lastHud = key;
    $('score').textContent = state.score.toLocaleString('sv-SE');
    $('wave').textContent = state.wave;
    $('mult').textContent = m > 1 ? `x${m} KOMBO` : '';
    $('integrity').style.width = `${(state.integrity / C.START_INTEGRITY) * 100}%`;
    const ready = state.pulseCd <= 0;
    $('pulse').classList.toggle('ready', ready);
    $('pulseFill').style.width = `${(1 - state.pulseCd / C.PULSE_COOLDOWN) * 100}%`;
    $('buffs').innerHTML = state.mfa > 0 ? `<div class="buff">MFA ${Math.ceil(state.mfa)} s</div>` : '';
  }

  // ---------- Rendering ----------
  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    // bakgrund
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(W, H) / 1.6);
    bg.addColorStop(0, '#04213a'); bg.addColorStop(0.5, '#001328'); bg.addColorStop(1, '#00060e');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    ctx.save();
    if (state.shake > 0) ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);

    // rutnät som roterar långsamt
    if (gridImg) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(state.t * 0.01);
      ctx.globalAlpha = 0.8 + Math.sin(state.t * 0.8) * 0.2;
      ctx.drawImage(gridImg, -gridImg.width / 2, -gridImg.height / 2);
      ctx.restore();
    }

    ctx.globalCompositeOperation = 'lighter';
    // datapaket på väg in
    for (const s of stars) {
      const x = cx + Math.cos(s.a) * s.d, y = cy + Math.sin(s.a) * s.d;
      const a = Math.min(1, s.d / rSpawn) * 0.5;
      ctx.fillStyle = `rgba(120,200,255,${a})`; ctx.fillRect(x, y, s.s, s.s);
    }

    // ringar
    ring(rShield, 'rgba(61,220,132,0.10)', 1, [4, 10], -state.t * 20);
    ring(rNode, 'rgba(120,200,255,0.12)', 1, [2, 8], state.t * 12);
    ring(rShield + S * 0.05, 'rgba(255,79,163,0.06)', 1, [30, 30], state.t * 6);

    // dataflöde kärna till noder
    for (const n of nodes) {
      ctx.strokeStyle = n.flash > 0 ? `rgba(255,90,60,${0.3 + n.flash * 0.5})` : 'rgba(61,220,132,0.16)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(n.x, n.y); ctx.stroke();
      for (let k = 0; k < 3; k++) {
        const f = ((state.t * 0.6 + k / 3 + n.i * 0.13) % 1);
        const x = cx + (n.x - cx) * f, y = cy + (n.y - cy) * f;
        ctx.fillStyle = 'rgba(61,220,132,0.8)';
        ctx.beginPath(); ctx.arc(x, y, 1.8, 0, TAU); ctx.fill();
      }
    }

    // puls
    if (state.pulseAnim > 0) {
      const R = S * C.PULSE_RADIUS * (1 - state.pulseAnim * state.pulseAnim);
      ctx.strokeStyle = `rgba(61,220,132,${state.pulseAnim})`; ctx.lineWidth = 6 * state.pulseAnim + 1;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
      ctx.fillStyle = `rgba(61,220,132,${state.pulseAnim * 0.08})`; ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    drawCore();
    nodes.forEach(drawNode);

    ctx.globalCompositeOperation = 'lighter';
    threats.forEach(drawThreat);
    powerups.forEach(drawPower);
    drawShield();
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * p.life + 0.3, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // flytande texter
    ctx.textAlign = 'center';
    for (const f of floats) {
      ctx.globalAlpha = Math.min(1, f.life * 1.5);
      ctx.font = `700 ${Math.max(12, S * 0.022)}px 'JetBrains Mono', monospace`;
      ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // röd vinjett vid skada
    if (state.coreFlash > 0) {
      const v = ctx.createRadialGradient(cx, cy, S * 0.3, cx, cy, Math.hypot(W, H) / 1.6);
      v.addColorStop(0, 'rgba(255,40,40,0)'); v.addColorStop(1, `rgba(255,40,40,${state.coreFlash * 0.35})`);
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    }
  }

  function ring(r, color, w, dash, offset) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.setLineDash(dash); ctx.lineDashOffset = offset;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); ctx.restore();
  }

  function drawCore() {
    const pulseK = 1 + Math.sin(state.t * 2.4) * 0.04;
    const r = rCore * pulseK;
    const hurt = state.coreFlash;
    // glöd
    const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.6);
    g.addColorStop(0, hurt ? `rgba(255,90,60,${0.35 + hurt * 0.3})` : 'rgba(61,220,132,0.35)');
    g.addColorStop(1, 'rgba(61,220,132,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * 2.6, 0, TAU); ctx.fill();
    // hexagoner
    hexPath(ctx, cx, cy, r, state.t * 0.3);
    const f = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    f.addColorStop(0, '#0d5a35'); f.addColorStop(1, '#004131');
    ctx.fillStyle = f; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = hurt ? '#FF5A3C' : '#3DDC84'; ctx.stroke();
    hexPath(ctx, cx, cy, r * 0.62, -state.t * 0.5);
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.stroke();
    // integritet som båge
    const frac = state.integrity / C.START_INTEGRITY;
    ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.strokeStyle = frac > 0.5 ? '#3DDC84' : frac > 0.25 ? '#FFD300' : '#FF5A3C';
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.35, -Math.PI / 2, -Math.PI / 2 + TAU * frac); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#e8f3ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.max(10, r * 0.34)}px Inter, sans-serif`;
    ctx.fillText('RK', cx, cy - r * 0.08);
    ctx.font = `600 ${Math.max(7, r * 0.15)}px Inter, sans-serif`;
    ctx.fillStyle = 'rgba(232,243,255,0.7)'; ctx.fillText('DATAHALL', cx, cy + r * 0.3);
    ctx.textBaseline = 'alphabetic';
  }

  function drawNode(n) {
    const r = nodeSize;
    const hot = n.flash;
    ctx.save();
    if (hot > 0) { ctx.shadowColor = '#FF5A3C'; ctx.shadowBlur = 25 * hot; }
    hexPath(ctx, n.x, n.y, r);
    ctx.fillStyle = hot > 0 ? `rgb(${60 + hot * 140},20,20)` : '#062a3f';
    ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = hot > 0 ? '#FF5A3C' : 'rgba(120,200,255,0.7)'; ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#e8f3ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.max(8, r * (n.short.length > 3 ? 0.42 : 0.5))}px 'JetBrains Mono', monospace`;
    ctx.fillText(n.short, n.x, n.y + 1);
    ctx.textBaseline = 'alphabetic';
  }

  function drawShield() {
    const half = (shieldArc() * Math.PI) / 180 / 2;
    const a0 = state.shield - half, a1 = state.shield + half;
    const col = state.mfa > 0 ? [61, 220, 132] : [61, 220, 132];
    const flash = state.shieldFlash;
    const layers = [[S * 0.05, 0.06], [S * 0.03, 0.12], [S * 0.016, 0.5], [S * 0.007, 1]];
    ctx.lineCap = 'round';
    for (const [w, a] of layers) {
      const c = flash > 0 && w < S * 0.01 ? `rgba(255,255,255,${a})` : `rgba(${col[0]},${col[1]},${col[2]},${a + flash * 0.2})`;
      ctx.strokeStyle = c; ctx.lineWidth = w;
      ctx.beginPath(); ctx.arc(cx, cy, rShield, a0, a1); ctx.stroke();
    }
    // segmentmarkeringar
    ctx.strokeStyle = 'rgba(0,30,20,0.7)'; ctx.lineWidth = 2; ctx.lineCap = 'butt';
    const segs = Math.max(3, Math.round(shieldArc() / 12));
    for (let i = 1; i < segs; i++) {
      const a = a0 + ((a1 - a0) * i) / segs;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (rShield - S * 0.008), cy + Math.sin(a) * (rShield - S * 0.008));
      ctx.lineTo(cx + Math.cos(a) * (rShield + S * 0.008), cy + Math.sin(a) * (rShield + S * 0.008));
      ctx.stroke();
    }
    if (state.mfa > 0) {
      ctx.strokeStyle = `rgba(255,79,163,${0.4 + Math.sin(state.t * 10) * 0.2})`; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, cy, rShield + S * 0.022, a0, a1); ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }

  function drawThreat(t) {
    const col = t.type.color;
    // svans
    ctx.strokeStyle = col; ctx.lineWidth = t.size * 0.35;
    for (let i = 2; i < t.trail.length; i += 2) {
      ctx.globalAlpha = (i / t.trail.length) * 0.35;
      ctx.beginPath(); ctx.moveTo(t.trail[i - 2], t.trail[i - 1]); ctx.lineTo(t.trail[i], t.trail[i + 1]); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // glöd
    const g = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, t.size * 2.2);
    g.addColorStop(0, hexA(col, 0.55)); g.addColorStop(1, hexA(col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(t.x, t.y, t.size * 2.2, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.translate(t.x, t.y);
    drawIcon(t.type.icon, t.size, col, t.spin);
    if (t.type.hp > 1) { // hälsa
      for (let i = 0; i < t.type.hp; i++) {
        ctx.fillStyle = i < t.hp ? col : 'rgba(255,255,255,0.15)';
        ctx.fillRect(-t.size + i * (t.size * 2 / t.type.hp) + 1, t.size * 1.35, t.size * 2 / t.type.hp - 2, 3);
      }
    }
    ctx.restore();
    ctx.globalCompositeOperation = 'lighter';
  }

  function drawIcon(icon, s, col, spin) {
    ctx.fillStyle = '#04111f'; ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.5, s * 0.14);
    ctx.lineJoin = 'round';
    if (icon === 'mail') {
      ctx.beginPath(); ctx.roundRect(-s, -s * 0.7, s * 2, s * 1.4, s * 0.2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.85, -s * 0.55); ctx.lineTo(0, s * 0.15); ctx.lineTo(s * 0.85, -s * 0.55); ctx.stroke();
    } else if (icon === 'bug') {
      ctx.save(); ctx.rotate(Math.sin(spin * 3) * 0.2);
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.moveTo(-s * 1.1, i * s * 0.45); ctx.lineTo(s * 1.1, i * s * 0.45); ctx.stroke();
      }
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.62, s * 0.85, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -s * 0.85); ctx.lineTo(0, s * 0.85); ctx.stroke();
      ctx.restore();
    } else if (icon === 'lock') {
      ctx.beginPath(); ctx.arc(0, -s * 0.25, s * 0.55, Math.PI, 0); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(-s * 0.85, -s * 0.25, s * 1.7, s * 1.25, s * 0.18); ctx.fill(); ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, s * 0.3, s * 0.18, 0, TAU); ctx.fill();
    } else if (icon === 'skull') {
      ctx.rotate(spin);
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = (i * TAU) / 10, rr = i % 2 ? s * 0.5 : s * 1.1; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, s * 0.22, 0, TAU); ctx.fill();
    } else if (icon === 'key') {
      ctx.beginPath(); ctx.arc(-s * 0.4, 0, s * 0.5, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0.1 * s, 0); ctx.lineTo(s * 1.1, 0); ctx.lineTo(s * 1.1, s * 0.4); ctx.moveTo(s * 0.7, 0); ctx.lineTo(s * 0.7, s * 0.35); ctx.stroke();
    } else { // dot
      ctx.fillStyle = col; ctx.beginPath(); ctx.rect(-s * 0.7, -s * 0.7, s * 1.4, s * 1.4); ctx.fill();
    }
  }

  function drawPower(pu) {
    const s = S * 0.03, col = pu.p.color;
    ctx.save(); ctx.translate(pu.x, pu.y);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 2.4);
    g.addColorStop(0, hexA(col, 0.5)); g.addColorStop(1, hexA(col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, s * 2.4, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.rotate(Math.sin(pu.rot) * 0.15);
    ctx.beginPath(); ctx.roundRect(-s * 1.4, -s * 0.7, s * 2.8, s * 1.4, [s * 0.7, s * 0.1, s * 0.7, s * 0.1]);
    ctx.fillStyle = '#04111f'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke();
    ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `800 ${s * 0.62}px Inter, sans-serif`; ctx.fillText(pu.p.name, 0, 1);
    ctx.restore(); ctx.textBaseline = 'alphabetic';
    ctx.globalCompositeOperation = 'lighter';
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  // ---------- Inmatning ----------
  function aimAt(x, y) { state.shieldTarget = state.shield + Logic.angleDiff(Math.atan2(y - cy, x - cx), state.shield); }
  canvas.addEventListener('pointermove', (e) => { if (state.mode === 'play') aimAt(e.clientX, e.clientY); });
  let lastTap = 0;
  canvas.addEventListener('pointerdown', (e) => {
    if (state.mode !== 'play') return;
    aimAt(e.clientX, e.clientY);
    const now = performance.now();
    if (e.pointerType !== 'mouse' && now - lastTap < 300) pulse();
    if (e.pointerType === 'mouse' && e.button === 2) pulse();
    lastTap = now;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
    if (e.code === 'Space') { e.preventDefault(); if (state.mode === 'play') pulse(); else startGame(); }
    if (e.key === 'Enter' && state.mode !== 'play') startGame();
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
  });
  window.addEventListener('resize', resize);
  $('play').addEventListener('click', startGame);
  $('again').addEventListener('click', startGame);
  const muteBtn = $('mute');
  muteBtn.classList.toggle('off', muted);
  muteBtn.addEventListener('click', () => {
    muted = !muted; muteBtn.classList.toggle('off', muted);
    try { localStorage.setItem('bv-muted', muted ? '1' : '0'); } catch (e) {}
  });

  // ---------- Startskärm ----------
  $('title').textContent = C.TITLE;
  $('subtitle').textContent = C.SUBTITLE;
  $('team').textContent = C.TEAM;
  $('threatList').innerHTML = C.THREATS.map((t) => `<span class="chip"><i style="background:${t.color};color:${t.color}"></i>${t.name}</span>`).join('');
  $('build').textContent = `${C.TITLE} v${C.VERSION} · build ${C.BUILD}`;
  document.title = `${C.TITLE} · ${C.TEAM}`;

  if (location.protocol.startsWith('http')) {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    s.onload = () => {
      try {
        new QRCode($('qr'), { text: location.href, width: 184, height: 184, colorDark: '#001328', colorLight: '#ffffff' });
        $('qrWrap').classList.remove('hidden');
      } catch (e) {}
    };
    document.head.appendChild(s);
  }

  // ---------- Loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt); draw();
    requestAnimationFrame(frame);
  }
  resize(); reset('attract');
  window.__bv = { state, startGame, pulse }; // för tester och felsökning
  requestAnimationFrame(frame);
})();
