# Teams collection

One record per user-created team.

## Fields

| Field   | Type | Notes                  |
|---------|------|------------------------|
| name    | text | Team name              |
| created | date | Auto or client-set     |

## Notes

- Roster is not stored here; use team_players junction.
- A team is valid when it has the required roles filled.
