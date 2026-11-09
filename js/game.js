// Logique de match : joueurs, service, échanges, règles, score, synchronisation réseau.
import { TABLE, DT, makeBall, copyBall, setBall, stepBall, solveShot, topAxis, predict } from './physics.js';
import { sfx } from './audio.js';
import { emptyInput, SHOTS } from './input.js';

export const hasSig = (M, x) => !!M && (M.sig === x || (M.perks && M.perks.includes(x)));
export const SHOT_LABEL = { top: 'LIFT', plat: 'FRAPPE', coupe: 'COUPÉ', lob: 'LOB', flip: 'FLIP', contre: 'CONTRE', bloc: 'BLOC' };
export const RING_T = 0.9;     // le cercle de timing apparaît 0,9 s avant la frappe
// timing à l'appui (cercle) : err > 0 = trop tôt, err < 0 = trop tard
export function gradePress(err, scale = 1) {
  const a = Math.abs(err) / scale;
  if (a <= 0.05) return { q: 1, label: 'PARFAIT', grade: 3 };
  if (a <= 0.11) return { q: 0.82, label: 'BIEN', grade: 2 };
  if (a <= 0.2) return { q: 0.58, label: err > 0 ? 'TÔT' : 'TARD', grade: 1 };
  return { q: 0.32, label: err > 0 ? 'TROP TÔT' : 'TROP TARD', grade: 0 };
}
export const SERVE_LABEL = { top: 'SERVICE LIFT', plat: 'SERVICE RAPIDE', coupe: 'SERVICE COUPÉ', lob: 'SERVICE LATÉRAL' };
export const PLANE_OFF = 0.38;   // le plan de frappe est 38 cm devant le joueur
export const IDEAL_REL = 0.06;   // délai idéal entre relâchement et contact
export const TIMING = { perfect: 0.05, good: 0.16, lead: 0.75 }; // fenêtres de timing (s)
export const MAX_CHARGE = 0.6;   // temps de charge max (s)
const REACH = 1.05;
const MOVE_SPEED = 4.2;
const RELEASE_WIN = 0.7;
const HAND_Y = 0.9;
const SERVE_Y = 0.98; // hauteur idéale de frappe au service

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// err > 0 : relâché trop tôt, err < 0 : trop tard
export function gradeTiming(err) {
  // façon TopSpin : vert = parfait, un peu avant = bon, bien avant = trop tôt (moyen), après le vert = trop tard (le pire)
  if (Math.abs(err) <= TIMING.perfect) return { q: 1, label: 'PARFAIT', grade: 3 };
  if (err > 0 && err <= TIMING.good) return { q: 0.8, label: 'BON', grade: 2 };
  if (err > 0) return { q: 0.55, label: 'TROP TÔT', grade: 1 };
  return { q: 0.28, label: 'TROP TARD', grade: 0 };
}
const gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 0.577;

// ------------------------------------------------------------------ services
// Chaque bouton donne un service vraiment différent : trajectoire basse, rasant le filet.
//  coupé (carré/X)  : court, lent, gros rétro → rebondit deux fois chez l'adversaire s'il ne l'attaque pas
//  lift (croix/A)   : long et lifté, la balle « gicle » après le rebond
//  rapide (rond/B)  : très rapide, long, peu d'effet
//  latéral (tri./Y) : vitesse moyenne, gros effet latéral qui fait dévier la balle
export const SERVE_SPEC = {
  coupe: { v: [4.6, 5.8], spin: -150, depth: [0.55, 0.88], side: 0 },
  top: { v: [6.2, 8.2], spin: 200, depth: [0.98, 1.24], side: 0 },
  plat: { v: [8.4, 10.8], spin: 25, depth: [1.08, 1.28], side: 0 },
  lob: { v: [5.0, 6.4], spin: 50, depth: [0.7, 1.05], side: 240 },
};
const TOPY = TABLE.H + 0.02, NETY = TABLE.H + 0.1525;
function serveLaunch(pos, yaw, vh, vy, top, side) {
  const dx = Math.sin(yaw), dz = Math.cos(yaw), ax = topAxis(dx, dz);
  return { p: { ...pos }, v: { x: dx * vh, y: vy, z: dz * vh }, w: { x: ax.x * top, y: side, z: ax.z * top } };
}
// trace complète : 1er rebond, passage du filet, 2e rebond
function serveTrace(b0, own) {
  const b = copyBall(b0); let maxY = b.p.y, clear = null, bounces = [], prevZ = b.p.z;
  for (let t = 0; t < 2.2 && bounces.length < 2; t += DT) {
    const ev = []; stepBall(b, DT, ev);
    if (bounces.length && (prevZ > 0) !== (b.p.z > 0)) clear = b.p.y - NETY;
    prevZ = b.p.z;
    if (bounces.length) maxY = Math.max(maxY, b.p.y);
    for (const e of ev) { if (e.type === 'net' || e.type === 'floor') return null; if (e.type === 'table') bounces.push({ x: e.x, z: e.z, side: e.side }); }
    if (b.p.y < TOPY - 0.05) return null;
  }
  if (bounces.length < 2 || bounces[0].side !== own || bounces[1].side === own || clear === null) return null;
  // jouable : la balle doit arriver jusqu'au relanceur (bout de table) sans rebondir une 2e fois chez lui
  for (let t = 0; t < 1.5; t += DT) {
    const ev = []; stepBall(b, DT, ev);
    if (ev.some(e => e.type === 'table' || e.type === 'net')) return null;
    if (Math.abs(b.p.z) > 1.22) { if (b.p.y < TABLE.H + 0.06) return null; break; }
  }
  return { b1: bounces[0], b2: bounces[1], maxY, clear };
}
// distance (le long du tir) du premier passage au niveau de la table
function firstCross(b0) {
  const b = copyBall(b0);
  for (let t = 0; t < 1; t += DT) { const py = b.p.y, ev = []; stepBall(b, DT, ev); const tb = ev.find(e => e.type === 'table'); if (tb) return { x: tb.x, z: tb.z }; if (py >= TOPY && b.p.y < TOPY) return b.p; }
  return null;
}
export function planServe({ pos, s, type, q, aimX, aimY, sideSpin = 0, doubles = false, tx = null }) {
  const S = SERVE_SPEC[type] || SERVE_SPEC.top;
  const own = s > 0 ? 0 : 1;
  const ax = clamp(aimX, -1, 1), ay = clamp(aimY, -1, 1);
  const k = 0.35 + 0.65 * q;                                   // qualité du timing
  const vh0 = S.v[0] + (S.v[1] - S.v[0]) * k;
  const top = S.spin * (0.55 + 0.45 * q);
  let side = (S.side * (sideSpin || 1) + (type !== 'lob' ? sideSpin * 110 : 0)) * (0.6 + 0.4 * q) * s;
  const depth = S.depth[0] + (S.depth[1] - S.depth[0]) * (ay + 1) / 2 + gauss() * (1 - q) * 0.12;
  const tz = -s * clamp(depth, 0.28, 1.28);
  let tX = tx !== null ? tx : clamp(ax * 0.58 * s + gauss() * (1 - q) * 0.1, -0.66, 0.66);
  const wantClear = 0.025 + (1 - q) * 0.14;                     // un service raté flotte au-dessus du filet
  let best = null;
  let aimx = tX;
  for (let pass = 0; pass < 3; pass++) {
    const yaw = Math.atan2(aimx - pos.x, tz - pos.z);
    const dx = Math.sin(yaw), dz = Math.cos(yaw);
    let cand = null;
    for (const d1 of [0.14, 0.24, 0.34, 0.46, 0.58, 0.72]) {
      const z1 = s * (TABLE.halfL - d1);
      const D1 = (z1 - pos.z) / dz;                              // distance au 1er rebond
      for (const m of [0.72, 0.82, 0.92, 1, 1.1, 1.22, 1.36]) {
        const vh = vh0 * m;
        let lo = -7, hi = 1.2, b = null;
        for (let it = 0; it < 18; it++) {
          const mid = (lo + hi) / 2, c = firstCross(serveLaunch(pos, yaw, vh, mid, top, side));
          const along = c ? (c.x - pos.x) * dx + (c.z - pos.z) * dz : 99;
          if (along > D1) hi = mid; else lo = mid;
        }
        b = serveLaunch(pos, yaw, vh, (lo + hi) / 2, top, side);
        const tr = serveTrace(b, own);
        if (!tr) continue;
        if (Math.abs(tr.b2.x) > TABLE.halfW - 0.03 || Math.abs(tr.b2.z) > TABLE.halfL - 0.02) continue;
        if (doubles) { const hs = own === 0 ? 1 : -1; if (tr.b1.x * hs < 0.02 || tr.b2.x * -hs < 0.02) continue; }
        const sc = Math.abs(Math.abs(tr.b2.z) - Math.abs(tz)) * 3 + Math.abs(tr.b2.x - tX) * 1.5
          + Math.abs(tr.clear - wantClear) * 6 + Math.max(0, tr.maxY - 1.02) * 12 + Math.abs(m - 1) * 1.5;
        if (!cand || sc < cand.sc) cand = { sc, b, tr };
      }
    }
    if (!cand) break;
    best = !best || cand.sc < best.sc ? cand : best;
    aimx += clamp(tX - cand.tr.b2.x, -0.4, 0.4);                  // corrige la dérive due à l'effet latéral
  }
  return best ? { v: best.b.v, w: best.b.w, tr: best.tr } : null;
}

export class Game {
  constructor(o) {
    this.mode = o.mode;               // 'ai' | 'online'
    this.ctrl = o.ctrl;               // ex. ['human','ai'] ; en double 4 joueurs (0 et 2 contre 1 et 3)
    this.n = this.ctrl.length;
    this.doubles = this.n === 4;
    this.me = o.me ?? 0;              // joueur humain local
    this.myTeam = this.me % 2;
    this.names = o.names || ['Joueur 1', 'Joueur 2'];          // noms des équipes (ou des joueurs en simple)
    this.playerNames = o.playerNames || this.names;
    this.bestOf = o.bestOf || 3;
    this.net = o.net || null;
    this.hooks = o.hooks || {};
    this.ball = makeBall();
    this.players = this.ctrl.map((_, i) => this.makePlayer(i));
    // carrière : stats (0-1) et main forte de chaque joueur
    (o.mods || []).forEach((m, i) => { if (m && this.players[i]) this.players[i].mods = m; });
    (o.hands || []).forEach((h, i) => { if (h && this.players[i]) this.players[i].hand = h; });
    this.order = [0, 1];
    this.match = { score: [0, 0], sets: [0, 0], setIdx: 0, firstServer: o.firstServer ?? 0, history: [], over: false, winner: -1 };
    this.state = 'between';
    this.stateT = 1.2;
    this.rally = null;
    this.simTime = 0;
    this.acc = 0;
    this.hitId = 0;
    this.sendT = 0;
    this.inputs = this.ctrl.map(() => emptyInput());
    this.ai = this.ctrl.map(() => null);
    this.fx = [];          // évènements visuels pour le rendu
    this.lastHit = null;
    this.rallyCount = 0;
    this.paused = false;
    this.assist = o.assist ?? 1;          // 0 aucune, 1 légère, 2 forte
    this.training = o.training || null;   // entraînement avec robot lanceur
    this.train = { ok: 0, total: 0, streak: 0, best: 0 };
    this.errSide = [[0, 0], [0, 0]];      // erreurs [coup droit, revers] par joueur (l'IA s'en sert)
    this.pred = this.ctrl.map(() => null);   // prévision du point de contact (pour la jauge et l'aide au placement)
    this.stats = [0, 1].map(() => ({ points: 0, winners: 0, errors: 0, aces: 0, smashes: 0, supers: 0, superWins: 0, hits: 0, maxSpeed: 0 }));
    this.run = { p: -1, n: 0 };   // série de points consécutifs
    this.longest = 0;
    this.momentum = this.ctrl.map(() => 0);
    this.pressure = null;        // { type: 'set' | 'match', p } : balle de set / de match
    this.deficit = [0, 0];       // plus gros retard dans le set en cours
    this.ach = [];               // succès débloqués pendant le match (joueur local)
    this.lastShot = [{}, {}];
    this.predT = 0;
  }

  makePlayer(i) {
    const side = i % 2 === 0 ? 1 : -1;
    const x0 = this.doubles ? side * (i < 2 ? 0.55 : -0.55) : 0;
    return {
      i, side, hand: 1, mods: null, x: x0, z: side * 2.1, vx: 0, vz: 0, netX: x0, netZ: side * 2.1,
      charging: false, chargeType: null, chargeT: 0,
      releaseType: null, releaseT: -99, releasePower: 0,
      aimX: 0, aimY: 0, sideSpin: 0,
      swingT: -1, swingFore: true, swingType: 'top',
    };
  }

  local(i) { return this.ctrl[i] !== 'remote'; }
  team(i) { return i % 2; }
  partner(i) { return this.doubles ? (i + 2) % 4 : i; }
  // ordre des frappes : serveur, relanceur, partenaire du serveur, partenaire du relanceur
  computeOrder(s) {
    const r = this.receiverOf(s);
    return this.doubles ? [s, r, (s + 2) % 4, (r + 2) % 4] : [s, r];
  }
  nextHitter() {
    if (!this.rally) return -1;
    const k = this.order.indexOf(this.rally.hitter);
    return this.order[(k + 1) % this.order.length];
  }
  receiverOf(s) {
    if (!this.doubles) return 1 - s;
    // ordre tournant : A1→B1, B1→A2, A2→B2, B2→A1
    const T = this.firstTeam();
    const cyc = [T, 1 - T, T + 2, (1 - T) + 2];
    return cyc[(cyc.indexOf(s) + 1) % 4];
  }
  firstTeam() { const m = this.match; return (m.firstServer + m.setIdx) % 2; }
  power(pl) { return clamp(pl.chargeT / MAX_CHARGE, 0.15, 1); }

  server() {
    if (this.forcedServer !== undefined) return this.forcedServer;
    const m = this.match;
    const first = this.firstTeam();
    const tot = m.score[0] + m.score[1];
    const k = tot < 20 ? Math.floor(tot / 2) : tot - 10;
    if (!this.doubles) return (first + k) % 2;
    const cyc = [first, 1 - first, first + 2, (1 - first) + 2];
    return cyc[k % 4];
  }

  handPos(i) {
    const pl = this.players[i];
    return { x: pl.x + pl.side * pl.hand * 0.08, y: HAND_Y, z: pl.z - pl.side * 0.17 };
  }

  // ------------------------------------------------------------------ boucle
  update(dt, localInput) {
    if (this.paused) return;
    for (let i = 0; i < this.n; i++) {
      if (this.ctrl[i] === 'human') this.inputs[i] = localInput;
      else if (this.ctrl[i] === 'ai' && this.ai[i]) this.inputs[i] = this.ai[i].update(dt);
    }

    if (this.state === 'between') {
      this.stateT -= dt;
      if (this.stateT <= 0) this.startServe();
    } else if (this.state === 'pointEnd') {
      this.stateT -= dt;
      if (this.stateT <= 0) {
        if (this.match.over) { this.state = 'over'; this.hooks.over && this.hooks.over(this.match); }
        else this.startServe();
      }
    }

    this.predT -= dt;
    if (this.predT <= 0) { this.predT = 0.05; this.refreshPredictions(); }

    for (let i = 0; i < this.n; i++) {
      const pl = this.players[i];
      if (this.local(i)) { this.movePlayer(i, dt); this.handleButtons(i, dt); }
      else {
        const k = Math.min(1, dt * 14);
        pl.x += (pl.netX - pl.x) * k; pl.z += (pl.netZ - pl.z) * k;
        if (pl.charging) pl.chargeT += dt;
      }
      if (pl.swingT >= 0) { pl.swingT += dt; if (pl.swingT > 0.42) pl.swingT = -1; }
    }

    if (this.state === 'serve') {
      Object.assign(this.ball.p, this.handPos(this.server()));
      this.ball.v.x = this.ball.v.y = this.ball.v.z = 0;
    } else if (this.state !== 'over') {
      this.acc += dt;
      let n = 0;
      while (this.acc >= DT && n < 40) { this.physStep(); this.acc -= DT; n++; }
      if (n >= 40) this.acc = 0;
    }

    if (this.net) {
      this.sendT -= dt;
      if (this.sendT <= 0) {
        this.sendT = 1 / 30;
        for (let i = 0; i < this.n; i++) {
          if (!this.local(i)) continue;
          const pl = this.players[i];
          this.net.send({ t: 'pos', i, x: +pl.x.toFixed(3), z: +pl.z.toFixed(3), c: pl.charging, ct: pl.chargeType });
        }
      }
    }
  }

  physStep() {
    const ev = [];
    const prevZ = this.ball.p.z;
    stepBall(this.ball, DT, ev);
    this.simTime += DT;
    for (const e of ev) {
      if (e.type === 'table') { sfx.table(e.speed); this.fx.push({ type: 'bounce', x: e.x, z: e.z }); }
      else if (e.type === 'net') sfx.net();
      else if (e.type === 'floor' && e.speed > 0.8) sfx.floor();
      if (this.state === 'rally' && this.rally && this.local(this.nextHitter())) this.rallyEvent(e);
    }
    if (this.state === 'rally' && this.rally) {
      this.rally.t += DT;
      const r = this.nextHitter();
      if (this.local(r) && this.ctrl[r] !== 'robot') {
        if (this.rally.phase === 'inPlay') {
          if (this.rally.pending) this.checkPending(r);
          else this.checkContact(r, prevZ);
        }
        if (this.rally.t > 7) { if (globalThis.__dbg) console.log('TEMPS', JSON.stringify(this.ball), JSON.stringify(this.rally)); this.endPoint(this.team(this.rally.hitter), 'Temps'); }
      }
    }
    if (this.state === 'toss') {
      const s = this.server();
      const sp = this.players[s];
      if (this.local(s) && this.ball.v.y < 0 && this.ball.p.y < 0.88) {
        const pl = this.players[s];
        const type = pl.charging ? pl.chargeType : 'top';
        const pw = pl.charging ? this.power(pl) : 0.35;
        pl.charging = false;
        this.serveHit(s, type, pw, 0.3, 'SERVICE RATÉ');
      }
    }
  }

  // ------------------------------------------------------------------ prévision
  refreshPredictions() {
    if (this.state === 'rally' && this.rally && this.rally.pending) return; // jauge figée pendant un coup en retard
    for (let i = 0; i < this.n; i++) this.pred[i] = null;
    if (this.state === 'toss') {
      const s = this.server();
      const b = this.ball;
      if (b.v.y < 0 && b.p.y <= SERVE_Y) this.pred[s] = { t: this.simTime - (SERVE_Y - b.p.y) / Math.max(0.5, -b.v.y), serve: true };
      else { const r = predict(b, 1.2, bb => bb.v.y < 0 && bb.p.y <= SERVE_Y); if (r) this.pred[s] = { t: this.simTime + r.t, serve: true }; }
      return;
    }
    if (this.state !== 'rally' || !this.rally) return;
    const p = this.nextHitter();
    if (this.rally.contactTried) return;
    const pt = this.team(p);
    const pl = this.players[p], s = pl.side;
    const zc = pl.z - s * PLANE_OFF;
    let bounced = this.rally.phase === 'inPlay', bad = false;
    const res = predict(this.ball, 2.5, (b, t, ev) => {
      for (const e of ev) {
        if (e.type === 'floor') { bad = true; return true; }
        if (e.type === 'table' && e.side === pt) { if (bounced) { bad = true; return true; } bounced = true; }
      }
      if (!bounced) return false;
      const ahead = s * (zc - b.p.z);
      if (ahead <= 0) return true;
      if (b.v.y < 0 && b.p.y < 0.66 && ahead < 0.55) return true;
      return false;
    });
    if (!res || bad) return;
    // point de frappe idéal : on recalcule où il faudrait se placer
    const C = res.ball.p;
    const sh = s * pl.hand;
    const back = (C.x - pl.x) * sh < -0.15;
    const idealX = back ? C.x + sh * 0.4 : C.x - sh * 0.42;
    // balle courte : il faut avancer
    let idealZ = pl.z;
    let b2 = this.rally.phase === 'inPlay';
    const best = predict(this.ball, 2.5, (b, t, ev) => {
      for (const e of ev) if (e.type === 'table' && e.side === pt) b2 = true;
      if (!b2) return false;
      return (b.v.y < 0 && b.p.y < 0.95) || s * b.p.z > 1.9;
    });
    if (best && s * best.ball.p.z < s * C.z - 0.05) idealZ = s * clamp(s * best.ball.p.z + PLANE_OFF, 1.5, 4.2);
    this.pred[p] = { t: this.simTime + res.t, x: C.x, y: C.y, z: C.z, idealX, idealZ };
  }

  // ------------------------------------------------------------------ joueurs
  movePlayer(i, dt) {
    const pl = this.players[i], inp = this.inputs[i];
    const serving = (this.state === 'serve' || this.state === 'toss') && this.server() === i;
    const M = pl.mods;
    let speed = MOVE_SPEED * (pl.charging ? 0.35 : 1) * (M ? 0.85 + 0.3 * M.speed + (hasSig(M, 'sprinter') ? 0.2 : 0) : 1);
    if (serving && (this.state === 'toss' || this.ctrl[i] === 'human')) speed = 0;
    let wx = inp.mx * pl.side * speed, wz = -inp.my * pl.side * speed;
    // aide au placement (joueur humain) : attire doucement vers la bonne position de frappe
    const pr = this.pred[i];
    // en double : quand ce n'est pas à toi de frapper, tu te décales pour laisser ton partenaire
    if (this.ctrl[i] === 'human' && this.doubles && !serving && this.state === 'rally' && this.nextHitter() !== i && Math.hypot(inp.mx, inp.my) < 0.25) {
      const w = this.waitSpot(i);
      wx += clamp((w.x - pl.x) * 4, -1, 1) * MOVE_SPEED * 0.6;
      wz += clamp((w.z - pl.z) * 4, -1, 1) * MOVE_SPEED * 0.6;
    }
    if (this.ctrl[i] === 'human' && pr && pr.idealX !== undefined && !serving) {
      const stick = Math.hypot(inp.mx, inp.my);
      const A = [[0, 0], [0.35, 0.12], [0.75, 0.3]][this.assist] || [0.35, 0.12];
      let pull = stick < 0.25 ? A[0] : A[1];
      // quand le cercle de timing est là, le stick sert à viser : le placement se fait tout seul
      if (this.assist > 0 && pr.t - this.simTime < RING_T + 0.1) { wx = 0; wz = 0; pull = this.assist === 2 ? 0.85 : 0.6; }
      const dx = pr.idealX - pl.x, dzz = pr.idealZ - pl.z;
      wx += clamp(dx * 6, -1, 1) * MOVE_SPEED * pull;
      wz += clamp(dzz * 6, -1, 1) * MOVE_SPEED * pull * 0.7;
    }
    const k = Math.min(1, dt * 12);
    pl.vx += (wx - pl.vx) * k; pl.vz += (wz - pl.vz) * k;
    pl.x += pl.vx * dt; pl.z += pl.vz * dt;
    pl.x = clamp(pl.x, -2.7, 2.7);
    let d = clamp(pl.z * pl.side, 1.5, 4.2);
    if (serving) {
      d = clamp(d, 1.55, 1.65);
      // en double, on sert depuis sa moitié droite
      pl.x = this.doubles ? pl.side * clamp(pl.x * pl.side, 0.15, 0.8) : clamp(pl.x, -0.85, 0.85);
    }
    pl.z = d * pl.side;
    if (pl.charging || serving || this.ctrl[i] === 'human') { pl.aimX = inp.aimX; pl.aimY = inp.aimY; }
    pl.sideSpin = (inp.btn.sideR ? 1 : 0) - (inp.btn.sideL ? 1 : 0);
  }

  // place d'attente en double : en retrait, du côté opposé au partenaire
  waitSpot(i) {
    const pl = this.players[i], mate = this.players[this.partner(i)];
    const x = clamp(-mate.x * 0.8 + (mate.x === 0 ? pl.side * 0.6 : 0), -1.6, 1.6);
    return { x: Math.abs(x - mate.x) < 0.7 ? mate.x + (x >= mate.x ? 0.7 : -0.7) : x, z: pl.side * 2.7 };
  }

  handleButtons(i, dt) {
    const pl = this.players[i], inp = this.inputs[i];
    if (inp.pressed.super && this.momentum[i] >= 1 && !pl.superArmed) this.armSuper(i);
    if (this.state === 'serve' && this.server() === i) {
      for (const t of SHOTS) if (inp.pressed[t]) { this.toss(i, t); return; }
      return;
    }
    if (this.ctrl[i] === 'human') { this.humanPress(i); return; }
    if (this.state === 'over' || this.state === 'between') { pl.charging = false; return; }
    if (!pl.charging) {
      for (const t of SHOTS) if (inp.pressed[t]) {
        pl.charging = true; pl.chargeType = t; pl.chargeT = 0; break;
      }
    } else {
      pl.chargeT += dt;
      if (!inp.btn[pl.chargeType]) this.release(i);
    }
  }

  // joueur humain : un appui = un coup, jugé par le cercle de timing
  humanPress(i) {
    const pl = this.players[i], inp = this.inputs[i];
    if (pl.swingAt && this.simTime >= pl.swingAt) { pl.swingAt = 0; this.startSwing(i, pl.pressFore, pl.pressType); }
    let t = null;
    for (const k of SHOTS) if (inp.pressed[k]) { t = k; break; }
    if (!t) return;
    if (this.state === 'toss' && this.server() === i) {
      // 2e appui pendant le lancer : frappe du service
      const b = this.ball;
      let err;
      if (b.v.y < 0 && b.p.y <= SERVE_Y) err = -(SERVE_Y - b.p.y) / Math.max(0.5, -b.v.y);
      else { const r = predict(b, 1.2, bb => bb.v.y < 0 && bb.p.y <= SERVE_Y); err = r ? r.t : 0.5; }
      if (err > RING_T) return;
      const g = gradePress(err, this.pressScale(i));
      this.lastPress = { i, grade: g.grade, label: g.label, t: this.simTime };
      this.serveHit(i, pl.chargeType || t, 0.4 + 0.4 * g.q, g.q, g.grade === 3 ? 'SERVICE PARFAIT' : 'SERVICE ' + g.label);
      pl.charging = false;
      return;
    }
    if (this.state !== 'rally' || !this.rally || this.nextHitter() !== i || pl.pressType) return;
    const pr = this.pred[i];
    if (this.rally.pending) { pl.pressType = t; pl.pressT = this.simTime; pl.pressErr = null; return; }
    if (!pr || pr.serve) return;
    const err = pr.t - this.simTime;
    if (err > RING_T) return; // le cercle n'est pas encore là : on ignore
    pl.pressType = t; pl.pressT = this.simTime; pl.pressErr = err;
    pl.pressFore = (pr.x - pl.x) * pl.side * pl.hand >= -0.05;
    { const gp = gradePress(err, this.pressScale(i)); this.lastPress = { i, grade: gp.grade, label: gp.label, t: this.simTime }; }
    if (err > 0.1) pl.swingAt = pr.t - 0.08; else this.startSwing(i, pl.pressFore, t);
    this.net && this.net.send({ t: 'swing', i, fore: pl.pressFore, type: t });
  }

  // mental : sur les balles décisives, la fenêtre de timing dépend du mental
  pressScale(i) {
    const M = this.players[i].mods;
    if (!M) return 1;
    const c = M.conf || 1;
    if (!this.pressure) return c;
    if (hasSig(M, 'roc')) return c * Math.max(1.05, 0.75 + 0.5 * M.mental);
    return c * (0.75 + 0.5 * M.mental);
  }

  armSuper(i) {
    const pl = this.players[i];
    pl.superArmed = true; this.momentum[i] = 0;
    sfx.superArm && sfx.superArm();
    this.hooks.superArmed && this.hooks.superArmed(i);
    this.net && this.net.send({ t: 'super', i });
  }

  // statistiques après chaque frappe
  onHitStats(p, type, smash, sup, v) {
    const tm = this.team(p);
    const st = this.stats[tm];
    st.hits++;
    const kmh = Math.hypot(v.x, v.y, v.z) * 3.6;
    st.maxSpeed = Math.max(st.maxSpeed, kmh);
    if (sup) st.supers++;
    this.lastShot[tm] = { type, smash, sup, p };
    if (!sup) this.momentum[p] = Math.min(1, this.momentum[p] + (smash ? 0.12 : 0.07));
    if (p === this.me && kmh > 70) this.addAch('speed70');
  }

  addAch(id) { if (!this.ach.includes(id)) { this.ach.push(id); this.hooks.ach && this.hooks.ach(id); } }

  release(i) {
    const pl = this.players[i];
    const power = this.power(pl);
    pl.charging = false;
    if (this.state === 'toss' && this.server() === i) {
      if (this.ctrl[i] === 'human') { pl.serveQueued = { type: pl.chargeType, power }; return; }
      this.serveRelease(i, pl.chargeType, power); return;
    }
    pl.releaseType = pl.chargeType; pl.releasePower = power; pl.releaseT = this.simTime;
    // le timing est jugé par rapport à la jauge affichée au moment du relâchement
    const pr = this.pred[i];
    pl.releaseErr = pr && !pr.serve ? (pr.t - IDEAL_REL) - this.simTime : null;
    const fore = (this.ball.p.x - pl.x) * pl.side * pl.hand >= -0.05;
    this.startSwing(i, fore, pl.chargeType);
    this.net && this.net.send({ t: 'swing', i, fore, type: pl.chargeType });
  }

  startSwing(i, fore, type) {
    const pl = this.players[i];
    pl.swingT = 0; pl.swingFore = fore; pl.swingType = type || 'top';
  }

  // ------------------------------------------------------------------ service
  startServe() {
    this.rally = null;
    this.rallyCount = 0;
    if (this.training) {
      for (const pl of this.players) { pl.charging = false; pl.releaseType = null; pl.pressType = null; }
      this.robotFeed();
      return;
    }
    this.state = 'serve';
    const s = this.server();
    for (const pl of this.players) { pl.charging = false; pl.releaseType = null; }
    const sp = this.players[s];
    if (this.local(s)) { sp.x = this.doubles ? sp.side * clamp(Math.abs(sp.x), 0.25, 0.6) : clamp(sp.x, -0.6, 0.6); sp.z = sp.side * 1.6; }
    this.hooks.serve && this.hooks.serve(s);
  }

  toss(i, type) {
    const pl = this.players[i];
    setBall(this.ball, { p: this.handPos(i), v: { x: 0, y: 2.4, z: 0 }, w: { x: 0, y: 0, z: 0 } });
    this.state = 'toss';
    pl.charging = true; pl.chargeType = type; pl.chargeT = 0;
    sfx.toss();
    this.net && this.net.send({ t: 'toss', i, b: copyBall(this.ball), type });
  }

  serveRelease(i, type, power) {
    const b = this.ball;
    let q, label;
    // temps restant avant que la balle redescende à 1 m (moment idéal)
    let err;
    if (b.v.y < 0 && b.p.y <= SERVE_Y) err = -(SERVE_Y - b.p.y) / Math.max(0.5, -b.v.y);
    else { const r = predict(b, 1.2, bb => bb.v.y < 0 && bb.p.y <= SERVE_Y); err = r ? r.t : 0.5; }
    const g = gradeTiming(err);
    q = g.q; label = g.grade === 3 ? 'SERVICE PARFAIT' : g.grade === 2 ? 'BON SERVICE' : 'SERVICE ' + g.label;
    this.serveHit(i, type, power, q, label);
  }

  serveHit(i, type, power, q, label) {
    const pl = this.players[i];
    let shot = null;
    // service planifié : trajectoire rasante propre à chaque bouton
    const M = pl.mods;
    const qq = clamp(q * (M ? 0.8 + 0.4 * M.serve : 1), 0, 1);
    const dtx = this.doubles ? -pl.side * clamp(0.38 - pl.aimX * 0.2, 0.15, 0.62) : null;
    const ss = (pl.sideSpin || 0) + (hasSig(M, 'fantome') ? (Math.random() < 0.5 ? 1 : -1) : 0);
    let plan = null;
    for (const [ka, kq] of [[1, qq], [0.5, Math.max(qq, 0.6)], [0, 1]]) {
      plan = planServe({ pos: { ...this.ball.p }, s: pl.side, type, q: kq, aimX: pl.aimX * ka, aimY: pl.aimY * ka, sideSpin: ss * ka, doubles: this.doubles, tx: dtx });
      if (plan) break;
    }
    if (plan) shot = { v: plan.v, w: plan.w };
    // le service est toujours bon : seule sa qualité varie (vitesse, effet, précision)
    for (let k = 0; k < 6 && !shot; k++) {
      const qq = k < 3 ? q : 1, pw = k < 4 ? power : 0.3;
      const c = this.buildShot(i, type, pw, qq, true);
      if (this.serveOk(i, c)) shot = c;
    }
    if (!shot) {
      const ax = pl.aimX, ay = pl.aimY; pl.aimX = 0; pl.aimY = 0;
      for (const t of [type, 'top', 'coupe']) { const c = this.buildShot(i, t, 0.25, 1, true); if (this.serveOk(i, c)) { shot = c; break; } }
      pl.aimX = ax; pl.aimY = ay;
      if (!shot) shot = this.buildShot(i, 'top', 0.25, 1, true);
    }
    this.ball.v = shot.v; this.ball.w = shot.w;
    this.beginRally(i, true);
    this.superBall = false;
    this.lastShot[this.team(i)] = { type, serve: true, p: i };
    this.startSwing(i, true, type);
    sfx.paddle(power * 0.6);
    this.hooks.feedback && this.hooks.feedback(i, label, q, SERVE_LABEL[type]);
    this.hooks.hit && this.hooks.hit(i, { type, power, aimX: pl.aimX, aimY: pl.aimY, serve: true });
    this.sendHit(i, type, true, label, q);
  }

  // simule le service : 1er rebond chez le serveur, 2e chez le relanceur, sans filet
  serveOk(i, shot) {
    const b = copyBall(this.ball); b.v = { ...shot.v }; b.w = { ...shot.w };
    const own = this.players[i].z > 0 ? 0 : 1;
    const bounces = [];
    for (let t = 0; t < 2.5 && bounces.length < 2; t += DT) {
      const ev = []; stepBall(b, DT, ev);
      for (const e of ev) {
        if (e.type === 'net') return false;
        if (e.type === 'floor') return false;
        if (e.type === 'table') bounces.push(e);
      }
    }
    if (bounces.length < 2) return false;
    const [a, c] = bounces;
    if (a.side !== own || c.side === own) return false;
    if (this.doubles) { const hs = own === 0 ? 1 : -1; if (a.x * hs < -0.01 || c.x * -hs < -0.01) return false; }
    return true;
  }

  beginRally(hitter, serve) {
    if (serve || !this.order.includes(hitter)) this.order = this.computeOrder(hitter);
    this.state = 'rally';
    this.rally = { hitter, serve, phase: serve ? 'awaitOwn' : 'awaitOpp', netTouch: false, contactTried: false, id: ++this.hitId, t: 0 };
    this.lastHit = { p: hitter, time: this.simTime };
    this.pred = [null, null]; this.predT = 0;
  }

  sendHit(i, type, serve, label, q, sup = false) {
    if (!this.net) return;
    const pl = this.players[i];
    this.net.send({ t: 'hit', i, b: copyBall(this.ball), type, serve, label, q, fore: pl.swingFore, id: this.hitId, sup, smash: label === 'SMASH !' });
  }

  // ------------------------------------------------------------------ frappe
  checkContact(p, prevZ, forced) {
    const r = this.rally;
    if (r.contactTried) return;
    const pl = this.players[p], b = this.ball.p;
    const zc = pl.z - pl.side * PLANE_OFF;
    const ahead = pl.side * (zc - b.z);           // distance de la balle devant le plan
    let contact = forced || (pl.side * (prevZ - zc) < 0 && ahead <= 0);
    if (!contact && this.ball.v.y < 0 && b.y < 0.66 && ahead < 0.55 && ahead > -0.1) contact = true;
    if (!contact) return;
    r.contactTried = true;

    const dx = (b.x - pl.x) * pl.side * pl.hand;   // > 0 : coup droit
    const M = pl.mods;
    const reach = REACH * (M ? 0.9 + 0.2 * M.speed + (hasSig(M, 'sprinter') ? 0.15 : 0) : 1);
    if (Math.abs(dx) > reach || b.y < 0.45 || b.y > 2.3) {
      this.hooks.feedback && this.hooks.feedback(p, 'HORS DE PORTÉE', 0);
      pl.releaseType = null;
      return;
    }

    let q, type, power, label;
    if (this.ctrl[p] === 'human') {
      if (!pl.pressType) {
        if (!r.pending) { r.pending = this.simTime; r.contactTried = false; return; } // petite marge pour appuyer en retard
        this.missed(p, dx);
        return;
      }
      const err = pl.pressErr != null ? pl.pressErr : -(this.simTime - r.pending);
      const g = gradePress(err, this.pressScale(p));
      if (pl.pressErr == null) { this.lastPress = { i: p, grade: g.grade, label: g.label, t: this.simTime }; this.startSwing(p, dx >= 0, pl.pressType); }
      type = pl.pressType; q = g.q; label = g.label; power = 0.4 + 0.45 * g.q;
      // rythme : les coups parfaits enchaînés rendent tes frappes plus rapides et plus précises
      pl.flow = g.grade === 3 ? Math.min(6, (pl.flow || 0) + 1) : 0;
      if (pl.flow >= 2) { power = Math.min(1, power + 0.04 * pl.flow); label = g.grade === 3 ? `PARFAIT x${pl.flow}` : label; }
      pl.pressType = null; pl.swingAt = 0; r.pending = 0;
    } else if (pl.charging && !r.pending) {
      // le joueur charge encore : on attend qu'il relâche (coup en retard)
      r.pending = this.simTime; r.contactTried = false;
      return;
    }
    const since = this.simTime - pl.releaseT;
    if (this.ctrl[p] === 'human') { /* coup humain déjà réglé */ } else if (r.pending && pl.releaseType) {
      // relâché après le passage de la balle
      const late = this.simTime - r.pending;
      const g = gradeTiming(-(late + IDEAL_REL));
      type = pl.releaseType; power = pl.releasePower; q = g.q; label = g.label;
      pl.releaseType = null;
    } else if (pl.releaseType && since >= 0 && since <= RELEASE_WIN) {
      type = pl.releaseType; power = pl.releasePower;
      const g = gradeTiming(pl.releaseErr != null ? pl.releaseErr : since - IDEAL_REL);
      q = g.q; label = g.label;
      pl.releaseType = null;
    } else if (pl.releaseType && since > RELEASE_WIN && since < 2) {
      type = pl.releaseType; power = pl.releasePower; q = 0.25; label = 'TROP TÔT';
      pl.releaseType = null;
    } else if (pl.charging) {
      type = pl.chargeType; power = this.power(pl); q = 0.3; label = 'TROP TARD';
      pl.charging = false;
      this.startSwing(p, dx >= 0, type);
    } else {
      this.missed(p, dx);
      return;
    }

    // placement : idéalement la balle à ~42 cm sur le côté
    const off = Math.abs(Math.abs(dx) - 0.42);
    const posQ = 1 - clamp((off - 0.18) / 0.6, 0, 0.55);
    if (posQ < 0.8 && q >= 0.85) label = 'MAL PLACÉ';
    q *= posQ;

    pl.swingFore = dx >= 0;
    pl.lastSide = dx >= 0 ? 0 : 1;
    pl.contact = { x: b.x, y: b.y, z: b.z, t: this.simTime };
    pl.lastGrade = label;
    const sup = !!pl.superArmed; pl.superArmed = false;
    const shot = this.buildShot(p, type, power, sup ? 1 : q, false, sup);
    if (shot.variant) type = shot.variant;
    this.ball.v = shot.v; this.ball.w = shot.w;
    this.beginRally(p, false);
    this.rallyCount++;
    this.onHitStats(p, type, shot.smash, sup, shot.v);
    sfx.paddle(sup ? 1 : power);
    if (sup) sfx.superHit && sfx.superHit();
    this.fx.push({ type: 'hit', x: b.x, y: b.y, z: b.z, power, smash: shot.smash || sup, sup, p });
    this.superBall = sup;
    this.hooks.feedback && this.hooks.feedback(p, shot.smash ? 'SMASH !' : label, q, SHOT_LABEL[type]);
    this.hooks.hit && this.hooks.hit(p, { type, power, aimX: pl.aimX, aimY: pl.aimY, serve: false, sup });
    this.sendHit(p, type, false, shot.smash ? 'SMASH !' : label, q, sup);
  }

  missed(p, dx) {
    const pl = this.players[p];
    pl.pressType = null; pl.swingAt = 0;
    this.errSide[this.team(p)][dx >= 0 ? 0 : 1]++;
    this.lastPress = { i: p, grade: -1, label: 'RATÉ', t: this.simTime };
    this.hooks.feedback && this.hooks.feedback(p, 'RATÉ', 0);
  }

  checkPending(p) {
    const r = this.rally, pl = this.players[p], b = this.ball.p;
    const late = this.simTime - r.pending;
    if (this.ctrl[p] === 'human') {
      if (pl.pressType) { r.contactTried = false; this.checkContact(p, b.z - pl.side * 1, true); r.pending = 0; return; }
      if (late > 0.2 || b.y < 0.42) { r.contactTried = true; r.pending = 0; this.missed(p, (b.x - pl.x) * pl.side * pl.hand); }
      return;
    }
    const behind = pl.side * (b.z - (pl.z - pl.side * PLANE_OFF));
    const lost = late > 0.24 || b.y < 0.42 || behind > 0.5;
    if (!pl.charging || lost) {
      if (lost && pl.charging) { pl.charging = false; pl.releaseType = null; }
      if (lost && !pl.releaseType) { r.contactTried = true; r.pending = 0; this.forceLate(p); return; }
      r.contactTried = false;
      this.checkContact(p, b.z - pl.side * 1, true);
      r.pending = 0;
    }
  }

  forceLate(p) {
    // trop tard : coup de dépannage très imprécis
    const pl = this.players[p], b = this.ball.p;
    if (b.y < 0.42) { this.hooks.feedback && this.hooks.feedback(p, 'TROP TARD', 0); return; }
    const type = pl.chargeType || 'top';
    this.rally.contactTried = false;
    pl.releaseType = type; pl.releasePower = this.power(pl); pl.releaseT = this.simTime + 10; // force la branche "en retard"
    this.rally.pending = this.simTime - 0.3;
    this.checkContact(p, b.z - pl.side * 1, true);
    this.rally.pending = 0;
  }

  buildShot(p, type, power, q, serve, sup = false, target = null) {
    const pl = this.players[p], s = pl.side, b = this.ball;
    const ax = clamp(pl.aimX, -1, 1), ay = clamp(pl.aimY, -1, 1);
    let tx = ax * (serve ? 0.6 : 0.7) * s;
    let depth;
    if (serve) depth = 0.8 + ay * 0.33;
    else if (type === 'lob') depth = 1.05 + ay * 0.15;
    else depth = 0.9 + ay * 0.38 - (type === 'coupe' ? 0.08 : 0);
    if (target) { tx = target.x; depth = -s * target.z; }
    // service en double : en diagonale, vers la moitié droite du relanceur
    if (serve && this.doubles) tx = -s * clamp(0.38 + ax * 0.2 * -1, 0.15, 0.62);

    let speed, top, side = 0, smash = false, variant = null, eMul = 1, kMul = 1;
    // balle adverse : vitesse et effet (pour les coups « de contexte »)
    const hv0 = Math.hypot(b.v.x, b.v.z) || 1;
    const ia0 = topAxis(b.v.x / hv0, b.v.z / hv0);
    const inTop = b.w.x * ia0.x + b.w.z * ia0.z;
    const inSpeed = Math.hypot(b.v.x, b.v.y, b.v.z);
    const overTable = Math.abs(b.p.z) < 1.45;
    if (!serve && !target) {
      if (type === 'top' && overTable && b.p.y < 1.05) variant = 'flip';
      else if (type === 'plat' && inSpeed > 5.2 && inTop > 30 && b.p.y < 1.15) variant = 'contre';
      else if (type === 'coupe' && inSpeed > 5.2 && inTop > 30) variant = 'bloc';
    }
    if (serve) {
      if (type === 'top') { speed = 3.2 + 1.6 * power; top = 70 + 100 * power; }
      else if (type === 'coupe') { speed = 3.0 + 1.4 * power; top = -(90 + 110 * power); }
      else if (type === 'plat') { speed = 4.0 + 1.6 * power; top = 25; }
      else { speed = 3.4 + 1.0 * power; top = 20; side = (100 + 80 * power) * (pl.sideSpin || 1); }
    } else if (variant === 'flip') { speed = 4.2 + 2.6 * power; top = 90; depth = Math.min(depth, 0.85); eMul = 0.7; }
    else if (variant === 'contre') { speed = clamp(inSpeed * 0.9 + 1.8, 7, 15); top = 60; eMul = 1.25; }
    else if (variant === 'bloc') { speed = clamp(inSpeed * 0.55 + 1.2, 3.5, 8); top = 20; eMul = 0.55; kMul = 0.25; }
    else {
      if (type === 'top') { speed = 5.3 + 5.6 * power; top = 110 + 170 * power; }
      else if (type === 'plat') { speed = 6.6 + 7 * power; top = 30; if (b.p.y > 1.15) { speed += 4; smash = true; } }
      else if (type === 'coupe') { speed = 3.8 + 2.2 * power; top = -(80 + 120 * power); }
      else { speed = 3.2 + 1.4 * power; top = 45 + 45 * power; }
    }
    // carrière : stats et coups signature
    const M = pl.mods;
    if (M) {
      top *= 0.8 + 0.4 * M.spin;
      if (serve) speed *= 0.92 + 0.16 * M.serve;
      if (hasSig(M, 'canon') && pl.swingFore && (type === 'plat' || type === 'top') && !variant) speed += 2;
      if (hasSig(M, 'tornade') && type === 'top') top *= 1.5;
      if (hasSig(M, 'magicien') && type === 'coupe') top *= 1.6;
      if (hasSig(M, 'fantome') && serve) side += 220 * (Math.random() < 0.5 ? 1 : -1);
      if (hasSig(M, 'eclair') && variant === 'contre') speed += 3;
      if (hasSig(M, 'sniper')) { eMul *= 0.6; tx *= 1.12; }
      if (hasSig(M, 'mur') && (variant === 'bloc' || type === 'coupe' || type === 'lob')) eMul *= 0.4;
      if (hasSig(M, 'feinte') && !serve && Math.random() < 0.35) tx = -tx;
      const sideQ = serve ? M.serve : (pl.swingFore ? M.fh : M.bh);
      eMul *= 1.45 - 0.85 * sideQ;
    }
    if (sup) { speed += 5; top = Math.abs(top) + 120; }
    // l'échange s'emballe : chaque frappe va un peu plus vite (jusqu'à +22 %)
    if (!serve && !target) speed *= 1 + Math.min(0.15, (this.rallyCount || 0) * 0.012);
    if (pl.flow >= 2 && !serve) { speed *= 1 + 0.03 * pl.flow; top *= 1 + 0.04 * pl.flow; eMul *= 1 - 0.06 * pl.flow; }
    if (pl.sideSpin && !(serve && type === 'lob')) side += pl.sideSpin * (70 + 60 * power);
    side *= s;

    // imprécision : timing raté + puissance
    const e = sup || target ? 0 : ((1 - q) * 1.0 + power * power * (serve ? 0.12 : 0.4) + (serve ? 0 : 0.03)) * eMul;
    tx += gauss() * e * (serve ? 0.25 : 0.45);
    depth += gauss() * e * (serve ? 0.2 : 0.4) + e * 0.15 * power;
    if (serve) { tx = clamp(tx, -0.66, 0.66); depth = clamp(depth, 0.3, 1.25); }
    const tz = -s * depth;

    const sol = solveShot({ pos: { ...b.p }, target: { x: tx, z: tz }, speed, top, side, serve });
    if (!serve && !target) {
      // l'effet de la balle adverse perturbe le renvoi (coupé → filet, lift → trop long)
      const tt = variant || type;
      let k = tt === 'coupe' ? 0.0005 : tt === 'top' || tt === 'flip' ? 0.0008 : 0.0016;
      k *= (1.3 - q) * kMul;
      sol.v.y += inTop * k;
    }
    if (!serve) sol.v.y += gauss() * e * 0.25;
    return { v: sol.v, w: sol.w, smash, variant };
  }

  // ------------------------------------------------------------------ entraînement : robot lanceur
  robotFeed() {
    const cfg = this.training;
    const rob = this.players[1];
    const type = cfg.type === 'mix' ? ['top', 'coupe', 'top', 'plat'][Math.floor(Math.random() * 4)] : cfg.type;
    const zone = cfg.zone === 'rand' ? (Math.random() < 0.5 ? 'fh' : 'bh') : cfg.zone;
    const x = (zone === 'fh' ? 0.42 : -0.42) + (Math.random() - 0.5) * 0.2;
    setBall(this.ball, { p: { x: (Math.random() - 0.5) * 0.4, y: 1.0, z: -1.55 }, v: { x: 0, y: 0, z: 0 }, w: { x: 0, y: 0, z: 0 } });
    rob.aimX = 0; rob.aimY = 0; rob.sideSpin = 0;
    const pw = [0.2, 0.5, 0.85][cfg.speed];
    const shot = this.buildShot(1, type, pw, 1, false, false, { x, z: 0.85 + Math.random() * 0.3 });
    this.ball.v = shot.v; this.ball.w = shot.w;
    this.beginRally(1, false);
    this.superBall = false;
    sfx.paddle(0.4);
  }

  // ------------------------------------------------------------------ règles
  rallyEvent(e) {
    const r = this.rally, h = this.team(r.hitter), rc = 1 - h;
    const hs = h === 0 ? 1 : -1;
    if (e.type === 'net') { r.netTouch = true; return; }
    if (e.type === 'table') {
      if (r.phase === 'awaitOwn') {
        // en double, le service part de la moitié droite du serveur
        if (e.side === h && (!this.doubles || e.x * hs >= -0.01)) r.phase = 'awaitOpp'; else this.endPoint(rc, 'Faute de service');
      } else if (r.phase === 'awaitOpp') {
        if (r.serve && this.doubles && e.side === rc && e.x * -hs < -0.01) { this.endPoint(rc, 'Faute de service'); return; }
        if (e.side === rc) {
          if (r.serve && r.netTouch) { this.doLet(); return; }
          const tg = this.training && this.training.target;
          if (tg && h === 0) {
            const ok = Math.hypot(e.x - tg.x, e.z - tg.z) <= tg.r;
            this.hooks.target && this.hooks.target(ok, e);
            if (!ok) { this.endPoint(rc, 'Hors cible'); return; }
          }
          r.phase = 'inPlay';
        } else this.endPoint(rc, r.netTouch ? 'Dans le filet' : 'Faute');
      } else if (r.phase === 'inPlay') {
        this.endPoint(h, 'Double rebond');
      }
    } else if (e.type === 'floor') {
      if (r.phase === 'inPlay') this.endPoint(h, this.rallyCount === 0 && r.serve ? 'Ace !' : 'Point gagnant');
      else this.endPoint(rc, r.netTouch ? 'Dans le filet' : 'Dehors');
    }
  }

  endPoint(winner, reason) {
    if (this.state !== 'rally') return;
    this.applyPoint(winner, reason);
    this.net && this.net.send({ t: 'point', w: winner, reason, m: JSON.parse(JSON.stringify(this.match)) });
  }

  applyPoint(winner, reason, snapshot) {
    if (this.training) {
      const T = this.train, ok = winner === 0;
      T.total++; if (ok) { T.ok++; T.streak++; T.best = Math.max(T.best, T.streak); } else T.streak = 0;
      this.state = 'pointEnd'; this.stateT = 0.55;
      for (const pl of this.players) { pl.pressType = null; pl.swingAt = 0; }
      this.hooks.train && this.hooks.train(ok, T);
      return;
    }
    const m = this.match;
    let setWon = false;
    const before = [...m.score];
    const prevPressure = this.pressure;
    if (snapshot) {
      setWon = snapshot.setIdx !== m.setIdx;
      this.match = snapshot;
    } else {
      m.score[winner]++;
      const [a, b] = m.score;
      if ((a >= 11 || b >= 11) && Math.abs(a - b) >= 2) {
        m.sets[winner]++; m.history.push([a, b]); m.score = [0, 0]; m.setIdx++; setWon = true;
        if (m.sets[winner] > Math.floor(this.bestOf / 2)) { m.over = true; m.winner = winner; }
      }
    }
    this.pointStats(winner, reason, before, setWon, prevPressure);
    this.state = 'pointEnd';
    this.stateT = this.match.over ? 2.6 : setWon ? 3 : 1.9;
    for (const pl of this.players) { pl.charging = false; pl.releaseType = null; pl.pressType = null; pl.swingAt = 0; }
    const big = this.rallyCount >= 6 || setWon || this.match.over;
    const winnerShot = reason === 'Point gagnant' || reason === 'Ace !';
    sfx.crowd(setWon || this.match.over || this.rallyCount + 1 >= 10 ? 3 : (this.rallyCount + 1 >= 5 || winnerShot) ? 2 : 1);
    this.fx.push({ type: 'cheer', big });
    this.hooks.point && this.hooks.point(winner, reason, setWon, this.rallyCount);
  }

  pointStats(w, reason, before, setWon, prevPressure) {
    const l = 1 - w, me = this.myTeam;
    const st = this.stats;
    st[w].points++;
    const winnerShot = reason === 'Point gagnant' || reason === 'Ace !' || reason === 'Double rebond';
    if (winnerShot) {
      st[w].winners++;
      const ls = this.lastShot[w] || {};
      if (reason === 'Ace !') st[w].aces++;
      if (ls.smash) st[w].smashes++;
      if (ls.sup) st[w].superWins++;
      if (w === me) {
        if (reason === 'Ace !') this.addAch('ace');
        if (ls.smash) this.addAch('smash');
        if (ls.type === 'lob' && !ls.serve) this.addAch('lob');
        if (ls.sup) this.addAch('super');
      }
      const lp = this.players[this.rally && this.team(this.nextHitter()) === l ? this.nextHitter() : l];
      this.errSide[l][(this.ball.p.x - lp.x) * lp.side * lp.hand >= 0 ? 0 : 1]++;
    } else if (reason !== 'Temps') { st[l].errors++; const lp = this.players[this.lastHit && this.team(this.lastHit.p) === l ? this.lastHit.p : l]; this.errSide[l][lp.lastSide || 0]++; }
    this.longest = Math.max(this.longest, this.rallyCount + 1);
    if (this.run.p === w) this.run.n++; else this.run = { p: w, n: 1 };
    if (this.rallyCount + 1 >= 20) this.addAch('rally20');
    for (let i = 0; i < this.n; i++) if (this.team(i) === w) this.momentum[i] = Math.min(1, this.momentum[i] + 0.12);
    // balle de match sauvée
    if (prevPressure && prevPressure.type === 'match' && prevPressure.p !== w && w === me) this.addAch('save_mp');
    // retard max dans le set
    const sc = before.slice(); sc[w]++;
    for (const p of [0, 1]) this.deficit[p] = Math.max(this.deficit[p], sc[1 - p] - sc[p]);
    if (setWon) {
      if (w === me && sc[l] === 0) this.addAch('perfect_set');
      if (w === me && this.deficit[me] >= 5) this.addAch('comeback');
      this.deficit = [0, 0];
    }
    // balle de set / de match ?
    this.pressure = null;
    const m = this.match;
    if (!m.over) {
      const need = Math.floor(this.bestOf / 2) + 1;
      for (const p of [0, 1]) {
        const a = m.score[p], b = m.score[1 - p];
        if (a >= 10 && a > b) this.pressure = { type: m.sets[p] === need - 1 ? 'match' : 'set', p };
      }
    }
  }

  summary() {
    return { stats: this.stats, longest: this.longest, ach: this.ach };
  }

  doLet() {
    if (this.state !== 'rally') return;
    this.state = 'pointEnd'; this.stateT = 1.5;
    this.hooks.message && this.hooks.message('LET');
    this.net && this.net.send({ t: 'let' });
  }

  // ------------------------------------------------------------------ réseau
  onNet(msg) {
    const pl = msg.i !== undefined ? this.players[msg.i] : null;
    switch (msg.t) {
      case 'pos':
        if (this.local(msg.i)) return;
        pl.netX = msg.x; pl.netZ = msg.z;
        if (msg.c && !pl.charging) pl.chargeT = 0;
        pl.charging = msg.c; pl.chargeType = msg.ct;
        break;
      case 'super':
        this.players[msg.i].superArmed = true; this.momentum[msg.i] = 0;
        break;
      case 'swing':
        this.startSwing(msg.i, msg.fore, msg.type);
        break;
      case 'toss':
        if (this.state !== 'serve' && this.state !== 'between' && this.state !== 'pointEnd') break;
        setBall(this.ball, msg.b);
        this.state = 'toss';
        pl.charging = true; pl.chargeType = msg.type; pl.chargeT = 0;
        sfx.toss();
        break;
      case 'hit': {
        setBall(this.ball, msg.b);
        this.hitId = msg.id;
        this.beginRally(msg.i, msg.serve);
        if (!msg.serve) this.rallyCount++;
        pl.charging = false;
        this.superBall = !!msg.sup;
        if (msg.serve) this.lastShot[this.team(msg.i)] = { type: msg.type, serve: true, p: msg.i };
        else {
          this.onHitStats(msg.i, msg.type, !!msg.smash, !!msg.sup, msg.b.v);
          if (msg.sup) this.momentum[msg.i] = 0;
          this.fx.push({ type: 'hit', x: msg.b.p.x, y: msg.b.p.y, z: msg.b.p.z, power: 0.6, smash: msg.smash || msg.sup, sup: msg.sup, p: msg.i });
        }
        this.startSwing(msg.i, msg.fore, msg.type);
        sfx.paddle(0.6);
        this.hooks.feedback && this.hooks.feedback(msg.i, msg.label, msg.q, (msg.serve ? SERVE_LABEL : SHOT_LABEL)[msg.type]);
        // rattrape la latence : on avance la balle de la moitié du ping
        const rtt = this.net ? this.net.rtt : 0;
        const n = clamp(Math.round(rtt / 2000 / DT), 0, 36);
        for (let k = 0; k < n && this.state === 'rally'; k++) this.physStep();
        this.acc = 0;
        break;
      }
      case 'point':
        this.applyPoint(msg.w, msg.reason, msg.m);
        break;
      case 'let':
        this.state = 'pointEnd'; this.stateT = 1.5;
        this.hooks.message && this.hooks.message('LET');
        break;
    }
  }
}
