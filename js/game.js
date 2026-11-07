// Logique de match : joueurs, service, échanges, règles, score, synchronisation réseau.
import { TABLE, DT, makeBall, copyBall, setBall, stepBall, solveShot, topAxis, predict } from './physics.js';
import { sfx } from './audio.js';
import { emptyInput, SHOTS } from './input.js';

export const SHOT_LABEL = { top: 'LIFT', plat: 'FRAPPE', coupe: 'COUPÉ', lob: 'LOB' };
export const SERVE_LABEL = { top: 'SERVICE LIFT', plat: 'SERVICE RAPIDE', coupe: 'SERVICE COUPÉ', lob: 'SERVICE LATÉRAL' };
export const PLANE_OFF = 0.38;   // le plan de frappe est 38 cm devant le joueur
export const IDEAL_REL = 0.06;   // délai idéal entre relâchement et contact
export const TIMING = { perfect: 0.05, good: 0.16, lead: 0.75 }; // fenêtres de timing (s)
export const MAX_CHARGE = 0.6;   // temps de charge max (s)
const REACH = 1.05;
const MOVE_SPEED = 4.2;
const RELEASE_WIN = 0.7;
const HAND_Y = 0.9;
const SERVE_Y = 1.06; // hauteur idéale de frappe au service

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

export class Game {
  constructor(o) {
    this.mode = o.mode;               // 'ai' | 'online'
    this.ctrl = o.ctrl;               // ex. ['human','ai'] ou ['human','remote']
    this.me = o.me ?? 0;              // joueur humain local
    this.names = o.names || ['Joueur 1', 'Joueur 2'];
    this.bestOf = o.bestOf || 3;
    this.net = o.net || null;
    this.hooks = o.hooks || {};
    this.ball = makeBall();
    this.players = [0, 1].map(i => this.makePlayer(i));
    this.match = { score: [0, 0], sets: [0, 0], setIdx: 0, firstServer: o.firstServer ?? 0, history: [], over: false, winner: -1 };
    this.state = 'between';
    this.stateT = 1.2;
    this.rally = null;
    this.simTime = 0;
    this.acc = 0;
    this.hitId = 0;
    this.sendT = 0;
    this.inputs = [emptyInput(), emptyInput()];
    this.ai = [null, null];
    this.fx = [];          // évènements visuels pour le rendu
    this.lastHit = null;
    this.rallyCount = 0;
    this.paused = false;
    this.pred = [null, null];   // prévision du point de contact (pour la jauge et l'aide au placement)
    this.stats = [0, 1].map(() => ({ points: 0, winners: 0, errors: 0, aces: 0, smashes: 0, supers: 0, superWins: 0, hits: 0, maxSpeed: 0 }));
    this.run = { p: -1, n: 0 };   // série de points consécutifs
    this.longest = 0;
    this.momentum = [0, 0];
    this.pressure = null;        // { type: 'set' | 'match', p } : balle de set / de match
    this.deficit = [0, 0];       // plus gros retard dans le set en cours
    this.ach = [];               // succès débloqués pendant le match (joueur local)
    this.lastShot = [{}, {}];
    this.predT = 0;
  }

  makePlayer(i) {
    const side = i === 0 ? 1 : -1;
    return {
      i, side, x: 0, z: side * 2.1, vx: 0, vz: 0, netX: 0, netZ: side * 2.1,
      charging: false, chargeType: null, chargeT: 0,
      releaseType: null, releaseT: -99, releasePower: 0,
      aimX: 0, aimY: 0, sideSpin: 0,
      swingT: -1, swingFore: true, swingType: 'top',
    };
  }

  local(i) { return this.ctrl[i] !== 'remote'; }
  power(pl) { return clamp(pl.chargeT / MAX_CHARGE, 0.15, 1); }

  server() {
    if (this.forcedServer !== undefined) return this.forcedServer;
    const m = this.match;
    const first = (m.firstServer + m.setIdx) % 2;
    const tot = m.score[0] + m.score[1];
    const k = tot < 20 ? Math.floor(tot / 2) : tot - 10;
    return (first + k) % 2;
  }

  handPos(i) {
    const pl = this.players[i];
    return { x: pl.x + pl.side * 0.08, y: HAND_Y, z: pl.z - pl.side * 0.17 };
  }

  // ------------------------------------------------------------------ boucle
  update(dt, localInput) {
    if (this.paused) return;
    for (let i = 0; i < 2; i++) {
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

    for (let i = 0; i < 2; i++) {
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
        const pl = this.players[this.me];
        this.net.send({ t: 'pos', i: this.me, x: +pl.x.toFixed(3), z: +pl.z.toFixed(3), c: pl.charging, ct: pl.chargeType });
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
      if (this.state === 'rally' && this.rally && this.local(1 - this.rally.hitter)) this.rallyEvent(e);
    }
    if (this.state === 'rally' && this.rally) {
      this.rally.t += DT;
      const r = 1 - this.rally.hitter;
      if (this.local(r)) {
        if (this.rally.phase === 'inPlay') {
          if (this.rally.pending) this.checkPending(r);
          else this.checkContact(r, prevZ);
        }
        if (this.rally.t > 7) { if (globalThis.__dbg) console.log('TEMPS', JSON.stringify(this.ball), JSON.stringify(this.rally)); this.endPoint(this.rally.hitter, 'Temps'); }
      }
    }
    if (this.state === 'toss') {
      const s = this.server();
      const sp = this.players[s];
      if (this.ctrl[s] === 'human' && this.ball.v.y < 0 && this.ball.p.y <= SERVE_Y) {
        // joueur humain : service toujours parfait, frappé automatiquement au bon moment
        const q0 = sp.serveQueued;
        const type = sp.charging ? sp.chargeType : (q0 ? q0.type : 'top');
        const pw = Math.max(0.5, sp.charging ? this.power(sp) : (q0 ? q0.power : 0.6));
        sp.charging = false; sp.serveQueued = null;
        this.serveHit(s, type, pw, 1, 'SERVICE PARFAIT');
      } else if (this.local(s) && this.ball.v.y < 0 && this.ball.p.y < 0.88) {
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
    for (let i = 0; i < 2; i++) this.pred[i] = null;
    if (this.state === 'toss') {
      const s = this.server();
      const b = this.ball;
      if (b.v.y < 0 && b.p.y <= SERVE_Y) this.pred[s] = { t: this.simTime - (SERVE_Y - b.p.y) / Math.max(0.5, -b.v.y), serve: true };
      else { const r = predict(b, 1.2, bb => bb.v.y < 0 && bb.p.y <= SERVE_Y); if (r) this.pred[s] = { t: this.simTime + r.t, serve: true }; }
      return;
    }
    if (this.state !== 'rally' || !this.rally) return;
    const p = 1 - this.rally.hitter;
    if (this.rally.contactTried) return;
    const pl = this.players[p], s = pl.side;
    const zc = pl.z - s * PLANE_OFF;
    let bounced = this.rally.phase === 'inPlay', bad = false;
    const res = predict(this.ball, 2.5, (b, t, ev) => {
      for (const e of ev) {
        if (e.type === 'floor') { bad = true; return true; }
        if (e.type === 'table' && e.side === p) { if (bounced) { bad = true; return true; } bounced = true; }
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
    const back = (C.x - pl.x) * s < -0.15;
    const idealX = back ? C.x + s * 0.4 : C.x - s * 0.42;
    // balle courte : il faut avancer
    let idealZ = pl.z;
    let b2 = this.rally.phase === 'inPlay';
    const best = predict(this.ball, 2.5, (b, t, ev) => {
      for (const e of ev) if (e.type === 'table' && e.side === p) b2 = true;
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
    let speed = MOVE_SPEED * (pl.charging ? 0.35 : 1);
    if (serving && this.state === 'toss') speed = 0;
    let wx = inp.mx * pl.side * speed, wz = -inp.my * pl.side * speed;
    // aide au placement (joueur humain) : attire doucement vers la bonne position de frappe
    const pr = this.pred[i];
    if (this.ctrl[i] === 'human' && pr && pr.idealX !== undefined && !serving) {
      const stick = Math.hypot(inp.mx, inp.my);
      const pull = stick < 0.25 ? 0.75 : 0.3;
      const dx = pr.idealX - pl.x, dzz = pr.idealZ - pl.z;
      wx += clamp(dx * 6, -1, 1) * MOVE_SPEED * pull;
      wz += clamp(dzz * 6, -1, 1) * MOVE_SPEED * pull * 0.7;
    }
    const k = Math.min(1, dt * 12);
    pl.vx += (wx - pl.vx) * k; pl.vz += (wz - pl.vz) * k;
    pl.x += pl.vx * dt; pl.z += pl.vz * dt;
    pl.x = clamp(pl.x, -2.7, 2.7);
    let d = clamp(pl.z * pl.side, 1.5, 4.2);
    if (serving) { d = clamp(d, 1.55, 1.65); pl.x = clamp(pl.x, -0.85, 0.85); }
    pl.z = d * pl.side;
    if (pl.charging || serving) { pl.aimX = inp.aimX; pl.aimY = inp.aimY; }
    pl.sideSpin = (inp.btn.sideR ? 1 : 0) - (inp.btn.sideL ? 1 : 0);
  }

  handleButtons(i, dt) {
    const pl = this.players[i], inp = this.inputs[i];
    if (inp.pressed.super && this.momentum[i] >= 1 && !pl.superArmed) this.armSuper(i);
    if (this.state === 'serve' && this.server() === i) {
      for (const t of SHOTS) if (inp.pressed[t]) { this.toss(i, t); return; }
      return;
    }
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

  armSuper(i) {
    const pl = this.players[i];
    pl.superArmed = true; this.momentum[i] = 0;
    sfx.superArm && sfx.superArm();
    this.hooks.superArmed && this.hooks.superArmed(i);
    this.net && this.net.send({ t: 'super', i });
  }

  // statistiques après chaque frappe
  onHitStats(p, type, smash, sup, v) {
    const st = this.stats[p];
    st.hits++;
    const kmh = Math.hypot(v.x, v.y, v.z) * 3.6;
    st.maxSpeed = Math.max(st.maxSpeed, kmh);
    if (sup) st.supers++;
    this.lastShot[p] = { type, smash, sup };
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
    const fore = (this.ball.p.x - pl.x) * pl.side >= -0.05;
    this.startSwing(i, fore, pl.chargeType);
    this.net && this.net.send({ t: 'swing', i, fore, type: pl.chargeType });
  }

  startSwing(i, fore, type) {
    const pl = this.players[i];
    pl.swingT = 0; pl.swingFore = fore; pl.swingType = type || 'top';
  }

  // ------------------------------------------------------------------ service
  startServe() {
    this.state = 'serve';
    this.rally = null;
    this.rallyCount = 0;
    const s = this.server();
    for (const pl of this.players) { pl.charging = false; pl.releaseType = null; }
    const sp = this.players[s];
    if (this.local(s)) { sp.x = clamp(sp.x, -0.6, 0.6); sp.z = sp.side * 1.6; }
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
    const shot = this.buildShot(i, type, power, q, true);
    this.ball.v = shot.v; this.ball.w = shot.w;
    this.beginRally(i, true);
    this.superBall = false;
    this.lastShot[i] = { type, serve: true };
    this.startSwing(i, true, type);
    sfx.paddle(power * 0.6);
    this.hooks.feedback && this.hooks.feedback(i, label, q, SERVE_LABEL[type]);
    this.hooks.hit && this.hooks.hit(i, { type, power, aimX: pl.aimX, aimY: pl.aimY, serve: true });
    this.sendHit(i, type, true, label, q);
  }

  beginRally(hitter, serve) {
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

    const dx = (b.x - pl.x) * pl.side;   // > 0 : coup droit
    if (Math.abs(dx) > REACH || b.y < 0.45 || b.y > 2.3) {
      this.hooks.feedback && this.hooks.feedback(p, 'HORS DE PORTÉE', 0);
      pl.releaseType = null;
      return;
    }

    let q, type, power, label;
    if (this.ctrl[p] === 'human') {
      // pas de timing : appuyer suffit, le coup est toujours parfait
      let t = null, pw = 0.6;
      const since0 = this.simTime - pl.releaseT;
      if (pl.charging) { t = pl.chargeType; pw = Math.max(0.55, this.power(pl)); pl.charging = false; this.startSwing(p, dx >= 0, t); }
      else if (pl.releaseType && since0 <= 1.5) { t = pl.releaseType; pw = Math.max(0.55, pl.releasePower); pl.releaseType = null; }
      if (!t) {
        if (!r.pending) { r.pending = this.simTime; r.contactTried = false; return; } // petite marge pour appuyer
        this.hooks.feedback && this.hooks.feedback(p, 'RATÉ', 0);
        return;
      }
      r.pending = 0;
      type = t; power = pw; q = 1; label = 'PARFAIT';
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
      this.hooks.feedback && this.hooks.feedback(p, 'RATÉ', 0);
      return;
    }

    // placement : idéalement la balle à ~42 cm sur le côté
    const off = Math.abs(Math.abs(dx) - 0.42);
    const posQ = 1 - clamp((off - 0.18) / 0.6, 0, 0.55);
    if (posQ < 0.8 && q >= 0.85) label = 'MAL PLACÉ';
    q *= posQ;

    pl.swingFore = dx >= 0;
    pl.contact = { x: b.x, y: b.y, z: b.z, t: this.simTime };
    pl.lastGrade = label;
    const sup = !!pl.superArmed; pl.superArmed = false;
    const shot = this.buildShot(p, type, power, sup ? 1 : q, false, sup);
    this.ball.v = shot.v; this.ball.w = shot.w;
    this.beginRally(p, false);
    this.rallyCount++;
    this.onHitStats(p, type, shot.smash, sup, shot.v);
    sfx.paddle(sup ? 1 : power);
    if (sup) sfx.superHit && sfx.superHit();
    this.fx.push({ type: 'hit', x: b.x, y: b.y, z: b.z, power, smash: shot.smash || sup, sup, p });
    this.superBall = sup;
    this.hooks.feedback && this.hooks.feedback(p, shot.smash ? 'SMASH !' : label, q, SHOT_LABEL[type]);
    this.hooks.hit && this.hooks.hit(p, { type, power, aimX: pl.aimX, aimY: pl.aimY, serve: false });
    this.sendHit(p, type, false, shot.smash ? 'SMASH !' : label, q, sup);
  }

  checkPending(p) {
    const r = this.rally, pl = this.players[p], b = this.ball.p;
    const late = this.simTime - r.pending;
    if (this.ctrl[p] === 'human') {
      if (pl.charging || pl.releaseType) { r.contactTried = false; this.checkContact(p, b.z - pl.side * 1, true); r.pending = 0; return; }
      if (late > 0.2 || b.y < 0.42) { r.contactTried = true; r.pending = 0; this.hooks.feedback && this.hooks.feedback(p, 'RATÉ', 0); }
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

  buildShot(p, type, power, q, serve, sup = false) {
    const pl = this.players[p], s = pl.side, b = this.ball;
    const ax = clamp(pl.aimX, -1, 1), ay = clamp(pl.aimY, -1, 1);
    let tx = ax * 0.6 * s;
    let depth;
    if (serve) depth = 0.8 + ay * 0.33;
    else if (type === 'lob') depth = 1.05 + ay * 0.15;
    else depth = 0.92 + ay * 0.3 - (type === 'coupe' ? 0.08 : 0);
    const e = sup ? 0 : (1 - q) * 1.0 + power * power * (serve ? 0.12 : 0.45) + (serve ? 0 : 0.03);
    tx += gauss() * e * 0.45;
    depth += gauss() * e * 0.4 + e * 0.15 * power;
    const tz = -s * depth;

    let speed, top, side = 0, smash = false;
    if (serve) {
      if (type === 'top') { speed = 3.6 + 1.8 * power; top = 70 + 100 * power; }
      else if (type === 'coupe') { speed = 3.4 + 1.6 * power; top = -(90 + 110 * power); }
      else if (type === 'plat') { speed = 4.6 + 1.8 * power; top = 25; }
      else { speed = 3.8 + 1.2 * power; top = 20; side = (100 + 80 * power) * (pl.sideSpin || 1); }
    } else {
      if (type === 'top') { speed = 5.6 + 5.4 * power; top = 80 + 130 * power; }
      else if (type === 'plat') { speed = 7 + 7 * power; top = 25; if (b.p.y > 1.15) { speed += 4; smash = true; } }
      else if (type === 'coupe') { speed = 4 + 2.4 * power; top = -(60 + 110 * power); }
      else { speed = 3.6 + 1.6 * power; top = 45 + 45 * power; }
    }
    if (sup) { speed += 6; top = Math.abs(top) + 120; }
    if (pl.sideSpin && !(serve && type === 'lob')) side += pl.sideSpin * (70 + 60 * power);
    side *= s;

    const sol = solveShot({ pos: { ...b.p }, target: { x: tx, z: tz }, speed, top, side, serve });
    if (!serve) {
      // l'effet de la balle adverse perturbe le renvoi (coupé → filet, lift → trop long)
      const hv = Math.hypot(b.v.x, b.v.z) || 1;
      const ia = topAxis(b.v.x / hv, b.v.z / hv);
      const incTop = b.w.x * ia.x + b.w.z * ia.z;
      let k = type === 'coupe' ? 0.0005 : type === 'top' ? 0.0008 : 0.0016;
      k *= 1.3 - q;
      sol.v.y += incTop * k;
    }
    sol.v.y += gauss() * e * 0.25;
    return { v: sol.v, w: sol.w, smash };
  }

  // ------------------------------------------------------------------ règles
  rallyEvent(e) {
    const r = this.rally, h = r.hitter, rc = 1 - h;
    if (e.type === 'net') { r.netTouch = true; return; }
    if (e.type === 'table') {
      if (r.phase === 'awaitOwn') {
        if (e.side === h) r.phase = 'awaitOpp'; else this.endPoint(rc, 'Faute de service');
      } else if (r.phase === 'awaitOpp') {
        if (e.side === rc) {
          if (r.serve && r.netTouch) { this.doLet(); return; }
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
    for (const pl of this.players) { pl.charging = false; pl.releaseType = null; }
    const big = this.rallyCount >= 6 || setWon || this.match.over;
    const winnerShot = reason === 'Point gagnant' || reason === 'Ace !';
    sfx.crowd(setWon || this.match.over || this.rallyCount + 1 >= 10 ? 3 : (this.rallyCount + 1 >= 5 || winnerShot) ? 2 : 1);
    this.fx.push({ type: 'cheer', big });
    this.hooks.point && this.hooks.point(winner, reason, setWon, this.rallyCount);
  }

  pointStats(w, reason, before, setWon, prevPressure) {
    const l = 1 - w, me = this.me;
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
    } else if (reason !== 'Temps') st[l].errors++;
    this.longest = Math.max(this.longest, this.rallyCount + 1);
    if (this.run.p === w) this.run.n++; else this.run = { p: w, n: 1 };
    if (this.rallyCount + 1 >= 20) this.addAch('rally20');
    this.momentum[w] = Math.min(1, this.momentum[w] + 0.12);
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
        if (msg.serve) this.lastShot[msg.i] = { type: msg.type, serve: true };
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
