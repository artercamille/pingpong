// Mode carrière : joueur, circuit mondial (200 joueurs IA), calendrier, tournois, classement.
import { REAL_PLAYERS } from './players.js';
const KEY = 'pingpong-career-v2';
export const WEEKS = 24;

// ------------------------------------------------------------------ pays (noms fictifs)
export const COUNTRIES = {
  FR: { name: 'France', flag: ['v', '#1f4bd6', '#ffffff', '#e33340'], first: ['Lucas', 'Hugo', 'Théo', 'Nathan', 'Enzo', 'Jules', 'Léa', 'Chloé', 'Manon', 'Inès'], last: ['Moreau', 'Lambert', 'Girard', 'Roux', 'Fontaine', 'Mercier', 'Lefèvre', 'Garnier', 'Chevalier', 'Morel'] },
  DE: { name: 'Allemagne', flag: ['h', '#111111', '#dd1f1f', '#f4c400'], first: ['Felix', 'Jonas', 'Lukas', 'Paul', 'Leon', 'Emma', 'Mia', 'Lena', 'Nils', 'Timo'], last: ['Brandt', 'Weber', 'Krüger', 'Hoffmann', 'Schäfer', 'Vogel', 'Keller', 'Wolff', 'Becker', 'Richter'] },
  CN: { name: 'Chine', flag: ['cn'], first: ['Wei', 'Hao', 'Jun', 'Lei', 'Ming', 'Yan', 'Xin', 'Bo', 'Tao', 'Lin'], last: ['Zhang', 'Liu', 'Chen', 'Wang', 'Huang', 'Zhao', 'Sun', 'Xu', 'Ma', 'Fan'] },
  JP: { name: 'Japon', flag: ['jp'], first: ['Kenji', 'Haruto', 'Ren', 'Sota', 'Yuto', 'Aoi', 'Hina', 'Riku', 'Kaito', 'Mio'], last: ['Arata', 'Tanaka', 'Sato', 'Ito', 'Mori', 'Harimoto', 'Kato', 'Ono', 'Ishida', 'Nakamura'] },
  KR: { name: 'Corée du Sud', flag: ['kr'], first: ['Jin-ho', 'Min-jun', 'Seo-yeon', 'Ji-woo', 'Hyun', 'Dong-hyun', 'Ye-jin', 'Tae-yang', 'Su-min', 'Woo-jin'], last: ['Park', 'Kim', 'Lee', 'Choi', 'Jung', 'Kang', 'Yoon', 'Jang', 'Lim', 'Han'] },
  SE: { name: 'Suède', flag: ['nordic', '#2a62c9', '#f7d117'], first: ['Viktor', 'Oskar', 'Elias', 'Axel', 'Linnea', 'Elsa', 'Anton', 'Hugo', 'Maja', 'Erik'], last: ['Lindqvist', 'Karlsson', 'Nilsson', 'Berg', 'Holm', 'Sjöberg', 'Ek', 'Lund', 'Falk', 'Ström'] },
  BR: { name: 'Brésil', flag: ['br'], first: ['Mateus', 'Gabriel', 'Rafael', 'Thiago', 'Bruno', 'Ana', 'Beatriz', 'Caio', 'Diego', 'Luana'], last: ['Silva', 'Santos', 'Costa', 'Oliveira', 'Rocha', 'Almeida', 'Lima', 'Souza', 'Ferreira', 'Barros'] },
  US: { name: 'États-Unis', flag: ['us'], first: ['Jake', 'Ryan', 'Tyler', 'Mason', 'Logan', 'Ava', 'Madison', 'Cole', 'Evan', 'Zoe'], last: ['Miller', 'Carter', 'Brooks', 'Hayes', 'Reed', 'Parker', 'Bennett', 'Foster', 'Cooper', 'Wright'] },
  GB: { name: 'Royaume-Uni', flag: ['gb'], first: ['Oliver', 'Harry', 'George', 'Jack', 'Alfie', 'Amelia', 'Isla', 'Freddie', 'Archie', 'Poppy'], last: ['Walker', 'Hughes', 'Clarke', 'Turner', 'Wood', 'Evans', 'Hall', 'Hill', 'Green', 'Ward'] },
  ES: { name: 'Espagne', flag: ['h3', '#c60b1e', '#ffc400', '#c60b1e'], first: ['Mateo', 'Álvaro', 'Pablo', 'Javier', 'Sergio', 'Lucía', 'Carmen', 'Adrián', 'Marcos', 'Irene'], last: ['García', 'Rivas', 'Navarro', 'Romero', 'Torres', 'Ruiz', 'Gil', 'Serrano', 'Molina', 'Ortega'] },
  IT: { name: 'Italie', flag: ['v', '#159447', '#ffffff', '#d4242b'], first: ['Leo', 'Marco', 'Luca', 'Andrea', 'Matteo', 'Giulia', 'Sofia', 'Davide', 'Simone', 'Chiara'], last: ['Santini', 'Rossi', 'Bianchi', 'Ricci', 'Greco', 'Conti', 'Gallo', 'Marino', 'Bruno', 'Costa'] },
  PT: { name: 'Portugal', flag: ['v2', '#046a38', '#da291c'], first: ['João', 'Tiago', 'Diogo', 'Rui', 'Nuno', 'Inês', 'Rita', 'Duarte', 'Afonso', 'Marta'], last: ['Freitas', 'Monteiro', 'Pinto', 'Cardoso', 'Teixeira', 'Matos', 'Correia', 'Nunes', 'Faria', 'Lopes'] },
  EG: { name: 'Égypte', flag: ['h', '#ce1126', '#ffffff', '#111111'], first: ['Omar', 'Youssef', 'Karim', 'Ahmed', 'Mostafa', 'Nour', 'Salma', 'Hassan', 'Tarek', 'Laila'], last: ['Haddad', 'Assar', 'Saleh', 'Mansour', 'Fathy', 'Nabil', 'Zaki', 'Rashed', 'Kamel', 'Farouk'] },
  NG: { name: 'Nigéria', flag: ['v', '#008751', '#ffffff', '#008751'], first: ['Quadri', 'Emeka', 'Tunde', 'Chidi', 'Seun', 'Ada', 'Funke', 'Kunle', 'Obi', 'Ngozi'], last: ['Aruna', 'Okafor', 'Adeyemi', 'Eze', 'Bello', 'Okonkwo', 'Afolabi', 'Nwosu', 'Balogun', 'Ojo'] },
  IN: { name: 'Inde', flag: ['h', '#ff9933', '#ffffff', '#138808'], first: ['Arjun', 'Rohan', 'Vikram', 'Aditya', 'Sathiyan', 'Manika', 'Priya', 'Kabir', 'Dev', 'Anika'], last: ['Sharma', 'Kamal', 'Gnanasekaran', 'Patel', 'Rao', 'Iyer', 'Mehta', 'Nair', 'Reddy', 'Kapoor'] },
  MX: { name: 'Mexique', flag: ['v', '#006847', '#ffffff', '#ce1126'], first: ['Diego', 'Santiago', 'Emiliano', 'Iker', 'Marcos', 'Valeria', 'Ximena', 'Rodrigo', 'Andrés', 'Paola'], last: ['Hernández', 'Ramírez', 'Cruz', 'Flores', 'Vargas', 'Castillo', 'Mendoza', 'Ríos', 'Salinas', 'Aguilar'] },
  PL: { name: 'Pologne', flag: ['h2', '#ffffff', '#dc143c'], first: ['Jakub', 'Kacper', 'Szymon', 'Filip', 'Mateusz', 'Zuzanna', 'Julia', 'Bartek', 'Kamil', 'Ola'], last: ['Nowak', 'Kowalski', 'Wójcik', 'Zieliński', 'Mazur', 'Krawczyk', 'Dudek', 'Wróbel', 'Pawlak', 'Sikora'] },
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
  BE: { name: 'Belgique', flag: ['v', '#111111', '#fdda24', '#ef3340'], first: ['Arthur', 'Louis', 'Victor', 'Noah', 'Cédric', 'Elise', 'Lotte', 'Bram', 'Senne', 'Margaux'], last: ['Peeters', 'Janssens', 'Maes', 'Dubois', 'Lemaire', 'Claes', 'Wouters', 'Goossens', 'Lambrecht', 'Willems'] },
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
  challenger: { name: 'WTT Feeder', size: 16, need: 999, pts: [125, 90, 45, 25, 15], arena: 'glacier', color: '#3cc8ff' },
  contender: { name: 'WTT Contender', size: 16, need: 120, pts: [400, 280, 140, 70, 35], arena: 'jungle', color: '#3cff8a' },
  star: { name: 'WTT Champions', size: 32, need: 50, pts: [1000, 700, 350, 175, 90, 15], arena: 'inferno', color: '#ff3c3c' },
  slam: { name: 'Grand Smash', size: 32, need: 32, pts: [2000, 1400, 700, 350, 175, 90], arena: 'finale', color: '#d23cff' },
  worlds: { name: 'Championnats du monde', size: 16, need: 16, pts: [1500, 1050, 525, 265, 100], arena: 'legende', color: '#ffc83c' },
};
const FEEDERS = ['Düsseldorf', 'Varaždin', 'Olomouc', 'Otočec', 'Havířov', 'Vila Nova de Gaia', 'Biella', 'Cappadocia', 'Doha', 'Beyrouth', 'Panagyurishte', 'Lille'];
const CONTENDERS = ['Doha', 'Tunis', 'Taiyuan', 'Lagos', 'Skopje', 'Zagreb', 'Almaty', 'Buenos Aires', 'Rio de Janeiro', 'Muscat', 'Antalya', 'Istanbul', 'Lima', 'Mascate'];
const SLAMS = { 6: 'Singapore Smash', 12: 'United States Smash', 18: 'Europe Smash', 23: 'China Smash' };
const STARS = { 3: 'WTT Champions Chongqing', 9: 'WTT Champions Incheon', 15: 'WTT Champions Macao', 20: 'WTT Champions Montpellier' };
export const VENUES = {
  'Singapore Smash': { city: 'Singapour', arena: 'finale', crowd: 1 }, 'United States Smash': { city: 'Las Vegas', arena: 'inferno', crowd: 1 },
  'Europe Smash': { city: 'Malmö', arena: 'glacier', crowd: 1 }, 'China Smash': { city: 'Pékin', arena: 'inferno', crowd: 1 },
  'Championnats du monde': { city: 'Finale de saison', arena: 'legende', crowd: 1 },
};

const de = c => /^[AEIOUÉÈ]/.test(c) ? `d'${c}` : `de ${c}`;
export function weekEvents(season, week) {
  if (week === WEEKS) return [{ id: `s${season}w${week}worlds`, tier: 'worlds', name: 'Championnats du monde' }];
  if (SLAMS[week]) return [{ id: `s${season}w${week}slam`, tier: 'slam', name: SLAMS[week] }, { id: `s${season}w${week}ch`, tier: 'challenger', name: `WTT Feeder ${FEEDERS[(week * 7 + season) % FEEDERS.length]}` }];
  if (STARS[week]) return [{ id: `s${season}w${week}star`, tier: 'star', name: STARS[week] }, { id: `s${season}w${week}co`, tier: 'contender', name: `WTT Contender ${CONTENDERS[(week * 5 + season) % CONTENDERS.length]}` }];
  return [
    { id: `s${season}w${week}ch`, tier: 'challenger', name: `WTT Feeder ${FEEDERS[(week * 7 + season) % FEEDERS.length]}` },
    { id: `s${season}w${week}co`, tier: 'contender', name: `WTT Contender ${CONTENDERS[(week * 5 + season + 3) % CONTENDERS.length]}` },
  ];
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
  try { career = JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { career = null; }
  migrate();
  return career;
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(career)); } catch (e) {} }
export function erase() { career = null; try { localStorage.removeItem(KEY); } catch (e) {} }
export const absWeek = (s, w) => (s - 1) * WEEKS + w;

export function create(p) {
  seed = (Date.now() & 0xffffffff) >>> 0;
  const stats = {};
  for (const k of STAT_KEYS) stats[k] = clamp(46 + STYLE_BIAS[p.style][k], 30, 70);
  const me = { id: 'me', name: p.name, country: p.country, hand: p.hand, style: p.style, neon: p.neon, acc: p.acc, stats, pts: [] };
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
    v: 1, season: 1, week: 1, me, pool, length: p.length ?? 1, upPoints: 0,
    h2h: {}, titles: [], results: [], tour: null, money: 500, energy: 100, coach: 0, sponsor: null, offers: [], gear: { bois: 0, rev: 0, shoes: 0 }, trained: 0, earned: 0, news: ['Bienvenue sur le circuit WTT ! Commence par les WTT Feeder pour grimper au classement mondial.'],
  };
  // classement de départ : points fictifs de la saison précédente
  for (const pl of pool) { for (let k = 0; k < WEEKS; k++) pl.pts.push({ w: -k, p: Math.round(pl.seedTotal / WEEKS) }); delete pl.seedTotal; }
  migrate();
  save();
  return career;
}

// ------------------------------------------------------------------ classement
export function allPlayers() { return [career.me, ...career.pool]; }
export function getP(id) { return id === 'me' ? career.me : career.pool.find(p => p.id === id); }
export function rating(pl) { return pl.id === 'me' ? overall(effStats()) : pl.rating; }
export function rankPoints(pl) {
  const now = absWeek(career.season, career.week);
  return pl.pts.reduce((a, e) => a + (e.w > now - WEEKS ? e.p : 0), 0);
}
export function ranking() {
  const list = allPlayers().map(p => ({ p, pts: rankPoints(p) }));
  list.sort((a, b) => b.pts - a.pts || rating(b.p) - rating(a.p));
  list.forEach((e, i) => { e.rank = i + 1; });
  return list;
}
export function rankOf(id) { const r = ranking(); const e = r.find(x => x.p.id === id); return e ? e.rank : 999; }

// ------------------------------------------------------------------ tournois
export function eligible(ev) {
  const T = TIERS[ev.tier];
  return rankOf('me') <= T.need;
}

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
  if (ev.tier === 'contender') { lo = 25; hi = 125; }
  if (ev.tier === 'star') { lo = 4; hi = 70; }
  if (ev.tier === 'slam') { lo = 0; hi = 44; }
  if (ev.tier === 'worlds') { lo = 0; hi = 16; }
  let cands = r.slice(lo, hi).map(e => e.p);
  const n = T.size - (withMe ? 1 : 0);
  const sel = ev.tier === 'worlds' || ev.tier === 'slam' ? cands.slice(0, n) : cands.sort(() => rnd() - 0.5).slice(0, n);
  // le rival est souvent dans le même tournoi
  const rival = career.pool.find(p => p.rival);
  if (withMe && rival && !sel.includes(rival) && rnd() < 0.55 && ev.tier !== 'worlds') sel[sel.length - 1] = rival;
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
  const L = career.length; // 0 rapide, 1 normal, 2 long
  if (L === 0) return 1;
  const final = matchesInRound === 1, late = matchesInRound <= 4;
  if (L === 1) return (tier === 'slam' || tier === 'worlds') && final ? 5 : 3;
  return late && (tier === 'slam' || tier === 'worlds' || tier === 'star') ? 5 : 3;
}

function simScore(winnerA, sets) {
  const need = Math.floor(sets / 2) + 1;
  let a = 0, b = 0;
  while (a < need && b < need) { if (rnd() < (winnerA ? 0.68 : 0.32)) a++; else b++; }
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
    m.sc = simScore(aw, 3);
  }
}

function nextRound(d) {
  const R = d.rounds[d.round];
  if (R.length === 1) { d.done = true; return; }
  const nx = [];
  for (let i = 0; i < R.length; i += 2) nx.push({ a: R[i].w, b: R[i + 1].w, w: null, sc: null });
  d.rounds.push(nx); d.round++;
}

export function myMatch() {
  const d = career.tour;
  if (!d || d.done || d.out) return null;
  return d.rounds[d.round].find(m => m.a === 'me' || m.b === 'me') || null;
}

export function enterTournament(ev) {
  career.tour = makeDraw(ev, true);
  save();
  return career.tour;
}

// résultat du match du joueur
export function reportMatch(won, sets) {
  const d = career.tour, m = myMatch();
  if (!m) return;
  const oppId = m.a === 'me' ? m.b : m.a;
  m.w = won ? 'me' : oppId;
  m.sc = m.a === 'me' ? sets : [sets[1], sets[0]];
  const h = career.h2h[oppId] || { w: 0, l: 0 };
  won ? h.w++ : h.l++;
  career.h2h[oppId] = h;
  const S = sst(), oR = rankOf(oppId);
  won ? S.wins++ : S.losses++;
  if (won && (!S.best || oR < S.best.rank)) S.best = { name: getP(oppId).name, rank: oR };
  if (won && getP(oppId).sig) career.bossWins = (career.bossWins || 0) + 1;
  if (won && getP(oppId).rival) career.rivalWins = (career.rivalWins || 0) + 1;
  career.upPoints += won ? 3 : 1;
  spendEnergy(10);
  const better = rankOf(oppId) < rankOf('me');
  career.conf = clamp((career.conf ?? 50) + (won ? (better ? 10 : 5) : (better ? -4 : -10)), 5, 100);
  simRound(d);
  if (!won) {
    d.out = true;
    // on termine le tournoi en simulation
    while (!d.done) { nextRound(d); if (!d.done) simRound(d); }
  } else {
    nextRound(d);
    if (!d.done) simRound(d);
  }
  if (d.done || d.out) finishTournament();
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

function finishTournament() {
  const d = career.tour;
  if (d.awarded) return;
  d.awarded = true;
  const w = absWeek(career.season, career.week);
  const res = award(d);
  for (const [id, p] of Object.entries(res)) { const pl = getP(id); if (pl && p) pl.pts.push({ w, p }); }
  const mine = res.me || 0;
  const prize = mine * 10;
  if (prize) { career.money += prize; career.earned = (career.earned || 0) + prize; }
  const final = d.rounds[d.rounds.length - 1][0];
  const champion = final && final.w === 'me';
  d.result = { pts: mine, prize, champion, reached: roundReached(d) };
  if (champion) {
    career.titles.push({ name: d.ev.name, tier: d.tier, season: career.season, at: absWeek(career.season, career.week) });
    career.upPoints += { challenger: 3, contender: 5, star: 8, slam: 15, worlds: 15 }[d.tier];
    career.perkPts = (career.perkPts || 0) + 1;
    career.conf = clamp((career.conf ?? 50) + 15, 5, 100);
    career.news.unshift(`🏆 ${career.me.name} remporte le ${d.ev.name} !`);
  } else aiTitle(d);
  const S = sst(); S.money += prize; if (champion) S.titles++;
  career.results.unshift({ season: career.season, week: career.week, name: d.ev.name, tier: d.tier, reached: d.result.reached, pts: mine });
  career.news = career.news.slice(0, 12);
}

function roundReached(d) {
  const n = d.rounds.length;
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
    if (ev.id === playedId) continue;
    const d = makeDraw(ev, false);
    simRound(d);
    while (!d.done) { nextRound(d); if (!d.done) simRound(d); }
    const w = absWeek(career.season, career.week);
    for (const [id, p] of Object.entries(award(d))) { const pl = getP(id); if (pl && p) pl.pts.push({ w, p }); }
    aiTitle(d);
  }
  const wk = absWeek(career.season, career.week);
  for (const p of career.pool) { const inc = aiIncome(p); if (inc) p.pts.push({ w: wk, p: inc }); }
  // le rival progresse avec toi
  const rival = career.pool.find(p => p.rival);
  if (rival) rival.rating = Math.min(97, Math.max(rival.rating, overall(career.me.stats) + 2) + 0.15);
  // petite évolution des autres joueurs
  for (const p of career.pool) if (!p.rival) p.rating = clamp(p.rating + (rnd() - 0.5) * 0.4, 38, 98);
  weekEconomy();
  career.tour = null;
  career.week++;
  trackRank();
  if (career.week > WEEKS) seasonEnd();
  // nettoyage des vieux points
  const now = absWeek(career.season, career.week);
  for (const p of allPlayers()) p.pts = p.pts.filter(e => e.w > now - WEEKS - 1);
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
  const d = { conf: 50, perks: [], perkPts: 1, money: 500, energy: 100, coach: 0, sponsor: null, offers: [], gear: { bois: 0, rev: 0, shoes: 0 }, trained: 0, earned: 0 };
  for (const k in d) if (career[k] === undefined) career[k] = d[k];
  if (!career.me.prog) career.me.prog = {};
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
  for (const k of STAT_KEYS) st[k] = Math.min(99, career.me.stats[k] + (b[k] || 0) + (pb[k] || 0) + (k === 'mental' && COACHES[career.coach] ? COACHES[career.coach].mental : 0));
  return st;
}
export function buyGear(slot, i) {
  const it = GEAR[slot].items[i];
  if (!it || i <= (career.gear[slot] || 0) || career.money < it.price) return false;
  career.money -= it.price; career.gear[slot] = i; save();
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
  const gain = (0.4 + 1.0 * quality) * COACHES[career.coach].mult / (v < 70 ? 1 : v < 85 ? 1.6 : 2.4);
  let pr = (career.me.prog[k] || 0) + gain;
  while (pr >= 1 && career.me.stats[k] < 99) { pr -= 1; career.me.stats[k]++; }
  career.me.prog[k] = pr; save();
}
export function train(k, quality) {
  if (!canTrain()) return null;
  const v = career.me.stats[k];
  const gain = (0.6 + 1.6 * quality) * COACHES[career.coach].mult / (v < 70 ? 1 : v < 85 ? 1.6 : 2.4);
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
  { id: 'decathlon', name: 'Decathlon', rank: 999, weekly: 100, goal: { t: 'rank', v: 120 }, reward: 1500, color: '#3cff8a' },
  { id: 'joola', name: 'Joola', rank: 130, weekly: 250, goal: { t: 'title', tier: 'challenger' }, reward: 3000, color: '#3cc8ff' },
  { id: 'xiom', name: 'Xiom', rank: 100, weekly: 500, goal: { t: 'rank', v: 50 }, reward: 6000, color: '#ff3d6b' },
  { id: 'stiga', name: 'Stiga', rank: 60, weekly: 1100, goal: { t: 'title', tier: 'contender' }, reward: 12000, color: '#c84dff' },
  { id: 'butterfly', name: 'Butterfly', rank: 32, weekly: 2200, goal: { t: 'rank', v: 16 }, reward: 25000, color: '#ffffff' },
  { id: 'redbull', name: 'Red Bull', rank: 16, weekly: 4000, goal: { t: 'title', tier: 'slam' }, reward: 60000, color: '#ffc83c' },
];
export const goalText = g => g.t === 'rank' ? `Entrer dans le top ${g.v} mondial` : `Gagner un tournoi ${TIERS[g.tier].name}`;
export function sponsorOffers() {
  const rk = rankOf('me');
  return SPONSORS.filter(s => rk <= s.rank && (!career.sponsor || career.sponsor.id !== s.id) && !(career.doneSponsors || []).includes(s.id));
}
export function signSponsor(id) {
  const s = SPONSORS.find(x => x.id === id);
  if (!s) return false;
  career.sponsor = { since: absWeek(career.season, career.week), id: s.id, name: s.name, weekly: s.weekly, goal: s.goal, reward: s.reward, color: s.color, left: WEEKS };
  career.news.unshift(`✍ ${career.me.name} signe avec ${s.name}.`);
  save();
  return true;
}
function checkSponsorGoal() {
  const S = career.sponsor; if (!S || S.done) return;
  const g = S.goal;
  const ok = g.t === 'rank' ? rankOf('me') <= g.v : career.titles.some(t => t.tier === g.tier && t.at >= S.since);
  if (ok) { S.done = true; career.money += S.reward; career.news.unshift(`🎯 Objectif ${S.name} atteint : +${S.reward.toLocaleString('fr-FR')} € de prime !`); }
}
function weekEconomy() {
  const S = career.sponsor;
  if (S) {
    career.money += S.weekly; checkSponsorGoal(); S.left--;
    if (S.left <= 0) { career.news.unshift(`Fin du contrat avec ${S.name}.`); career.doneSponsors = [...(career.doneSponsors || []), S.id]; career.sponsor = null; }
  }
  const c = COACHES[career.coach];
  if (c.cost) {
    if (career.money >= c.cost) career.money -= c.cost;
    else { career.news.unshift(`${c.name} est parti : plus assez d'argent pour le payer.`); career.coach = 0; }
  }
  career.energy = clamp(career.energy + (career.tour ? 18 : 40), 0, 100);
}


// ================================================================== partie 3 : actus, trophées, saisons, Hall of Fame
function sst() {
  if (!career.sstats || career.sstats.season !== career.season) career.sstats = { season: career.season, money: 0, wins: 0, losses: 0, titles: 0, best: null };
  return career.sstats;
}
const TITLE_W = { challenger: 1, contender: 2, star: 4, slam: 10, worlds: 12 };
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
  const has = t => T.some(x => x.tier === t);
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
  return out;
}
export function takePending() { const p = career.pending || []; career.pending = []; save(); return p; }

function trackRank() {
  const rk = rankOf('me');
  career.bestRank = Math.min(career.bestRank || 999, rk);
  if (rk === 1) career.weeksNo1 = (career.weeksNo1 || 0) + 1;
  if (rk <= 10) career.weeksTop10 = (career.weeksTop10 || 0) + 1;
  checkMilestones();
}
export function legacy() {
  let L = career.titles.reduce((a, t) => a + (TITLE_W[t.tier] || 0), 0);
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
  const o = getP(m.a === 'me' ? m.b : m.a);
  const mine = rating(career.me) * formOf() + ((career.conf ?? 50) - 50) / 10;
  const p = 1 / (1 + Math.exp(-(mine - rating(o)) / 5.5));
  const won = rnd() < p;
  const need = Math.floor(bestOf / 2) + 1;
  let a = 0, b = 0;
  while (a < need && b < need) { if (rnd() < (won ? 0.65 : 0.35)) a++; else b++; }
  if (won && a < need) a = need; if (!won && b < need) b = need;
  if (won) b = Math.min(b, need - 1); else a = Math.min(a, need - 1);
  return { won, sets: [a, b], o };
}
