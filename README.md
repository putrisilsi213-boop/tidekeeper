# tidekeeper

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/putrisilsi213-boop/tidekeeper/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/putrisilsi213-boop/tidekeeper/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Tidekeeper** — a deep-sea defence game. You are a lanternfish diver guarding the Coral Heart at the centre of the reef. Enemies hunt the Heart through 10 waves, with bosses on waves 5 and 10. Slay them, gather glow shards, and draft one blessing of the reef between waves: new bolts, faster fire, Light Spire turrets, a dash shockwave, and more. Win by surviving all 10 waves; lose if the Heart shatters or the diver falls.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — WASD/arrows to swim, mouse to aim, hold click or Space to fire, Shift to dash, P to pause, M to mute, R to restart. Everything is static files under `game/` (Canvas 2D + synthesised WebAudio, no downloads, no network). Screenshots are real renders of the game, staged deterministically with `?shot=start|play|draft|end&seed=1` (see `shots.json`).

---

<sub>Entered on [make.fun](https://make.fun/?ref=d6m6thj3&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
