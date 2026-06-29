// Scrapes Blizzard's public Battlegrounds leaderboard for US/EU/AP (solo + duo)
// and writes one flat file per region/mode in the exact format the HDT_LobbyMMR
// plugin parses: "name rating" entries joined by "\n<br />".
//
// CN is intentionally NOT scraped here — the plugin keeps sourcing CN from
// IBM5100's bgrank.fly.dev service (different, season-bound API).
//
// Runs in GitHub Actions on a schedule. No npm dependencies (Node 18+ fetch).

const fs = require("fs");
const path = require("path");

const BASE = "https://hearthstone.blizzard.com/en-us/api/community/leaderboardsData";
const REGIONS = ["US", "EU", "AP"];
const MODES = [
  { leaderboardId: "battlegrounds", suffix: "" },
  { leaderboardId: "battlegroundsduo", suffix: "_duo" },
];

const OUT_DIR = path.join(__dirname, "dist");
const ENTRY_SEPARATOR = "\n<br />"; // must match LobbyMmr.cs response split
const PAGE_DELAY_MS = 120;          // be gentle with Blizzard, but keep runs short
const MAX_PAGE_RETRIES = 2;
const USER_AGENT = "hdt-lobbymmr-leaderboard (https://github.com/zakarulcodes/hdt-lobbymmr-leaderboard)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(region, leaderboardId, page) {
  const url = `${BASE}?region=${region}&leaderboardId=${leaderboardId}&page=${page}`;
  let lastErr;
  for (let attempt = 1; attempt <= MAX_PAGE_RETRIES; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_PAGE_RETRIES) await sleep(1000);
    }
  }
  throw new Error(`Failed ${region}/${leaderboardId} page ${page}: ${lastErr.message}`);
}

// Returns a Map<name, rating(string)>; first occurrence of a name wins,
// matching the plugin's own de-duplication behaviour.
async function scrapeBoard(region, leaderboardId) {
  const board = new Map();

  const first = await fetchPage(region, leaderboardId, 1);
  const totalPages = first?.leaderboard?.pagination?.totalPages || 1;
  collectRows(first, board);

  for (let page = 2; page <= totalPages; page++) {
    await sleep(PAGE_DELAY_MS);
    const data = await fetchPage(region, leaderboardId, page);
    collectRows(data, board);
  }
  return board;
}

function collectRows(data, board) {
  const rows = data?.leaderboard?.rows;
  if (!Array.isArray(rows)) return;
  for (const row of rows) {
    const name = row?.accountid;
    const rating = row?.rating;
    // Names can't contain spaces (BattleTag name part), so "name rating"
    // stays cleanly splittable on ' ' the way the plugin expects.
    if (!name || rating == null || String(name).includes(" ")) continue;
    if (!board.has(name)) board.set(name, String(rating));
  }
}

function serialize(board) {
  const lines = [];
  for (const [name, rating] of board) lines.push(`${name} ${rating}`);
  // Trailing separator mirrors bgrank's output; the plugin drops empty entries.
  return lines.join(ENTRY_SEPARATOR) + ENTRY_SEPARATOR;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let failed = false;

  for (const region of REGIONS) {
    for (const mode of MODES) {
      const label = `${region}${mode.suffix}`;
      try {
        const board = await scrapeBoard(region, mode.leaderboardId);
        if (board.size === 0) throw new Error("0 entries");
        fs.writeFileSync(path.join(OUT_DIR, `${label}.txt`), serialize(board));
        console.log(`OK  ${label}: ${board.size} players`);
      } catch (err) {
        failed = true;
        console.error(`ERR ${label}: ${err.message}`);
      }
    }
  }

  // Abort with a non-zero exit if anything failed so the deploy step is skipped
  // and Pages keeps serving the previous good files instead of partial data.
  if (failed) {
    console.error("One or more boards failed — not publishing this run.");
    process.exit(1);
  }
  console.log("All boards scraped successfully.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
