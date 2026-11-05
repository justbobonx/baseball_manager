// Season life cycle: preseason, first half, all-star break, second half, done.
// Rosters may change only in preseason and at the all-star break.

// Each cycle every pair of teams meets once; home field alternates by cycle.
// The first half of the cycles make up the first half of the season.
const SEASON_ROUND_ROBIN_CYCLES = 6;

// Creates the season and enrolls every team whose roster is complete.
async function startSeason(dao, name) {
  const season = await dao.createSeason(name);
  for (const team of await dao.teams()) {
    if (isRosterComplete(rosterBySlot(await dao.teamPlayers(team.id)))) await dao.enrollTeam(season.id, team.id);
  }
  return season;
}

// Moves the season to its next phase. Leaving preseason writes the whole schedule;
// a half can only end once all of its games are played.
async function advancePhase(dao, season) {
  if (season.phase === 'preseason') {
    const teams = (await dao.seasonTeams(season.id)).map(st => st.team);
    if (teams.length < 2) throw new Error('A season needs at least two teams with complete rosters');
    // Circle method: one team stays put while the rest rotate, so each round pairs everyone once.
    // An odd league gets a bye placeholder.
    const circle = teams.length % 2 ? teams.concat([null]) : teams.slice();
    let gameNumber = 1;
    for (let cycle = 0; cycle < SEASON_ROUND_ROBIN_CYCLES; cycle++) {
      const half = cycle < SEASON_ROUND_ROBIN_CYCLES / 2 ? 1 : 2;
      for (let round = 0; round < circle.length - 1; round++) {
        for (let i = 0; i < circle.length / 2; i++) {
          const a = circle[i];
          const b = circle[circle.length - 1 - i];
          if (!a || !b) continue;
          const flip = (cycle + round + i) % 2 === 1;
          await dao.createGame({
            season: season.id, half, round: cycle * (circle.length - 1) + round + 1, game_number: gameNumber++,
            home_team: flip ? b : a, away_team: flip ? a : b, played: false
          });
        }
        circle.splice(1, 0, circle.pop());
      }
    }
    return dao.updateSeason(season.id, { phase: 'first_half' });
  }
  if (season.phase === 'first_half' || season.phase === 'second_half') {
    const half = season.phase === 'first_half' ? 1 : 2;
    if ((await dao.games(season.id)).some(g => g.half === half && !g.played)) throw new Error('Games remain in this half');
    return dao.updateSeason(season.id, { phase: half === 1 ? 'allstar' : 'done' });
  }
  if (season.phase === 'allstar') return dao.updateSeason(season.id, { phase: 'second_half' });
  return season;
}

// Plays up to a number of unplayed games of the current half in schedule order, storing
// the score and box score on each game and the result on the standings. Rosters are
// loaded once since they are frozen during a half. Each team's starter is chosen by how
// many games it has already played, so the rotation cycles across the season.
async function simSeasonGames(dao, season, maxGames) {
  const half = season.phase === 'first_half' ? 1 : (season.phase === 'second_half' ? 2 : 0);
  if (!half) throw new Error('Games are only played during a half');
  const games = await dao.games(season.id);
  const standings = {};
  const rosters = {};
  const gamesPlayed = {};
  for (const st of await dao.seasonTeams(season.id)) {
    standings[st.team] = st;
    rosters[st.team] = rosterBySlot(await dao.teamPlayers(st.team));
    gamesPlayed[st.team] = 0;
  }
  for (const game of games) {
    if (game.played) { gamesPlayed[game.home_team]++; gamesPlayed[game.away_team]++; }
  }

  let count = 0;
  for (const game of games) {
    if (count >= maxGames) break;
    if (game.played || game.half !== half) continue;
    const result = simulateGame(
      buildGameTeam(standings[game.away_team].expand.team, rosters[game.away_team], gamesPlayed[game.away_team]),
      buildGameTeam(standings[game.home_team].expand.team, rosters[game.home_team], gamesPlayed[game.home_team]),
      false);
    gamesPlayed[game.home_team]++;
    gamesPlayed[game.away_team]++;
    await dao.updateGame(game.id, { home_score: result.homeScore, away_score: result.awayScore, box_score: result.box, played: true });
    // A game stopped by the safety inning cap is a tie and changes no record.
    if (result.homeScore !== result.awayScore) {
      const winner = standings[result.homeScore > result.awayScore ? game.home_team : game.away_team];
      const loser = standings[result.homeScore > result.awayScore ? game.away_team : game.home_team];
      winner.wins = (winner.wins || 0) + 1;
      loser.losses = (loser.losses || 0) + 1;
      await dao.updateSeasonTeam(winner.id, { wins: winner.wins });
      await dao.updateSeasonTeam(loser.id, { losses: loser.losses });
    }
    count++;
  }
  return count;
}

// Signs a free agent into an open slot. Only allowed while rosters are open,
// and it is logged as a claim for the current season if there is one.
async function claimFreeAgent(dao, season, teamId, playerId, position) {
  if (season && season.phase !== 'preseason' && season.phase !== 'allstar' && season.phase !== 'done') {
    throw new Error('Rosters are frozen during a half');
  }
  if (!(await dao.freeAgents()).some(p => p.id === playerId)) throw new Error('That player is no longer a free agent');
  const row = await dao.assignSlot(teamId, playerId, position, 0);
  if (season && season.phase !== 'done') await dao.recordFreeAgentClaim(season.id, teamId, playerId);
  return row;
}
