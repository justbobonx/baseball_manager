# Team_players collection

Junction table linking teams to players with a role.

## Fields

| Field    | Type     | Notes                                      |
|----------|----------|--------------------------------------------|
| team     | relation | → teams                                    |
| player   | relation | → players                                  |
| role     | text     | See roles below                            |

## Roles

Starters (position players):
- starter_1B, starter_2B, starter_3B, starter_SS
- starter_OF1, starter_OF2, starter_OF3
- starter_C

Rotation:
- rotation_1, rotation_2, rotation_3, rotation_4, rotation_5

Bench:
- bench_if (utility infielder)
- bench_of (utility outfielder)
- bench_c (extra catcher)

Bullpen:
- reliever_1, reliever_2, reliever_3
- closer

## Notes

- One player can appear on only one team (enforce in app logic).
- Query by team id to load a full roster.
- API rules: allow public create/update/delete/list for the game.
