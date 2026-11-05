// Roster slots stored in the team roster table, roster assembly for a game,
// and the auto-draft that fills empty slots from free agents.

// Every slot a team can fill. Each one is a value of the roster position choice list.
// Kind tells the game which job the slot does; area is the fielding grade it is judged by.
const ROSTER_SLOTS = [
  { id: 'C',   label: 'Catcher',      group: 'Field',    kind: 'field',    area: 'catching' },
  { id: '1B',  label: 'First Base',   group: 'Field',    kind: 'field',    area: 'infield' },
  { id: '2B',  label: 'Second Base',  group: 'Field',    kind: 'field',    area: 'infield' },
  { id: '3B',  label: 'Third Base',   group: 'Field',    kind: 'field',    area: 'infield' },
  { id: 'SS',  label: 'Shortstop',    group: 'Field',    kind: 'field',    area: 'infield' },
  { id: 'LF',  label: 'Left Field',   group: 'Field',    kind: 'field',    area: 'outfield' },
  { id: 'CF',  label: 'Center Field', group: 'Field',    kind: 'field',    area: 'outfield' },
  { id: 'RF',  label: 'Right Field',  group: 'Field',    kind: 'field',    area: 'outfield' },
  { id: 'SP1', label: 'Starter 1',    group: 'Rotation', kind: 'rotation', area: 'pitching' },
  { id: 'SP2', label: 'Starter 2',    group: 'Rotation', kind: 'rotation', area: 'pitching' },
  { id: 'SP3', label: 'Starter 3',    group: 'Rotation', kind: 'rotation', area: 'pitching' },
  { id: 'SP4', label: 'Starter 4',    group: 'Rotation', kind: 'rotation', area: 'pitching' },
  { id: 'SP5', label: 'Starter 5',    group: 'Rotation', kind: 'rotation', area: 'pitching' },
  { id: 'RP1', label: 'Reliever 1',   group: 'Bullpen',  kind: 'bullpen',  area: 'pitching' },
  { id: 'RP2', label: 'Reliever 2',   group: 'Bullpen',  kind: 'bullpen',  area: 'pitching' },
  { id: 'RP3', label: 'Reliever 3',   group: 'Bullpen',  kind: 'bullpen',  area: 'pitching' },
  { id: 'RP4', label: 'Reliever 4',   group: 'Bullpen',  kind: 'bullpen',  area: 'pitching' },
  { id: 'CL',  label: 'Closer',       group: 'Bullpen',  kind: 'closer',   area: 'pitching' },
  { id: 'BN1', label: 'Bench 1',      group: 'Bench',    kind: 'bench',    area: 'hitting' },
  { id: 'BN2', label: 'Bench 2',      group: 'Bench',    kind: 'bench',    area: 'hitting' },
  { id: 'BN3', label: 'Bench 3',      group: 'Bench',    kind: 'bench',    area: 'hitting' },
  { id: 'BN4', label: 'Bench 4',      group: 'Bench',    kind: 'bench',    area: 'hitting' }
];

// Drafting should feel like a human manager: the bat comes first everywhere on the field
// except behind the plate, where receiving matters more. Pitchers are judged on pitching alone.
// Each pair of weights is hitting, then the slot's fielding grade.
const DRAFT_INFIELD_HITTING_WEIGHT = 0.7;
const DRAFT_INFIELD_FIELDING_WEIGHT = 0.3;
const DRAFT_OUTFIELD_HITTING_WEIGHT = 0.7;
const DRAFT_OUTFIELD_FIELDING_WEIGHT = 0.3;
const DRAFT_CATCHER_HITTING_WEIGHT = 0.4;
const DRAFT_CATCHER_FIELDING_WEIGHT = 0.6;
// Pitchers are drafted first because good arms are the scarce resource.
const DRAFT_SLOT_ORDER = ['SP1','SP2','SP3','SP4','SP5','CL','RP1','RP2','RP3','RP4','C','SS','2B','CF','3B','1B','LF','RF','BN1','BN2','BN3','BN4'];

// Turns stored roster rows into a lookup from slot to row, with the player attached.
function rosterBySlot(rows) {
  const roster = {};
  for (const row of rows) {
    if (row.expand && row.expand.player) roster[row.position] = row;
  }
  return roster;
}

// A team can play once every field, rotation and bullpen slot is filled. Bench is optional.
function isRosterComplete(roster) {
  return ROSTER_SLOTS.every(slot => slot.kind === 'bench' || roster[slot.id]);
}

// Assembles what one game needs from a roster: fielders by position, the day's starter
// chosen by rotation turn, the bullpen in order, and a nine-spot batting order in which
// the pitcher's spot is marked so whoever is pitching at the time comes to bat.
function buildGameTeam(teamRecord, roster, rotationTurn) {
  const rotation = ROSTER_SLOTS.filter(slot => slot.kind === 'rotation' && roster[slot.id]);
  const order = new Array(9).fill(null);
  const leftovers = [];
  for (const slot of ROSTER_SLOTS) {
    if (slot.kind !== 'field') continue;
    const spot = roster[slot.id].batting_order;
    if (spot >= 1 && spot <= 9 && !order[spot - 1]) order[spot - 1] = { player: roster[slot.id].expand.player, position: slot.id };
    else leftovers.push({ player: roster[slot.id].expand.player, position: slot.id });
  }
  // The pitcher takes the one spot no fielder claimed, ninth when the stored order is clean.
  const pitcherSpot = order[8] ? order.indexOf(null) : 8;
  order[pitcherSpot] = { pitcherSpot: true, position: 'P' };
  for (const entry of leftovers) order[order.indexOf(null)] = entry;

  return {
    id: teamRecord.id,
    name: teamRecord.name,
    fielders: {
      C: roster.C.expand.player, '1B': roster['1B'].expand.player, '2B': roster['2B'].expand.player,
      '3B': roster['3B'].expand.player, SS: roster.SS.expand.player,
      LF: roster.LF.expand.player, CF: roster.CF.expand.player, RF: roster.RF.expand.player
    },
    starter: roster[rotation[rotationTurn % rotation.length].id].expand.player,
    bullpen: ROSTER_SLOTS.filter(slot => slot.kind === 'bullpen' && roster[slot.id]).map(slot => roster[slot.id].expand.player),
    closer: roster.CL.expand.player,
    battingOrder: order
  };
}

// How well a player suits a slot, shared by the auto-draft and the picker's ordering.
// A bench player is scored as the kind of fielder he would best fill in for.
function slotDraftScore(slot, player) {
  const grades = playerGrades(player);
  if (slot.kind !== 'field' && slot.kind !== 'bench') return grades.pitching;
  const asInfielder = grades.hitting * DRAFT_INFIELD_HITTING_WEIGHT + grades.infield * DRAFT_INFIELD_FIELDING_WEIGHT;
  const asOutfielder = grades.hitting * DRAFT_OUTFIELD_HITTING_WEIGHT + grades.outfield * DRAFT_OUTFIELD_FIELDING_WEIGHT;
  const asCatcher = grades.hitting * DRAFT_CATCHER_HITTING_WEIGHT + grades.catching * DRAFT_CATCHER_FIELDING_WEIGHT;
  if (slot.kind === 'bench') return Math.max(asInfielder, asOutfielder, asCatcher);
  return slot.area === 'catching' ? asCatcher : (slot.area === 'infield' ? asInfielder : asOutfielder);
}

// Fills every empty slot with the best available free agent for that slot,
// then rewrites the batting order so the best hitters bat first and the pitcher bats ninth.
async function autoDraftTeam(dao, teamId) {
  const roster = rosterBySlot(await dao.teamPlayers(teamId));
  const available = await dao.freeAgents();
  for (const slotId of DRAFT_SLOT_ORDER) {
    if (roster[slotId] || !available.length) continue;
    const slot = ROSTER_SLOTS.find(s => s.id === slotId);
    let bestIndex = 0;
    let bestScore = -1;
    available.forEach((player, index) => {
      const score = slotDraftScore(slot, player);
      if (score > bestScore) { bestScore = score; bestIndex = index; }
    });
    const row = await dao.assignSlot(teamId, available[bestIndex].id, slotId, 0);
    row.expand = { player: available[bestIndex] };
    roster[slotId] = row;
    available.splice(bestIndex, 1);
  }
  await autoBattingOrder(dao, roster);
}

// Orders the eight field starters by hitting grade into spots one through eight.
async function autoBattingOrder(dao, roster) {
  const starters = ROSTER_SLOTS.filter(slot => slot.kind === 'field' && roster[slot.id]).map(slot => roster[slot.id]);
  starters.sort((a, b) => playerGrades(b.expand.player).hitting - playerGrades(a.expand.player).hitting);
  for (let i = 0; i < starters.length; i++) {
    if (starters[i].batting_order !== i + 1) await dao.setBattingOrder(starters[i].id, i + 1);
    starters[i].batting_order = i + 1;
  }
  // Anyone off the field keeps no spot.
  for (const slot of ROSTER_SLOTS) {
    if (slot.kind !== 'field' && roster[slot.id] && roster[slot.id].batting_order) {
      await dao.setBattingOrder(roster[slot.id].id, 0);
      roster[slot.id].batting_order = 0;
    }
  }
}
