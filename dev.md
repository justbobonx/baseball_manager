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
- Client-side updates (trades, roster changes) are allowed only if the caller satisfies the rule.
- No server-side game logic yet — a modified client can send any payload the rules permit.
- No durable browser fingerprint that survives localStorage clear. Identity is “whoever is in this browser” unless the user sets a real account.

## Collections Created in PocketBase

These are the collections that exist in the instance (plus the built-in `users`):

### players
Shared player pool. Seeded by superuser.
- `name` (text)
- `position` (select: IF, OF, C, P)
- `contact` (number, 0–100)
- `power` (number, 0–100)
- `speed` (number, 0–100)
- `fielding` (number, 0–100)
- `stamina` (number, 0–100)
- system: id, created, updated

### teams
User-owned teams.
- `name` (text)
- `owner` (relation → users, single)
- system: id, created, updated

### team_players
Roster assignments (junction).
- `team` (relation → teams)
- `player` (relation → players)
- `role` (select: starter_IF, starter_OF, starter_C, starter_P, bench_IF, bench_OF, bench_C, reliever, closer)
- system: id, created, updated

### seasons
Season container.
- `name` (text)
- `phase` (select: preseason, first_half, allstar, second_half, done)
- `current` (bool)
- system: id, created, updated

### season_teams
Teams participating in a season + record.
- `season` (relation → seasons)
- `team` (relation → teams)
- `wins` (number)
- `losses` (number)
- system: id, created, updated

### games
Individual games.
- `season` (relation → seasons)
- `home_team` (relation → teams)
- `away_team` (relation → teams)
- `home_score` (number)
- `away_score` (number)
- `played` (bool)
- system: id, created, updated

### trade_offers
Trade proposals between teams.
- `from_team` (relation → teams)
- `to_team` (relation → teams)
- `offered_player` (relation → players)
- `requested_player` (relation → players)
- `status` (select: pending, accepted, rejected)
- system: id, created, updated

### free_agent_offers
Claims on free agents.
- `team` (relation → teams)
- `player` (relation → players)
- `status` (select: pending, accepted, rejected)
- system: id, created, updated

### API Rule Starting Points

- players: list/view public (`""`), create/update/delete locked (superuser only) after seeding
- teams: list/view public, create forces owner = current user, update/delete owner-only
- Other collections: owner-style or locked until sim logic needs them

Locked = click the lock icon in the admin panel (do not type the word “null”).

## Player Generation (current decision)

- Point-pool style, not pure random.
- 5 stats (contact, power, speed, fielding, stamina).
- Nominal total ≈ 350 (average 70).
- Roll total in a range around that (e.g. 280–420) so some are better/worse.
- Distribute with soft floor/cap and bias toward 2–3 strong stats.
- Decide position from the resulting profile (not assigned first).
- Superuser seeds the pool once via script or admin panel.

## Current Sim (placeholder in repo)

From `js/sim.js`:

- Split roster into lineup (non-pitchers) and pitchers.
- Batting strength = avg(contact + power)
- Pitching strength = avg(stuff + control)
- Runs ≈ `3 + (bat - oppPitch) / 25` + small noise
- Does not yet use the 5-stat point-pool model or individual matchups.
- Generator in `js/generator.js` creates extra fields the current PocketBase schema does not have.

## Repo Structure (baseball_manager)

- `js/dao.js` — PocketBase wrapper
- `js/sim.js` — current simple game sim
- `js/generator.js` — random player generation (to be replaced)
- `js/season.js`, `js/team.js`, `js/app.js`
- `tables/*.md` — schema notes
- `WRITEUP.md` — earlier design doc
- `index.html` + `css/style.css`

## Open / Next

- Implement point-pool player generator and seed the `players` collection.
- Align sim with the 5 stats and position-from-stats idea.
- Exhibition two-team sim + full season flow (halves, All-Star trade window, free agents).
- Decide how much integrity is needed vs. pure client-side updates.
- Real-time (SSE) for shared state if multiplayer feels useful.

## Notes

- Superuser can always create/update/delete via admin panel or authenticated API calls.
- `/api/sql` is superuser-only and blocked by CORS from external pages.
- For casual use, owner rules + localStorage identity is enough.
- For fairness, a thin server (or PocketBase hooks) would be required to validate moves.