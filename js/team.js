// team.js — roster roles and helpers

export const ROLES = [
  // starters
  { id: 'starter_1B', label: '1B', group: 'Starters', pos: ['1B'] },
  { id: 'starter_2B', label: '2B', group: 'Starters', pos: ['2B'] },
  { id: 'starter_3B', label: '3B', group: 'Starters', pos: ['3B'] },
  { id: 'starter_SS', label: 'SS', group: 'Starters', pos: ['SS'] },
  { id: 'starter_OF1', label: 'OF 1', group: 'Starters', pos: ['OF'] },
  { id: 'starter_OF2', label: 'OF 2', group: 'Starters', pos: ['OF'] },
  { id: 'starter_OF3', label: 'OF 3', group: 'Starters', pos: ['OF'] },
  { id: 'starter_C', label: 'C', group: 'Starters', pos: ['C'] },
  // rotation
  { id: 'rotation_1', label: 'SP 1', group: 'Rotation', pos: ['SP'] },
  { id: 'rotation_2', label: 'SP 2', group: 'Rotation', pos: ['SP'] },
  { id: 'rotation_3', label: 'SP 3', group: 'Rotation', pos: ['SP'] },
  { id: 'rotation_4', label: 'SP 4', group: 'Rotation', pos: ['SP'] },
  { id: 'rotation_5', label: 'SP 5', group: 'Rotation', pos: ['SP'] },
  // bench
  { id: 'bench_if', label: 'Util IF', group: 'Bench', pos: ['1B','2B','3B','SS'] },
  { id: 'bench_of', label: 'Util OF', group: 'Bench', pos: ['OF'] },
  { id: 'bench_c', label: 'Bench C', group: 'Bench', pos: ['C'] },
  // bullpen
  { id: 'reliever_1', label: 'RP 1', group: 'Bullpen', pos: ['RP'] },
  { id: 'reliever_2', label: 'RP 2', group: 'Bullpen', pos: ['RP'] },
  { id: 'reliever_3', label: 'RP 3', group: 'Bullpen', pos: ['RP'] },
  { id: 'closer', label: 'Closer', group: 'Bullpen', pos: ['CL'] }
];

export function roleById(id) {
  return ROLES.find(r => r.id === id);
}

export function isRosterComplete(assignments) {
  return ROLES.every(r => assignments[r.id]);
}
