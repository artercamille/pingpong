// Point d'entrée : menus, boucle de jeu, HUD, lobby en ligne.
import { Renderer } from './render.js';
import { Game, SHOT_LABEL, MAX_CHARGE, IDEAL_REL, TIMING, RING_T, gradePress } from './game.js';
import { music } from './music.js';
import { announcer } from './voice.js';
import { AI, AI_NAMES } from './ai.js';
import { Input } from './input.js';
import { Net } from './net.js';
import { initAudio, sfx, setMuted, setCrowd, setMuffle, setVolumes } from './audio.js';
import { profile, save as saveProfile, rankOf, emblem, levelOf, cosmetic, COSMETICS, ACHIEVEMENTS, unlock, recordMatch, isUnlocked, daily, dailyProgress } from './profile.js';
import { Recorder, Player, recordCanvas } from './replay.js';
import * as C from './career.js';
import { venueFor, defaultVenue, TRAINING_VENUE, JUBILE_VENUE } from './venues.js';

const $ = s => document.querySelector(s);
const R = new Renderer($('#c'));
const input = new Input();
let game = null, net = null, setup = null, last = performance.now();
let demo = null, ready = false, lastPad = null, tuto = null;
function newDemo() {
  demo = new Game({ mode: 'ai', ctrl: ['ai', 'ai'], me: 0, names: ['Démo', 'Démo'], bestOf: 5, firstServer: 0, hooks: {} });
  demo.ai[0] = new AI(demo, 0, 2); demo.ai[1] = new AI(demo, 1, 2);
}
R.load(p => { $('#loading .lbar div').style.width = (p * 100) + '%'; }).then(() => {
  ready = true; newDemo();
  $('#loading').classList.add('hidden');
}).catch(e => { $('#loading p').textContent = 'Erreur de chargement : ' + e.message; });
let oppName = 'Adversaire', opp = { lp: 0 };
const recorder = new Recorder(6);
let replay = null, bestClip = null, postPoint = null, replayDone = {}, recording = null;

const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
};
$('#name').value = profile.name || store.get('pp-name', '');
$('#name').addEventListener('input', () => { profile.name = $('#name').value.trim(); saveProfile(); });
const myName = () => ($('#name').value.trim() || 'Joueur').slice(0, 14);

// ------------------------------------------------------------------ navigation
function show(id) {
  document.querySelectorAll('#menu .screen').forEach(p => p.classList.toggle('hidden', p.id !== id));
  $('#profile-name').textContent = myName();
  renderPCard();
  renderDaily(id === 'scr-main');
  if (id === 'scr-profile') renderProfile();
  if (id === 'scr-locker') renderLocker();
  if (id === 'scr-career') renderCareer();
  if (id === 'scr-tour') renderTour();
  if (id === 'scr-rank') renderRanking();
  if (id === 'scr-palmares') renderPalmares();
  if (id === 'scr-career-new') renderCreate();
  if (id === 'scr-ctrain') renderCTrain();
  if (id === 'scr-hof') renderHof();
  if (id === 'scr-perks') renderPerks();
  if (id === 'scr-press') renderPress();
  if (id === 'scr-slots') renderSlots();
  if (id === 'scr-cal') renderCal();
  if (id === 'scr-social') renderSocial();
  if (id === 'scr-clocker') renderCLocker();
  if (id === 'scr-pcard') renderPCardScreen();
  if (C.career && id.startsWith('scr-') && CAREER_SCREENS.includes(id)) { coachTipFor(id); music.setStyle(C.career.tour ? C.career.tour.tier : 'contender'); }
  if (id === 'scr-jubile') renderJubile();
  if (id === 'scr-season') renderSeason();
  if (id === 'scr-team') renderTeam();
  if (id === 'scr-shop') renderShop();
  focusIdx = 0; refreshFocus();
  const sc = document.querySelector('#menu .screen:not(.hidden)'); if (sc) sc.closest('.mside') && (sc.closest('.mside').scrollTop = 0);
}

// ------------------------------------------------------------------ profil / vestiaire
function rankLine(lp) {
  const r = rankOf(lp);
  return `<span style="color:${r.glow}">${r.label}</span>`;
}
function renderPCard() {
  const r = rankOf(profile.lp), L = levelOf(profile.xp);
  $('#pcard').innerHTML = `${emblem(profile.lp, 58)}
    <div class="pinfo"><div class="pname">${myName()}</div><div class="prank">${rankLine(profile.lp)}</div>
    <div class="plp">${r.lp} LP <div class="xbar"><div style="width:${r.apex ? 100 : r.lp}%;background:${r.glow}"></div></div></div>
    <div class="plvl">NIV. ${L.level} <div class="xbar"><div style="width:${L.cur / L.need * 100}%"></div></div></div></div>`;
}
function renderDaily(visible) {
  const el = $('#daily');
  el.style.display = visible ? '' : 'none';
  if (!visible) return;
  const D = daily();
  const h = new Date(); const left = 24 - h.getHours();
  el.innerHTML = `<h3><span>DÉFIS DU JOUR</span><small>encore ${left} h</small></h3>` + D.list.map(c => `<div class="dc ${c.done ? 'done' : ''}">
    <span>${c.done ? '✔ ' : ''}${c.text}<b>${c.progress}/${c.target}</b></span><div class="xbar"><div style="width:${c.progress / c.target * 100}%"></div></div></div>`).join('')
    + `<small>+80 XP par défi · +150 XP bonus si tu fais les 3</small>`;
}
function renderProfile() {
  const tot = profile.wins + profile.losses;
  const ps = [
    ['Rang', rankLine(profile.lp)], ['Meilleur rang', rankLine(profile.peakLp)], ['Niveau', levelOf(profile.xp).level],
    ['Victoires', profile.wins], ['Défaites', profile.losses], ['% victoires', tot ? Math.round(profile.wins / tot * 100) + '%' : '—'],
    ['Classé (V/D)', `${profile.ranked.w} / ${profile.ranked.l}`], ['Plus long échange', profile.best.rally], ['Balle la + rapide', Math.round(profile.best.speed) + ' km/h'],
  ];
  $('#pstats').innerHTML = ps.map(([k, v]) => `<div class="ps"><b>${v}</b><small>${k}</small></div>`).join('');
  $('#achgrid').innerHTML = ACHIEVEMENTS.map(a => `<div class="ach ${profile.ach[a.id] ? 'on' : ''}"><span class="tr">${profile.ach[a.id] ? '🏆' : '🔒'}</span><span><b>${a.name}</b><small>${a.desc} · +${a.xp} XP</small></span></div>`).join('');
}
function renderLocker() {
  document.querySelectorAll('.opt.cos').forEach(o => {
    const kind = o.dataset.kind, list = COSMETICS[kind];
    if (o.dataset.i === undefined) o.dataset.i = Math.max(0, list.findIndex(c => c.id === profile.cos[kind]));
    const c = list[+o.dataset.i];
    const ov = o.querySelector('.ov');
    const ok = isUnlocked(c);
    ov.textContent = ok ? c.name : `🔒 ${c.name} · niv. ${c.level}`;
    ov.classList.toggle('locked', !ok);
    if (ok && profile.cos[kind] !== c.id) { profile.cos[kind] = c.id; saveProfile(); applyCosmetics(); }
  });
}
document.querySelectorAll('.opt.cos').forEach(o => {
  o.dataset.values = COSMETICS[o.dataset.kind].map(c => c.name).join('|');
  o.dataset.v = COSMETICS[o.dataset.kind].map((c, i) => i).join('|');
});
function applyCosmetics(oppPaddle, oppTrail) {
  const me = game ? game.me : 0;
  R.setVenue(defaultVenue(cosmetic('arena')));
  const pad = cosmetic('paddle');
  const op = oppPaddle ? COSMETICS.paddle.find(c => c.id === oppPaddle) : null;
  const opp = op || (pad.id === 'bleu' ? COSMETICS.paddle[0] : COSMETICS.paddle[1]);
  const ot = oppTrail ? COSMETICS.trail.find(c => c.id === oppTrail) : null;
  for (let i = 0; i < 4; i++) {
    const c = i === me ? pad : (i % 2 !== me % 2 && i < 2 ? opp : COSMETICS.paddle[(i + 2) % COSMETICS.paddle.length]);
    R.paddles[i].setColor(c.color, c.metal);
    R.trailColors[i] = i === me ? cosmetic('trail').color : (ot && i % 2 !== me % 2 ? ot.color : COSMETICS.trail[0].color);
  }
}
function toast(icon, small, title, text) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span class="tr">${icon}</span><div><small>${small}</small><b>${title}</b><span>${text}</span></div>`;
  $('#toasts').appendChild(t);
  sfx.unlock();
  setTimeout(() => t.remove(), 4200);
}
function achToast(id) {
  const a = unlock(id);
  if (a) toast('🏆', 'SUCCÈS DÉBLOQUÉ', a.name, `${a.desc} · +${a.xp} XP`);
}
document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => {
  initAudio(); sfx.ui();
  store.set('pp-name', $('#name').value.trim());
  if (b.id === 'host-back' || b.id === 'join-back') resetNet();
  show(b.dataset.go);
}));
// sélecteurs ◀ valeur ▶
function optRender(o) { o.querySelector('.ov').textContent = o.dataset.values.split('|')[+o.dataset.i]; }
function optStep(o, d) {
  const n = o.dataset.values.split('|').length;
  o.dataset.i = (+o.dataset.i + d + n) % n; optRender(o); sfx.ui();
  if (o.closest('#scr-career-new')) renderCreate();
  if (o.closest('#scr-ctrain')) renderCTrain();
}
document.querySelectorAll('.opt').forEach(o => {
  optRender(o);
  o.addEventListener('click', e => { initAudio(); const r = o.getBoundingClientRect(); optStep(o, e.clientX < r.left + r.width * 0.5 ? -1 : 1); });
});
const choice = id => { const o = $('#' + id); const v = o.dataset.v.split('|')[+o.dataset.i]; return isNaN(+v) ? v : +v; };

// ------------------------------------------------------------------ options
const CAMS = ['raquette', 'tv', 'haute'];
function applySettings() {
  const S = profile.settings;
  setVolumes({ master: S.master / 10, sfx: S.sfx / 10, crowd: S.crowd / 10, music: S.music / 10 });
  announcer.enabled = !!S.voice;
  R.camMode = CAMS[S.camera] || 'raquette';
  input.invertY = !!S.invert;
  if (game) game.assist = S.assist;
}
document.querySelectorAll('.opt.set').forEach(o => {
  o.dataset.i = profile.settings[o.dataset.key];
  o.dataset.v = o.dataset.values.split('|').map((_, i) => i).join('|');
  optRender(o);
  o.addEventListener('click', () => setTimeout(() => { profile.settings[o.dataset.key] = +o.dataset.i; saveProfile(); applySettings(); }));
});
function settingStep(o) { if (o.classList.contains('set')) { profile.settings[o.dataset.key] = +o.dataset.i; saveProfile(); applySettings(); } }
document.querySelectorAll('.opt.cos').forEach(o => o.addEventListener('click', () => setTimeout(renderLocker)));

// navigation manette / clavier dans les menus
let focusIdx = 0, navCool = 0;
function activeLayer() {
  if (!$('#ceremony').classList.contains('hidden')) return $('#ceremony');
  if (!$('#end').classList.contains('hidden')) return $('#end');
  if (!$('#pause').classList.contains('hidden')) return $('#pause');
  if (!$('#menu').classList.contains('hidden')) return document.querySelector('#menu .screen:not(.hidden)');
  return null;
}
function navItems() {
  const L = activeLayer();
  if (!L) return [];
  return [...L.querySelectorAll('.mbtn, .opt, [data-nav]')].filter(e => e.offsetParent !== null);
}
function refreshFocus() {
  const items = navItems();
  if (!items.length) return;
  focusIdx = Math.max(0, Math.min(items.length - 1, focusIdx));
  document.querySelectorAll('.focus').forEach(e => e.classList.remove('focus'));
  const el = items[focusIdx];
  el.classList.add('focus');
  try { el.scrollIntoView({ block: 'nearest' }); } catch (e) {}
  if (el.tagName === 'INPUT') el.focus(); else if (document.activeElement && document.activeElement.tagName === 'INPUT') document.activeElement.blur();
}
document.addEventListener('mouseover', e => {
  const t = e.target.closest && e.target.closest('.mbtn, .opt, [data-nav]');
  if (!t) return;
  const i = navItems().indexOf(t);
  if (i >= 0 && i !== focusIdx) { focusIdx = i; refreshFocus(); }
});
function navBack() {
  const L = activeLayer();
  if (!L) return;
  if (L.id === 'pause') { togglePause(false); return; }
  const back = L.querySelector('.mbtn.ghost[data-go]');
  if (back) back.click();
}
function navInput(inp, dt) {
  const items = navItems();
  if (!items.length) return;
  navCool -= dt;
  const v = inp.my > 0.6 ? -1 : inp.my < -0.6 ? 1 : 0;
  const h = inp.mx > 0.6 ? 1 : inp.mx < -0.6 ? -1 : 0;
  const typing = document.activeElement && document.activeElement.tagName === 'INPUT';
  if ((v || h) && navCool <= 0 && !(typing && h)) {
    navCool = 0.2;
    if (v) { focusIdx = (focusIdx + v + items.length) % items.length; refreshFocus(); sfx.ui(); }
    else if (items[focusIdx].classList.contains('opt')) { optStep(items[focusIdx], h); if (items[focusIdx].classList.contains('cos')) renderLocker(); settingStep(items[focusIdx]); }
  }
  if (!v && !h) navCool = 0;
  if (inp.pressed.top && !typing) { initAudio(); const el = items[focusIdx]; if (el.classList.contains('opt')) { optStep(el, 1); if (el.classList.contains('cos')) renderLocker(); settingStep(el); } else el.click(); }
  if (inp.pressed.plat && !typing) navBack();
  // stick droit : défilement des longues listes
  try {
    for (const gp of navigator.getGamepads ? navigator.getGamepads() : []) {
      if (!gp) continue; const ry = gp.axes[3] || 0;
      if (Math.abs(ry) > 0.25) { const L = activeLayer(); const box = L && ([...L.querySelectorAll('#rank-list, #palm, #hof, #bracket, #social, #cal, #staff, #shop')].find(e => e.offsetParent) || L.closest('.mside')); if (box) box.scrollTop += ry * 900 * dt; }
    }
  } catch (e) {}
}
addEventListener('keydown', e => {
  if (!activeLayer()) return;
  if (e.key === 'Enter') { const el = navItems()[focusIdx]; if (el) { e.preventDefault(); initAudio(); el.tagName === 'INPUT' ? (el.id === 'join-code' ? $('#join-go').click() : $('#scr-profile .mbtn').click()) : el.click(); } }
  if (e.key === 'Escape' && $('#pause').classList.contains('hidden')) navBack();
  if (document.activeElement.tagName === 'INPUT' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    e.preventDefault(); focusIdx += e.key === 'ArrowUp' ? -1 : 1; refreshFocus();
  }
});

// glyphes de touches selon le périphérique
function kb(name) {
  const pad = !!input.padName;
  const P = { top: ['a', 'A'], plat: ['b', 'B'], coupe: ['x', 'X'], lob: ['y', 'Y'], ok: ['a', 'A'], back: ['b', 'B'] };
  const K = { top: 'J', plat: 'K', coupe: 'U', lob: 'I', ok: 'Entrée', back: 'Échap', start: 'Échap', move: 'ZQSD', sideL: 'A', sideR: 'E', super: 'L' };
  if (pad) {
    if (P[name]) return `<span class="kb pad ${P[name][0]}">${P[name][1]}</span>`;
    if (name === 'move') return '<span class="kb pad">Stick gauche</span>';
    if (name === 'start') return '<span class="kb pad">Start</span>';
    if (name === 'super') return '<span class="kb pad">RT</span>';
  }
  return `<span class="kb key">${K[name] || name}</span>`;
}
function refreshGlyphs() {
  document.querySelectorAll('.kb[data-k]').forEach(e => { e.outerHTML = kb(e.dataset.k).replace('<span ', `<span data-k="${e.dataset.k}" `); });
}

// ------------------------------------------------------------------ démarrage
function hooks() {
  return {
    feedback: (i, label, q, shot) => {
      if (!game) return;
      if (i === game.me) showFeedback(label, q, shot);
      else showOpp(label, shot);
    },
    point: (w, reason, setWon, rally) => {
      const m = game.match;
      if (m.over) banner(`${game.names[m.winner]} remporte le match`, '', 2.6);
      else if (setWon) banner(`Manche ${game.names[w]}`, '', 2.5);
      else if (game.pressure) banner(game.pressure.type === 'match' ? 'BALLE DE MATCH' : 'BALLE DE MANCHE', game.names[game.pressure.p], 2);
      const run = game.run;
      if (run.n >= 3 && !m.over) showStreak(run.p === game.myTeam ? `${run.n} points d'affilée 🔥` : `${game.names[run.p]} enchaîne : ${run.n} points`);
      const pts = document.querySelector(`#board .row[data-p="${w}"] .pts`);
      if (pts) { pts.classList.remove('pop'); void pts.offsetWidth; pts.classList.add('pop'); }
      if (m.over && m.winner === game.myTeam) R.confetti();
      // réactions des bonshommes
      const ls2 = game.lastShot[w] || {};
      const hype = rally + 1 >= 6 || setWon || m.over || ((ls2.smash || ls2.sup) && reason === 'Point gagnant');
      const teamOf = t => game.doubles ? [t, t + 2] : [t];
      if (hype) { teamOf(w).forEach(i => R.figures[i].celebrate(true)); if (setWon || m.over) teamOf(1 - w).forEach(i => R.figures[i].celebrate(false)); }
      // voix
      if (m.over) announcer.say(`Jeu et match, ${game.names[m.winner]} !`, true);
      else if (setWon) announcer.say(`Manche, ${game.names[w]}`, true);
      else if (reason === 'Ace !') announcer.say('Ace !', true);
      else if (ls2.sup && reason === 'Point gagnant') announcer.say('Incroyable !', true);
      else if (rally + 1 >= 12) announcer.say('Quel échange !', true);
      // ralenti sur les gros points
      const ls = game.lastShot[w] || {};
      const big = rally + 1 >= 8 || ((ls.smash || ls.sup) && reason === 'Point gagnant') || setWon || m.over || game.ach.includes('save_mp') && !replayDone.save_mp;
      if (game.ach.includes('save_mp')) replayDone.save_mp = true;
      const score = rally + 1 + (reason === 'Point gagnant' ? 3 : 0) + (ls.sup ? 4 : 0) + (ls.smash ? 2 : 0);
      postPoint = { t: 0.75, big, score };
    },
    ach: id => achToast(id),
    superArmed: i => { if (game && i === game.me) banner('SUPER COUP PRÊT', 'Ton prochain coup va partir comme une fusée', 1.4); },
    serve: s => {
      if (!game || tuto || setup.mode === 'training') return;
      const m = game.match;
      const a = m.score[s], b = m.score[1 - s];
      if (game.pressure) announcer.say(`${a}, ${b}. ${game.pressure.type === 'match' ? 'Balle de match' : 'Balle de manche'}`);
      else if (a === b && a >= 10) announcer.say('Égalité');
      else if (a + b > 0) announcer.say(`${a}, ${b}`);

    },
    message: t => banner(t, '', 1.5),
    over: m => showEnd(m),
  };
}

function startAI() {
  const level = choice('ai-level'), bestOf = choice('ai-format');
  setup = { mode: 'ai', level, bestOf };
  const doubles = choice('ai-mode') === 'double';
  const pool = [...AI_NAMES].sort(() => Math.random() - 0.5);
  const first = n => n.split(' ')[0];
  if (doubles) {
    const pn = [myName(), pool[0], pool[1], pool[2]];   // 0 toi, 1 adv., 2 ton partenaire, 3 adv.
    setup.aiStyle = '';
    game = new Game({ mode: 'ai', ctrl: ['human', 'ai', 'ai', 'ai'], me: 0, names: [`${first(pn[0])} / ${first(pn[2])}`, `${first(pn[1])} / ${first(pn[3])}`],
      playerNames: pn, assist: profile.settings.assist, bestOf, firstServer: Math.random() < 0.5 ? 0 : 1, hooks: hooks() });
    for (let i = 1; i < 4; i++) game.ai[i] = new AI(game, i, level);
    enterGame();
    return;
  }
  const ai = new AI(null, 1, level);
  const nm = pool[0];
  setup.aiName = nm; setup.aiStyle = ai.style.name;
  game = new Game({ mode: 'ai', ctrl: ['human', 'ai'], me: 0, names: [myName(), nm], assist: profile.settings.assist,
    bestOf, firstServer: Math.random() < 0.5 ? 0 : 1, hooks: hooks() });
  ai.g = game; game.ai[1] = ai;
  enterGame();
}

function startTraining(cfgIn, career) {
  const cfg = cfgIn || { type: choice('tr-type'), zone: choice('tr-zone'), speed: choice('tr-speed') };
  setup = { mode: 'training', level: 0, bestOf: 99, career };
  setTimeout(() => { if (career && game) { R.setVenue(TRAINING_VENUE); setup.crowdMul = 0.1; } }, 0);
  game = new Game({ mode: 'ai', ctrl: ['human', 'robot'], me: 0, names: [myName(), 'Robot'], bestOf: 99, assist: profile.settings.assist,
    training: cfg, hooks: { ...hooks(), point: () => {}, train: (ok, T) => { renderTrain(ok, T); if (setup.career && T.total >= 20) finishCareerTraining(T); } } });
  enterGame();
  document.body.classList.add('training');
  $('#trainhud').classList.remove('hidden');
  renderTrain(null, game.train);
}
function renderTrain(ok, T) {
  $('#trainhud').innerHTML = (setup.career ? `<div><b>${[].concat(setup.career).map(k => C.STAT_NAMES[k]).join(' + ')}</b><small>BALLE ${Math.min(20, T.total + 1)} / 20</small></div>` : '') + `<div><b>${T.ok} / ${T.total}</b><small>RÉUSSIS</small></div><div><b>${T.streak}</b><small>SÉRIE</small></div><div><b>${T.best}</b><small>RECORD</small></div>`;
  if (ok && T.streak > 0 && T.streak % 10 === 0) { showStreak(`${T.streak} d'affilée 🔥`); sfx.crowd(2); }
}
$('#tr-go').addEventListener('click', () => { initAudio(); sfx.ui(); startTraining(); });

function startOnline(me, bestOf, firstServer, names, dbl = null) {
  setup = { mode: 'online', me, bestOf, dbl };
  let ctrl;
  if (dbl) ctrl = dbl.kinds.map((k, i) => i === me ? 'human' : (k === 'ai' && net.isHost ? 'ai' : 'remote'));
  else ctrl = me === 0 ? ['human', 'remote'] : ['remote', 'human'];
  game = new Game({ mode: 'online', ctrl, me, names, playerNames: dbl ? dbl.playerNames : names, bestOf, firstServer, net, hooks: hooks(), assist: profile.settings.assist });
  if (dbl) ctrl.forEach((c, i) => { if (c === 'ai') game.ai[i] = new AI(game, i, 1); });
  net.onMessage = onNetMessage;
  net.onClose = () => {
    if (net && net.isHost) net.send({ t: 'quit' });
    banner(dbl ? 'Un joueur s\'est déconnecté' : 'Ton pote s\'est déconnecté', 'Retour au menu…', 3);
    setTimeout(() => quitToMenu(), 2500);
  };
  enterGame(opp.paddle, opp.trail);
}

function enterGame(oppPaddle, oppTrail) {
  initAudio();
  applyCosmetics(oppPaddle, oppTrail);
  [0x3d8bff, 0xff3d6b, 0x3de8ff, 0xffa23d].forEach((c, i) => { R.figures[i].setColor(c); R.figures[i].setAccessory(0); });
  R.setCrowdDensity(1); R.setEventTitle(null); R.setTarget(null); R.setAim(null); $('#walkout').classList.add('hidden');
  recorder.reset(); bestClip = null; replay = null; postPoint = null; replayDone = {};
  if (!tuto && setup.mode !== 'training') { game.stateT = 3.4; R.intro = 3.2; showVS(); } else { R.intro = 0; game.stateT = 1; }
  music.stop();
  document.body.classList.remove('replaying'); $('#replay').classList.add('hidden');
  $('#menu').classList.add('hidden');
  $('#end').classList.add('hidden');
  $('#pause').classList.add('hidden');
  $('#hud').classList.remove('hidden');

}

function quitToMenu(scr = 'scr-main') {
  game = null; tuto = null;
  $('#tuto').classList.add('hidden'); $('#board').classList.remove('hidden');
  $('#vs').classList.add('hidden'); R.intro = 0;
  document.body.classList.remove('training'); $('#trainhud').classList.add('hidden'); $('#ring').className = '';
  timeout = null;
  resetNet();
  $('#hud').classList.add('hidden');
  $('#end').classList.add('hidden');
  $('#pause').classList.add('hidden');
  $('#menu').classList.remove('hidden');
  show(scr);
  applyCosmetics();
}

function resetNet() {
  if (net) { net.onClose = () => {}; net.destroy(); net = null; }
  $('#host-box').classList.add('hidden');
  $('#host-go').classList.remove('hidden');
  $('#host-start').classList.add('hidden'); $('#host-lobby').innerHTML = '';
  $('#host-status').textContent = 'En attente de ton pote…';
  $('#join-status').textContent = '';
}

$('#ai-go').addEventListener('click', () => { sfx.ui(); startAI(); });

// ------------------------------------------------------------------ lobby en ligne
$('#host-go').addEventListener('click', () => {
  initAudio(); sfx.ui();
  if (!window.Peer) { $('#host-status').textContent = 'PeerJS introuvable.'; return; }
  resetNet();
  net = new Net();
  const bestOf = choice('host-format');
  const dblMode = choice('host-mode') === 'double';
  net.maxGuests = dblMode ? 3 : 1;
  lobby = [];
  renderLobby(dblMode);
  $('#host-go').classList.add('hidden');
  $('#host-box').classList.remove('hidden');
  $('#host-code').textContent = '·····';
  $('#host-status').textContent = 'Connexion au serveur…';
  net.host(code => {
    $('#host-code').textContent = code;
    $('#host-status').textContent = 'En attente de ton pote…';
  }, conn => {
    $('#host-status').textContent = dblMode ? 'Un joueur a rejoint !' : 'Pote connecté !';
    net.onMessage = (msg, from) => {
      if (msg.t === 'hello' && dblMode) {
        if (!lobby.find(l => l.conn === from)) lobby.push({ conn: from, name: (msg.name || 'Invité').slice(0, 14), paddle: msg.paddle, trail: msg.trail });
        renderLobby(true);
        return;
      }
      if (msg.t === 'hello') {
        oppName = (msg.name || 'Invité').slice(0, 14);
        const firstServer = Math.random() < 0.5 ? 0 : 1;
        const names = [myName(), oppName];
        opp = { lp: msg.lp ?? 0, paddle: msg.paddle, trail: msg.trail };
        net.send({ t: 'start', bestOf, firstServer, names, lp: profile.lp, paddle: profile.cos.paddle, trail: profile.cos.trail });
        startOnline(0, bestOf, firstServer, names);
      }
    };
  }, err => { $('#host-status').textContent = err; });
});
let lobby = [];
function renderLobby(dbl) {
  const el = $('#host-lobby');
  $('#host-start').classList.toggle('hidden', !dbl || !lobby.length);
  if (!dbl) { el.innerHTML = ''; return; }
  const slot = k => k === 0 ? `<div>${myName()} (toi)</div>` : lobby[k - 1] ? `<div>${lobby[k - 1].name}</div>` : '<div class="ai">IA</div>';
  el.innerHTML = `<div class="team"><b>ÉQUIPE BLEUE</b>${slot(0)}${slot(2)}</div><div class="team r"><b>ÉQUIPE ROUGE</b>${slot(1)}${slot(3)}</div>`;
  $('#host-status').textContent = lobby.length ? `${lobby.length + 1} joueur${lobby.length ? 's' : ''} · jusqu'à 4` : 'Envoie le code à 1, 2 ou 3 potes…';
}
$('#host-start').addEventListener('click', () => {
  if (!net || !lobby.length) return;
  net.locked = true;
  const bestOf = choice('host-format');
  const pool = [...AI_NAMES].sort(() => Math.random() - 0.5);
  const first = n => n.split(' ')[0];
  const kinds = [0, 1, 2, 3].map(k => k === 0 ? 'host' : lobby[k - 1] ? 'guest' : 'ai');
  const playerNames = [0, 1, 2, 3].map(k => k === 0 ? myName() : lobby[k - 1] ? lobby[k - 1].name : pool[k]);
  const names = [`${first(playerNames[0])} / ${first(playerNames[2])}`, `${first(playerNames[1])} / ${first(playerNames[3])}`];
  const firstServer = Math.random() < 0.5 ? 0 : 1;
  const dbl = { kinds, playerNames };
  lobby.forEach((l, k) => net.sendTo(l.conn, { t: 'start', lobby: true, mode: 'double', me: k + 1, bestOf, firstServer, names, dbl }));
  opp = { lp: 0 };
  startOnline(0, bestOf, firstServer, names, dbl);
});
$('#copy').addEventListener('click', () => {
  const c = $('#host-code').textContent;
  try { navigator.clipboard.writeText(c); $('#copy').textContent = 'Copié !'; setTimeout(() => $('#copy').textContent = 'Copier le code', 1500); } catch (e) {}
});

$('#join-go').addEventListener('click', () => {
  initAudio(); sfx.ui();
  const code = $('#join-code').value.trim().toUpperCase();
  if (code.length < 5) { $('#join-status').textContent = 'Le code fait 5 caractères.'; return; }
  if (!window.Peer) { $('#join-status').textContent = 'PeerJS introuvable.'; return; }
  resetNet();
  net = new Net();
  $('#join-status').textContent = 'Connexion…';
  net.join(code, () => {
    $('#join-status').textContent = 'Connecté ! Lancement…';
    net.onMessage = msg => {
      if (msg.t === 'start' && msg.mode === 'double') { opp = { lp: 0 }; startOnline(msg.me, msg.bestOf, msg.firstServer, msg.names, msg.dbl); return; }
      if (msg.t === 'start') { opp = { lp: msg.lp ?? 0, paddle: msg.paddle, trail: msg.trail }; startOnline(1, msg.bestOf, msg.firstServer, msg.names); }
      if (msg.t === 'full') $('#join-status').textContent = 'La partie est complète ou déjà lancée.';
    };
    net.send({ t: 'hello', lobby: true, name: myName(), lp: profile.lp, paddle: profile.cos.paddle, trail: profile.cos.trail });
  }, err => { $('#join-status').textContent = err; });
});
$('#join-code').addEventListener('keydown', e => { if (e.key === 'Enter') $('#join-go').click(); });

function onNetMessage(msg) {
  if (msg.t === 'rematch') { restartOnline(msg.firstServer); return; }
  if (msg.t === 'rematchReq') {
    if (setup.me === 0) { const fs = Math.random() < 0.5 ? 0 : 1; net.send({ t: 'rematch', firstServer: fs }); restartOnline(fs); }
    return;
  }
  if (msg.t === 'quit') { banner('Ton pote a quitté la partie', '', 2.5); setTimeout(() => quitToMenu(), 2200); return; }
  if (replay && !replay.end && (msg.t === 'toss' || msg.t === 'hit')) endReplay();
  if (msg.t === 'timeout') { timeout = { by: msg.name, pending: true, left: 30 }; banner(`Temps mort : ${msg.name}`, 'Il commence à la fin du point', 1.8); return; }
  if (msg.t === 'resume') { endTimeout(false); return; }
  game && game.onNet(msg);
}
function restartOnline(fs) {
  const names = game.names;
  startOnline(setup.me, setup.bestOf, fs, names, setup.dbl);
}

// ------------------------------------------------------------------ fin / pause
function showEnd(m) {
  setTimeout(() => music.start(0.4), 1500);
  const me = game.myTeam, op = 1 - me;
  const win = m.winner === me;
  $('#end-title').textContent = setup.mode !== 'online' ? (win ? 'Victoire !' : 'Défaite…') : (win ? 'Tu as gagné !' : `${game.names[m.winner]} gagne`);
  $('#end-sets').innerHTML = m.history.map((h, i) => `Manche ${i + 1} : <b>${h[me]}</b> – <b>${h[op]}</b>`).join('<br>');
  $('#end-status').textContent = '';
  const sum = game.summary();
  const setsWon = m.sets[me], setsLost = m.sets[op];
  const ranked = setup.mode === 'online' && !game.doubles;
  const res = recordMatch({ won: win, mode: ['career', 'farewell', 'sparring'].includes(setup.mode) ? 'ai' : setup.mode, oppName: game.names[op], oppLp: opp.lp, ranked, aiLevel: setup.level,
    setsWon, setsLost, stats: { longest: sum.longest, maxSpeed: sum.stats[me].maxSpeed, ach: sum.ach } });
  // rang
  if (ranked) {
    const rb = rankOf(res.lpBefore), ra = rankOf(res.lpAfter);
    const promo = ra.tier > rb.tier || (ra.tier === rb.tier && ra.div !== rb.div && res.lpDelta > 0) ? 'PROMOTION !' : (ra.tier < rb.tier || (ra.tier === rb.tier && ra.div !== rb.div && res.lpDelta < 0)) ? 'RÉTROGRADATION' : 'CLASSÉ';
    $('#end-rank').innerHTML = `<div class="rankbox">${emblem(res.lpAfter, 64)}<div><div class="promo">${promo}</div><div class="rl" style="color:${ra.glow}">${ra.label}</div><div>${ra.lp} LP</div></div>
      <div style="margin-left:auto" class="rd ${res.lpDelta >= 0 ? 'up' : 'down'}">${res.lpDelta >= 0 ? '+' : ''}${res.lpDelta} LP</div></div>`;
  } else if (setup.mode === 'career') $('#end-rank').innerHTML = careerEnd(win, setsWon, setsLost);
  else if (setup.mode === 'sparring') {
    const S2 = game.summary().stats, tot = S2[me].points + S2[op].points, r = C.sparringDone(setup.stat, S2[me].points / Math.max(1, tot), win);
    $('#end-rank').innerHTML = `<div class="endcareer">🏋 Sparring terminé : ${S2[me].points} points marqués sur ${tot}. ${r && r.up ? `<b>+${r.up} en ${C.STAT_NAMES[setup.stat].toLowerCase()} !</b>` : 'La progression continue.'}</div>`;
  }
  else if (setup.mode === 'farewell') { $('#end-rank').innerHTML = `<div class="endcareer">${win ? '👋 Une dernière victoire pour la route. Le public se lève pour toi.' : '👋 Défaite pour ton dernier match, mais le public scande ton nom.'}</div>`; setTimeout(() => { R.confetti(); sfx.crowd(3); announcer.say(`Merci pour tout, ${C.career.me.name} !`, true); }, 800); }
  else $('#end-rank').innerHTML = `<div class="infobox">Match amical contre l'IA : pas de LP en jeu. <b>Les matchs en ligne sont classés.</b></div>`;
  // face-à-face
  const h = res.h2h;
  const streak = h.streak > 1 ? `<br>Série : <b>${h.streak} victoires d'affilée</b> 🔥` : h.streak < -1 ? `<br>Série : <b>${-h.streak} défaites d'affilée</b>, il faut se venger !` : '';
  $('#end-h2h').innerHTML = `<div class="infobox">Face-à-face contre <b>${h.name}</b> : <b>${h.w} – ${h.l}</b>${streak}</div>`;
  // XP / niveau
  const L = levelOf(profile.xp);
  const unl = res.unlocks.length ? `<div class="unl">🎁 Débloqué : ${res.unlocks.map(u => u.name).join(', ')}</div>` : '';
  $('#end-xp').innerHTML = `<div class="infobox"><b>+${res.xp} XP</b> · Niveau ${L.level}${res.levelAfter > res.levelBefore ? ' <b style="color:#6ee7a8">NIVEAU SUPÉRIEUR !</b>' : ''}
    <div class="xbar" style="margin-top:8px"><div style="width:${L.cur / L.need * 100}%"></div></div>${unl}</div>`;
  const achs = sum.ach.map(id => ACHIEVEMENTS.find(a => a.id === id)).filter(Boolean);
  $('#end-ach').innerHTML = achs.length ? `<div class="infobox">🏆 ${achs.map(a => `<b>${a.name}</b>`).join(' · ')}</div>` : '';
  // stats
  const S = sum.stats;
  const row = (label, a, b, higher = true) => {
    const ba = higher ? a > b : a < b, bb = higher ? b > a : b < a;
    return `<tr><td class="${ba ? 'best' : ''}">${a}</td><td>${label}</td><td class="${bb ? 'best' : ''}">${b}</td></tr>`;
  };
  $('#end-stats').innerHTML = `<table class="stt"><tr><th>${game.names[me]}</th><th></th><th>${game.names[op]}</th></tr>
    ${row('Points', S[me].points, S[op].points)}${row('Coups gagnants', S[me].winners, S[op].winners)}
    ${row('Fautes', S[me].errors, S[op].errors, false)}${row('Aces', S[me].aces, S[op].aces)}
    ${row('Smashs gagnants', S[me].smashes, S[op].smashes)}${row('Super coups', S[me].supers, S[op].supers)}
    ${row('Vitesse max', Math.round(S[me].maxSpeed) + ' km/h', Math.round(S[op].maxSpeed) + ' km/h')}
    <tr><td colspan="3">Plus long échange : <b>${sum.longest} coups</b></td></tr></table>`;
  $('#bestpt').classList.toggle('hidden', !bestClip);
  $('#again').innerHTML = setup.mode === 'sparring' ? '<span><b>Continuer</b><small>Retour à l\'entraînement</small></span>' : setup.mode === 'farewell' ? '<span><b>Continuer</b><small>Retour au jubilé</small></span>' : setup.mode === 'career' ? '<span><b>Continuer</b><small>Retour au tableau du tournoi</small></span>' : '<span><b>Revanche</b><small>On remet ça tout de suite</small></span>';
  $('#tomenu').classList.toggle('hidden', ['career', 'farewell', 'sparring'].includes(setup.mode));
  for (const u of res.unlocks) toast('🎁', 'DÉBLOQUÉ', u.name, u.kind === 'paddle' ? 'Nouvelle raquette' : u.kind === 'trail' ? 'Nouvelle traînée' : 'Nouvelle salle');
  const dd = dailyProgress({ wins: win ? 1 : 0, aces: S[me].aces, smashes: S[me].smashes, superWins: S[me].superWins, longest: sum.longest,
    points: S[me].points, winners: S[me].winners, online: setup.mode === 'online' ? 1 : 0 });
  dd.forEach((c, k) => setTimeout(() => toast('⭐', c.bonus ? 'BONUS' : 'DÉFI DU JOUR RÉUSSI', c.text, c.bonus ? '+150 XP' : '+80 XP'), 600 + k * 700));
  $('#end').classList.remove('hidden');
  focusIdx = 0; refreshFocus();
}
function again() {
  sfx.ui();
  if (!game) return;
  if (setup.mode === 'ai') { startAI(); return; }
  if (setup.mode === 'career') { quitToMenu(C.career.tour ? 'scr-tour' : 'scr-career'); return; }
  if (setup.mode === 'farewell') { quitToMenu('scr-jubile'); return; }
  if (setup.mode === 'sparring') { quitToMenu('scr-ctrain'); return; }
  if (setup.me === 0) { const fs = Math.random() < 0.5 ? 0 : 1; net.send({ t: 'rematch', firstServer: fs }); restartOnline(fs); }
  else { net.send({ t: 'rematchReq' }); $('#end-status').textContent = 'Demande envoyée…'; }
}
$('#again').addEventListener('click', again);
$('#bestpt').addEventListener('click', async () => {
  if (!bestClip || replay) return;
  $('#end').classList.add('hidden');
  recording = recordCanvas($('#c'));
  startReplay(bestClip, () => {
    $('#end').classList.remove('hidden'); focusIdx = 0; refreshFocus();
    if (recording) recording.stop().then(blob => {
      recording = null;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'pingpong-meilleur-point.webm';
      $('#end-status').innerHTML = '';
      a.textContent = '⬇ Télécharger la vidéo du meilleur point';
      a.style.color = '#c84dff'; a.style.fontWeight = '800';
      $('#end-status').appendChild(a);
    });
  });
});
$('#tomenu').addEventListener('click', () => { net && net.send({ t: 'quit' }); quitToMenu(); });
// options accessibles depuis la pause
(function buildPauseOptions() {
  const box = $('#pause-opts');
  document.querySelectorAll('#scr-options .opt.set').forEach(o => {
    const c = o.cloneNode(true);
    c.classList.remove('focus');
    box.appendChild(c);
    c.addEventListener('click', e => {
      initAudio(); const r = c.getBoundingClientRect(); optStep(c, e.clientX < r.left + r.width * 0.5 ? -1 : 1); settingStep(c);
    });
  });
})();
function syncPauseOptions() {
  document.querySelectorAll('#pause-opts .opt.set').forEach(o => { o.dataset.i = profile.settings[o.dataset.key]; optRender(o); });
}
$('#pause-opt-btn').addEventListener('click', () => { syncPauseOptions(); $('#pause-opts').classList.toggle('hidden'); sfx.ui(); });
$('#resume').addEventListener('click', () => { if (timeout) endTimeout(true); else togglePause(false); });
$('#quit').addEventListener('click', () => { net && net.send({ t: 'quit' }); quitToMenu(setup && setup.mode === 'career' ? 'scr-tour' : setup && (setup.career || setup.mode === 'sparring') ? 'scr-ctrain' : setup && setup.mode === 'farewell' ? 'scr-jubile' : 'scr-main'); });
// temps mort en ligne (1 par joueur et par match, 30 s max)
let timeout = null;
function requestTimeout() {
  if (!game || !net) return;
  if (game.usedTimeout) { banner('Temps mort déjà utilisé', '', 1.5); return; }
  game.usedTimeout = true;
  net.send({ t: 'timeout', name: myName() });
  timeout = { by: myName(), pending: true, left: 30 };
  banner('Temps mort demandé', 'Il commence à la fin du point', 1.8);
}
function updateTimeout(dt) {
  if (!timeout) return;
  if (timeout.pending && game.state !== 'rally' && game.state !== 'toss') {
    timeout.pending = false; game.paused = true;
    $('#pause h2').textContent = 'Temps mort';
    $('#pause').classList.remove('hidden'); focusIdx = 0; refreshFocus();
  }
  if (!timeout.pending) {
    timeout.left -= dt;
    $('#pause h2').textContent = `Temps mort · ${Math.ceil(timeout.left)} s`;
    if (timeout.left <= 0) endTimeout(true);
  }
}
function endTimeout(send) {
  if (!timeout) return;
  timeout = null; game.paused = false;
  $('#pause').classList.add('hidden'); $('#pause h2').textContent = 'Pause';
  if (send && net) net.send({ t: 'resume' });
}
function togglePause(v) {
  if (game && setup.mode === 'online') { if (timeout && !timeout.pending) endTimeout(true); else requestTimeout(); return; }
  if (!game || !['ai', 'training', 'career', 'farewell', 'sparring'].includes(setup.mode)) return;
  game.paused = v ?? !game.paused;
  $('#pause').classList.toggle('hidden', !game.paused);
  focusIdx = 0; refreshFocus();
}

// ------------------------------------------------------------------ HUD
let fbT = 0, oppT = 0, banT = 0, hintT = 0;
function showFeedback() {}
function showOpp() {}
function banner(text, sub, t) {
  $('#banner').innerHTML = text + (sub ? `<small>${sub}</small>` : '');
  $('#banner').classList.add('show');
  banT = t;
}
function showStreak(t) {
  const el = $('#streak'); el.textContent = t;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}
function showVS() {
  const el = $('#vs');
  const me = game.myTeam, op = 1 - me;
  const side = (k, p) => {
    const box = el.querySelector('.vsside.' + k);
    box.querySelector('.n').textContent = game.names[p];
    let lp = null, label = '';
    if (game.doubles) lp = null;
    else if (p === me) lp = profile.lp;
    else if (setup.mode === 'online') lp = opp.lp || 0;
    if (setup.mode === 'career') {
      const pl = p === me ? (setup.kind === 'double' ? C.getP('me') : C.career.me) : C.getP(setup.oppId);
      box.querySelector('.emb').innerHTML = C.flag(pl.country, 84, 56);
      label = pl.pair ? `Paire · niveau ${Math.round(pl.rating)}` : `${C.rankOf(pl.id)}e mondial · ${C.STYLE_NAMES[pl.style]}${pl.rival ? ' · <span style="color:#ff6b7d">RIVAL</span>' : pl.enemy ? ' · <span style="color:#ff6b7d">ENNEMI JURÉ</span>' : pl.prodige ? ' · <span style="color:#ffc83c">PRODIGE</span>' : pl.sig ? ' · <span style="color:#ffc83c">BOSS</span>' : ''}`;
      if (setup.kind === 'team') label = `${C.COUNTRIES[pl.country].name} · ` + label;
    } else if (lp !== null) { const r = rankOf(lp); label = `<span style="color:${r.glow}">${r.label}</span>`; box.querySelector('.emb').innerHTML = emblem(lp, 84); }
    else if (game.doubles) { label = 'Équipe ' + (p === 0 ? 'bleue' : 'rouge'); box.querySelector('.emb').innerHTML = ''; }
    else { label = `${['IA Facile', 'IA Normale', 'IA Difficile', 'Coach'][setup.level] || 'IA'} · ${setup.aiStyle || ''}`; box.querySelector('.emb').innerHTML = ''; }
    box.querySelector('.r').innerHTML = label;
  };
  side('l', me); side('r', op);
  if (setup.mode === 'career') el.querySelector('.vsf').textContent = `${C.career.tour.ev.name.toUpperCase()} · ${setup.round.toUpperCase()} · ${game.bestOf === 1 ? '1 MANCHE' : 'AU MEILLEUR DES ' + game.bestOf + ' MANCHES'}`;
  else el.querySelector('.vsf').textContent = (game.doubles ? 'DOUBLE · ' : setup.mode === 'online' ? 'MATCH CLASSÉ · ' : 'MATCH AMICAL · ') + (game.bestOf === 1 ? '1 MANCHE' : `AU MEILLEUR DES ${game.bestOf} MANCHES`);
  el.classList.remove('hidden');
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  el.querySelectorAll('*').forEach(e => { e.style.animation = 'none'; void e.offsetWidth; e.style.animation = ''; });
  setTimeout(() => el.classList.add('hidden'), 3300);
  sfx.whoosh(); setTimeout(() => sfx.crowd(2), 350);
}
function hint(text, t) { $('#hint').textContent = text; $('#hint').classList.add('show'); hintT = t; }

function updateHUD(dt) {
  const m = game.match, srv = game.state === 'over' ? -1 : game.server();
  document.querySelectorAll('#board .row').forEach(row => {
    const p = +row.dataset.p;
    row.querySelector('.nm').textContent = game.names[p];
    row.querySelector('.sets').textContent = m.sets[p];
    row.querySelector('.pts').textContent = m.score[p];
    row.querySelector('.srv').classList.toggle('on', srv === p);
    row.classList.toggle('serving', srv === p);
  });
  $('#setinfo').textContent = `MANCHE ${Math.min(m.setIdx + 1, game.bestOf)}`;
  $('#ping').textContent = net && setup.mode === 'online' ? `Ping ${Math.round(net.rtt)} ms` : '';
  if ((fbT -= dt) <= 0) $('#feedback').classList.remove('show');
  if ((banT -= dt) <= 0) $('#banner').classList.remove('show');
  if ((hintT -= dt) <= 0) $('#hint').classList.remove('show');

  const me = game.players[game.me];
  const ch = $('#charge');
  if (false) {
    ch.classList.add('show');
    const p = Math.min(1, me.chargeT / MAX_CHARGE);
    ch.querySelector('.fill').style.width = (Math.max(0.15, p) * 100) + '%';
    ch.querySelector('.lbl').textContent = SHOT_LABEL[me.chargeType] || '';
  } else ch.classList.remove('show');
}

// ------------------------------------------------------------------ cercle de timing
let ringFlash = 0, ringLastPress = null;
let ringLbl = 0, timingHelp = false;
function updateRing(dt) {
  const el = $('#ring');
  const me = game.me, pl = game.players[me];
  const human = game.ctrl[me] === 'human';
  // position fixe, bien visible, au-dessus de ton joueur
  el.style.transform = `translate(${innerWidth / 2}px, ${innerHeight * 0.64}px)`;
  updateServeHud(human);
  const lp = game.lastPress;
  if (lp && lp.i === me && lp !== ringLastPress) {
    ringLastPress = lp; ringFlash = 0.5; ringLbl = 0.9;
    el.className = 'show hit ' + (lp.grade < 0 ? 'gm' : 'g' + lp.grade);
    el.querySelector('.rl').textContent = lp.label || '';
    el.querySelector('.rl').className = 'rl on';
  }
  if (ringLbl > 0) { ringLbl -= dt; if (ringLbl <= 0) el.querySelector('.rl').className = 'rl'; }
  if (ringFlash > 0) { ringFlash -= dt; if (ringFlash <= 0) el.className = ''; return; }
  const pr = game.pred[me];
  let active = false;
  if (pr && game.state === 'rally' && game.rally && game.nextHitter() === me && !game.rally.contactTried && !pl.pressType) active = true;
  if (pr && pr.serve && game.state === 'toss' && game.server() === me) active = true;
  const rem = active ? pr.t - game.simTime : 99;
  if (!active || rem > RING_T || rem < -0.2 || !human) { el.className = ''; return; }
  if (!timingHelp && !tuto && !store.get('pp-timing-help')) { timingHelp = true; store.set('pp-timing-help', '1'); hint('Le cercle se resserre : appuie sur un bouton de coup quand il touche le rond blanc (il devient VERT)', 6); }
  const scale = 1 + 2.4 * Math.max(0, rem) / RING_T;
  const app = el.querySelector('.app');
  app.style.width = app.style.height = (64 * scale) + 'px';
  const a = Math.abs(rem) / game.pressScale(me);
  el.className = 'show ' + (a <= 0.05 ? 'now' : a <= 0.11 ? 'near' : '');
  const pad = !!input.padName;
  el.querySelector('.rk').innerHTML = game.state === 'toss' ? `<span>${kb('top')}</span> frappe le service` : `<span>${kb('top')} lift</span><span>${kb('plat')} frappe</span><span>${kb('coupe')} coupé</span><span>${kb('lob')} lob</span>`;
}
function updateServeHud(human) {
  const el = $('#servehud');
  const me = game.me, serving = human && (game.state === 'serve' || game.state === 'toss') && game.server && game.server() === me && !game.training;
  if (!serving) { if (el.classList.contains('on')) { el.classList.remove('on'); R.setAim && R.setAim(null); } return; }
  const pl = game.players[me], s = pl.side;
  const ax = Math.max(-1, Math.min(1, pl.aimX)), ay = Math.max(-1, Math.min(1, pl.aimY));
  const tx = game.doubles ? -s * Math.max(0.15, Math.min(0.62, 0.38 - ax * 0.2)) : ax * 0.6 * s;
  const tz = -s * (0.8 + ay * 0.33);
  R.setAim && R.setAim({ x: tx, z: tz });
  el.classList.add('on');
  el.innerHTML = game.state === 'serve'
    ? `<b>SERVICE</b><span>${input.padName ? 'Stick gauche' : 'Flèches'} : vise la zone</span><span>${kb('top')} lift · ${kb('plat')} rapide · ${kb('coupe')} coupé · ${kb('lob')} latéral : lance la balle</span>`
    : `<b>SERVICE</b><span>Appuie quand le cercle devient vert</span>`;
}
// ------------------------------------------------------------------ ralenti
function startReplay(clip, onEnd) {
  replay = new Player(clip, game, 0.35);
  replay.onEnd = onEnd;
  R.replayCam = true; R.replaySpeed = replay.speed;
  R.camPos.set(3.6, 1.75, clip.length ? clip[0].ball.z * 0.55 : 0);
  document.body.classList.add('replaying');
  $('#replay').classList.remove('hidden');
}
function endReplay() {
  if (!replay) return;
  const cb = replay.onEnd;
  replay = null;
  R.replayCam = false;
  document.body.classList.remove('replaying');
  $('#replay').classList.add('hidden');
  cb && cb();
}
function updateMomentum() {
  const el = $('#mom');
  const i = game.me, v = game.momentum[i];
  el.style.display = tuto && !(TUTO[tuto.step] && TUTO[tuto.step].fill) ? 'none' : '';
  el.querySelector('.mbar div').style.width = (v * 100) + '%';
  el.classList.toggle('full', v >= 1);
  el.classList.toggle('armed', !!game.players[i].superArmed);
  el.querySelector('.mkey').innerHTML = input.padName ? '<span class="kb pad">RT</span>' : '<span class="kb key">L</span>';
}
function updateAmbience() {
  const g = game;
  const pressure = g.pressure && (g.state === 'serve' || g.state === 'toss');
  R.pressure = !!g.pressure && g.state !== 'pointEnd';
  setMuffle(!!pressure);
  let lvl = 0.035;
  if (g.state === 'rally') lvl = 0.035 + Math.min(0.13, g.rallyCount * 0.009);
  if (pressure) lvl = 0.012;
  setCrowd(lvl * (setup && setup.crowdMul || 1));
}

// ------------------------------------------------------------------ tutoriel
const TUTO = [
  { title: 'Déplacement', text: () => `Bouge ta raquette avec ${kb('move')}. Pendant les échanges, elle se place aussi toute seule vers la balle.`, need: 1.5, check: 'move' },
  { title: 'Le timing', text: () => `Quand la balle arrive, un cercle se referme sur ta cible. Appuie sur ${kb('top')} (lift) pile quand il touche le cercle blanc. Réussis 2 lifts.`, need: 2, check: 'top' },
  { title: 'La frappe', text: () => `${kb('plat')} : une frappe rapide et à plat. Sur une balle haute, c'est un smash.`, need: 1, check: 'plat' },
  { title: 'Le coupé', text: () => `${kb('coupe')} : une balle lente avec effet arrière, qui freine sur la table.`, need: 1, check: 'coupe' },
  { title: 'Le lob', text: () => `${kb('lob')} : une balle haute et lente pour te défendre.`, need: 1, check: 'lob' },
  { title: 'Viser', text: () => `Pendant que la balle arrive, pousse ${kb('move')} à gauche ou à droite. Le cercle jaune sur la table montre où ira ta balle.`, need: 1, check: 'aim' },
  { title: 'Le flip', text: () => `Sur une balle courte qui tombe près du filet, ${kb('top')} devient un flip : une petite balle rapide et placée. Avance vers la balle !`, need: 1, check: 'flip', coach: 'short' },
  { title: 'Contre et bloc', text: () => `Le coach va lifter fort. ${kb('plat')} fait un contre (tu renvoies sa vitesse), ${kb('coupe')} fait un bloc (renvoi sûr qui absorbe l'effet).`, need: 1, check: 'counter', coach: 'fast' },
  { title: 'Le super coup', text: () => `Tes bons coups remplissent la jauge SUPER (en haut à gauche). Elle est pleine : appuie sur ${kb('super')}, puis frappe la balle.`, need: 1, check: 'super', fill: true },
  { title: 'Le service', text: () => `À toi de servir : appuie sur un coup pour lancer la balle, puis rappuie quand le cercle se referme. Vise avec ${kb('move')}.`, need: 1, check: 'serve' },
];
function startTuto() {
  setup = { mode: 'ai', level: 3, bestOf: 99 };
  game = new Game({ mode: 'ai', ctrl: ['human', 'ai'], me: 0, names: [myName(), 'Coach'], bestOf: 99, firstServer: 1, hooks: { ...hooks(), point: () => {}, hit: tutoHit } });
  game.ai[1] = new AI(game, 1, 3);
  game.forcedServer = 1;
  tuto = { step: 0, count: 0, moved: 0, lx: 0, lz: 2.1, done: 0 };
  enterGame();
  $('#board').classList.add('hidden');
  $('#tuto').classList.remove('hidden');
  tutoRender();
}
function tutoRender() {
  const el = $('#tuto');
  if (tuto.step >= TUTO.length) {
    el.classList.add('done');
    el.querySelector('.tstep').textContent = 'TUTORIEL TERMINÉ';
    el.querySelector('.ttitle').textContent = 'Bravo !';
    el.querySelector('.ttext').innerHTML = 'Tu connais les bases. Lance un match contre l\'IA ou défie un pote en ligne.';
    el.querySelector('.tprog div').style.width = '100%';
    return;
  }
  const st = TUTO[tuto.step];
  el.classList.remove('done');
  el.querySelector('.tstep').textContent = `ÉTAPE ${tuto.step + 1} / ${TUTO.length}`;
  el.querySelector('.ttitle').textContent = st.title;
  el.querySelector('.ttext').innerHTML = st.text();
  el.querySelector('.tprog div').style.width = (tuto.step / TUTO.length * 100) + '%';
  el.querySelector('.tskip').innerHTML = `${kb('start')} Quitter le tutoriel`;
}
function tutoAdvance(n = 1) {
  if (!tuto || tuto.step >= TUTO.length) return;
  tuto.count += n;
  if (tuto.count >= TUTO[tuto.step].need) {
    tuto.step++; tuto.count = 0;
    sfx.unlock();
    if (tuto.step === TUTO.length - 1) game.forcedServer = 0;
    tutoApplyStep();
    tutoRender();
  }
}
function tutoApplyStep() {
  const st = TUTO[tuto.step];
  game.coachMode = st ? st.coach || null : null;
  if (st && st.fill) game.momentum[game.me] = 1;
}
function tutoHit(p, h) {
  if (!tuto || p !== game.me || tuto.step >= TUTO.length) return;
  const c = TUTO[tuto.step].check;
  if (c === 'serve' ? h.serve : h.serve) { if (c === 'serve') tutoAdvance(); return; }
  const base = { flip: 'top', contre: 'plat', bloc: 'coupe' }[h.type] || h.type;
  if (c === 'flip' && h.type === 'flip') return tutoAdvance();
  if (c === 'counter' && (h.type === 'contre' || h.type === 'bloc')) return tutoAdvance();
  if (c === 'super' && h.sup) return tutoAdvance();
  if (c === 'flip' || c === 'counter' || c === 'super') return;
  if ((c === base) || (c === 'aim' && Math.abs(h.aimX) > 0.45) || (c === 'power' && h.power > 0.75)) tutoAdvance();
}
function tutoUpdate(dt) {
  const pl = game.players[game.me];
  const st = TUTO[tuto.step];
  if (st && st.fill && game.momentum[game.me] < 1 && !pl.superArmed) game.momentum[game.me] = 1;
  if (tuto.step < TUTO.length && TUTO[tuto.step].check === 'move') {
    tuto.moved += Math.hypot(pl.x - tuto.lx, pl.z - tuto.lz);
    if (tuto.moved >= 1.5) { tuto.count = 0; tuto.moved = -999; tutoAdvance(1.5); }
  }
  tuto.lx = pl.x; tuto.lz = pl.z;
  if (tuto.step >= TUTO.length) {
    if (!tuto.rewarded) { tuto.rewarded = true; achToast('tuto'); }
    tuto.done += dt; if (tuto.done > 4) quitToMenu();
  }
}
$('#btn-tuto').addEventListener('click', () => { initAudio(); sfx.ui(); startTuto(); });

// ------------------------------------------------------------------ boucle
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const inp = input.poll();
  const pad = $('#padstatus');
  const hasPad = !!input.padName;
  if (hasPad !== lastPad) {
    lastPad = hasPad;
    pad.textContent = hasPad ? '🎮 Manette connectée' : '⌨️ Clavier — branche une manette et appuie sur un bouton';
    pad.classList.toggle('ok', hasPad);
    refreshGlyphs();
    if (tuto) tutoRender();
  }
  if (activeLayer()) navInput(inp, dt);

  if (game) {
    setMuted(false);
    R.orbit = false;
    if (inp.pressed.start) { if (tuto) quitToMenu(); else togglePause(); }
    if (!game) { requestAnimationFrame(loop); return; }
    if (tuto) tutoUpdate(dt);
    if (inp.pressed.cam) { profile.settings.camera = (profile.settings.camera + 1) % 3; saveProfile(); applySettings(); banner(`Caméra : ${['Raquette', 'TV', 'Haute'][profile.settings.camera]}`, '', 1); }
    updateTimeout(dt);
    if (replay) {
      // relecture au ralenti : le match est en pause
      const fake = replay.step(dt);
      if (replay.done || (!recording && (inp.pressed.top || inp.pressed.plat))) { endReplay(); }
      else if (!window.__noRender) R.update(fake, dt * replay.speed);
      setCrowd(0.06);
      requestAnimationFrame(loop); return;
    }
    if (postPoint) {
      postPoint.t -= dt;
      if (postPoint.t <= 0) {
        const pp = postPoint; postPoint = null;
        const clip = recorder.clip(4.5);
        if (!bestClip || pp.score > bestClip.score) { bestClip = clip; bestClip.score = pp.score; }
        if (pp.big && !tuto) startReplay(clip, null);
      }
    }
    recorder.record(game, dt);
    updateMomentum();
    updateAmbience();
    updateRing(dt);
    game.update(dt, inp);
    if (!window.__noRender) R.update(game, dt);
    updateHUD(dt);
  } else if (ready) {
    setMuted(true); setMuffle(false); R.pressure = false; R.replayCam = false;
    if (!music.playing && $('#menu') && !$('#menu').classList.contains('hidden')) music.start(1);
    R.orbit = true;
    if (demo.state === 'over') newDemo();
    demo.update(dt, null);
    if (!window.__noRender) R.update(demo, dt);
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// accès debug / tests
window.__pp = { profile, get replay() { return replay; }, startReplay, forceReplay: () => startReplay(recorder.clip(4.5), null), get game() { return game; }, get demo() { return demo; }, get tuto() { return tuto; }, tutoUpdate: d => tutoUpdate(d), R, startAI, startTuto, AI };
show('scr-main');
applyCosmetics();
applySettings();
addEventListener('pointerdown', () => { initAudio(); applySettings(); }, { once: true });
addEventListener('keydown', () => { initAudio(); applySettings(); }, { once: true });

// ------------------------------------------------------------------ carrière
const NEONS = [0x3d8bff, 0x3de8ff, 0x3dff8a, 0xb04dff, 0xff4dc8, 0xffc83c];
const hex = c => '#' + c.toString(16).padStart(6, '0');
const esc = t => String(t).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const pname = pl => `${C.flag(pl.country, 20, 13)}${esc(pl.name)}`;
const tierTag = t => `<span class="tier" style="background:${C.TIERS[t].color}">${C.TIERS[t].name.toUpperCase()}</span>`;
(function initCreate() {
  const o = $('#car-country'), codes = Object.keys(C.COUNTRIES);
  o.dataset.values = codes.map(c => C.COUNTRIES[c].name).join('|');
  o.dataset.v = codes.join('|'); o.dataset.i = '0';
  document.querySelectorAll('#scr-career-new .opt').forEach(x => {
    optRender(x);
  });
})();
function renderCreate() {
  const code = choice('car-country'), neon = NEONS[choice('car-neon')];
  $('#car-country .ov').innerHTML = `${C.flag(code, 22, 15)}${C.COUNTRIES[code].name}`;
  if (!$('#car-name').value) $('#car-name').value = myName();
  $('#car-preview').innerHTML = `<div style="text-align:center">
    <svg width="160" height="230" viewBox="0 0 160 230" style="filter:drop-shadow(0 0 10px ${hex(neon)})">
      <g stroke="${hex(neon)}" stroke-width="7" stroke-linecap="round" fill="none">
        <circle cx="80" cy="38" r="20"/><path d="M80 60v70M80 75l-34 28M80 75l34-18 18-22M80 130l-26 70M80 130l26 70"/>
      </g>
      ${choice('car-acc') === 1 ? `<path d="M60 32h40" stroke="#fff" stroke-width="6"/>` : choice('car-acc') === 2 ? `<path d="M58 28q22-26 44 0zM100 28h20" stroke="#fff" stroke-width="5" fill="#fff"/>` : choice('car-acc') === 3 ? `<path d="M41 99l8 8M128 31l8 8" stroke="#fff" stroke-width="9"/>` : ''}
      <circle cx="${choice('car-hand') === 1 ? 135 : 25}" cy="30" r="11" fill="#e33340"/>
    </svg>
    <div style="margin-top:10px;font-weight:900;font-size:20px;font-style:italic;text-transform:uppercase;color:#fff">${C.flag(code, 30, 20)}${esc($('#car-name').value || 'Joueur')}</div>
    <div>${C.STYLE_NAMES[choice('car-style')]} · ${choice('car-hand') === 1 ? 'Droitier' : 'Gaucher'}</div></div>`;
}
$('#car-name').addEventListener('input', renderCreate);
$('#btn-career').addEventListener('click', () => { initAudio(); sfx.ui(); show('scr-slots'); });
$('#car-create').addEventListener('click', () => {
  sfx.ui();
  C.create({ name: ($('#car-name').value.trim() || myName()).slice(0, 16), country: choice('car-country'), hand: choice('car-hand'),
    style: choice('car-style'), neon: choice('car-neon'), acc: choice('car-acc'), length: choice('car-len'), age: choice('car-age'), diff: choice('car-diff'), perso: choice('car-perso') });
  show('scr-career');
});
$('#car-reset-btn').addEventListener('click', () => {
  if (!confirmReset) { confirmReset = true; $('#car-reset-btn small').textContent = 'Clique encore pour confirmer'; return; }
  confirmReset = false; C.erase(); show('scr-slots');
});
let confirmReset = false;

function bindCareerButtons(root) {
  root.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
    initAudio(); sfx.ui();
    const a = b.dataset.act, c = C.career;
    if (a === 'qualif') { const ev = C.weekEvents(c.season, c.week).find(e => e.id === b.dataset.ev); if (ev && C.qualifOpen(ev)) { C.enterQualif(ev); show('scr-tour'); } return; }
    if (a === 'enter') { const ev = C.weekEvents(c.season, c.week).find(e => e.id === b.dataset.ev); if (ev && C.eligible(ev)) { C.enterTournament(ev); show('scr-tour'); } return; }
    if (a === 'tour') { show('scr-tour'); return; }
    if (a === 'rest') { C.endWeek(); show('scr-career'); return; }
    if (a === 'retire') { if (!confirmRetire) { confirmRetire = true; renderCareer(); return; } confirmRetire = false; C.retire(); show('scr-jubile'); return; }
    if (a === 'up') { if (C.upgrade(b.dataset.k)) { sfx.unlock(); renderCareer(); const k = navItems().findIndex(x => x.dataset.k === b.dataset.k); if (k >= 0) { focusIdx = k; refreshFocus(); } } return; }
    if (a === 'play') { startCareerMatch(); return; }
    if (a === 'sim') { simCareerMatch(); return; }
    if (a === 'next') { C.endWeek(); show('scr-career'); return; }
  }));
}

function renderCareer() {
  const c = C.career; if (!c) return;
  if (c.retired) { show('scr-jubile'); return; }
  if (c.review) { show('scr-season'); return; }
  if (c.press) { show('scr-press'); return; }
  flushPending();
  const me = c.me, rk = C.rankOf('me');
  $('#car-head').innerHTML = `${C.flag(me.country, 54, 36)}<div><div class="big">${esc(me.name)}</div>
    <div class="meta">${C.COUNTRIES[me.country].name.toUpperCase()} · ${C.STYLE_NAMES[me.style].toUpperCase()} · ${me.hand === 1 ? 'DROITIER' : 'GAUCHER'} · NIVEAU ${C.overall(me.stats)} · ${me.age || 17} ANS · ${C.DIFFS[c.diff ?? 1].name.toUpperCase()}</div>
    <div class="meta" style="color:#c84dff">${C.peakLabel(me.age || 17).toUpperCase()}</div>
    <div class="meta">${C.weekDate(c.season, c.week).label.toUpperCase()} · SAISON ${c.season} · SEMAINE ${c.week}/${C.WEEKS} · ${C.rankPoints(me)} PTS</div>
    ${moneyLine()}</div>
    <div class="rk"><b>${rk}e</b><span class="meta">CLASSEMENT MONDIAL</span></div>`;
  // semaine
  const evs = C.weekEvents(c.season, c.week);
  let html = '';
  if (!c.tour && C.canTrain()) html += `<button class="mbtn" data-go2="scr-ctrain"><span><b>🏋 Séance d'entraînement dispo</b><small>Une par semaine${c.coach ? ' · ' + C.COACHES[c.coach].name : ''}</small></span></button>`;
  if (c.tour) {
    html = `<button class="mbtn accent" data-act="tour"><span><b>Reprendre : ${esc(c.tour.ev.name)}</b><small>${c.tour.done || c.tour.out ? 'Tournoi terminé, voir le tableau' : roundLabel(c.tour, C.myMatch())}</small></span></button>`;
  } else {
    if (c.injury) html += `<div class="warnbox">🩹 <b>Blessé : ${esc(c.injury.name)}</b>, encore ${c.injury.weeks} semaine${c.injury.weeks > 1 ? 's' : ''} d'arrêt. Un kiné accélère la guérison.</div>`;
    for (const ev of evs) {
      const T = C.TIERS[ev.tier], lock = C.lockReason(ev);
      const wc = (c.wc || {})[ev.id];
      const info = wc ? `🎟️ Wild card ! ${T.size} joueurs · ${T.pts[0]} pts au vainqueur` : ev.kind === 'exhib' ? `Cachet d'environ ${eur(3000 + Math.min(40000, (c.fans || 0) * 0.08))} · contre une star du top 20 · sans points` : ev.kind === 'mixed' ? `Double mixte · 8 paires${c.mpartner ? ' avec ' + esc(C.getP(c.mpartner).name) : ''}` : ev.tier === 'finals' ? `Les 16 meilleurs de la saison · ${T.pts[0]} pts au vainqueur` : ev.kind === 'double' ? `Double · 8 paires · ${Math.round(T.pts[0] * 0.6)} pts double au vainqueur` : ev.kind === 'team' ? `Avec ${C.COUNTRIES[c.me.country].name} · 8 nations · 25 000 € aux champions` : ev.kind === 'olympics' ? 'Médailles d\'or, d\'argent et de bronze · 2 joueurs max par pays' : `${T.size} joueurs · ${T.pts[0]} pts au vainqueur`;
      html += `<button class="mbtn evcard ${lock ? 'locked' : ''} ${ev.kind === 'olympics' || ev.kind === 'team' ? 'gold' : ''}" data-act="enter" data-ev="${ev.id}"><span><b>${esc(ev.name)}</b>
        <small>${lock || info}${!lock && ev.kind !== 'exhib' ? ` · ✈️ ${eur(C.travelCost(ev))}` : ''}</small></span>${ev.kind === 'double' ? '<span class="tier" style="background:#ddd5f2">DOUBLE</span>' : ev.kind === 'mixed' ? '<span class="tier" style="background:#ff9ad8">MIXTE</span>' : tierTag(ev.tier)}</button>`;
      if (lock && C.qualifOpen(ev)) html += `<button class="mbtn small qualbtn" data-act="qualif" data-ev="${ev.id}"><span><b>↳ Passer par les qualifications</b><small>1 match à gagner pour entrer dans le tableau du ${esc(ev.name)}</small></span></button>`;
    }
    html += `<button class="mbtn ghost" data-act="rest"><span><b>Se reposer</b><small>Passer la semaine</small></span></button>`;
    if (C.canRetire()) html += `<button class="mbtn ghost" data-act="retire"><span><b>${c.forceRetire ? '⏳ Il est temps de raccrocher' : 'Prendre ma retraite'}</b><small>${confirmRetire ? 'Clique encore pour confirmer : la carrière se termine' : 'Termine ta carrière avec un jubilé'}</small></span></button>`;
  }
  $('#car-week-title').textContent = c.week === C.WEEKS ? 'Semaine finale' : 'Cette semaine';
  $('#car-week').innerHTML = html;
  if (c.energy < 35 && !c.tour) $('#car-week').insertAdjacentHTML('afterbegin', `<div class="warnbox">⚠ Tu es ${C.formLabel(c.energy).toLowerCase()} : tes stats baissent en match. Une semaine de repos te remet en forme.</div>`);
  // prochains gros tournois
  const up = [];
  for (let w = c.week + 1; w <= C.WEEKS && up.length < 2; w++) {
    const big = C.weekEvents(c.season, w).find(e => e.tier === 'slam' || e.tier === 'star' || e.tier === 'worlds');
    if (big) up.push(`<div>Semaine ${w} · <b>${esc(big.name)}</b> <span style="color:${C.TIERS[big.tier].color}">(top ${C.TIERS[big.tier].need})</span></div>`);
  }
  $('#car-news').innerHTML = up.join('') + c.news.slice(0, 3).map(n => `<div>${esc(n)}</div>`).join('');
  // stats
  $('#car-up').textContent = c.upPoints ? `${c.upPoints} POINT${c.upPoints > 1 ? 'S' : ''} À DÉPENSER` : '';
  $('#car-stats').innerHTML = C.STAT_KEYS.map(k => {
    const v = me.stats[k], cost = C.upgradeCost(v), can = c.upPoints >= cost && v < 99;
    return `<div class="statrow"><span>${C.STAT_NAMES[k]}</span><div class="xbar"><div style="width:${v}%"></div></div><b>${v}</b>
      <button class="mbtn small ${can ? 'accent' : 'locked'}" data-act="up" data-k="${k}" title="Coût : ${cost}"><b>+</b></button></div>`;
  }).join('') + `<div style="font-size:12px;color:#a99cc9;margin-top:4px">Chaque match gagné rapporte 3 points (1 si perdu), un titre jusqu'à 15.</div>`;
  // rival
  $('#car-rival').innerHTML = `<div class="rivalbox"><small style="letter-spacing:3px;color:#ff6b7d;font-weight:900">TES RIVAUX</small>` + C.rivals().map(({ p, type }) => {
    const h = c.h2h[p.id] || { w: 0, l: 0 };
    return `<div class="rvl"><span>${type === 'Rival' ? '⚔' : type === 'Jeune prodige' ? '⭐' : '🔥'} <b>${pname(p)}</b> <small>${type}</small></span><span>${C.rankOf(p.id)}e · <b>${h.w} – ${h.l}</b></span></div>`;
  }).join('') + '</div>';
  $('#perk-badge').textContent = c.perkPts ? `· ${c.perkPts}` : '';
  $('#soc-badge').textContent = C.postIdeas().some(x => x.deal) ? '· 💰' : C.soc().moment && C.soc().moment.w === c.week && C.postsLeft() > 0 ? '· !' : '';
  bindCareerButtons($('#scr-career'));
  $('#scr-career').querySelectorAll('[data-go2]').forEach(b => b.addEventListener('click', () => { sfx.ui(); show(b.dataset.go2); }));
  refreshFocus();
}

function scoutCard(o) {
  const c = C.career, d = c.tour;
  if (o.pair) {
    const [a, b] = o.members.map(id => C.getP(id));
    const P = C.getP(d.kind === 'mixed' ? c.mpartner : c.partner);
    return `<div class="scard"><small style="letter-spacing:3px;color:#a99cc9;font-weight:900">PAIRE ADVERSE</small>
      <div class="who">${C.flag(o.country, 30, 20)}${esc(o.name)}</div>
      <div class="row2">NIVEAU DE LA PAIRE ${Math.round(o.rating)}</div>
      <ul><li>${pname(a)} · ${a.woman ? 'niveau ' + Math.round(a.rating) : C.rankOf(a.id) + 'e mondial'}</li><li>${pname(b)} · ${b.woman ? 'niveau ' + Math.round(b.rating) : C.rankOf(b.id) + 'e mondial'}</li>
      <li>Ta paire : <b>${esc(c.me.name)} / ${esc(P.name)}</b> · niveau ${Math.round(C.getP('me').rating)}</li><li>Complicité : <b>${((d.kind === 'mixed' ? c.mchem : c.chem) || 0).toFixed(1)} / 6</b></li></ul></div>`;
  }
  const h = c.h2h[o.id] || { w: 0, l: 0 }, sc = C.scout(o);
  let tie = '';
  if (d && d.kind === 'team') { const m = C.myMatch(), O = C.getP(m.a === 'me' ? m.b : m.a); tie = `<div class="sig" style="color:#ff9a3c;background:rgba(255,154,60,.1)">🌍 ${C.COUNTRIES[c.me.country].name} contre ${esc(O.name)} : tu joues le premier simple, tes coéquipiers jouent la suite. Il faut 3 victoires.</div>`; }
  return `<div class="scard"><small style="letter-spacing:3px;color:#a99cc9;font-weight:900">PROCHAIN ADVERSAIRE</small>
    <div class="who">${C.flag(o.country, 36, 24)}${esc(o.name)}</div>
    <div class="row2">${C.rankOf(o.id)}E MONDIAL · NIVEAU ${Math.round(C.rating(o))} · ${C.STYLE_NAMES[o.style].toUpperCase()} · ${o.hand === 1 ? 'DROITIER' : 'GAUCHER'}</div>
    <ul><li>Points forts : <b>${sc.best.join(', ')}</b></li><li>Points faibles : <b>${sc.worst.join(', ')}</b></li>
    <li>Face-à-face : <b>${h.w} – ${h.l}</b></li><li>Toi : niveau <b>${C.rating(c.me)}</b> · forme <b>${C.formLabel(c.energy).toLowerCase()}</b> (${c.energy} %)</li></ul>
    ${c.coach >= 2 ? `<div class="sig" style="color:#6ee7a8;background:rgba(110,231,168,.1)">🧢 Coach : ${coachTip(o, sc)}</div>` : ''}
    ${o.sig ? `<div class="sig">⚡ BOSS · ${C.SIGNATURES[o.sig].name} : ${C.SIGNATURES[o.sig].desc}</div>` : ''}
    ${o.rival ? '<div class="rv">⚔ C\'EST TON RIVAL</div>' : o.prodige ? '<div class="rv">⭐ LE JEUNE PRODIGE</div>' : o.enemy ? '<div class="rv">🔥 TON ENNEMI JURÉ</div>' : ''}${tie}</div>`;
}

function renderTour() {
  const c = C.career, d = c && c.tour;
  if (!d) { show('scr-career'); return; }
  if (c.press) { show('scr-press'); return; }
  const T = C.TIERS[d.tier];
  const sizeTxt = d.kind === 'exhib' ? 'EXHIBITION' : d.kind === 'qualif' ? 'QUALIFICATIONS' : d.groups ? '16 JOUEURS · 4 POULES PUIS TABLEAU FINAL' : (d.kind === 'double' || d.kind === 'mixed') ? `${d.size} PAIRES` : d.kind === 'team' ? `${d.size} NATIONS` : `${d.size} JOUEURS`;
  $('#tour-head').innerHTML = `${tierTag(d.tier)}${d.kind === 'double' ? '<span class="tier" style="background:#ddd5f2">DOUBLE</span>' : ''}<div><div class="big">${esc(d.ev.name)}</div><div class="meta">${sizeTxt} · SAISON ${c.season} · SEMAINE ${c.week}</div></div>`;
  $('#tour-head').style.borderLeftColor = T.color;
  // tableau : tous les tours, les suivants vides
  const nR = d.kind === 'exhib' || d.kind === 'qualif' ? 0 : Math.log2(d.size);
  let cols = '';
  if (d.groups) cols += `<div class="groups">${d.groups.map((g, gi) => `<div class="grp ${g.includes('me') ? 'me' : ''}"><h4>POULE ${'ABCD'[gi]}</h4>${C.groupTable(d, gi).map((e, k) => `<div class="${e.id === 'me' ? 'me' : ''} ${k < 2 ? 'q' : ''}"><span class="n">${C.flag(C.getP(e.id).country, 14, 10)}${esc(C.lastName(C.getP(e.id)))}</span><b>${e.w}–${e.l}</b></div>`).join('')}</div>`).join('')}</div>`;
  if (d.kind === 'exhib' || d.kind === 'qualif') { const o = C.getP(d.rounds[0][0].b); cols += `<div class="infobox" style="min-width:360px">${d.kind === 'exhib' ? `🎪 <b>Exhibition</b> contre ${pname(o)} · cachet de base ${eur(d.fee)} (+50 % si tu gagnes). Pas de points de classement.` : `🎟️ <b>Qualifications</b> du ${esc(d.ev.name)} : gagne ce match contre ${pname(o)} pour entrer dans le tableau final.`}</div>`; }
  for (let r = 0; r < nR; r++) {
    const ms = d.rounds[r] || new Array(d.size >> (r + 1)).fill({});
    cols += `<div class="bcol"><h4>${C.ROUND_NAMES(d.size >> (r + 1)).toUpperCase()}</h4><div class="bms">` + ms.map(m => {
      const line = (id, k) => { if (!id) return `<div class="l"><span class="n">—</span></div>`; const pl = C.getP(id);
        const cls = (m.w ? (m.w === id ? 'w' : 'l') : '') + (id === 'me' ? ' me' : '');
        return `<div class="${cls}"><span class="n">${C.flag(pl.country, 14, 10)}${esc(pl.ent ? pl.name : C.lastName(pl))}${pl.rival || pl.enemy ? ' ⚔' : pl.sig ? ' ⚡' : ''}</span><b>${m.sc ? m.sc[k] : ''}</b></div>`; };
      return `<div class="bm ${m.a === 'me' || m.b === 'me' ? 'me' : ''}">${line(m.a, 0)}${line(m.b, 1)}</div>`;
    }).join('') + '</div></div>';
  }
  if (d.bronze) { const B = d.bronze, ln = id => { const pl = C.getP(id); return `<div class="${B.w ? (B.w === id ? 'w' : 'l') : ''}${id === 'me' ? ' me' : ''}"><span class="n">${C.flag(pl.country, 14, 10)}${esc(C.lastName(pl))}</span><b>${B.sc ? B.sc[id === B.a ? 0 : 1] : ''}</b></div>`; };
    cols += `<div class="bcol"><h4>🥉 BRONZE</h4><div class="bms"><div class="bm ${B.a === 'me' || B.b === 'me' ? 'me' : ''}">${ln(B.a)}${ln(B.b)}</div></div></div>`; }
  $('#bracket').innerHTML = cols;
  const m = C.myMatch();
  let side = '';
  if (m) {
    const o = C.myOpponent(), bronze = m === d.bronze, sets = d.kind === 'exhib' || d.kind === 'qualif' ? Math.min(3, C.setsFor(d.tier, 4)) : C.setsFor(d.tier, bronze || d.stage === 'groups' ? 4 : d.rounds[d.round].length);
    side = scoutCard(o) + `<button class="mbtn accent" data-act="play"><span><b>Jouer le match</b><small>${roundLabel(d, m)} · ${sets === 1 ? '1 manche' : 'au meilleur des ' + sets + ' manches'}${d.kind === 'double' ? ' · en double' : ''}</small></span></button>
      <button class="mbtn" data-act="sim"><span><b>Simuler le match</b><small>Résultat calculé selon ton niveau, ta forme et ta confiance</small></span></button>`;
  } else {
    const r = d.result || {};
    side = r.medal ? `<div class="champ">${medalSVG(r.medal, 90)}<b>Médaille ${C.medalTxt(r.medal)}</b>${esc(d.ev.name)}<br>+${eur(r.prize || 0)}</div>`
      : r.champion ? `<div class="champ"><div class="cup">🏆</div><b>Champion${d.kind === 'team' ? 's' : ''} !</b>${esc(d.ev.name)}<br>${d.kind === 'team' || d.kind === 'olympics' ? '' : `+${r.pts} points · `}+${eur(r.prize || 0)}</div>`
      : `<div class="scard"><div class="who">Éliminé</div><div class="row2">TOUR ATTEINT : ${(r.reached || '').toUpperCase()}</div>${d.kind === 'team' || d.kind === 'olympics' ? 'Pas de points de classement sur cette épreuve.' : `+${r.pts || 0} points ${d.kind === 'double' ? 'au classement double' : 'au classement'} · +${eur(r.prize || 0)} net`}${r.gross ? `<div class="row2" style="margin-top:6px">PRIZE MONEY ${eur(r.gross)} · AGENT −${eur(r.comm)} · IMPÔTS −${eur(r.tax)}</div>` : ''}</div>`;
    side += `<button class="mbtn accent" data-act="next"><span><b>Semaine suivante</b><small>Les autres tournois sont simulés</small></span></button>`;
  }
  $('#tour-next').innerHTML = side;
  bindCareerButtons($('#scr-tour'));
  // centrer le tableau sur mon match
  const mine = $('#bracket .bm.me:last-of-type') || $('#bracket .bm.me');
  if (mine) mine.scrollIntoView({ block: 'center', inline: 'nearest' });
  refreshFocus();
}

function renderRanking() {
  const r = C.ranking(), meR = r.find(e => e.p.id === 'me').rank;
  const row = e => `<div class="rk-row ${e.p.id === 'me' ? 'me' : ''} ${e.p.rival ? 'rv' : ''}" data-nav data-pid="${e.p.id}"><b>${e.rank}</b><span class="n">${pname(e.p)}${e.p.rival ? ' ⚔' : e.p.sig ? ' ⚡' : ''}</span>
    <span>${C.STYLE_NAMES[e.p.style]}</span><span>niv. ${Math.round(C.rating(e.p))}</span><b>${C.rankPoints(e.p)}</b></div>`;
  let html = r.slice(0, 30).map(row).join('');
  if (meR > 30) html += `<div class="rk-gap">···</div>` + r.slice(Math.max(30, meR - 4), meR + 3).map(row).join('');
  const cr = C.countedResults(C.career.me);
  html += `<div class="infobox" style="margin-top:10px">📊 Classement ITTF : seuls tes <b>8 meilleurs résultats</b> de l'année comptent. ${cr.length ? 'Tes résultats comptés : ' + cr.map(e => `<b>${e.p}</b>`).join(' · ') : 'Aucun résultat pour l\'instant.'}</div>`;
  const dr = C.dRankOf('me');
  html += `<div class="infobox" style="margin-top:10px">Classement double : <b>${dr}e</b> (${C.dRankPoints(C.career.me)} pts)${C.career.partner ? ` · partenaire ${esc(C.getP(C.career.partner).name)}` : ''}</div>`;
  setTimeout(() => document.querySelectorAll('#rank-list [data-pid]').forEach(r => r.addEventListener('click', () => { if (r.dataset.pid === 'me') return; pcardId = r.dataset.pid; sfx.ui(); show('scr-pcard'); })), 0);
  $('#rank-list').innerHTML = `<div class="rk-row" style="background:none;color:#a99cc9;font-size:11px"><b>#</b><span>JOUEUR</span><span>STYLE</span><span>NIVEAU</span><b>PTS</b></div>` + html;
}

function renderPalmares() {
  const c = C.career; if (!c) return;
  const t = (c.titles.length || (c.medals || []).length ? `<div class="cab">${(c.medals || []).map(x => `<div>${medalSVG(x.medal, 64)}<b>${esc(x.name)}</b><small>Médaille ${C.medalTxt(x.medal)} · S${x.season}</small></div>`).join('')}${c.titles.filter(x => x.tier !== 'olympics').map(x => `<div title="${esc(x.name)}">${trophySVG(x.tier, x.dbl ? 48 : 64)}<b>${esc(x.name)}</b><small>Saison ${x.season}</small></div>`).join('')}</div>` : '<div class="infobox">Vitrine vide pour l\'instant. Le premier trophée arrive bientôt.</div>')
    + `<h2>Jalons de carrière · ${Object.keys(c.milestones || {}).length} / ${C.MILESTONES.length}</h2><div class="msg">${C.MILESTONES.map(m => { const u = c.milestones && c.milestones[m.id];
      return `<div class="${u ? 'on' : ''}"><b>${u ? '★' : '☆'} ${m.name}</b><small>${m.desc}${u ? ` · S${u.season}` : ''}</small></div>`; }).join('')}</div>`;
  const res = c.results.slice(0, 20).map(x => `<div class="rk-row" style="grid-template-columns:110px 1fr 140px 70px"><span>S${x.season} · sem. ${x.week}</span><span>${esc(x.name)}</span><span>${x.reached}</span><b>+${x.pts}</b></div>`).join('');
  $('#palm').innerHTML = `${t}<h2>Derniers résultats</h2>${res || '<div class="infobox">Aucun tournoi joué.</div>'}`;
  confirmReset = false; $('#car-reset-btn small').textContent = 'Efface la carrière actuelle';
}

const toMods = (st, sig, perks, conf) => ({ fh: st.fh / 100, bh: st.bh / 100, serve: st.serve / 100, spin: st.spin / 100, speed: st.speed / 100, mental: st.mental / 100, stamina: st.stamina / 100, sig, perks, conf });
function startCareerMatch() {
  const c = C.career, d = c.tour, m = C.myMatch();
  if (!m) return;
  const o = C.myOpponent();
  const bronze = m === d.bronze;
  const bestOf = d.kind === 'exhib' || d.kind === 'qualif' ? Math.min(3, C.setsFor(d.tier, 4)) : C.setsFor(d.tier, bronze || d.stage === 'groups' ? 4 : d.rounds[d.round].length);
  const rk = roundLabel(d, m);
  setup = { mode: 'career', level: 2, bestOf, oppId: o.id, aiName: o.name, aiStyle: C.STYLE_NAMES[o.style], kind: d.kind, round: bronze ? 'Match pour le bronze' : rk };
  const myMods = toMods(myMatchStats(), null, C.mySigs(), C.confScale());
  if (d.kind === 'double' || d.kind === 'mixed') {
    const P = C.getP(d.kind === 'mixed' ? c.mpartner : c.partner);
    const [o1, o2] = o.members.map(id => C.getP(id));
    const pn = [c.me.name, o1.name, P.name, o2.name];
    game = new Game({ mode: 'ai', ctrl: ['human', 'ai', 'ai', 'ai'], me: 0, names: [`${C.lastName(c.me)} / ${C.lastName(P)}`, `${C.lastName(o1)} / ${C.lastName(o2)}`], playerNames: pn,
      assist: profile.settings.assist, bestOf, firstServer: Math.random() < 0.5 ? 0 : 1, hooks: hooks(),
      mods: [myMods, toMods(o1.stats, o1.sig), toMods(P.stats, P.sig), toMods(o2.stats, o2.sig)], hands: [c.me.hand, o1.hand, P.hand, o2.hand] });
    [[1, o1], [2, P], [3, o2]].forEach(([i, pl]) => { game.ai[i] = new AI(game, i, 2, { rating: pl.rating + (i === 2 ? (d.kind === 'mixed' ? c.mchem || 0 : c.chem || 0) : C.diffAI()), style: pl.style, sig: pl.sig }); });
  } else {
    game = new Game({ mode: 'ai', ctrl: ['human', 'ai'], me: 0, names: [c.me.name, o.name], assist: profile.settings.assist, bestOf,
      firstServer: Math.random() < 0.5 ? 0 : 1, hooks: hooks(), mods: [myMods, toMods(o.stats, o.sig)], hands: [c.me.hand, o.hand] });
    game.ai[1] = new AI(game, 1, 2, { rating: C.rating(o) + C.diffAI(), style: o.style, sig: o.sig });
  }
  enterGame();
  R.setVenue(venueFor(d));
  const dens = { challenger: 0.22, contender: 0.45, star: 0.75, slam: 1, worlds: 1, team: 0.9, olympics: 1 }[d.tier] * (d.kind === 'double' ? 0.8 : 1);
  R.setCrowdDensity(dens * (d.rounds[d.round] && d.rounds[d.round].length <= 2 ? 1.25 : 1));
  R.setEventTitle(d.ev.name);
  setup.crowdMul = { challenger: 0.45, contender: 0.7, star: 0.95, slam: 1.25, worlds: 1.35, team: 1.3, olympics: 1.4 }[d.tier];
  const isFinal = d.stage !== 'groups' && d.kind !== 'exhib' && d.kind !== 'qualif' && d.rounds[d.round].length === 1 && !bronze;
  if (d.kind !== 'double' && d.kind !== 'mixed' && d.kind !== 'qualif' && (isFinal || d.kind === 'exhib' || bronze || d.tier === 'slam' || d.tier === 'worlds' || d.tier === 'olympics' || d.kind === 'team')) walkout(o, d, isFinal, bronze);
  // fatigue en match
  const base = game.players.map(p => p.mods && { ...p.mods });
  let played = 0, warned = false;
  const ph = game.hooks.point;
  game.hooks.point = (...args) => {
    ph && ph(...args);
    played++;
    game.players.forEach((p, i) => {
      const B = base[i]; if (!B || B.stamina === undefined) return;
      const f = Math.max(0, Math.min(0.16, (played - 14 - 30 * B.stamina) * 0.0035));
      for (const k of ['fh', 'bh', 'serve', 'spin', 'speed']) p.mods[k] = B[k] * (1 - f);
      if (i === 0 && f > 0.05 && !warned) { warned = true; setTimeout(() => hint('Tu commences à fatiguer : tes coups perdent en qualité', 3), 1200); }
    });
  };
  R.figures[0].setColor(C.outfitColor() || NEONS[c.me.neon] || NEONS[0]); R.figures[0].setAccessory(c.me.acc || 0);
  R.figures[0].celebType = c.celeb || 0;
  { const ms = C.mainSponsor(); R.figures[0].setBadge(ms ? ms.name : null, ms ? ms.color : null); }
  if (d.kind !== 'double' && d.kind !== 'mixed') { R.figures[1].setColor(o.rival || o.enemy ? 0xff2a40 : o.sig ? 0xffb020 : 0xff3d6b); R.figures[1].setAccessory(o.sig ? 1 : o.rival ? 2 : 0); }
}
function careerEnd(win, a, b) {
  const c = C.career, d = c.tour, o = C.getP(setup.oppId);
  const m = C.myMatch();
  const bronze = m === d.bronze;
  const roundName = roundLabel(d, m).toLowerCase();
  if (d.kind === 'qualif' || d.kind === 'exhib') {
    C.reportMatch(win, [a, b]);
    setTimeout(flushPending, 2000);
    if (d.kind === 'exhib') return `<div class="endcareer">🎪 Exhibition ${win ? 'gagnée' : 'perdue'} contre <b>${esc(o.name)}</b>. Cachet : <b>${eur(d.result.prize)}</b>.</div>`;
    return `<div class="endcareer">${win ? `✅ <b>Qualifié pour le tableau final du ${esc(d.ev.name)} !</b>` : `❌ Battu en qualifications par <b>${esc(o.name)}</b>.`}</div>`;
  }
  const oppEnt = d.kind === 'team' ? C.getP(m.a === 'me' ? m.b : m.a) : null;
  const before = C.rankOf('me');
  C.reportMatch(win, [a, b]);
  if (o.rival) c.news.unshift(win ? `⚔ ${c.me.name} bat son rival ${o.name} !` : `⚔ ${o.name} prend le dessus sur ${c.me.name}.`);
  if (win && o.sig) c.news.unshift(`⚡ ${c.me.name} fait tomber ${o.name}, ${C.rankOf(o.id)}e mondial !`);
  C.save();
  const r = d.result;
  let txt;
  const nat = C.COUNTRIES[c.me.country].name;
  const tieTxt = d.kind === 'team' ? `<br>Rencontre : <b>${nat} ${m.a === 'me' ? m.sc[0] : m.sc[1]} – ${m.a === 'me' ? m.sc[1] : m.sc[0]} ${esc(oppEnt.name)}</b> (${win ? 'tu as gagné ton simple' : 'tu as perdu ton simple'})` : '';
  const tieWon = m.w === 'me';
  if (r && r.medal) txt = `🏅 <b>Médaille ${C.medalTxt(r.medal)} aux ${esc(d.ev.name)} !</b> +${eur(r.prize)}.`;
  else if (r && r.champion) txt = d.kind === 'team' ? `🏆 <b>${nat} championne du monde par équipes !</b> +${eur(r.prize)}.` : `🏆 <b>CHAMPION du ${esc(d.ev.name)} !</b> +${r.pts} points au classement, +${eur(r.prize)} de prize money.`;
  else if (!tieWon && d.kind === 'olympics' && !bronze && C.myMatch()) txt = `Défaite en demi-finale. <b>Il reste le match pour le bronze !</b>`;
  else if (!tieWon && d.stage === 'groups') txt = `Défaite en poule contre <b>${esc(o.name)}</b>. Il reste des matchs pour se qualifier.`;
  else if (!tieWon && d.groups && m.g !== undefined && !C.myMatch() && !d.rounds.some(r => r.some(x => x.a === 'me' || x.b === 'me'))) txt = `❌ Éliminé en phase de poules.`;
  else if (!tieWon) txt = d.kind === 'team' ? `${nat} est éliminée en ${roundName}.` : `Éliminé en ${roundName} par <b>${esc(d.kind === 'double' ? o.name : o.name)}</b>. +${r ? r.pts : 0} points, +${eur(r ? r.prize : 0)}.`;
  else if (d.stage === 'groups') txt = `Victoire en poule. Prochain match de poule à jouer.`;
  else if (d.groups && d.stage === 'ko' && m.g !== undefined) txt = C.myMatch() ? `✅ <b>Sorti de poule !</b> Prochain tour : ${roundLabel(d, C.myMatch()).toLowerCase()}.` : `Phase de poules terminée.`;
  else txt = `Qualifié${d.kind === 'team' ? 's' : ''} ! Prochain tour : <b>${roundLabel(d, C.myMatch()).toLowerCase()}</b>.`;
  const after = C.rankOf('me');
  if (r && (r.champion || r.medal)) setTimeout(() => ceremony(d), 1400);
  setTimeout(flushPending, 2500);
  const mv = after < before ? ` · Classement : <b style="color:#6ee7a8">${before}e → ${after}e</b>` : '';
  return `<div class="endcareer">${txt}${tieTxt}<br><small>+${win ? 3 : 1} point${win ? 's' : ''} de progression${mv}</small></div>`;
}

// ------------------------------------------------------------------ carrière partie 2
const eur = n => `${Math.round(n || 0).toLocaleString('fr-FR')} €`;
function moneyLine() {
  const c = C.career, e = c.energy, cf = c.conf ?? 50;
  const ccol = cf >= 80 ? '#ff9a3c' : cf >= 60 ? '#6ee7a8' : cf >= 40 ? '#ddd5f2' : '#ff6b7d';
  const col = e >= 75 ? '#6ee7a8' : e >= 50 ? '#ffc83c' : e >= 25 ? '#ff9a3c' : '#ff3d5a';
  return `<div class="mline"><span>💰 <b>${eur(c.money)}</b></span><span>⚡ Forme <span class="ebar"><i style="width:${e}%;background:${col}"></i></span> <b style="color:${col}">${C.formLabel(e)}</b></span><span>${cf >= 80 ? '🔥' : '🧠'} Confiance <b style="color:${ccol}">${C.confLabel(cf)}</b></span>
    ${c.coach ? `<span>🧢 ${C.COACHES[c.coach].name}</span>` : ''}${C.mainSponsor() ? `<span style="color:${C.mainSponsor().color}">★ ${esc(C.mainSponsor().name)}</span>` : ''}<span>👥 <b>${fansN(c.fans)}</b> fans</span>${c.injury ? `<span style="color:#ff6b7d">🩹 Blessé (${c.injury.weeks} sem.)</span>` : ''}</div>`;
}
function renderMoney() { document.querySelectorAll('.cmoney').forEach(el => { el.innerHTML = moneyLine(); }); }
function myMatchStats() {
  const st = C.effStats(), f = C.formOf(), out = {};
  for (const k in st) out[k] = st[k] * f;
  return out;
}
function coachTip(o, sc) {
  const w = sc.worst[0];
  if (w === 'Revers') return 'joue sur son revers, il souffre de ce côté.';
  if (w === 'Coup droit') return 'insiste côté coup droit, c\'est son point faible.';
  if (w === 'Vitesse') return 'déplace-le d\'un coin à l\'autre, il est lent.';
  if (w === 'Effet') return 'varie les effets, il les lit mal.';
  if (w === 'Service') return 'attaque son service dès le retour.';
  if (w === 'Mental') return 'reste solide sur les points serrés, il craque sous la pression.';
  return 'allonge les échanges, il fatigue vite.';
}

// --- entraînement
const ROBOT_CFG = { fh: { type: 'top', zone: 'fh' }, bh: { type: 'top', zone: 'bh' }, serve: { type: 'mix', zone: 'rand' }, spin: { type: 'coupe', zone: 'rand' },
  speed: { type: 'mix', zone: 'rand' }, stamina: { type: 'plat', zone: 'rand' }, mental: { type: 'mix', zone: 'rand' } };
function renderCTrain() {
  renderMoney();
  const c = C.career, k = choice('ct-stat'), v = c.me.stats[k], pr = (c.me.prog && c.me.prog[k]) || 0;
  const can = C.canTrain();
  const mode = choice('ct-mode');
  $('#ct-stat').style.display = mode === 'robot' || mode === 'sparring' ? '' : 'none';
  // préparation d'un gros tournoi
  const tg = C.bigTargets(), po = $('#ct-prep');
  const vals = ['Aucun', ...tg.map(e => `${e.name} (sem. ${e.week})`)], ids = ['', ...tg.map(e => e.id)];
  if (po.dataset.v !== ids.join('|')) { po.dataset.values = vals.join('|'); po.dataset.v = ids.join('|'); const cur = c.prep ? ids.indexOf(c.prep.ev) : 0; po.dataset.i = Math.max(0, cur); optRender(po); }
  const pid = ids[+po.dataset.i] || '';
  if ((c.prep ? c.prep.ev : '') !== pid) C.setPrep(pid || null);
  $('#ct-robot').classList.toggle('locked', !can); $('#ct-quick').classList.toggle('locked', !can);
  const MD = { regularite: 'Balles régulières : fais la plus longue série possible. Travaille <b>endurance et mental</b>.', defense: 'Lifts rapides à défendre. Travaille <b>vitesse et revers</b>.', reception: 'Balles coupées et chargées d\'effet. Travaille <b>effet et service</b>.', sparring: 'Un vrai match d\'1 set contre un partenaire d\'entraînement de ton niveau. Plus tu marques de points, plus tu progresses.',
    robot: 'Le robot t\'envoie 20 balles sur la zone travaillée.', cible: 'Une cible apparaît sur la table : vise-la. Travaille <b>coup droit et revers</b>.', vitesse: 'Balles rapides et variées. Travaille <b>vitesse et endurance</b>.' };
  $('#ct-info').innerHTML = `<div class="infobox" style="margin-bottom:8px">${MD[mode]}</div>${c.prep ? `<div class="infobox" style="margin-bottom:8px;border-left:3px solid #ffc83c">🎯 Préparation en cours : chaque séance d'ici le tournoi donne un bonus de pic de forme (${c.prep.n}/3).</div>` : ''}<div class="scard" style="border-left-color:#6ee7a8"><small style="letter-spacing:3px;color:#a99cc9;font-weight:900">${C.STAT_NAMES[k].toUpperCase()}</small>
    <div class="who">${v}<span style="font-size:14px;margin-left:10px;color:#a99cc9">/ 99</span></div>
    <div class="xbar" style="margin:6px 0 12px"><div style="width:${pr * 100}%;background:#6ee7a8"></div></div>
    <ul><li>Coach : <b>${C.COACHES[c.coach].name}</b> (×${C.COACHES[c.coach].mult})</li><li>Une séance coûte un peu de forme.</li>
    <li>${can ? 'Séance disponible cette semaine.' : '<b>Déjà entraîné cette semaine.</b> Reviens la semaine prochaine.'}</li></ul></div>`;
}
$('#ct-quick').addEventListener('click', () => {
  if (!C.canTrain()) return;
  sfx.ui(); const k = choice('ct-stat'), r = C.train(k, 0.45);
  toast('🏋', 'ENTRAÎNEMENT', C.STAT_NAMES[k], r.up ? `+${r.up} ! Maintenant ${C.career.me.stats[k]}` : 'Tu progresses, continue.');
  renderCTrain();
});
$('#ct-robot').addEventListener('click', () => {
  if (!C.canTrain()) return;
  initAudio(); sfx.ui();
  const k = choice('ct-stat'), ov = C.overall(C.career.me.stats), mode = choice('ct-mode');
  const sp = ov < 60 ? 0 : ov < 78 ? 1 : 2;
  if (mode === 'robot') startTraining({ ...ROBOT_CFG[k], speed: sp }, k);
  else if (mode === 'vitesse') startTraining({ type: 'mix', zone: 'rand', speed: 2 }, ['speed', 'stamina']);
  else if (mode === 'regularite') { startTraining({ type: 'plat', zone: 'rand', speed: 1 }, ['stamina', 'mental']); setup.useBest = true; }
  else if (mode === 'defense') startTraining({ type: 'top', zone: 'rand', speed: 2 }, ['speed', 'bh']);
  else if (mode === 'reception') startTraining({ type: 'coupe', zone: 'rand', speed: sp }, ['spin', 'serve']);
  else if (mode === 'sparring') startSparring(k);
  else {
    const tgt = () => ({ x: (Math.random() - 0.5) * 1.1, z: -(0.35 + Math.random() * 0.85), r: ov < 60 ? 0.3 : ov < 78 ? 0.24 : 0.19 });
    startTraining({ type: 'mix', zone: 'rand', speed: Math.max(0, sp - 1), target: tgt() }, ['fh', 'bh']);
    R.setTarget(game.training.target);
    game.hooks.target = ok => { R.flashTarget(ok); ok ? sfx.ui() : null; };
    const th = game.hooks.train;
    game.hooks.train = (ok, T) => { th(ok, T); if (game && game.training) { game.training.target = tgt(); setTimeout(() => game && game.training && R.setTarget(game.training.target), 400); } };
  }
});
function finishCareerTraining(T) {
  const ks = Array.isArray(setup.career) ? setup.career : [setup.career], q = setup.useBest ? Math.min(1, T.best / 15) : T.ok / Math.max(1, T.total);
  setup.career = null;
  const k = ks[0];
  const r = C.train(k, q);
  if (ks[1]) C.trainExtra(ks[1], q);
  setTimeout(() => {
    quitToMenu('scr-ctrain');
    toast('🏋', `SÉANCE TERMINÉE · ${T.ok}/${T.total}`, C.STAT_NAMES[k], r && r.up ? `+${r.up} ! Maintenant ${C.career.me.stats[k]}` : 'Bonne séance, la progression continue.');
  }, 900);
}

// --- coach & sponsors
function renderTeam() {
  renderMoney();
  const c = C.career;
  renderStaff();
  $('#team-coach').innerHTML = C.COACHES.map((co, i) => `<button class="mbtn ${i === c.coach ? 'accent' : ''}" data-coach="${i}"><span><b>${co.name}${i === c.coach ? ' ✓' : ''}</b>
    <small>${co.desc}${co.cost ? ' · ' + eur(co.cost) + ' / semaine' : ''}</small></span></button>`).join('');
  const K = C.contracts();
  let h = '';
  for (const slot of ['equip', 'cloth', 'perso']) {
    const S = K[slot];
    h += `<h3 class="slot">${C.SLOT_NAMES[slot]}</h3>`;
    h += S ? `<div class="scard" style="border-left-color:${S.color};padding:10px 14px"><div class="who" style="color:${S.color};font-size:18px">${esc(S.name)}</div>
      <div class="row2">${eur(S.weekly)} / SEMAINE · ${S.left} SEMAINES RESTANTES</div>
      <ul><li>Objectif : <b>${C.goalText(S.goal)}</b> ${S.done ? '✅' : ''} → prime ${eur(S.reward)}</li>${S.min ? `<li>Obligation : jouer ${S.min} tournois pendant le contrat (${(c.eventsTotal || 0) - (S.evStart || 0)}/${S.min})</li>` : ''}${S.brand ? `<li>Matériel ${S.brand} fourni gratuitement</li>` : ''}</ul></div>` : '<div class="infobox">Aucun contrat.</div>';
    const offers = C.sponsorOffers(slot).slice(-2).reverse();
    h += offers.map(o => `<button class="mbtn small" data-sp="${o.id}"><span><b style="color:${o.color}">${esc(o.name)}${S ? ' (remplace)' : ''}</b><small>${eur(o.weekly)} / sem. · ${C.goalText(o.goal)} → ${eur(o.reward)}${o.min ? ' · ' + o.min + ' tournois min.' : ''}${o.brand ? ' · matériel offert' : ''}</small></span></button>`).join('');
  }
  h += `<div style="font-size:12px;color:#a99cc9;margin-top:6px">Les grosses marques arrivent quand tu montes au classement. Ne pas tenir une obligation coûte une pénalité.</div>`;
  $('#team-sponsor').innerHTML = h;
  document.querySelectorAll('#team-coach [data-coach]').forEach(b => b.addEventListener('click', () => { sfx.ui(); C.hireCoach(+b.dataset.coach); C.save(); renderTeam(); refreshFocus(); }));
  document.querySelectorAll('#team-sponsor [data-sp]').forEach(b => b.addEventListener('click', () => { sfx.unlock(); C.signSponsor(b.dataset.sp); renderTeam(); focusIdx = 0; refreshFocus(); }));
}

// --- matériel
function renderShop() {
  renderMoney();
  const cc = C.career.center || {};
  $('#center').innerHTML = `<div class="shoprow" style="grid-template-columns:repeat(3,1fr)">` + Object.entries(C.CENTER).map(([k, X]) => {
    const lv = cc[k] || 0, cost = X.costs[lv + 1];
    return `<button class="mbtn ${cost && C.career.money >= cost ? '' : 'locked'}" data-center="${k}"><span><b>${X.name} · niv. ${lv}/3</b><small>${X.desc} · ${cost ? 'améliorer : ' + eur(cost) : 'niveau max'}</small></span></button>`;
  }).join('') + '</div>';
  document.querySelectorAll('#center [data-center]').forEach(b => b.addEventListener('click', () => { if (C.buyCenter(b.dataset.center)) { sfx.unlock(); toast('🏗️', 'CENTRE', C.CENTER[b.dataset.center].name, 'Amélioré !'); const k = focusIdx; renderShop(); focusIdx = k; refreshFocus(); } }));
  const c = C.career, bonus = b => Object.entries(b).map(([k, v]) => `+${v} ${C.STAT_NAMES[k].toLowerCase()}`).join(', ') || 'aucun bonus';
  $('#shop').innerHTML = Object.entries(C.GEAR).map(([slot, G]) => `<h2>${G.name}</h2><div class="shoprow">` + G.items.map((it, i) => {
    const own = i <= (c.gear[slot] || 0), eq = i === (c.gear[slot] || 0), can = !own && c.money >= C.gearPrice(it);
    return `<button class="mbtn ${eq ? 'accent' : can ? '' : own ? '' : 'locked'}" data-slot="${slot}" data-i="${i}"><span><b>${it.name}${eq ? ' ✓' : ''}</b>
      <small>${bonus(it.b)} · ${eq ? 'équipé' : own ? 'dépassé' : C.gearPrice(it) === 0 && it.price ? 'offert par ton équipementier' : eur(C.gearPrice(it))}</small></span></button>`;
  }).join('') + '</div>').join('');
  document.querySelectorAll('#shop [data-slot]').forEach(b => b.addEventListener('click', () => {
    if (C.buyGear(b.dataset.slot, +b.dataset.i)) { sfx.unlock(); toast('🛒', 'ACHAT', C.GEAR[b.dataset.slot].items[+b.dataset.i].name, 'Équipé automatiquement'); const k = focusIdx; renderShop(); focusIdx = k; refreshFocus(); }
  }));
}

// ------------------------------------------------------------------ carrière partie 3
function trophySVG(tier, size = 64) {
  const col = C.TIERS[tier] ? C.TIERS[tier].color : '#ffc83c', id = 'tg' + Math.random().toString(36).slice(2, 7);
  const big = tier === 'slam' || tier === 'worlds';
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" style="filter:drop-shadow(0 0 ${big ? 10 : 5}px ${col})">
    <defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="#fff8"/><stop offset=".35" stop-color="${col}"/><stop offset="1" stop-color="#0006"/></linearGradient></defs>
    <path d="M18 8h28v14a14 14 0 01-28 0z" fill="url(#${id})"/>
    <path d="M18 12H9a9 9 0 009 12M46 12h9a9 9 0 01-9 12" stroke="${col}" stroke-width="3" fill="none"/>
    <path d="M29 35h6v10h-6z" fill="url(#${id})"/><path d="M20 45h24v6H20zM16 51h32v6H16z" fill="${big ? col : '#2a2440'}" stroke="${col}" stroke-width="1.5"/>
    ${big ? `<circle cx="32" cy="18" r="5" fill="#fff" opacity=".85"/>` : ''}</svg>`;
}
function flushPending() {
  if (!C.career) return;
  C.takePending().forEach((m, k) => setTimeout(() => toast('★', 'JALON DE CARRIÈRE', m.name, m.desc), 300 + k * 900));
}
function ceremony(d) {
  const el = $('#ceremony'), T = C.TIERS[d.tier];
  el.querySelector('.cer-tr').innerHTML = d.result && d.result.medal ? medalSVG(d.result.medal, 190) : trophySVG(d.tier, 190);
  el.querySelector('.cer-k').textContent = T.name.toUpperCase() + ' · SAISON ' + C.career.season;
  const md = d.result && d.result.medal;
  el.querySelector('.cer-t').textContent = md ? `Médaille ${C.medalTxt(md)} !` : d.tier === 'worlds' ? 'Champion du monde !' : d.kind === 'team' ? 'Champions du monde !' : d.kind === 'olympics' ? 'Champion olympique !' : 'Champion !';
  el.querySelector('.cer-s').textContent = d.kind === 'team' ? `${C.COUNTRIES[C.career.me.country].name} remporte les ${d.ev.name}` : md ? `${C.career.me.name} aux ${d.ev.name}` : `${C.career.me.name} remporte le ${d.ev.name}`;
  el.style.setProperty('--tc', md ? { or: '#ffc83c', argent: '#d8e0ea', bronze: '#d08a4a' }[md] : T.color);
  el.classList.remove('hidden');
  const pod = !!game && !$('#end').classList.contains('hidden');
  el.classList.toggle('pod', pod);
  if (pod) {
    $('#end').classList.add('hidden'); $('#hud').classList.add('hidden');
    const col = parseInt((md ? { or: '#ffc83c', argent: '#d8e0ea', bronze: '#d08a4a' }[md] : T.color).slice(1), 16);
    R.setPodium(true, col, !!md); R.figures[0].celebType = C.career.celeb || 0;
    cerPodium = true;
  }
  if (['slam', 'worlds', 'olympics', 'team', 'finals'].includes(d.tier)) setTimeout(() => music.fanfare(), 600);
  R.confetti(); setTimeout(() => R.confetti(), 700);
  sfx.crowd(3); announcer.say(d.tier === 'worlds' ? `${C.career.me.name}, champion du monde !` : `${C.career.me.name} remporte le ${d.ev.name} !`, true);
  focusIdx = 0; refreshFocus();
}
let cerPodium = false;
$('#cer-ok').addEventListener('click', () => {
  sfx.ui(); $('#ceremony').classList.add('hidden');
  if (cerPodium) { cerPodium = false; R.setPodium(false); $('#end').classList.remove('hidden'); $('#hud').classList.remove('hidden'); }
  focusIdx = 0; refreshFocus();
});

function renderSeason() {
  const c = C.career, r = c && c.review;
  if (!r) { show('scr-career'); return; }
  const row = (k, v) => `<div class="sv"><small>${k}</small><b>${v}</b></div>`;
  $('#season-box').innerHTML = `<div class="sreview"><small class="k">BILAN DE LA SAISON ${r.season}</small>
    <div class="big">${r.rank === 1 ? 'Numéro 1 mondial !' : r.rank <= 10 ? 'Dans l\'élite mondiale' : r.rank <= 50 ? 'Une belle saison' : 'Saison d\'apprentissage'}</div>
    <div class="svs">${row('Classement final', r.rank + 'e')}${row('Victoires', `${r.wins} – ${r.losses}`)}${row('Titres', r.titles.length)}${row('Gains', eur(r.money))}${row('Niveau', r.ov)}${row('Héritage', r.legacy + ' pts')}</div>
    ${r.titles.length ? `<div class="infobox">🏆 ${r.titles.map(esc).join(' · ')}</div>` : ''}
    ${r.best ? `<div class="infobox">Plus belle victoire : <b>${esc(r.best.name)}</b> (${r.best.rank}e mondial)</div>` : ''}
    <div class="infobox">Numéro 1 mondial en fin de saison : <b>${esc(r.no1)}</b></div>
    ${r.retired.length ? `<div class="infobox">👋 Retraites : ${r.retired.slice(0, 6).map(esc).join(', ')}${r.retired.length > 6 ? '…' : ''}. De jeunes talents débarquent sur le circuit.</div>` : ''}</div>`;
  sfx.crowd(2);
}
$('#season-go').addEventListener('click', () => { sfx.ui(); C.career.review = null; C.save(); show('scr-career'); });

function renderHof() {
  const c = C.career; if (!c) return;
  const L = C.legacy(), by = t => c.titles.filter(x => x.tier === t).length;
  const inHof = L >= 100;
  const rec = (k, v) => `<div class="sv"><small>${k}</small><b>${v}</b></div>`;
  const seasons = (c.seasons || []).map(s => `<div class="rk-row" style="grid-template-columns:90px 90px 1fr 110px 110px"><b>Saison ${s.season}</b><span>${s.rank}e</span><span>${s.titles.length} titre${s.titles.length > 1 ? 's' : ''}</span><span>${s.wins} – ${s.losses}</span><b>${eur(s.money)}</b></div>`).join('');
  const legends = (c.legends || []).slice(-12).reverse().map(l => `<div class="rk-row" style="grid-template-columns:1fr 120px 120px 100px"><span class="n">${pname(l)}</span><span>${l.slams} Grand Smash</span><span>${l.worlds} titre mondial</span><span>retraite S${l.season}</span></div>`).join('');
  $('#hof').innerHTML = `<div class="sreview ${inHof ? 'gold' : ''}"><small class="k">HALL OF FAME</small>
    <div class="big">${inHof ? `${esc(c.me.name)} est une légende` : 'En route vers la légende'}</div>
    <div class="hofbar"><i style="width:${Math.min(100, L)}%"></i><span>${L} / 100 points d'héritage</span></div>
    <small style="color:#a99cc9">Points : titres (Feeder 1, Contender 2, Champions 4, Grand Smash 10, Mondiaux 12), semaines n°1 (+1), semaines dans le top 10 (+0,2).</small>
    <div class="svs">${rec('Meilleur classement', c.bestRank && c.bestRank < 999 ? c.bestRank + 'e' : '—')}${rec('Semaines n°1', c.weeksNo1 || 0)}${rec('Grand Smash', by('slam'))}${rec('Titres mondiaux', by('worlds'))}${rec('Titres au total', c.titles.length)}${rec('Gains en carrière', eur(c.earned || 0))}</div></div>
    <h2>Records du circuit</h2><div class="recs">${Object.values(C.records()).map(r => `<div class="${r.holder === c.me.name ? 'mine' : ''}"><small>${r.name}</small><b>${r.value || '—'} ${r.value ? r.unit : ''}</b><span>${esc(r.holder)}${r.season ? ` · S${r.season}` : ''}</span></div>`).join('')}</div>
    <h2>Tes saisons</h2>${seasons || '<div class="infobox">Ta première saison est en cours.</div>'}
    <h2>Légendes retraitées du circuit</h2>${legends || '<div class="infobox">Aucune légende n\'a encore pris sa retraite.</div>'}`;
}

// ------------------------------------------------------------------ partie A : simulation, entrée des joueurs, talents
function simCareerMatch() {
  const c = C.career, d = c.tour;
  const m0 = C.myMatch();
  const bestOf = d.kind === 'exhib' || d.kind === 'qualif' ? 3 : C.setsFor(d.tier, m0 === d.bronze || d.stage === 'groups' ? 4 : d.rounds[d.round].length);
  const roundName = roundLabel(d, m0);
  const r = C.simulateMatch(bestOf);
  if (!r) return;
  const mm = C.myMatch();
  C.reportMatch(r.won, r.sets);
  if (r.o.rival) c.news.unshift(r.won ? `⚔ ${c.me.name} bat son rival ${r.o.name} !` : `⚔ ${r.o.name} prend le dessus sur ${c.me.name}.`);
  C.save();
  r.won ? sfx.crowd(2) : sfx.ui();
  toast(r.won ? '✅' : '❌', `MATCH SIMULÉ · ${roundName.toUpperCase()}`, `${r.won ? 'Victoire' : 'Défaite'} ${r.sets[0]}–${r.sets[1]}`, `${C.gameScores(r.sets).map(g => g.join('-')).join(' · ')} · ${r.o.name}`);
  if (d.result && (d.result.champion || d.result.medal)) setTimeout(() => ceremony(d), 500);
  show('scr-tour');
  setTimeout(flushPending, 1200);
}

function walkout(o, d, isFinal, bronze) {
  const c = C.career;
  game.stateT = 7.6; R.intro = 7.3;
  const el = $('#walkout');
  const lines = [
    { k: bronze ? `MATCH POUR LE BRONZE · ${d.ev.name.toUpperCase()}` : isFinal ? `FINALE · ${d.ev.name.toUpperCase()}` : `${d.ev.name.toUpperCase()} · ${roundLabel(d, C.myMatch()).toUpperCase()}`, p: o, col: '#ff3d6b' },
    { k: 'ET FACE À LUI', p: c.me, col: '#3d8bff' },
  ];
  const showLine = (L, t) => setTimeout(() => {
    if (!game) return;
    el.querySelector('.wk').textContent = L.k;
    el.querySelector('.wf').innerHTML = C.flag(L.p.country, 54, 36);
    el.querySelector('.wn').textContent = L.p.name;
    el.querySelector('.wm').textContent = `${C.COUNTRIES[L.p.country].name} · ${C.rankOf(L.p.id)}e mondial · ${C.STYLE_NAMES[L.p.style]}`;
    el.style.setProperty('--wc', L.col);
    el.classList.remove('hidden'); el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    announcer.say(`${L.p === c.me ? 'Et face à lui' : (isFinal ? 'Pour cette finale, ' : '') + 'Dans le coin rouge'}, ${C.rankOf(L.p.id)}e mondial, ${L.p.name} !`, true);
    sfx.crowd(L.p === c.me ? 3 : 2);
  }, t);
  showLine(lines[0], 3400);
  showLine(lines[1], 5300);
  setTimeout(() => el.classList.add('hidden'), 7200);
}

function renderPerks() {
  const c = C.career; if (!c) return;
  $('#perk-pts').textContent = c.perkPts ? `· ${c.perkPts} point${c.perkPts > 1 ? 's' : ''} à dépenser` : '';
  $('#perks').innerHTML = `<div class="ptree">` + C.PERK_TREE.map(t => `<div class="pcol" style="--pc:${t.color}"><h3>${t.name}</h3>` + t.perks.map(p => {
    const S = C.perkState(p.id);
    return `<button class="mbtn perk ${S.own ? 'own' : S.can ? 'accent' : S.open ? '' : 'locked'}" data-perk="${p.id}"><span><b>${S.own ? '✓ ' : S.open ? '' : '🔒 '}${p.name}</b>
      <small>${p.desc}${S.own ? '' : ` · ${p.cost} pt${p.cost > 1 ? 's' : ''}`}${p.sig ? ' · COUP SIGNATURE' : ''}</small></span></button>`;
  }).join('<i class="plink"></i>') + '</div>').join('') + `</div><div class="infobox">Tu gagnes des points de talent avec chaque titre, chaque jalon de carrière et chaque nouvelle saison. Les talents d'une branche se débloquent dans l'ordre.</div>`;
  document.querySelectorAll('#perks [data-perk]').forEach(b => b.addEventListener('click', () => {
    if (C.buyPerk(b.dataset.perk)) { sfx.unlock(); toast('⚡', 'TALENT DÉBLOQUÉ', b.querySelector('b').textContent.replace('✓ ', ''), b.querySelector('small').textContent.split(' · ')[0]); const k = focusIdx; renderPerks(); focusIdx = k; refreshFocus(); }
  }));
}


// ------------------------------------------------------------------ partie B : médailles, presse, staff, rivaux
function medalSVG(md, size = 64) {
  const col = { or: '#ffc83c', argent: '#d8e0ea', bronze: '#d08a4a' }[md];
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" style="filter:drop-shadow(0 0 8px ${col})">
    <path d="M20 4h10l6 18h-10zM44 4H34l-6 18h10z" fill="#3d8bff"/><path d="M24 4h4l4 12-3 6zM40 4h-4l-4 12 3 6z" fill="#ff3d6b"/>
    <circle cx="32" cy="40" r="18" fill="${col}"/><circle cx="32" cy="40" r="13" fill="none" stroke="#0003" stroke-width="2"/>
    <text x="32" y="46" text-anchor="middle" font-size="15" font-weight="900" fill="#0006" font-family="Arial">${md === 'or' ? '1' : md === 'argent' ? '2' : '3'}</text></svg>`;
}
function renderPress() {
  const c = C.career, P = c && c.press;
  if (!P) { show(c && c.tour ? 'scr-tour' : 'scr-career'); return; }
  $('#press-box').innerHTML = `<div class="press"><small class="k">CONFÉRENCE DE PRESSE${P.media ? ' · QUESTION DE ' + esc(P.media).toUpperCase() : ''}</small><div class="mics">🎙️ 🎙️ 🎙️</div><div class="q">« ${esc(P.q)} »</div></div>`;
  $('#press-ans').innerHTML = P.answers.map((a, i) => `<button class="mbtn ${i === 2 ? 'gold' : ''}" data-ans="${i}"><span><b>${a.tone}</b><small>« ${esc(a.t)} »</small></span></button>`).join('');
  document.querySelectorAll('#press-ans [data-ans]').forEach(b => b.addEventListener('click', () => {
    const r = C.answerPress(+b.dataset.ans);
    sfx.crowd(1);
    toast('🎙️', 'PRESSE', `+${fansN(r.fans)} fans`, r.enemy ? `🔥 ${r.enemy} n'a pas apprécié : nouvel ennemi juré` : `Confiance +${r.conf}`);
    show(C.career.tour ? 'scr-tour' : 'scr-career');
  }));
}
const fansN = n => C.fansLabel(Math.round(n || 0));
function renderStaff() {
  const c = C.career;
  const rows = Object.entries(C.STAFF).map(([role, S]) => {
    const lv = (c.staff || {})[role] || 0;
    return `<div class="staffrow"><div><b>${S.name}</b><small>${S.desc}</small></div>` + S.levels.map((L, i) => `<button class="mbtn small ${i === lv ? 'accent' : ''}" data-staff="${role}" data-lv="${i}"><span><b>${i === 0 ? 'Aucun' : L.name}</b><small>${L.cost ? eur(L.cost) + '/sem.' : 'gratuit'}</small></span></button>`).join('') + '</div>';
  }).join('');
  const P = c.partner && c.pool.find(p => p.id === c.partner);
  const offers = C.partnerOffers();
  const part = `<h2>Partenaire de double</h2>${P ? `<div class="infobox">Partenaire actuel : <b>${pname(P)}</b> · ${C.rankOf(P.id)}e mondial · complicité ${(c.chem || 0).toFixed(1)} / 6</div>` : '<div class="infobox">Pas de partenaire : tu ne peux pas t\'inscrire aux tableaux de double.</div>'}
    <div class="shoprow">${offers.map(o => `<button class="mbtn small ${P && P.id === o.id ? 'accent' : ''}" data-partner="${o.id}"><span><b>${C.flag(o.country, 16, 11)}${esc(o.name)}</b><small>${C.rankOf(o.id)}e · niv. ${Math.round(o.rating)}${o.country === c.me.country ? ' · même pays' : ''}</small></span></button>`).join('')}</div>`;
  const MP = c.mpartner && C.getP(c.mpartner);
  const part2 = `<h2>Partenaire de double mixte</h2>${MP ? `<div class="infobox">Partenaire actuelle : <b>${pname(MP)}</b> · complicité ${(c.mchem || 0).toFixed(1)} / 6</div>` : '<div class="infobox">Pas de partenaire : tu ne peux pas jouer les doubles mixtes (WTT Champions et Grand Smash, top 80).</div>'}
    <div class="shoprow">${C.mixedOffers().map(o => `<button class="mbtn small ${MP && MP.id === o.id ? 'accent' : ''}" data-mpartner="${o.id}"><span><b>${C.flag(o.country, 16, 11)}${esc(o.name)}</b><small>niv. ${Math.round(o.rating)}${o.country === c.me.country ? ' · même pays' : ''}</small></span></button>`).join('')}</div>`;
  $('#staff').innerHTML = rows + part + part2;
  document.querySelectorAll('#staff [data-mpartner]').forEach(b => b.addEventListener('click', () => { sfx.unlock(); C.setMixedPartner(b.dataset.mpartner); const k = focusIdx; renderTeam(); focusIdx = k; refreshFocus(); }));
  document.querySelectorAll('#staff [data-staff]').forEach(b => b.addEventListener('click', () => { sfx.ui(); C.hireStaff(b.dataset.staff, +b.dataset.lv); const k = focusIdx; renderTeam(); focusIdx = k; refreshFocus(); }));
  document.querySelectorAll('#staff [data-partner]').forEach(b => b.addEventListener('click', () => { sfx.unlock(); C.setPartner(b.dataset.partner); const k = focusIdx; renderTeam(); focusIdx = k; refreshFocus(); }));
}


// ------------------------------------------------------------------ partie C : sauvegardes, jubilé
let confirmRetire = false, confirmDel = 0;
function renderSlots() {
  let h = '';
  for (let n = 1; n <= C.SLOTS; n++) {
    const c = C.peek(n);
    if (c) {
      const sub = c.retired ? `Retraité à ${c.retired.age} ans · ${c.titles.length} titres · héritage ${c.retired.legacy}` : `Saison ${c.season} · semaine ${c.week} · ${c.me.age || 17} ans · ${c.titles.length} titre${c.titles.length > 1 ? 's' : ''} · ${(C.DIFFS[c.diff ?? 1] || {}).name}`;
      h += `<div class="slotrow"><button class="mbtn ${c.retired ? '' : 'accent'}" data-slot="${n}"><span><b>${C.flag(c.me.country, 22, 15)}${esc(c.me.name)}${c.retired ? ' · 🏛 Légende' : ''}</b><small>${sub}</small></span></button>
        <button class="mbtn small ghost" data-del="${n}"><span><b>${confirmDel === n ? 'Confirmer ?' : 'Supprimer'}</b></span></button></div>`;
    } else h += `<div class="slotrow"><button class="mbtn" data-slot="${n}"><span><b>Emplacement ${n} · vide</b><small>Nouvelle carrière</small></span></button><span></span></div>`;
  }
  $('#slots').innerHTML = h;
  document.querySelectorAll('#slots [data-slot]').forEach(b => b.addEventListener('click', () => {
    sfx.ui(); confirmDel = 0; C.setSlot(+b.dataset.slot);
    show(C.load() ? 'scr-career' : 'scr-career-new');
  }));
  document.querySelectorAll('#slots [data-del]').forEach(b => b.addEventListener('click', () => {
    const n = +b.dataset.del;
    if (confirmDel !== n) { confirmDel = n; renderSlots(); refreshFocus(); return; }
    confirmDel = 0; C.erase(n); sfx.ui(); renderSlots(); refreshFocus();
  }));
}
function renderJubile() {
  const c = C.career; if (!c || !c.retired) { show('scr-slots'); return; }
  const by = t => c.titles.filter(x => x.tier === t && !x.dbl).length;
  const R0 = c.retired, L = R0.legacy, hof = L >= 100;
  const rv = C.rivals().map(({ p, type }) => { const h = c.h2h[p.id] || { w: 0, l: 0 }; return `${esc(p.name)} (${type.toLowerCase()}) : <b>${h.w} – ${h.l}</b>`; }).join(' · ');
  const rec = (k, v) => `<div class="sv"><small>${k}</small><b>${v}</b></div>`;
  $('#jubile').innerHTML = `<div class="sreview ${hof ? 'gold' : ''}"><small class="k">JUBILÉ · ${(c.seasons || []).length} SAISONS SUR LE CIRCUIT</small>
    <div class="big">${hof ? `${esc(c.me.name)}, légende du ping` : `Merci ${esc(c.me.name)} !`}</div>
    <div style="color:#ddd5f2;margin-bottom:8px">${C.flag(c.me.country, 30, 20)} ${C.COUNTRIES[c.me.country].name} · retraite à ${R0.age} ans · ${hof ? '<b style="color:#ffc83c">Entre au Hall of Fame</b>' : `${L} / 100 points d'héritage`}</div>
    <div class="svs">${rec('Meilleur classement', (c.bestRank || R0.bestRank) + 'e')}${rec('Semaines n°1', c.weeksNo1 || 0)}${rec('Titres', c.titles.filter(t => !t.dbl).length)}${rec('Grand Smash', by('slam'))}${rec('Titres mondiaux', by('worlds'))}${rec('Gains', eur(c.earned || 0))}</div>
    <div class="cab" style="margin-top:12px">${(c.medals || []).map(x => `<div>${medalSVG(x.medal, 56)}<small>${esc(x.name)}</small></div>`).join('')}${c.titles.filter(t => !t.dbl && t.tier !== 'olympics').slice(-12).map(x => `<div>${trophySVG(x.tier, 52)}<small>${esc(x.name)}</small></div>`).join('') || '<div><small>Aucun titre</small></div>'}</div>
    ${rv ? `<div class="infobox">⚔ ${rv}</div>` : ''}
    <div class="infobox">👥 ${fansN(c.fans)} fans · ${c.titles.filter(t => t.dbl).length} titres en double · ${(c.medals || []).length} médaille${(c.medals || []).length > 1 ? 's' : ''} olympique${(c.medals || []).length > 1 ? 's' : ''}</div></div>`;
}
$('#jub-match').addEventListener('click', () => {
  initAudio(); sfx.ui();
  const c = C.career;
  const o = (C.rivals().find(r => r.type === 'Rival') || {}).p || C.ranking().find(e => e.p.id !== 'me').p;
  setup = { mode: 'farewell', level: 2, bestOf: 3, oppId: o.id, aiName: o.name, aiStyle: C.STYLE_NAMES[o.style] };
  game = new Game({ mode: 'ai', ctrl: ['human', 'ai'], me: 0, names: [c.me.name, o.name], assist: profile.settings.assist, bestOf: 3,
    firstServer: 0, hooks: hooks(), mods: [toMods(C.effStats()), toMods(o.stats, o.sig)], hands: [c.me.hand, o.hand] });
  game.ai[1] = new AI(game, 1, 2, { rating: C.rating(o), style: o.style });
  enterGame();
  R.setVenue(JUBILE_VENUE);
  R.setEventTitle(`Jubilé de ${c.me.name}`);
  setup.crowdMul = 1.4;
  R.figures[0].setColor(NEONS[c.me.neon] || NEONS[0]); R.figures[0].setAccessory(c.me.acc || 0);
  setTimeout(() => announcer.say(`Mesdames et messieurs, pour son dernier match, ${c.me.name} !`, true), 1500);
});

// ------------------------------------------------------------------ carrière : calendrier, réseaux, vestiaire, fiches, sparring, astuces, sauvegardes
function roundLabel(d, m) {
  if (!d) return '';
  if (d.kind === 'exhib') return 'Exhibition';
  if (d.kind === 'qualif') return 'Qualifications';
  if (m && m === d.bronze) return 'Match pour le bronze';
  if (d.stage === 'groups') return 'Phase de poules';
  if (!d.rounds[d.round]) return '';
  return C.ROUND_NAMES(d.rounds[d.round].length);
}
const CAREER_SCREENS = ['scr-career', 'scr-tour', 'scr-ctrain', 'scr-team', 'scr-shop', 'scr-perks', 'scr-cal', 'scr-social', 'scr-clocker', 'scr-rank'];
const TIPS = {
  'scr-career': 'Bienvenue au QG ! Commence par un WTT Feeder pour gagner tes premiers points. Chaque semaine : un tournoi OU du repos, et une séance d\'entraînement.',
  'scr-tour': 'Voici le tableau. Tu peux jouer ton match ou le simuler. Regarde la fiche de ton adversaire : points forts, points faibles, coups signature.',
  'scr-ctrain': 'Une séance par semaine. Le robot fait progresser la stat choisie, les cibles et le sparring aussi. Choisis un tournoi à préparer pour arriver au pic de forme.',
  'scr-team': 'Ton staff coûte de l\'argent chaque semaine mais rend tout plus facile. Prends vite un sponsor, et un partenaire pour jouer les doubles.',
  'scr-shop': 'Le matériel donne des bonus en match. Le centre d\'entraînement accélère ta progression sur le long terme.',
  'scr-perks': 'Les talents se débloquent avec les titres et les jalons. Les derniers de chaque branche sont des coups signature.',
  'scr-cal': 'Le calendrier montre toute la saison. Les Grand Smash et les Mondiaux sont réservés aux meilleurs, mais les qualifs et les wild cards peuvent t\'ouvrir la porte.',
};
function coachTipFor(id) {
  const c = C.career; if (!c || !TIPS[id] || (c.tips || {})[id]) return;
  const sc = document.getElementById(id);
  sc.querySelectorAll('.coachtip').forEach(e => e.remove());
  const el = document.createElement('div');
  el.className = 'coachtip';
  el.innerHTML = `<span>🧢</span><div><small>TON COACH</small>${TIPS[id]}</div><button class="mbtn small" data-nav><span><b>Compris</b></span></button>`;
  sc.prepend(el);
  el.querySelector('button').addEventListener('click', () => { c.tips = c.tips || {}; c.tips[id] = true; C.save(); el.remove(); sfx.ui(); focusIdx = 0; refreshFocus(); });
  focusIdx = 0; refreshFocus();
}
function renderCal() {
  const c = C.career;
  $('#cal-title').textContent = `Calendrier ${C.yearOf(c.season)} · saison ${c.season}`;
  let h = '<div class="calg">';
  for (let w = 1; w <= C.WEEKS; w++) {
    const evs = C.weekEvents(c.season, w).filter(e => !e.kind || e.kind === 'team' || e.kind === 'olympics');
    const res = c.results.filter(r => r.season === c.season && r.week === w);
    const tgt = c.prep && evs.some(e => e.id === c.prep.ev);
    h += `<div class="calw ${w === c.week ? 'now' : w < c.week ? 'past' : ''}"><small>${C.weekDate(c.season, w).short.toUpperCase()}${tgt ? ' · 🎯' : ''}</small>` + evs.map(e => {
      const lock = w >= c.week ? C.lockReason(e) && !C.qualifOpen(e) : false;
      return `<div class="cev" style="border-color:${C.TIERS[e.tier].color}"><b>${esc(e.name.replace('WTT ', ''))}</b><i style="color:${C.TIERS[e.tier].color}">${C.TIERS[e.tier].name}${lock ? ' · 🔒' : w >= c.week && C.qualifOpen(e) ? ' · qualifs' : ''}</i></div>`;
    }).join('') + res.map(r => `<div class="cres">${r.reached === 'Vainqueur' ? '🏆' : '·'} ${esc(r.reached)}</div>`).join('') + '</div>';
  }
  $('#cal').innerHTML = h + '</div>';
}
let socTab = 'ig';
function renderSocial() {
  const c = C.career, S = C.soc();
  $('#soc-fans').textContent = `· ${fansN(c.fans)} abonnés au total${S.verified ? ' · ✔ certifié' : ''}`;
  const tabs = Object.entries(C.PLATFORMS).map(([k, P]) => `<button class="mbtn small soctab ${socTab === k ? 'accent' : ''}" data-soctab="${k}" style="--pc:${P.color}"><span><b>${P.icon} ${P.name}</b><small>${fansN(S[k].f)} abonnés</small></span></button>`).join('');
  const P = C.PLATFORMS[socTab], feed = S[socTab].feed;
  const card = x => {
    const stats = `❤ ${fansN(x.likes)}${x.comments ? ' · 💬 ' + fansN(x.comments) : ''}${x.shares ? ' · ↻ ' + fansN(x.shares) : ''}${x.views ? ' · 👁 ' + fansN(x.views) + ' vues' : ''}${x.rt ? ' · ↻ ' + fansN(x.rt) : ''}`;
    if (socTab === 'ig' || socTab === 'tt' || socTab === 'yt') return `<div class="spost ${socTab} ${x.mine ? 'mine' : ''} ${x.viral ? 'viral' : ''}">
      <div class="simg" style="background:linear-gradient(135deg, ${P.color}55, #120d22 70%)"><span>${x.emoji || '🏓'}</span>${x.viral ? '<i>🚀 VIRAL</i>' : ''}${x.kind ? `<em>${esc(x.kind)}</em>` : ''}</div>
      <div class="stxt"><b>${esc(x.who)}</b> <small>${esc(x.handle)}${x.mine && S.verified ? ' ✔' : ''}</small><div>${esc(x.text)}</div><small class="st">${stats}</small>
      ${(x.comms || []).slice(0, 3).map(cm => `<div class="cm"><b>${esc(cm.h)}</b> ${esc(cm.t)}</div>`).join('')}</div></div>`;
    return `<div class="spost x ${x.mine ? 'mine' : ''} ${x.viral ? 'viral' : ''}"><div class="stxt"><b>${esc(x.who)}</b> <small>${esc(x.handle)}${x.mine && S.verified ? ' ✔' : ''} · S${x.s} sem. ${x.w}</small><div>${esc(x.text)}</div><small class="st">${stats}</small>
      ${(x.comms || []).slice(0, 2).map(cm => `<div class="cm"><b>${esc(cm.h)}</b> ${esc(cm.t)}</div>`).join('')}</div></div>`;
  };
  const ideas = C.postIdeas(), left = C.postsLeft();
  const comp = `<div class="scomp"><h3>Publier <small>${left} / ${C.POSTS_PER_WEEK} cette semaine</small></h3>${ideas.slice(0, 7).map(x => `<button class="mbtn small ${left > 0 ? '' : 'locked'} ${x.deal ? 'gold' : ''}" data-post="${x.id}" style="--pc:${C.PLATFORMS[x.pl].color}"><span><b>${C.PLATFORMS[x.pl].icon} ${x.kind}${x.deal ? ' · ' + x.deal.pay.toLocaleString('fr-FR') + ' €' : ''}</b><small>${esc(x.text)}</small></span></button>`).join('')}</div>`;
  const side = `<div class="sside">${comp}<h3>Notifications</h3><div class="snot">${S.notifs.slice(0, 8).map(n => `<div>${n.icon} ${esc(n.text)}</div>`).join('') || '<div>Rien de neuf</div>'}</div>${S.trend.length ? `<h3>Tendances</h3><div class="strend">${S.trend.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}</div>`;
  $('#social').innerHTML = `<div class="stabs">${tabs}</div><div class="sgrid"><div class="sfeed">${feed.length ? feed.map(card).join('') : `<div class="infobox">Rien sur ${P.name} pour l'instant. Publie quelque chose !</div>`}</div>${side}</div>`;
  document.querySelectorAll('#social [data-soctab]').forEach(b => b.addEventListener('click', () => { socTab = b.dataset.soctab; sfx.ui(); const k = focusIdx; renderSocial(); focusIdx = k; refreshFocus(); }));
  document.querySelectorAll('#social [data-post]').forEach(b => b.addEventListener('click', () => {
    const r = C.publish(b.dataset.post); if (!r) return;
    socTab = r.pl; r.viral ? sfx.crowd(2) : sfx.unlock();
    toast(C.PLATFORMS[r.pl].icon, r.viral ? 'C\'EST VIRAL !' : 'PUBLIÉ', `+${fansN(r.gain)} abonnés`, `❤ ${fansN(r.likes)}${r.views ? ' · 👁 ' + fansN(r.views) : ''}${r.money ? ' · +' + eur(r.money) : ''}`);
    renderSocial(); focusIdx = 0; refreshFocus();
  }));
}
function renderCLocker() {
  const c = C.career;
  const cur = c.me.outfit || '';
  $('#outfits').innerHTML = `<button class="mbtn small ${!cur ? 'accent' : ''}" data-outfit=""><span><b>Néon de départ</b><small>Ta couleur choisie à la création</small></span></button>` + C.OUTFITS.map(o => {
    const own = (c.outfits || []).includes(o.id);
    return `<button class="mbtn small ${cur === o.id ? 'accent' : own ? '' : 'locked'}" data-outfit="${o.id}"><span><b><span class="sw" style="background:${hex(o.color)};color:${hex(o.color)}"></span>${o.name}</b><small>${own ? (cur === o.id ? 'Portée' : 'Débloquée') : '🔒 ' + o.cond}</small></span></button>`;
  }).join('');
  $('#celebs').innerHTML = C.CELEBS.map((x, i) => `<button class="mbtn small ${(c.celeb || 0) === i ? 'accent' : C.celebUnlocked(i) ? '' : 'locked'}" data-celeb="${i}"><span><b>${x.name}</b><small>${C.celebUnlocked(i) ? ((c.celeb || 0) === i ? 'Choisie' : 'Disponible') : '🔒 ' + x.cond}</small></span></button>`).join('');
  $('#cl-sponsor').innerHTML = C.mainSponsor() ? `Le logo <b style="color:${C.mainSponsor().color}">${esc(C.mainSponsor().name)}</b> est affiché sur ton joueur en match.` : 'Signe un sponsor pour afficher son logo sur ton joueur.';
  document.querySelectorAll('#outfits [data-outfit]').forEach(b => b.addEventListener('click', () => { const id = b.dataset.outfit; if (id && !(c.outfits || []).includes(id)) return; C.setOutfit(id || null); sfx.ui(); const k = focusIdx; renderCLocker(); focusIdx = k; refreshFocus(); }));
  document.querySelectorAll('#celebs [data-celeb]').forEach(b => b.addEventListener('click', () => { const i = +b.dataset.celeb; if (!C.celebUnlocked(i)) return; C.setCeleb(i); sfx.ui(); const k = focusIdx; renderCLocker(); focusIdx = k; refreshFocus(); }));
}
let pcardId = null;
function renderPCardScreen() {
  const c = C.career, p = C.getP(pcardId); if (!p) return;
  const h = c.h2h[p.id] || { w: 0, l: 0 }, sc = C.scout(p);
  const wins = p.wins || {}, tit = Object.entries(wins).filter(([, v]) => v).map(([t, v]) => `${v} ${C.TIERS[t] ? C.TIERS[t].name : t}`).join(' · ');
  const form = (p.form || '').split('').map(x => `<i class="fm ${x === 'V' ? 'v' : 'd'}">${x}</i>`).join('');
  $('#pcard-box').innerHTML = `<div class="scard" style="border-left-color:${p.rival || p.enemy ? '#ff3d5a' : p.sig ? '#ffc83c' : '#c84dff'}">
    <div class="who" style="font-size:34px">${C.flag(p.country, 48, 32)}${esc(p.name)}</div>
    <div class="row2">${C.COUNTRIES[p.country].name.toUpperCase()} · ${p.age || '?'} ANS · ${C.rankOf(p.id)}E MONDIAL · ${C.rankPoints(p)} PTS · ${C.STYLE_NAMES[p.style].toUpperCase()} · ${p.hand === 1 ? 'DROITIER' : 'GAUCHER'}</div>
    <div class="cgrid" style="margin:0"><div>${C.STAT_KEYS.map(k => `<div class="statrow" style="grid-template-columns:110px 1fr 34px"><span>${C.STAT_NAMES[k]}</span><div class="xbar"><div style="width:${p.stats[k]}%"></div></div><b>${p.stats[k]}</b></div>`).join('')}</div>
    <div><ul><li>Niveau : <b>${Math.round(C.rating(p))}</b></li><li>Forme récente : ${form || '—'}</li><li>Titres depuis le début de ta carrière : <b>${tit || 'aucun'}</b></li>
    <li>Face-à-face avec toi : <b>${h.w} – ${h.l}</b></li><li>Points forts : ${sc.best.join(', ')} · points faibles : ${sc.worst.join(', ')}</li></ul>
    ${p.sig ? `<div class="sig">⚡ ${C.SIGNATURES[p.sig].name} : ${C.SIGNATURES[p.sig].desc}</div>` : ''}${p.rival ? '<div class="rv">⚔ TON RIVAL</div>' : p.enemy ? '<div class="rv">🔥 ENNEMI JURÉ</div>' : p.prodige ? '<div class="rv">⭐ JEUNE PRODIGE</div>' : ''}</div></div></div>`;
}
function startSparring(k) {
  const c = C.career, ov = C.overall(C.effStats());
  const o = { id: 'spar', name: C.COACHES[c.coach].cost ? C.COACHES[c.coach].name : 'Partenaire d\'entraînement', country: c.me.country, style: 'polyvalent', hand: 1, stats: {} };
  for (const s2 of C.STAT_KEYS) o.stats[s2] = Math.max(35, ov - 2);
  setup = { mode: 'sparring', level: 2, bestOf: 1, stat: k, aiName: o.name, aiStyle: 'Polyvalent' };
  game = new Game({ mode: 'ai', ctrl: ['human', 'ai'], me: 0, names: [c.me.name, o.name], assist: profile.settings.assist, bestOf: 1, firstServer: 0, hooks: hooks(),
    mods: [toMods(C.effStats()), toMods(o.stats)], hands: [c.me.hand, 1] });
  game.ai[1] = new AI(game, 1, 2, { rating: ov - 2, style: 'polyvalent' });
  enterGame();
  R.setVenue(TRAINING_VENUE); R.setCrowdDensity(0.05); R.setEventTitle('Entraînement'); setup.crowdMul = 0.2;
  R.figures[0].setColor(C.outfitColor() || NEONS[c.me.neon] || NEONS[0]);
}
// export / import des sauvegardes
$('#sv-export').addEventListener('click', () => {
  const data = {}; for (let n = 1; n <= C.SLOTS; n++) { const v = C.peek(n); if (v) data[n] = v; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ pingpong: 1, slots: data })], { type: 'application/json' }));
  a.download = 'pingpong-sauvegardes.json'; a.click(); sfx.ui();
  toast('💾', 'SAUVEGARDE', 'Export terminé', 'Garde ce fichier en sécurité');
});
$('#sv-import').addEventListener('click', () => $('#sv-file').click());
$('#sv-file').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const j = JSON.parse(await f.text());
    const slots = j.slots || (j.me ? { 1: j } : null);
    if (!slots) throw new Error('format');
    let n = 0; for (const [k, v] of Object.entries(slots)) { if (v && v.me) { localStorage.setItem(`pingpong-career-v2-s${k}`, JSON.stringify(v)); n++; } }
    toast('💾', 'SAUVEGARDE', 'Import réussi', `${n} carrière${n > 1 ? 's' : ''} restaurée${n > 1 ? 's' : ''}`);
  } catch (err) { toast('⚠️', 'SAUVEGARDE', 'Fichier invalide', 'Ce n\'est pas une sauvegarde PingPong'); }
  e.target.value = ''; renderSlots(); refreshFocus();
});
