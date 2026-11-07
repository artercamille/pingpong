// Logique de match : joueurs, service, échanges, règles, score, synchronisation réseau.
import { TABLE, DT, makeBall, copyBall, setBall, stepBall, solveShot, topAxis } from './physics.js';
import { sfx } from './audio.js';
import { emptyInput, SHOTS } from './input.js';

export const SHOT_LABEL = { top: 'LIFT', plat: 'FRAPPE', coupe: 'COUPÉ', lob: 'LOB' };
export const SERVE_LABEL = { top: 'SERVICE LIFT', plat: 'SERVICE RAPIDE', coupe: 'SERVICE COUPÉ', lob: 'SERVICE LATÉRAL' };
export const PLANE_OFF = 0.38;   // le plan de frappe est 38 cm devant le joueur
export const IDEAL_REL = 0.12;   // délai idéal entre relâchement et contact
export const MAX_CHARGE = 0.8;   // temps de charge max (s)
const REACH = 1.05;
const MOVE_SPEED = 4.2;
const RELEASE_WIN = 0.45;
const HAND_Y = 0.9;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
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
    const m = this.match;
    const first = (m.firstServer + m.setIdx) % 2;
    const tot = m.score[0] + m.score[1];
    const k = tot < 20 ? Math.floor(tot / 2) : tot - 10;
    return (first + k) % 2;
  }

  handPos(i) {
    const pl = this.players[i];
    return { x: pl.x + pl.side * 0.18, y: HAND_Y, z: pl.z - pl.side * 0.15 };
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
        if (this.rally.phase === 'inPlay') this.checkContact(r, prevZ);
        if (this.rally.t > 7) this.endPoint(this.rally.hitter, 'Temps');
      }
    }
    if (this.state === 'toss') {
      const s = this.server();
      if (this.local(s) && this.ball.v.y < 0 && this.ball.p.y < 0.9) {
        const pl = this.players[s];
        const type = pl.charging ? pl.chargeType : 'top';
        const pw = pl.charging ? this.power(pl) : 0.35;
        pl.charging = false;
        this.serveHit(s, type, pw, 0.3, 'SERVICE RATÉ');
      }
    }
  }

  // ------------------------------------------------------------------ joueurs
  movePlayer(i, dt) {
    const pl = this.players[i], inp = this.inputs[i];
    const serving = (this.state === 'serve' || this.state === 'toss') && this.server() === i;
    let speed = MOVE_SPEED * (pl.charging ? 0.35 : 1);
    if (serving && this.state === 'toss') speed = 0;
    const wx = inp.mx * pl.side * speed, wz = -inp.my * pl.side * speed;
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

  release(i) {
    const pl = this.players[i];
    const power = this.power(pl);
    pl.charging = false;
    if (this.state === 'toss' && this.server() === i) { this.serveRelease(i, pl.chargeType, power); return; }
    pl.releaseType = pl.chargeType; pl.releasePower = power; pl.releaseT = this.simTime;
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
    if (b.v.y < 0) {
      const off = Math.abs(b.p.y - 1.0);
      q = 1 - clamp((off - 0.07) / 0.25, 0, 0.7);
      label = q > 0.92 ? 'SERVICE PARFAIT' : q > 0.7 ? 'BON SERVICE' : 'SERVICE MOYEN';
    } else { q = 0.55; label = 'SERVICE PRÉCIPITÉ'; }
    this.serveHit(i, type, power, q, label);
  }

  serveHit(i, type, power, q, label) {
    const pl = this.players[i];
    const shot = this.buildShot(i, type, power, q, true);
    this.ball.v = shot.v; this.ball.w = shot.w;
    this.beginRally(i, true);
    this.startSwing(i, true, type);
    sfx.paddle(power * 0.6);
    this.hooks.feedback && this.hooks.feedback(i, label, q, SERVE_LABEL[type]);
    this.sendHit(i, type, true, label, q);
  }

  beginRally(hitter, serve) {
    this.state = 'rally';
    this.rally = { hitter, serve, phase: serve ? 'awaitOwn' : 'awaitOpp', netTouch: false, contactTried: false, id: ++this.hitId, t: 0 };
    this.lastHit = { p: hitter, time: this.simTime };
  }

  sendHit(i, type, serve, label, q) {
    if (!this.net) return;
    const pl = this.players[i];
    this.net.send({ t: 'hit', i, b: copyBall(this.ball), type, serve, label, q, fore: pl.swingFore, id: this.hitId });
  }

  // ------------------------------------------------------------------ frappe
  checkContact(p, prevZ) {
    const r = this.rally;
    if (r.contactTried) return;
    const pl = this.players[p], b = this.ball.p;
    const zc = pl.z - pl.side * PLANE_OFF;
    const ahead = pl.side * (zc - b.z);           // distance de la balle devant le plan
    let contact = pl.side * (prevZ - zc) < 0 && ahead <= 0;
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
    const since = this.simTime - pl.releaseT;
    if (pl.releaseType && since >= 0 && since <= RELEASE_WIN) {
      type = pl.releaseType; power = pl.releasePower;
      const err = since - IDEAL_REL, a = Math.abs(err);
      if (a < 0.045) { q = 1; label = 'PARFAIT'; }
      else if (a < 0.1) { q = 0.85 - (a - 0.045) * 3; label = err < 0 ? 'UN PEU TARD' : 'UN PEU TÔT'; }
      else { q = Math.max(0.2, 0.68 - (a - 0.1) * 1.4); label = err < 0 ? 'TARD' : 'TÔT'; }
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
    const shot = this.buildShot(p, type, power, q, false);
    this.ball.v = shot.v; this.ball.w = shot.w;
    this.beginRally(p, false);
    this.rallyCount++;
    sfx.paddle(power);
    this.fx.push({ type: 'hit', x: b.x, y: b.y, z: b.z, power, smash: shot.smash });
    this.hooks.feedback && this.hooks.feedback(p, shot.smash ? 'SMASH !' : label, q, SHOT_LABEL[type]);
    this.sendHit(p, type, false, shot.smash ? 'SMASH !' : label, q);
  }

  buildShot(p, type, power, q, serve) {
    const pl = this.players[p], s = pl.side, b = this.ball;
    const ax = clamp(pl.aimX, -1, 1), ay = clamp(pl.aimY, -1, 1);
    let tx = ax * 0.6 * s;
    let depth;
    if (serve) depth = 0.8 + ay * 0.33;
    else if (type === 'lob') depth = 1.05 + ay * 0.15;
    else depth = 0.92 + ay * 0.3 - (type === 'coupe' ? 0.08 : 0);
    const e = (1 - q) * 1.0 + power * power * (serve ? 0.12 : 0.45) + (serve ? 0 : 0.03);
    tx += gauss() * e * 0.45;
    depth += gauss() * e * 0.4 + e * 0.15 * power;
    const tz = -s * depth;

    let speed, top, side = 0, smash = false;
    if (serve) {
      if (type === 'top') { speed = 4 + 2.6 * power; top = 80 + 120 * power; }
      else if (type === 'coupe') { speed = 3.8 + 2.2 * power; top = -(100 + 130 * power); }
      else if (type === 'plat') { speed = 5.5 + 2.5 * power; top = 30; }
      else { speed = 4.2 + 1.5 * power; top = 20; side = (110 + 90 * power) * (pl.sideSpin || 1); }
    } else {
      if (type === 'top') { speed = 7.5 + 8.5 * power; top = 90 + 160 * power; }
      else if (type === 'plat') { speed = 10 + 11 * power; top = 25; if (b.p.y > 1.15) { speed += 5; smash = true; } }
      else if (type === 'coupe') { speed = 4.8 + 3.5 * power; top = -(70 + 130 * power); }
      else { speed = 4.2 + 2.2 * power; top = 50 + 50 * power; }
    }
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
    this.state = 'pointEnd';
    this.stateT = this.match.over ? 2.6 : setWon ? 3 : 1.9;
    for (const pl of this.players) { pl.charging = false; pl.releaseType = null; }
    const big = this.rallyCount >= 6 || setWon || this.match.over;
    sfx.applause(big ? 1.4 : 0.8);
    this.fx.push({ type: 'cheer', big });
    this.hooks.point && this.hooks.point(winner, reason, setWon, this.rallyCount);
  }

  doLet() {
    if (this.state !== 'rally') return;
    this.state = 'pointEnd'; this.stateT = 1.5;
    this.hooks.message && this.hooks.message('LET — on rejoue le service');
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
        this.hooks.message && this.hooks.message('LET — on rejoue le service');
        break;
    }
  }
}
