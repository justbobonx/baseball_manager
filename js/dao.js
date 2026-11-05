// The only place that talks to PocketBase. Everything else goes through the data access object below.
// Needs the PocketBase browser build loaded first.

const DAO_URL_KEY = 'bb_pb_url';
const DAO_GUEST_KEY = 'bb_guest_login';

let daoClient = null;

const dao = {
  setUrl(url) {
    localStorage.setItem(DAO_URL_KEY, url.trim());
    daoClient = null;
  },

  getUrl() {
    return localStorage.getItem(DAO_URL_KEY) || '';
  },

  // Returns a ready client, signing in as this browser's guest user when needed.
  // The guest login is created once and remembered in local storage, because team
  // ownership rules require a signed-in user.
  async client() {
    if (!daoClient) {
      if (!dao.getUrl()) throw new Error('No PocketBase URL set');
      daoClient = new PocketBase(dao.getUrl());
      daoClient.autoCancellation(false);
    }
    if (!daoClient.authStore.isValid) {
      let guest = JSON.parse(localStorage.getItem(DAO_GUEST_KEY) || 'null');
      if (!guest) {
        const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
        guest = { email: `guest_${token}@guest.local`, password: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) };
        await daoClient.collection('users').create({ email: guest.email, password: guest.password, passwordConfirm: guest.password });
        localStorage.setItem(DAO_GUEST_KEY, JSON.stringify(guest));
      }
      await daoClient.collection('users').authWithPassword(guest.email, guest.password);
    }
    return daoClient;
  },

  userId() {
    return daoClient && daoClient.authStore.record ? daoClient.authStore.record.id : '';
  },

  // --- players ---
  async players() {
    const c = await dao.client();
    return c.collection('players').getFullList({ sort: 'name' });
  },

  async createPlayer(data) {
    const c = await dao.client();
    return c.collection('players').create(data);
  },

  // A free agent is any player without a roster row on any team.
  async freeAgents() {
    const c = await dao.client();
    const all = await c.collection('players').getFullList({ sort: 'name' });
    const taken = new Set((await c.collection('team_players').getFullList({ fields: 'player' })).map(row => row.player));
    return all.filter(p => !taken.has(p.id));
  },

  // --- teams and rosters ---
  async teams() {
    const c = await dao.client();
    return c.collection('teams').getFullList({ sort: 'name' });
  },

  async createTeam(name) {
    const c = await dao.client();
    return c.collection('teams').create({ name, owner: dao.userId() });
  },

  async teamPlayers(teamId) {
    const c = await dao.client();
    return c.collection('team_players').getFullList({ filter: c.filter('team = {:team}', { team: teamId }), expand: 'player' });
  },

  // Puts a player into one slot. Whoever held the slot is released to free agency,
  // and if the player already held another slot on this team that row is dropped.
  // Refuses a player owned by another team.
  async assignSlot(teamId, playerId, position, battingOrder) {
    const c = await dao.client();
    const held = await c.collection('team_players').getFullList({
      filter: c.filter('player = {:player} || (team = {:team} && position = {:position})', { player: playerId, team: teamId, position })
    });
    if (held.some(row => row.team !== teamId)) throw new Error('That player belongs to another team');
    for (const row of held) await c.collection('team_players').delete(row.id);
    return c.collection('team_players').create({ team: teamId, player: playerId, position, batting_order: battingOrder });
  },

  async releaseSlot(rowId) {
    const c = await dao.client();
    return c.collection('team_players').delete(rowId);
  },

  async setBattingOrder(rowId, battingOrder) {
    const c = await dao.client();
    return c.collection('team_players').update(rowId, { batting_order: battingOrder });
  },

  // --- seasons ---
  async seasons() {
    const c = await dao.client();
    return c.collection('seasons').getFullList({ sort: '-created' });
  },

  // The new season becomes the only current one.
  async createSeason(name) {
    const c = await dao.client();
    for (const s of await c.collection('seasons').getFullList({ filter: 'current = true' })) {
      await c.collection('seasons').update(s.id, { current: false });
    }
    return c.collection('seasons').create({ name, phase: 'preseason', current: true });
  },

  async updateSeason(id, data) {
    const c = await dao.client();
    return c.collection('seasons').update(id, data);
  },

  async seasonTeams(seasonId) {
    const c = await dao.client();
    return c.collection('season_teams').getFullList({ filter: c.filter('season = {:season}', { season: seasonId }), expand: 'team' });
  },

  async enrollTeam(seasonId, teamId) {
    const c = await dao.client();
    return c.collection('season_teams').create({ season: seasonId, team: teamId, wins: 0, losses: 0 });
  },

  async updateSeasonTeam(id, data) {
    const c = await dao.client();
    return c.collection('season_teams').update(id, data);
  },

  // --- games ---
  async games(seasonId) {
    const c = await dao.client();
    return c.collection('games').getFullList({ filter: c.filter('season = {:season}', { season: seasonId }), sort: 'game_number' });
  },

  async createGame(data) {
    const c = await dao.client();
    return c.collection('games').create(data);
  },

  async updateGame(id, data) {
    const c = await dao.client();
    return c.collection('games').update(id, data);
  },

  // --- free agent claims (recorded already accepted; claims are immediate) ---
  async recordFreeAgentClaim(seasonId, teamId, playerId) {
    const c = await dao.client();
    return c.collection('free_agent_offers').create({ season: seasonId, team: teamId, player: playerId, status: 'accepted' });
  }
};
