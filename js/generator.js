// Player abilities, grades and pool generation.
// Follows the abilities and generator design doc: eight abilities, grades computed on the fly,
// floors first then each leftover point is drawn by weighted lottery across the abilities.

const GEN_TOTAL_MIN = 450;
const GEN_TOTAL_MAX = 600;
const GEN_TOTAL_MEAN = 520;
const GEN_TOTAL_SPREAD = 40;
const GEN_FLOOR_MIN = 30;
const GEN_FLOOR_MAX = 50;
const GEN_ABILITY_MAX = 100;
// Once shuffled onto a player, these set how strongly each ability competes for leftover points.
const GEN_PREFERENCE_WEIGHTS = [4, 3, 2, 2, 1, 1, 0.5, 0.5];
// Delays the spending penalty until abilities approach the upper end.
const GEN_RATING_CURVE_INNER_EXPONENT = 6;
// Controls how sharply spending falls off near the cap.
const GEN_RATING_CURVE_OUTER_EXPONENT = 3;
const GEN_LEFT_HANDED_CHANCE = 0.30;

// Ability list order is only a default; generation shuffles preference onto them per player.
const GEN_ABILITIES = ['eye', 'power', 'speed', 'glove', 'range', 'arm', 'command', 'velocity'];

// Pool coverage: keep generating until enough players clear each grade bar
// to stock this many full rosters.
const POOL_TEAM_CAPACITY = 12;
const POOL_GRADE_THRESHOLD = 60;
const POOL_NEED_PER_TEAM_PITCHING = 11;
const POOL_NEED_PER_TEAM_CATCHING = 2;
const POOL_NEED_PER_TEAM_INFIELD = 5;
const POOL_NEED_PER_TEAM_OUTFIELD = 4;
const POOL_NEED_PER_TEAM_HITTING = 9;
// Grade quotas alone can be met by few multi-talented players, so the batch also has to
// hold at least a full roster's worth of bodies per team.
const POOL_NEED_PER_TEAM_PLAYERS = 22;
// A candidate that fills no unmet need is still kept now and then so the pool has depth.
const POOL_FILLER_ACCEPT_CHANCE = 0.15;
const POOL_MAX_ATTEMPTS = 20000;

const GEN_FIRST_NAMES = ['Alex','Jordan','Casey','Riley','Morgan','Taylor','Quinn','Avery','Blake','Drew','Sam','Jamie','Chris','Pat','Lee','Max','Leo','Noah','Eli','Owen','Jack','Luke','Ben','Cole','Finn','Mateo','Hank','Gus','Ray','Wade','Omar','Tito','Kenji','Dario','Sully','Abe','Joe','Vic','Rafael','Hal'];
const GEN_LAST_NAMES = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson','White','Harris','Okafor','Nakamura','Kowalski','Castillo','Brennan','Duval','Ortega','Sato','Fischer','Molina','Reyes','Walsh','Petrov','Lindqvist','Abernathy'];

// Grades are never stored; every caller derives them from the eight abilities.
// Speed stands alone (baserunning only) and is not part of any position grade.
function playerGrades(player) {
  return {
    hitting: (player.eye + player.power) / 2,
    infield: (player.glove + player.range) / 2,
    outfield: (player.range + player.arm) / 2,
    catching: (player.arm + player.glove) / 2,
    pitching: (player.command + player.velocity) / 2
  };
}

function generatePlayer() {
  // Bell curve total from the sum of several uniform rolls, kept inside the allowed band.
  let bell = 0;
  for (let i = 0; i < 6; i++) bell += Math.random();
  const total = Math.round(Math.min(GEN_TOTAL_MAX, Math.max(GEN_TOTAL_MIN,
    GEN_TOTAL_MEAN + (bell - 3) * GEN_TOTAL_SPREAD * Math.SQRT2)));

  // Every ability starts at its own random floor; whatever is left is the free pool.
  const player = {};
  let free = total;
  for (const ability of GEN_ABILITIES) {
    player[ability] = GEN_FLOOR_MIN + Math.floor(Math.random() * (GEN_FLOOR_MAX - GEN_FLOOR_MIN + 1));
    free -= player[ability];
  }

  // Assign the preference ladder in a random order so each player favors a different mix.
  const prefs = GEN_PREFERENCE_WEIGHTS.slice();
  for (let i = prefs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [prefs[i], prefs[j]] = [prefs[j], prefs[i]];
  }
  const preference = {};
  for (let i = 0; i < GEN_ABILITIES.length; i++) preference[GEN_ABILITIES[i]] = prefs[i];

  // Spend one point at a time. Favorites compete harder, and every ability gets quieter
  // the closer it already sits to the cap, using the same absolute-rating falloff.
  while (free > 0) {
    let weightSum = 0;
    const weights = [];
    for (const ability of GEN_ABILITIES) {
      const room = GEN_ABILITY_MAX - player[ability];
      const weight = room <= 0
        ? 0
        : preference[ability] * Math.pow(1 - Math.pow(player[ability] / GEN_ABILITY_MAX, GEN_RATING_CURVE_INNER_EXPONENT), GEN_RATING_CURVE_OUTER_EXPONENT);
      weights.push(weight);
      weightSum += weight;
    }
    if (weightSum <= 0) break;
    let pick = Math.random() * weightSum;
    let chosen = GEN_ABILITIES[GEN_ABILITIES.length - 1];
    for (let i = 0; i < GEN_ABILITIES.length; i++) {
      pick -= weights[i];
      if (pick < 0) {
        chosen = GEN_ABILITIES[i];
        break;
      }
    }
    player[chosen] += 1;
    free -= 1;
  }

  player.name = GEN_FIRST_NAMES[Math.floor(Math.random() * GEN_FIRST_NAMES.length)] + ' ' +
    GEN_LAST_NAMES[Math.floor(Math.random() * GEN_LAST_NAMES.length)];
  player.handedness = Math.random() < GEN_LEFT_HANDED_CHANCE ? 'L' : 'R';
  return player;
}

// Builds a fresh batch independent of what is already stored, accepting candidates
// that help an area still short of its grade quota, then saves the batch.
async function generatePool(dao, onProgress) {
  const need = {
    pitching: POOL_NEED_PER_TEAM_PITCHING * POOL_TEAM_CAPACITY,
    catching: POOL_NEED_PER_TEAM_CATCHING * POOL_TEAM_CAPACITY,
    infield: POOL_NEED_PER_TEAM_INFIELD * POOL_TEAM_CAPACITY,
    outfield: POOL_NEED_PER_TEAM_OUTFIELD * POOL_TEAM_CAPACITY,
    hitting: POOL_NEED_PER_TEAM_HITTING * POOL_TEAM_CAPACITY,
    players: POOL_NEED_PER_TEAM_PLAYERS * POOL_TEAM_CAPACITY
  };
  const batch = [];
  for (let attempt = 0; attempt < POOL_MAX_ATTEMPTS; attempt++) {
    if (Object.values(need).every(n => n <= 0)) break;
    const candidate = generatePlayer();
    const grades = playerGrades(candidate);
    // Pitching is checked first so strong arms are claimed for the scarcest need.
    let helps = false;
    for (const area of ['pitching', 'catching', 'infield', 'outfield', 'hitting']) {
      if (need[area] > 0 && grades[area] >= POOL_GRADE_THRESHOLD) helps = true;
    }
    // Once quotas are met, any candidate is welcome until the headcount is reached.
    if (!helps && need.players > 0 && ['pitching', 'catching', 'infield', 'outfield', 'hitting'].every(area => need[area] <= 0)) helps = true;
    if (!helps && Math.random() >= POOL_FILLER_ACCEPT_CHANCE) continue;
    for (const area of ['pitching', 'catching', 'infield', 'outfield', 'hitting']) {
      if (grades[area] >= POOL_GRADE_THRESHOLD) need[area]--;
    }
    need.players--;
    batch.push(candidate);
  }
  for (let i = 0; i < batch.length; i++) {
    await dao.createPlayer(batch[i]);
    if (onProgress) onProgress(i + 1, batch.length);
  }
  return batch.length;
}
