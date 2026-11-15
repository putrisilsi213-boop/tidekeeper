// Tidekeeper — a tiny seeded RNG (mulberry32) so every run and screenshot is reproducible.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function pickWeighted(rng, table) {
  let total = 0;
  for (const k of Object.keys(table)) total += table[k];
  let roll = rng() * total;
  for (const k of Object.keys(table)) { roll -= table[k]; if (roll <= 0) return k; }
  return Object.keys(table)[0];
}
export function range(rng, lo, hi) { return lo + rng() * (hi - lo); }
export function choice(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
