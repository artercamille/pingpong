// Point d'entrée : menus, boucle de jeu, HUD, lobby en ligne.
import { Renderer } from './render.js';
import { Game, SHOT_LABEL, MAX_CHARGE } from './game.js';
import { AI } from './ai.js';
import { Input } from './input.js';
import { Net } from './net.js';
import { initAudio, sfx } from './audio.js';

const $ = s => document.querySelector(s);
const R = new Renderer($('#c'));
const input = new Input();
let game = null, net = null, setup = null, last = performance.now();
let oppName = 'Adversaire';

const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
};
$('#name').value = store.get('pp-name', '');
const myName = () => ($('#name').value.trim() || 'Joueur').slice(0, 14);

// ------------------------------------------------------------------ navigation
function show(id) {
  document.querySelectorAll('#menu .panel').forEach(p => p.classList.toggle('hidden', p.id !== id));
}
document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => {
  initAudio(); sfx.ui();
  store.set('pp-name', $('#name').value.trim());
  if (b.id === 'host-back' || b.id === 'join-back') resetNet();
  show(b.dataset.go);
}));
document.querySelectorAll('.choice').forEach(c => c.addEventListener('click', e => {
  if (e.target.tagName !== 'BUTTON') return;
  c.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === e.target));
  sfx.ui();
}));
const choice = id => +document.querySelector(`#${id} .on`).dataset.v;

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
      let sub = reason;
      if (rally >= 8) sub += ` · échange de ${rally + 1} coups`;
      if (m.over) banner(`${game.names[m.winner]} remporte le match !`, sub, 2.6);
      else if (setWon) banner(`Set pour ${game.names[w]}`, `${m.history[m.history.length - 1].join(' – ')}`, 3);
      else banner(`Point ${game.names[w]}`, sub, 1.7);
    },
    serve: s => {
      if (!game) return;
      if (s === game.me) hint('Service : appuie sur un coup pour lancer la balle, relâche quand elle redescend', 3);
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
  R.setView(game.players[game.me].side);
}

function quitToMenu() {
  game = null;
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
}

// ------------------------------------------------------------------ HUD
let fbT = 0, oppT = 0, banT = 0, hintT = 0;
function showFeedback(label, q, shot) {
  const el = $('#feedback');
  el.className = 'show ' + (q >= 0.9 ? 'perfect' : q >= 0.6 ? 'good' : 'bad');
  el.querySelector('.big').textContent = label;
  el.querySelector('.small').textContent = shot || '';
  fbT = 0.9;
}
function showOpp(label, shot) {
  $('#oppfb').textContent = `${game.names[1 - game.me]} : ${shot || ''} — ${label}`;
  $('#oppfb').classList.add('show');
  oppT = 1.4;
}
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
  });
  $('#setinfo').textContent = `SET ${Math.min(m.setIdx + 1, game.bestOf)} · AU MEILLEUR DES ${game.bestOf} SET${game.bestOf > 1 ? 'S' : ''}`;
  $('#ping').textContent = net && setup.mode === 'online' ? `Ping ${Math.round(net.rtt)} ms` : '';
  if ((fbT -= dt) <= 0) $('#feedback').classList.remove('show');
  if ((oppT -= dt) <= 0) $('#oppfb').classList.remove('show');
  if ((banT -= dt) <= 0) $('#banner').classList.remove('show');
  if ((hintT -= dt) <= 0) $('#hint').classList.remove('show');

  const me = game.players[game.me];
  const ch = $('#charge');
  if (me.charging) {
    ch.classList.add('show');
    const p = Math.min(1, me.chargeT / MAX_CHARGE);
    ch.querySelector('.fill').style.width = (Math.max(0.15, p) * 100) + '%';
    ch.querySelector('.lbl').textContent = SHOT_LABEL[me.chargeType] || '';
  } else ch.classList.remove('show');
}

// ------------------------------------------------------------------ boucle
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const inp = input.poll();
  const pad = $('#padstatus');
  if (input.padName) { pad.textContent = '🎮 Manette détectée'; pad.classList.add('ok'); }
  else { pad.textContent = 'Branche ta manette et appuie sur un bouton (ou joue au clavier)'; pad.classList.remove('ok'); }

  if (game) {
    if (inp.pressed.start) togglePause();
    if (game.state === 'over' && inp.pressed.top) again();
    game.update(dt, inp);
    if (!window.__noRender) R.update(game, dt);
    updateHUD(dt);
  } else R.idle(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// accès debug / tests
window.__pp = { get game() { return game; }, R, startAI, AI };
