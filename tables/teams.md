# Teams collection

One record per user-created team.

## Fields

| Field | Type     | Notes                              |
|-------|----------|------------------------------------|
| name  | text     | Team name                          |
| owner | relation | → users, single. Set to the creator |

## Notes

- Roster lives in team_players.
- A team can play when every field, rotation, bullpen and closer slot is filled (bench optional).
