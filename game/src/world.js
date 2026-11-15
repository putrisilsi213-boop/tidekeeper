// Tidekeeper — the whole simulation: player, enemies, waves, turrets, draft, win and loss.
// Pure state plus step(): no drawing, no DOM, no sound calls (it returns events instead).
import { FIELD, HEART, PLAYER, HEART_HP, TOTAL_WAVES, ENEMIES, waveComp, UPGRADES, TURRET_ANCHORS } from './config.js';
import { makeRng, pickWeighted, range, choice } from './random.js';

export const EVENT_OVER = 1;
export const EVENT_WIN = 2;
export const EVENT_WAVE_CLEAR = 4;
export const EVENT_DRAFT = 8;

export function makeWorld(seed = 1) {
  const rng = makeRng(seed);
  const state = {
    seed, rng, time: 0, wave: 0,
    phase: 'title', // title | play | draft | over | win
    player: freshPlayer(),
    heartHp: HEART_HP, heartMax: HEART_HP,
    enemies: [], bullets: [], ebullets: [], shards: [], particles: [], texts: [], turrets: [],
    spawnQueue: [], spawnTimer: 0, spawnInterval: 1,
    score: 0, glow: 0, combo: 0, comboTimer: 0, kills: 0,
    draftCards: [], upgradesTaken: {},
    shake: 0, flash: 0, bossWarn: 0,
    stats: { shotsFired: 0, hits: 0 },
    bubbles: [], // ambient background motes, seeded once
  };
  for (let i = 0; i < 70; i++) {
    state.bubbles.push({ x: rng() * FIELD.width, y: rng() * FIELD.height, r: range(rng, 1, 4), s: range(rng, 6, 26), a: range(rng, 0.08, 0.3) });
  }
  return state;
}

function freshPlayer() {
  return {
    x: HEART.x, y: HEART.y + 150, angle: -Math.PI / 2,
    hp: PLAYER.hp, hpMax: PLAYER.hp,
    speed: PLAYER.speed, fireInterval: PLAYER.fireInterval, damage: PLAYER.damage,
    shots: 1, pierce: 0, magnet: PLAYER.magnet, critChance: PLAYER.critChance, critMult: PLAYER.critMult,
    dashCooldown: PLAYER.dashCooldown, dashCd: 0, dashTime: 0, invuln: 0, fireCd: 0, nova: false,
  };
}

export function resetWorld(state, seed = 1) {
  const fresh = makeWorld(seed);
  for (const k of Object.keys(fresh)) state[k] = fresh[k];
}

// ---- waves -----------------------------------------------------------------
export function startWave(state) {
  state.wave += 1;
  const comp = waveComp(state.wave);
  state.spawnQueue = [];
  for (let i = 0; i < comp.count; i++) state.spawnQueue.push(pickWeighted(state.rng, comp.table));
  if (comp.boss) state.spawnQueue.push(comp.boss);
  state.spawnInterval = comp.interval;
  state.spawnTimer = 0.6;
  state.hpScale = comp.hpScale;
  state.bossWarn = comp.boss ? 2.0 : 0;
  state.phase = 'play';
}

function spawnEnemy(state, kind) {
  const def = ENEMIES[kind];
  const edge = Math.floor(state.rng() * 4);
  let x, y;
  if (edge === 0) { x = range(state.rng, 0, FIELD.width); y = -30; }
  else if (edge === 1) { x = FIELD.width + 30; y = range(state.rng, 0, FIELD.height); }
  else if (edge === 2) { x = range(state.rng, 0, FIELD.width); y = FIELD.height + 30; }
  else { x = -30; y = range(state.rng, 0, FIELD.height); }
  const hp = Math.round(def.hp * (state.hpScale || 1) * (kind === 'maw' || kind === 'dreadmaw' ? 1 : 1));
  state.enemies.push({
    kind, def, x, y, hp, hpMax: hp, radius: def.radius,
    speed: def.speed * range(state.rng, 0.9, 1.1),
    phase: state.rng() * Math.PI * 2, wobble: range(state.rng, 0.4, 1.1),
    hitFlash: 0, shootCd: range(state.rng, 1, 2), chewCd: 0, burstCd: 4,
  });
}

function rollDraft(state) {
  const avail = UPGRADES.filter((u) => (state.upgradesTaken[u.id] || 0) < u.max);
  const pool = [...avail];
  const cards = [];
  while (cards.length < 3 && pool.length > 0) {
    const i = Math.floor(state.rng() * pool.length);
    cards.push(pool.splice(i, 1)[0]);
  }
  state.draftCards = cards;
}

export function applyDraft(state, index) {
  const card = state.draftCards[index];
  if (!card || state.phase !== 'draft') return false;
  state.upgradesTaken[card.id] = (state.upgradesTaken[card.id] || 0) + 1;
  card.apply(state.player, state);
  state.draftCards = [];
  state.glow += 0;
  startWave(state);
  return true;
}

// ---- combat helpers ---------------------------------------------------------
function addText(state, x, y, text, color) {
  state.texts.push({ x, y, vy: -34, life: 0.9, maxLife: 0.9, text, color });
}
function burst(state, x, y, color, n, speed = 160) {
  for (let i = 0; i < n; i++) {
    const a = state.rng() * Math.PI * 2;
    const s = range(state.rng, speed * 0.3, speed);
    state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: range(state.rng, 0.3, 0.7), maxLife: 0.7, size: range(state.rng, 2, 5), color });
  }
}
function killEnemy(state, e, award = true) {
  e.dead = true;
  state.kills += 1;
  if (award) {
    state.combo += 1; state.comboTimer = 3;
    const mult = 1 + Math.min(state.combo, 20) * 0.05;
    const gained = Math.round(e.def.score * mult);
    state.score += gained;
    addText(state, e.x, e.y - e.radius, `+${gained}`, '#ffd166');
    const n = e.def.glow;
    for (let i = 0; i < n; i++) {
      state.shards.push({ x: e.x + range(state.rng, -12, 12), y: e.y + range(state.rng, -12, 12), vx: range(state.rng, -40, 40), vy: range(state.rng, -40, 40), value: 1, life: 12 });
    }
    burst(state, e.x, e.y, e.def.color, e.kind === 'maw' || e.kind === 'dreadmaw' ? 40 : 12, 200);
  }
}
function damageHeart(state, amount) {
  state.heartHp -= amount;
  state.flash = 0.35; state.shake = Math.max(state.shake, 8);
  burst(state, HEART.x, HEART.y, '#ff7a90', 10, 140);
}
function hurtPlayer(state, amount, fromX, fromY) {
  const p = state.player;
  if (p.invuln > 0 || p.dashTime > 0) return;
  p.hp -= amount;
  p.invuln = 0.9;
  state.shake = Math.max(state.shake, 6);
  const a = Math.atan2(p.y - fromY, p.x - fromX);
  p.x += Math.cos(a) * 18; p.y += Math.sin(a) * 18;
  burst(state, p.x, p.y, '#ff5d73', 10, 160);
}

// ---- the step ---------------------------------------------------------------
export function stepWorld(state, dt, ctrl) {
  // ctrl: { moveX, moveY, aimX, aimY, fire, dash } — ignored outside play.
  let events = 0;
  state.time += dt;
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 30);
  if (state.flash > 0) state.flash = Math.max(0, state.flash - dt);
  if (state.bossWarn > 0) state.bossWarn = Math.max(0, state.bossWarn - dt);
  for (const b of state.bubbles) { b.y -= b.s * dt; if (b.y < -6) { b.y = FIELD.height + 6; b.x = state.rng() * FIELD.width; } }
  updateParticles(state, dt);
  if (state.phase !== 'play') return events;

  const p = state.player;
  // --- player movement & dash
  p.fireCd -= dt; p.dashCd -= dt; p.invuln -= dt;
  const dashing = p.dashTime > 0;
  if (ctrl.dash && p.dashCd <= 0 && !dashing) {
    p.dashTime = PLAYER.dashTime; p.dashCd = p.dashCooldown; p.invuln = Math.max(p.invuln, 0.3);
    burst(state, p.x, p.y, '#5ef2d6', 14, 220);
    if (p.nova) {
      for (const e of state.enemies) {
        if (Math.hypot(e.x - p.x, e.y - p.y) < 190) { e.hp -= 30; e.hitFlash = 0.15; if (e.hp <= 0) killEnemy(state, e); }
      }
      burst(state, p.x, p.y, '#ffd166', 26, 320);
    }
  }
  if (p.dashTime > 0) p.dashTime -= dt;
  const speed = dashing ? PLAYER.dashSpeed : p.speed;
  p.x = clamp(p.x + ctrl.moveX * speed * dt, 20, FIELD.width - 20);
  p.y = clamp(p.y + ctrl.moveY * speed * dt, 20, FIELD.height - 20);
  p.angle = Math.atan2(ctrl.aimY - p.y, ctrl.aimX - p.x);

  // --- firing
  if (ctrl.fire && p.fireCd <= 0) {
    p.fireCd = p.fireInterval;
    state.stats.shotsFired += 1;
    const n = p.shots;
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 0.14;
      const a = p.angle + off;
      state.bullets.push({ x: p.x + Math.cos(a) * 22, y: p.y + Math.sin(a) * 22, vx: Math.cos(a) * PLAYER.bulletSpeed, vy: Math.sin(a) * PLAYER.bulletSpeed, damage: p.damage, pierce: p.pierce, from: 'player', crit: state.rng() < p.critChance });
    }
  }

  // --- spawning
  if (state.spawnQueue.length > 0) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      state.spawnTimer = state.spawnInterval;
      spawnEnemy(state, state.spawnQueue.shift());
    }
  }

  // --- turrets
  for (const t of state.turrets) {
    t.cooldown -= dt;
    if (t.cooldown > 0) continue;
    let best = null; let bd = t.range;
    for (const e of state.enemies) {
      const d = Math.hypot(e.x - t.x, e.y - t.y);
      if (d < bd) { bd = d; best = e; }
    }
    if (best) {
      t.cooldown = t.fireInterval;
      const a = Math.atan2(best.y - t.y, best.x - t.x);
      state.bullets.push({ x: t.x, y: t.y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, damage: t.damage, pierce: 0, from: 'turret', crit: false });
    }
  }

  // --- enemies
  for (const e of state.enemies) {
    if (e.hitFlash > 0) e.hitFlash -= dt;
    const dxH = HEART.x - e.x, dyH = HEART.y - e.y;
    const dH = Math.hypot(dxH, dyH) || 1;
    const dxP = p.x - e.x, dyP = p.y - e.y;
    const dP = Math.hypot(dxP, dyP) || 1;
    let tx, ty;
    if (e.def.behaviour === 'hunt') { tx = dxP / dP; ty = dyP / dP; }
    else if (e.def.behaviour === 'ranged') {
      if (dH > 280) { tx = dxH / dH; ty = dyH / dH; }
      else { tx = -dxH / dH; ty = -dyH / dH; }
      e.shootCd -= dt;
      if (e.shootCd <= 0 && dH < 420) {
        e.shootCd = 2.2;
        const a = Math.atan2(dyH, dxH);
        state.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, damage: 6, radius: 6 });
      }
    } else if (e.def.behaviour === 'boss') {
      tx = dxH / dH; ty = dyH / dH;
      e.burstCd -= dt;
      if (e.burstCd <= 0) {
        e.burstCd = 4.5;
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + state.time;
          state.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, damage: 8, radius: 7 });
        }
        for (let i = 0; i < 2; i++) spawnEnemy(state, 'mite');
      }
    } else { tx = dxH / dH; ty = dyH / dH; }
    // wobble perpendicular to travel
    const wob = Math.sin(state.time * e.wobble + e.phase) * 0.45;
    const mx = tx - ty * wob, my = ty + tx * wob;
    const ml = Math.hypot(mx, my) || 1;
    e.x += (mx / ml) * e.speed * dt;
    e.y += (my / ml) * e.speed * dt;
    // reach the Heart: chew it, then burst
    if (dH < HEART.radius + e.radius + 2) {
      e.chewCd -= dt;
      if (e.chewCd <= 0) {
        e.chewCd = 0.8;
        if (e.def.behaviour === 'boss') {
          damageHeart(state, e.def.damage);
          e.x -= (dxH / dH) * 60; e.y -= (dyH / dH) * 60;
        } else {
          damageHeart(state, e.def.damage);
          killEnemy(state, e, false);
          state.score = Math.max(0, state.score - 5);
        }
      }
    }
    // touch the player
    if (e.dead) continue;
    if (dP < e.radius + PLAYER.radius) {
      hurtPlayer(state, e.def.behaviour === 'boss' ? 20 : 10, e.x, e.y);
      if (e.def.behaviour !== 'boss') { e.hp -= 20; e.hitFlash = 0.15; if (e.hp <= 0) killEnemy(state, e); }
    }
  }

  // --- bullets
  for (const b of state.bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20) { b.dead = true; continue; }
    for (const e of state.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - b.x, e.y - b.y) < e.radius + 5) {
        const dmg = b.damage * (b.crit ? PLAYER.critMult : 1);
        e.hp -= dmg; e.hitFlash = 0.12; state.stats.hits += 1;
        addText(state, e.x, e.y - e.radius - 6, String(Math.round(dmg)), b.crit ? '#ffd166' : '#eaf6ff');
        burst(state, b.x, b.y, '#5ef2d6', 3, 90);
        if (e.hp <= 0) killEnemy(state, e);
        if (b.pierce > 0) { b.pierce -= 1; } else { b.dead = true; }
        break;
      }
    }
  }
  // --- enemy bullets
  for (const b of state.ebullets) {
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20) { b.dead = true; continue; }
    if (Math.hypot(p.x - b.x, p.y - b.y) < PLAYER.radius + b.radius) { hurtPlayer(state, b.damage, b.x - b.vx * 0.05, b.y - b.vy * 0.05); b.dead = true; continue; }
    if (Math.hypot(HEART.x - b.x, HEART.y - b.y) < HEART.radius + b.radius) { damageHeart(state, 4); b.dead = true; }
  }
  // --- shards drift to the player
  for (const s of state.shards) {
    s.life -= dt;
    const d = Math.hypot(p.x - s.x, p.y - s.y);
    if (d < p.magnet) { const a = Math.atan2(p.y - s.y, p.x - s.x); const pull = 520 * (1 - d / p.magnet) + 120; s.vx += Math.cos(a) * pull * dt * 4; s.vy += Math.sin(a) * pull * dt * 4; }
    else { s.vx *= 0.98; s.vy *= 0.98; }
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (d < 24) { s.dead = true; state.glow += s.value; }
    if (s.life <= 0) s.dead = true;
  }
  // --- combo decay
  if (state.comboTimer > 0) { state.comboTimer -= dt; if (state.comboTimer <= 0) state.combo = 0; }

  // --- sweep
  state.enemies = state.enemies.filter((e) => !e.dead);
  state.bullets = state.bullets.filter((b) => !b.dead);
  state.ebullets = state.ebullets.filter((b) => !b.dead);
  state.shards = state.shards.filter((s) => !s.dead);

  // --- endings
  if (p.hp <= 0 || state.heartHp <= 0) {
    state.phase = 'over';
    burst(state, p.x, p.y, '#ff5d73', 40, 260);
    return events | EVENT_OVER;
  }
  if (state.spawnQueue.length === 0 && state.enemies.length === 0) {
    if (state.wave >= TOTAL_WAVES) {
      state.phase = 'win';
      state.score += 1000;
      return events | EVENT_WIN;
    }
    state.glow += 10 + state.wave * 2;
    rollDraft(state);
    state.phase = 'draft';
    return events | EVENT_WAVE_CLEAR | EVENT_DRAFT;
  }
  return events;
}

function updateParticles(state, dt) {
  for (const pt of state.particles) { pt.life -= dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vx *= 0.97; pt.vy *= 0.97; }
  state.particles = state.particles.filter((pt) => pt.life > 0);
  for (const t of state.texts) { t.life -= dt; t.y += t.vy * dt; }
  state.texts = state.texts.filter((t) => t.life > 0);
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
export { TURRET_ANCHORS };
