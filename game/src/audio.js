// Tidekeeper — all sound is synthesised with WebAudio: no audio files, nothing fetched.
// A quiet ambient pad loops under play; every effect is a short oscillator/noise burst.
let ctx = null;
let master = null;
let padNodes = null;
let muted = false;

function ensure() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return ctx; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  } catch { return null; }
  return ctx;
}

export function initAudio() { ensure(); startPad(); }
export function setMuted(m) { muted = m; if (master && ctx) master.gain.value = m ? 0 : 0.5; }
export function isMuted() { return muted; }

function tone(freq, dur, type, vol, slideTo, delay = 0) {
  const c = ensure(); if (!c) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

function noise(dur, vol, freq, delay = 0) {
  const c = ensure(); if (!c) return;
  const t0 = c.currentTime + delay;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = c.createGain(); g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t0);
}

function startPad() {
  const c = ensure(); if (!c || padNodes) return;
  const g = c.createGain(); g.gain.value = 0.05; g.connect(master);
  const oscs = [55, 82.4, 110.3].map((f, i) => {
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const og = c.createGain(); og.gain.value = i === 0 ? 0.6 : 0.25;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07 + i * 0.05;
    const lg = c.createGain(); lg.gain.value = 0.12;
    lfo.connect(lg); lg.connect(og.gain);
    o.connect(og); og.connect(g); o.start(); lfo.start();
    return o;
  });
  padNodes = oscs;
}

export const sfx = {
  shoot() { tone(720, 0.09, 'square', 0.10, 340); },
  enemyHit() { tone(190, 0.06, 'triangle', 0.12, 120); },
  enemyDie() { tone(420, 0.22, 'sawtooth', 0.14, 60); noise(0.15, 0.10, 900); },
  pickup() { tone(880, 0.12, 'sine', 0.12, 1320); },
  hurt() { tone(140, 0.25, 'sawtooth', 0.20, 70); noise(0.2, 0.12, 500); },
  heartHit() { tone(98, 0.3, 'sine', 0.25, 55); },
  dash() { noise(0.18, 0.14, 2400); },
  waveHorn() { tone(196, 0.5, 'triangle', 0.18, 196); tone(294, 0.5, 'triangle', 0.14, 294, 0.08); },
  boss() { tone(65, 0.9, 'sawtooth', 0.22, 40); noise(0.7, 0.10, 300); },
  draft() { tone(523, 0.15, 'sine', 0.14); tone(784, 0.2, 'sine', 0.14, null, 0.1); },
  pick() { tone(660, 0.12, 'sine', 0.16, 990); tone(990, 0.18, 'sine', 0.12, null, 0.08); },
  gameOver() { tone(220, 0.4, 'triangle', 0.18, 110); tone(165, 0.6, 'triangle', 0.18, 82, 0.3); },
  victory() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.35, 'sine', 0.16, null, i * 0.13)); },
};
