// Tidekeeper — shared tuning and content tables.
// A deep-sea defence: guard the Coral Heart at the centre of the reef through 10 waves.
// One file, one job: numbers and content only, no logic.
export const FIELD = { width: 1280, height: 720 };
export const HEART = { x: 640, y: 360, radius: 46 };
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 16,
  speed: 260,
  hp: 100,
  fireInterval: 0.22,
  damage: 12,
  bulletSpeed: 620,
  dashCooldown: 2.5,
  dashTime: 0.18,
  dashSpeed: 780,
  magnet: 110,
  critChance: 0.05,
  critMult: 2,
};

export const HEART_HP = 120;
export const TOTAL_WAVES = 10;
export const WIN_SCORE_BONUS = 1000;

// Enemy kinds: speed, hp, radius, damage to heart, glow value, score, behaviour.
export const ENEMIES = {
  mite:    { speed: 78,  hp: 18,  radius: 11, damage: 6,  glow: 1, score: 10,  behaviour: 'seek',   color: '#7ef0c1' },
  urchin:  { speed: 150, hp: 12,  radius: 9,  damage: 5,  glow: 1, score: 15,  behaviour: 'seek',   color: '#ffd166' },
  jelly:   { speed: 48,  hp: 70,  radius: 22, damage: 14, glow: 3, score: 30,  behaviour: 'seek',   color: '#f78fb3' },
  eel:     { speed: 132, hp: 34,  radius: 13, damage: 9,  glow: 2, score: 25,  behaviour: 'hunt',   color: '#8ecbff' },
  spitter: { speed: 60,  hp: 26,  radius: 14, damage: 7,  glow: 2, score: 30,  behaviour: 'ranged', color: '#c39bff' },
  maw:     { speed: 42,  hp: 520, radius: 44, damage: 30, glow: 25, score: 300, behaviour: 'boss',  color: '#ff5d73' },
  dreadmaw:{ speed: 50,  hp: 1100,radius: 54, damage: 40, glow: 60, score: 800, behaviour: 'boss',  color: '#ff2e63' },
};

// Which kinds may appear in each wave (weights), plus count and spawn pacing.
export function waveComp(wave) {
  const table = [
    { mite: 1 },
    { mite: 0.7, urchin: 0.3 },
    { mite: 0.5, urchin: 0.3, jelly: 0.2 },
    { mite: 0.4, urchin: 0.3, jelly: 0.15, eel: 0.15 },
    { mite: 0.35, urchin: 0.25, jelly: 0.15, eel: 0.15, spitter: 0.1 },
    { mite: 0.3, urchin: 0.25, jelly: 0.2, eel: 0.15, spitter: 0.1 },
    { mite: 0.25, urchin: 0.25, jelly: 0.2, eel: 0.15, spitter: 0.15 },
    { mite: 0.25, urchin: 0.2, jelly: 0.2, eel: 0.2, spitter: 0.15 },
    { mite: 0.2, urchin: 0.2, jelly: 0.2, eel: 0.2, spitter: 0.2 },
    { mite: 0.2, urchin: 0.2, jelly: 0.2, eel: 0.2, spitter: 0.2 },
  ][wave - 1];
  const count = 6 + wave * 3 + (wave >= 5 ? 4 : 0);
  const interval = Math.max(0.35, 1.15 - wave * 0.07);
  const hpScale = 1 + (wave - 1) * 0.16;
  const boss = wave === 5 ? 'maw' : wave === 10 ? 'dreadmaw' : null;
  return { table, count, interval, hpScale, boss };
}

// Draft upgrades offered between waves. id, name, blurb, max stacks, apply(state).
export const UPGRADES = [
  { id: 'damage', name: 'Sunlance', blurb: '+35% bolt damage', max: 5,
    apply: (p) => { p.damage *= 1.35; } },
  { id: 'rapid', name: 'Swift Current', blurb: '+25% fire rate', max: 5,
    apply: (p) => { p.fireInterval *= 0.8; } },
  { id: 'multishot', name: 'Twin Jets', blurb: '+1 bolt per shot', max: 3,
    apply: (p) => { p.shots += 1; } },
  { id: 'pierce', name: 'Harpoon Tip', blurb: 'Bolts pierce +1 enemy', max: 3,
    apply: (p) => { p.pierce += 1; } },
  { id: 'speed', name: 'Fin Surge', blurb: '+15% swim speed', max: 4,
    apply: (p) => { p.speed *= 1.15; } },
  { id: 'magnet', name: 'Lure Glow', blurb: '+60% shard pickup range', max: 3,
    apply: (p) => { p.magnet *= 1.6; } },
  { id: 'crit', name: 'Pressure Point', blurb: '+12% critical chance', max: 4,
    apply: (p) => { p.critChance += 0.12; } },
  { id: 'spire', name: 'Light Spire', blurb: 'Build an auto-turret by the Heart (max 3)', max: 3,
    apply: (p, s) => { s.turrets.push(makeTurret(s)); } },
  { id: 'mend', name: 'Coral Mend', blurb: 'Restore 40 Heart HP, +10 max Heart HP', max: 4,
    apply: (p, s) => { s.heartMax += 10; s.heartHp = Math.min(s.heartMax, s.heartHp + 40); } },
  { id: 'vitality', name: 'Deep Vitality', blurb: 'Heal 50 HP, +20 max HP', max: 4,
    apply: (p, s) => { p.hpMax += 20; p.hp = Math.min(p.hpMax, p.hp + 50); } },
  { id: 'dash', name: 'Eel Dash', blurb: '-30% dash cooldown', max: 3,
    apply: (p) => { p.dashCooldown *= 0.7; } },
  { id: 'nova', name: 'Nova Pulse', blurb: 'Dash releases a damaging shockwave', max: 1,
    apply: (p) => { p.nova = true; } },
];

// Turret anchors ring the Heart; a new spire takes the next free anchor.
export const TURRET_ANCHORS = [
  { x: HEART.x - 110, y: HEART.y - 80 },
  { x: HEART.x + 110, y: HEART.y - 80 },
  { x: HEART.x, y: HEART.y + 130 },
];
export function makeTurret(s) {
  const a = TURRET_ANCHORS[s.turrets.length % TURRET_ANCHORS.length];
  return { x: a.x, y: a.y, radius: 15, range: 240, fireInterval: 0.5, cooldown: 0, damage: 10 };
}

export const COLORS = {
  deep: '#04101f',
  water: '#0a2a4a',
  glow: '#5ef2d6',
  gold: '#ffd166',
  coral: '#ff7a90',
  ink: '#eaf6ff',
};
