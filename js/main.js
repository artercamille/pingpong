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
  focusIdx = 0; refreshFocus();
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
  R.setTheme(cosmetic('arena'));
  const pad = cosmetic('paddle');
  R.paddles[me].setColor(pad.color, pad.metal);
  const op = oppPaddle ? COSMETICS.paddle.find(c => c.id === oppPaddle) : null;
  const opp = op || (pad.id === 'bleu' ? COSMETICS.paddle[0] : COSMETICS.paddle[1]);
  R.paddles[1 - me].setColor(opp.color, opp.metal);
  R.trailColors[me] = cosmetic('trail').color;
  const ot = oppTrail ? COSMETICS.trail.find(c => c.id === oppTrail) : null;
  R.trailColors[1 - me] = ot ? ot.color : COSMETICS.trail[0].color;
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
  const K = { top: 'J', plat: 'K', coupe: 'U', lob: 'I', ok: 'Entrée', back: 'Échap', start: 'Échap', move: 'ZQSD', sideL: 'A', sideR: 'E' };
  if (pad) {
    if (P[name]) return `<span class="kb pad ${P[name][0]}">${P[name][1]}</span>`;
    if (name === 'move') return '<span class="kb pad">Stick gauche</span>';
    if (name === 'start') return '<span class="kb pad">Start</span>';
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
      else if (setWon) banner(`Set ${game.names[w]}`, '', 2.5);
      else if (game.pressure) banner(game.pressure.type === 'match' ? 'BALLE DE MATCH' : 'BALLE DE SET', game.names[game.pressure.p], 2);
      const run = game.run;
      if (run.n >= 3 && !m.over) showStreak(run.p === game.me ? `${run.n} points d'affilée 🔥` : `${game.names[run.p]} enchaîne : ${run.n} points`);
      const pts = document.querySelector(`#board .row[data-p="${w}"] .pts`);
      if (pts) { pts.classList.remove('pop'); void pts.offsetWidth; pts.classList.add('pop'); }
      if (m.over && m.winner === game.me) R.confetti();
      // réactions des bonshommes
      const ls2 = game.lastShot[w] || {};
      const hype = rally + 1 >= 6 || setWon || m.over || ((ls2.smash || ls2.sup) && reason === 'Point gagnant');
      if (hype) { R.figures[w].celebrate(true); if (setWon || m.over) R.figures[1 - w].celebrate(false); }
      // voix
      if (m.over) announcer.say(`Jeu, set et match, ${game.names[m.winner]} !`, true);
      else if (setWon) announcer.say(`Set, ${game.names[w]}`, true);
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
      if (game.pressure) announcer.say(`${a}, ${b}. ${game.pressure.type === 'match' ? 'Balle de match' : 'Balle de set'}`);
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
  const ai = new AI(null, 1, level);
  const nm = AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)];
  setup.aiName = nm; setup.aiStyle = ai.style.name;
  game = new Game({ mode: 'ai', ctrl: ['human', 'ai'], me: 0, names: [myName(), nm], assist: profile.settings.assist,
    bestOf, firstServer: Math.random() < 0.5 ? 0 : 1, hooks: hooks() });
  ai.g = game; game.ai[1] = ai;
  enterGame();
}

function startTraining() {
  const cfg = { type: choice('tr-type'), zone: choice('tr-zone'), speed: choice('tr-speed') };
  setup = { mode: 'training', level: 0, bestOf: 99 };
  game = new Game({ mode: 'ai', ctrl: ['human', 'robot'], me: 0, names: [myName(), 'Robot'], bestOf: 99, assist: profile.settings.assist,
    training: cfg, hooks: { ...hooks(), point: () => {}, train: (ok, T) => renderTrain(ok, T) } });
  enterGame();
  document.body.classList.add('training');
  $('#trainhud').classList.remove('hidden');
  renderTrain(null, game.train);
}
function renderTrain(ok, T) {
  $('#trainhud').innerHTML = `<div><b>${T.ok} / ${T.total}</b><small>RÉUSSIS</small></div><div><b>${T.streak}</b><small>SÉRIE</small></div><div><b>${T.best}</b><small>RECORD</small></div>`;
  if (ok && T.streak > 0 && T.streak % 10 === 0) { showStreak(`${T.streak} d'affilée 🔥`); sfx.crowd(2); }
}
$('#tr-go').addEventListener('click', () => { initAudio(); sfx.ui(); startTraining(); });

function startOnline(me, bestOf, firstServer, names) {
  setup = { mode: 'online', me, bestOf };
  const ctrl = me === 0 ? ['human', 'remote'] : ['remote', 'human'];
  game = new Game({ mode: 'online', ctrl, me, names, bestOf, firstServer, net, hooks: hooks(), assist: profile.settings.assist });
  net.onMessage = onNetMessage;
  net.onClose = () => {
    banner('Ton pote s\'est déconnecté', 'Retour au menu…', 3);
    setTimeout(() => quitToMenu(), 2500);
  };
  enterGame(opp.paddle, opp.trail);
}

function enterGame(oppPaddle, oppTrail) {
  initAudio();
  applyCosmetics(oppPaddle, oppTrail);
  recorder.reset(); bestClip = null; replay = null; postPoint = null; replayDone = {};
  if (!tuto && setup.mode !== 'training') { game.stateT = 3.4; R.intro = 3.2; showVS(); } else { R.intro = 0; game.stateT = 1; }
  music.stop();
  document.body.classList.remove('replaying'); $('#replay').classList.add('hidden');
  $('#menu').classList.add('hidden');
  $('#end').classList.add('hidden');
  $('#pause').classList.add('hidden');
  $('#hud').classList.remove('hidden');

}

function quitToMenu() {
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
  show('scr-main');
applyCosmetics();
applySettings();
addEventListener('pointerdown', () => { initAudio(); applySettings(); }, { once: true });
addEventListener('keydown', () => { initAudio(); applySettings(); }, { once: true });
}

function resetNet() {
  if (net) { net.onClose = () => {}; net.destroy(); net = null; }
  $('#host-box').classList.add('hidden');
  $('#host-go').classList.remove('hidden');
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
  $('#host-go').classList.add('hidden');
  $('#host-box').classList.remove('hidden');
  $('#host-code').textContent = '·····';
  $('#host-status').textContent = 'Connexion au serveur…';
  net.host(code => {
    $('#host-code').textContent = code;
    $('#host-status').textContent = 'En attente de ton pote…';
  }, () => {
    $('#host-status').textContent = 'Pote connecté !';
    net.onMessage = msg => {
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
      if (msg.t === 'start') { opp = { lp: msg.lp ?? 0, paddle: msg.paddle, trail: msg.trail }; startOnline(1, msg.bestOf, msg.firstServer, msg.names); }
    };
    net.send({ t: 'hello', name: myName(), lp: profile.lp, paddle: profile.cos.paddle, trail: profile.cos.trail });
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
  startOnline(setup.me, setup.bestOf, fs, names);
}

// ------------------------------------------------------------------ fin / pause
function showEnd(m) {
  setTimeout(() => music.start(0.4), 1500);
  const me = game.me, op = 1 - me;
  const win = m.winner === me;
  $('#end-title').textContent = setup.mode === 'ai' ? (win ? 'Victoire !' : 'Défaite…') : (win ? 'Tu as gagné !' : `${game.names[m.winner]} gagne`);
  $('#end-sets').innerHTML = m.history.map((h, i) => `Set ${i + 1} : <b>${h[me]}</b> – <b>${h[op]}</b>`).join('<br>');
  $('#end-status').textContent = '';
  const sum = game.summary();
  const setsWon = m.sets[me], setsLost = m.sets[op];
  const ranked = setup.mode === 'online';
  const res = recordMatch({ won: win, mode: setup.mode, oppName: game.names[op], oppLp: opp.lp, ranked, aiLevel: setup.level,
    setsWon, setsLost, stats: { longest: sum.longest, maxSpeed: sum.stats[me].maxSpeed, ach: sum.ach } });
  // rang
  if (ranked) {
    const rb = rankOf(res.lpBefore), ra = rankOf(res.lpAfter);
    const promo = ra.tier > rb.tier || (ra.tier === rb.tier && ra.div !== rb.div && res.lpDelta > 0) ? 'PROMOTION !' : (ra.tier < rb.tier || (ra.tier === rb.tier && ra.div !== rb.div && res.lpDelta < 0)) ? 'RÉTROGRADATION' : 'CLASSÉ';
    $('#end-rank').innerHTML = `<div class="rankbox">${emblem(res.lpAfter, 64)}<div><div class="promo">${promo}</div><div class="rl" style="color:${ra.glow}">${ra.label}</div><div>${ra.lp} LP</div></div>
      <div style="margin-left:auto" class="rd ${res.lpDelta >= 0 ? 'up' : 'down'}">${res.lpDelta >= 0 ? '+' : ''}${res.lpDelta} LP</div></div>`;
  } else $('#end-rank').innerHTML = `<div class="infobox">Match amical contre l'IA : pas de LP en jeu. <b>Les matchs en ligne sont classés.</b></div>`;
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
$('#resume').addEventListener('click', () => { if (timeout) endTimeout(true); else togglePause(false); });
$('#quit').addEventListener('click', () => quitToMenu());
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
  if (!game || (setup.mode !== 'ai' && setup.mode !== 'training')) return;
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
  const me = game.me, op = 1 - me;
  const side = (k, p) => {
    const box = el.querySelector('.vsside.' + k);
    box.querySelector('.n').textContent = game.names[p];
    let lp = null, label = '';
    if (p === me) lp = profile.lp;
    else if (setup.mode === 'online') lp = opp.lp || 0;
    if (lp !== null) { const r = rankOf(lp); label = `<span style="color:${r.glow}">${r.label}</span>`; box.querySelector('.emb').innerHTML = emblem(lp, 84); }
    else { label = `${['IA Facile', 'IA Normale', 'IA Difficile', 'Coach'][setup.level] || 'IA'} · ${setup.aiStyle || ''}`; box.querySelector('.emb').innerHTML = ''; }
    box.querySelector('.r').innerHTML = label;
  };
  side('l', me); side('r', op);
  el.querySelector('.vsf').textContent = (setup.mode === 'online' ? 'MATCH CLASSÉ · ' : 'MATCH AMICAL · ') + (game.bestOf === 1 ? '1 SET' : `AU MEILLEUR DES ${game.bestOf} SETS`);
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
  $('#setinfo').textContent = `SET ${Math.min(m.setIdx + 1, game.bestOf)}`;
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
function updateRing(dt) {
  const el = $('#ring');
  const me = game.me, pl = game.players[me];
  const lp = game.lastPress;
  if (lp && lp.i === me && lp !== ringLastPress) {
    ringLastPress = lp; ringFlash = 0.38;
    el.className = 'show hit ' + (lp.grade < 0 ? 'gm' : 'g' + lp.grade);
  }
  if (ringFlash > 0) { ringFlash -= dt; if (ringFlash <= 0) el.className = ''; return; }
  const pr = game.pred[me];
  let active = false, P = null;
  if (pr && game.state === 'rally' && game.rally && game.rally.hitter !== me && !game.rally.contactTried && !pl.pressType) { active = true; P = { x: pr.x, y: pr.y, z: pr.z }; }
  if (pr && pr.serve && game.state === 'toss' && game.server() === me) { active = true; P = { x: game.ball.p.x, y: 1.06, z: game.ball.p.z }; }
  const rem = active ? pr.t - game.simTime : 99;
  if (!active || rem > RING_T || rem < -0.2) { el.className = ''; return; }
  const sp = R.worldToScreen(P);
  el.style.transform = `translate(${sp.x}px, ${sp.y}px)`;
  const scale = 1 + 2.6 * Math.max(0, rem) / RING_T;
  el.querySelector('.app').style.width = el.querySelector('.app').style.height = (34 * scale) + 'px';
  el.className = 'show';
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
  el.style.display = tuto ? 'none' : '';
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
  setCrowd(lvl);
}

// ------------------------------------------------------------------ tutoriel
const TUTO = [
  { title: 'Déplacement', text: () => `Bouge ta raquette avec ${kb('move')}. Pendant les échanges, elle se place aussi toute seule vers la balle.`, need: 1.5, check: 'move' },
  { title: 'Le timing', text: () => `Quand la balle arrive, un cercle se referme sur ta cible. Appuie sur ${kb('top')} (lift) pile quand il touche le cercle blanc. Réussis 2 lifts.`, need: 2, check: 'top' },
  { title: 'La frappe', text: () => `${kb('plat')} : une frappe rapide et à plat. Sur une balle haute, c'est un smash.`, need: 1, check: 'plat' },
  { title: 'Le coupé', text: () => `${kb('coupe')} : une balle lente avec effet arrière, qui freine sur la table.`, need: 1, check: 'coupe' },
  { title: 'Le lob', text: () => `${kb('lob')} : une balle haute et lente pour te défendre.`, need: 1, check: 'lob' },
  { title: 'Viser', text: () => `Pendant que la balle arrive, pousse ${kb('move')} à gauche ou à droite. Le cercle jaune sur la table montre où ira ta balle.`, need: 1, check: 'aim' },
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
    tutoRender();
  }
}
function tutoHit(p, h) {
  if (!tuto || p !== game.me || tuto.step >= TUTO.length) return;
  const c = TUTO[tuto.step].check;
  if (c === 'serve' ? h.serve : h.serve) { if (c === 'serve') tutoAdvance(); return; }
  const base = { flip: 'top', contre: 'plat', bloc: 'coupe' }[h.type] || h.type;
  if ((c === base) || (c === 'aim' && Math.abs(h.aimX) > 0.45) || (c === 'power' && h.power > 0.75)) tutoAdvance();
}
function tutoUpdate(dt) {
  const pl = game.players[game.me];
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
