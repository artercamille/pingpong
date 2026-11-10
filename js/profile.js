// Profil joueur : rangs (Fer → Challenger), LP, niveaux/XP, succès, personnalisation, face-à-face.
// Tout est sauvegardé dans le navigateur (localStorage).

const KEY = 'pingpong-profile-v1';

export const TIERS = [
  { name: 'Fer', color: '#7d7a80', glow: '#a9a4ad' },
  { name: 'Bronze', color: '#a3633b', glow: '#e09060' },
  { name: 'Argent', color: '#9aa8b8', glow: '#dfe8f2' },
  { name: 'Or', color: '#d9a830', glow: '#ffe17a' },
  { name: 'Platine', color: '#33b3a0', glow: '#7ff2de' },
  { name: 'Émeraude', color: '#20b866', glow: '#6dffaa' },
  { name: 'Diamant', color: '#5a8cff', glow: '#a9c6ff' },
];
export const APEX = [
  { name: 'Maître', min: 2800, color: '#a24dff', glow: '#d6a6ff' },
  { name: 'Grand Maître', min: 3100, color: '#e8364f', glow: '#ff8a9a' },
  { name: 'Challenger', min: 3500, color: '#e9c46a', glow: '#8ff0ff' },
];
const DIV = ['IV', 'III', 'II', 'I'];

// ------------------------------------------------------------------ personnalisation
export const COSMETICS = {
  paddle: [
    { id: 'rouge', name: 'Rouge pro', color: 0xd0102e, level: 1 },
    { id: 'bleu', name: 'Bleu électrique', color: 0x1f6bff, level: 2 },
    { id: 'vert', name: 'Vert néon', color: 0x2fe06a, level: 4 },
    { id: 'rose', name: 'Rose bonbon', color: 0xff4fb8, level: 6 },
    { id: 'or', name: 'Or massif', color: 0xd9a830, level: 9, metal: true },
    { id: 'chrome', name: 'Chrome', color: 0xd7dde6, level: 13, metal: true },
  ],
  trail: [
    { id: 'blanc', name: 'Classique', color: [0.85, 0.7, 1.0], level: 1 },
    { id: 'violet', name: 'Néon violet', color: [0.85, 0.3, 1.0], level: 3 },
    { id: 'feu', name: 'Feu', color: [1.0, 0.45, 0.1], level: 5 },
    { id: 'glace', name: 'Glace', color: [0.35, 0.85, 1.0], level: 7 },
    { id: 'or', name: 'Or', color: [1.0, 0.8, 0.25], level: 11 },
    { id: 'arcenciel', name: 'Arc-en-ciel', color: 'rainbow', level: 15 },
  ],
  arena: [
    { id: 'finale', name: 'Finale (violet)', neon: 0xd23cff, legs: 0x7a3fd6, light: 0x8a3cff, level: 1 },
    { id: 'neotokyo', name: 'Néo-Tokyo (toit)', venue: 'neotokyo', level: 1 },
    { id: 'beach', name: 'Sunset Beach', venue: 'beach', level: 1 },
    { id: 'underground', name: 'Underground (club)', venue: 'underground', level: 1 },
    { id: 'orbit', name: 'Orbital (espace)', venue: 'orbit', level: 1 },
    { id: 'sakura', name: 'Sakura (temple)', venue: 'sakura', level: 1 },
    { id: 'aurora', name: 'Aurora (banquise)', venue: 'aurora', level: 1 },
    { id: 'glacier', name: 'Glacier (bleu)', neon: 0x3cc8ff, legs: 0x1f6fd6, light: 0x2a8cff, level: 3 },
    { id: 'inferno', name: 'Inferno (rouge)', neon: 0xff3c3c, legs: 0xc8202e, light: 0xff3030, level: 6 },
    { id: 'jungle', name: 'Jungle (vert)', neon: 0x3cff8a, legs: 0x1f9a55, light: 0x20d070, level: 8 },
    { id: 'legende', name: 'Légende (or)', neon: 0xffc83c, legs: 0xb8861b, light: 0xffb020, level: 12 },
  ],
};

// ------------------------------------------------------------------ succès
export const ACHIEVEMENTS = [
  { id: 'tuto', name: 'Diplômé', desc: 'Termine le tutoriel', xp: 50 },
  { id: 'first_win', name: 'Première victoire', desc: 'Gagne ton premier match', xp: 50 },
  { id: 'ace', name: 'Ace !', desc: 'Gagne un point directement sur ton service', xp: 30 },
  { id: 'smash', name: 'Smasheur', desc: 'Gagne un point avec un smash', xp: 30 },
  { id: 'lob', name: 'Lobeur fou', desc: 'Gagne un point avec un lob', xp: 40 },
  { id: 'super', name: 'Coup de grâce', desc: 'Gagne un point avec un super coup', xp: 40 },
  { id: 'rally20', name: 'Marathonien', desc: 'Joue un échange de 20 coups', xp: 60 },
  { id: 'speed70', name: 'Fusée', desc: 'Frappe une balle à plus de 70 km/h', xp: 40 },
  { id: 'perfect_set', name: 'Set parfait', desc: 'Gagne un set 11-0', xp: 100 },
  { id: 'comeback', name: 'Remontada', desc: 'Gagne un set après avoir été mené de 5 points', xp: 80 },
  { id: 'save_mp', name: 'Sauvé !', desc: 'Sauve une balle de match', xp: 60 },
  { id: 'beat_hard', name: 'Patron de l\'IA', desc: 'Bats l\'IA Difficile', xp: 80 },
  { id: 'online_win', name: 'Premier sang', desc: 'Gagne un match en ligne', xp: 60 },
  { id: 'streak5', name: 'En feu', desc: 'Gagne 5 matchs d\'affilée', xp: 100 },
  { id: 'wins10', name: 'Habitué', desc: 'Gagne 10 matchs', xp: 80 },
  { id: 'gold', name: 'Doré', desc: 'Atteins le rang Or', xp: 100 },
  { id: 'diamond', name: 'Diamant brut', desc: 'Atteins le rang Diamant', xp: 200 },
];

// ------------------------------------------------------------------ chargement
function fresh() {
  return {
    name: '', xp: 0, lp: 0, peakLp: 0, ranked: { w: 0, l: 0 },
    wins: 0, losses: 0, streak: 0, h2h: {}, ach: {},
    cos: { paddle: 'rouge', trail: 'blanc', arena: 'finale' },
    best: { rally: 0, speed: 0 },
    daily: null,
    settings: { master: 8, sfx: 8, crowd: 8, music: 5, voice: 0, camera: 0, assist: 1, invert: 0, camV2: 1, camV3: 1, gfx: 1 },
  };
}
export const profile = (() => {
  try {
    const f = fresh(), saved = JSON.parse(localStorage.getItem(KEY)) || {};
    const p = Object.assign(f, saved);
    p.settings = Object.assign(fresh().settings, saved.settings || {});
    if (!p.settings.camV3) { p.settings.camera = 0; p.settings.camV2 = 1; p.settings.camV3 = 1; }
    return p;
  } catch (e) { return fresh(); }
})();
export function save() { try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch (e) {} }

// ------------------------------------------------------------------ rangs
export function rankOf(lp) {
  lp = Math.max(0, Math.round(lp));
  for (let i = APEX.length - 1; i >= 0; i--) {
    if (lp >= APEX[i].min) return { ...APEX[i], tier: TIERS.length + i, div: '', lp: lp - 2800, label: APEX[i].name, apex: true };
  }
  const t = Math.min(TIERS.length - 1, Math.floor(lp / 400));
  const d = Math.min(3, Math.floor((lp - t * 400) / 100));
  return { ...TIERS[t], tier: t, div: DIV[d], lp: lp - t * 400 - d * 100, label: `${TIERS[t].name} ${DIV[d]}`, apex: false };
}
// variation de LP après un match classé (façon Elo)
export function lpDelta(myLp, oppLp, won) {
  const E = 1 / (1 + Math.pow(10, (oppLp - myLp) / 600));
  const low = myLp < 800 ? 8 : 0; // on monte plus vite en bas de l'échelle
  return won ? Math.round(16 + low + 18 * (1 - E)) : -Math.round(12 + 18 * E - low * 0.5);
}

// emblème SVG maison (bouclier + gemme), aux couleurs du rang
export function emblem(lp, size = 56) {
  const r = rankOf(lp);
  const wings = r.tier >= 4 ? `<path d="M6 30 L1 22 L9 25 Z M58 30 L63 22 L55 25 Z" fill="${r.glow}" opacity=".9"/>` : '';
  const crown = r.tier >= 7 ? `<path d="M20 9 L25 2 L32 8 L39 2 L44 9 Z" fill="${r.glow}"/>` : '';
  return `<svg class="emblem" width="${size}" height="${size}" viewBox="0 0 64 64">
    <defs><linearGradient id="g${r.tier}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${r.glow}"/><stop offset="1" stop-color="${r.color}"/></linearGradient></defs>
    ${wings}${crown}
    <path d="M32 6 L54 14 L52 38 Q48 52 32 60 Q16 52 12 38 L10 14 Z" fill="url(#g${r.tier})" stroke="#fff" stroke-opacity=".35" stroke-width="1.5"/>
    <path d="M32 18 L42 30 L32 46 L22 30 Z" fill="#0b0912" opacity=".55"/>
    <path d="M32 21 L39 30 L32 42 L25 30 Z" fill="${r.glow}"/>
  </svg>`;
}

// ------------------------------------------------------------------ niveaux
export function levelOf(xp) {
  let L = 1, need = 120, rest = xp;
  while (rest >= need) { rest -= need; L++; need = 120 + (L - 1) * 30; }
  return { level: L, cur: rest, need };
}
export function unlocksAt(level) {
  const out = [];
  for (const [kind, list] of Object.entries(COSMETICS)) for (const c of list) if (c.level === level) out.push({ kind, ...c });
  return out;
}
export function isUnlocked(item) { return levelOf(profile.xp).level >= item.level; }
export function cosmetic(kind) {
  const list = COSMETICS[kind];
  const c = list.find(x => x.id === profile.cos[kind]);
  return c && isUnlocked(c) ? c : list[0];
}

// ------------------------------------------------------------------ succès
export function unlock(id) {
  if (profile.ach[id]) return null;
  const a = ACHIEVEMENTS.find(x => x.id === id);
  if (!a) return null;
  profile.ach[id] = Date.now();
  profile.xp += a.xp;
  save();
  return a;
}

// ------------------------------------------------------------------ fin de match
// res: { won, mode, oppName, oppLp, ranked, aiLevel, stats, setsWon, setsLost }
export function recordMatch(res) {
  const out = { xp: 0, lpBefore: profile.lp, lpAfter: profile.lp, levelBefore: levelOf(profile.xp).level, ach: [], unlocks: [] };
  const key = (res.oppName || '?').toLowerCase();
  const h = profile.h2h[key] || { name: res.oppName, w: 0, l: 0, streak: 0 };
  if (res.won) { h.w++; h.streak = h.streak > 0 ? h.streak + 1 : 1; profile.wins++; profile.streak = Math.max(1, profile.streak + 1); }
  else { h.l++; h.streak = h.streak < 0 ? h.streak - 1 : -1; profile.losses++; profile.streak = 0; }
  h.name = res.oppName;
  profile.h2h[key] = h;
  out.h2h = { ...h };

  // XP
  let xp = 40 + res.setsWon * 15 + (res.won ? 40 : 0);
  if (res.mode === 'online') xp += 20;
  if (res.mode === 'ai') xp += [0, 10, 25, 0, 50][res.aiLevel] || 0;
  xp += Math.min(30, (res.stats.longest || 0));
  profile.xp += xp; out.xp = xp;

  // LP (uniquement en ligne)
  if (res.ranked) {
    const d = lpDelta(profile.lp, res.oppLp ?? profile.lp, res.won);
    profile.lp = Math.max(0, profile.lp + d);
    profile.peakLp = Math.max(profile.peakLp, profile.lp);
    profile.ranked[res.won ? 'w' : 'l']++;
    out.lpDelta = d; out.lpAfter = profile.lp;
  }
  profile.best.rally = Math.max(profile.best.rally, res.stats.longest || 0);
  profile.best.speed = Math.max(profile.best.speed, res.stats.maxSpeed || 0);
  save();

  // succès liés au match
  const s = res.stats;
  const tryA = id => { const a = unlock(id); if (a) out.ach.push(a); };
  if (res.won) tryA('first_win');
  if (res.won && res.mode === 'ai' && res.aiLevel >= 2) tryA('beat_hard');
  if (res.won && res.mode === 'online') tryA('online_win');
  if (profile.streak >= 5) tryA('streak5');
  if (profile.wins >= 10) tryA('wins10');
  if (rankOf(profile.lp).tier >= 3) tryA('gold');
  if (rankOf(profile.lp).tier >= 6) tryA('diamond');
  for (const id of s.ach || []) tryA(id);

  const lvl = levelOf(profile.xp).level;
  out.levelAfter = lvl;
  for (let L = out.levelBefore + 1; L <= lvl; L++) out.unlocks.push(...unlocksAt(L));
  save();
  return out;
}

// ------------------------------------------------------------------ défis du jour
const DAILY_POOL = [
  { id: 'wins', text: 'Gagne {n} matchs', n: [2, 3], key: 'wins' },
  { id: 'aces', text: 'Réussis {n} aces', n: [2, 3], key: 'aces' },
  { id: 'smash', text: 'Gagne {n} points sur un smash', n: [2, 3], key: 'smashes' },
  { id: 'super', text: 'Gagne {n} points avec un super coup', n: [1, 2], key: 'superWins' },
  { id: 'rally', text: 'Joue un échange de {n} coups', n: [10, 14], key: 'longest', max: true },
  { id: 'points', text: 'Marque {n} points', n: [25, 40], key: 'points' },
  { id: 'winners', text: 'Réussis {n} coups gagnants', n: [8, 12], key: 'winners' },
  { id: 'online', text: 'Joue {n} match en ligne', n: [1, 1], key: 'online' },
];
const today = () => new Date().toISOString().slice(0, 10);
function seeded(str) { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296; }
export function daily() {
  const d = today();
  if (!profile.daily || profile.daily.date !== d) {
    const r = seeded(d);
    const pool = [...DAILY_POOL];
    const list = [];
    while (list.length < 3) {
      const t = pool.splice(Math.floor(r() * pool.length), 1)[0];
      const n = t.n[0] + Math.floor(r() * (t.n[1] - t.n[0] + 1));
      list.push({ id: t.id, text: t.text.replace('{n}', n), target: n, key: t.key, max: !!t.max, progress: 0, done: false });
    }
    profile.daily = { date: d, list, bonus: false };
    save();
  }
  return profile.daily;
}
// met à jour les défis avec les stats d'un match ; renvoie les défis terminés
export function dailyProgress(m) {
  const D = daily(), done = [];
  for (const c of D.list) {
    if (c.done) continue;
    const v = m[c.key] || 0;
    c.progress = c.max ? Math.max(c.progress, v) : c.progress + v;
    if (c.progress >= c.target) { c.progress = c.target; c.done = true; profile.xp += 80; done.push(c); }
  }
  if (!D.bonus && D.list.every(c => c.done)) { D.bonus = true; profile.xp += 150; done.push({ text: 'Tous les défis du jour', bonus: true }); }
  save();
  return done;
}
