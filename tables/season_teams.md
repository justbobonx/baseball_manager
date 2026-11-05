# Season_teams collection

Teams enrolled in a season and their record.

## Fields

| Field  | Type     | Notes      |
|--------|----------|------------|
| season | relation | → seasons  |
| team   | relation | → teams    |
| wins   | number   | default 0  |
| losses | number   | default 0  |

## Notes

- Created when a season starts, for every team whose roster is complete.
- Updated after each simmed game. Standings sort by wins minus losses.
