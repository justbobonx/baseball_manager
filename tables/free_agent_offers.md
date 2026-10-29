# Free_agent_offers collection

Claims on free agents during trade windows.

## Fields

| Field   | Type     | Notes                          |
|---------|----------|--------------------------------|
| season  | relation | → seasons                      |
| team    | relation | → teams (claiming)             |
| player  | relation | → players (must be free)       |
| status  | text     | pending / accepted / rejected  |
| round   | number   |                                |

## Notes

- Free agent = player with no current team_players row.
- On accept, create a team_players row for the claiming team (role can be "fa_pickup" or assigned later).
- Multiple teams can claim the same player; first accept wins, others rejected.
- Simpler alternative used in the app: immediate claim if still free (no pending state). Both styles are supported by the table.
