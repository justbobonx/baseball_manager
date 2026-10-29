// app.js — main UI and wiring

import { dao, setPbUrl, getPbUrl } from './dao.js';
import { generatePool } from './generator.js';
import { ROLES, isRosterComplete } from './team.js';
import { simulateGame } from './sim.js';
import { startSeason, generateSchedule, simHalf, acceptTrade, claimFreeAgent } from './season.js';

const $ = (id) => document.getElementById(id);

let currentTeam = null;
let assignments = {}; // role -> player record
let allPlayers = [];

function status(msg) {
  $('pb-status').textContent = msg;
}

async function refreshPoolCount() {
  try {
    const list = await dao.players();
    allPlayers = list;
    $('pool-count').textContent = list.length + ' players in pool';
  } catch (e) {
    $('pool-count').textContent = 'error';
  }
}

async function loadTeams() {
  const teams = await dao.teams();
  const sel = $('team-select');
  const opp = $('opp-select');
  sel.innerHTML = '<option value="">Select team…</option>';
  opp.innerHTML = '<option value="">Opponent…</option>';
  for (const t of teams) {
    const o = document.createElement('option');
    o.value = t.id;
    o.textContent = t.name;
    sel.appendChild(o);
    const o2 = o.cloneNode(true);
    opp.appendChild(o2);
  }
}

function renderSlots() {
  const container = $('slots');
  container.innerHTML = '';
  const groups = {};
  for (const r of ROLES) {
    if (!groups[r.group]) groups[r.group] = [];
    groups[r.group].push(r);
  }
  for (const [group, roles] of Object.entries(groups)) {
    const h = document.createElement('h3');
    h.textContent = group;
    h.style.gridColumn = '1 / -1';
    h.style.margin = '12px 0 4px';
    container.appendChild(h);
    for (const role of roles) {
      const div = document.createElement('div');
      div.className = 'slot' + (assignments[role.id] ? ' filled' : '');
      const player = assignments[role.id];
      div.innerHTML = `<strong>${role.label}</strong>${player ? player.name + ' (' + player.position + ')' : 'empty'}`;
      div.onclick = () => openPicker(role);
      container.appendChild(div);
    }
  }
  $('btn-sim').disabled = !isRosterComplete(assignments);
}

function openPicker(role) {
  const modal = $('picker-modal');
  const list = $('picker-list');
  $('picker-title').textContent = 'Pick ' + role.label;
  list.innerHTML = '';
  const candidates = allPlayers.filter(p => role.pos.includes(p.position));
  if (!candidates.length) {
    list.textContent = 'No players of this position. Generate more.';
  } else {
    for (const p of candidates.slice(0, 40)) {
      const row = document.createElement('div');
      row.className = 'player-row';
      row.innerHTML = `<span>${p.name} <small>(${p.position} C${p.contact} P${p.power})</small></span>`;
      const btn = document.createElement('button');
      btn.textContent = 'Assign';
      btn.onclick = async () => {
        await dao.assignPlayer(currentTeam.id, p.id, role.id);
        assignments[role.id] = p;
        modal.classList.add('hidden');
        renderSlots();
      };
      row.appendChild(btn);
      list.appendChild(row);
    }
  }
  modal.classList.remove('hidden');
}

async function loadRoster(teamId) {
  const rows = await dao.teamPlayers(teamId);
  assignments = {};
  for (const row of rows) {
    if (row.expand && row.expand.player) {
      assignments[row.role] = row.expand.player;
    }
  }
  renderSlots();
}

function showResult(res, homeName, awayName) {
  const panel = $('result-panel');
  const out = $('result');
  panel.hidden = false;
  out.textContent = [
    `${homeName} ${res.homeRuns} — ${awayName} ${res.awayRuns}`,
    `Winner: ${res.winner === 'tie' ? 'Tie' : res.winner === 'home' ? homeName : awayName}`,
    '',
    ...res.events
  ].join('\n');
}

// events
$('btn-settings').onclick = () => {
  $('pb-url').value = getPbUrl();
  $('settings-modal').classList.remove('hidden');
};
$('btn-close-settings').onclick = () => $('settings-modal').classList.add('hidden');
$('btn-save-url').onclick = () => {
  const url = $('pb-url').value.trim();
  if (url) {
    setPbUrl(url);
    status('Connected to ' + url);
    $('settings-modal').classList.add('hidden');
    refreshPoolCount();
    loadTeams();
  }
};
$('btn-close-picker').onclick = () => $('picker-modal').classList.add('hidden');

$('btn-generate').onclick = async () => {
  status('Generating…');
  try {
    await generatePool(dao, 180);
    await refreshPoolCount();
    status('Pool ready');
  } catch (e) {
    status('Error: ' + e.message);
  }
};

$('btn-create-team').onclick = async () => {
  const name = $('team-name').value.trim();
  if (!name) return;
  await dao.createTeam(name);
  $('team-name').value = '';
  await loadTeams();
};

$('team-select').onchange = async () => {
  const id = $('team-select').value;
  if (!id) {
    $('roster-panel').hidden = true;
    return;
  }
  const teams = await dao.teams();
  currentTeam = teams.find(t => t.id === id);
  $('roster-team-name').textContent = currentTeam.name;
  $('roster-panel').hidden = false;
  await loadRoster(id);
  await refreshPoolCount();
};

$('btn-sim').onclick = async () => {
  const oppId = $('opp-select').value;
  if (!oppId || oppId === currentTeam.id) {
    alert('Pick a different opponent');
    return;
  }
  const oppRows = await dao.teamPlayers(oppId);
  const oppAssign = {};
  for (const row of oppRows) {
    if (row.expand && row.expand.player) oppAssign[row.role] = row.expand.player;
  }
  if (!isRosterComplete(oppAssign)) {
    alert('Opponent roster is incomplete');
    return;
  }
  const res = simulateGame(assignments, oppAssign);
  const teams = await dao.teams();
  const opp = teams.find(t => t.id === oppId);
  showResult(res, currentTeam.name, opp.name);
};

// --- season UI ---
let currentSeason = null;

async function loadSeasons() {
  const list = await dao.seasons();
  const sel = $('season-select');
  sel.innerHTML = '<option value="">Select season…</option>';
  for (const s of list) {
    const o = document.createElement('option');
    o.value = s.id;
    o.textContent = s.name + ' (' + s.status + ')';
    sel.appendChild(o);
  }
}

async function renderSeason() {
  if (!currentSeason) {
    $('season-info').innerHTML = '';
    $('season-actions').innerHTML = '';
    $('standings').innerHTML = '';
    $('offers').innerHTML = '';
    return;
  }
  const s = currentSeason;
  $('season-info').innerHTML = `<span class="phase-badge">${s.status}</span> Round ${s.current_round || 1}`;

  const actions = $('season-actions');
  actions.innerHTML = '';
  if (s.status === 'preseason' || s.status === 'allstar') {
    const btnClose = document.createElement('button');
    btnClose.textContent = 'Close Window & Sim Half';
    btnClose.className = 'primary';
    btnClose.onclick = closeWindowAndSim;
    actions.appendChild(btnClose);
    const btnClaim = document.createElement('button');
    btnClaim.textContent = 'Claim Free Agent';
    btnClaim.onclick = openFaClaim;
    actions.appendChild(btnClaim);
  } else if (s.status === 'first_half' || s.status === 'second_half') {
    const btnSim = document.createElement('button');
    btnSim.textContent = 'Sim Remaining Games';
    btnSim.className = 'primary';
    btnSim.onclick = async () => {
      const half = s.status === 'first_half' ? 1 : 2;
      await simHalf(dao, s.id, half);
      const next = half === 1 ? 'allstar' : 'complete';
      await dao.updateSeason(s.id, { status: next, current_round: 1 });
      currentSeason = { ...s, status: next };
      await renderSeason();
    };
    actions.appendChild(btnSim);
  }

  const standings = await dao.seasonTeams(s.id);
  let html = '<h3>Standings</h3>';
  for (const st of standings) {
    const name = st.expand?.team?.name || st.team;
    html += `<div class="standings-row">${name}: ${st.wins || 0}-${st.losses || 0}</div>`;
  }
  $('standings').innerHTML = html;

  const offers = await dao.tradeOffers(s.id);
  let ohtml = '<h3>Trade Offers</h3>';
  if (!offers.length) ohtml += '<div>None</div>';
  for (const o of offers) {
    const from = o.expand?.from_team?.name || o.from_team;
    const to = o.expand?.to_team?.name || o.to_team;
    const pout = o.expand?.player_out?.name || o.player_out;
    const pin = o.expand?.player_in?.name || o.player_in;
    ohtml += `<div class="offer-row">${from} offers ${pout} for ${pin} from ${to} — ${o.status}</div>`;
  }
  $('offers').innerHTML = ohtml;
}

async function closeWindowAndSim() {
  if (!currentSeason) return;
  const half = currentSeason.status === 'preseason' ? 1 : 2;
  if (currentSeason.status === 'preseason') {
    await generateSchedule(dao, currentSeason.id);
  }
  await simHalf(dao, currentSeason.id, half);
  const next = half === 1 ? 'allstar' : 'complete';
  await dao.updateSeason(currentSeason.id, { status: next, current_round: 1 });
  currentSeason = { ...currentSeason, status: next };
  await renderSeason();
}

async function openFaClaim() {
  if (!currentTeam || !currentSeason) {
    alert('Select a team first');
    return;
  }
  const fa = await dao.freeAgents();
  if (!fa.length) {
    alert('No free agents');
    return;
  }
  const pick = fa[0];
  const ok = await claimFreeAgent(dao, currentSeason.id, currentTeam.id, pick.id);
  alert(ok ? 'Claimed ' + pick.name : 'Failed');
  await renderSeason();
}

$('btn-start-season').onclick = async () => {
  const name = $('season-name').value.trim() || 'Season ' + new Date().getFullYear();
  const teams = await dao.teams();
  if (teams.length < 2) {
    alert('Need at least 2 teams');
    return;
  }
  const season = await startSeason(dao, name, teams.map(t => t.id));
  $('season-name').value = '';
  await loadSeasons();
  currentSeason = season;
  $('season-select').value = season.id;
  await renderSeason();
};

$('season-select').onchange = async () => {
  const id = $('season-select').value;
  if (!id) {
    currentSeason = null;
    await renderSeason();
    return;
  }
  const list = await dao.seasons();
  currentSeason = list.find(s => s.id === id);
  await renderSeason();
};

// boot
if (getPbUrl()) {
  status('URL set — ready');
  refreshPoolCount();
  loadTeams();
  loadSeasons();
}
