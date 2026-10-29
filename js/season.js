// season.js — schedule generation, half sim, trade resolution

import { simulateGame } from './sim.js';
import { isRosterComplete } from './team.js';

const GAMES_PER_PAIR = 4; // 2 first half, 2 second half

export async function startSeason(dao, name, teamIds) {
  const season = await dao.createSeason(name);
  for (const tid of teamIds) {
    await dao.enrollTeam(season.id, tid);
  }
  return season;
}

export async function generateSchedule(dao, seasonId) {
  const enrolled = await dao.seasonTeams(seasonId);
  const teams = enrolled.map(st => st.team);
  const games = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      for (let g = 0; g < GAMES_PER_PAIR; g++) {
        const half = g < GAMES_PER_PAIR / 2 ? 1 : 2;
        const home = g % 2 === 0 ? teams[i] : teams[j];
        const away = home === teams[i] ? teams[j] : teams[i];
        games.push({
          season: seasonId,
          home_team: home,
          away_team: away,
          half,
          played: false
        });
      }
    }
  }
  for (const g of games) {
    await dao.createGame(g);
  }
  return games.length;
}

export async function simHalf(dao, seasonId, half) {
  const games = await dao.games(seasonId, half);
  const unplayed = games.filter(g => !g.played);
  const standings = await dao.seasonTeams(seasonId);
  const byTeam = {};
  for (const st of standings) byTeam[st.team] = st;

  for (const game of unplayed) {
    const homeRoster = await loadRoster(dao, game.home_team);
    const awayRoster = await loadRoster(dao, game.away_team);
    if (!isRosterComplete(homeRoster) || !isRosterComplete(awayRoster)) {
      continue; // skip incomplete
    }
    const res = simulateGame(homeRoster, awayRoster);
    await dao.updateGame(game.id, {
      home_score: res.homeRuns,
      away_score: res.awayRuns,
      played: true
    });
    // update records
    const homeSt = byTeam[game.home_team];
    const awaySt = byTeam[game.away_team];
    if (res.homeRuns > res.awayRuns) {
      await dao.updateSeasonTeam(homeSt.id, { wins: (homeSt.wins || 0) + 1 });
      await dao.updateSeasonTeam(awaySt.id, { losses: (awaySt.losses || 0) + 1 });
      homeSt.wins = (homeSt.wins || 0) + 1;
      awaySt.losses = (awaySt.losses || 0) + 1;
    } else if (res.awayRuns > res.homeRuns) {
      await dao.updateSeasonTeam(awaySt.id, { wins: (awaySt.wins || 0) + 1 });
      await dao.updateSeasonTeam(homeSt.id, { losses: (homeSt.losses || 0) + 1 });
      awaySt.wins = (awaySt.wins || 0) + 1;
      homeSt.losses = (homeSt.losses || 0) + 1;
    }
  }
  return unplayed.length;
}

async function loadRoster(dao, teamId) {
  const rows = await dao.teamPlayers(teamId);
  const map = {};
  for (const row of rows) {
    if (row.expand && row.expand.player) map[row.role] = row.expand.player;
  }
  return map;
}

export async function acceptTrade(dao, offer) {
  // swap the two players
  const fromRows = await dao.teamPlayers(offer.from_team);
  const toRows = await dao.teamPlayers(offer.to_team);
  const outRole = fromRows.find(r => r.player === offer.player_out)?.role;
  const inRole = toRows.find(r => r.player === offer.player_in)?.role;
  if (!outRole || !inRole) return false;
  await dao.assignPlayer(offer.from_team, offer.player_in, outRole);
  await dao.assignPlayer(offer.to_team, offer.player_out, inRole);
  await dao.updateTradeOffer(offer.id, { status: 'accepted' });
  return true;
}

export async function claimFreeAgent(dao, seasonId, teamId, playerId, role = 'fa_pickup') {
  const fa = await dao.freeAgents();
  if (!fa.find(p => p.id === playerId)) return false;
  await dao.assignPlayer(teamId, playerId, role);
  await dao.createFreeAgentOffer({
    season: seasonId,
    team: teamId,
    player: playerId,
    status: 'accepted',
    round: 1
  });
  return true;
}
