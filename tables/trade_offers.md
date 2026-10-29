# Trade_offers collection

1-for-1 trade proposals during preseason or All-Star windows.

## Fields

| Field      | Type     | Notes                              |
|------------|----------|------------------------------------|
| season     | relation | → seasons                          |
| from_team  | relation | → teams (proposing)                |
| to_team    | relation | → teams (receiving the offer)      |
| player_out | relation | → players (leaving from_team)      |
| player_in  | relation | → players (coming from to_team)    |
| status     | text     | pending / accepted / rejected      |
| round      | number   | window round when proposed         |

## Notes

- Only valid while season status is preseason or allstar.
- Accepting moves the two players between the teams (updates team_players).
- Rejected or expired offers stay for history.
- At window close, remaining pending offers are marked rejected.
