# Baseball Manager — Play Resolution Algorithm

Abilities used on every plate appearance: Eye, Power, Arm, Glove, Accuracy.  
Positions and lineup are already assigned by the team, so the correct fielder grades are known.

## Inputs per plate appearance
- Batter: Eye, Power
- Pitcher: Arm, Accuracy
- Assigned fielders: their relevant grades (Infield = Glove + Accuracy, Outfield = Power + Arm, Catcher = Eye + Glove)
- Optional later: handedness matchup modifier

## Steps

1. **Discipline check** (Eye vs Accuracy)  
   Diff = batter.Eye − pitcher.Accuracy  
   Base probabilities (tunable):  
   - K chance = 0.18 − Diff * 0.0015 (clamped 0.08–0.35)  
   - BB chance = 0.08 + Diff * 0.0012 (clamped 0.03–0.16)  
   - Else → Ball in play  

   Roll once. If K or BB, record the outcome and end the PA.  
   (HBP can be a small fixed slice of the remaining probability if desired.)

2. **Contact quality** (only if ball in play)  
   Diff = batter.Power − pitcher.Arm  
   Quality:  
   - Hard if Diff > +12  
   - Medium if Diff between −12 and +12  
   - Soft if Diff < −12  

   Raw extra-base bias = Diff * 0.01 (added later to hit type).

3. **Location and fielder**  
   Roll location (roughly 55% infield, 45% outfield; can bias slightly by quality).  
   Select the assigned fielder for that location.  
   Fielder grade:  
   - Infield: (Glove + Accuracy) / 2  
   - Outfield: (Power + Arm) / 2  
   - Catcher involvement (when relevant): (Eye + Glove) / 2  

4. **Fielder resolution**  
   Diff = fielder.grade − 60  (or vs a fixed baseline)  
   Out chance = 0.65 + Diff * 0.008 + quality modifier  
   - Soft contact: +0.10 out  
   - Hard contact: −0.12 out  
   Clamp out chance 0.40–0.85.  

   Roll:  
   - Out → record out (groundout, flyout, etc. by location).  
   - Else → hit.  
     Hit type:  
     - Base single rate high.  
     - Extra-base chance increased by the raw bias from step 2 and reduced by outfield grade.  
     - Error chance (small, 0.02–0.08) inverse to fielder grade; on error the batter reaches and runners may advance extra.

5. **Runner advancement and scoring**  
   Apply standard baseball rules for the result (single advances all one base, double two, etc.).  
   Optional: small chance of extra base on hard contact or outfield arm grade, or catcher throw on close plays.  
   Count outs, score runs that cross home.

6. **Record stats**  
   Credit the specific batter, pitcher, and fielder(s) with AB, H, HR, BB, K, IP, ER, errors, etc. as the play resolves.

## Notes
- Every ability is consulted on a typical PA: Eye/Accuracy on the first roll, Power/Arm on quality, and the positional pair on the fielding roll.  
- Numbers above are starting points; they can be tuned so league averages land near real baseball rates.  
- No speed ability, so baserunning stays average (no steals or aggressive extra bases beyond the basic advancement).  
- Bullpen and starter usage stay outside this loop (simple innings or pitch-count threshold).

This is the complete resolution path. It produces real per-play and per-game stats from the five abilities without additional fields.
