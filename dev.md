# Baseball Manager — Dev Notes

Last updated: 2026-11-03

## Goal

Static plain-JS baseball manager game (GitHub Pages) with shared data via PocketBase Cloud.
No self-hosting. Start free, scale later if needed.
Use a DAO so game code does not care about the backend.

## Why PocketBase Cloud

- Real SQLite under the hood
- Free tier does not pause
- SSE realtime available
- Simple collections (tables) + records (rows)
- Client-side SDK works from static pages

## Current PocketBase Instance

- Name: all-letters name (not `justbobonx`)
- URL pattern: `https://<instancename>.pocketbasecloud.com`

## Auth / Ownership Model

- Regular players never see the admin dashboard.
- App builds its own login/signup (or auto-creates guest users).
- SDK stores auth token in localStorage by default.
- Owner checks live in PocketBase API rules, not client code.
  - Create rule example: `@request.auth.id != "" && @request.body.owner = @request.auth.id`
  - Update/Delete: `owner = @request.auth.id`
- Superusers bypass all rules.
- Client-side updates (roster changes, season sim) are allowed only if the caller satisfies the rule.
- No server-side game logic yet — a modified client can send any payload the rules permit.
- No durable browser fingerprint that survives localStorage clear. Identity is “whoever is in this browser” unless the user sets a real account.

## Collections (target state)

The rewrite expects the collections below. The live instance still has the older shape
(players with position/contact/speed/fielding/stamina, team_players.role, games without
half/box_score); `schema-changes.md` lists exactly what to change. Per-collection detail is in `tables/*.md`.

### players
Shared player pool. No position on the player.
- `name` (text), `eye`, `power`, `arm`, `glove`, `accuracy` (number 0–100), `handedness` (select R, L)

### teams
- `name` (text), `owner` (relation → users, single)

### team_players
Hard roster slots.
- `team` (relation → teams), `player` (relation → players)
- `position` (select: C, 1B, 2B, 3B, SS, LF, CF, RF, SP1–SP5, RP1–RP4, CL, BN1–BN4)
- `batting_order` (number 0–9; 0 = not in lineup; pitcher bats in the unclaimed spot)

### seasons
- `name` (text), `phase` (select: preseason, first_half, allstar, second_half, done), `current` (bool)

### season_teams
- `season`, `team` (relations), `wins`, `losses` (number)

### games
- `season`, `home_team`, `away_team` (relations), `half`, `round`, `game_number` (number)
- `home_score`, `away_score` (number), `played` (bool), `box_score` (json)

### free_agent_offers
- `season`, `team`, `player` (relations), `status` (select: pending, accepted, rejected)

### trade_offers
Deferred; unused by the app. Leave locked.

### API Rule Starting Points

- players: list/view public (`""`), create/update/delete locked (superuser only) after seeding
- teams: list/view public, create forces owner = current user, update/delete owner-only
- Other collections: owner-style or locked until sim logic needs them

Locked = click the lock icon in the admin panel (do not type the word “null”).

## Player Generation

See `abilities-and-generator.md`. Implemented in `js/generator.js`: bell-curve total 300–400,
floors 30–50, shuffled skewed draws. "Generate Player Pool" builds a fresh batch until grade
quotas (and a headcount) for a 12-team league are met.

## Sim

See `play-resolution.md`. Implemented in `js/sim.js` with every tunable as a named constant.
Pitch counts are rolled per plate appearance; starters leave after a 60–90 pitch budget that
shrinks with runs and hits allowed; relievers have short budgets; the closer takes save spots
from the 9th on. Box scores are stored on `games.box_score`.

## Repo Structure (baseball_manager)

Plain global scripts loaded in order by `index.html` (no modules, no build):
- `js/dao.js` — PocketBase wrapper (global `dao`), guest sign-in
- `js/generator.js` — abilities, grades, pool generation
- `js/team.js` — roster slots, game roster assembly, auto-draft, batting order
- `js/sim.js` — plate-appearance game sim
- `js/season.js` — schedule, phases, season sim, free-agent claims
- `js/app.js` — UI
- `tables/*.md` — per-collection notes; `schema-changes.md` — pending instance changes
- `index.html` + `css/style.css`

## Open / Next

- Apply `schema-changes.md` to the instance.
- Tune sim constants against league rates.
- Trades (deferred), per-player stats table, platoon (handedness) modifier.
- Decide how much integrity is needed vs. pure client-side updates.
- Real-time (SSE) for shared state if multiplayer feels useful.

## Notes

- Superuser can always create/update/delete via admin panel or authenticated API calls.
- `/api/sql` is superuser-only and blocked by CORS from external pages.
- For casual use, owner rules + localStorage identity is enough.
- For fairness, a thin server (or PocketBase hooks) would be required to validate moves.