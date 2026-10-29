# Season_teams collection

Records for each team in a season.

## Fields

| Field   | Type     | Notes                  |
|---------|----------|------------------------|
| season  | relation | → seasons              |
| team    | relation | → teams                |
| wins    | number   | default 0              |
| losses  | number   | default 0              |

## Notes

- Created when a season starts and teams are enrolled.
- Updated after each half is simmed.
- Standings are sorted by wins.
