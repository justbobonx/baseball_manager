# Seasons collection

One record per season. Only one should be active at a time.

## Fields

| Field         | Type   | Notes                                      |
|---------------|--------|--------------------------------------------|
| name          | text   | e.g. "2026 Season"                         |
| status        | text   | preseason / first_half / allstar / second_half / complete |
| current_round | number | 1–3 during trade windows                   |
| created       | date   |                                            |

## Status flow

1. preseason — trade + free-agent window
2. first_half — schedule generated and simmed
3. allstar — second trade + free-agent window
4. second_half — remaining games simmed
5. complete

## Notes

- Advance manually from the UI after the window or after simming a half.
- current_round increments while the window is open (optional flavor).
