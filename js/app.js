// Page wiring: pool, team building, exhibition and season screens.

const APP_PICKER_LIMIT = 60;
const APP_SCHEDULE_LIMIT = 40;
const APP_SIM_DAY_GAMES = 1;

// Where each fielder's card sits on the drawn field, as across and down percentages
// of the field box, measured to the middle of the card.
const FIELD_SPOTS = {
  C:   [50, 88],
  '1B': [74, 62],
  '2B': [62, 44],
  SS:  [38, 44],
  '3B': [26, 62],
  LF:  [18, 26],
  CF:  [50, 13],
  RF:  [82, 26]
};

// Colours of the drawn ballpark.
const FIELD_STANDS_COLOR = '#14532d';
const FIELD_GRASS_COLOR = '#2e8b3e';
const FIELD_INFIELD_GRASS_COLOR = '#3fa34d';
const FIELD_DIRT_COLOR = '#c8915a';
const FIELD_LINE_COLOR = '#ffffff';

// Grade colour stops mixed in hue, so yellow goes to green without sliding through blue.
const GRADE_BAR_EMPTY_COLOR = '#4a5560';
const GRADE_COLOR_STOPS = [
  [0, '#6b1010'],
  [30, '#cc0000'],
  [60, '#dddd00'],
  [100, '#00cc00']
];

// Short headers and ability labels for the six picker columns.
const PICKER_COL_HITTING = { key: 'hitting', header: 'HIT', attrs: [['P', 'power'], ['E', 'eye']] };
const PICKER_COL_INFIELD = { key: 'infield', header: 'IF', attrs: [['G', 'glove'], ['R', 'range']] };
const PICKER_COL_OUTFIELD = { key: 'outfield', header: 'OF', attrs: [['R', 'range'], ['A', 'arm']] };
const PICKER_COL_CATCHING = { key: 'catching', header: 'C', attrs: [['A', 'arm'], ['G', 'glove']] };
const PICKER_COL_PITCHING = { key: 'pitching', header: 'P', attrs: [['C', 'command'], ['V', 'velocity']] };
const PICKER_COL_SPEED = { key: 'speed', header: 'SP', attrs: [['S', 'speed']] };

const $ = (id) => document.getElementById(id);

// Colour for a 0–100 rating, shared by picker bars and roster cards.
// Mixes hue, saturation and lightness so neighbouring colours stay on the short path around the wheel.
function gradeColor(value) {
  const n = Math.max(0, Math.min(100, Number(value) || 0));
  const toHsl = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const high = Math.max(r, g, b);
    const low = Math.min(r, g, b);
    const light = (high + low) / 2;
    if (high === low) return [0, 0, light];
    const span = high - low;
    const sat = light > 0.5 ? span / (2 - high - low) : span / (high + low);
    let hue;
    if (high === r) hue = (g - b) / span + (g < b ? 6 : 0);
    else if (high === g) hue = (b - r) / span + 2;
    else hue = (r - g) / span + 4;
    return [hue * 60, sat, light];
  };
  const fromHsl = (hue, sat, light) => {
    const wrap = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    let r, g, b;
    if (sat === 0) {
      r = g = b = light;
    } else {
      const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
      const p = 2 * light - q;
      const hn = hue / 360;
      r = wrap(p, q, hn + 1 / 3);
      g = wrap(p, q, hn);
      b = wrap(p, q, hn - 1 / 3);
    }
    return '#' + [r, g, b].map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('');
  };
  for (let i = 1; i < GRADE_COLOR_STOPS.length; i++) {
    if (n <= GRADE_COLOR_STOPS[i][0]) {
      const lo = GRADE_COLOR_STOPS[i - 1];
      const hi = GRADE_COLOR_STOPS[i];
      const amount = (n - lo[0]) / (hi[0] - lo[0]);
      const from = toHsl(lo[1]);
      const to = toHsl(hi[1]);
      let hueDelta = to[0] - from[0];
      if (hueDelta > 180) hueDelta -= 360;
      if (hueDelta < -180) hueDelta += 360;
      let hue = from[0] + hueDelta * amount;
      if (hue < 0) hue += 360;
      if (hue >= 360) hue -= 360;
      return fromHsl(hue, from[1] + (to[1] - from[1]) * amount, from[2] + (to[2] - from[2]) * amount);
    }
  }
  return GRADE_COLOR_AT_100;
}

// One horizontal fill bar. Size class picks the picker grade, picker attribute, or card style.
function ratingBarHtml(value, sizeClass) {
  const fill = Math.max(0, Math.min(100, Number(value) || 0));
  return `<span class="rating-bar ${sizeClass}" style="background:${GRADE_BAR_EMPTY_COLOR}"><span class="rating-fill" style="width:${fill}%;background:${gradeColor(fill)}"></span></span>`;
}

// Which of the six columns a picker shows, and in what left-to-right order, for this slot.
function pickerColumnsForSlot(slot) {
  if (slot.kind !== 'field' && slot.kind !== 'bench') {
    return [PICKER_COL_PITCHING, PICKER_COL_HITTING, PICKER_COL_INFIELD, PICKER_COL_OUTFIELD, PICKER_COL_CATCHING, PICKER_COL_SPEED];
  }
  if (slot.kind === 'bench') {
    return [PICKER_COL_HITTING, PICKER_COL_INFIELD, PICKER_COL_OUTFIELD, PICKER_COL_CATCHING, PICKER_COL_PITCHING, PICKER_COL_SPEED];
  }
  if (slot.id === 'C') {
    return [PICKER_COL_HITTING, PICKER_COL_CATCHING, PICKER_COL_INFIELD, PICKER_COL_OUTFIELD, PICKER_COL_PITCHING, PICKER_COL_SPEED];
  }
  if (slot.area === 'outfield') {
    return [PICKER_COL_HITTING, PICKER_COL_OUTFIELD, PICKER_COL_INFIELD, PICKER_COL_CATCHING, PICKER_COL_PITCHING, PICKER_COL_SPEED];
  }
  return [PICKER_COL_HITTING, PICKER_COL_INFIELD, PICKER_COL_OUTFIELD, PICKER_COL_CATCHING, PICKER_COL_PITCHING, PICKER_COL_SPEED];
}

// Numeric value for one picker column (grades, or Speed itself).
function pickerColumnValue(player, column) {
  return column.key === 'speed' ? player.speed : playerGrades(player)[column.key];
}

// Compact H / OF / SP (etc.) line used on roster cards, with small underscore bars under each number.
function cardRatingsHtml(slot, player) {
  const grades = playerGrades(player);
  const items = [];
  if (slot.kind !== 'field' && slot.kind !== 'bench') {
    items.push(['P', Math.round(grades.pitching)]);
    items.push(['H', Math.round(grades.hitting)]);
  } else if (slot.kind === 'bench') {
    items.push(['H', Math.round(grades.hitting)]);
    const best = [['IF', grades.infield], ['OF', grades.outfield], ['C', grades.catching]]
      .sort((a, b) => b[1] - a[1])[0];
    items.push([best[0], Math.round(best[1])]);
  } else if (slot.id === 'C') {
    items.push(['H', Math.round(grades.hitting)]);
    items.push(['C', Math.round(grades.catching)]);
  } else if (slot.area === 'outfield') {
    items.push(['H', Math.round(grades.hitting)]);
    items.push(['OF', Math.round(grades.outfield)]);
  } else {
    items.push(['H', Math.round(grades.hitting)]);
    items.push(['IF', Math.round(grades.infield)]);
  }
  items.push(['SP', Math.round(player.speed)]);
  return items.map(([label, value]) =>
    `<span class="card-stat"><span class="card-stat-text">${label}${value}</span>${ratingBarHtml(value, 'bar-card')}</span>`
  ).join('');
}

// Six-column grade + attribute block for one picker candidate.
function pickerStatsHtml(player, columns) {
  return `<div class="picker-stats">` + columns.map(column => {
    const grade = pickerColumnValue(player, column);
    const attrHtml = column.attrs.map(([label, field]) =>
      `<span class="picker-attr"><span class="picker-attr-text">${label}${player[field]}</span>${ratingBarHtml(player[field], 'bar-attr')}</span>`
    ).join('');
    return `<div class="picker-col">` +
      `<div class="picker-grade"><span class="picker-grade-label">${column.header}</span>${ratingBarHtml(grade, 'bar-grade')}</div>` +
      `<div class="picker-attrs">${attrHtml}</div></div>`;
  }).join('') + `</div>`;
}

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
    lines.push('', side.name + ' batting', 'Player'.padEnd(22) + 'Pos  AB  R  H 2B 3B HR RBI BB  K SB CS');
    for (const b of side.batting) {
      lines.push(b.name.slice(0, 21).padEnd(22) + b.pos.padEnd(3) + pad(b.ab, 4) + pad(b.r, 3) + pad(b.h, 3) +
        pad(b.d, 3) + pad(b.t, 3) + pad(b.hr, 3) + pad(b.rbi, 4) + pad(b.bb, 3) + pad(b.k, 3) +
        pad(b.sb || 0, 3) + pad(b.cs || 0, 3));
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

// Draws the roster as a ballpark: fielders stand on their spots on a drawn diamond, the bench
// waits down the right side, and the rotation and bullpen line up in rows beneath the field.
// Field slots carry a batting spot chooser.
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
  container.innerHTML = `<div class="park"><div class="field">` +
    `<svg class="field-art" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">` +
    `<rect width="100" height="100" fill="${FIELD_STANDS_COLOR}"/>` +
    `<path d="M50 98 L2 50 A68 68 0 0 1 98 50 Z" fill="${FIELD_GRASS_COLOR}"/>` +
    `<path d="M50 96 L24 70 L50 44 L76 70 Z" fill="${FIELD_DIRT_COLOR}"/>` +
    `<path d="M50 90 L31 71 L50 52 L69 71 Z" fill="${FIELD_INFIELD_GRASS_COLOR}"/>` +
    `<path d="M50 98 L2 50 M50 98 L98 50" stroke="${FIELD_LINE_COLOR}" stroke-width="0.5"/>` +
    `<circle cx="50" cy="71" r="3" fill="${FIELD_DIRT_COLOR}"/>` +
    `<rect x="49" y="70.4" width="2" height="0.8" fill="${FIELD_LINE_COLOR}"/>` +
    `<rect x="48.5" y="91" width="3" height="3" fill="${FIELD_LINE_COLOR}"/>` +
    `<rect x="67.5" y="69.5" width="3" height="3" fill="${FIELD_LINE_COLOR}" transform="rotate(45 69 71)"/>` +
    `<rect x="48.5" y="50.5" width="3" height="3" fill="${FIELD_LINE_COLOR}" transform="rotate(45 50 52)"/>` +
    `<rect x="29.5" y="69.5" width="3" height="3" fill="${FIELD_LINE_COLOR}" transform="rotate(45 31 71)"/>` +
    `</svg></div><div class="bench"><h3 class="slot-group">Bench (optional)</h3></div></div>` +
    `<h3 class="slot-group">Rotation</h3><div class="slot-row rotation"></div>` +
    `<h3 class="slot-group">Bullpen</h3><div class="slot-row bullpen"></div>`;
  for (const slot of ROSTER_SLOTS) {
    const row = currentRoster[slot.id];
    const div = document.createElement('div');
    div.className = 'slot' + (row ? ' filled' : '');
    if (row) {
      const p = row.expand.player;
      div.innerHTML = `<strong>${slot.id} · ${slot.label}</strong>` +
        `<div class="card-name">${p.name} (${p.handedness})</div>` +
        `<div class="card-ratings">${cardRatingsHtml(slot, p)}</div>`;
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
    // Fielders are pinned over their spot on the drawing, centred on that point;
    // everyone else joins the strip for their group.
    if (slot.kind === 'field') {
      div.classList.add('on-field');
      div.style.left = FIELD_SPOTS[slot.id][0] + '%';
      div.style.top = FIELD_SPOTS[slot.id][1] + '%';
      container.querySelector('.field').appendChild(div);
    } else {
      container.querySelector({ Rotation: '.rotation', Bullpen: '.bullpen', Bench: '.bench' }[slot.group]).appendChild(div);
    }
  }
}

// Lists free agents and this team's own players from other slots, sorted by the
// displayed grade columns for this pick (later columns only break ties).
async function openPicker(slot) {
  pickerSlot = slot;
  $('picker-title').textContent = 'Pick ' + slot.label;
  $('btn-release').disabled = !currentRoster[slot.id];
  const list = $('picker-list');
  list.innerHTML = 'Loading…';
  $('picker-modal').classList.remove('hidden');
  const columns = pickerColumnsForSlot(slot);
  const own = Object.values(currentRoster).filter(row => row.position !== slot.id).map(row => ({ player: row.expand.player, from: row.position }));
  const candidates = own.concat((await dao.freeAgents()).map(player => ({ player, from: '' })));
  // Sort by the same column order the row displays, later columns only break ties.
  candidates.sort((a, b) => {
    for (const column of columns) {
      const diff = pickerColumnValue(b.player, column) - pickerColumnValue(a.player, column);
      if (diff) return diff;
    }
    return 0;
  });
  list.innerHTML = '';
  for (const candidate of candidates.slice(0, APP_PICKER_LIMIT)) {
    const p = candidate.player;
    const row = document.createElement('div');
    row.className = 'player-row';
    const body = document.createElement('div');
    body.className = 'picker-body';
    body.innerHTML = `<div class="picker-name"><span>${p.name} (${p.handedness})` +
      (candidate.from ? ` <span class="picker-from">[${candidate.from}]</span>` : '') +
      `</span></div>` + pickerStatsHtml(p, columns);
    row.appendChild(body);
    const button = document.createElement('button');
    button.textContent = 'Assign';
    button.onclick = () => guarded(async () => {
      if (candidate.from) await dao.assignSlot(currentTeam.id, p.id, slot.id, slot.kind === 'field' ? currentRoster[candidate.from].batting_order || 0 : 0);
      else await claimFreeAgent(dao, currentSeason, currentTeam.id, p.id, slot.id);
      $('picker-modal').classList.add('hidden');
      await loadRoster();
    });
    body.querySelector('.picker-name').appendChild(button);
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
