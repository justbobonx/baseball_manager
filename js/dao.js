// dao.js — PocketBase data access layer
// The rest of the app only talks to this.

const PB_URL_KEY = 'bb_pb_url';

let pb = null;

export function setPbUrl(url) {
  localStorage.setItem(PB_URL_KEY, url.trim());
  pb = null;
}

export function getPbUrl() {
  return localStorage.getItem(PB_URL_KEY) || '';
}

async function client() {
  if (pb) return pb;
  const url = getPbUrl();
  if (!url) throw new Error('No PocketBase URL set');
  const { default: PocketBase } = await import('https://cdn.jsdelivr.net/npm/pocketbase/dist/pocketbase.es.js');
  pb = new PocketBase(url);
  return pb;
}

export const dao = {
  // --- players / teams / roster (existing) ---
  async players(filter = '', sort = 'name') {
    const c = await client();
    return c.collection('players').getFullList({ filter, sort });
  },

  async createPlayer(data) {
    const c = await client();
    return c.collection('players').create(data);
  },

  async teams() {
    const c = await client();
    return c.collection('teams').getFullList({ sort: '-created' });
  },

  async createTeam(name) {
    const c = await client();
    return c.collection('teams').create({ name, created: new Date().toISOString() });
  },

  async teamPlayers(teamId) {
    const c = await client();
    return c.collection('team_players').getFullList({
      filter: `team = "${teamId}"`,
      expand: 'player'
    });
  },

  async assignPlayer(teamId, playerId, role) {
    const c = await client();
    const existing = await c.collection('team_players').getFullList({
      filter: `team = "${teamId}" && role = "${role}"`
    });
    for (const row of existing) {
      await c.collection('team_players').delete(row.id);
    }
    const onTeam = await c.collection('team_players').getFullList({
      filter: `team = "${teamId}" && player = "${playerId}"`
    });
    for (const row of onTeam) {
      await c.collection('team_players').delete(row.id);
    }
    return c.collection('team_players').create({ team: teamId, player: playerId, role });
  },

  async clearRole(teamId, role) {
    const c = await client();
    const existing = await c.collection('team_players').getFullList({
      filter: `team = "${teamId}" && role = "${role}"`
    });
    for (const row of existing) {
      await c.collection('team_players').delete(row.id);
    }
  },

  async freeAgents() {
    const c = await client();
    const all = await c.collection('players').getFullList({ sort: 'name' });
    const assigned = await c.collection('team_players').getFullList();
    const taken = new Set(assigned.map(r => r.player));
    return all.filter(p => !taken.has(p.id));
  },

  // --- seasons ---
  async seasons() {
    const c = await client();
    return c.collection('seasons').getFullList({ sort: '-created' });
  },

  async createSeason(name) {
    const c = await client();
    return c.collection('seasons').create({
      name,
      status: 'preseason',
      current_round: 1,
      created: new Date().toISOString()
    });
  },

  async updateSeason(id, data) {
    const c = await client();
    return c.collection('seasons').update(id, data);
  },

  async seasonTeams(seasonId) {
    const c = await client();
    return c.collection('season_teams').getFullList({
      filter: `season = "${seasonId}"`,
      expand: 'team',
      sort: '-wins'
    });
  },

  async enrollTeam(seasonId, teamId) {
    const c = await client();
    return c.collection('season_teams').create({
      season: seasonId,
      team: teamId,
      wins: 0,
      losses: 0
    });
  },

  async updateSeasonTeam(id, data) {
    const c = await client();
    return c.collection('season_teams').update(id, data);
  },

  // --- games ---
  async games(seasonId, half) {
    const c = await client();
    let filter = `season = "${seasonId}"`;
    if (half) filter += ` && half = ${half}`;
    return c.collection('games').getFullList({ filter, sort: 'half' });
  },

  async createGame(data) {
    const c = await client();
    return c.collection('games').create(data);
  },

  async updateGame(id, data) {
    const c = await client();
    return c.collection('games').update(id, data);
  },

  // --- offers ---
  async tradeOffers(seasonId) {
    const c = await client();
    return c.collection('trade_offers').getFullList({
      filter: `season = "${seasonId}"`,
      expand: 'from_team,to_team,player_out,player_in',
      sort: '-created'
    });
  },

  async createTradeOffer(data) {
    const c = await client();
    return c.collection('trade_offers').create({ ...data, status: 'pending' });
  },

  async updateTradeOffer(id, data) {
    const c = await client();
    return c.collection('trade_offers').update(id, data);
  },

  async freeAgentOffers(seasonId) {
    const c = await client();
    return c.collection('free_agent_offers').getFullList({
      filter: `season = "${seasonId}"`,
      expand: 'team,player',
      sort: '-created'
    });
  },

  async createFreeAgentOffer(data) {
    const c = await client();
    return c.collection('free_agent_offers').create({ ...data, status: 'pending' });
  },

  async updateFreeAgentOffer(id, data) {
    const c = await client();
    return c.collection('free_agent_offers').update(id, data);
  }
};
