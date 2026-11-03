# Baseball Manager — Abilities & Generator

## Abilities

Five abilities. Each is critical to exactly two areas.

| Ability   | Critical for       | Meaning |
|-----------|--------------------|---------|
| **Eye**   | Hitting + Catching | Plate discipline / pitch recognition |
| **Power** | Hitting + Outfield | Extra-base / home-run threat + raw strength to lob it in from deep |
| **Arm**   | Outfield + Pitching | Athletic throwing strength / velocity (Outfield assists on the move + pitcher stuff) |
| **Glove** | Infield + Catching | Raw defensive skill / receiving |
| **Accuracy** | Pitching + Infield | Command + precise throws |

### Critical pairs
- Hitting: Eye + Power
- Outfield: Power + Arm
- Catching: Eye + Glove
- Pitching: Arm + Accuracy
- Infield: Glove + Accuracy

### Grades
No hard position on the player. Teams assign roles. Grades are the average of the two critical abilities:

- Hitting = (Eye + Power) / 2
- Infield = (Glove + Accuracy) / 2
- Outfield = (Power + Arm) / 2
- Catching = (Eye + Glove) / 2
- Pitching = (Arm + Accuracy) / 2

Hitting is universal (no DH). Fielding is split into Infield / Outfield / Catching only for roster assignment. The core tradeoff remains Hitting / Fielding / Pitching.

## Handedness
Independent 70/30 roll:
- 70% Right
- 30% Left

Used only for platoon matchups. No effect on ability generation.

## Generator

### Total points
Bell curve, 300–400 (mean ~350).

### Steps
1. Roll total points.
2. Assign every ability a random floor in 30–50. Subtract floors from total; remainder is the free pool.
3. Shuffle the five abilities into random order.
4. Walk the shuffled list. For each ability, give from the remaining free pool using a strong skew toward the high end:
   - min = 0 (above floor)
   - max = min(100 − floor, remaining)
   - skew power ≈ 3
5. When the free pool is exhausted, later abilities keep only their floor.

### Result
- Specialists and dual/triple threats appear naturally.
- Flat-ish players are possible when early skewed draws land lower or the total is modest.
- No balanced 80/80/80/80/80 players.
- Pool size and position coverage are handled separately (generate until grade thresholds are met; extra pitchers can be forced by accepting high-Pitching-grade candidates preferentially).

## Notes
- Abilities drive the sim. Game stats (AB, H, HR, BB, K, IP, ERA, etc.) are accumulated outcomes and do not exist yet.
- Position grades replace hard position labels on the player record.
- Superuser seeds the pool once. Subsequent generation is independent of existing pool size.

## Design notes
- Five abilities, each critical to exactly two areas, so pure specialists and dual-threats appear naturally and no one is good at everything.
- Hitting / Fielding / Pitching is the real triangle. Infield / Outfield / Catching are only the fielding split for roster assignment.
- Power on Outfield means raw strength to lob it in from deep, not pitching velocity. Arm is the athletic throwing/velocity skill.
- Floors first (30–50), then skewed remainder in random order. Natural starvation of later abilities replaces an explicit 1–3 cap and still allows occasional flatter profiles.
- Handedness is independent and weighted 70/30 to match real-world rarity of lefties.
- Grades (not hard positions) keep players flexible; teams assign roles. Coverage checks use grade thresholds instead of position counts.

