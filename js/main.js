// Point d'entrée : menus, boucle de jeu, HUD, lobby en ligne.
import { Renderer } from './render.js';
import { Game, SHOT_LABEL, MAX_CHARGE, IDEAL_REL, TIMING } from './game.js';
import { AI } from './ai.js';
import { Input } from './input.js';
import { Net } from './net.js';
import { initAudio, sfx, setMuted } from './audio.js';

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
let oppName = 'Adversaire';

const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
};
$('#name').value = store.get('pp-name', '');
const myName = () => ($('#name').value.trim() || 'Joueur').slice(0, 14);

// ------------------------------------------------------------------ navigation
function show(id) {
  document.querySelectorAll('#menu .screen').forEach(p => p.classList.toggle('hidden', p.id !== id));
  $('#profile-name').textContent = myName();
  focusIdx = 0; refreshFocus();
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
const choice = id => { const o = $('#' + id); return +o.dataset.v.split('|')[+o.dataset.i]; };

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
    else if (items[focusIdx].classList.contains('opt')) optStep(items[focusIdx], h);
  }
  if (!v && !h) navCool = 0;
  if (inp.pressed.top && !typing) { initAudio(); const el = items[focusIdx]; if (el.classList.contains('opt')) optStep(el, 1); else el.click(); }
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
    },
    serve: s => {
      if (!game) return;

    },
    message: t => banner(t, '', 1.5),
    over: m => showEnd(m),
  };
}

function startAI() {
  const level = choice('ai-level'), bestOf = choice('ai-format');
  setup = { mode: 'ai', level, bestOf };
  game = new Game({ mode: 'ai', ctrl: ['human', 'ai'], me: 0, names: [myName(), ['IA Facile', 'IA', 'IA Pro'][level]],
    bestOf, firstServer: Math.random() < 0.5 ? 0 : 1, hooks: hooks() });
  game.ai[1] = new AI(game, 1, level);
  enterGame();
}

function startOnline(me, bestOf, firstServer, names) {
  setup = { mode: 'online', me, bestOf };
  const ctrl = me === 0 ? ['human', 'remote'] : ['remote', 'human'];
  game = new Game({ mode: 'online', ctrl, me, names, bestOf, firstServer, net, hooks: hooks() });
  net.onMessage = onNetMessage;
  net.onClose = () => {
    banner('Ton pote s\'est déconnecté', 'Retour au menu…', 3);
    setTimeout(() => quitToMenu(), 2500);
  };
  enterGame();
}

function enterGame() {
  initAudio();
  $('#menu').classList.add('hidden');
  $('#end').classList.add('hidden');
  $('#pause').classList.add('hidden');
  $('#hud').classList.remove('hidden');

}

function quitToMenu() {
  game = null; tuto = null;
  $('#tuto').classList.add('hidden'); $('#board').classList.remove('hidden');
  resetNet();
  $('#hud').classList.add('hidden');
  $('#end').classList.add('hidden');
  $('#pause').classList.add('hidden');
  $('#menu').classList.remove('hidden');
  show('scr-main');
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
        net.send({ t: 'start', bestOf, firstServer, names });
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
      if (msg.t === 'start') startOnline(1, msg.bestOf, msg.firstServer, msg.names);
    };
    net.send({ t: 'hello', name: myName() });
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
  game && game.onNet(msg);
}
function restartOnline(fs) {
  const names = game.names;
  startOnline(setup.me, setup.bestOf, fs, names);
}

// ------------------------------------------------------------------ fin / pause
function showEnd(m) {
  const win = m.winner === game.me;
  $('#end-title').textContent = setup.mode === 'ai' ? (win ? 'Victoire !' : 'Défaite…') : (win ? 'Tu as gagné !' : `${game.names[m.winner]} gagne`);
  $('#end-sets').innerHTML = m.history.map((h, i) => `Set ${i + 1} : <b>${h[0]}</b> – <b>${h[1]}</b>`).join('<br>');
  $('#end-status').textContent = '';
  $('#end').classList.remove('hidden');
  focusIdx = 0; refreshFocus();
  (win ? sfx.applause(1.6) : 0);
}
function again() {
  sfx.ui();
  if (!game) return;
  if (setup.mode === 'ai') { startAI(); return; }
  if (setup.me === 0) { const fs = Math.random() < 0.5 ? 0 : 1; net.send({ t: 'rematch', firstServer: fs }); restartOnline(fs); }
  else { net.send({ t: 'rematchReq' }); $('#end-status').textContent = 'Demande envoyée…'; }
}
$('#again').addEventListener('click', again);
$('#tomenu').addEventListener('click', () => { net && net.send({ t: 'quit' }); quitToMenu(); });
$('#resume').addEventListener('click', () => togglePause(false));
$('#quit').addEventListener('click', () => quitToMenu());
function togglePause(v) {
  if (!game || setup.mode !== 'ai') return;
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

// ------------------------------------------------------------------ tutoriel
const TUTO = [
  { title: 'Déplacement', text: () => `Bouge ta raquette avec ${kb('move')}. Pendant les échanges, elle se place aussi toute seule vers la balle.`, need: 1.5, check: 'move' },
  { title: 'Le lift', text: () => `Quand la balle arrive, appuie sur ${kb('top')}. Ta raquette frappe toute seule au bon moment. Réussis 2 lifts.`, need: 2, check: 'top' },
  { title: 'La frappe', text: () => `${kb('plat')} : une frappe rapide et à plat. Sur une balle haute, c'est un smash.`, need: 1, check: 'plat' },
  { title: 'Le coupé', text: () => `${kb('coupe')} : une balle lente avec effet arrière, qui freine sur la table.`, need: 1, check: 'coupe' },
  { title: 'Le lob', text: () => `${kb('lob')} : une balle haute et lente pour te défendre.`, need: 1, check: 'lob' },
  { title: 'Viser', text: () => `Maintiens un coup et pousse ${kb('move')} à gauche ou à droite. Le cercle jaune montre où ira la balle.`, need: 1, check: 'aim' },
  { title: 'La puissance', text: () => `Maintiens le bouton longtemps avant que la balle arrive pour frapper plus fort. Attention : plus c'est fort, plus c'est risqué.`, need: 1, check: 'power' },
  { title: 'Le service', text: () => `À toi de servir : appuie sur un coup (${kb('top')}, ${kb('coupe')}…). Vise avec ${kb('move')}.`, need: 1, check: 'serve' },
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
    sfx.applause(0.6);
    if (tuto.step === TUTO.length - 1) game.forcedServer = 0;
    tutoRender();
  }
}
function tutoHit(p, h) {
  if (!tuto || p !== game.me || tuto.step >= TUTO.length) return;
  const c = TUTO[tuto.step].check;
  if (c === 'serve' ? h.serve : h.serve) { if (c === 'serve') tutoAdvance(); return; }
  if ((c === h.type) || (c === 'aim' && Math.abs(h.aimX) > 0.45) || (c === 'power' && h.power > 0.75)) tutoAdvance();
}
function tutoUpdate(dt) {
  const pl = game.players[game.me];
  if (tuto.step < TUTO.length && TUTO[tuto.step].check === 'move') {
    tuto.moved += Math.hypot(pl.x - tuto.lx, pl.z - tuto.lz);
    if (tuto.moved >= 1.5) { tuto.count = 0; tuto.moved = -999; tutoAdvance(1.5); }
  }
  tuto.lx = pl.x; tuto.lz = pl.z;
  if (tuto.step >= TUTO.length) { tuto.done += dt; if (tuto.done > 4) quitToMenu(); }
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
    game.update(dt, inp);
    if (!window.__noRender) R.update(game, dt);
    updateHUD(dt);
  } else if (ready) {
    setMuted(true);
    R.orbit = true;
    if (demo.state === 'over') newDemo();
    demo.update(dt, null);
    if (!window.__noRender) R.update(demo, dt);
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// accès debug / tests
window.__pp = { get game() { return game; }, get demo() { return demo; }, get tuto() { return tuto; }, tutoUpdate: d => tutoUpdate(d), R, startAI, startTuto, AI };
show('scr-main');
