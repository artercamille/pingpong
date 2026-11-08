// Physique de la balle : gravité, frottement de l'air, effet Magnus, rebonds avec effet.
// Unités : mètres, secondes, rad/s. Repère : y vers le haut, filet en z = 0.
// Joueur 0 du côté z > 0, joueur 1 du côté z < 0.

export const TABLE = { L: 2.74, W: 1.525, H: 0.76, halfL: 1.37, halfW: 0.7625 };
export const NET = { H: 0.1525, halfW: 0.915 };
export const BALL_R = 0.02;
export const DT = 1 / 240;

const G = 9.81;
const DRAG = 0.12;        // traînée (par mètre)
const MAGNUS = 0.0052;    // force de Magnus
const SPIN_DECAY = 0.12;  // perte d'effet par seconde
const TABLE_E = 0.89;     // restitution table
const TABLE_GRIP = 0.3;   // accroche de la table (transfert d'effet)
const TOP = TABLE.H + BALL_R;
const NET_TOP = TABLE.H + NET.H;

export const v3 = (x = 0, y = 0, z = 0) => ({ x, y, z });
export const makeBall = () => ({ p: v3(0, 1, 0), v: v3(), w: v3() });
export function copyBall(b) {
  return { p: { ...b.p }, v: { ...b.v }, w: { ...b.w } };
}
export function setBall(dst, src) {
  Object.assign(dst.p, src.p); Object.assign(dst.v, src.v); Object.assign(dst.w, src.w);
}

// Axe de rotation « lift » pour une direction horizontale d : up × d
export function topAxis(dx, dz) { return v3(dz, 0, -dx); }

// Avance la balle d'un pas. Pousse les évènements (table, filet, sol) dans `ev` si fourni.
export function stepBall(b, dt, ev) {
  const { p, v, w } = b;
  const sp = Math.hypot(v.x, v.y, v.z);
  const ax = -DRAG * sp * v.x + MAGNUS * (w.y * v.z - w.z * v.y);
  const ay = -G - DRAG * sp * v.y + MAGNUS * (w.z * v.x - w.x * v.z);
  const az = -DRAG * sp * v.z + MAGNUS * (w.x * v.y - w.y * v.x);
  v.x += ax * dt; v.y += ay * dt; v.z += az * dt;
  const py = p.y, pz = p.z;
  p.x += v.x * dt; p.y += v.y * dt; p.z += v.z * dt;
  const k = 1 - SPIN_DECAY * dt;
  w.x *= k; w.y *= k; w.z *= k;

  // Filet
  if ((pz > 0) !== (p.z > 0) && Math.abs(p.x) < NET.halfW && p.y < NET_TOP + BALL_R && p.y > TABLE.H) {
    if (p.y > NET_TOP - BALL_R * 0.4) {
      // bande du filet : la balle passe en perdant de la vitesse
      v.z *= 0.45; v.x *= 0.7; v.y = Math.abs(v.y) * 0.3 + 0.35;
      ev && ev.push({ type: 'net', cord: true });
    } else {
      p.z = pz;
      v.z = -v.z * 0.12; v.x *= 0.4; v.y *= 0.3;
      w.x *= 0.3; w.y *= 0.3; w.z *= 0.3;
      ev && ev.push({ type: 'net', cord: false });
    }
  }

  // Table
  if (p.y < TOP && py >= TOP - 1e-4 && v.y < 0 && Math.abs(p.x) <= TABLE.halfW && Math.abs(p.z) <= TABLE.halfL) {
    p.y = TOP + (TOP - p.y) * TABLE_E;
    bounceTable(b);
    ev && ev.push({ type: 'table', side: p.z > 0 ? 0 : 1, x: p.x, z: p.z, speed: sp });
  }

  // Sol
  if (p.y < BALL_R) {
    p.y = BALL_R;
    if (v.y < 0) {
      const s = Math.abs(v.y);
      v.y = -v.y * 0.62; v.x *= 0.8; v.z *= 0.8;
      w.x *= 0.5; w.y *= 0.5; w.z *= 0.5;
      ev && ev.push({ type: 'floor', speed: s });
    }
  }
}

function bounceTable(b) {
  const { v, w } = b;
  const R = BALL_R;
  v.y = -v.y * TABLE_E;
  // vitesse du point de contact (bas de la balle) : v + ω × (0,-R,0)
  const vcx = v.x + w.z * R;
  const vcz = v.z - w.x * R;
  const dvx = -TABLE_GRIP * vcx, dvz = -TABLE_GRIP * vcz;
  v.x += dvx; v.z += dvz;
  const k = 3 / (2 * R * R); // sphère creuse
  w.x += -R * dvz * k; w.z += R * dvx * k;
}

// ---------- Solveur de coup ----------
// Trouve la vitesse initiale pour que la balle atterrisse en `target` (x,z) sur la table.
// opts: { pos, target, speed, top, side, serve }
// Renvoie { v, w, ok }.
export function solveShot(opts) {
  const { pos, target } = opts;
  const shooterSide = pos.z > 0 ? 0 : 1;
  let yaw = Math.atan2(target.x - pos.x, target.z - pos.z);
  const D = Math.hypot(target.x - pos.x, target.z - pos.z);
  let best = null;
  const mults = [1, 0.88, 1.15, 0.77, 1.3, 0.68, 1.5, 0.6, 1.75, 0.5];
  for (const m of mults) {
    const speed = opts.speed * m;
    let sol = null;
    for (let it = 0; it < 3; it++) {
      sol = solveVy(opts, yaw, speed, D, shooterSide);
      if (!sol) break;
      // correction latérale
      const dx = Math.sin(yaw), dz = Math.cos(yaw);
      const lx = sol.land.x - pos.x, lz = sol.land.z - pos.z;
      const lat = lx * dz - lz * dx;          // écart latéral obtenu
      const tlx = target.x - pos.x, tlz = target.z - pos.z;
      const tlat = tlx * dz - tlz * dx;       // écart latéral voulu (≈0)
      yaw += Math.atan2(lat - tlat, D) * -1;
    }
    if (sol) {
      best = sol;
      if (sol.clean) return { v: sol.v, w: sol.w, ok: true };
    }
  }
  if (best) return { v: best.v, w: best.w, ok: false };
  // repli : tir en cloche simple
  const dx = Math.sin(yaw), dz = Math.cos(yaw);
  return { v: v3(dx * 4, 2.5, dz * 4), w: v3(), ok: false };
}

function launchState(opts, yaw, speed, vy) {
  const dx = Math.sin(yaw), dz = Math.cos(yaw);
  const ax = topAxis(dx, dz);
  const top = opts.top || 0, side = opts.side || 0;
  return {
    p: { ...opts.pos },
    v: v3(dx * speed, vy, dz * speed),
    w: v3(ax.x * top, side, ax.z * top),
  };
}

// Simule et renvoie le point d'atterrissage (plan de la table) + validité
function probe(opts, yaw, speed, vy, shooterSide) {
  const b = launchState(opts, yaw, speed, vy);
  const dx = Math.sin(yaw), dz = Math.cos(yaw);
  const ev = [];
  let crossings = 0, netHit = false, ownBounce = false;
  for (let t = 0; t < 3; t += DT) {
    const py = b.p.y;
    ev.length = 0;
    stepBall(b, DT, ev);
    for (const e of ev) if (e.type === 'net') netHit = true;
    if (ev.some(e => e.type === 'table')) {
      // rebond réel sur la table
      crossings++;
      const side = b.p.z > 0 ? 0 : 1;
      if (opts.serve && crossings === 1) {
        if (side !== shooterSide) return result(true, false);
        ownBounce = true;
        continue;
      }
      return result(side !== shooterSide && !netHit, true);
    }
    if (py >= TOP && b.p.y < TOP && b.v.y < 0) {
      // traverse le plan de la table hors de la table
      if (opts.serve && crossings === 0) return result(false, false, true);
      return result(false, true);
    }
    if (b.p.y < BALL_R * 2) return result(false, true);
  }
  return result(false, true);

  function result(clean, valid, short) {
    const along = (b.p.x - opts.pos.x) * dx + (b.p.z - opts.pos.z) * dz;
    return {
      dist: opts.serve && !ownBounce && !short ? 99 : (short ? -1 : along),
      land: { x: b.p.x, z: b.p.z }, clean: clean && valid && (!opts.serve || ownBounce), netHit,
    };
  }
}

function solveVy(opts, yaw, speed, D, shooterSide) {
  let lo = opts.serve ? -6.5 : -6, hi = opts.serve ? 1.5 : 8;
  const flo = probe(opts, yaw, speed, lo, shooterSide);
  const fhi = probe(opts, yaw, speed, hi, shooterSide);
  const slo = Math.sign(flo.dist - D), shi = Math.sign(fhi.dist - D);
  if (slo === shi) return null; // pas de solution à cette vitesse
  let mid = null, fm = null;
  for (let i = 0; i < 22; i++) {
    mid = (lo + hi) / 2;
    fm = probe(opts, yaw, speed, mid, shooterSide);
    if (Math.sign(fm.dist - D) === slo) lo = mid; else hi = mid;
  }
  const st = launchState(opts, yaw, speed, mid);
  return { v: st.v, w: st.w, land: fm.land, clean: fm.clean };
}

// Simule une copie de la balle jusqu'à ce que `fn(ball, t, events)` renvoie true.
export function predict(ball, maxT, fn) {
  const b = copyBall(ball);
  const ev = [];
  for (let t = 0; t < maxT; t += DT) {
    ev.length = 0;
    stepBall(b, DT, ev);
    if (fn(b, t + DT, ev)) return { ball: b, t: t + DT };
  }
  return null;
}
