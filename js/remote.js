// Téléphone-raquette : le PC ouvre un point de connexion, chaque téléphone (page remote.html)
// s'y connecte et envoie ses gestes (frappe, lancer de balle, boutons de menu).
// Les gestes sont traduits en « entrées » identiques à celles de la manette pour le moteur de jeu.
import { PREFIX, ICE } from './net.js';
import { emptyInput } from './input.js';

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PUBLIC_URL = 'https://artercamille.github.io/pingpong/';
export const SLOT_COLORS = ['#3d8bff', '#ff3d6e'];

export class PhoneHub {
  constructor() {
    this.peer = null;
    this.code = null;
    this.slots = [null, null];    // { conn, id, name, rtt, queue: [], aimYaw, lastSwing }
    this.cur = [null, null];      // entrée calculée pour l'image en cours
    this.onChange = () => {};
    this.onSwing = () => {};
    this.status = 'off';
    this.state = {};
  }

  get count() { return this.slots.filter(Boolean).length; }
  has(k) { return !!this.slots[k]; }

  // adresse que le téléphone doit ouvrir
  url() {
    const custom = new URLSearchParams(location.search).get('peer');
    let base;
    if (custom || location.protocol === 'https:') base = location.origin + location.pathname.replace(/[^/]*$/, '');
    else base = PUBLIC_URL;   // les capteurs du téléphone exigent une adresse sécurisée (https)
    return `${base}remote.html?c=${this.code}${custom ? '&peer=' + encodeURIComponent(custom) : ''}`;
  }
  get usesPublicUrl() { return !this.url().startsWith(location.origin); }

  start() {
    if (this.peer || !window.Peer) return;
    let code = null;
    try { code = sessionStorage.getItem('pp-tel-code'); } catch (e) {}
    if (!code) { code = ''; for (let i = 0; i < 5; i++) code += ALPHA[Math.floor(Math.random() * ALPHA.length)]; }
    this.code = code;
    try { sessionStorage.setItem('pp-tel-code', code); } catch (e) {}
    this.status = 'opening'; this.onChange();
    this.peer = new window.Peer(PREFIX + 'tel-' + code, ICE);
    this.peer.on('open', () => { this.status = 'ready'; this.onChange(); });
    this.peer.on('connection', conn => this.accept(conn));
    this.peer.on('disconnected', () => { try { this.peer.reconnect(); } catch (e) {} });
    this.peer.on('error', err => {
      if (err.type === 'unavailable-id') {
        try { sessionStorage.removeItem('pp-tel-code'); } catch (e) {}
        try { this.peer.destroy(); } catch (e) {}
        this.peer = null; this.start(); return;
      }
      if (err.type === 'network' || err.type === 'server-error') { this.status = 'error'; this.onChange(); }
    });
    if (!this.pingTimer) this.pingTimer = setInterval(() => this.tick(), 1000);
  }

  accept(conn) {
    conn.on('open', () => {
      conn.rtt = 60;
      conn.on('data', msg => this.message(conn, msg));
      conn.on('close', () => this.drop(conn));
      conn.on('error', () => {});
    });
  }

  drop(conn) {
    const k = this.slots.findIndex(s => s && s.conn === conn);
    if (k < 0) return;
    this.slots[k] = null; this.cur[k] = null;
    this.onChange({ type: 'leave', slot: k });
  }

  message(conn, msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'pong') { conn.rtt = conn.rtt * 0.7 + (performance.now() - msg.ts) * 0.3; return; }
    if (msg.t === 'hello') {
      const id = String(msg.id || '').slice(0, 40);
      // même téléphone qui revient : il retrouve sa place
      let k = this.slots.findIndex(s => s && s.id === id);
      if (k >= 0 && this.slots[k].conn !== conn) { try { this.slots[k].conn.close(); } catch (e) {} }
      if (k < 0) k = this.slots.findIndex(s => !s);
      if (k < 0) { try { conn.send({ t: 'full' }); } catch (e) {} setTimeout(() => conn.close(), 300); return; }
      this.slots[k] = { conn, id, name: String(msg.name || '').slice(0, 20), queue: [], aimYaw: 0, lastSwing: 0, speed: 0 };
      this.send(k, { t: 'welcome', slot: k, color: SLOT_COLORS[k] });
      this.state[k] = null;
      this.onChange({ type: 'join', slot: k });
      return;
    }
    const k = this.slots.findIndex(s => s && s.conn === conn);
    if (k < 0) return;
    const S = this.slots[k];
    if (msg.t === 'sw') {
      const sw = {
        type: ['top', 'plat', 'coupe', 'lob'].includes(msg.type) ? msg.type : 'top',
        speed: Math.max(0, Math.min(1, +msg.speed || 0)),
        aimYaw: Math.max(-1, Math.min(1, +msg.aim || 0)),
        // délai entre le geste réel et sa réception : capteurs + détection + réseau
        lag: Math.min(0.25, Math.max(0, (+msg.ago || 0) / 1000 + conn.rtt / 2000 + 0.012)),
      };
      // geste fait dans un menu : seulement affiché (pour s'entraîner), il ne valide rien
      if (msg.play !== false) S.queue.push({ kind: 'swing', ...sw });
      this.onSwing(k, sw);
    } else if (msg.t === 'toss') S.queue.push({ kind: 'toss' });
    else if (msg.t === 'btn') S.queue.push({ kind: 'btn', b: String(msg.b) });
  }

  // à appeler une fois par image : transforme les gestes reçus en entrées de jeu
  frame() {
    for (let k = 0; k < 2; k++) {
      const S = this.slots[k];
      if (!S) { this.cur[k] = null; continue; }
      const inp = emptyInput();
      inp.remote = true; inp.aimYaw = S.aimYaw; inp.power = S.speed;
      const ev = S.queue.shift();     // un geste par image au maximum
      if (ev) {
        if (ev.kind === 'swing') {
          inp.pressed[ev.type] = inp.btn[ev.type] = true;
          inp.lag = ev.lag; inp.power = S.speed = ev.speed; inp.aimYaw = S.aimYaw = ev.aimYaw;
          S.lastSwing = performance.now();
        } else if (ev.kind === 'toss') { inp.toss = true; }
        else if (ev.kind === 'btn') {
          const b = ev.b;
          if (b === 'ok') inp.pressed.top = true;
          else if (b === 'back') inp.pressed.plat = true;
          else if (b === 'start') inp.pressed.start = true;
          else if (b === 'up') inp.my = 1;
          else if (b === 'down') inp.my = -1;
          else if (b === 'left') inp.mx = -1;
          else if (b === 'right') inp.mx = 1;
          else if (b === 'lb') inp.pressed.sideL = true;
          else if (b === 'rb') inp.pressed.sideR = true;
          inp.menuBtn = true;
        }
      }
      this.cur[k] = inp;
    }
  }

  // ajoute le téléphone 1 aux commandes du clavier / de la manette
  mergeInto(inp, k = 0) {
    const r = this.cur[k];
    if (!r) return inp;
    for (const n of Object.keys(r.pressed)) if (r.pressed[n]) { inp.pressed[n] = true; inp.btn[n] = true; }
    if (r.mx) inp.mx = r.mx;
    if (r.my) inp.my = r.my;
    inp.remote = true; inp.aimYaw = r.aimYaw; inp.power = r.power; inp.toss = r.toss;
    if (r.lag != null) inp.lag = r.lag;
    return inp;
  }

  send(k, msg) { const S = this.slots[k]; if (S && S.conn.open) { try { S.conn.send(msg); } catch (e) {} } }
  sendAll(msg) { for (let k = 0; k < 2; k++) this.send(k, msg); }

  // état envoyé aux téléphones (menu / match, service, score)
  setState(k, st) {
    const prev = this.state[k] || {}, key = JSON.stringify(st);
    if (prev.key === key && performance.now() - prev.at < 3000) return;
    this.state[k] = { key, at: performance.now() };
    this.send(k, { t: 'st', ...st });
  }

  tick() {
    for (let k = 0; k < 2; k++) this.send(k, { t: 'ping', ts: performance.now() });
  }
}
