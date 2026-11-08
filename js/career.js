// Mode carrière : joueur, circuit mondial (200 joueurs IA), calendrier, tournois, classement.
import { REAL_PLAYERS, REAL_WOMEN } from './players.js';
const KEY0 = 'pingpong-career-v2';
let slot = 1;
const KEY_OF = n => `${KEY0}-s${n}`;
export const SLOTS = 3;
export function setSlot(n) { slot = n; }
export const getSlot = () => slot;
// ancienne sauvegarde unique → emplacement 1
try { const old = localStorage.getItem(KEY0); if (old && !localStorage.getItem(KEY_OF(1))) { localStorage.setItem(KEY_OF(1), old); localStorage.removeItem(KEY0); } } catch (e) {}
export function peek(n) { try { return JSON.parse(localStorage.getItem(KEY_OF(n))) || null; } catch (e) { return null; } }
export const WEEKS = 24;

// ------------------------------------------------------------------ pays (noms fictifs)
export const COUNTRIES = {
  FR: { name: 'France', flag: ['v', '#1f4bd6', '#ffffff', '#e33340'], first: ['Lucas', 'Hugo', 'Théo', 'Nathan', 'Enzo', 'Jules', 'Louis', 'Adam', 'Raphaël', 'Gabin'], last: ['Moreau', 'Lambert', 'Girard', 'Roux', 'Fontaine', 'Mercier', 'Lefèvre', 'Garnier', 'Chevalier', 'Morel'] },
  DE: { name: 'Allemagne', flag: ['h', '#111111', '#dd1f1f', '#f4c400'], first: ['Felix', 'Jonas', 'Lukas', 'Paul', 'Leon', 'Moritz', 'Finn', 'Elias', 'Nils', 'Timo'], last: ['Brandt', 'Weber', 'Krüger', 'Hoffmann', 'Schäfer', 'Vogel', 'Keller', 'Wolff', 'Becker', 'Richter'] },
  CN: { name: 'Chine', flag: ['cn'], first: ['Wei', 'Hao', 'Jun', 'Lei', 'Ming', 'Yan', 'Xin', 'Bo', 'Tao', 'Lin'], last: ['Zhang', 'Liu', 'Chen', 'Wang', 'Huang', 'Zhao', 'Sun', 'Xu', 'Ma', 'Fan'] },
  JP: { name: 'Japon', flag: ['jp'], first: ['Kenji', 'Haruto', 'Ren', 'Sota', 'Yuto', 'Daiki', 'Kenta', 'Riku', 'Kaito', 'Shota'], last: ['Arata', 'Tanaka', 'Sato', 'Ito', 'Mori', 'Harimoto', 'Kato', 'Ono', 'Ishida', 'Nakamura'] },
  KR: { name: 'Corée du Sud', flag: ['kr'], first: ['Jin-ho', 'Min-jun', 'Sang-woo', 'Ji-woo', 'Hyun', 'Dong-hyun', 'Joon-ho', 'Tae-yang', 'Hyun-woo', 'Woo-jin'], last: ['Park', 'Kim', 'Lee', 'Choi', 'Jung', 'Kang', 'Yoon', 'Jang', 'Lim', 'Han'] },
  SE: { name: 'Suède', flag: ['nordic', '#2a62c9', '#f7d117'], first: ['Viktor', 'Oskar', 'Elias', 'Axel', 'Lucas', 'Filip', 'Anton', 'Hugo', 'Gustav', 'Erik'], last: ['Lindqvist', 'Karlsson', 'Nilsson', 'Berg', 'Holm', 'Sjöberg', 'Ek', 'Lund', 'Falk', 'Ström'] },
  BR: { name: 'Brésil', flag: ['br'], first: ['Mateus', 'Gabriel', 'Rafael', 'Thiago', 'Bruno', 'Pedro', 'Lucas', 'Caio', 'Diego', 'Felipe'], last: ['Silva', 'Santos', 'Costa', 'Oliveira', 'Rocha', 'Almeida', 'Lima', 'Souza', 'Ferreira', 'Barros'] },
  US: { name: 'États-Unis', flag: ['us'], first: ['Jake', 'Ryan', 'Tyler', 'Mason', 'Logan', 'Nathan', 'Owen', 'Cole', 'Evan', 'Dylan'], last: ['Miller', 'Carter', 'Brooks', 'Hayes', 'Reed', 'Parker', 'Bennett', 'Foster', 'Cooper', 'Wright'] },
  GB: { name: 'Royaume-Uni', flag: ['gb'], first: ['Oliver', 'Harry', 'George', 'Jack', 'Alfie', 'Charlie', 'Oscar', 'Freddie', 'Archie', 'Henry'], last: ['Walker', 'Hughes', 'Clarke', 'Turner', 'Wood', 'Evans', 'Hall', 'Hill', 'Green', 'Ward'] },
  ES: { name: 'Espagne', flag: ['h3', '#c60b1e', '#ffc400', '#c60b1e'], first: ['Mateo', 'Álvaro', 'Pablo', 'Javier', 'Sergio', 'Hugo', 'Daniel', 'Adrián', 'Marcos', 'Rubén'], last: ['García', 'Rivas', 'Navarro', 'Romero', 'Torres', 'Ruiz', 'Gil', 'Serrano', 'Molina', 'Ortega'] },
  IT: { name: 'Italie', flag: ['v', '#159447', '#ffffff', '#d4242b'], first: ['Leo', 'Marco', 'Luca', 'Andrea', 'Matteo', 'Lorenzo', 'Tommaso', 'Davide', 'Simone', 'Riccardo'], last: ['Santini', 'Rossi', 'Bianchi', 'Ricci', 'Greco', 'Conti', 'Gallo', 'Marino', 'Bruno', 'Costa'] },
  PT: { name: 'Portugal', flag: ['v2', '#046a38', '#da291c'], first: ['João', 'Tiago', 'Diogo', 'Rui', 'Nuno', 'Martim', 'Gonçalo', 'Duarte', 'Afonso', 'Rodrigo'], last: ['Freitas', 'Monteiro', 'Pinto', 'Cardoso', 'Teixeira', 'Matos', 'Correia', 'Nunes', 'Faria', 'Lopes'] },
  EG: { name: 'Égypte', flag: ['h', '#ce1126', '#ffffff', '#111111'], first: ['Omar', 'Youssef', 'Karim', 'Ahmed', 'Mostafa', 'Ali', 'Mahmoud', 'Hassan', 'Tarek', 'Amr'], last: ['Haddad', 'Assar', 'Saleh', 'Mansour', 'Fathy', 'Nabil', 'Zaki', 'Rashed', 'Kamel', 'Farouk'] },
  NG: { name: 'Nigéria', flag: ['v', '#008751', '#ffffff', '#008751'], first: ['Quadri', 'Emeka', 'Tunde', 'Chidi', 'Seun', 'Femi', 'Tobi', 'Kunle', 'Obi', 'Segun'], last: ['Aruna', 'Okafor', 'Adeyemi', 'Eze', 'Bello', 'Okonkwo', 'Afolabi', 'Nwosu', 'Balogun', 'Ojo'] },
  IN: { name: 'Inde', flag: ['h', '#ff9933', '#ffffff', '#138808'], first: ['Arjun', 'Rohan', 'Vikram', 'Aditya', 'Sathiyan', 'Rahul', 'Karan', 'Kabir', 'Dev', 'Ishaan'], last: ['Sharma', 'Kamal', 'Gnanasekaran', 'Patel', 'Rao', 'Iyer', 'Mehta', 'Nair', 'Reddy', 'Kapoor'] },
  MX: { name: 'Mexique', flag: ['v', '#006847', '#ffffff', '#ce1126'], first: ['Diego', 'Santiago', 'Emiliano', 'Iker', 'Marcos', 'Emilio', 'Sebastián', 'Rodrigo', 'Andrés', 'Alejandro'], last: ['Hernández', 'Ramírez', 'Cruz', 'Flores', 'Vargas', 'Castillo', 'Mendoza', 'Ríos', 'Salinas', 'Aguilar'] },
  PL: { name: 'Pologne', flag: ['h2', '#ffffff', '#dc143c'], first: ['Jakub', 'Kacper', 'Szymon', 'Filip', 'Mateusz', 'Piotr', 'Michał', 'Bartek', 'Kamil', 'Wojtek'], last: ['Nowak', 'Kowalski', 'Wójcik', 'Zieliński', 'Mazur', 'Krawczyk', 'Dudek', 'Wróbel', 'Pawlak', 'Sikora'] },
  TW: { name: 'Taipei chinois', flag: ['tpe'] },
  HK: { name: 'Hong Kong', flag: ['hk'] },
  SI: { name: 'Slovénie', flag: ['h', '#ffffff', '#0057b8', '#ed1c24'] },
  DK: { name: 'Danemark', flag: ['nordic', '#c8102e', '#ffffff'] },
  RU: { name: 'Russie', flag: ['h', '#ffffff', '#0039a6', '#d52b1e'] },
  HR: { name: 'Croatie', flag: ['h', '#ff0000', '#ffffff', '#171796'] },
  SK: { name: 'Slovaquie', flag: ['h', '#ffffff', '#0b4ea2', '#ee1c25'] },
  RO: { name: 'Roumanie', flag: ['v', '#002b7f', '#fcd116', '#ce1126'] },
  HU: { name: 'Hongrie', flag: ['h', '#ce2939', '#ffffff', '#477050'] },
  AT: { name: 'Autriche', flag: ['h', '#ed2939', '#ffffff', '#ed2939'] },
  IR: { name: 'Iran', flag: ['h', '#239f40', '#ffffff', '#da0000'] },
  KZ: { name: 'Kazakhstan', flag: ['kz'] },
  SG: { name: 'Singapour', flag: ['h2', '#ef3340', '#ffffff'] },
  CA: { name: 'Canada', flag: ['v', '#d52b1e', '#ffffff', '#d52b1e'] },
  AR: { name: 'Argentine', flag: ['h', '#74acdf', '#ffffff', '#74acdf'] },
  PR: { name: 'Porto Rico', flag: ['h3', '#ed0000', '#ffffff', '#ed0000'] },
  CL: { name: 'Chili', flag: ['h2', '#ffffff', '#d52b1e'] },
  CZ: { name: 'Tchéquie', flag: ['h2', '#ffffff', '#d7141a'] },
  AU: { name: 'Australie', flag: ['h2', '#012169', '#012169'] },
  BE: { name: 'Belgique', flag: ['v', '#111111', '#fdda24', '#ef3340'], first: ['Arthur', 'Louis', 'Victor', 'Noah', 'Cédric', 'Thomas', 'Wout', 'Bram', 'Senne', 'Maxime'], last: ['Peeters', 'Janssens', 'Maes', 'Dubois', 'Lemaire', 'Claes', 'Wouters', 'Goossens', 'Lambrecht', 'Willems'] },
};
export const STYLE_IDS = ['attaquant', 'defenseur', 'coupeur', 'polyvalent'];
export const STYLE_NAMES = { attaquant: 'Attaquant', defenseur: 'Défenseur', coupeur: 'Coupeur', polyvalent: 'Polyvalent' };
export const STAT_KEYS = ['fh', 'bh', 'serve', 'spin', 'speed', 'stamina', 'mental'];
export const STAT_NAMES = { fh: 'Coup droit', bh: 'Revers', serve: 'Service', spin: 'Effet', speed: 'Vitesse', stamina: 'Endurance', mental: 'Mental' };
const STYLE_BIAS = {
  attaquant: { fh: 8, bh: 0, serve: 2, spin: 2, speed: 4, stamina: -2, mental: -2 },
  defenseur: { fh: -3, bh: 6, serve: 0, spin: 0, speed: 4, stamina: 4, mental: 4 },
  coupeur: { fh: -2, bh: 2, serve: 4, spin: 8, speed: -2, stamina: 2, mental: 0 },
  polyvalent: { fh: 2, bh: 2, serve: 2, spin: 2, speed: 2, stamina: 2, mental: 2 },
};
export const SIGNATURES = {
  fantome: { name: 'Service fantôme', desc: 'Services avec un effet latéral énorme' },
  eclair: { name: 'Contre éclair', desc: 'Ses contres partent très vite' },
  mur: { name: 'Le Mur', desc: 'Presque aucune faute en défense' },
  canon: { name: 'Coup de canon', desc: 'Coups droits surpuissants' },
  magicien: { name: 'Coupé magique', desc: 'Effet arrière énorme' },
  sniper: { name: 'Sniper', desc: 'Vise les lignes au millimètre' },
  tornade: { name: 'Tornade', desc: 'Lifts avec un effet monstrueux' },
  roc: { name: 'Mental de roc', desc: 'Ne craque jamais sur les balles décisives' },
  feinte: { name: 'Feinte', desc: 'Change de direction au dernier moment' },
  sprinter: { name: 'Sprinter', desc: 'Rattrape absolument tout' },
};

// ------------------------------------------------------------------ tournois
export const TIERS = {
  challenger: { name: 'WTT Feeder', size: 32, need: 999, best: 5, pts: [125, 90, 45, 25, 15, 8], prize: [2000, 1200, 700, 400, 250, 120], arena: 'glacier', color: '#3cc8ff' },
  contender: { name: 'WTT Contender', size: 32, need: 120, best: 5, pts: [400, 280, 140, 70, 35, 4], prize: [7500, 4300, 2400, 1300, 750, 380], arena: 'jungle', color: '#3cff8a' },
  star: { name: 'WTT Champions', size: 32, need: 36, best: 7, pts: [1000, 700, 350, 175, 90, 15], prize: [45000, 25000, 13000, 7000, 3500, 1800], arena: 'inferno', color: '#ff3c3c' },
  slam: { name: 'Grand Smash', size: 64, need: 48, best: 7, pts: [2000, 1400, 700, 350, 175, 90, 20], prize: [100000, 50000, 25000, 13000, 6500, 3500, 1800], arena: 'finale', color: '#d23cff' },
  finals: { name: 'WTT Finals', size: 16, need: 16, best: 7, pts: [1500, 1050, 525, 265, 100], prize: [70000, 40000, 20000, 10000, 5000], arena: 'legende', color: '#ff4dc8' },
  exhib: { name: 'Exhibition', size: 2, need: 999, best: 5, pts: [0, 0], prize: [0, 0], arena: 'finale', color: '#6ee7a8' },
  team: { name: 'Championnats du monde par équipes', size: 8, need: 999, best: 5, pts: [0, 0, 0, 0], prize: [25000, 12000, 6000, 3000], arena: 'inferno', color: '#ff9a3c' },
  olympics: { name: 'Jeux olympiques', size: 32, need: 40, best: 7, pts: [0, 0, 0, 0, 0, 0], prize: [0, 0, 0, 0, 0, 0], arena: 'legende', color: '#ffffff' },
  worlds: { name: 'Championnats du monde', size: 16, need: 16, best: 7, pts: [2000, 1400, 700, 350, 90], prize: [100000, 50000, 25000, 12000, 4000], arena: 'legende', color: '#ffc83c' },
};
const FEEDERS = ['Düsseldorf', 'Varaždin', 'Olomouc', 'Otočec', 'Havířov', 'Vila Nova de Gaia', 'Biella', 'Cappadocia', 'Doha', 'Beyrouth', 'Panagyurishte', 'Lille'];
const CONTENDERS = ['Doha', 'Tunis', 'Taiyuan', 'Lagos', 'Skopje', 'Zagreb', 'Almaty', 'Buenos Aires', 'Rio de Janeiro', 'Muscat', 'Antalya', 'Istanbul', 'Lima', 'Mascate'];
const SLAMS = { 4: 'Singapore Smash', 13: 'United States Smash', 15: 'Europe Smash', 19: 'China Smash' };
const STARS = { 3: 'WTT Champions Doha', 6: 'WTT Champions Chongqing', 11: 'WTT Champions Yokohama', 17: 'WTT Champions Macao', 20: 'WTT Champions Montpellier', 21: 'WTT Champions Frankfurt' };
// dates réelles : la saison suit l'année civile (saison 1 = 2027)
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export function weekDate(season, week) {
  const d = new Date(Date.UTC(2026 + season, 0, 6 + Math.round((week - 1) * 14.6)));
  return { day: d.getUTCDate(), month: d.getUTCMonth(), year: d.getUTCFullYear(), label: `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`, short: `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 4)}.` };
}
export const yearOf = season => 2026 + season;
export const VENUES = {
  'Singapore Smash': { city: 'Singapour', arena: 'finale', crowd: 1 }, 'United States Smash': { city: 'Las Vegas', arena: 'inferno', crowd: 1 },
  'Europe Smash': { city: 'Malmö', arena: 'glacier', crowd: 1 }, 'China Smash': { city: 'Pékin', arena: 'inferno', crowd: 1 },
  'Championnats du monde': { city: 'Mondiaux', arena: 'legende', crowd: 1 }, 'WTT Finals Hong Kong': { city: 'Hong Kong', arena: 'legende', crowd: 1 },
};

const de = c => /^[AEIOUÉÈ]/.test(c) ? `d'${c}` : `de ${c}`;
function baseEvents(season, week) {
  if (week === WEEKS) return [{ id: `s${season}w${week}fin`, tier: 'finals', name: 'WTT Finals Hong Kong' }];
  if (week === 9) return [{ id: `s${season}w9worlds`, tier: 'worlds', name: 'Championnats du monde' }];
  if (SLAMS[week]) return [{ id: `s${season}w${week}slam`, tier: 'slam', name: SLAMS[week] }, { id: `s${season}w${week}ch`, tier: 'challenger', name: `WTT Feeder ${FEEDERS[(week * 7 + season) % FEEDERS.length]}` }];
  if (STARS[week]) return [{ id: `s${season}w${week}star`, tier: 'star', name: STARS[week] }, { id: `s${season}w${week}co`, tier: 'contender', name: `WTT Contender ${CONTENDERS[(week * 5 + season) % CONTENDERS.length]}` }];
  return [
    { id: `s${season}w${week}ch`, tier: 'challenger', name: `WTT Feeder ${FEEDERS[(week * 7 + season) % FEEDERS.length]}` },
    { id: `s${season}w${week}co`, tier: 'contender', name: `WTT Contender ${CONTENDERS[(week * 5 + season + 3) % CONTENDERS.length]}` },
  ];
}

const EXHIB_CITIES = ['Paris (Accor Arena)', 'Londres', 'Shanghai', 'Tokyo', 'New York', 'Dubaï', 'Stockholm', 'Rio'];
export const olympicName = s => s === 2 ? 'Jeux olympiques de Los Angeles' : s === 6 ? 'Jeux olympiques de Brisbane' : 'Jeux olympiques';
export function weekEvents(season, week) {
  if (week === 7) return [{ id: `s${season}w7team`, tier: 'team', kind: 'team', name: 'Championnats du monde par équipes' }, ...baseEvents(season, week).filter(e => e.tier === 'challenger')];
  if (season % 4 === 2 && week === 14) return [{ id: `s${season}w14oly`, tier: 'olympics', kind: 'olympics', name: olympicName(season) }];
  const out = [];
  for (const e of baseEvents(season, week)) {
    out.push(e);
    if (e.tier !== 'challenger' && e.tier !== 'worlds' && e.tier !== 'finals') out.push({ ...e, id: e.id + 'd', kind: 'double', name: e.name + ' · Double' });
    if (e.tier === 'slam' || e.tier === 'star') out.push({ ...e, id: e.id + 'x', kind: 'mixed', name: e.name + ' · Double mixte' });
  }
  if (week % 4 === 2 && career && (career.fans || 0) >= 15000) out.push({ id: `s${season}w${week}ex`, tier: 'exhib', kind: 'exhib', name: `Exhibition à ${EXHIB_CITIES[(season * 3 + week) % EXHIB_CITIES.length]}` });
  return out;
}

// ------------------------------------------------------------------ outils
let seed = 1;
function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
const pick = a => a[Math.floor(rnd() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const overall = st => Math.round(STAT_KEYS.reduce((a, k) => a + st[k], 0) / STAT_KEYS.length);

function makeStats(rating, style) {
  const st = {};
  for (const k of STAT_KEYS) st[k] = clamp(Math.round(rating + STYLE_BIAS[style][k] + (rnd() - 0.5) * 8), 25, 99);
  return st;
}

// ------------------------------------------------------------------ état
export let career = null;
export function load() {
  try { career = JSON.parse(localStorage.getItem(KEY_OF(slot))) || null; } catch (e) { career = null; }
  migrate();
  return career;
}
export function save() { try { localStorage.setItem(KEY_OF(slot), JSON.stringify(career)); } catch (e) {} }
export function erase(n = slot) { if (n === slot) career = null; try { localStorage.removeItem(KEY_OF(n)); } catch (e) {} }
export const absWeek = (s, w) => (s - 1) * WEEKS + w;

export function create(p) {
  seed = (Date.now() & 0xffffffff) >>> 0;
  const stats = {};
  for (const k of STAT_KEYS) stats[k] = clamp(46 + STYLE_BIAS[p.style][k], 30, 70);
  const me = { id: 'me', name: p.name, country: p.country, hand: p.hand, style: p.style, neon: p.neon, acc: p.acc, stats, pts: [], age: p.age || 17, perso: p.perso || 'combatif' };
  // circuit réel
  const used = new Set([p.name]);
  const N = REAL_PLAYERS.length;
  const STY = { a: 'attaquant', d: 'defenseur', c: 'coupeur', p: 'polyvalent' };
  const pool = REAL_PLAYERS.map((r, i) => {
    used.add(r[0]);
    const rating = Math.round(96 - Math.pow(i / (N - 1), 0.8) * 52 + (rnd() - 0.5) * 2);
    const style = STY[r[3]];
    return { id: 'p' + i, name: r[0], country: r[1], hand: r[4], style, rating, stats: makeStats(rating, style), pts: [], age: r[2], wins: {}, real: true, seedTotal: Math.round(8400 * Math.pow(i + 1, -0.62)) };
  });
  // les 10 meilleurs : coups signature
  const sigs = Object.keys(SIGNATURES).sort(() => rnd() - 0.5);
  pool.slice(0, 10).forEach((pl, i) => { pl.sig = sigs[i]; });
  // le rival : un joueur réel de ton niveau, d'un autre pays
  const cands = pool.slice(N - 30, N - 5).filter(x => x.country !== p.country && x.age < 30);
  const rival = cands[Math.floor(rnd() * cands.length)] || pool[N - 10];
  rival.rival = true; rival.rating = overall(stats) + 3; rival.stats = makeStats(rival.rating, rival.style);
  career = {
    v: 1, diff: p.diff ?? 1, season: 1, week: 1, me, pool, length: p.length ?? 1, upPoints: 0,
    h2h: {}, titles: [], results: [], tour: null, money: 3000, energy: 100, coach: 0, sponsor: null, offers: [], gear: { bois: 0, rev: 0, shoes: 0 }, trained: 0, earned: 0, news: ['Bienvenue sur le circuit WTT ! Commence par les WTT Feeder pour grimper au classement mondial.'],
  };
  // classement de départ : points fictifs de la saison précédente
  for (const pl of pool) { const sh = [0.24, 0.18, 0.14, 0.12, 0.1, 0.09, 0.07, 0.06]; sh.forEach((f, k) => pl.pts.push({ w: -k * 3, p: Math.round(pl.seedTotal * f) })); delete pl.seedTotal; }
  migrate();
  save();
  return career;
}

// ------------------------------------------------------------------ classement
export function allPlayers() { return [career.me, ...career.pool]; }
export function getP(id) { const E = career.tour && career.tour.ents; if (E && E[id]) return E[id]; if (id === 'me') return career.me; return career.pool.find(p => p.id === id) || (career.wpool || []).find(p => p.id === id); }
export function rating(pl) { return pl.ent ? pl.rating : pl.id === 'me' ? overall(effStats()) : pl.rating; }
// classement ITTF : seuls les 8 meilleurs résultats comptent, chacun reste valable un an (jusqu'à l'édition suivante)
export function rankPoints(pl) {
  const now = absWeek(career.season, career.week);
  return pl.pts.filter(e => e.w > now - WEEKS).map(e => e.p).sort((a, b) => b - a).slice(0, 8).reduce((a, b) => a + b, 0);
}
export function countedResults(pl) {
  const now = absWeek(career.season, career.week);
  return pl.pts.filter(e => e.w > now - WEEKS).sort((a, b) => b.p - a.p).slice(0, 8);
}
export function ranking() {
  const list = allPlayers().map(p => ({ p, pts: rankPoints(p) }));
  list.sort((a, b) => b.pts - a.pts || rating(b.p) - rating(a.p));
  list.forEach((e, i) => { e.rank = i + 1; });
  return list;
}
export function rankOf(id) { const r = ranking(); const e = r.find(x => x.p.id === id); return e ? e.rank : 999; }

// ------------------------------------------------------------------ tournois
export function lockReason(ev) {
  const T = TIERS[ev.tier], rk = rankOf('me');
  if (career.injury) return `🩹 Blessé (${career.injury.weeks} sem.)`;
  if ((career.wc || {})[ev.id]) return null;
  if (ev.kind === 'exhib') return null;
  if (ev.kind === 'mixed') return career.mpartner && (career.wpool || []).some(w => w.id === career.mpartner) ? (rk <= 80 ? null : '🔒 Réservé au top 80 mondial') : 'Choisis une partenaire de double mixte (Staff & sponsors)';
  if (ev.kind === 'double') {
    if (!career.partner || !career.pool.some(p => p.id === career.partner)) return 'Choisis un partenaire de double (Staff & sponsors)';
    const need = { contender: 999, star: 90, slam: 60 }[ev.tier] || 999;
    return rk <= need ? null : `🔒 Réservé au top ${need} mondial`;
  }
  if (ev.kind === 'team') return null;
  return rk <= T.need ? null : `🔒 Réservé au top ${T.need} mondial`;
}
export function eligible(ev) { return !lockReason(ev); }

function seedOrder(n) {
  let o = [1];
  while (o.length < n) { const m = o.length * 2 + 1; o = o.flatMap(s => [s, m - s]); }
  return o;
}

// probabilité que a batte b (simulation)
export function winProb(a, b) { return 1 / (1 + Math.exp(-(rating(a) - rating(b)) / 5.5)); }

function entrants(ev, withMe) {
  const T = TIERS[ev.tier];
  const r = ranking().filter(e => e.p.id !== 'me');
  let lo = 0, hi = r.length;
  if (ev.tier === 'challenger') { lo = 60; hi = r.length; }
  if (ev.tier === 'contender') { lo = 15; hi = 125; }
  if (ev.tier === 'star') { lo = 0; hi = 42; }
  if (ev.tier === 'slam') { lo = 0; hi = 80; }
  if (ev.tier === 'worlds' || ev.tier === 'finals') { lo = 0; hi = 16; }
  if (ev.tier === 'olympics') { lo = 0; hi = r.length; }
  let cands = r.slice(lo, hi).map(e => e.p);
  if (ev.tier === 'olympics') {
    const cnt = {}; if (withMe) cnt[career.me.country] = 1;
    cands = cands.filter(p => { cnt[p.country] = (cnt[p.country] || 0) + 1; return cnt[p.country] <= 2; });
  }
  const n = T.size - (withMe ? 1 : 0);
  const sel = ev.tier === 'worlds' || ev.tier === 'finals' || ev.tier === 'slam' || ev.tier === 'olympics' ? cands.slice(0, n) : cands.sort(() => rnd() - 0.5).slice(0, n);
  // le rival est souvent dans le même tournoi
  const rival = career.pool.find(p => p.rival);
  if (withMe && rival && !sel.includes(rival) && rnd() < 0.55 && ev.tier !== 'worlds' && ev.tier !== 'olympics') sel[sel.length - 1] = rival;
  if (withMe) sel.push(career.me);
  return sel;
}

export function makeDraw(ev, withMe) {
  const T = TIERS[ev.tier];
  const ps = entrants(ev, withMe).sort((a, b) => rating(b) - rating(a));
  const order = seedOrder(T.size);
  const slots = new Array(T.size);
  // têtes de série : les 4 premiers ; le reste mélangé
  const seeds = ps.slice(0, 4), others = ps.slice(4).sort(() => rnd() - 0.5);
  order.forEach((s, pos) => { slots[pos] = s <= 4 ? seeds[s - 1] : null; });
  for (let i = 0; i < slots.length; i++) if (!slots[i]) slots[i] = others.pop();
  const first = [];
  for (let i = 0; i < slots.length; i += 2) first.push({ a: slots[i].id, b: slots[i + 1].id, w: null, sc: null });
  return { ev, tier: ev.tier, size: T.size, rounds: [first], round: 0, done: false, out: false };
}

export const ROUND_NAMES = n => n === 1 ? 'Finale' : n === 2 ? 'Demi-finales' : n === 4 ? 'Quarts de finale' : n === 8 ? '8es de finale' : '16es de finale';

// sets à jouer pour le match du joueur
export function setsFor(tier, matchesInRound) {
  const L = career.length; // 0 rapide, 1 normal, 2 réel
  if (L === 0) return 1;
  const k = career.tour && career.tour.kind;
  if (L === 2) return k === 'double' || k === 'mixed' || k === 'team' || k === 'qualif' || k === 'exhib' ? 5 : (TIERS[tier] && TIERS[tier].best) || 5;
  if (k === 'double' || k === 'mixed') return 3;
  if (tier === 'olympics') tier = 'slam';
  if (tier === 'team') return 3;
  const final = matchesInRound === 1, late = matchesInRound <= 4;
  if (L === 1) return (tier === 'slam' || tier === 'worlds') && final ? 5 : 3;
  return late && (tier === 'slam' || tier === 'worlds' || tier === 'star') ? 5 : 3;
}

export function gameScores(sc) {
  // détail des manches (11-8, 9-11…) pour un score en manches
  const [a, b] = sc, out = [], seq = [];
  for (let i = 0; i < a; i++) seq.push(1); for (let i = 0; i < b; i++) seq.push(0);
  const last = seq.pop(); seq.sort(() => rnd() - 0.5); seq.push(last);
  for (const w of seq) { const close = rnd() < 0.35, l = close ? 9 + Math.floor(rnd() * 2) : 3 + Math.floor(rnd() * 6); const deuce = close && rnd() < 0.3; const W = deuce ? 12 + Math.floor(rnd() * 3) : 11, L = deuce ? W - 2 : l; out.push(w ? [W, L] : [L, W]); }
  return out;
}
function simScore(winnerA, sets) {
  const need = Math.floor(sets / 2) + 1;
  let a = 0, b = 0;
  while (a < need && b < need) { if (rnd() < (winnerA ? 0.64 : 0.36)) a++; else b++; }
  if (winnerA && a < need) a = need; if (!winnerA && b < need) b = need;
  if (winnerA) b = Math.min(b, need - 1); else a = Math.min(a, need - 1);
  return [a, b];
}

// simule tous les matchs du tour en cours sauf celui du joueur
function simRound(d) {
  const R = d.rounds[d.round];
  for (const m of R) {
    if (m.w) continue;
    if (m.a === 'me' || m.b === 'me') continue;
    const A = getP(m.a), B = getP(m.b);
    const aw = rnd() < winProb(A, B);
    m.w = aw ? m.a : m.b;
    if (!A.ent) A.form = ((A.form || '') + (aw ? 'V' : 'D')).slice(-5);
    if (!B.ent) B.form = ((B.form || '') + (aw ? 'D' : 'V')).slice(-5);
    m.sc = simScore(aw, d.kind === 'team' ? 5 : (TIERS[d.tier].best || 5));
  }
  const B = d.bronze;
  if (B && !B.w && B.a !== 'me' && B.b !== 'me') { const aw = rnd() < winProb(getP(B.a), getP(B.b)); B.w = aw ? B.a : B.b; B.sc = simScore(aw, 7); }
}

function nextRound(d) {
  const R = d.rounds[d.round];
  if (R.length === 1) { d.done = true; return; }
  if (R.length === 2 && d.kind === 'olympics') d.bronze = { a: R[0].w === R[0].a ? R[0].b : R[0].a, b: R[1].w === R[1].a ? R[1].b : R[1].a, w: null, sc: null };
  const nx = [];
  for (let i = 0; i < R.length; i += 2) nx.push({ a: R[i].w, b: R[i + 1].w, w: null, sc: null });
  d.rounds.push(nx); d.round++;
}

export function myMatch() {
  const d = career.tour;
  if (!d) return null;
  const B = d.bronze;
  if (B && !B.w && (B.a === 'me' || B.b === 'me')) return B;
  if (d.done || d.out) return null;
  if (d.stage === 'groups') return d.gm.find(m => (m.a === 'me' || m.b === 'me') && !m.w) || null;
  return d.rounds[d.round].find(m => m.a === 'me' || m.b === 'me') || null;
}
// adversaire individuel du match à jouer
export function myOpponent() {
  const d = career.tour, m = myMatch(); if (!m) return null;
  if (d.kind === 'team') return getP(m.opp);
  return getP(m.a === 'me' ? m.b : m.a);
}

// ---------- voyages : coûts et décalage horaire
const CITY_REGION = { Doha: 'me', Muscat: 'me', Mascate: 'me', Beyrouth: 'me', 'Hong Kong': 'as', Singapore: 'as', Singapour: 'as', Chongqing: 'as', Yokohama: 'as', Macao: 'as', Taiyuan: 'as', Almaty: 'as', China: 'as', Incheon: 'as',
  Tunis: 'af', Lagos: 'af', 'Rio de Janeiro': 'am', 'Buenos Aires': 'am', Lima: 'am', 'United States': 'am', Montpellier: 'eu', Frankfurt: 'eu', Europe: 'eu', Skopje: 'eu', Zagreb: 'eu', Antalya: 'eu', Istanbul: 'eu',
  Düsseldorf: 'eu', Varaždin: 'eu', Olomouc: 'eu', Otočec: 'eu', Havířov: 'eu', 'Vila Nova de Gaia': 'eu', Biella: 'eu', Cappadocia: 'eu', Panagyurishte: 'eu', Lille: 'eu', Paris: 'eu', Londres: 'eu', Shanghai: 'as', Tokyo: 'as', 'New York': 'am', Dubaï: 'me', Stockholm: 'eu', Rio: 'am' };
const COUNTRY_REGION = { FR: 'eu', DE: 'eu', SE: 'eu', DK: 'eu', SI: 'eu', HR: 'eu', SK: 'eu', RO: 'eu', HU: 'eu', AT: 'eu', PT: 'eu', ES: 'eu', IT: 'eu', BE: 'eu', PL: 'eu', CZ: 'eu', GB: 'eu', RU: 'eu',
  CN: 'as', JP: 'as', KR: 'as', TW: 'as', HK: 'as', SG: 'as', IN: 'as', KZ: 'as', IR: 'me', EG: 'af', NG: 'af', US: 'am', CA: 'am', BR: 'am', AR: 'am', MX: 'am', PR: 'am', CL: 'am', AU: 'oc' };
export function regionOf(ev) { for (const [c, r] of Object.entries(CITY_REGION)) if (ev.name.includes(c)) return r; return 'eu'; }
export function travelCost(ev) {
  const home = COUNTRY_REGION[career.me.country] || 'eu', r = regionOf(ev);
  let c = r === home ? 600 : 1700;
  if (['slam', 'finals', 'worlds', 'olympics', 'team'].includes(ev.tier)) c = Math.round(c * 0.5); // hôtel pris en charge
  if (ev.kind === 'exhib') c = 0;
  return c;
}
export function enterTournament(ev) {
  if (ev.kind !== 'qualif') {
    const cost = travelCost(ev), r = regionOf(ev);
    career.money -= cost; career.lastTravel = cost;
    if (career.lastRegion && career.lastRegion !== r && ev.kind !== 'exhib') { career.energy = clamp(career.energy - 8, 0, 100); career.news.unshift(`✈️ Décalage horaire : arrivée à ${ev.name.replace(/^WTT \w+ /, '')} un peu fatigué.`); }
    career.lastRegion = r;
    sst().events = (sst().events || 0) + 1; career.eventsTotal = (career.eventsTotal || 0) + 1;
  }
  career.tour = ev.kind === 'double' ? makeDoubleDraw(ev) : ev.kind === 'mixed' ? makeDoubleDraw(ev, true) : ev.kind === 'team' ? makeTeamDraw(ev)
    : ev.kind === 'exhib' ? makeExhib(ev) : ev.kind === 'qualif' ? makeQualif(ev) : ev.tier === 'worlds' ? makeGroupsDraw(ev) : makeDraw(ev, true);
  career.tour.kind = career.tour.kind || ev.kind || 'single';
  if (career.prep && career.prep.ev === ev.id.replace(/[dx]$/, '') && !ev.kind) { career.tour.peak = career.prep.n; career.conf = clamp((career.conf ?? 50) + 4 * career.prep.n, 5, 100); career.prep = null; }
  if ((career.wc || {})[ev.id]) career.tour.wildcard = true;
  if (ev.kind === 'team') prepTeamRound(career.tour);
  save();
  return career.tour;
}

// résultat du match du joueur
export function reportMatch(won, sets) {
  const d = career.tour, m = myMatch();
  if (!m) return;
  const oppId = m.a === 'me' ? m.b : m.a;
  const indiv = d.kind === 'team' ? m.opp : d.kind === 'double' || d.kind === 'mixed' ? null : oppId;
  let tieWon = won;
  if (d.kind === 'team') { const t = teamTie(d, m, won); tieWon = t.won; m.sc = m.a === 'me' ? t.sc : [t.sc[1], t.sc[0]]; m.mine = sets; }
  else m.sc = m.a === 'me' ? sets : [sets[1], sets[0]];
  m.w = tieWon ? 'me' : oppId;
  const S = sst();
  won ? S.wins++ : S.losses++;
  let better = false;
  if (indiv) {
    const op = getP(indiv), h = career.h2h[indiv] || { w: 0, l: 0 };
    won ? h.w++ : h.l++;
    career.h2h[indiv] = h;
    const oR = rankOf(indiv); better = oR < rankOf('me');
    if (won && (!S.best || oR < S.best.rank)) S.best = { name: op.name, rank: oR };
    if (won && op.sig) career.bossWins = (career.bossWins || 0) + 1;
    if (won && op.rival) career.rivalWins = (career.rivalWins || 0) + 1;
  }
  if (d.kind !== 'double') { career.streak = won ? (career.streak || 0) + 1 : 0; checkRecords(); }
  if (d.kind === 'double') career.chem = Math.min(6, (career.chem || 0) + 0.5);
  if (d.kind === 'mixed') career.mchem = Math.min(6, (career.mchem || 0) + 0.5);
  career.upPoints += Math.max(1, Math.round((won ? 3 : 1) * growthMult()));
  career.weekMatches = (career.weekMatches || 0) + 1;
  spendEnergy(10);
  const loss = [1, 0.7, 0.45][career.staff ? career.staff.psy : 0] * (career.me.perso === 'froid' ? 0.7 : 1);
  if (indiv) { const op = getP(indiv); if (op && !op.ent) op.form = ((op.form || '') + (won ? 'D' : 'V')).slice(-5); }
  career.me.form = ((career.me.form || '') + (won ? 'V' : 'D')).slice(-5);
  socialAfter(d, won, indiv);
  career.conf = clamp((career.conf ?? 50) + (won ? (better ? 10 : 5) : (better ? -4 : -10) * loss), 5, 100);
  addFans(won ? 60 * (TW[d.tier] || 1) : 10);
  if (d.kind === 'qualif') {
    if (won) { const ev = d.ev; career.tour = makeDraw(ev, true); career.tour.kind = 'single'; career.tour.fromQualif = true; career.news.unshift(`✅ ${career.me.name} sort des qualifications du ${ev.name}.`); }
    else { d.out = true; d.result = { pts: 0, prize: 0, reached: 'Qualifications' }; career.results.unshift({ season: career.season, week: career.week, name: d.ev.name, tier: d.tier, reached: 'Qualifications', pts: 0 }); }
    checkMilestones(); save(); return;
  }
  if (d.kind === 'exhib') {
    d.done = true; const fee = d.fee * (won ? 1.5 : 1); career.money += fee; career.earned = (career.earned || 0) + fee; addFans(won ? 6000 : 3000);
    d.result = { pts: 0, prize: fee, reached: won ? 'Victoire' : 'Défaite' }; career.news.unshift(`🎪 Exhibition : ${career.me.name} ${won ? 'bat' : 's\'incline face à'} ${getP(indiv).name} devant une salle comble.`);
    save(); return;
  }
  if (d.stage === 'groups') { groupProgress(d); pressAfter(d, m, won, indiv); checkMilestones(); save(); return; }
  if (m === d.bronze) { finishTournament(); pressAfter(d, m, won, indiv); checkMilestones(); save(); return; }
  simRound(d);
  if (!tieWon) {
    if (d.kind === 'olympics' && d.rounds[d.round].length === 2) { nextRound(d); simRound(d); nextRound(d); }
    else { d.out = true; while (!d.done) { nextRound(d); if (!d.done) simRound(d); } }
  } else {
    nextRound(d);
    if (!d.done) simRound(d);
  }
  if (d.kind === 'team' && !d.done && !d.out) prepTeamRound(d);
  const bronzeLeft = d.bronze && !d.bronze.w && (d.bronze.a === 'me' || d.bronze.b === 'me');
  if ((d.done || d.out) && !bronzeLeft) finishTournament();
  pressAfter(d, m, won, indiv);
  checkMilestones();
  save();
}

// points selon le tour atteint
function award(d) {
  const T = TIERS[d.tier], n = d.rounds.length;
  const res = {};
  const final = d.rounds[n - 1][0];
  if (final && final.w) { res[final.w] = T.pts[0]; res[final.w === final.a ? final.b : final.a] = T.pts[1]; }
  for (let r = n - 2; r >= 0; r--) {
    const idx = n - 1 - r + 1; // demi = 2, quart = 3...
    for (const m of d.rounds[r]) {
      const loser = m.w === m.a ? m.b : m.a;
      if (loser && res[loser] === undefined) res[loser] = T.pts[idx] || 0;
    }
  }
  return res;
}

export const medalTxt = m => m === 'or' ? "d'or" : m === 'argent' ? "d'argent" : 'de bronze';
function finishTournament() {
  const d = career.tour;
  if (d.awarded) return;
  d.awarded = true;
  const w = absWeek(career.season, career.week);
  const res = award(d);
  if (d.groups) for (const g of d.groups) for (const id of g) if (res[id] === undefined) res[id] = TIERS[d.tier].pts[4];
  if (d.kind === 'double' || d.kind === 'mixed') {
    for (const [id, p] of Object.entries(res)) { const E = d.ents[id]; if (E && p) for (const mid of E.members) { const pl = mid === 'me' ? career.me : career.pool.find(x => x.id === mid); if (pl) (pl.dpts = pl.dpts || []).push({ w, p: Math.round(p * (d.kind === 'mixed' ? 0.4 : 0.6)) }); } }
  } else for (const [id, p] of Object.entries(res)) { const pl = getP(id); if (pl && p) pl.pts.push({ w, p }); }
  const mine = res.me || 0;
  const idx = placeIdx(d);
  let prize = idx >= 0 ? (TIERS[d.tier].prize || [])[idx] || 0 : 0;
  if (d.kind === 'double' || d.kind === 'mixed') prize = Math.round(prize * 0.35);
  const finalM = d.rounds[d.rounds.length - 1][0];
  let medal = null;
  if (d.kind === 'olympics') {
    medal = finalM.w === 'me' ? 'or' : (finalM.a === 'me' || finalM.b === 'me') ? 'argent' : d.bronze && d.bronze.w === 'me' ? 'bronze' : null;
    if (medal) { setMoment({ type: 'medal', ev: d.ev.name, tier: d.tier, medal }); prize = { or: 60000, argent: 30000, bronze: 15000 }[medal]; (career.medals = career.medals || []).push({ medal, name: d.ev.name, season: career.season }); career.news.unshift(`🏅 ${career.me.name} décroche la médaille ${medalTxt(medal)} aux ${d.ev.name} !`); addFans({ or: 60000, argent: 30000, bronze: 18000 }[medal]); }
  }
  const gross = prize;
  const comm = Math.round(gross * [0, 0.1, 0.15][(career.staff || {}).agent || 0]);
  const tax = Math.round((gross - comm) * 0.25);
  prize = gross - comm - tax;
  if (prize) { career.money += prize; career.earned = (career.earned || 0) + prize; }
  const final = d.rounds[d.rounds.length - 1][0];
  const champion = final && final.w === 'me';
  d.result = { pts: mine, prize, gross, comm, tax, champion, reached: medal ? `Médaille ${medalTxt(medal)}` : roundReached(d), medal };
  if (champion) {
    career.titles.push({ name: d.ev.name, tier: d.tier, season: career.season, at: absWeek(career.season, career.week), dbl: d.kind === 'double' || d.kind === 'mixed' || undefined });
    career.upPoints += { challenger: 3, contender: 5, star: 8, slam: 15, worlds: 15, team: 8, olympics: 15 }[d.tier] * (d.kind === 'double' ? 0.5 : 1);
    addFans(4000 * (TW[d.tier] || 1) * (d.kind === 'double' ? 0.4 : 1));
    career.perkPts = (career.perkPts || 0) + 1;
    career.conf = clamp((career.conf ?? 50) + 15, 5, 100);
    setMoment({ type: d.kind === 'olympics' ? 'medal' : 'title', ev: d.ev.name, tier: d.tier, medal: d.kind === 'olympics' ? 'or' : null });
    career.news.unshift(d.kind === 'team' ? `🏆 ${COUNTRIES[career.me.country].name} remporte les Championnats du monde par équipes, avec ${career.me.name} !` : d.kind === 'olympics' ? `🥇 ${career.me.name} est champion olympique !` : `🏆 ${career.me.name} remporte le ${d.ev.name} !`);
  } else if (d.kind === 'single' || !d.kind) aiTitle(d);
  else if (d.kind === 'team') { const fw = finalM.w && getP(finalM.w); if (fw) career.news.unshift(`🌍 ${fw.name} remporte les Championnats du monde par équipes.`); }
  else if (d.kind === 'olympics') { const fw = finalM.w && getP(finalM.w); if (fw) career.news.unshift(`🥇 ${fw.name} est champion olympique.`); }
  const S = sst(); S.money += prize; if (champion) S.titles++;
  career.results.unshift({ season: career.season, week: career.week, name: d.ev.name, tier: d.tier, reached: d.result.reached, pts: mine });
  career.news = career.news.slice(0, 12);
}

// rang final du joueur dans le tournoi : 0 vainqueur, 1 finaliste, 2 demi…
function placeIdx(d) {
  const n = d.rounds.length;
  if (d.groups && !d.rounds.some(r => r.some(x => x.a === 'me' || x.b === 'me'))) return 4;
  for (let r = n - 1; r >= 0; r--) {
    const m = d.rounds[r].find(x => x.a === 'me' || x.b === 'me');
    if (!m) continue;
    if (r === n - 1 && d.rounds[r].length === 1) return m.w === 'me' ? 0 : 1;
    return Math.round(Math.log2(d.rounds[r].length)) + 1;
  }
  return -1;
}
function roundReached(d) {
  const n = d.rounds.length;
  if (d.groups && !d.rounds.some(r => r.some(x => x.a === 'me' || x.b === 'me'))) return 'Phase de poules';
  for (let r = n - 1; r >= 0; r--) {
    const m = d.rounds[r].find(x => x.a === 'me' || x.b === 'me');
    if (!m) continue;
    if (r === n - 1 && m.w === 'me' && d.done) return 'Vainqueur';
    return ROUND_NAMES(d.rounds[r].length);
  }
  return '—';
}

// points « hors écran » gagnés chaque semaine par les joueurs IA sur le reste du circuit
function aiIncome(pl) { const d = Math.max(0, pl.rating - 40); return Math.round(d * d * 0.06 * (0.5 + rnd())); }

// fin de semaine : les autres tournois de la semaine sont simulés, la semaine avance
export function endWeek() {
  const evs = weekEvents(career.season, career.week);
  const playedId = career.tour && career.tour.ev.id;
  for (const ev of evs) {
    if (ev.id === playedId || ['double', 'mixed', 'exhib', 'team'].includes(ev.kind)) continue;
    if (playedId && ev.id === playedId.replace(/^q:/, '')) continue;
    const d = makeDraw(ev, false);
    simRound(d);
    while (!d.done) { nextRound(d); if (!d.done) simRound(d); }
    const w = absWeek(career.season, career.week);
    for (const [id, p] of Object.entries(award(d))) { const pl = getP(id); if (pl && p) pl.pts.push({ w, p }); }
    aiTitle(d);
  }
  const wk = absWeek(career.season, career.week);
  // les joueurs IA ne gagnent des points qu'en tournoi ; le double reste estimé
  for (const p of career.pool) { const inc = aiIncome(p); if (inc) (p.dpts = p.dpts || []).push({ w: wk, p: Math.round(inc * 0.3) }); }
  // les meilleurs jouent aussi les tournois hors calendrier visible (Coupes continentales, ligues) : petit apport
  for (const p of career.pool) if (rnd() < 0.15) p.pts.push({ w: wk, p: Math.round(Math.max(0, p.rating - 60) * 6 * rnd()) });
  for (const p of career.pool) if (p.prodige) p.rating = Math.min(97, Math.max(p.rating, overall(career.me.stats) - 3) + 0.3);
  // le rival progresse avec toi
  const rival = career.pool.find(p => p.rival);
  if (rival) rival.rating = Math.min(97, Math.max(rival.rating, overall(career.me.stats) + 2) + 0.15);
  // petite évolution des autres joueurs
  for (const p of career.pool) if (!p.rival) p.rating = clamp(p.rating + (rnd() - 0.5) * 0.4, 38, 98);
  weekEconomy();
  career.tour = null;
  career.week++;
  rollWildcards();
  socialWeek();
  const rv = career.pool.find(p => p.rival);
  if (rv && rnd() < 0.04) { rv.rating = Math.min(97, rv.rating + 1); career.news.unshift(`🔧 Ton rival ${rv.name} a changé de matériel et travaille avec un nouveau coach.`); }
  trackRank();
  if (career.week > WEEKS) seasonEnd();
  // nettoyage des vieux points
  const now = absWeek(career.season, career.week);
  for (const p of allPlayers()) { p.pts = p.pts.filter(e => e.w > now - WEEKS - 1); if (p.dpts) p.dpts = p.dpts.filter(e => e.w > now - WEEKS - 1); }
  career.weekMatches = 0;
  save();
}

export function upgradeCost(v) { return v < 70 ? 1 : v < 85 ? 2 : 3; }
export function upgrade(k) {
  const v = career.me.stats[k], c = upgradeCost(v);
  if (v >= 99 || career.upPoints < c) return false;
  career.me.stats[k]++; career.upPoints -= c; save();
  return true;
}

// fiche de repérage : forces et faiblesses
export function scout(pl) {
  const st = pl.id === 'me' ? pl.stats : pl.stats;
  const sorted = [...STAT_KEYS].sort((a, b) => st[b] - st[a]);
  return { best: sorted.slice(0, 2).map(k => STAT_NAMES[k]), worst: sorted.slice(-2).map(k => STAT_NAMES[k]) };
}

// drapeau en CSS
export function flag(code, w = 24, h = 16) {
  const f = COUNTRIES[code] ? COUNTRIES[code].flag : ['v', '#888', '#aaa', '#888'];
  let bg;
  if (f[0] === 'v') bg = `linear-gradient(90deg, ${f[1]} 33.3%, ${f[2]} 33.3% 66.6%, ${f[3]} 66.6%)`;
  else if (f[0] === 'v2') bg = `linear-gradient(90deg, ${f[1]} 40%, ${f[2]} 40%)`;
  else if (f[0] === 'h') bg = `linear-gradient(180deg, ${f[1]} 33.3%, ${f[2]} 33.3% 66.6%, ${f[3]} 66.6%)`;
  else if (f[0] === 'h2') bg = `linear-gradient(180deg, ${f[1]} 50%, ${f[2]} 50%)`;
  else if (f[0] === 'h3') bg = `linear-gradient(180deg, ${f[1]} 25%, ${f[2]} 25% 75%, ${f[3]} 75%)`;
  else if (f[0] === 'nordic') bg = `linear-gradient(90deg, transparent 30%, ${f[2]} 30% 42%, transparent 42%), linear-gradient(180deg, ${f[1]} 42%, ${f[2]} 42% 58%, ${f[1]} 58%)`;
  else if (f[0] === 'jp') bg = 'radial-gradient(circle at 50% 50%, #bc002d 28%, #fff 29%)';
  else if (f[0] === 'cn') bg = 'radial-gradient(circle at 22% 30%, #ffde00 12%, transparent 13%), #de2910';
  else if (f[0] === 'kr') bg = 'radial-gradient(circle at 50% 50%, #cd2e3a 0 14%, #0047a0 14% 24%, #fff 25%)';
  else if (f[0] === 'br') bg = 'radial-gradient(circle at 50% 50%, #002776 18%, transparent 19%), linear-gradient(45deg, transparent 30%, #fedf00 30% 70%, transparent 70%), linear-gradient(-45deg, transparent 30%, #fedf00 30% 70%, transparent 70%), #009c3b';
  else if (f[0] === 'us') bg = 'linear-gradient(90deg, #3c3b6e 40%, transparent 40%) top left / 100% 54% no-repeat, repeating-linear-gradient(180deg, #b22234 0 7.7%, #fff 7.7% 15.4%)';
  else if (f[0] === 'tpe') bg = 'radial-gradient(circle at 50% 50%, #fff 14%, #0047ab 15% 26%, #fff 27%)';
  else if (f[0] === 'hk') bg = 'radial-gradient(circle at 50% 50%, #fff 22%, #de2910 23%)';
  else if (f[0] === 'kz') bg = 'radial-gradient(circle at 50% 45%, #fec50c 18%, #00afca 19%)';
  else if (f[0] === 'gb') bg = 'linear-gradient(90deg, transparent 42%, #c8102e 42% 58%, transparent 58%), linear-gradient(180deg, transparent 38%, #c8102e 38% 62%, transparent 62%), linear-gradient(90deg, transparent 38%, #fff 38% 62%, transparent 62%), linear-gradient(180deg, transparent 32%, #fff 32% 68%, transparent 68%), #012169';
  return `<span class="flag" style="width:${w}px;height:${h}px;background:${bg}"></span>`;
}


// ================================================================== partie 2 : énergie, entraînement, coach, sponsors, matériel
export function migrate() {
  if (!career) return;
  const d = { wc: {}, center: { salle: 0, robot: 0, recup: 0 }, prep: null, mpartner: null, feed: [], outfits: [], celeb: 0, tips: {}, fans: 1500, staff: { physio: 0, kine: 0, psy: 0, agent: 0 }, partner: null, chem: 0, injury: null, press: null, medals: [], conf: 50, perks: [], perkPts: 1, money: 500, energy: 100, coach: 0, sponsor: null, offers: [], gear: { bois: 0, rev: 0, shoes: 0 }, trained: 0, earned: 0 };
  for (const k in d) if (career[k] === undefined) career[k] = d[k];
  if (!career.me.prog) career.me.prog = {};
  soc();
  if (career.sponsor) { contracts().perso = { ...career.sponsor, slot: 'perso' }; career.sponsor = null; }
  if (!career.wpool) career.wpool = REAL_WOMEN.map((r, i) => ({ id: 'w' + i, name: r[0], country: r[1], age: r[2], style: 'attaquant', hand: r[3] || 1, rating: Math.round(90 - i * 0.9), stats: makeStats(Math.round(90 - i * 0.9), 'attaquant'), pts: [], wins: {}, woman: true }));
}
const staminaOf = () => effStats().stamina;
export function spendEnergy(n) {
  career.energy = clamp(Math.round(career.energy - n * (1.3 - staminaOf() / 100)), 0, 100);
}
// forme : multiplie les stats en match
export const formOf = () => 0.82 + 0.18 * (career.energy / 100);
export const formLabel = e => e >= 75 ? 'En pleine forme' : e >= 50 ? 'Correct' : e >= 25 ? 'Fatigué' : 'Épuisé';

// ---------- matériel
export const GEAR = {
  bois: { name: 'Bois', items: [
    { name: 'Butterfly Primorac', price: 0, b: {} },
    { name: 'Stiga Clipper CR', price: 1500, b: { fh: 2, bh: 2 } },
    { name: 'Butterfly Viscaria', price: 6000, b: { fh: 4, bh: 4 } },
    { name: 'Butterfly Zhang Jike ZLC', price: 18000, b: { fh: 6, bh: 6, serve: 1 } } ] },
  rev: { name: 'Revêtements', items: [
    { name: 'Yasaka Mark V', price: 0, b: {} },
    { name: 'Tibhar Evolution MX-P', price: 1200, b: { spin: 3 } },
    { name: 'DHS Hurricane 3 Neo', price: 5000, b: { spin: 5, serve: 2 } },
    { name: 'Butterfly Dignics 09C', price: 15000, b: { spin: 7, serve: 3, fh: 1 } } ] },
  shoes: { name: 'Chaussures', items: [
    { name: 'Kalenji (Decathlon)', price: 0, b: {} },
    { name: 'Asics Attack Excounter', price: 1000, b: { speed: 3 } },
    { name: 'Mizuno Wave Medal', price: 4000, b: { speed: 5, stamina: 2 } },
    { name: 'Butterfly Lezoline', price: 12000, b: { speed: 7, stamina: 4 } } ] },
};
export function gearBonus() {
  const b = {};
  for (const slot in GEAR) { const it = GEAR[slot].items[career.gear[slot] || 0]; for (const k in it.b) b[k] = (b[k] || 0) + it.b[k]; }
  return b;
}
export function effStats() {
  const b = gearBonus(), st = {};
  const pb = perkBonus();
  const pk = career.tour && career.tour.peak ? career.tour.peak * 2 : 0;
  if (pk) for (const k of STAT_KEYS) pb[k] = (pb[k] || 0) + pk;
  if (career.me.perso === 'combatif') pb.mental = (pb.mental || 0) + 3;
  for (const k of STAT_KEYS) st[k] = Math.min(99, career.me.stats[k] + (b[k] || 0) + (pb[k] || 0) + (k === 'mental' && COACHES[career.coach] ? COACHES[career.coach].mental : 0) + (k === 'mental' && career.staff ? [0, 2, 4][career.staff.psy] : 0));
  return st;
}
export function gearPrice(it) { const E = contracts().equip; return E && E.brand && it.name.startsWith(E.brand) ? 0 : it.price; }
export function buyGear(slot, i) {
  const it = GEAR[slot].items[i];
  if (!it || i <= (career.gear[slot] || 0) || career.money < gearPrice(it)) return false;
  career.money -= gearPrice(it); career.gear[slot] = i; save();
  return true;
}

// ---------- coach
export const COACHES = [
  { name: 'Pas de coach', cost: 0, mult: 1, mental: 0, desc: 'Tu t\'entraînes seul.' },
  { name: 'Coach du club', cost: 150, mult: 1.4, mental: 0, desc: 'Entraînement +40 %.' },
  { name: 'Coach national', cost: 600, mult: 1.8, mental: 2, desc: 'Entraînement +80 %, +2 en mental.' },
  { name: 'Coach légendaire', cost: 2200, mult: 2.5, mental: 5, desc: 'Entraînement +150 %, +5 en mental, conseils tactiques.' },
];
export function hireCoach(i) { if (!COACHES[i]) return false; career.coach = i; save(); return true; }

// ---------- entraînement (une séance par semaine)
export const canTrain = () => career.trained !== absWeek(career.season, career.week);
export function trainExtra(k, quality) {
  const v = career.me.stats[k];
  const gain = (0.4 + 1.0 * quality) * COACHES[career.coach].mult * growthMult() / (v < 70 ? 1 : v < 85 ? 1.6 : 2.4);
  let pr = (career.me.prog[k] || 0) + gain;
  while (pr >= 1 && career.me.stats[k] < 99) { pr -= 1; career.me.stats[k]++; }
  career.me.prog[k] = pr; save();
}
export function train(k, quality) {
  if (!canTrain()) return null;
  const v = career.me.stats[k];
  quality = Math.min(1, quality + 0.07 * ((career.center || {}).robot || 0));
  const gain = (0.6 + 1.6 * quality) * COACHES[career.coach].mult * growthMult() * (1 + 0.15 * ((career.center || {}).salle || 0)) / (v < 70 ? 1 : v < 85 ? 1.6 : 2.4);
  if (career.prep) career.prep.n = Math.min(3, career.prep.n + 1);
  career.me.prog = career.me.prog || {};
  let pr = (career.me.prog[k] || 0) + gain, up = 0;
  while (pr >= 1 && career.me.stats[k] < 99) { pr -= 1; career.me.stats[k]++; up++; }
  career.me.prog[k] = pr;
  career.trained = absWeek(career.season, career.week);
  spendEnergy(12);
  save();
  return { up, gain };
}

// ---------- sponsors
const SPONSORS = [
  // équipementiers : fournissent le matériel de la marque
  { id: 'donic', slot: 'equip', name: 'Donic', rank: 999, weekly: 80, goal: { t: 'rank', v: 120 }, reward: 1500, color: '#3cc8ff', brand: null, min: 5 },
  { id: 'tibhar', slot: 'equip', name: 'Tibhar', rank: 110, weekly: 250, goal: { t: 'title', tier: 'challenger' }, reward: 3000, color: '#ff3d6b', brand: 'Tibhar', min: 6 },
  { id: 'stiga', slot: 'equip', name: 'Stiga', rank: 70, weekly: 700, goal: { t: 'title', tier: 'contender' }, reward: 10000, color: '#c84dff', brand: 'Stiga', min: 8 },
  { id: 'dhs', slot: 'equip', name: 'DHS', rank: 40, weekly: 1400, goal: { t: 'rank', v: 20 }, reward: 20000, color: '#ff4040', brand: 'DHS', min: 8 },
  { id: 'butterfly', slot: 'equip', name: 'Butterfly', rank: 25, weekly: 2400, goal: { t: 'rank', v: 10 }, reward: 40000, color: '#ffffff', brand: 'Butterfly', min: 9 },
  // vêtements
  { id: 'kipsta', slot: 'cloth', name: 'Decathlon', rank: 999, weekly: 60, goal: { t: 'rank', v: 100 }, reward: 1000, color: '#3cff8a', min: 4 },
  { id: 'lining', slot: 'cloth', name: 'Li-Ning', rank: 80, weekly: 500, goal: { t: 'title', tier: 'contender' }, reward: 6000, color: '#ff5050', min: 6 },
  { id: 'adidas', slot: 'cloth', name: 'Adidas', rank: 30, weekly: 1500, goal: { t: 'rank', v: 16 }, reward: 20000, color: '#eaeaea', min: 8 },
  { id: 'nike', slot: 'cloth', name: 'Nike', rank: 10, weekly: 3500, goal: { t: 'title', tier: 'slam' }, reward: 60000, color: '#ffa23d', min: 8 },
  // partenaires personnels
  { id: 'bnp', slot: 'perso', name: 'BNP Paribas', rank: 90, weekly: 300, goal: { t: 'rank', v: 50 }, reward: 5000, color: '#3dd68c', min: 0 },
  { id: 'samsung', slot: 'perso', name: 'Samsung', rank: 45, weekly: 900, goal: { t: 'title', tier: 'star' }, reward: 15000, color: '#3d8bff', min: 0 },
  { id: 'redbull', slot: 'perso', name: 'Red Bull', rank: 16, weekly: 3000, goal: { t: 'title', tier: 'slam' }, reward: 60000, color: '#ffc83c', min: 0 },
  { id: 'hugoboss', slot: 'perso', name: 'Hugo Boss', rank: 8, weekly: 4500, goal: { t: 'rank', v: 3 }, reward: 80000, color: '#d8d8d8', min: 0 },
];
export const SLOT_NAMES = { equip: 'Équipementier', cloth: 'Vêtements', perso: 'Partenaire personnel' };
export function contracts() { career.contracts = career.contracts || { equip: null, cloth: null, perso: null }; return career.contracts; }
export function mainSponsor() { const K = contracts(); return K.equip || K.cloth || K.perso || null; }
export const goalText = g => g.t === 'rank' ? `Entrer dans le top ${g.v} mondial` : `Gagner un tournoi ${TIERS[g.tier].name}`;
export function sponsorOffers(slot) {
  const rk = rankOf('me'), K = contracts();
  return SPONSORS.filter(s => (!slot || s.slot === slot) && rk <= s.rank && !(K[s.slot] && K[s.slot].id === s.id) && !(career.doneSponsors || []).includes(s.id));
}
export function signSponsor(id) {
  const s = SPONSORS.find(x => x.id === id);
  if (!s) return false;
  contracts()[s.slot] = { since: absWeek(career.season, career.week), id: s.id, slot: s.slot, name: s.name, weekly: s.weekly, goal: s.goal, reward: s.reward, color: s.color, left: WEEKS, brand: s.brand || null, min: s.min || 0, evStart: career.eventsTotal || 0 };
  career.news.unshift(`✍ ${career.me.name} signe avec ${s.name}.`);
  save();
  return true;
}
function checkSponsorGoal(S) {
  if (!S || S.done) return;
  const g = S.goal;
  const ok = g.t === 'rank' ? rankOf('me') <= g.v : career.titles.some(t => t.tier === g.tier && t.at >= S.since);
  if (ok) { S.done = true; career.money += S.reward; career.news.unshift(`🎯 Objectif ${S.name} atteint : +${S.reward.toLocaleString('fr-FR')} € de prime !`); }
}
function weekEconomy() {
  const K = contracts();
  for (const slot in K) {
    const S = K[slot]; if (!S) continue;
    career.money += Math.round(S.weekly * sponsorMult()); checkSponsorGoal(S); S.left--;
    if (S.left <= 0) {
      const played = (career.eventsTotal || 0) - (S.evStart || 0);
      if (S.min && played < S.min) { const pen = Math.round(S.weekly * WEEKS * 0.25); career.money -= pen; career.news.unshift(`⚠️ ${S.name} : obligation non tenue (${played}/${S.min} tournois), pénalité de ${pen.toLocaleString('fr-FR')} €.`); }
      else career.news.unshift(`Fin du contrat avec ${S.name}.`);
      career.doneSponsors = [...(career.doneSponsors || []), S.id]; K[slot] = null;
    }
  }
  const c = COACHES[career.coach];
  if (c.cost) {
    if (career.money >= c.cost) career.money -= c.cost;
    else { career.news.unshift(`${c.name} est parti : plus assez d'argent pour le payer.`); career.coach = 0; }
  }
  for (const role in STAFF) {
    const lv = (career.staff || {})[role] || 0, cost = STAFF[role].levels[lv].cost;
    if (!cost) continue;
    if (career.money >= cost) career.money -= cost;
    else { career.news.unshift(`${STAFF[role].levels[lv].name} est parti : plus assez d'argent.`); career.staff[role] = 0; }
  }
  if (rankOf('me') > 50 && (career.me.age || 17) < 24) { career.money += 250; }
  career.energy = clamp(career.energy + (career.tour ? 18 : 40) + [0, 6, 12][(career.staff || {}).physio || 0] + 5 * ((career.center || {}).recup || 0), 0, 100);
  injuryRoll();
}


// ================================================================== partie 3 : actus, trophées, saisons, Hall of Fame
function sst() {
  if (!career.sstats || career.sstats.season !== career.season) career.sstats = { season: career.season, money: 0, wins: 0, losses: 0, titles: 0, best: null };
  return career.sstats;
}
const TITLE_W = { challenger: 1, contender: 2, star: 4, slam: 10, worlds: 12, team: 6, olympics: 15 };
const TW = { challenger: 1, contender: 1.5, star: 2.5, slam: 4, worlds: 4, team: 3, olympics: 5 };
function aiTitle(d) {
  const final = d.rounds[d.rounds.length - 1][0];
  if (!final || !final.w || final.w === 'me') return;
  const w = getP(final.w), lo = getP(final.w === final.a ? final.b : final.a);
  if (!w || !w.wins) return;
  w.wins[d.tier] = (w.wins[d.tier] || 0) + 1;
  if (d.tier === 'challenger' || d.tier === 'contender') { if (w.rival) career.news.unshift(`⚔ Ton rival ${w.name} remporte le ${d.ev.name}.`); return; }
  const wr = rankOf(w.id);
  if (d.tier === 'worlds') career.news.unshift(`🌍 ${w.name} est champion du monde !`);
  else if (wr > 25) career.news.unshift(`😱 Énorme surprise : ${w.name} (${wr}e mondial) remporte le ${d.ev.name} !`);
  else if (w.wins[d.tier] >= 3 && d.tier === 'slam') career.news.unshift(`👑 ${w.name} décroche déjà son ${w.wins.slam}e Grand Smash au ${d.ev.name}.`);
  else career.news.unshift(`${w.name} bat ${lo ? lo.name : '?'} en finale du ${d.ev.name}.`);
  career.news = career.news.slice(0, 14);
}

// ---------- jalons de carrière
export const MILESTONES = [
  { id: 'first_win', name: 'Premier pas', desc: 'Gagner ton premier match pro' },
  { id: 'first_title', name: 'Premier trophée', desc: 'Remporter un tournoi' },
  { id: 'top100', name: 'Top 100', desc: 'Entrer dans le top 100 mondial' },
  { id: 'top50', name: 'Top 50', desc: 'Entrer dans le top 50' },
  { id: 'top10', name: 'Top 10', desc: 'Entrer dans le top 10' },
  { id: 'no1', name: 'Numéro 1 mondial', desc: 'Prendre la première place' },
  { id: 'contender', name: 'WTT Contender', desc: 'Gagner un WTT Contender' },
  { id: 'star', name: 'WTT Champions', desc: 'Gagner un WTT Champions' },
  { id: 'slam', name: 'Grand Smash', desc: 'Gagner un Grand Smash' },
  { id: 'worlds', name: 'Champion du monde', desc: 'Gagner les Championnats du monde' },
  { id: 'boss', name: 'Chasseur de boss', desc: 'Battre un joueur à coup signature' },
  { id: 'rival5', name: 'Rivalité réglée', desc: 'Battre ton rival 5 fois' },
  { id: 'rich', name: 'Millionnaire… presque', desc: 'Gagner 100 000 € en carrière' },
  { id: 'veteran', name: 'Vétéran', desc: 'Terminer 3 saisons' },
  { id: 'hof', name: 'Hall of Fame', desc: 'Atteindre 100 points d\'héritage' },
];
export function checkMilestones() {
  career.milestones = career.milestones || {};
  const M = career.milestones, rk = rankOf('me'), T = career.titles;
  const has = t => T.some(x => x.tier === t && !x.dbl);
  const cond = {
    first_win: Object.values(career.h2h).some(h => h.w > 0), first_title: T.length > 0,
    top100: rk <= 100, top50: rk <= 50, top10: rk <= 10, no1: rk === 1,
    contender: has('contender'), star: has('star'), slam: has('slam'), worlds: has('worlds'),
    boss: (career.bossWins || 0) > 0, rival5: (career.rivalWins || 0) >= 5, rich: (career.earned || 0) >= 100000,
    veteran: (career.seasons || []).length >= 3, hof: legacy() >= 100,
  };
  const out = [];
  for (const m of MILESTONES) if (cond[m.id] && !M[m.id]) {
    M[m.id] = { season: career.season, week: career.week }; out.push(m);
    career.perkPts = (career.perkPts || 0) + 1;
    if (['top100', 'top50', 'top10', 'no1'].includes(m.id)) career.news.unshift(`📈 ${career.me.name} entre dans le ${m.name.toLowerCase()} mondial !`.replace('dans le numéro 1 mondial mondial', 'à la 1re place mondiale'));
  }
  career.pending = [...(career.pending || []), ...out];
  unlockOutfit();
  return out;
}
export function takePending() { const p = career.pending || []; career.pending = []; save(); return p; }

function trackRank() {
  const rk = rankOf('me');
  if (rk === 1 && !career.firstNo1Age) career.firstNo1Age = career.me.age || 17;
  career.bestRank = Math.min(career.bestRank || 999, rk);
  if (rk === 1) career.weeksNo1 = (career.weeksNo1 || 0) + 1;
  if (rk <= 10) career.weeksTop10 = (career.weeksTop10 || 0) + 1;
  checkRecords();
  checkMilestones();
}
export function legacy() {
  let L = career.titles.reduce((a, t) => a + (TITLE_W[t.tier] || 0) * (t.dbl ? 0.4 : 1), 0);
  L += (career.weeksNo1 || 0) * 1 + (career.weeksTop10 || 0) * 0.2;
  return Math.round(L);
}

// ---------- fin de saison : bilan, vieillissement, retraites, nouveaux joueurs
function seasonEnd() {
  const S = sst();
  career.seasons = career.seasons || [];
  const rev = { season: career.season, rank: rankOf('me'), titles: career.titles.filter(t => t.season === career.season).map(t => t.name),
    money: S.money, wins: S.wins, losses: S.losses, best: S.best, ov: overall(career.me.stats), retired: [], legacy: legacy() };
  const champ = ranking()[0].p;
  rev.no1 = champ.name;
  // vieillissement
  const codes = Object.keys(COUNTRIES).filter(c => COUNTRIES[c].first);
  const used = new Set(allPlayers().map(p => p.name));
  for (let i = 0; i < career.pool.length; i++) {
    const p = career.pool[i];
    if (p.rival) continue;
    p.age = (p.age || 25) + 1;
    p.rating = clamp(p.rating + (p.age < 22 ? rnd() * 3 : p.age < 26 ? rnd() * 1.6 - 0.4 : p.age < 31 ? (rnd() - 0.55) * 1.6 : -rnd() * 2.8), 38, 97);
    p.stats = makeStats(Math.round(p.rating), p.style);
    if ((p.age >= 34 && rnd() < 0.45) || p.age >= 37) {
      rev.retired.push(p.name);
      if (career.partner === p.id) { career.partner = null; career.chem = 0; career.news.unshift(`👋 Ton partenaire de double ${p.name} prend sa retraite. Trouve un nouveau partenaire.`); }
      const big = (p.wins && ((p.wins.slam || 0) + (p.wins.worlds || 0))) || 0;
      if (big > 0 || p.sig) {
        career.legends = career.legends || [];
        career.legends.push({ name: p.name, country: p.country, slams: (p.wins && p.wins.slam) || 0, worlds: (p.wins && p.wins.worlds) || 0, stars: (p.wins && p.wins.star) || 0, season: career.season });
      }
      const c = pick(codes), C = COUNTRIES[c];
      let name; do { name = `${pick(C.first)} ${pick(C.last)}`; } while (used.has(name));
      used.add(name);
      const r = 46 + rnd() * 16, st = pick(STYLE_IDS);
      career.pool[i] = { id: 'n' + career.season + '_' + i, name, country: c, hand: rnd() < 0.15 ? -1 : 1, style: st, rating: r, stats: makeStats(Math.round(r), st), pts: [], age: 17 + Math.floor(rnd() * 3), wins: {}, young: true };
    }
  }
  // les coups signature restent dans le top 10
  const sigs = Object.keys(SIGNATURES);
  const top = ranking().filter(e => e.p.id !== 'me' && !e.p.rival).slice(0, 10).map(e => e.p);
  const free = sigs.filter(s => !career.pool.some(p => p.sig === s && top.includes(p)));
  for (const p of career.pool) if (p.sig && !top.includes(p)) delete p.sig;
  for (const p of top) if (!p.sig && free.length) p.sig = free.shift();
  if (!career.pool.some(p => p.prodige)) {
    const y = career.pool.filter(p => p.young && !p.rival).sort((a, b) => b.rating - a.rating)[0];
    if (y) { y.prodige = true; y.rating = Math.max(y.rating, overall(career.me.stats) - 4); y.stats = makeStats(Math.round(y.rating), y.style); career.news.unshift(`⭐ Un jeune prodige débarque : ${y.name} (${y.age} ans) vise déjà ta place.`); }
  }
  ageMe(rev);
  career.seasons.push(rev);
  career.perkPts = (career.perkPts || 0) + 1;
  career.review = rev;
  career.week = 1; career.season++;
  career.news.unshift(`🎆 Saison ${career.season} : c'est reparti !`);
  if (rev.retired.length) career.news.unshift(`👋 ${rev.retired.slice(0, 3).join(', ')}${rev.retired.length > 3 ? ` et ${rev.retired.length - 3} autres` : ''} prennent leur retraite.`);
  checkMilestones();
}


// ================================================================== partie A : confiance, talents, simulation
export const confLabel = c => c >= 80 ? 'En feu' : c >= 60 ? 'Confiant' : c >= 40 ? 'Neutre' : c >= 20 ? 'Dans le doute' : 'Au fond du trou';
// confiance : élargit ou resserre la fenêtre de timing en match
export const confScale = () => 0.85 + 0.3 * ((career.conf ?? 50) / 100);

export const PERK_TREE = [
  { id: 'atk', name: 'Attaque', color: '#ff3d6b', perks: [
    { id: 'fh4', name: 'Coup droit lourd', desc: '+4 en coup droit', cost: 1, b: { fh: 4 } },
    { id: 'bh4', name: 'Revers explosif', desc: '+4 en revers', cost: 1, b: { bh: 4 } },
    { id: 'eclair', name: 'Contre éclair', desc: 'Tes contres partent beaucoup plus vite', cost: 2, sig: 'eclair' },
    { id: 'canon', name: 'Coup de canon', desc: 'Coups droits frappés et liftés surpuissants', cost: 3, sig: 'canon' } ] },
  { id: 'spin', name: 'Effet & service', color: '#c84dff', perks: [
    { id: 'sv4', name: 'Service travaillé', desc: '+4 au service', cost: 1, b: { serve: 4 } },
    { id: 'sp4', name: 'Poignet souple', desc: '+4 en effet', cost: 1, b: { spin: 4 } },
    { id: 'fantome', name: 'Service fantôme', desc: 'Énorme effet latéral sur tes services', cost: 2, sig: 'fantome' },
    { id: 'tornade', name: 'Tornade', desc: 'Tes lifts ont un effet monstrueux', cost: 3, sig: 'tornade' } ] },
  { id: 'def', name: 'Défense & mental', color: '#3cc8ff', perks: [
    { id: 'spd4', name: 'Jeu de jambes', desc: '+4 en vitesse', cost: 1, b: { speed: 4 } },
    { id: 'mt4', name: 'Sang-froid', desc: '+4 en mental', cost: 1, b: { mental: 4 } },
    { id: 'mur', name: 'Le Mur', desc: 'Presque aucune faute en bloc, coupé et lob', cost: 2, sig: 'mur' },
    { id: 'roc', name: 'Mental de roc', desc: 'Ta fenêtre de timing ne rétrécit jamais sous la pression', cost: 3, sig: 'roc' } ] },
];
const PERKS = PERK_TREE.flatMap(t => t.perks.map((p, i) => ({ ...p, tree: t.id, idx: i })));
export function perkBonus() {
  const b = {};
  for (const id of career.perks || []) { const p = PERKS.find(x => x.id === id); if (p && p.b) for (const k in p.b) b[k] = (b[k] || 0) + p.b[k]; }
  return b;
}
export const mySigs = () => (career.perks || []).map(id => PERKS.find(x => x.id === id)).filter(p => p && p.sig).map(p => p.sig);
export function perkState(id) {
  const p = PERKS.find(x => x.id === id), own = (career.perks || []).includes(id);
  const prev = p.idx === 0 || (career.perks || []).includes(PERK_TREE.find(t => t.id === p.tree).perks[p.idx - 1].id);
  return { own, open: prev, can: !own && prev && (career.perkPts || 0) >= p.cost };
}
export function buyPerk(id) {
  const p = PERKS.find(x => x.id === id);
  if (!p || !perkState(id).can) return false;
  career.perks = [...(career.perks || []), id]; career.perkPts -= p.cost; save();
  return true;
}

// match simulé (le joueur ne joue pas)
export function simulateMatch(bestOf) {
  const m = myMatch(); if (!m) return null;
  const o = myOpponent();
  const base = career.tour.kind === 'double' ? getP('me').rating : rating(career.me);
  const mine = base * formOf() + ((career.conf ?? 50) - 50) / 10;
  const p = 1 / (1 + Math.exp(-(mine - rating(o) - diffAI()) / 5.5));
  const won = rnd() < p;
  const need = Math.floor(bestOf / 2) + 1;
  let a = 0, b = 0;
  while (a < need && b < need) { if (rnd() < (won ? 0.65 : 0.35)) a++; else b++; }
  if (won && a < need) a = need; if (!won && b < need) b = need;
  if (won) b = Math.min(b, need - 1); else a = Math.min(a, need - 1);
  return { won, sets: [a, b], o };
}


// ================================================================== partie B : staff, blessures, fans, presse, double, équipes, JO
export const STAFF = {
  physio: { name: 'Préparateur physique', desc: 'Moins de blessures, meilleure récupération', levels: [{ name: 'Aucun', cost: 0 }, { name: 'Préparateur physique', cost: 300 }, { name: 'Préparateur de l\'équipe nationale', cost: 1200 }] },
  kine: { name: 'Kiné', desc: 'Guérison plus rapide des blessures', levels: [{ name: 'Aucun', cost: 0 }, { name: 'Kiné', cost: 250 }, { name: 'Kiné du circuit WTT', cost: 900 }] },
  psy: { name: 'Préparateur mental', desc: 'Confiance plus stable, +mental', levels: [{ name: 'Aucun', cost: 0 }, { name: 'Préparateur mental', cost: 200 }, { name: 'Psychologue du sport', cost: 800 }] },
  agent: { name: 'Agent', desc: 'Sponsors mieux payés, plus de fans · prend une commission sur tes gains', levels: [{ name: 'Aucun', cost: 0 }, { name: 'Agent (10 %)', cost: 0 }, { name: 'Agent star (15 %)', cost: 0 }] },
};
export function hireStaff(role, lv) { career.staff = career.staff || {}; career.staff[role] = lv; save(); }
export function sponsorMult() { return (1 + Math.min(1.5, (career.fans || 0) / 150000)) * [1, 1.25, 1.5][(career.staff || {}).agent || 0]; }
export function addFans(n) {
  const k = n * [1, 1.2, 1.4][(career.staff || {}).agent || 0];
  const S = soc();
  for (const pl in PLATFORMS) S[pl].f = Math.max(0, Math.round(S[pl].f + k * PLATFORMS[pl].share * (0.8 + rnd() * 0.4)));
  syncFans();
}
export const fansLabel = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' M' : n >= 1000 ? Math.round(n / 1000) + ' k' : String(n);

// ---------- blessures
const INJ = ['Douleur au poignet', 'Lombalgie', 'Élongation à la cuisse', 'Tendinite à l\'épaule', 'Entorse de la cheville', 'Douleur au coude'];
function injuryRoll() {
  if (career.injury) {
    career.injury.weeks--;
    if (career.injury.weeks <= 0) { career.news.unshift(`💪 ${career.me.name} est remis de sa blessure.`); career.injury = null; }
    return;
  }
  const e = career.energy;
  let risk = 0.011 * (career.weekMatches || 0) + (career.trained === absWeek(career.season, career.week) ? 0.008 : 0) + (e < 40 ? (40 - e) * 0.004 : 0);
  risk *= [1, 0.6, 0.35][(career.staff || {}).physio || 0] * [0.7, 1, 1.5][career.diff ?? 1];
  if (rnd() < risk) {
    const weeks = Math.max(1, Math.round((1 + rnd() * 3) * [1, 0.7, 0.5][(career.staff || {}).kine || 0]));
    career.injury = { weeks, name: pick(INJ) };
    career.news.unshift(`🩹 ${career.me.name} est blessé (${career.injury.name.toLowerCase()}) : ${weeks} semaine${weeks > 1 ? 's' : ''} d'arrêt.`);
    career.conf = clamp((career.conf ?? 50) - 8, 5, 100);
  }
}

// ---------- rivaux
export function rivals() {
  return career.pool.filter(p => p.rival || p.prodige || p.enemy).map(p => ({ p, type: p.rival ? 'Rival' : p.prodige ? 'Jeune prodige' : 'Ennemi juré' }));
}

// ---------- conférences de presse
function pressAfter(d, m, won, indiv) {
  const op = indiv ? getP(indiv) : null;
  const r = d.result, rk = rankOf('me');
  let ctx = null;
  if (r && r.champion) ctx = { k: 'title', q: d.kind === 'olympics' ? 'Champion olympique ! Qu\'est-ce que ça représente pour toi ?' : `Tu remportes le ${d.ev.name}. Tu te sens capable d'aller encore plus haut ?` };
  else if (r && r.medal) ctx = { k: 'medal', q: `Une médaille ${r.medal === 'argent' ? "d'argent" : 'de bronze'} olympique. Fierté ou frustration ?` };
  else if (op && won && (op.rival || op.prodige || op.enemy)) ctx = { k: 'rival', q: `Tu bats encore ${op.name}. Cette rivalité, elle te motive ?` };
  else if (op && won && rankOf(op.id) <= 10 && rankOf(op.id) < rk) ctx = { k: 'upset', q: `Tu sors ${op.name}, ${rankOf(op.id)}e mondial. Exploit ou logique ?` };
  else if (op && !won && (d.tier === 'slam' || d.tier === 'worlds' || d.tier === 'olympics') && rnd() < 0.7) ctx = { k: 'loss', q: `Défaite face à ${op.name}. Qu'est-ce qui a manqué aujourd'hui ?` };
  else if (op && !won && op.rival) ctx = { k: 'loss', q: `${op.name} prend le dessus. Tu as une revanche à prendre ?` };
  if (!ctx) return;
  const ALT = {
    title: ['Un trophée de plus. Qu\'est-ce qui a fait la différence cette semaine ?', 'Comment tu vas fêter ce titre ce soir ?'],
    rival: ['On sent une vraie tension entre vous deux. Tu peux nous en dire plus ?'],
    upset: ['Personne ne t\'attendait à ce niveau. Tu te sens prêt pour le top 10 ?'],
    loss: ['Tu sembles frustré. Il y a eu un tournant dans ce match ?', 'Est-ce que la fatigue a joué aujourd\'hui ?'],
  }[ctx.k];
  if (ALT && rnd() < 0.5) ctx.q = pick(ALT).replace('vous deux', `vous deux, toi et ${op ? op.name : 'lui'}`);
  const opN = op ? op.name : 'mes adversaires';
  const A = {
    title: [['Je dois tout à mon équipe, on savoure et on retourne bosser.', { conf: 3, fans: 2500 }], ['Ce n\'est qu\'un début. Je veux la place de n°1.', { conf: 8, fans: 6000 }], ['Les autres peuvent trembler, je suis le patron maintenant.', { conf: 10, fans: 12000, enemy: true }]],
    medal: [['Une médaille olympique, c\'est un rêve. Je suis fier.', { conf: 6, fans: 5000 }], ['Je suis venu pour l\'or. Je reviendrai.', { conf: 4, fans: 7000 }], ['L\'arbitrage ne m\'a pas aidé aujourd\'hui.', { conf: 2, fans: 9000 }]],
    rival: [['Je respecte énormément ' + opN + '. Il me pousse à progresser.', { conf: 4, fans: 1500 }], ['Il le sait : je suis devant lui maintenant.', { conf: 7, fans: 3500 }], ['Franchement ? Il ne me fait plus peur du tout.', { conf: 8, fans: 7000, enemy: true }]],
    upset: [['J\'ai eu un peu de réussite, il reste un immense joueur.', { conf: 4, fans: 2000 }], ['Ce n\'est pas un exploit, je travaille pour battre ces joueurs-là.', { conf: 8, fans: 4500 }], ['Son niveau est surcoté. La prochaine fois ce sera encore plus rapide.', { conf: 9, fans: 9000, enemy: true }]],
    loss: [['Il a été meilleur, bravo à lui. J\'apprends.', { conf: 4, fans: 800 }], ['Quelques détails. Je reviendrai plus fort.', { conf: 6, fans: 1200 }], ['Il a eu de la chance, c\'est tout.', { conf: 2, fans: 3000, enemy: true }]],
  }[ctx.k];
  career.press = { media: pick(['L\'Équipe', 'Eurosport', 'WTT TV', 'France Télévisions', 'Ping Pong Mag', 'ITTF']), q: ctx.q, opp: op ? op.id : null, oppName: op ? op.name : null, answers: A.map(([t, fx], i) => ({ t, fx, tone: ['Humble', 'Confiant', 'Provocateur'][i] })) };
}
export function answerPress(i) {
  const P = career.press; if (!P) return null;
  const a = P.answers[i];
  career.conf = clamp((career.conf ?? 50) + (a.fx.conf || 0), 5, 100);
  const fm = career.me.perso === 'showman' ? 1.5 : 1;
  addFans((a.fx.fans || 0) * fm);
  let out = { fans: Math.round((a.fx.fans || 0) * fm), conf: a.fx.conf };
  if (a.fx.enemy && P.opp) {
    const op = career.pool.find(p => p.id === P.opp);
    if (op && !op.rival && !op.prodige && !op.enemy) {
      const en = career.pool.filter(p => p.enemy); if (en.length >= 2) delete en[0].enemy;
      op.enemy = true; career.news.unshift(`🔥 Polémique : la déclaration de ${career.me.name} sur ${op.name} fait le tour des réseaux. Une rivalité est née.`); out.enemy = op.name; }
  }
  career.press = null; save();
  return out;
}

// ---------- double
export function partnerOffers() {
  const r = ranking(), me = rankOf('me');
  const c = r.filter(e => e.p.id !== 'me' && !e.p.rival && !e.p.enemy && e.rank > 8 && Math.abs(e.rank - me) < 45).map(e => e.p);
  c.sort((a, b) => (b.country === career.me.country) - (a.country === career.me.country) || b.rating - a.rating);
  return c.slice(0, 5);
}
export function setPartner(id) { if (career.partner !== id) { career.partner = id; career.chem = 0; save(); } }
export function dRankPoints(pl) { const now = absWeek(career.season, career.week); return (pl.dpts || []).reduce((a, e) => a + (e.w > now - WEEKS ? e.p : 0), 0); }
export function dRankOf(id) {
  const list = allPlayers().map(p => ({ id: p.id, pts: dRankPoints(p) })).sort((a, b) => b.pts - a.pts);
  return list.findIndex(e => e.id === id) + 1;
}
const FAMILY_FIRST = ['CN', 'KR', 'TW', 'HK'];
export const lastName = p => { const w = p.name.split(' '); return w.length > 1 && FAMILY_FIRST.includes(p.country) && !p.young ? w[0] : w[w.length - 1]; };
const short = lastName;
function makePairEnt(id, a, b, bonus = 0) {
  const ra = a.id === 'me' ? overall(effStats()) : a.rating, rb = b.rating;
  const sa = a.id === 'me' ? effStats() : a.stats, st = {};
  for (const k of STAT_KEYS) st[k] = Math.round((sa[k] + b.stats[k]) / 2);
  return { id, ent: true, pair: true, name: `${short(a)} / ${short(b)}`, country: a.country, country2: b.country, rating: (ra + rb) / 2 + bonus, style: 'polyvalent', hand: 1, stats: st, members: [a.id, b.id], pts: [] };
}
function makeDoubleDraw(ev, mixed) {
  const partner = mixed ? career.wpool.find(p => p.id === career.mpartner) : career.pool.find(p => p.id === career.partner);
  const pool = entrants({ ...ev, tier: ev.tier }, false).filter(p => p.id !== partner.id).slice(0, mixed ? 7 : 14);
  pool.sort((a, b) => a.country.localeCompare(b.country) || b.rating - a.rating);
  const ents = { me: makePairEnt('me', career.me, partner, mixed ? (career.mchem || 0) : (career.chem || 0)) };
  const list = [ents.me];
  if (mixed) {
    const W = career.wpool.filter(w => w.id !== partner.id).slice(0, 14).sort(() => rnd() - 0.5);
    for (let i = 0; i < pool.length; i++) { const w = W.find(x => x.country === pool[i].country && !x.used) || W.find(x => !x.used); w.used = true; const e = makePairEnt(`d:${pool[i].id}+${w.id}`, pool[i], w, 2); ents[e.id] = e; list.push(e); }
    W.forEach(w => delete w.used);
  } else for (let i = 0; i + 1 < pool.length; i += 2) { const e = makePairEnt(`d:${pool[i].id}+${pool[i + 1].id}`, pool[i], pool[i + 1], 2); ents[e.id] = e; list.push(e); }
  list.sort((a, b) => b.rating - a.rating);
  const order = seedOrder(8), slots = order.map(s => list[s - 1]);
  const first = []; for (let i = 0; i < 8; i += 2) first.push({ a: slots[i].id, b: slots[i + 1].id, w: null, sc: null });
  return { ev, tier: ev.tier, size: 8, rounds: [first], round: 0, done: false, out: false, ents };
}

// ---------- équipes nationales
function nationEnt(code, isMe) {
  const COL = career.pool.filter(p => p.country === code).sort((a, b) => b.rating - a.rating);
  let members = isMe ? [career.me, ...COL.slice(0, 2)] : COL.slice(0, 3);
  while (members.length < 3) {
    const C = COUNTRIES[code], nm = C.first ? `${pick(C.first)} ${pick(C.last)}` : `Joueur ${C.name} ${members.length + 1}`;
    const fake = { id: `x:${code}${members.length}`, name: nm, country: code, hand: 1, style: 'polyvalent', rating: 50, stats: makeStats(50, 'polyvalent'), pts: [], wins: {}, ghost: true };
    members.push(fake);
  }
  const rs = members.map(p => p.id === 'me' ? overall(effStats()) : p.rating);
  return { id: isMe ? 'me' : 'n:' + code, ent: true, team: true, name: COUNTRIES[code].name, country: code, rating: rs.reduce((a, b) => a + b, 0) / 3, style: 'polyvalent', hand: 1, stats: members[0].stats, members: members.map(p => p.id), roster: members, pts: [] };
}
function makeTeamDraw(ev) {
  const codes = [...new Set(career.pool.map(p => p.country))].filter(c => c !== career.me.country);
  const ents = { me: nationEnt(career.me.country, true) };
  const others = codes.map(c => nationEnt(c, false)).sort((a, b) => b.rating - a.rating).slice(0, 7);
  for (const e of others) ents[e.id] = e;
  const list = [ents.me, ...others].sort((a, b) => b.rating - a.rating);
  const order = seedOrder(8), slots = order.map(s => list[s - 1]);
  const first = []; for (let i = 0; i < 8; i += 2) first.push({ a: slots[i].id, b: slots[i + 1].id, w: null, sc: null });
  return { ev, tier: 'team', size: 8, rounds: [first], round: 0, done: false, out: false, ents };
}
const memberP = (E, i) => { const id = E.members[i]; return id === 'me' ? career.me : E.roster.find(p => p.id === id); };
function prepTeamRound(d) {
  const m = d.rounds[d.round].find(x => x.a === 'me' || x.b === 'me'); if (!m) return;
  const O = d.ents[m.a === 'me' ? m.b : m.a];
  m.opp = O.members[0];
  // le meilleur adversaire doit être trouvable via getP
  for (const p of O.roster) if (!career.pool.includes(p) && !d.ents[p.id]) d.ents[p.id] = p;
}
function teamTie(d, m, won) {
  const M = d.ents.me, O = d.ents[m.a === 'me' ? m.b : m.a];
  const rub = [[0, 0], [1, 1], [2, 2], [0, 1], [1, 0]];
  let a = won ? 1 : 0, b = won ? 0 : 1;
  for (let k = 1; k < 5 && a < 3 && b < 3; k++) {
    const p = memberP(M, rub[k][0]), q = memberP(O, rub[k][1]);
    rnd() < winProb(p, q) ? a++ : b++;
  }
  return { won: a > b, sc: [a, b] };
}


// ================================================================== partie C : difficulté, âge, records, retraite
export const DIFFS = [
  { name: 'Rookie', desc: 'Adversaires plus faibles, tu progresses vite, moins de blessures' },
  { name: 'Pro', desc: 'L\'expérience normale' },
  { name: 'Légende', desc: 'Adversaires plus forts, progression lente, plus de blessures' },
];
export const diffAI = () => [-6, 0, 5][career.diff ?? 1];
export function ageMult(a = career.me.age || 17) { return a < 21 ? 1.3 : a < 27 ? 1 : a < 31 ? 0.75 : 0.45; }
export const growthMult = () => ageMult() * [1.3, 1, 0.8][career.diff ?? 1];
export const peakLabel = a => a < 21 ? 'Jeune talent · progression rapide' : a < 27 ? 'En pleine progression' : a < 31 ? 'Au sommet de sa carrière' : a < 35 ? 'Vétéran · déclin physique' : 'Fin de carrière';
function ageMe(rev) {
  const me = career.me;
  me.age = (me.age || 17) + 1;
  const a = me.age, lost = [];
  if (a >= 30) for (const k of ['speed', 'stamina']) { const n = a >= 34 ? 3 : a >= 32 ? 2 : 1; me.stats[k] = Math.max(30, me.stats[k] - n); lost.push(k); }
  if (a >= 34) for (const k of ['fh', 'bh', 'spin']) me.stats[k] = Math.max(30, me.stats[k] - 1);
  if (lost.length) career.news.unshift(`⏳ ${me.name} a ${a} ans : le physique commence à décliner (vitesse et endurance en baisse).`);
  rev.age = a;
  if (a >= 40 && !career.retired) career.forceRetire = true;
}

// ---------- records
const BASE_RECORDS = {
  youngNo1: { name: 'Plus jeune n°1 mondial', holder: 'Sora Matsushima', value: 19, unit: 'ans', low: true },
  weeksNo1: { name: 'Semaines au n°1 sur le circuit WTT', holder: 'Record du circuit', value: 30, unit: 'sem.' },
  streak: { name: 'Plus longue série de victoires', holder: 'Record du circuit', value: 25, unit: 'matchs' },
  seasonTitles: { name: 'Titres en une saison', holder: 'Record du circuit', value: 8, unit: 'titres' },
  slams: { name: 'Grand Smash remportés', holder: 'Record du circuit', value: 4, unit: 'titres' },
  worlds: { name: 'Titres de champion du monde', holder: 'Ma Long', value: 3, unit: 'titres' },
};
export function records() {
  career.records = career.records || JSON.parse(JSON.stringify(BASE_RECORDS));
  return career.records;
}
function checkRecords() {
  const Rc = records(), me = career.me.name;
  const vals = {
    youngNo1: career.firstNo1Age || null, weeksNo1: career.weeksNo1 || 0, streak: career.streak || 0,
    seasonTitles: career.titles.filter(t => t.season === career.season && !t.dbl).length,
    slams: career.titles.filter(t => t.tier === 'slam' && !t.dbl).length, worlds: career.titles.filter(t => t.tier === 'worlds').length,
  };
  for (const k in vals) {
    const v = vals[k], r = Rc[k];
    if (v === null || v === 0) continue;
    const beat = r.low ? v < r.value || (r.holder !== me && v === r.value && false) : v > r.value;
    if (beat) {
      const was = r.holder !== me;
      r.value = v; r.holder = me; r.season = career.season;
      if (was) { career.news.unshift(`📜 RECORD : ${me} bat le record « ${r.name} » (${v} ${r.unit}) !`); career.pending = [...(career.pending || []), { name: 'Record battu', desc: `${r.name} : ${v} ${r.unit}` }]; addFans(8000); }
    }
  }
}

// ---------- retraite
export const canRetire = () => (career.me.age || 17) >= 30 || career.forceRetire;
export function retire() {
  career.retired = { season: career.season, age: career.me.age, legacy: legacy(), bestRank: career.bestRank || rankOf('me') };
  career.news.unshift(`👋 ${career.me.name} annonce sa retraite à ${career.me.age} ans.`);
  save();
}


// ================================================================== carrière complète : qualifs, wild cards, poules, exhibitions, mixte, centre, prépa, vestiaire, réseaux
export function qualifOpen(ev) {
  if (ev.kind || !['contender', 'star', 'slam'].includes(ev.tier) || career.injury) return false;
  const rk = rankOf('me'), need = TIERS[ev.tier].need;
  return rk > need && rk <= Math.round(need * 1.6 + 20);
}
function makeQualif(ev) {
  const need = TIERS[ev.tier].need, r = ranking().filter(e => e.p.id !== 'me');
  const c = r.slice(need, need + 20).map(e => e.p);
  const opp = c[Math.floor(rnd() * c.length)] || r[need].p;
  return { ev: { ...ev, kind: undefined }, tier: ev.tier, kind: 'qualif', size: 2, rounds: [[{ a: 'me', b: opp.id, w: null, sc: null }]], round: 0, done: false, out: false };
}
export function enterQualif(ev) { career.money -= travelCost(ev); career.lastRegion = regionOf(ev); sst().events = (sst().events || 0) + 1; career.eventsTotal = (career.eventsTotal || 0) + 1; career.tour = makeQualif(ev); save(); return career.tour; }

function rollWildcards() {
  career.wc = {};
  const evs = weekEvents(career.season, career.week).filter(e => !e.kind && e.tier !== 'challenger' && e.tier !== 'worlds' && e.tier !== 'finals');
  for (const ev of evs) {
    if (rankOf('me') <= TIERS[ev.tier].need) continue;
    const ch = 0.06 + Math.min(0.2, (career.fans || 0) / 500000) + (mainSponsor() ? 0.04 : 0);
    if (rnd() < ch) { career.wc[ev.id] = true; career.news.unshift(`🎟️ ${career.me.name} reçoit une wild card pour le ${ev.name} !`); break; }
  }
}

function makeExhib(ev) {
  const top = ranking().filter(e => e.p.id !== 'me').slice(0, 20).map(e => e.p);
  const opp = top[Math.floor(rnd() * top.length)];
  const fee = Math.round(3000 + Math.min(40000, (career.fans || 0) * 0.08));
  return { ev, tier: 'exhib', kind: 'exhib', size: 2, rounds: [[{ a: 'me', b: opp.id, w: null, sc: null }]], round: 0, done: false, out: false, fee };
}

// ---------- Mondiaux : phase de poules puis tableau final
function makeGroupsDraw(ev) {
  const ps = entrants(ev, true).sort((a, b) => rating(b) - rating(a)).slice(0, 16);
  const groups = [[], [], [], []];
  ps.forEach((p, i) => { const r = Math.floor(i / 4), k = r % 2 ? 3 - (i % 4) : i % 4; groups[k].push(p.id); });
  const gm = [];
  groups.forEach((g, gi) => { for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) gm.push({ a: g[i], b: g[j], w: null, sc: null, g: gi }); });
  gm.sort((x, y) => (x.a === 'me' || x.b === 'me' ? 0 : 1) - (y.a === 'me' || y.b === 'me' ? 0 : 1));
  return { ev, tier: 'worlds', kind: 'single', stage: 'groups', groups, gm, size: 8, rounds: [], round: 0, done: false, out: false };
}
export function groupTable(d, gi) {
  const T = {};
  for (const id of d.groups[gi]) T[id] = { id, w: 0, l: 0, sd: 0 };
  for (const m of d.gm) if (m.g === gi && m.w) {
    const L = m.w === m.a ? m.b : m.a; T[m.w].w++; T[L].l++;
    const sw = m.sc ? Math.max(...m.sc) - Math.min(...m.sc) : 1; T[m.w].sd += sw; T[L].sd -= sw;
  }
  return Object.values(T).sort((a, b) => b.w - a.w || b.sd - a.sd || rating(getP(b.id)) - rating(getP(a.id)));
}
function groupProgress(d) {
  if (d.gm.some(m => (m.a === 'me' || m.b === 'me') && !m.w)) return;
  for (const m of d.gm) if (!m.w) { const A = getP(m.a), B = getP(m.b), aw = rnd() < winProb(A, B); m.w = aw ? m.a : m.b; m.sc = simScore(aw, 7); }
  const top = d.groups.map((g, gi) => groupTable(d, gi).slice(0, 2).map(e => e.id));
  const pairs = [[top[0][0], top[1][1]], [top[2][0], top[3][1]], [top[1][0], top[0][1]], [top[3][0], top[2][1]]];
  d.rounds = [pairs.map(([a, b]) => ({ a, b, w: null, sc: null }))]; d.round = 0; d.stage = 'ko';
  const qualified = top.flat().includes('me');
  career.news.unshift(qualified ? `✅ ${career.me.name} sort de sa poule aux Championnats du monde.` : `❌ ${career.me.name} est éliminé en phase de poules des Championnats du monde.`);
  if (!qualified) { d.out = true; simRound(d); while (!d.done) { nextRound(d); if (!d.done) simRound(d); } finishTournament(); }
  else simRound(d);
}

// ---------- double mixte
export function mixedOffers() {
  const c = career.wpool.slice().sort((a, b) => (b.country === career.me.country) - (a.country === career.me.country) || b.rating - a.rating);
  const rk = rankOf('me'), lvl = Math.max(0, Math.min(c.length - 5, Math.floor(rk / 6)));
  const same = c.filter(w => w.country === career.me.country).slice(0, 2);
  const others = career.wpool.slice(lvl, lvl + 5).filter(w => !same.includes(w));
  return [...same, ...others].slice(0, 5);
}
export function setMixedPartner(id) { if (career.mpartner !== id) { career.mpartner = id; career.mchem = 0; save(); } }

// ---------- centre d'entraînement
export const CENTER = {
  salle: { name: 'Salle d\'entraînement', desc: '+15 % de progression par niveau', costs: [0, 8000, 30000, 90000] },
  robot: { name: 'Robot pro', desc: 'Exercices plus efficaces', costs: [0, 6000, 25000, 70000] },
  recup: { name: 'Espace récupération', desc: '+5 de forme par semaine et par niveau', costs: [0, 5000, 20000, 60000] },
};
export function buyCenter(k) {
  career.center = career.center || { salle: 0, robot: 0, recup: 0 };
  const lv = career.center[k] || 0, cost = CENTER[k].costs[lv + 1];
  if (!cost || career.money < cost) return false;
  career.money -= cost; career.center[k] = lv + 1; save(); return true;
}

// ---------- préparation d'un gros tournoi
export function bigTargets() {
  const out = [];
  for (let w = career.week + 1; w <= Math.min(WEEKS, career.week + 6); w++) {
    const e = weekEvents(career.season, w).find(x => !x.kind && ['slam', 'worlds', 'finals', 'star'].includes(x.tier));
    if (e) out.push({ ...e, week: w });
  }
  return out;
}
export function setPrep(evId) { career.prep = evId ? { ev: evId, n: 0 } : null; save(); }

// ---------- sparring
export function sparringDone(k, ratio, won) {
  const r = train(k, Math.min(1, ratio * 1.1));
  career.conf = clamp((career.conf ?? 50) + (won ? 3 : 0), 5, 100);
  save();
  return r;
}

// ---------- vestiaire de carrière
export const OUTFITS = [
  { id: 'blanc', name: 'Néon blanc', color: 0xf2f0ff, cond: 'Entrer dans le top 50', test: () => (career.bestRank || 999) <= 50 },
  { id: 'feu', name: 'Rouge feu', color: 0xff4a1c, cond: 'Gagner un WTT Contender', test: () => career.titles.some(t => t.tier === 'contender' && !t.dbl) },
  { id: 'emeraude', name: 'Émeraude', color: 0x1cff9a, cond: 'Gagner un WTT Champions', test: () => career.titles.some(t => t.tier === 'star' && !t.dbl) },
  { id: 'or', name: 'Or champion', color: 0xffc83c, cond: 'Gagner un Grand Smash', test: () => career.titles.some(t => t.tier === 'slam' && !t.dbl) },
  { id: 'platine', name: 'Platine n°1', color: 0xd8e6ff, cond: 'Devenir n°1 mondial', test: () => career.bestRank === 1 },
  { id: 'arc', name: 'Prisme olympique', color: 0x9a6bff, cond: 'Gagner une médaille olympique', test: () => (career.medals || []).length > 0 },
];
export const CELEBS = [{ name: 'Les deux bras', cond: null }, { name: 'Poing levé', cond: null }, { name: 'Les bras en croix', cond: 'Gagner 3 titres' }, { name: 'Le saut du champion', cond: 'Gagner un Grand Smash' }];
export const celebUnlocked = i => i < 2 || (i === 2 ? career.titles.length >= 3 : career.titles.some(t => t.tier === 'slam'));
function unlockOutfit() {
  career.outfits = career.outfits || [];
  for (const o of OUTFITS) if (!career.outfits.includes(o.id) && o.test()) { career.outfits.push(o.id); career.pending = [...(career.pending || []), { name: 'Tenue débloquée', desc: o.name }]; }
}
export function setOutfit(id) { career.me.outfit = id; save(); }
export function setCeleb(i) { career.celeb = i; save(); }
export function outfitColor() { const o = OUTFITS.find(x => x.id === career.me.outfit); return o ? o.color : null; }

// ---------- réseaux sociaux
const HANDLES = ['@pingfan_93', '@topspin_addict', '@coupdroit_lourd', '@TTLegends', '@la_raquette_dor', '@spinmaster', '@pongcity', '@tabletennis_daily', '@ping_ultras', '@team_revers'];
const MEDIA = [['WTT', '@WTTGlobal'], ['ITTF', '@ittfworld'], ["L'Équipe", '@lequipe'], ['Eurosport', '@eurosport_fr'], ['Ping Pong Mag', '@pingpongmag']];
function post(who, handle, text, likes, media) {
  feedPush(media ? 'x' : pick(['x', 'ig', 'x', 'tt']), { who, handle, text, likes, media: !!media, emoji: media ? '📰' : '💬', kind: media ? 'Article' : 'Post' });
}
function socialAfter(d, won, indiv) {
  const me = career.me.name, op = indiv ? getP(indiv) : null, f = career.fans || 1000;
  setMoment({ type: won ? 'win' : 'loss', ev: d.ev.name, tier: d.tier, opp: op && !op.ent ? op.name : null, oppRank: op && !op.ent ? rankOf(op.id) : null, big: won && op && !op.ent && rankOf(op.id) <= 20 });
  if (won && op && !op.ent && rankOf(op.id) <= 10) feedPush('x', { who: 'Fan', handle: pick(HANDLES), text: `${me} vient de battre ${op.name} 😱 #${tag(d.ev.name)}`, likes: f * 0.06, rt: f * 0.01 });
  const fan = () => pick(HANDLES);
  if (won && op && rankOf(op.id) <= 20) { const M = pick(MEDIA); post(M[0], M[1], `${me} s'offre ${op.name} (${rankOf(op.id)}e mondial) au ${d.ev.name} ! 🔥`, f * 0.08, true); }
  if (won) post('Fan', fan(), pick([`${me} est en feu 🔥🔥`, `Ce coup droit de ${me}... irréel`, `Allez ${me} !! On y croit`, `${me} au sommet bientôt, je l'avais dit`]), f * 0.02);
  else post('Fan', fan(), pick([`Dur ce soir pour ${me}, on reste derrière toi 💪`, `${me} reviendra plus fort`, `Pas grave ${me}, la saison est longue`]), f * 0.01);
  if (op && (op.rival || op.enemy)) post('Fan', fan(), `Le choc ${me} vs ${op.name}, c'est la meilleure rivalité du circuit ⚔️`, f * 0.05);
}


// ================================================================== réseaux sociaux
export const PLATFORMS = {
  ig: { name: 'Instagram', color: '#e1306c', icon: '📸', share: 0.42, unit: 'abonnés' },
  x: { name: 'X', color: '#e7e9ea', icon: '𝕏', share: 0.18, unit: 'abonnés' },
  tt: { name: 'TikTok', color: '#25f4ee', icon: '🎵', share: 0.28, unit: 'abonnés' },
  yt: { name: 'YouTube', color: '#ff0033', icon: '▶', share: 0.12, unit: 'abonnés' },
};
export function soc() {
  if (!career.social) {
    const f = career.fans || 1500, S = { posts: 0, week: 0, notifs: [], deals: [], trend: [], verified: false, moment: null };
    for (const p in PLATFORMS) S[p] = { f: Math.round(f * PLATFORMS[p].share), feed: [] };
    career.social = S;
  }
  return career.social;
}
function syncFans() { const S = soc(); career.fans = Object.keys(PLATFORMS).reduce((a, p) => a + S[p].f, 0); if (!S.verified && career.fans >= 100000) { S.verified = true; notif('✔', 'Ton compte est maintenant certifié sur toutes les plateformes'); } }
const tag = n => n.replace(/^WTT /, 'WTT').replace(/[^A-Za-zÀ-ÿ0-9]/g, '');
function notif(icon, text) { const S = soc(); S.notifs.unshift({ icon, text, s: career.season, w: career.week }); S.notifs = S.notifs.slice(0, 25); }
function feedPush(pl, post) {
  const S = soc(); post.s = career.season; post.w = career.week; post.likes = Math.round(post.likes || 0);
  S[pl].feed.unshift(post); S[pl].feed = S[pl].feed.slice(0, 30);
}
function setMoment(m) { const S = soc(); m.s = career.season; m.w = career.week; S.moment = m; S.used = {}; }
export const POSTS_PER_WEEK = 3;
export function postsLeft() { const S = soc(); const k = absWeek(career.season, career.week); if (S.week !== k) { S.week = k; S.posts = 0; } return POSTS_PER_WEEK - S.posts; }

// idées de publications selon ce qui vient de se passer
export function postIdeas() {
  const S = soc(), m = S.moment, me = career.me.name, sp = mainSponsor();
  const I = [];
  const ev = m ? m.ev : null;
  if (m && m.type === 'title') {
    I.push({ id: 'ig_troph', pl: 'ig', kind: 'Photo', emoji: '🏆', text: `${ev.toUpperCase()} 🏆 Merci à mon équipe, merci au public. On continue !`, base: 3.2 });
    I.push({ id: 'tt_cele', pl: 'tt', kind: 'Clip', emoji: '🎉', text: `Le moment où j'ai gagné le ${ev} 😭🔥 #pingpong #tabletennis`, base: 3.6, viral: 0.25 });
    I.push({ id: 'x_thx', pl: 'x', kind: 'Tweet', emoji: '🐦', text: `Champion du ${ev} !!! Je n'ai pas les mots. Merci pour tous vos messages 🙏 #${tag(ev)}`, base: 2.4 });
    I.push({ id: 'yt_vlog', pl: 'yt', kind: 'Vlog', emoji: '🎬', text: `Dans les coulisses de ma victoire au ${ev} (VLOG)`, base: 2.8 });
  } else if (m && m.type === 'medal') {
    I.push({ id: 'ig_medal', pl: 'ig', kind: 'Photo', emoji: m.medal === 'or' ? '🥇' : m.medal === 'argent' ? '🥈' : '🥉', text: `Médaille ${medalTxt(m.medal)} olympique. Un rêve d'enfant. ${COUNTRIES[career.me.country].name} ❤️`, base: 4.5 });
    I.push({ id: 'tt_medal', pl: 'tt', kind: 'Clip', emoji: '🏅', text: `Le podium olympique vu de l'intérieur 🥹 #Olympics #pingpong`, base: 4.8, viral: 0.35 });
    I.push({ id: 'x_medal', pl: 'x', kind: 'Tweet', emoji: '🐦', text: `Médaillé olympique. Je réalise toujours pas. #${tag(ev)}`, base: 3.5 });
  } else if (m && m.type === 'win') {
    I.push({ id: 'ig_win', pl: 'ig', kind: 'Photo', emoji: '💪', text: m.opp ? `Victoire contre ${m.opp} au ${ev} ✅ On avance.` : `Victoire au ${ev} ✅`, base: m.big ? 2 : 1.1 });
    I.push({ id: 'tt_point', pl: 'tt', kind: 'Clip', emoji: '🔥', text: `Ce point contre ${m.opp || 'mon adversaire'}... dites-moi en commentaire 👇 #tabletennis`, base: m.big ? 2.6 : 1.3, viral: m.big ? 0.2 : 0.08 });
    I.push({ id: 'x_win', pl: 'x', kind: 'Tweet', emoji: '🐦', text: m.big ? `Battre un top ${m.oppRank <= 10 ? 10 : 20} mondial. Gros jour. #${tag(ev)}` : `Un tour de plus au ${ev}. Focus sur le prochain match.`, base: m.big ? 1.8 : 0.8 });
  } else if (m && m.type === 'loss') {
    I.push({ id: 'ig_loss', pl: 'ig', kind: 'Photo', emoji: '🙏', text: `Pas le résultat voulu au ${ev}. On apprend, on bosse, on revient.`, base: 0.9 });
    I.push({ id: 'x_loss', pl: 'x', kind: 'Tweet', emoji: '🐦', text: `Bravo ${m.opp || 'à mon adversaire'}. Je reviendrai plus fort.`, base: 0.7 });
    I.push({ id: 'x_rant', pl: 'x', kind: 'Tweet', emoji: '😤', text: `L'arbitrage aujourd'hui... je préfère ne rien dire. #${tag(ev)}`, base: 1.6, risky: true });
  }
  I.push({ id: 'tt_train', pl: 'tt', kind: 'Clip', emoji: '🏓', text: `Mon exercice préféré au robot 🤖🏓 essayez ça #pingpong #training`, base: 1.1, viral: 0.06 });
  I.push({ id: 'ig_story', pl: 'ig', kind: 'Story', emoji: '📍', text: `Arrivé pour la semaine ${career.week} du circuit ✈️`, base: 0.6 });
  I.push({ id: 'yt_gear', pl: 'yt', kind: 'Vidéo', emoji: '🎥', text: `Mon matériel de pro : bois, revêtements, chaussures (tout expliqué)`, base: 1.2 });
  I.push({ id: 'x_qa', pl: 'x', kind: 'Tweet', emoji: '💬', text: `Posez-moi vos questions, je réponds ce soir 👇 #AskMe`, base: 0.9 });
  if (sp) I.push({ id: 'ig_spon', pl: 'ig', kind: 'Partenariat', emoji: '🤝', text: `Fier de représenter ${sp.name} sur le circuit 💪 #${tag(sp.name)} #partenariat`, base: 0.8, sponsor: true });
  for (const d of S.deals) if (!d.done) I.push({ id: 'deal_' + d.id, pl: d.pl, kind: 'Post sponsorisé', emoji: '💰', text: d.text, base: 0.7, deal: d });
  return I.filter(x => !(S.used || {})[x.id]);
}

// publier : engagement, nouveaux abonnés, buzz possible
export function publish(id) {
  if (postsLeft() <= 0) return null;
  const idea = postIdeas().find(x => x.id === id); if (!idea) return null;
  const S = soc(), P = S[idea.pl];
  S.posts++; S.used = S.used || {}; S.used[id] = true;
  const perso = career.me.perso === 'showman' ? 1.35 : career.me.perso === 'froid' ? 0.85 : 1;
  const reach = Math.max(300, P.f) * (0.04 + 0.05 * rnd()) * idea.base * perso;
  let viral = idea.viral && rnd() < idea.viral;
  if (idea.risky) viral = rnd() < 0.5;
  const mult = viral ? 6 + rnd() * 10 : 1;
  const likes = Math.round(reach * mult), comments = Math.round(likes * (0.02 + rnd() * 0.03)), shares = Math.round(likes * (idea.pl === 'tt' ? 0.08 : 0.03));
  const views = idea.pl === 'tt' || idea.pl === 'yt' ? Math.round(likes * (8 + rnd() * 8)) : null;
  let gain = Math.round(likes * (idea.pl === 'tt' ? 0.18 : idea.pl === 'yt' ? 0.25 : 0.1) * (idea.sponsor || idea.deal ? 0.5 : 1));
  if (idea.risky) { career.conf = clamp((career.conf ?? 50) + (viral ? -3 : 0), 5, 100); if (viral) notif('🔥', 'Ton tweet sur l\'arbitrage fait polémique : buzz, mais certains sponsors n\'aiment pas'); }
  P.f += gain; syncFans();
  const comms = commentsFor(idea, viral);
  feedPush(idea.pl, { mine: true, who: career.me.name, handle: handleOf(), text: idea.text, emoji: idea.emoji, kind: idea.kind, likes, comments, shares, views, viral, comms });
  if (viral) { notif('🚀', `Ton ${idea.kind.toLowerCase()} ${PLATFORMS[idea.pl].name} explose : ${fansLabel(views || likes)} ${views ? 'vues' : 'j\'aime'} !`); S.trend.unshift(`#${tag(career.me.name)}`); S.trend = [...new Set(S.trend)].slice(0, 5); }
  notif(PLATFORMS[idea.pl].icon, `+${fansLabel(gain)} abonnés ${PLATFORMS[idea.pl].name}`);
  let money = 0;
  if (idea.deal) { idea.deal.done = true; money = idea.deal.pay; career.money += money; career.earned = (career.earned || 0) + money; notif('💰', `${idea.deal.brand} t'a versé ${money.toLocaleString('fr-FR')} € pour le post`); }
  save();
  return { likes, comments, shares, views, gain, viral, money, pl: idea.pl };
}
export const handleOf = () => '@' + career.me.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '') + (soc().verified ? '' : '.tt');
function commentsFor(idea, viral) {
  const me = career.me.name.split(' ')[0];
  const base = [`Allez ${me} 🔥`, `Trop fort 👏👏`, `Le goat du ping ?? 🐐`, `On est derrière toi !!`, `${me} > tout le monde`, `Ce revers 😮‍💨`, `Quand est-ce que tu viens jouer en France ?`, `Légende`, `J'ai commencé le ping grâce à toi 🏓`];
  const neg = [`Surcoté 🤡`, `Il a eu de la chance`, `Rentre chez toi`];
  const out = [];
  for (let k = 0; k < 3; k++) out.push({ h: pick(HANDLES), t: idea.risky && rnd() < 0.5 ? pick(neg) : pick(base) });
  if (viral) out.unshift({ h: '@ping_ultras', t: 'Ce post est partout 😂🔥' });
  return out;
}
// semaine : croissance naturelle, contenus des médias, offres de marques
function socialWeek() {
  const S = soc(), rk = rankOf('me'), me = career.me.name;
  const g = Math.max(0, (200 - rk)) * 0.4 + (career.conf ?? 50) * 0.5;
  for (const p in PLATFORMS) S[p].f = Math.round(S[p].f * (1 + 0.004) + g * PLATFORMS[p].share);
  if (S.posts === 0 && S.week) for (const p in PLATFORMS) S[p].f = Math.round(S[p].f * 0.997);
  syncFans();
  // médias et fans
  if (S.moment && S.moment.w === career.week && S.moment.s === career.season) {
    const m = S.moment;
    if (m.type === 'title' || m.type === 'medal') {
      feedPush('ig', { who: 'WTT', handle: '@wtt', text: `🏆 ${me} remporte le ${m.ev} !`, emoji: '🏆', kind: 'Photo', likes: career.fans * 0.15, media: true });
      feedPush('x', { who: "L'Équipe", handle: '@lequipe', text: `Tennis de table : ${me} s'impose au ${m.ev}.`, likes: career.fans * 0.03, media: true });
      feedPush('yt', { who: 'WTT', handle: '@WTTGlobal', text: `HIGHLIGHTS | ${me} - Finale ${m.ev}`, emoji: '▶', kind: 'Vidéo', likes: career.fans * 0.08, views: career.fans * 1.2, media: true });
    }
    if (m.big) feedPush('tt', { who: 'Ping Pong Mag', handle: '@pingpongmag', text: `${me} vs ${m.opp} : le point de l'année ? 🤯`, emoji: '🤯', kind: 'Clip', likes: career.fans * 0.1, views: career.fans * 2, media: true });
  }
  // offres de partenariat selon l'audience
  const brands = [['Nike', 'ig', 'Ma nouvelle paire Nike pour la saison 👟 #nike #ad'], ['Red Bull', 'tt', 'Mon rituel d\'avant match 🪽 #redbull #ad'], ['Adidas', 'ig', 'Prêt pour le prochain tournoi avec Adidas ⚡ #adidas #ad'], ['Decathlon', 'yt', 'Je teste les raquettes Decathlon à 10 € vs à 300 € 😳 #ad'], ['Samsung', 'tt', 'Mon setup pour analyser mes matchs 📱 #ad'], ['Butterfly', 'ig', 'Nouveau revêtement, nouvelles sensations 🦋 #butterfly #ad'], ['Hugo Boss', 'ig', 'Soirée de gala du circuit 🖤 #ad']];
  if (career.fans >= 20000 && rnd() < 0.3 && S.deals.filter(d => !d.done).length < 2) {
    const [brand, pl, text] = pick(brands);
    const pay = Math.round(Math.min(150000, career.fans * (0.04 + rnd() * 0.04)) / 100) * 100;
    const id = 'd' + absWeek(career.season, career.week);
    S.deals.unshift({ id, brand, pl, text, pay, done: false });
    S.deals = S.deals.slice(0, 6);
    notif('💼', `${brand} te propose un post sponsorisé ${PLATFORMS[pl].name} : ${pay.toLocaleString('fr-FR')} €`);
  }
  // tendances
  const tr = ['#pingpong', '#tabletennis', '#WTT', `#${tag(career.me.name)}`, '#ITTF'];
  if (rnd() < 0.5) S.trend = [...new Set([...S.trend, pick(tr)])].slice(-5);
}
