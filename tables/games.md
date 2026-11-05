# Games collection

Scheduled and played games of a season. Exhibitions are not stored.

## Fields

| Field       | Type     | Notes                                                   |
|-------------|----------|---------------------------------------------------------|
| season      | relation | → seasons                                               |
| home_team   | relation | → teams                                                 |
| away_team   | relation | → teams                                                 |
| half        | number   | 1 or 2                                                  |
| round       | number   | Round-robin round (every team plays at most once per round) |
| game_number | number   | Order of play within the season                         |
| home_score  | number   | Set when played                                         |
| away_score  | number   | Set when played                                         |
| played      | bool     | default false                                           |
| box_score   | json     | Full box score, set when played (see below)             |

## box_score shape

- `innings`, `walk_off`
- `away` and `home`, each with: `team`, `name`, `runs`, `hits`, `errors`, `linescore` (runs per inning, `x` for an unplayed bottom half),
  `batting` (per player: id, name, pos, pa, ab, h, d, t, hr, r, rbi, bb, k, hbp, sf, roe),
  `pitching` (per pitcher in order of appearance: id, name, starter, outs, h, r, er, bb, k, hr, hbp, bf, pitches, decision W/L/S).

## Notes

- Schedule: every pair meets once per round-robin cycle, home field alternating; the first half of the cycles is half 1.
- The rotation turn for a team is the number of games it has already played.
- Box scores will later be aggregated into a per-player stats table.
