# Baseball Manager — Writeup

## Why PocketBase Cloud

- Static GitHub Pages games; no server of our own.
- Simple SQL-style tables (SQLite under the hood) are enough for scores, rosters, and shared state.
- Start free, pay only if it grows.
- No inactivity pause.
- Realtime via SSE is fine for turn-based or occasional updates.
- Client-side JS SDK talks straight to the hosted instance.

## What this app does

A small baseball manager:

1. Generate a pool of random players with stats and positions.
2. Create teams.
3. Assign players from the pool into a full roster (starters, rotation, bench, bullpen).
4. Simulate a matchup between two complete teams (exhibition — stays local, not stored).
5. Run a season: preseason trade/FA window → first half sim → All-Star window → second half sim → records.

All data lives in PocketBase. The game code never talks to PocketBase directly — it goes through a DAO.

## Schema

Collections (see `tables/`):

- **players** — the shared pool. Stats: contact, power, speed, fielding, arm, stuff, control, stamina. Position: 1B, 2B, 3B, SS, OF, C, SP, RP, CL.
- **teams** — name + created date.
- **team_players** — junction: team, player, role.
- **seasons** — name, status (preseason / first_half / allstar / second_half / complete), current_round.
- **season_teams** — season, team, wins, losses.
- **games** — season, home_team, away_team, half (1|2), scores, played.
- **trade_offers** — 1-for-1 proposals (from_team, to_team, player_out, player_in, status, round).
- **free_agent_offers** — claims on free agents.

Free agents are simply players with no `team_players` row.

### Roster roles (20 slots)

- Starters: 1B, 2B, 3B, SS, OF1–3, C
- Rotation: 5 SP
- Bench: util IF, util OF, extra C
- Bullpen: 3 RP + closer

## Season flow

1. Start season (enrolls all existing teams).
2. Preseason window: claim free agents, propose/accept 1-for-1 trades.
3. Close window → generate full schedule (each pair plays 4 games, 2 per half) and sim first half; records update.
4. All-Star window: same trade/FA actions.
5. Close window → sim second half; season complete.
6. Standings always visible.

Exhibition sim remains available anytime from the roster panel and is not written to the games table.

## DAO

`js/dao.js` owns the PocketBase client. Season logic lives in `js/season.js` (schedule gen, half sim, trade accept, FA claim).

## Folder layout (plain JS, foxes-style)

```
index.html
css/style.css
js/dao.js
js/generator.js
js/team.js
js/sim.js
js/season.js
js/app.js
tables/*.md
WRITEUP.md
```

## Setup

1. Create a free PocketBase Cloud instance.
2. In the admin UI create all collections matching the field lists in `tables/`.
3. Set API rules to allow public list/create/update/delete on all of them (for now).
4. Open the app, click Settings, paste the instance URL.
5. Generate the player pool, create teams, fill rosters.
6. Use the exhibition sim or start a season.

## Simulation

Simple strength model: average contact/power of the lineup vs average stuff/control of the opposing staff, plus noise, produces runs. Enough to see roster decisions matter; easy to replace later with a fuller play-by-play engine.

## Next ideas

- Persist game results.
- Realtime updates when someone else edits a shared team.
- Auth so each user owns their teams.
- More granular sim (per at-bat, fielding, speed).
