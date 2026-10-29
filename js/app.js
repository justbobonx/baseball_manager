// app.js — main UI and wiring

import { dao, setPbUrl, getPbUrl } from './dao.js';
import { generatePool } from './generator.js';
import { ROLES, isRosterComplete } from './team.js';
import { simulateGame } from './sim.js';

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

// boot
if (getPbUrl()) {
  status('URL set — ready');
  refreshPoolCount();
  loadTeams();
}
