# Baseball Manager — Play Resolution Algorithm

Every plate appearance is a chain of five rolls. Each roll starts from major-league base rates
and is moved by how far the players involved sit above or below **nominal** skill.
All numbers below are named, tweakable constants at the top of `js/sim.js`.

## League baseline (approx. 2024, per plate appearance)

| K | BB | HBP | 1B | 2B | 3B | HR | Ball-in-play outs | Errors |
|---|----|-----|----|----|----|----|-------------------|--------|
| .226 | .082 | .011 | .140 | .043 | .004 | .029 | .455 | .010 |

Errors are carved out of what would otherwise be ball-in-play outs (together they make ~.465).
Each step's base rates are calibrated so that a nominal batter, pitcher and fielders reproduce this line on average.

## Nominal skill and edges

- Nominal is fixed by the generator definition, never measured from the current pool:
  nominal ability 70, ability spread 23; nominal two-ability grade 70, grade spread 15.
- A player's **edge** for a skill is how many spreads he sits above nominal (negative when below).
- Batter and pitcher edges are applied separately; a batter rating is never subtracted from a pitcher rating.

## Combining: odds space

For each outcome, take its league odds against the reference outcome of that step and multiply by
an exponential of the weighted edges: the batter's edge pushes batter-friendly outcomes up, the pitcher's
edge pushes them down, and the signs flip for pitcher-friendly outcomes. The weights of all outcomes in a
step are then renormalized and rolled once. Probabilities stay between 0 and 1 by construction, so no clamps.

## Steps

1. **Discipline** — batter Eye vs pitcher Accuracy. Strikeout, walk and hit batter, each against a ball in play.
   A good eye raises walks and lowers strikeouts; a good pitcher does the reverse. Hit batters follow pitcher command only.
2. **Contact quality** — batter Power vs pitcher Arm. League mix soft 25% / medium 45% / hard 30%;
   power raises hard and lowers soft contact, arm does the reverse. No fixed cutoffs.
3. **Location** — infield share depends on quality (soft 75%, medium 55%, hard 30%), so hard contact leans outfield.
   A small share of infield balls goes to the catcher; the rest split among 1B / 2B / 3B / SS, outfield among LF / CF / RF.
   The assigned fielder's grade is used: Infield (Glove + Accuracy), Outfield (Power + Arm), Catcher (Eye + Glove).
4. **Fielding** — league hit and error rates per location and per contact quality; everything else is an out
   (grounders, pop-ups and fly outs). The fielder's grade edge raises out odds and lowers error odds; the pitcher's
   Pitching grade edge also raises out odds slightly.
5. **Hit type** — infield hits are singles. Outfield hits use the league single / double / triple / homer mix,
   with extra-base odds raised by the batter's Power edge and lowered by the pitcher's Arm edge. The outfielder's edge
   turns doubles and triples back into singles (it cannot stop a home run).

## Runner advancement and scoring

- Standard advancement: a single moves every runner one base, a double two, a triple clears the bases, a homer scores everyone.
  Walks and hit batters move forced runners only.
- Optional extra bases (scoring from second on a single, first to third on a single, scoring from first on a double,
  tagging from third on a fly out) start from league rates and are held down by the outfielder's edge.
- Ground-ball double plays and runners moving up on groundouts use fixed chances. An error moves every runner two bases;
  runs scoring on an error are unearned. No speed ability, so no steals.
- Walk-off: the game ends as soon as the home side leads in the bottom of the ninth or later (a walk-off homer counts in full).

## Stats

Each play credits the batter (PA, AB, H, 2B, 3B, HR, R, RBI, BB, K, HBP, SF, reached on error), the pitcher who let each
runner on (outs, H, R, ER, BB, K, HR, HBP, batters faced, pitches) and team errors. The game's box score is stored on the game record.

## Pitcher usage (outside the plate-appearance loop)

Pitch counts are rolled per plate appearance (strikeouts and walks run longer). The starter leaves once he passes a
60–90 pitch budget that shrinks with runs and hits allowed; relievers follow in order with short budgets; the closer
takes save spots from the ninth on.
