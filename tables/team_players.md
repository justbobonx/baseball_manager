# Team_players collection

One row per rostered player: which team, which hard slot, and where he bats.

## Fields

| Field         | Type     | Notes                                              |
|---------------|----------|----------------------------------------------------|
| team          | relation | → teams, single, required                          |
| player        | relation | → players, single, required                        |
| position      | select   | One slot value, see below. Required                |
| batting_order | number   | 1–9 for field starters, 0 (or empty) for everyone else |

## Position values

- Field starters: `C`, `1B`, `2B`, `3B`, `SS`, `LF`, `CF`, `RF`
- Rotation: `SP1`, `SP2`, `SP3`, `SP4`, `SP5`
- Bullpen: `RP1`, `RP2`, `RP3`, `RP4`, `CL` (closer)
- Bench (optional): `BN1`, `BN2`, `BN3`, `BN4`

## Batting order

- Field starters take spots 1–9; the one spot nobody claims is the pitcher's (9th by default).
- No DH: the day's starter bats in the pitcher's spot, and relievers inherit it.
- Missing or duplicate spots are filled in slot order by the game code.

## Notes

- A player is on at most one team; a slot holds at most one player (unique indexes on `player` and on `team, position`).
- Roster changes are locked for enrolled teams during first_half / second_half.
