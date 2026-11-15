// Tidekeeper — the screenshot scenes behind ?shot=start|play|draft|end.
// Each one plays the real rules forward from a fresh world for a fixed number of steps,
// steered by a simple autopilot, so the frame is what a short game really looks like and
// the same seed always gives the same frame.
import { FIELD, HEART, STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN, EVENT_DRAFT, stepWorld, startWave, applyDraft, resetWorld } from './world.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_DRAFT, SCREEN_OVER, SCREEN_WIN } from './render.js';

const START_SECONDS = 6;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;

/** Steer the diver: flee the nearest threat, drift toward shards, auto-fire at the closest enemy. */
function autopilot(state, cautious) {
  const p = state.player;
  let moveX = 0, moveY = 0;
  // flee nearest enemy inside 170px
  let threat = null; let td = 170;
  for (const e of state.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < td) { td = d; threat = e; }
  }
  if (threat) {
    const a = Math.atan2(p.y - threat.y, p.x - threat.x);
    moveX = Math.cos(a); moveY = Math.sin(a);
  } else {
    // chase the nearest shard, else circle the Heart
    let shard = null; let sd = 1e9;
    for (const s of state.shards) {
      const d = Math.hypot(s.x - p.x, s.y - p.y);
      if (d < sd) { sd = d; shard = s; }
    }
    if (shard) {
      moveX = (shard.x - p.x) / sd; moveY = (shard.y - p.y) / sd;
    } else {
      const a = Math.atan2(p.y - HEART.y, p.x - HEART.x) + Math.PI / 2;
      moveX = Math.cos(a) * 0.5; moveY = Math.sin(a) * 0.5;
    }
  }
  // aim at the nearest enemy
  let target = null; let bd = 1e9;
  for (const e of state.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < bd) { bd = d; target = e; }
  }
  const aimX = target ? target.x : p.x + Math.cos(p.angle) * 100;
  const aimY = target ? target.y : p.y + Math.sin(p.angle) * 100;
  // dash away when something is very close
  const dash = threat && td < (cautious ? 90 : 60) && p.dashCd <= 0;
  return { moveX, moveY, aimX, aimY, fire: !!target, dash: !!dash };
}

/** Set `state` to the named scene and return the screen to draw over it. */
export function stageShot(name, state) {
  resetWorld(state, 1);
  if (name === 'draft') {
    startWave(state);
    // play wave 1 with a careful pilot until the draft opens (or a cap)
    for (let i = 0; i < 600 / STEP; i++) {
      const ev = stepWorld(state, STEP, autopilot(state, true));
      if (ev & EVENT_DRAFT) break;
      if (ev & (EVENT_OVER | EVENT_WIN)) break;
    }
    if (state.phase === 'draft') return { screen: SCREEN_DRAFT, best: state.score };
    return { screen: SCREEN_PLAY, best: state.score };
  }
  if (name === 'end') {
    startWave(state);
    // a hurried pilot: short flee radius, no dash, so it is caught out as waves mount
    for (let i = 0; i < END_LIMIT_SECONDS / STEP; i++) {
      const c = autopilot(state, false);
      c.dash = false;
      const ev = stepWorld(state, STEP, c);
      if (ev & EVENT_DRAFT) {
        // keep going: take the first card and continue into the next wave
        applyDraft(state, 0);
        continue;
      }
      if (ev & (EVENT_OVER | EVENT_WIN)) break;
    }
    if (state.phase === 'over') return { screen: SCREEN_OVER, best: state.score };
    if (state.phase === 'win') return { screen: SCREEN_WIN, best: state.score };
    return { screen: SCREEN_PLAY, best: state.score };
  }
  if (name === 'play') {
    startWave(state);
    // clear waves 1 and 2 with a careful pilot, taking the first blessing each time,
    // then stage mid-wave-3 (urchins, jellies and eels in play) for a busy frame
    for (let w = 0; w < 2; w++) {
      for (let i = 0; i < 600 / STEP; i++) {
        const ev = stepWorld(state, STEP, autopilot(state, true));
        if (ev & EVENT_DRAFT) { applyDraft(state, 0); break; }
        if (ev & (EVENT_OVER | EVENT_WIN)) break;
      }
      if (state.phase !== 'play') break;
    }
    for (let i = 0; i < 10 / STEP; i++) {
      const ev = stepWorld(state, STEP, autopilot(state, true));
      if (ev & (EVENT_OVER | EVENT_WIN)) break;
    }
    return { screen: SCREEN_PLAY, best: state.score };
  }
  // start: ambient reef, a few seconds of drifting motes behind the title
  for (let i = 0; i < START_SECONDS / STEP; i++) stepWorld(state, STEP, { moveX: 0, moveY: 0, aimX: 640, aimY: 200, fire: false, dash: false });
  return { screen: SCREEN_TITLE, best: 0 };
}
