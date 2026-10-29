# Games collection

Individual games belonging to a season.

## Fields

| Field      | Type     | Notes                          |
|------------|----------|--------------------------------|
| season     | relation | → seasons                      |
| home_team  | relation | → teams                        |
| away_team  | relation | → teams                        |
| half       | number   | 1 or 2                         |
| home_score | number   | null until played              |
| away_score | number   | null until played              |
| played     | bool     | default false                  |

## Notes

- Schedule is generated when entering first_half (all games) or just the second-half games when entering second_half.
- Simple balanced schedule: each pair of enrolled teams plays a fixed number of games, split across halves.
- Exhibition games are not stored here; they stay local.
