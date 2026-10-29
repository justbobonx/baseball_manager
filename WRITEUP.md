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
4. Simulate a matchup between two complete teams.

All data lives in PocketBase. The game code never talks to PocketBase directly — it goes through a DAO.

## Schema

Three collections (see `tables/`):

- **players** — the shared pool. Stats: contact, power, speed, fielding, arm, stuff, control, stamina. Position: 1B, 2B, 3B, SS, OF, C, SP, RP, CL.
- **teams** — name + created date.
- **team_players** — junction: team, player, role.

### Roster roles (20 slots)

- Starters: 1B, 2B, 3B, SS, OF1–3, C
- Rotation: 5 SP
- Bench: util IF, util OF, extra C
- Bullpen: 3 RP + closer

## DAO

`js/dao.js` owns the PocketBase client and exposes:

- `players(filter)`, `createPlayer`
- `teams()`, `createTeam`
- `teamPlayers(teamId)`, `assignPlayer`, `clearRole`

Everything else imports only the DAO.

## Folder layout (plain JS, foxes-style)

```
index.html
css/style.css
js/dao.js
js/generator.js
js/team.js
js/sim.js
js/app.js
tables/*.md
WRITEUP.md
```

## Setup

1. Create a free PocketBase Cloud instance.
2. In the admin UI create the three collections matching the field lists in `tables/`.
3. Set API rules to allow public list/create/update/delete on all three (for now).
4. Open the app (GitHub Pages or local), click Settings, paste the instance URL.
5. Generate the player pool, create two teams, fill both rosters, sim.

## Simulation

Simple strength model: average contact/power of the lineup vs average stuff/control of the opposing staff, plus noise, produces runs. Enough to see roster decisions matter; easy to replace later with a fuller play-by-play engine.

## Next ideas

- Persist game results.
- Realtime updates when someone else edits a shared team.
- Auth so each user owns their teams.
- More granular sim (per at-bat, fielding, speed).
