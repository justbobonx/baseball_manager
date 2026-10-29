# Players collection

Pool of all generated players. One record per player.

## Fields

| Field     | Type   | Notes                                      |
|-----------|--------|--------------------------------------------|
| name      | text   | Generated full name                        |
| position  | text   | 1B, 2B, 3B, SS, OF, C, SP, RP, CL         |
| contact   | number | 0-100 batting contact                      |
| power     | number | 0-100 batting power                        |
| speed     | number | 0-100 speed / baserunning                  |
| fielding  | number | 0-100 fielding                             |
| arm       | number | 0-100 throwing arm                         |
| stuff     | number | 0-100 pitcher stuff (pitchers only)        |
| control   | number | 0-100 pitcher control (pitchers only)      |
| stamina   | number | 0-100 pitcher stamina (pitchers only)      |
| age       | number | 20-40                                      |

## Notes

- All players live in this single pool.
- Teams reference them via team_players.
- Generate hundreds; filter by position in the UI.
- API rules: allow public list/create for the game (or lock down later).
