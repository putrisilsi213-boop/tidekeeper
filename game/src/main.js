// Tidekeeper — the game loop: screens, input wiring, pause, restart and screenshot mode.
// One file, one job: orchestration. Simulation lives in world.js, drawing in render.js.
import { FIELD, STEP } from './config.js';
import { makeWorld, resetWorld, stepWorld, startWave, applyDraft, EVENT_OVER, EVENT_WIN, EVENT_DRAFT } from './world.js';
import { makeInput } from './input.js';
import { initAudio, setMuted, isMuted, sfx } from './audio.js';
import {
  drawWorld, drawHUD, drawTitle, drawDraft, drawEnd, drawPaused,
  SCREEN_TITLE, SCREEN_PLAY, SCREEN_DRAFT, SCREEN_OVER, SCREEN_WIN,
} from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '7');

const state = makeWorld(seed);
const input = makeInput(canvas);
let screen = SCREEN_TITLE;
let best = Number(localStorage.getItem('tidekeeper-best') || '0');
let paused = false;
let last = performance.now();
let acc = 0;
let announced = '';

function announce(text) {
  if (text !== announced) { announced = text; statusEl.textContent = text; }
}

function startGame() {
  resetWorld(state, (Math.random() * 1e9) | 0);
  startWave(state);
  screen = SCREEN_PLAY;
  paused = false;
  sfx.waveHorn();
}

function toDraft() {
  screen = SCREEN_DRAFT;
  sfx.draft();
}

function endGame(won) {
  screen = won ? SCREEN_WIN : SCREEN_OVER;
  if (state.score > best) { best = state.score; localStorage.setItem('tidekeeper-best', String(best)); }
  if (won) sfx.victory(); else sfx.gameOver();
}

function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  input.poll();

  // global keys
  if (input.pressed('m') || input.pressed('M')) { /* handled below via edge */ }
  if (input.consumeAnyKey()) {
    // 'm' toggles mute on keydown edge
  }
  if (screen === SCREEN_TITLE) {
    acc += dt;
    while (acc >= STEP) { stepWorld(state, STEP, { moveX: 0, moveY: 0, aimX: 640, aimY: 200, fire: false, dash: false }); acc -= STEP; }
    if (input.consumeClick() || input.pressed('Enter')) { initAudio(); startGame(); }
    drawWorld(ctx, state, screen);
    drawTitle(ctx, state, best);
    announce('Tidekeeper. Press Enter or click to dive.');
    return;
  }

  if (screen === SCREEN_DRAFT) {
    // click a card
    if (input.consumeClick()) {
      const w = 300, gap = 36, total = w * 3 + gap * 2;
      const x0 = (FIELD.width - total) / 2;
      const y0 = 210;
      for (let i = 0; i < state.draftCards.length; i++) {
        const x = x0 + i * (w + gap);
        if (input.mouseX >= x && input.mouseX <= x + w && input.mouseY >= y0 && input.mouseY <= y0 + 220) {
          if (applyDraft(state, i)) { sfx.pick(); screen = SCREEN_PLAY; sfx.waveHorn(); }
        }
      }
    }
    for (const k of ['1', '2', '3']) {
      if (input.pressed(k)) {
        const i = Number(k) - 1;
        if (applyDraft(state, i)) { sfx.pick(); screen = SCREEN_PLAY; sfx.waveHorn(); }
        break;
      }
    }
    drawWorld(ctx, state, screen);
    drawDraft(ctx, state);
    announce(`Wave ${state.wave} cleared. Choose one blessing.`);
    return;
  }

  if (screen === SCREEN_OVER || screen === SCREEN_WIN) {
    if (input.consumeClick() || input.pressed('r') || input.pressed('R') || input.pressed('Enter')) startGame();
    drawWorld(ctx, state, screen);
    drawEnd(ctx, state, screen === SCREEN_WIN);
    announce(screen === SCREEN_WIN ? 'Dawn breaks. You won.' : 'The reef goes dark. Press R to dive again.');
    return;
  }

  // play
  if (input.pressed('p') || input.pressed('P') || input.pressed('Escape')) {
    if (!frame._pauseEdge) { paused = !paused; frame._pauseEdge = true; }
  } else frame._pauseEdge = false;
  if (input.pressed('r') || input.pressed('R')) { startGame(); return; }

  if (!paused) {
    acc += dt;
    while (acc >= STEP) {
      const ctrl = {
        moveX: input.moveX, moveY: input.moveY,
        aimX: input.mouseX, aimY: input.mouseY,
        fire: input.fireHeld, dash: input.consumeDash(),
      };
      const before = { shots: state.stats.shotsFired, hp: state.player.hp, heart: state.heartHp, kills: state.kills };
      const ev = stepWorld(state, STEP, ctrl);
      if (state.stats.shotsFired > before.shots) sfx.shoot();
      if (state.kills > before.kills) sfx.enemyDie();
      if (state.player.hp < before.hp) sfx.hurt();
      if (state.heartHp < before.heart) sfx.heartHit();
      if (state.glow > 0 && ev === 0) { /* pickup chime is soft; skip per-frame */ }
      if (ev & EVENT_DRAFT) toDraft();
      if (ev & EVENT_WIN) endGame(true);
      if (ev & EVENT_OVER) endGame(false);
      if (screen !== SCREEN_PLAY) break;
      acc -= STEP;
    }
  }
  drawWorld(ctx, state, screen);
  drawHUD(ctx, state);
  if (paused) drawPaused(ctx);
  announce(`Wave ${state.wave} of 10. Score ${state.score}. Heart ${Math.max(0, Math.round(state.heartHp))} of ${state.heartMax}.`);
}

// mute toggle on keydown (capture before the loop swallows it)
window.addEventListener('keydown', (e) => {
  if ((e.key === 'm' || e.key === 'M') && !e.repeat) { initAudio(); setMuted(!isMuted()); }
});

if (shotName) {
  // Screenshot mode: stage the scene once, draw it, signal readiness.
  const staged = stageShot(shotName, state);
  screen = staged.screen;
  best = staged.best;
  drawWorld(ctx, state, screen);
  if (screen === SCREEN_TITLE) drawTitle(ctx, state, best);
  else if (screen === SCREEN_DRAFT) drawDraft(ctx, state);
  else if (screen === SCREEN_OVER || screen === SCREEN_WIN) drawEnd(ctx, state, screen === SCREEN_WIN);
  else drawHUD(ctx, state);
  document.title = `Tidekeeper — ${shotName}`;
  window.__shotReady = true;
} else {
  // fit the 1280x720 field to the window while keeping its aspect
  function fit() {
    const s = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
    canvas.style.width = `${Math.floor(FIELD.width * s)}px`;
    canvas.style.height = `${Math.floor(FIELD.height * s)}px`;
  }
  window.addEventListener('resize', fit);
  fit();
  requestAnimationFrame(frame);
}
