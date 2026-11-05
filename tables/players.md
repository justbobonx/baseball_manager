# Players collection

Shared pool of generated players. Seeded by the generator (see abilities-and-generator.md).
No position lives on the player; teams assign positions in team_players.

## Fields

| Field      | Type   | Notes                                   |
|------------|--------|-----------------------------------------|
| name       | text   | Generated full name                     |
| eye        | number | 0–100, integer. Hitting + Catching      |
| power      | number | 0–100, integer. Hitting + Outfield      |
| arm        | number | 0–100, integer. Outfield + Pitching     |
| glove      | number | 0–100, integer. Infield + Catching      |
| accuracy   | number | 0–100, integer. Pitching + Infield      |
| handedness | select | R / L (70 / 30)                         |

## Notes

- Grades (hitting, infield, outfield, catching, pitching) are computed in the client, never stored.
- Free agent = player with no team_players row.
- Per-player season stats will move to their own table later; for now they live in games.box_score.
