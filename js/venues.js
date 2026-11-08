// Salles : chaque tournoi a son décor (sol, éclairage, tribunes, panneaux, ambiance).
const FLAGS = [0x1f4bd6, 0xffffff, 0xe33340, 0xde2910, 0xffde00, 0xbc002d, 0x009c3b, 0x2a62c9, 0xf7d117, 0x111111, 0xdd1f1f, 0xf4c400, 0x159447, 0x0047a0, 0xff9933];
const city = name => name.replace(/^WTT (Feeder|Contender|Champions) /, '').replace(/ Smash$/, '');

export function defaultVenue(t) {
  return { floor: '#1d1f25', outer: 0x0c0b12, accent: '#' + t.neon.toString(16).padStart(6, '0'), neon: t.neon, legs: t.legs, light: t.light, bg: 0x050409,
    title: 'PINGPONG', sub: 'WORLD CHAMPIONSHIPS', items: ['@logo', 'WORLD CHAMPIONSHIPS', '@logo', 'LE JEU. LA PASSION.', 'FINALE'], table: '#131a25' };
}

const GYM = { outer: 0x6b4a2c, bg: 0x9aa0aa, fog: 0.006, hemi: 1.15, hemiSky: 0xffffff, hemiGround: 0x5a5148, key: 1.5, spots: 0.45, amb: 4, light: 0xffffff,
  cones: false, ceiling: false, screens: false, gym: true, stands: 'one', standCol: 0x5a5e66, exposure: 0.95, boardBg: '#13306e', boardFg: '#ffffff' };

export const TRAINING_VENUE = { ...GYM, floor: '#6e2a20', accent: '#ffffff', neon: 0xdddddd, legs: 0x1f3f8a, table: '#1f4fa8', stands: 'none', title: 'CENTRE D\'ENTRAÎNEMENT', sub: 'PRÉPARATION', items: ['ENTRAÎNEMENT', '@logo', 'TRAVAIL · RÉGULARITÉ · MENTAL'] };
export const JUBILE_VENUE = { floor: '#14100a', outer: 0x060403, accent: '#ffc83c', neon: 0xffc83c, neon2: 0xffffff, legs: 0xb8861b, light: 0xffb020, bg: 0x030201, show: true, table: '#141418',
  title: 'MERCI', sub: 'MATCH D\'ADIEU', items: ['MERCI', '@logo', 'UNE LÉGENDE', 'MATCH D\'ADIEU'], seats: 0x3a2a10 };

export function venueFor(d) {
  const ev = d.ev, n = ev.name, c = city(n).toUpperCase(), t = d.tier;
  if (d.kind === 'exhib') return { pattern: 'rings', floor: '#0b0b0e', outer: 0x020203, accent: '#ff3dc8', neon: 0xff3dc8, neon2: 0x3dff8a, legs: 0x2a2a30, light: 0xff3dc8, bg: 0x000000, show: true, cones: false, spots: 0.8, table: '#141418',
    title: 'EXHIBITION', sub: n.replace('Exhibition à ', ''), items: ['EXHIBITION', '@logo', 'SHOW', n.replace('Exhibition à ', '').toUpperCase()], seats: 0x1a0a20 };
  if (t === 'challenger') return { ...GYM, floor: '#7b1d24', accent: '#3cc8ff', neon: 0x3cc8ff, legs: 0x1f3f8a, table: '#1f4fa8', title: 'WTT FEEDER', sub: c, items: ['WTT FEEDER', c, '@logo', 'TENNIS DE TABLE'] };
  if (t === 'contender') return { floor: '#1d3c7a', outer: 0x15171d, accent: '#3cff8a', neon: 0x3cff8a, legs: 0x1f6fd6, light: 0x2aa0ff, amb: 12, bg: 0x0b1220, fog: 0.02, hemi: 0.65, hemiSky: 0x9fb8ff, key: 1.35, spots: 0.9,
    cones: false, stands: 'sides', standCol: 0x1a2236, seats: 0x1f4fa8, table: '#1f4fa8', boardBg: '#0e1d44', title: 'WTT CONTENDER', sub: c, items: ['WTT CONTENDER', c, '@logo', 'WORLD TABLE TENNIS'] };
  if (t === 'star') return { pattern: 'stripes', floor: '#4a0d16', outer: 0x0a0507, accent: '#ff3c3c', neon: 0xff3c3c, legs: 0x2a2a30, light: 0xff3030, bg: 0x080305, table: '#141418', boardBg: '#120608', seats: 0x5a0f1c,
    title: 'WTT CHAMPIONS', sub: c, items: ['WTT CHAMPIONS', c, '@logo', 'WORLD TABLE TENNIS'] };
  if (t === 'slam') {
    const S = {
      'Singapore Smash': { pattern: 'waves', flags: true, flagCols: [0xff3d8b, 0xffffff, 0xef3340], floor: '#2a0a2e', accent: '#ff3d8b', neon: 0xff3d8b, neon2: 0x3de8ff, legs: 0xd23c8b, light: 0xff3d8b, bg: 0x0a0410, table: '#1b1240', seats: 0x4a1040 },
      'United States Smash': { pattern: 'checker', flags: true, flagCols: [0xffb020, 0x111111, 0xb22234, 0x3c3b6e], floor: '#1a1408', accent: '#ffb020', neon: 0xffb020, neon2: 0xff3d3d, legs: 0xb8861b, light: 0xffa020, bg: 0x070502, table: '#0f1a3a', seats: 0x3a2a10 },
      'Europe Smash': { pattern: 'stripes', floor: '#0d2236', accent: '#7fe3ff', neon: 0x7fe3ff, neon2: 0xffffff, legs: 0x2a6fd6, light: 0x3cc8ff, bg: 0x040a12, table: '#123060', seats: 0x10305a },
      'China Smash': { pattern: 'border', flags: true, flagCols: [0xd8141c, 0xffd23c], floor: '#3a0606', accent: '#ffd23c', neon: 0xff2a2a, neon2: 0xffd23c, legs: 0xc8202e, light: 0xff3030, bg: 0x0a0202, table: '#1a1a40', seats: 0x6a0a0a },
    }[n] || {};
    return { outer: 0x050407, show: true, ...S, title: n.toUpperCase(), sub: 'GRAND SMASH', items: [n.toUpperCase(), '@logo', 'GRAND SMASH', 'WORLD TABLE TENNIS'] };
  }
  if (t === 'finals') return { pattern: 'rings', floor: '#081a24', outer: 0x020406, accent: '#3de8ff', neon: 0x3de8ff, neon2: 0xff3dc8, legs: 0x0f6f8a, light: 0x3de8ff, bg: 0x020609, show: true, table: '#141418', seats: 0x0a2a3a,
    title: 'WTT FINALS', sub: 'HONG KONG', items: ['WTT FINALS', 'HONG KONG', '@logo', 'LES 16 MEILLEURS'] };
  if (t === 'worlds') return { pattern: 'border', floor: '#0f2a5a', outer: 0x050a16, accent: '#ffc83c', neon: 0xffc83c, neon2: 0x3c8cff, legs: 0x1f3f8a, light: 0x3c8cff, bg: 0x03060e, show: true, flags: true, flagCols: FLAGS, table: '#1f4fa8', seats: 0x10204a,
    title: 'CHAMPIONNATS DU MONDE', sub: 'ITTF', items: ['ITTF WORLD CHAMPIONSHIPS', '@logo', 'CHAMPIONNATS DU MONDE'] };
  if (t === 'team') return { floor: '#2a1608', outer: 0x080402, accent: '#ff9a3c', neon: 0xff9a3c, legs: 0x8a4a1f, light: 0xff8a2a, bg: 0x060302, flags: true, flagCols: FLAGS, table: '#1f4fa8', seats: 0x3a1a08,
    title: 'MONDIAUX PAR ÉQUIPES', sub: 'ITTF', items: ['CHAMPIONNATS DU MONDE PAR ÉQUIPES', '@logo', 'NATIONS'] };
  if (t === 'olympics') return { floor: '#2f6fae', outer: 0x15304f, accent: '#ffffff', neon: 0xffffff, neon2: 0x3cc8ff, legs: 0x0f2a5a, light: 0x9ad0ff, bg: 0x0b1a2e, hemi: 0.8, hemiSky: 0xcfe6ff, flags: true, flagCols: FLAGS, table: '#1f4fa8', seats: 0x1f4f8a, standCol: 0x1a2a40,
    title: ev.name.toUpperCase().replace('JEUX OLYMPIQUES', 'JEUX OLYMPIQUES'), sub: 'TENNIS DE TABLE', items: ['JEUX OLYMPIQUES', '@logo', 'TENNIS DE TABLE', ev.name.replace('Jeux olympiques de ', '').toUpperCase()] };
  return defaultVenue({ neon: 0xd23cff, legs: 0x7a3fd6, light: 0x8a3cff });
}
