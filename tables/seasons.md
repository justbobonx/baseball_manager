# Seasons collection

One record per season.

## Fields

| Field   | Type   | Notes                                                       |
|---------|--------|-------------------------------------------------------------|
| name    | text   | e.g. "2026 Season"                                          |
| phase   | select | preseason / first_half / allstar / second_half / done       |
| current | bool   | Creating a season makes it the only current one             |

System `created` is used for sorting.

## Phase flow

1. preseason — rosters open, free-agent claims allowed. Leaving it writes the whole schedule.
2. first_half — half-1 games simmed; rosters of enrolled teams frozen.
3. allstar — rosters open again (free agents; trades deferred).
4. second_half — half-2 games simmed.
5. done.

A half can only be left once all its games are played.
