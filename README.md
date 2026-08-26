# HDT Lobby MMR — Leaderboard Data

This repo powers the MMR numbers shown by the
[HDT Lobby MMR](https://github.com/zakarulcodes/HDT_LobbyMMR) plugin for
Hearthstone Deck Tracker.

It automatically keeps a fresh copy of the official Battlegrounds leaderboards
(solo and duo, for US, EU, and AP) so the plugin can look up players' MMR
quickly and reliably. It updates itself regularly — there's nothing you need
to do here.

It also serves a one-time archive of past-season ranks (`{region}_history.txt`,
seasons 6–18, all 8000+ players) that powers the plugin's rank-history hover
tooltip. That data never changes, so it lives in `static/` and is copied into
each publish rather than re-scraped.

Looking for the plugin itself? Head over to
[HDT_LobbyMMR](https://github.com/zakarulcodes/HDT_LobbyMMR).
