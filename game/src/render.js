// Tidekeeper — every pixel: the reef, the Heart, the player, enemies, HUD and screens.
// One file, one job: drawing only. It reads state, never changes it.
import { FIELD, HEART, PLAYER, TOTAL_WAVES, COLORS } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_DRAFT = 'draft';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function glowCircle(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawWorld(ctx, state, screen) {
  ctx.save();
  if (state.shake > 0) ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  drawReef(ctx, state);
  drawHeart(ctx, state);
  for (const t of state.turrets) drawTurret(ctx, t, state.time);
  for (const s of state.shards) drawShard(ctx, s, state.time);
  for (const e of state.enemies) drawEnemy(ctx, e, state.time);
  for (const b of state.bullets) drawBolt(ctx, b);
  for (const b of state.ebullets) drawEnemyBolt(ctx, b);
  if (state.phase === 'play' || screen === SCREEN_PLAY) drawPlayer(ctx, state);
  for (const pt of state.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  for (const t of state.texts) {
    ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255,60,90,${state.flash * 0.35})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }
}

function drawReef(ctx, state) {
  const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  g.addColorStop(0, '#0a2a4a');
  g.addColorStop(0.55, '#06233f');
  g.addColorStop(1, '#04101f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  // god rays
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#bfefff';
  for (let i = 0; i < 5; i++) {
    const x = 120 + i * 240 + Math.sin(state.time * 0.1 + i) * 30;
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x + 70, 0); ctx.lineTo(x + 190, FIELD.height); ctx.lineTo(x + 60, FIELD.height);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // drifting motes
  for (const b of state.bubbles) {
    ctx.globalAlpha = b.a;
    ctx.fillStyle = '#9fe8ff';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // seabed silhouette
  ctx.fillStyle = '#03101f';
  ctx.beginPath();
  ctx.moveTo(0, FIELD.height);
  for (let x = 0; x <= FIELD.width; x += 80) ctx.lineTo(x, FIELD.height - 26 - Math.sin(x * 0.011 + 1.3) * 14);
  ctx.lineTo(FIELD.width, FIELD.height);
  ctx.closePath(); ctx.fill();
  // coral tufts on the seabed
  ctx.strokeStyle = 'rgba(255,122,144,0.5)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 9; i++) {
    const x = 60 + i * 140;
    const h = 22 + ((i * 37) % 26);
    ctx.beginPath();
    ctx.moveTo(x, FIELD.height - 18);
    ctx.quadraticCurveTo(x - 8, FIELD.height - 18 - h, x - 16, FIELD.height - 22 - h);
    ctx.moveTo(x, FIELD.height - 18);
    ctx.quadraticCurveTo(x + 6, FIELD.height - 20 - h, x + 14, FIELD.height - 24 - h);
    ctx.stroke();
  }
}

function drawHeart(ctx, state) {
  const pulse = 1 + Math.sin(state.time * 2.2) * 0.08;
  const low = state.heartHp / state.heartMax < 0.35;
  const core = low ? '#ff2e63' : '#ff7a90';
  glowCircle(ctx, HEART.x, HEART.y, 130 * pulse, low ? 'rgba(255,46,99,0.55)' : 'rgba(255,122,144,0.45)', 0.8);
  // coral branches
  ctx.strokeStyle = '#ff9fb0';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.4;
    const len = 34 + ((i * 13) % 18);
    ctx.beginPath();
    ctx.moveTo(HEART.x + Math.cos(a) * 14, HEART.y + Math.sin(a) * 14);
    ctx.quadraticCurveTo(
      HEART.x + Math.cos(a) * (len * 0.7) + Math.sin(a) * 8, HEART.y + Math.sin(a) * (len * 0.7) - Math.cos(a) * 8,
      HEART.x + Math.cos(a) * len, HEART.y + Math.sin(a) * len);
    ctx.stroke();
  }
  const g = ctx.createRadialGradient(HEART.x - 8, HEART.y - 10, 2, HEART.x, HEART.y, HEART.radius * pulse);
  g.addColorStop(0, '#fff0f3');
  g.addColorStop(0.5, core);
  g.addColorStop(1, '#c22a4d');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(HEART.x, HEART.y, HEART.radius * 0.62 * pulse, 0, Math.PI * 2); ctx.fill();
  // heart ring showing HP
  ctx.strokeStyle = 'rgba(234,246,255,0.85)';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(HEART.x, HEART.y, HEART.radius + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, state.heartHp / state.heartMax)); ctx.stroke();
  ctx.strokeStyle = 'rgba(234,246,255,0.18)';
  ctx.beginPath(); ctx.arc(HEART.x, HEART.y, HEART.radius + 8, 0, Math.PI * 2); ctx.stroke();
}

function drawTurret(ctx, t, time) {
  glowCircle(ctx, t.x, t.y, 46, 'rgba(94,242,214,0.4)', 0.7);
  ctx.fillStyle = '#0d3a3a';
  ctx.strokeStyle = '#5ef2d6';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#5ef2d6';
  ctx.beginPath(); ctx.arc(t.x, t.y + Math.sin(time * 3) * 2, 5, 0, Math.PI * 2); ctx.fill();
}

function drawShard(ctx, s, time) {
  const tw = 0.6 + Math.sin(time * 6 + s.x) * 0.4;
  glowCircle(ctx, s.x, s.y, 14, 'rgba(255,209,102,0.6)', 0.6 * tw + 0.2);
  ctx.fillStyle = '#ffd166';
  ctx.save();
  ctx.translate(s.x, s.y); ctx.rotate(time * 2 + s.x);
  ctx.fillRect(-4, -4, 8, 8);
  ctx.restore();
}

function drawPlayer(ctx, state) {
  const p = state.player;
  if (p.invuln > 0 && Math.floor(state.time * 16) % 2 === 0) return; // blink while invulnerable
  glowCircle(ctx, p.x, p.y, 52, 'rgba(94,242,214,0.5)', 0.8);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  // lanternfish body
  ctx.fillStyle = '#123f5c';
  ctx.strokeStyle = '#5ef2d6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, 0); ctx.lineTo(-12, -12); ctx.lineTo(-18, 0); ctx.lineTo(-12, 12);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // tail fin
  ctx.fillStyle = '#5ef2d6';
  ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(-28, -9); ctx.lineTo(-28, 9); ctx.closePath(); ctx.fill();
  // glowing lure
  ctx.strokeStyle = '#ffd166';
  ctx.beginPath(); ctx.moveTo(8, -6); ctx.quadraticCurveTo(20, -18, 26, -14); ctx.stroke();
  glowCircle(ctx, 26, -14, 12, 'rgba(255,209,102,0.9)', 0.9);
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath(); ctx.arc(26, -14, 3.5, 0, Math.PI * 2); ctx.fill();
  // eye
  ctx.fillStyle = '#eaf6ff';
  ctx.beginPath(); ctx.arc(8, -3, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (p.dashCd > 0) {
    ctx.strokeStyle = 'rgba(94,242,214,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p.dashCd / p.dashCooldown)); ctx.stroke();
  }
}

function drawBolt(ctx, b) {
  const a = Math.atan2(b.vy, b.vx);
  ctx.save();
  ctx.translate(b.x, b.y); ctx.rotate(a);
  ctx.fillStyle = b.from === 'turret' ? '#9ff5e4' : '#d8fff4';
  ctx.shadowColor = '#5ef2d6'; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.ellipse(0, 0, 11, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.shadowBlur = 0;
}

function drawEnemyBolt(ctx, b) {
  glowCircle(ctx, b.x, b.y, 16, 'rgba(255,93,115,0.55)', 0.8);
  ctx.fillStyle = '#ff8fa3';
  ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();
}

function drawEnemy(ctx, e, time) {
  const flash = e.hitFlash > 0;
  glowCircle(ctx, e.x, e.y, e.radius * 2.4, e.def.color, 0.35);
  ctx.save();
  ctx.translate(e.x, e.y);
  const wob = Math.sin(time * 3 + e.phase) * 0.12;
  ctx.rotate(wob);
  ctx.fillStyle = flash ? '#ffffff' : e.def.color;
  ctx.strokeStyle = 'rgba(4,16,31,0.6)';
  ctx.lineWidth = 2;
  if (e.kind === 'mite') {
    ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#04101f';
    ctx.beginPath(); ctx.arc(4, -3, 2.5, 0, Math.PI * 2); ctx.arc(4, 3, 2.5, 0, Math.PI * 2); ctx.fill();
  } else if (e.kind === 'urchin') {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + time * 0.5;
      ctx.moveTo(Math.cos(a) * 4, Math.sin(a) * 4);
      ctx.lineTo(Math.cos(a) * (e.radius + 6), Math.sin(a) * (e.radius + 6));
    }
    ctx.strokeStyle = e.def.color; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, e.radius - 2, 0, Math.PI * 2); ctx.fillStyle = flash ? '#fff' : '#e8b64c'; ctx.fill();
  } else if (e.kind === 'jelly') {
    ctx.beginPath(); ctx.arc(0, 0, e.radius, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = e.def.color; ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(i * 7, e.radius * 0.7);
      ctx.quadraticCurveTo(i * 7 + Math.sin(time * 4 + i) * 6, e.radius * 1.3, i * 7, e.radius * 1.7);
      ctx.stroke();
    }
  } else if (e.kind === 'eel') {
    ctx.beginPath(); ctx.ellipse(0, 0, e.radius + 8, e.radius * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#04101f';
    ctx.beginPath(); ctx.arc(e.radius * 0.7, -2, 2.5, 0, Math.PI * 2); ctx.fill();
  } else if (e.kind === 'spitter') {
    ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#04101f';
    ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = e.def.color;
    ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.2, 0, Math.PI * 2); ctx.fill();
  } else { // bosses
    ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a0612';
    ctx.beginPath(); ctx.arc(0, e.radius * 0.25, e.radius * 0.55, 0, Math.PI); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(i * 12 - 5, e.radius * 0.28); ctx.lineTo(i * 12, e.radius * 0.28 + 12); ctx.lineTo(i * 12 + 5, e.radius * 0.28); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(-e.radius * 0.4, -e.radius * 0.4, 5, 0, Math.PI * 2); ctx.arc(e.radius * 0.4, -e.radius * 0.4, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // hp bar for tough enemies
  if (e.hpMax >= 70 && e.hp < e.hpMax) {
    const w = e.radius * 2;
    ctx.fillStyle = 'rgba(4,16,31,0.7)';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w, 5);
    ctx.fillStyle = '#ff5d73';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w * (e.hp / e.hpMax), 5);
  }
}

// ---- HUD --------------------------------------------------------------------
export function drawHUD(ctx, state) {
  const p = state.player;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillStyle = '#eaf6ff';
  ctx.fillText(`WAVE ${Math.max(1, state.wave)} / ${TOTAL_WAVES}`, 18, 34);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = '#ffd166';
  ctx.fillText(`SCORE ${state.score}`, 18, 58);
  ctx.fillStyle = '#5ef2d6';
  ctx.fillText(`GLOW ◆ ${state.glow}`, 18, 80);
  if (state.combo >= 3) {
    ctx.fillStyle = '#ff9fb0';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(`COMBO x${state.combo}`, 18, 104);
  }
  // heart + player bars, top right
  bar(ctx, FIELD.width - 268, 18, 250, 16, state.heartHp / state.heartMax, '#ff7a90', 'HEART');
  bar(ctx, FIELD.width - 268, 44, 250, 16, p.hp / p.hpMax, '#5ef2d6', 'DIVER');
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(234,246,255,0.75)';
  ctx.fillText(`KILLS ${state.kills} · DASH ${p.dashCd <= 0 ? 'READY' : '…'} · P pause · M mute`, FIELD.width - 268, 84);
  if (state.bossWarn > 0) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillStyle = '#ff5d73';
    ctx.fillText(state.wave === 10 ? 'THE DREAD MAW AWAKENS' : 'THE ABYSSAL MAW AWAKENS', FIELD.width / 2, 120);
  }
  ctx.restore();
}

function bar(ctx, x, y, w, h, frac, color, label) {
  ctx.fillStyle = 'rgba(4,16,31,0.7)';
  rr(ctx, x, y, w, h, 8); ctx.fill();
  ctx.fillStyle = color;
  if (frac > 0) { rr(ctx, x + 2, y + 2, (w - 4) * Math.max(0, Math.min(1, frac)), h - 4, 6); ctx.fill(); }
  ctx.fillStyle = '#eaf6ff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 6, y + h - 4);
}

// ---- screens ------------------------------------------------------------------
function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(3,14,26,0.82)';
  rr(ctx, x, y, w, h, 18); ctx.fill();
  ctx.strokeStyle = 'rgba(94,242,214,0.35)';
  ctx.lineWidth = 2; ctx.stroke();
}

export function drawTitle(ctx, state, best) {
  ctx.fillStyle = 'rgba(3,12,24,0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#5ef2d6';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('· A DEEP-SEA DEFENCE ·', FIELD.width / 2, 128);
  ctx.fillStyle = '#eaf6ff';
  ctx.font = 'bold 84px system-ui, sans-serif';
  ctx.fillText('TIDEKEEPER', FIELD.width / 2, 216);
  ctx.fillStyle = '#ffd166';
  ctx.font = '28px system-ui, sans-serif';
  ctx.fillText('Guard the Coral Heart through 10 waves', FIELD.width / 2, 262);
  ctx.fillStyle = 'rgba(234,246,255,0.9)';
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText('WASD / arrows — swim    Mouse — aim    Hold click / Space — fire    Shift — dash', FIELD.width / 2, 330);
  ctx.fillText('Enemies hunt the Heart. Slay them, gather glow, draft upgrades between waves.', FIELD.width / 2, 360);
  ctx.fillText('Bosses rise on waves 5 and 10. If the Heart shatters — or you fall — the reef goes dark.', FIELD.width / 2, 388);
  if (best > 0) {
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(`BEST SCORE  ${best}`, FIELD.width / 2, 430);
  }
  ctx.fillStyle = '#5ef2d6';
  ctx.font = 'bold 24px system-ui, sans-serif';
  const blink = Math.sin(state.time * 3) > -0.2;
  if (blink) ctx.fillText('— CLICK OR PRESS ENTER TO DIVE —', FIELD.width / 2, 500);
  ctx.fillStyle = 'rgba(234,246,255,0.55)';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('An original game · canvas + synthesised sound · no downloads, no network', FIELD.width / 2, 660);
}

export function drawDraft(ctx, state) {
  ctx.fillStyle = 'rgba(3,12,24,0.6)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.fillText(`WAVE ${state.wave} CLEARED`, FIELD.width / 2, 110);
  ctx.fillStyle = '#eaf6ff';
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText(`Score ${state.score}  ·  Glow ◆ ${state.glow}  ·  Choose one blessing of the reef  (click or press 1–3)`, FIELD.width / 2, 150);
  const w = 300, h = 220, gap = 36;
  const total = w * 3 + gap * 2;
  const x0 = (FIELD.width - total) / 2;
  const y0 = 210;
  state.draftCards.forEach((card, i) => {
    const x = x0 + i * (w + gap);
    panel(ctx, x, y0, w, h);
    ctx.fillStyle = '#5ef2d6';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(`[${i + 1}]  BLESSING`, x + w / 2, y0 + 40);
    ctx.fillStyle = '#eaf6ff';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(card.name, x + w / 2, y0 + 88);
    ctx.fillStyle = 'rgba(234,246,255,0.85)';
    ctx.font = '17px system-ui, sans-serif';
    wrapText(ctx, card.blurb, x + w / 2, y0 + 128, w - 40, 24);
    const taken = state.upgradesTaken[card.id] || 0;
    ctx.fillStyle = 'rgba(234,246,255,0.55)';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(`owned ${taken} / ${card.max}`, x + w / 2, y0 + h - 24);
  });
  ctx.fillStyle = 'rgba(234,246,255,0.7)';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText(`Next: wave ${state.wave + 1} of ${TOTAL_WAVES}`, FIELD.width / 2, 500);
}

function wrapText(ctx, text, cx, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, cx, yy); line = word; yy += lh; }
    else line = test;
  }
  ctx.fillText(line, cx, yy);
}

export function drawEnd(ctx, state, won) {
  ctx.fillStyle = won ? 'rgba(6,40,34,0.62)' : 'rgba(26,4,12,0.66)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? '#5ef2d6' : '#ff5d73';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText(won ? 'DAWN BREAKS' : 'THE REEF GOES DARK', FIELD.width / 2, 250);
  ctx.fillStyle = '#eaf6ff';
  ctx.font = '24px system-ui, sans-serif';
  ctx.fillText(
    won ? 'The Dread Maw is dust. Ten waves weathered — the Coral Heart blooms again.'
        : state.heartHp <= 0 ? 'The Coral Heart has shattered. The light fades from the reef…'
        : 'The diver has fallen. The reef waits for another keeper…',
    FIELD.width / 2, 310);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(`SCORE ${state.score}   ·   WAVE ${state.wave} / ${TOTAL_WAVES}   ·   KILLS ${state.kills}`, FIELD.width / 2, 380);
  ctx.fillStyle = '#eaf6ff';
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('Press R or click to dive again', FIELD.width / 2, 440);
}

export function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(3,12,24,0.6)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#eaf6ff';
  ctx.font = 'bold 48px system-ui, sans-serif';
  ctx.fillText('PAUSED', FIELD.width / 2, 340);
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText('Press P to resume · R to restart', FIELD.width / 2, 384);
}
