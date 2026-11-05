# Free_agent_offers collection

Log of free-agent claims.

## Fields

| Field  | Type     | Notes                                  |
|--------|----------|----------------------------------------|
| season | relation | → seasons (claim window)               |
| team   | relation | → teams (claiming)                     |
| player | relation | → players                              |
| status | select   | pending / accepted / rejected          |

## Notes

- Claims are immediate: a player still free is assigned to the chosen slot and a row is written with status accepted.
- Only allowed in preseason and at the all-star break (and between seasons, when nothing is logged).
- pending / rejected are kept for a later bidding version.
