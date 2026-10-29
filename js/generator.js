// generator.js — random player pool

const FIRST = ['Alex','Jordan','Casey','Riley','Morgan','Taylor','Quinn','Avery','Blake','Drew','Sam','Jamie','Chris','Pat','Lee','Max','Leo','Noah','Eli','Owen','Jack','Luke','Ben','Cole','Finn'];
const LAST = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson','White','Harris'];

const POSITIONS = {
  infield: ['1B','2B','3B','SS'],
  outfield: ['OF'],
  catcher: ['C'],
  pitcher: ['SP','RP','CL']
};

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function name() {
  return pick(FIRST) + ' ' + pick(LAST);
}

export function generatePlayer(position) {
  const isPitcher = ['SP','RP','CL'].includes(position);
  return {
    name: name(),
    position,
    contact: isPitcher ? rand(20, 60) : rand(40, 95),
    power: isPitcher ? rand(10, 50) : rand(30, 95),
    speed: rand(30, 95),
    fielding: rand(40, 95),
    arm: rand(40, 95),
    stuff: isPitcher ? rand(40, 95) : 0,
    control: isPitcher ? rand(40, 95) : 0,
    stamina: isPitcher ? rand(40, 95) : 0,
    age: rand(22, 36)
  };
}

export async function generatePool(dao, count = 200) {
  const existing = await dao.players();
  if (existing.length >= count) return existing.length;

  const toMake = count - existing.length;
  const positions = [];
  // roughly balanced
  for (let i = 0; i < toMake; i++) {
    const roll = Math.random();
    if (roll < 0.35) positions.push(pick(POSITIONS.infield));
    else if (roll < 0.55) positions.push('OF');
    else if (roll < 0.65) positions.push('C');
    else if (roll < 0.85) positions.push('SP');
    else if (roll < 0.95) positions.push('RP');
    else positions.push('CL');
  }

  for (const pos of positions) {
    await dao.createPlayer(generatePlayer(pos));
  }
  return count;
}

export { POSITIONS };
