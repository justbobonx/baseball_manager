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
    // remove any existing assignment for this role on the team
    const existing = await c.collection('team_players').getFullList({
      filter: `team = "${teamId}" && role = "${role}"`
    });
    for (const row of existing) {
      await c.collection('team_players').delete(row.id);
    }
    // also remove this player from any other role on this team
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
  }
};
