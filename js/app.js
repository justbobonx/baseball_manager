// Page wiring: pool, team building, exhibition and season screens.

const APP_PICKER_LIMIT = 60;
const APP_SCHEDULE_LIMIT = 40;
const APP_SIM_DAY_GAMES = 1;

const $ = (id) => document.getElementById(id);

let currentTeam = null;
let currentRoster = {};
let currentSeason = null;
let rosterLocked = false;
let pickerSlot = null;

function setStatus(msg) {
  $('pb-status').textContent = msg;
}

// Runs a UI action and shows its failure instead of leaving a silent rejected promise.
async function guarded(action) {
  try {
    await action();
  } catch (e) {
    setStatus('Error: ' + e.message);
    alert(e.message);
  }
}

// Plain-text box score, used both for exhibitions and stored season games.
function renderBoxScore(box) {
  const pad = (value, width) => String(value).padStart(width);
  const lines = [];
  lines.push('Team'.padEnd(18) + box.away.linescore.map((_, i) => pad(i + 1, 3)).join('') + '   R  H  E');
  for (const side of [box.away, box.home]) {
    lines.push(side.name.slice(0, 17).padEnd(18) + side.linescore.map(r => pad(r, 3)).join('') +
      ' ' + pad(side.runs, 3) + pad(side.hits, 3) + pad(side.errors, 3));
  }
  if (box.walk_off) lines.push('Walk-off win');
  for (const side of [box.away, box.home]) {
    lines.push('', side.name + ' batting', 'Player'.padEnd(22) + 'Pos  AB  R  H 2B 3B HR RBI BB  K');
    for (const b of side.batting) {
      lines.push(b.name.slice(0, 21).padEnd(22) + b.pos.padEnd(3) + pad(b.ab, 4) + pad(b.r, 3) + pad(b.h, 3) +
        pad(b.d, 3) + pad(b.t, 3) + pad(b.hr, 3) + pad(b.rbi, 4) + pad(b.bb, 3) + pad(b.k, 3));
    }
    lines.push('', side.name + ' pitching', 'Pitcher'.padEnd(22) + '   IP  H  R ER BB  K HR   PC');
    for (const p of side.pitching) {
      lines.push((p.name + (p.decision ? ' (' + p.decision + ')' : '')).slice(0, 21).padEnd(22) +
        pad(Math.floor(p.outs / 3) + '.' + (p.outs % 3), 5) + pad(p.h, 3) + pad(p.r, 3) + pad(p.er, 3) +
        pad(p.bb, 3) + pad(p.k, 3) + pad(p.hr, 3) + pad(p.pitches, 5));
    }
  }
  const div = document.createElement('div');
  div.className = 'box';
  div.textContent = lines.join('\n');
  return div;
}

async function refreshPool() {
  $('pool-count').textContent = (await dao.players()).length + ' players in pool';
}

async function loadTeams() {
  const teams = await dao.teams();
  for (const id of ['team-select', 'exh-away', 'exh-home']) {
    const select = $(id);
    const keep = select.value;
    select.innerHTML = `<option value="">${id === 'team-select' ? 'Select team…' : (id === 'exh-away' ? 'Away…' : 'Home…')}</option>`;
    for (const t of teams) {
      const option = document.createElement('option');
      option.value = t.id;
      option.textContent = t.name;
      select.appendChild(option);
    }
    select.value = keep;
  }
}

// Draws the roster grid grouped by slot group, with a batting spot chooser on field slots.
// Roster edits are locked while the team is in the middle of a season half.
async function loadRoster() {
  currentRoster = rosterBySlot(await dao.teamPlayers(currentTeam.id));
  rosterLocked = false;
  if (currentSeason && (currentSeason.phase === 'first_half' || currentSeason.phase === 'second_half')) {
    rosterLocked = (await dao.seasonTeams(currentSeason.id)).some(st => st.team === currentTeam.id);
  }
  $('roster-lock').innerHTML = rosterLocked ? '<span class="locked">locked during season half</span>'
    : (isRosterComplete(currentRoster) ? '' : '<span class="locked">incomplete</span>');
  $('btn-auto-draft').disabled = rosterLocked;
  $('btn-auto-order').disabled = rosterLocked;

  const container = $('slots');
  container.innerHTML = '';
  let group = '';
  for (const slot of ROSTER_SLOTS) {
    if (slot.group !== group) {
      group = slot.group;
      const heading = document.createElement('h3');
      heading.className = 'slot-group';
      heading.textContent = group + (group === 'Bench' ? ' (optional)' : '');
      container.appendChild(heading);
    }
    const row = currentRoster[slot.id];
    const div = document.createElement('div');
    div.className = 'slot' + (row ? ' filled' : '');
    if (row) {
      const p = row.expand.player;
      const g = playerGrades(p);
      div.innerHTML = `<strong>${slot.id} · ${slot.label}</strong>${p.name} (${p.handedness})<br>` +
        `<small>${slot.area} ${Math.round(g[slot.area])} · hit ${Math.round(g.hitting)}</small>`;
      if (slot.kind === 'field') {
        const order = document.createElement('select');
        order.disabled = rosterLocked;
        for (let spot = 0; spot <= 9; spot++) {
          const option = document.createElement('option');
          option.value = spot;
          option.textContent = spot ? 'Bats ' + spot : 'Bats —';
          order.appendChild(option);
        }
        order.value = row.batting_order || 0;
        order.onclick = (e) => e.stopPropagation();
        order.onchange = () => guarded(async () => {
          await dao.setBattingOrder(row.id, Number(order.value));
          row.batting_order = Number(order.value);
        });
        div.appendChild(document.createElement('br'));
        div.appendChild(order);
      }
    } else {
      div.innerHTML = `<strong>${slot.id} · ${slot.label}</strong>empty`;
    }
    div.onclick = () => { if (!rosterLocked) guarded(() => openPicker(slot)); };
    container.appendChild(div);
  }
}

// Lists free agents best-first by how well they suit the slot, plus this team's own
// players so they can be moved between slots.
async function openPicker(slot) {
  pickerSlot = slot;
  $('picker-title').textContent = 'Pick ' + slot.label;
  $('btn-release').disabled = !currentRoster[slot.id];
  const list = $('picker-list');
  list.innerHTML = 'Loading…';
  $('picker-modal').classList.remove('hidden');
  const own = Object.values(currentRoster).filter(row => row.position !== slot.id).map(row => ({ player: row.expand.player, from: row.position }));
  const candidates = own.concat((await dao.freeAgents()).map(player => ({ player, from: '' })));
  candidates.sort((a, b) => slotDraftScore(slot, b.player) - slotDraftScore(slot, a.player));
  list.innerHTML = '';
  for (const candidate of candidates.slice(0, APP_PICKER_LIMIT)) {
    const p = candidate.player;
    const g = playerGrades(p);
    const row = document.createElement('div');
    row.className = 'player-row';
    row.innerHTML = `<span>${p.name} (${p.handedness})${candidate.from ? ' — now ' + candidate.from : ''}<br><small>` +
      `${slot.area} ${Math.round(g[slot.area])} · hit ${Math.round(g.hitting)} · E${p.eye} P${p.power} A${p.arm} G${p.glove} Ac${p.accuracy}</small></span>`;
    const button = document.createElement('button');
    button.textContent = 'Assign';
    button.onclick = () => guarded(async () => {
      if (candidate.from) await dao.assignSlot(currentTeam.id, p.id, slot.id, slot.kind === 'field' ? currentRoster[candidate.from].batting_order || 0 : 0);
      else await claimFreeAgent(dao, currentSeason, currentTeam.id, p.id, slot.id);
      $('picker-modal').classList.add('hidden');
      await loadRoster();
    });
    row.appendChild(button);
    list.appendChild(row);
  }
}

async function loadSeasons() {
  const seasons = await dao.seasons();
  const select = $('season-select');
  select.innerHTML = '<option value="">Select season…</option>';
  for (const s of seasons) {
    const option = document.createElement('option');
    option.value = s.id;
    option.textContent = s.name + ' (' + s.phase + ')' + (s.current ? ' *' : '');
    select.appendChild(option);
  }
  if (!currentSeason) currentSeason = seasons.find(s => s.current) || null;
  select.value = currentSeason ? currentSeason.id : '';
}

// Season view: phase controls, standings, and the schedule with clickable box scores.
async function renderSeason() {
  for (const id of ['season-info', 'season-actions', 'standings', 'schedule', 'season-box']) $(id).innerHTML = '';
  if (!currentSeason) return;
  const s = currentSeason;
  const games = await dao.games(s.id);
  const half = s.phase === 'first_half' ? 1 : (s.phase === 'second_half' ? 2 : 0);
  const remaining = games.filter(g => g.half === half && !g.played).length;
  $('season-info').innerHTML = `<span class="phase-badge">${s.phase}</span> ` +
    `${games.filter(g => g.played).length} of ${games.length} games played` +
    (s.phase === 'preseason' || s.phase === 'allstar' ? ' — rosters open for free-agent claims' : '');

  const actions = $('season-actions');
  const addAction = (label, primary, run) => {
    const button = document.createElement('button');
    button.textContent = label;
    if (primary) button.className = 'primary';
    button.onclick = () => guarded(async () => {
      button.disabled = true;
      setStatus(label + '…');
      await run();
      currentSeason = (await dao.seasons()).find(x => x.id === s.id);
      await loadSeasons();
      await renderSeason();
      if (currentTeam) await loadRoster();
      setStatus('Ready');
    });
    actions.appendChild(button);
  };
  if (s.phase === 'preseason') addAction('Start First Half', true, () => advancePhase(dao, s));
  if (s.phase === 'allstar') addAction('Start Second Half', true, () => advancePhase(dao, s));
  if (half && remaining) {
    addAction('Sim Next Game', false, () => simSeasonGames(dao, s, APP_SIM_DAY_GAMES));
    addAction('Sim Rest of Half', true, () => simSeasonGames(dao, s, Infinity));
  }
  if (half && !remaining) addAction(half === 1 ? 'Go to All-Star Break' : 'Finish Season', true, () => advancePhase(dao, s));

  const standings = await dao.seasonTeams(s.id);
  standings.sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses) || b.wins - a.wins);
  const leader = standings[0];
  let html = '<h3>Standings</h3>';
  for (const st of standings) {
    const gamesBack = ((leader.wins - st.wins) + (st.losses - leader.losses)) / 2;
    html += `<div class="standings-row">${st.expand.team.name}: ${st.wins || 0}-${st.losses || 0}` +
      `${gamesBack > 0 ? ' · ' + gamesBack + ' GB' : ''}</div>`;
  }
  $('standings').innerHTML = html;

  const names = {};
  for (const st of standings) names[st.team] = st.expand.team.name;
  const schedule = $('schedule');
  schedule.innerHTML = '<h3>Recent and upcoming games</h3>';
  const firstUnplayed = games.findIndex(g => !g.played);
  const start = Math.max(0, (firstUnplayed === -1 ? games.length : firstUnplayed) - APP_SCHEDULE_LIMIT / 2);
  for (const game of games.slice(start, start + APP_SCHEDULE_LIMIT)) {
    const row = document.createElement('div');
    row.className = 'game-row' + (game.played ? '' : ' unplayed');
    row.textContent = `#${game.game_number} (half ${game.half}) ${names[game.away_team]} ` +
      (game.played ? `${game.away_score} at ${names[game.home_team]} ${game.home_score}` +
        (game.box_score && game.box_score.innings > 9 ? ` (${game.box_score.innings})` : '') : `at ${names[game.home_team]}`);
    if (game.played && game.box_score) {
      row.onclick = () => {
        $('season-box').innerHTML = '';
        $('season-box').appendChild(renderBoxScore(game.box_score));
      };
    }
    schedule.appendChild(row);
  }
}

// --- events ---
$('btn-settings').onclick = () => {
  $('pb-url').value = dao.getUrl();
  $('settings-modal').classList.remove('hidden');
};
$('btn-close-settings').onclick = () => $('settings-modal').classList.add('hidden');
$('btn-save-url').onclick = () => guarded(async () => {
  const url = $('pb-url').value.trim();
  if (!url) return;
  dao.setUrl(url);
  $('settings-modal').classList.add('hidden');
  await boot();
});
$('btn-close-picker').onclick = () => $('picker-modal').classList.add('hidden');
$('btn-release').onclick = () => guarded(async () => {
  await dao.releaseSlot(currentRoster[pickerSlot.id].id);
  $('picker-modal').classList.add('hidden');
  await loadRoster();
});

$('btn-generate').onclick = () => guarded(async () => {
  const made = await generatePool(dao, (done, total) => setStatus(`Saving players ${done}/${total}…`));
  await refreshPool();
  setStatus(`Added ${made} players`);
});

$('btn-create-team').onclick = () => guarded(async () => {
  const name = $('team-name').value.trim();
  if (!name) return;
  const team = await dao.createTeam(name);
  $('team-name').value = '';
  await loadTeams();
  $('team-select').value = team.id;
  $('team-select').onchange();
});

$('team-select').onchange = () => guarded(async () => {
  const id = $('team-select').value;
  $('roster-panel').hidden = !id;
  if (!id) { currentTeam = null; return; }
  currentTeam = (await dao.teams()).find(t => t.id === id);
  $('roster-team-name').textContent = currentTeam.name;
  await loadRoster();
});

$('btn-auto-draft').onclick = () => guarded(async () => {
  setStatus('Drafting…');
  await autoDraftTeam(dao, currentTeam.id);
  await loadRoster();
  await refreshPool();
  setStatus('Ready');
});

$('btn-auto-order').onclick = () => guarded(async () => {
  await autoBattingOrder(dao, currentRoster);
  await loadRoster();
});

// Exhibitions are never stored and always use each team's first starter.
$('btn-exhibition').onclick = () => guarded(async () => {
  const awayId = $('exh-away').value;
  const homeId = $('exh-home').value;
  if (!awayId || !homeId || awayId === homeId) throw new Error('Pick two different teams');
  const teams = await dao.teams();
  const awayRoster = rosterBySlot(await dao.teamPlayers(awayId));
  const homeRoster = rosterBySlot(await dao.teamPlayers(homeId));
  if (!isRosterComplete(awayRoster) || !isRosterComplete(homeRoster)) throw new Error('Both rosters must be complete');
  const result = simulateGame(
    buildGameTeam(teams.find(t => t.id === awayId), awayRoster, 0),
    buildGameTeam(teams.find(t => t.id === homeId), homeRoster, 0),
    true);
  const out = $('exhibition-result');
  out.innerHTML = '';
  out.appendChild(renderBoxScore(result.box));
  const log = document.createElement('div');
  log.className = 'log';
  log.textContent = result.log.join('\n');
  out.appendChild(log);
});

$('btn-start-season').onclick = () => guarded(async () => {
  const season = await startSeason(dao, $('season-name').value.trim() || 'Season ' + new Date().getFullYear());
  $('season-name').value = '';
  currentSeason = season;
  await loadSeasons();
  await renderSeason();
});

$('season-select').onchange = () => guarded(async () => {
  const id = $('season-select').value;
  currentSeason = id ? (await dao.seasons()).find(s => s.id === id) : null;
  await renderSeason();
  if (currentTeam) await loadRoster();
});

async function boot() {
  setStatus('Connecting…');
  await refreshPool();
  await loadTeams();
  await loadSeasons();
  await renderSeason();
  setStatus('Connected to ' + dao.getUrl());
}

if (dao.getUrl()) guarded(boot);
