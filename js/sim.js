// One full game, plate appearance by plate appearance, per the play resolution design doc.
// Every tunable lives here at the top so league rates can be dialed in.

// League baseline: approximate 2024 major league rates per plate appearance.
// Every step below is calibrated so that a nominal batter facing a nominal pitcher
// in front of nominal fielders reproduces this line on average.
const SIM_LEAGUE_K = 0.215;
const SIM_LEAGUE_BB = 0.082;
const SIM_LEAGUE_HBP = 0.011;
const SIM_LEAGUE_1B = 0.140;
const SIM_LEAGUE_2B = 0.043;
const SIM_LEAGUE_3B = 0.004;
const SIM_LEAGUE_HR = 0.029;
const SIM_LEAGUE_BIP_OUT = 0.455;
const SIM_LEAGUE_ERROR = 0.010;

// Nominal skill comes from the generator's definition, never from the current pool.
// Edges are measured in spreads away from nominal.
const SIM_NOMINAL_ABILITY = 70;
const SIM_ABILITY_SPREAD = 23;
const SIM_NOMINAL_GRADE = 70;
const SIM_GRADE_SPREAD = 15;

// Step one, discipline: batter eye edge and pitcher accuracy edge move the odds of a
// strikeout, walk or hit batter against a ball in play. A good eye trades strikeouts for
// walks; a good pitcher does the reverse. Hit batters follow pitcher command only.
const SIM_K_EYE_WEIGHT = 0.35;
const SIM_K_ACCURACY_WEIGHT = 0.35;
const SIM_BB_EYE_WEIGHT = 0.35;
const SIM_BB_ACCURACY_WEIGHT = 0.35;
const SIM_HBP_ACCURACY_WEIGHT = 0.30;

// Step two, contact quality: league mix of soft, medium and hard contact on balls in play,
// moved by batter power edge against pitcher arm edge.
const SIM_LEAGUE_SOFT_SHARE = 0.25;
const SIM_LEAGUE_MEDIUM_SHARE = 0.45;
const SIM_LEAGUE_HARD_SHARE = 0.30;
const SIM_HARD_POWER_WEIGHT = 0.40;
const SIM_HARD_ARM_WEIGHT = 0.40;
const SIM_SOFT_POWER_WEIGHT = 0.30;
const SIM_SOFT_ARM_WEIGHT = 0.30;

// Step three, location: the share of each contact quality that stays in the infield.
// Of infield balls a small share goes to the catcher; the rest split by position weight.
const SIM_INFIELD_SHARE_SOFT = 0.75;
const SIM_INFIELD_SHARE_MEDIUM = 0.55;
const SIM_INFIELD_SHARE_HARD = 0.30;
const SIM_CATCHER_SHARE = 0.05;
const SIM_INFIELD_WEIGHT_1B = 0.18;
const SIM_INFIELD_WEIGHT_2B = 0.27;
const SIM_INFIELD_WEIGHT_3B = 0.25;
const SIM_OUTFIELD_WEIGHT_LF = 0.33;
const SIM_OUTFIELD_WEIGHT_CF = 0.34;

// Step four, fielding: league hit and error rates for each location and contact quality;
// everything else is an out. Together with the mixes above these reproduce the league line.
const SIM_INFIELD_HIT_SOFT = 0.08;
const SIM_INFIELD_HIT_MEDIUM = 0.09;
const SIM_INFIELD_HIT_HARD = 0.17;
const SIM_OUTFIELD_HIT_SOFT = 0.50;
const SIM_OUTFIELD_HIT_MEDIUM = 0.53;
const SIM_OUTFIELD_HIT_HARD = 0.75;
const SIM_INFIELD_ERROR = 0.0224;
const SIM_OUTFIELD_ERROR = 0.0062;
// A better fielder raises the odds of an out and lowers the odds of an error;
// a better pitcher (by pitching grade) nudges the odds of an out up as well.
const SIM_OUT_FIELDER_WEIGHT = 0.25;
const SIM_OUT_PITCHER_WEIGHT = 0.10;
const SIM_ERROR_FIELDER_WEIGHT = 0.50;

// Step five, hit type on outfield hits: league mix of single, double, triple and home run,
// moved by batter power edge against pitcher arm edge. The outfielder's edge turns
// doubles and triples back into singles but cannot stop a home run.
const SIM_OUTFIELD_HIT_1B_SHARE = 0.5945;
const SIM_OUTFIELD_HIT_2B_SHARE = 0.2293;
const SIM_OUTFIELD_HIT_3B_SHARE = 0.0213;
const SIM_OUTFIELD_HIT_HR_SHARE = 0.1548;
const SIM_XBH_POWER_WEIGHT = 0.30;
const SIM_XBH_ARM_WEIGHT = 0.25;
const SIM_HR_POWER_WEIGHT = 0.50;
const SIM_HR_ARM_WEIGHT = 0.35;
const SIM_XBH_OUTFIELDER_WEIGHT = 0.25;

// Baserunning stays average: the routine extra bases real runners take, with the
// outfielder's edge lowering the odds that a runner tries and makes it.
const SIM_SCORE_FROM_SECOND_ON_SINGLE = 0.60;
const SIM_FIRST_TO_THIRD_ON_SINGLE = 0.28;
const SIM_SCORE_FROM_FIRST_ON_DOUBLE = 0.40;
const SIM_SAC_FLY_CHANCE = 0.70;
const SIM_RUNNER_HOLD_WEIGHT = 0.30;
const SIM_DOUBLE_PLAY_CHANCE = 0.45;
const SIM_GROUNDOUT_ADVANCE_CHANCE = 0.45;

// Pitch counts per plate appearance, by outcome. Strikeouts and walks run long.
const SIM_PITCHES_K_MIN = 4;
const SIM_PITCHES_K_MAX = 7;
const SIM_PITCHES_BB_MIN = 5;
const SIM_PITCHES_BB_MAX = 8;
const SIM_PITCHES_HBP_MIN = 1;
const SIM_PITCHES_HBP_MAX = 4;
const SIM_PITCHES_BIP_MIN = 1;
const SIM_PITCHES_BIP_MAX = 6;

// Pitcher usage.
const SIM_STARTER_LIMIT_MIN = 60;
const SIM_STARTER_LIMIT_MAX = 90;
const SIM_STARTER_PULL_PER_RUN = 5;
const SIM_STARTER_PULL_PER_HIT = 2;
const SIM_RELIEVER_LIMIT_MIN = 18;
const SIM_RELIEVER_LIMIT_MAX = 35;
const SIM_CLOSER_INNING = 9;
const SIM_SAVE_MAX_LEAD = 3;
const SIM_REGULATION_INNINGS = 9;
// Safety stop so a freak game cannot loop forever; it is then recorded as a tie.
const SIM_MAX_INNINGS = 25;

// Plays one game. Each team is the shape built by the roster code: fielders by position,
// the day's starter, bullpen, closer and nine batting spots. Returns the final score,
// a box score fit for storing on the game record, and (when asked) a play log.
function simulateGame(awayTeam, homeTeam, wantLog) {
  const log = [];
  let pitcherCounter = 0;

  // One side's running state. Every player who appears gets one line.
  function openSide(team) {
    const side = {
      team,
      runs: 0, hits: 0, errors: 0,
      linescore: [],
      batting: {}, battingOrderIds: [],
      pitching: [],
      battingIndex: 0,
      bullpenIndex: 0,
      closerUsed: false,
      pitcher: null
    };
    bringIn(side, team.starter, true, 0);
    return side;
  }

  // Puts a new pitcher on the mound with a fresh line and its own pitch limit.
  function bringIn(side, player, isStarter, leadOnEntry) {
    const line = {
      id: player.id, name: player.name, starter: isStarter, order: pitcherCounter++,
      outs: 0, h: 0, r: 0, er: 0, bb: 0, k: 0, hr: 0, hbp: 0, bf: 0, pitches: 0,
      leadOnEntry,
      limit: isStarter
        ? SIM_STARTER_LIMIT_MIN + Math.floor(Math.random() * (SIM_STARTER_LIMIT_MAX - SIM_STARTER_LIMIT_MIN + 1))
        : SIM_RELIEVER_LIMIT_MIN + Math.floor(Math.random() * (SIM_RELIEVER_LIMIT_MAX - SIM_RELIEVER_LIMIT_MIN + 1))
    };
    side.pitching.push(line);
    side.pitcher = { player, line };
    if (player === side.team.closer) side.closerUsed = true;
    if (wantLog && side.pitching.length > 1) log.push(`  Pitching change for ${side.team.name}: ${player.name}`);
  }

  const away = openSide(awayTeam);
  const home = openSide(homeTeam);
  let leader = null;
  let decision = { win: null, loss: null };
  let inning = 1;
  let walkOff = false;

  for (; inning <= SIM_MAX_INNINGS; inning++) {
    for (const half of ['top', 'bottom']) {
      if (half === 'bottom' && inning >= SIM_REGULATION_INNINGS && home.runs > away.runs) break;
      const batting = half === 'top' ? away : home;
      const fielding = half === 'top' ? home : away;
      const fielders = fielding.team.fielders;
      if (wantLog) log.push(`${half === 'top' ? 'Top' : 'Bottom'} ${inning} — ${batting.team.name} batting`);

      // Late in a close game the closer takes the inning.
      const fieldingLead = fielding.runs - batting.runs;
      if (inning >= SIM_CLOSER_INNING && !fielding.closerUsed &&
          ((fieldingLead >= 1 && fieldingLead <= SIM_SAVE_MAX_LEAD) || (fieldingLead === 0 && inning > SIM_REGULATION_INNINGS))) {
        bringIn(fielding, fielding.team.closer, false, fieldingLead);
      }

      let outs = 0;
      let runsThisHalf = 0;
      const bases = { first: null, second: null, third: null };

      // Sends one runner home, charging the run to the pitcher who let that runner on.
      // In the bottom of the ninth or later the game ends the moment the home side leads.
      const score = (runner, batterLine) => {
        if (walkOff) return;
        batting.runs++;
        runsThisHalf++;
        batting.batting[runner.id].r++;
        runner.line.r++;
        if (runner.earned) runner.line.er++;
        if (batterLine) batterLine.rbi++;
        const nowLeading = batting.runs > fielding.runs ? batting : (fielding.runs > batting.runs ? fielding : null);
        if (nowLeading && nowLeading !== leader) {
          decision = { win: nowLeading.pitcher.line, loss: (nowLeading === away ? home : away).pitcher.line };
        }
        leader = nowLeading;
        if (half === 'bottom' && inning >= SIM_REGULATION_INNINGS && home.runs > away.runs) walkOff = true;
      };

      while (outs < 3 && !walkOff) {
        // Fatigue check before every batter: starters wear down faster when hit hard,
        // relievers have a short fixed leash. The next arm is the closer in a save spot,
        // otherwise the next reliever, and the closer only once the pen is empty.
        const current = fielding.pitcher;
        const tired = current.line.starter
          ? current.line.pitches >= current.line.limit - current.line.r * SIM_STARTER_PULL_PER_RUN - current.line.h * SIM_STARTER_PULL_PER_HIT
          : current.player !== fielding.team.closer && current.line.pitches >= current.line.limit;
        if (tired) {
          const lead = fielding.runs - batting.runs;
          const saveSpot = inning >= SIM_CLOSER_INNING && lead >= 0 && lead <= SIM_SAVE_MAX_LEAD;
          if (saveSpot && !fielding.closerUsed) bringIn(fielding, fielding.team.closer, false, lead);
          else if (fielding.bullpenIndex < fielding.team.bullpen.length) bringIn(fielding, fielding.team.bullpen[fielding.bullpenIndex++], false, lead);
          else if (!fielding.closerUsed) bringIn(fielding, fielding.team.closer, false, lead);
        }
        const pitcher = fielding.pitcher.player;
        const pline = fielding.pitcher.line;

        const spot = batting.team.battingOrder[batting.battingIndex % 9];
        batting.battingIndex++;
        const batter = spot.pitcherSpot ? batting.pitcher.player : spot.player;
        if (!batting.batting[batter.id]) {
          batting.batting[batter.id] = {
            id: batter.id, name: batter.name, pos: spot.position,
            pa: 0, ab: 0, h: 0, d: 0, t: 0, hr: 0, r: 0, rbi: 0, bb: 0, k: 0, hbp: 0, sf: 0, roe: 0
          };
          batting.battingOrderIds.push(batter.id);
        }
        const bline = batting.batting[batter.id];
        bline.pa++;
        pline.bf++;
        const runner = { id: batter.id, line: pline, earned: true };
        const rollRange = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

        // Edges of this batter and pitcher, in spreads away from nominal.
        const eyeEdge = (batter.eye - SIM_NOMINAL_ABILITY) / SIM_ABILITY_SPREAD;
        const powerEdge = (batter.power - SIM_NOMINAL_ABILITY) / SIM_ABILITY_SPREAD;
        const armEdge = (pitcher.arm - SIM_NOMINAL_ABILITY) / SIM_ABILITY_SPREAD;
        const accuracyEdge = (pitcher.accuracy - SIM_NOMINAL_ABILITY) / SIM_ABILITY_SPREAD;
        const pitchingEdge = (playerGrades(pitcher).pitching - SIM_NOMINAL_GRADE) / SIM_GRADE_SPREAD;

        // Step one: discipline. Each outcome's league odds against a ball in play are scaled
        // by the two edges, then all four are renormalized and rolled once.
        const bipLeague = 1 - SIM_LEAGUE_K - SIM_LEAGUE_BB - SIM_LEAGUE_HBP;
        const kWeight = SIM_LEAGUE_K / bipLeague * Math.exp(-SIM_K_EYE_WEIGHT * eyeEdge + SIM_K_ACCURACY_WEIGHT * accuracyEdge);
        const bbWeight = SIM_LEAGUE_BB / bipLeague * Math.exp(SIM_BB_EYE_WEIGHT * eyeEdge - SIM_BB_ACCURACY_WEIGHT * accuracyEdge);
        const hbpWeight = SIM_LEAGUE_HBP / bipLeague * Math.exp(-SIM_HBP_ACCURACY_WEIGHT * accuracyEdge);
        const disciplineTotal = 1 + kWeight + bbWeight + hbpWeight;
        const discipline = Math.random() * disciplineTotal;
        if (discipline < kWeight) {
          pline.pitches += rollRange(SIM_PITCHES_K_MIN, SIM_PITCHES_K_MAX);
          bline.ab++; bline.k++; pline.k++; pline.outs++; outs++;
          if (wantLog) log.push(`  ${batter.name} strikes out`);
          continue;
        }
        if (discipline < kWeight + bbWeight + hbpWeight) {
          const hitByPitch = discipline >= kWeight + bbWeight;
          pline.pitches += hitByPitch
            ? rollRange(SIM_PITCHES_HBP_MIN, SIM_PITCHES_HBP_MAX)
            : rollRange(SIM_PITCHES_BB_MIN, SIM_PITCHES_BB_MAX);
          if (hitByPitch) { bline.hbp++; pline.hbp++; } else { bline.bb++; pline.bb++; }
          // Only forced runners move.
          if (bases.first) {
            if (bases.second) {
              if (bases.third) score(bases.third, bline);
              bases.third = bases.second;
            }
            bases.second = bases.first;
          }
          bases.first = runner;
          if (wantLog) log.push(`  ${batter.name} ${hitByPitch ? 'is hit by a pitch' : 'walks'}`);
          continue;
        }
        pline.pitches += rollRange(SIM_PITCHES_BIP_MIN, SIM_PITCHES_BIP_MAX);

        // Step two: contact quality. Power over arm shifts the league mix toward hard contact,
        // the reverse toward soft, with medium as the anchor.
        const hardWeight = SIM_LEAGUE_HARD_SHARE / SIM_LEAGUE_MEDIUM_SHARE * Math.exp(SIM_HARD_POWER_WEIGHT * powerEdge - SIM_HARD_ARM_WEIGHT * armEdge);
        const softWeight = SIM_LEAGUE_SOFT_SHARE / SIM_LEAGUE_MEDIUM_SHARE * Math.exp(-SIM_SOFT_POWER_WEIGHT * powerEdge + SIM_SOFT_ARM_WEIGHT * armEdge);
        const contact = Math.random() * (1 + hardWeight + softWeight);
        const quality = contact < hardWeight ? 'hard' : (contact < hardWeight + softWeight ? 'soft' : 'medium');

        // Step three: location and the assigned fielder who plays it. Hard contact leans outfield.
        const inInfield = Math.random() <
          (quality === 'soft' ? SIM_INFIELD_SHARE_SOFT : (quality === 'hard' ? SIM_INFIELD_SHARE_HARD : SIM_INFIELD_SHARE_MEDIUM));
        let position;
        const where = Math.random();
        if (inInfield) {
          if (Math.random() < SIM_CATCHER_SHARE) position = 'C';
          else if (where < SIM_INFIELD_WEIGHT_1B) position = '1B';
          else if (where < SIM_INFIELD_WEIGHT_1B + SIM_INFIELD_WEIGHT_2B) position = '2B';
          else if (where < SIM_INFIELD_WEIGHT_1B + SIM_INFIELD_WEIGHT_2B + SIM_INFIELD_WEIGHT_3B) position = '3B';
          else position = 'SS';
        } else {
          position = where < SIM_OUTFIELD_WEIGHT_LF ? 'LF' : (where < SIM_OUTFIELD_WEIGHT_LF + SIM_OUTFIELD_WEIGHT_CF ? 'CF' : 'RF');
        }
        const fielderGrades = playerGrades(fielders[position]);
        const fielderEdge = ((position === 'C' ? fielderGrades.catching : (inInfield ? fielderGrades.infield : fielderGrades.outfield)) -
          SIM_NOMINAL_GRADE) / SIM_GRADE_SPREAD;

        // Step four: out, error or hit. The league rates for this location and quality give
        // odds of an out and of an error against a hit; the fielder and pitcher scale them.
        const hitLeague = inInfield
          ? (quality === 'soft' ? SIM_INFIELD_HIT_SOFT : (quality === 'hard' ? SIM_INFIELD_HIT_HARD : SIM_INFIELD_HIT_MEDIUM))
          : (quality === 'soft' ? SIM_OUTFIELD_HIT_SOFT : (quality === 'hard' ? SIM_OUTFIELD_HIT_HARD : SIM_OUTFIELD_HIT_MEDIUM));
        const errorLeague = inInfield ? SIM_INFIELD_ERROR : SIM_OUTFIELD_ERROR;
        const outWeight = (1 - hitLeague - errorLeague) / hitLeague *
          Math.exp(SIM_OUT_FIELDER_WEIGHT * fielderEdge + SIM_OUT_PITCHER_WEIGHT * pitchingEdge);
        const errorWeight = errorLeague / hitLeague * Math.exp(-SIM_ERROR_FIELDER_WEIGHT * fielderEdge);
        const fieldRoll = Math.random() * (1 + outWeight + errorWeight);
        // Odds that a runner takes an optional extra base against this fielder.
        const runnerOdds = (league) => league / (1 - league) * Math.exp(-SIM_RUNNER_HOLD_WEIGHT * fielderEdge);
        if (fieldRoll < outWeight) {
          bline.ab++;
          outs++;
          pline.outs++;
          if (!inInfield) {
            // Fly ball: a runner on third tags up with fewer than three outs; a strong arm holds him.
            if (outs < 3 && bases.third && Math.random() * (1 + runnerOdds(SIM_SAC_FLY_CHANCE)) < runnerOdds(SIM_SAC_FLY_CHANCE)) {
              bline.ab--; bline.sf++;
              score(bases.third, bline);
              bases.third = null;
              if (wantLog) log.push(`  ${batter.name} hits a sacrifice fly to ${position}`);
            } else if (wantLog) log.push(`  ${batter.name} flies out to ${position}`);
          } else if (position !== 'C' && bases.first && outs < 3 && Math.random() < SIM_DOUBLE_PLAY_CHANCE) {
            // Ground ball double play erases the batter and the runner from first; others move up if the inning lives.
            outs++;
            pline.outs++;
            bases.first = null;
            if (outs < 3) {
              if (bases.third) { score(bases.third, null); bases.third = null; }
              if (bases.second) { bases.third = bases.second; bases.second = null; }
            }
            if (wantLog) log.push(`  ${batter.name} grounds into a double play`);
          } else {
            // Routine out on the ground or in the air; runners may move up one base on a grounder.
            if (outs < 3 && position !== 'C') {
              if (bases.third && Math.random() < SIM_GROUNDOUT_ADVANCE_CHANCE) { score(bases.third, bline); bases.third = null; }
              if (bases.second && !bases.third && Math.random() < SIM_GROUNDOUT_ADVANCE_CHANCE) { bases.third = bases.second; bases.second = null; }
              if (bases.first && !bases.second) { bases.second = bases.first; bases.first = null; }
            }
            if (wantLog) log.push(`  ${batter.name} ${position === 'C' ? 'pops out to the catcher' : 'grounds out to ' + position}`);
          }
          continue;
        }
        if (fieldRoll < outWeight + errorWeight) {
          // Error: the batter reaches, every runner takes two bases, and runs that score are unearned.
          bline.ab++; bline.roe++;
          fielding.errors++;
          runner.earned = false;
          if (bases.third) { bases.third.earned = false; score(bases.third, null); }
          if (bases.second) { bases.second.earned = false; score(bases.second, null); }
          bases.third = bases.first;
          bases.second = null;
          bases.first = runner;
          if (wantLog) log.push(`  ${batter.name} reaches on an error by ${position}`);
          continue;
        }

        // Step five: hit type. Infield hits are singles. Outfield hits take the league mix with
        // each extra-base kind's odds against a single scaled by power over arm; the outfielder
        // cuts doubles and triples back to singles.
        let basesGained = 1;
        if (!inInfield) {
          const doubleWeight = SIM_OUTFIELD_HIT_2B_SHARE / SIM_OUTFIELD_HIT_1B_SHARE *
            Math.exp(SIM_XBH_POWER_WEIGHT * powerEdge - SIM_XBH_ARM_WEIGHT * armEdge - SIM_XBH_OUTFIELDER_WEIGHT * fielderEdge);
          const tripleWeight = SIM_OUTFIELD_HIT_3B_SHARE / SIM_OUTFIELD_HIT_1B_SHARE *
            Math.exp(SIM_XBH_POWER_WEIGHT * powerEdge - SIM_XBH_ARM_WEIGHT * armEdge - SIM_XBH_OUTFIELDER_WEIGHT * fielderEdge);
          const homerWeight = SIM_OUTFIELD_HIT_HR_SHARE / SIM_OUTFIELD_HIT_1B_SHARE *
            Math.exp(SIM_HR_POWER_WEIGHT * powerEdge - SIM_HR_ARM_WEIGHT * armEdge);
          const kind = Math.random() * (1 + doubleWeight + tripleWeight + homerWeight);
          basesGained = kind < homerWeight ? 4 : (kind < homerWeight + tripleWeight ? 3 : (kind < homerWeight + tripleWeight + doubleWeight ? 2 : 1));
        }
        bline.ab++; bline.h++; pline.h++;
        batting.hits++;
        if (basesGained === 2) bline.d++;
        if (basesGained === 3) bline.t++;
        if (basesGained === 4) { bline.hr++; pline.hr++; }
        if (wantLog) log.push(`  ${batter.name} ${['', 'singles', 'doubles', 'triples', 'homers'][basesGained]} to ${position}`);

        if (basesGained === 4) {
          // A home run clears the bases and always counts in full, walk-off or not.
          const walkOffBefore = walkOff;
          for (const base of ['third', 'second', 'first']) {
            if (bases[base]) { walkOff = walkOffBefore; score(bases[base], bline); }
          }
          walkOff = walkOffBefore;
          score(runner, bline);
          bases.first = bases.second = bases.third = null;
          continue;
        }
        if (basesGained === 3) {
          for (const base of ['third', 'second', 'first']) if (bases[base]) score(bases[base], bline);
          bases.first = bases.second = null;
          bases.third = runner;
          continue;
        }
        // Outfield arms cut down the optional extra base.
        const extraBase = (league) => !inInfield && Math.random() * (1 + runnerOdds(league)) < runnerOdds(league);
        if (basesGained === 2) {
          if (bases.third) score(bases.third, bline);
          if (bases.second) score(bases.second, bline);
          bases.third = null;
          if (bases.first) {
            if (extraBase(SIM_SCORE_FROM_FIRST_ON_DOUBLE)) score(bases.first, bline);
            else bases.third = bases.first;
          }
          bases.first = null;
          bases.second = runner;
          continue;
        }
        if (bases.third) { score(bases.third, bline); bases.third = null; }
        if (bases.second) {
          if (extraBase(SIM_SCORE_FROM_SECOND_ON_SINGLE)) score(bases.second, bline);
          else bases.third = bases.second;
          bases.second = null;
        }
        if (bases.first) {
          if (!bases.third && extraBase(SIM_FIRST_TO_THIRD_ON_SINGLE)) bases.third = bases.first;
          else bases.second = bases.first;
        }
        bases.first = runner;
      }

      batting.linescore.push(runsThisHalf);
      if (walkOff) break;
    }
    if (walkOff) break;
    if (inning >= SIM_REGULATION_INNINGS && home.runs !== away.runs) break;
  }

  // The home side never batting in its last inning shows as an x on the line score.
  if (home.linescore.length < away.linescore.length) home.linescore.push('x');

  // Pitching decisions: win and loss go to whoever was on the mound when the final lead
  // was taken; a save goes to the finisher of the winning side who entered with a small lead.
  let save = null;
  if (leader) {
    const finisher = leader.pitcher.line;
    if (finisher !== decision.win && !finisher.starter &&
        finisher.leadOnEntry >= 1 && finisher.leadOnEntry <= SIM_SAVE_MAX_LEAD) save = finisher;
  }
  const boxSide = (side) => ({
    team: side.team.id,
    name: side.team.name,
    runs: side.runs, hits: side.hits, errors: side.errors,
    linescore: side.linescore,
    batting: side.battingOrderIds.map(id => side.batting[id]),
    pitching: side.pitching.map(line => ({
      id: line.id, name: line.name, starter: line.starter,
      outs: line.outs, h: line.h, r: line.r, er: line.er, bb: line.bb, k: line.k, hr: line.hr, hbp: line.hbp,
      bf: line.bf, pitches: line.pitches,
      decision: leader && line === decision.win ? 'W' : (leader && line === decision.loss ? 'L' : (line === save ? 'S' : ''))
    }))
  });

  return {
    awayScore: away.runs,
    homeScore: home.runs,
    box: {
      innings: Math.min(inning, SIM_MAX_INNINGS),
      walk_off: walkOff,
      away: boxSide(away),
      home: boxSide(home)
    },
    log
  };
}
