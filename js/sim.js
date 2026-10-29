// sim.js — simple game simulation

function avg(nums) {
  if (!nums.length) return 50;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function strength(players, keys) {
  return avg(players.map(p => avg(keys.map(k => p[k] || 0))));
}

export function simulateGame(homeRoster, awayRoster) {
  // extract relevant groups
  const homeLineup = Object.values(homeRoster).filter(p => p && !['SP','RP','CL'].includes(p.position));
  const awayLineup = Object.values(awayRoster).filter(p => p && !['SP','RP','CL'].includes(p.position));
  const homePitchers = Object.values(homeRoster).filter(p => p && ['SP','RP','CL'].includes(p.position));
  const awayPitchers = Object.values(awayRoster).filter(p => p && ['SP','RP','CL'].includes(p.position));

  const homeBat = strength(homeLineup, ['contact','power']);
  const awayBat = strength(awayLineup, ['contact','power']);
  const homePitch = strength(homePitchers, ['stuff','control']);
  const awayPitch = strength(awayPitchers, ['stuff','control']);

  // simple run expectation: batting vs opposing pitching, plus noise
  function runs(bat, oppPitch) {
    const base = 3 + (bat - oppPitch) / 25;
    const noise = (Math.random() - 0.5) * 4;
    return Math.max(0, Math.round(base + noise));
  }

  const homeRuns = runs(homeBat, awayPitch);
  const awayRuns = runs(awayBat, homePitch);

  // light play-by-play flavor
  const events = [];
  events.push(`Home batting strength ${homeBat.toFixed(0)} vs Away pitching ${awayPitch.toFixed(0)}`);
  events.push(`Away batting strength ${awayBat.toFixed(0)} vs Home pitching ${homePitch.toFixed(0)}`);
  events.push(`Final: Home ${homeRuns} — Away ${awayRuns}`);

  return {
    homeRuns,
    awayRuns,
    homeBat: Math.round(homeBat),
    awayBat: Math.round(awayBat),
    homePitch: Math.round(homePitch),
    awayPitch: Math.round(awayPitch),
    events,
    winner: homeRuns > awayRuns ? 'home' : awayRuns > homeRuns ? 'away' : 'tie'
  };
}
