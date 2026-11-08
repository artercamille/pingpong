// Adversaire IA : prévoit la trajectoire, se place, charge et relâche avec une erreur selon le niveau.
import { predict, topAxis } from './physics.js';
import { emptyInput, SHOTS } from './input.js';
import { PLANE_OFF, IDEAL_REL, MAX_CHARGE } from './game.js';

const LEVELS = [
  { name: 'Facile', noise: 0.1, slip: 0.16, react: 0.3, speed: 0.72, power: 0.5, aim: 0.6 },
  { name: 'Normal', noise: 0.06, slip: 0.09, react: 0.18, speed: 0.9, power: 0.68, aim: 0.8 },
  { name: 'Difficile', noise: 0.035, slip: 0.045, react: 0.1, speed: 1, power: 0.82, aim: 0.95 },
  { name: 'Coach', noise: 0.01, slip: 0, react: 0.1, speed: 1, power: 0.32, aim: 0.25 },
];
// styles de jeu : répartition des coups, puissance, prise de risque
export const STYLES = {
  attaquant: { name: 'Attaquant', mix: { top: 0.5, plat: 0.32, coupe: 0.1, lob: 0.08 }, power: 0.12, aim: 1.1, noise: 1.1 },
  defenseur: { name: 'Défenseur', mix: { top: 0.28, plat: 0.04, coupe: 0.38, lob: 0.3 }, power: -0.15, aim: 0.75, noise: 0.8 },
  coupeur: { name: 'Coupeur', mix: { top: 0.2, plat: 0.08, coupe: 0.67, lob: 0.05 }, power: -0.08, aim: 0.9, noise: 0.9 },
  polyvalent: { name: 'Polyvalent', mix: { top: 0.45, plat: 0.15, coupe: 0.3, lob: 0.1 }, power: 0, aim: 0.9, noise: 1 },
};
export const AI_NAMES = ['Kenji Arata', 'Viktor Lindqvist', 'Lucas Moreau', 'Mateo Rivas', 'Anya Petrova', 'Hugo Lambert', 'Felix Brandt', 'Jin-ho Park', 'Omar Haddad', 'Leo Santini'];
const gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 0.577;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class AI {
  constructor(game, i, level = 1) {
    this.g = game; this.i = i; this.L = LEVELS[level];
    const keys = Object.keys(STYLES);
    this.styleId = keys[Math.floor(Math.random() * keys.length)];
    this.style = STYLES[this.styleId];
    this.recent = [];
    this.plan = null; this.planId = -1;
    this.hold = null; this.serveT = 0; this.serveRelY = 0.95;
    this.inp = emptyInput();
  }

  press(t) { this.inp.btn[t] = true; this.inp.pressed[t] = true; this.hold = t; }
  releaseAll() { if (this.hold) { this.inp.btn[this.hold] = false; this.inp.released[this.hold] = true; } this.hold = null; }

  update(dt) {
    const g = this.g, pl = g.players[this.i], s = pl.side, inp = this.inp;
    for (const k of Object.keys(inp.pressed)) { inp.pressed[k] = false; inp.released[k] = false; }
    let tx = 0, tz = s * 2.1, moving = true;

    if (g.state === 'serve' && g.server() === this.i) {
      this.serveT += dt;
      tx = s * 0.25; tz = s * 1.6;
      if (this.serveT > 1.1 && !this.hold) {
        const t = this.L.name === 'Coach' ? 'top' : ['top', 'coupe', 'coupe', 'lob', 'plat'][Math.floor(Math.random() * 5)];
        inp.aimX = (Math.random() * 2 - 1) * this.L.aim;
        inp.aimY = this.L.name === 'Coach' ? 0.3 : (Math.random() * 2 - 1) * 0.7;
        this.serveRelY = 1.06 + gauss() * this.L.noise * 1.5;
        this.serveCharge = 0.3 + Math.random() * 0.4;
        this.press(t);
      }
    } else this.serveT = 0;

    if (g.state === 'toss' && g.server() === this.i) {
      moving = false;
      if (this.hold && g.ball.v.y < 0 && g.ball.p.y < this.serveRelY && pl.chargeT > this.serveCharge * MAX_CHARGE * 0.5) this.releaseAll();
    }

    if (g.state === 'rally' && g.rally) {
      if (g.rally.hitter !== this.i) {
        if (this.planId !== g.rally.id) this.makePlan();
        const p = this.plan;
        if (p) {
          if (g.simTime >= p.startT) { tx = p.px; tz = p.pz; } else { tx = pl.x; tz = pl.z; }
          inp.aimX = p.aimX; inp.aimY = p.aimY;
          if (g.momentum[this.i] >= 1 && !pl.superArmed && this.L.name !== 'Coach' && Math.random() < 0.03) inp.pressed.super = true;
          if (!this.hold && !p.done && g.simTime >= p.tPress) this.press(p.type);
          if (this.hold && g.simTime >= p.tRelease) { this.releaseAll(); p.done = true; }
        }
      } else {
        if (this.hold) this.releaseAll();
        tx = g.ball.p.x * 0.3; tz = s * 2.1;
      }
    } else if (g.state === 'pointEnd' || g.state === 'between') {
      if (this.hold) this.releaseAll();
    }

    if (moving) {
      const dx = tx - pl.x, dzz = tz - pl.z;
      let mx = dx * 3.2 * s, my = -dzz * 3.2 * s;
      const len = Math.hypot(mx, my);
      const max = this.L.speed;
      if (len > max) { mx *= max / len; my *= max / len; }
      if (len < 0.04) { mx = 0; my = 0; }
      inp.mx = mx; inp.my = my;
    } else { inp.mx = 0; inp.my = 0; }
    if (g.state === 'serve' || g.state === 'toss') { /* garder la visée du service */ }
    return inp;
  }

  // vise le côté où l'adversaire fait le plus de fautes (l'IA s'adapte)
  aimWeak() {
    const g = this.g, op = 1 - this.i, e = g.errSide[op];
    const tot = e[0] + e[1];
    const aim = this.L.aim * this.style.aim;
    if (tot >= 3 && Math.random() < 0.6) {
      const weakBack = e[1] > e[0];
      // côté revers de l'adversaire = sa gauche ; vu par l'IA (face à lui), c'est sa droite à elle
      const sgn = weakBack ? 1 : -1;
      return clamp(sgn * (0.5 + Math.random() * 0.5) * aim, -1, 1);
    }
    return clamp((Math.random() * 2 - 1) * aim, -1, 1);
  }

  makePlan() {
    const g = this.g, pl = g.players[this.i], s = pl.side;
    this.planId = g.rally.id; this.plan = null;
    if (this.hold) this.releaseAll();
    let bounced = false, bad = false;
    const res = predict(g.ball, 3, (b, t, ev) => {
      for (const e of ev) {
        if (e.type === 'floor') { bad = true; return true; }
        if (e.type === 'table' && e.side === this.i) { if (bounced) { bad = true; return true; } bounced = true; }
      }
      if (!bounced) return false;
      const depth = s * b.p.z;
      if (b.v.y < 0 && b.p.y < 0.98 && depth > 1.15) return true;
      if (depth > 1.95) return true;
      if (b.v.y < 0 && b.p.y < 0.72) return true;
      return false;
    });
    if (!res || bad || !bounced) return; // balle faute : on laisse
    const C = res.ball.p, tC = g.simTime + res.t;
    const back = C.x * s < -0.4 && Math.random() < 0.7;
    const px = back ? C.x + s * 0.38 : C.x - s * 0.42;
    let pzd = Math.max(1.5, s * C.z + PLANE_OFF);
    // incoming spin
    const hv = Math.hypot(res.ball.v.x, res.ball.v.z) || 1;
    const ia = topAxis(res.ball.v.x / hv, res.ball.v.z / hv);
    const incTop = res.ball.w.x * ia.x + res.ball.w.z * ia.z;
    let type;
    const st = this.style;
    let power = clamp((this.L.power + st.power) * (0.7 + Math.random() * 0.5), 0.2, 1);
    const pick = () => { let r = Math.random(), acc = 0; for (const [k, v] of Object.entries(st.mix)) { acc += v; if (r < acc) return k; } return 'top'; };
    if (C.y > 1.2) { type = 'plat'; power = 0.85; }
    else if (incTop < -60) type = Math.random() < 0.5 ? 'coupe' : 'top';
    else type = pick();
    // changement de rythme : après 3 coups identiques, on varie
    if (this.recent.length >= 3 && this.recent.slice(-3).every(t => t === type)) type = type === 'coupe' ? 'top' : 'coupe';
    this.recent.push(type); if (this.recent.length > 6) this.recent.shift();
    if (type === 'plat' && C.y < 0.95) power *= 0.6;
    if (this.L.name === 'Coach') { type = 'top'; power = 0.3; }
    let tErr = gauss() * this.L.noise * st.noise;
    if (Math.random() < this.L.slip) tErr += (Math.random() < 0.5 ? -1 : 1) * (0.12 + Math.random() * 0.15); // grosse erreur
    const tRelease = tC - IDEAL_REL + tErr;
    const tPress = Math.max(g.simTime + this.L.react * 0.5, tRelease - power * MAX_CHARGE);
    this.plan = {
      px: clamp(px, -2.6, 2.6), pz: s * pzd, tRelease, tPress, type, done: false,
      startT: g.simTime + this.L.react,
      aimX: this.aimWeak(),
      aimY: clamp((Math.random() * 2 - 1) * 0.8, -1, 1),
    };
  }
}
