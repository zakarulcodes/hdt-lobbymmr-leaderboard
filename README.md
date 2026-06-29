# hdt-lobbymmr-leaderboard

Self-hosted leaderboard cache for the
[HDT_LobbyMMR](https://github.com/zakarulcodes/HDT_LobbyMMR) plugin.

A scheduled GitHub Action scrapes Blizzard's public Battlegrounds leaderboard
for **US / EU / AP** (solo + duo) and publishes one flat file per region/mode to
GitHub Pages. The plugin downloads these instead of depending on a third-party
service. China (CN) is not handled here — the plugin keeps sourcing CN from the
original `bgrank.fly.dev` service.

## Output

Files are served from GitHub Pages, one per region/mode:

```
https://zakarulcodes.github.io/hdt-lobbymmr-leaderboard/US.txt
https://zakarulcodes.github.io/hdt-lobbymmr-leaderboard/EU.txt
https://zakarulcodes.github.io/hdt-lobbymmr-leaderboard/AP.txt
https://zakarulcodes.github.io/hdt-lobbymmr-leaderboard/US_duo.txt
https://zakarulcodes.github.io/hdt-lobbymmr-leaderboard/EU_duo.txt
https://zakarulcodes.github.io/hdt-lobbymmr-leaderboard/AP_duo.txt
```

Each file is `name rating` entries joined by `\n<br />`, matching the format the
plugin parses.

## How it works

- `scrape.js` pages Blizzard's `leaderboardsData` API from page 1 to
  `totalPages` for each region/mode, throttled and with a polite User-Agent.
- If any board fails or comes back empty the run exits non-zero **before**
  publishing, so Pages keeps serving the last good files (no partial data).
- `.github/workflows/scrape.yml` runs every 30 minutes and force-pushes the
  `dist/` output to the `gh-pages` branch as a single rolling commit.

## Setup

1. Push this repo to GitHub.
2. Settings → Pages → **Deploy from a branch** → `gh-pages` / `(root)`.
3. The workflow runs on schedule; trigger the first one manually from the
   Actions tab (**Run workflow**).

## Local run

```sh
node scrape.js   # writes ./dist/*.txt
```
