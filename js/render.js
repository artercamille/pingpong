// Rendu 3D : arène style circuit pro (sombre, néons violets), raquettes seules (vue à la 1re personne).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { paintFloor } from './floors.js';
import { TABLE, NET, BALL_R, topAxis } from './physics.js';
import { IDEAL_REL } from './game.js';
import { arenaKit, hideKits } from './arenas.js';

const NEON = 0xd23cff;          // violet néon
const PURPLE = 0x7a3fd6;        // pieds de table
const COURT = { hx: 4.2, hz: 7.5 };
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function noiseFill(g, w, h, base, amount) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  const img = g.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * amount; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
}
function logo(g, x, y, size, rot = 0, alpha = 1) {
  // logo maison : balle + texte
  g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha = alpha;
  g.fillStyle = '#fff'; g.strokeStyle = '#fff';
  g.lineWidth = size * 0.07;
  g.beginPath(); g.arc(-size * 1.9, 0, size * 0.42, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(-size * 1.9, 0, size * 0.14, 0, Math.PI * 2); g.fill();
  g.font = `italic 900 ${size}px Arial Black, Arial`; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText('PINGPONG', -size * 1.3, size * 0.05);
  g.restore();
}

// ------------------------------------------------------------------ raquette
function buildPaddle(rubber) {
  const g = new THREE.Group();
  g.userData = {};
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, 0.076, 0.082, 0, Math.PI * 2, false, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.0025, bevelEnabled: true, bevelThickness: 0.0008, bevelSize: 0.0012, bevelSegments: 2, curveSegments: 48 });
  const front = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: rubber, roughness: 0.6, sheen: 0.5, sheenColor: 0xffffff, emissive: 0x000000 }));
  g.userData.front = front.material;
  front.position.set(0, 0.115, 0.0008);
  const back = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0x0b0b0b, roughness: 0.65, sheen: 0.4 }));
  back.position.set(0, 0.115, -0.0043);
  const wood = new THREE.Mesh(new THREE.CylinderGeometry(0.0775, 0.0775, 0.0045, 48), new THREE.MeshStandardMaterial({ color: 0xd8b07a, roughness: 0.7 }));
  wood.rotation.x = Math.PI / 2; wood.position.set(0, 0.115, -0.0005); wood.scale.set(1, 1, 1.07);
  const hm = new THREE.MeshPhysicalMaterial({ color: 0x2a1c14, roughness: 0.4, clearcoat: 0.6 });
  const handle = new THREE.Mesh(new THREE.CapsuleGeometry(0.0125, 0.075, 4, 12), hm);
  handle.scale.set(1.05, 1, 0.85);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.017, 0.012, 16), new THREE.MeshStandardMaterial({ color: NEON, emissive: NEON, emissiveIntensity: 0.6 }));
  g.userData.cap = cap.material;
  cap.position.y = -0.048;
  const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.012), hm); shoulder.position.y = 0.04;
  for (const o of [front, back, wood, handle, cap, shoulder]) { o.castShadow = true; g.add(o); }
  return g;
}

class PaddleRig {
  constructor(scene, rubber) {
    this.obj = buildPaddle(rubber);
    scene.add(this.obj);
    this.hand = V(0.3, 1.0, 0.3);
    this.twist = 0; this.tilt = 0.25; this.out = 0.6;
  }

  // repère local joueur (x = sa droite, z = vers le filet) -> monde
  toWorld(pl, v) { return V(pl.x + pl.side * (pl.hand || 1) * v.x, v.y, pl.z - pl.side * v.z); }

  setColor(hex, metal) {
    const m = this.obj.userData.front;
    m.color.setHex(hex); m.metalness = metal ? 0.85 : 0; m.roughness = metal ? 0.25 : 0.6;
  }

  update(dt, pl, game, i) {
    // super coup prêt : la raquette s'illumine
    const m = this.obj.userData.front;
    const glow = pl.superArmed ? 0.5 + 0.5 * Math.sin(performance.now() / 70) : 0;
    m.emissive.setHex(0xff7a1a); m.emissiveIntensity = glow * 1.4;
    const t = this.target(pl, game, i);
    const k = Math.min(1, dt * (pl.swingT >= 0 ? 55 : 14));
    this.hand.lerp(t.hand, k);
    this.tilt = lerp(this.tilt, t.tilt, Math.min(1, dt * 18));
    this.out = lerp(this.out, t.out, Math.min(1, dt * 14));
    const p = this.toWorld(pl, this.hand);
    // axe du manche : vers le haut et vers l'extérieur
    const upL = V(this.out * 0.75, 0.55, 0.12).normalize();
    const up = V(pl.side * (pl.hand || 1) * upL.x, upL.y, -pl.side * upL.z).normalize();
    const fwdL = V(0, 0, 1).applyAxisAngle(V(1, 0, 0), -this.tilt);
    const fwd = V(pl.side * fwdL.x, fwdL.y, -pl.side * fwdL.z);
    const n = fwd.addScaledVector(up, -fwd.dot(up)).normalize();
    const x = V().crossVectors(up, n).normalize();
    this.obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, up, n));
    this.obj.position.copy(p).addScaledVector(up, -0.03);
  }

  target(pl, game, i) {
    const pr = game.pred[i];
    const cy = THREE.MathUtils.clamp(pr && pr.y ? pr.y : 0.98, 0.8, 1.5);
    const ready = { hand: V(0.32, 0.98, 0.42), tilt: 0.25, out: 0.55 };
    const ballSide = (game.ball.p.x - pl.x) * pl.side * (pl.hand || 1) >= -0.05;
    const poses = (fore, type) => {
      const dy = type === 'top' ? -0.16 : type === 'coupe' ? 0.14 : type === 'lob' ? -0.22 : 0;
      const tilt = type === 'top' ? 0.55 : type === 'coupe' ? -0.8 : type === 'lob' ? -0.2 : 0.15;
      // coup droit : armé bas et en arrière, contact devant, accompagnement jusqu'au front
      if (fore) return { back: V(0.72, cy + dy - 0.06, -0.02), contact: V(0.42, cy, 0.42), follow: V(-0.12, cy + 0.36 - dy * 1.4, 0.38), mid: V(0.62, cy - 0.04, 0.26), tilt, out: 0.7 };
      return { back: V(-0.22, cy + dy * 0.6 - 0.04, 0.18), contact: V(0.05, cy, 0.46), follow: V(0.52, cy + 0.3 - dy, 0.42), mid: V(-0.1, cy - 0.02, 0.36), tilt, out: -0.55 };
    };
    const serving = (game.state === 'serve' || game.state === 'toss') && game.server() === i;
    if (pl.swingT >= 0) {
      const P = poses(pl.swingFore, pl.swingType);
      const t = pl.swingT, tc = IDEAL_REL + 0.02;
      let hand;
      // trajectoire courbe (Bézier) : armé → contact en passant sous la balle, puis accompagnement
      const bez = (a, c, b, u) => a.clone().multiplyScalar((1 - u) * (1 - u)).addScaledVector(c, 2 * u * (1 - u)).addScaledVector(b, u * u);
      if (t < tc) hand = bez(P.back, P.mid, P.contact, ease(t / tc));
      else if (t < 0.3) { const u = ease((t - tc) / (0.3 - tc)); hand = bez(P.contact, P.contact.clone().lerp(P.follow, 0.5).add(V(0, 0.08, 0.06)), P.follow, u); }
      else hand = P.follow.clone().lerp(ready.hand, ease(Math.min(1, (t - 0.3) / 0.16)));
      return { hand, tilt: P.tilt, out: P.out };
    }
    if (pl.charging && !(serving && game.state === 'toss')) {
      const P = poses(ballSide, pl.chargeType);
      const c = Math.min(1, pl.chargeT / 0.5);
      return { hand: ready.hand.clone().lerp(P.back, 0.45 + 0.55 * ease(c)), tilt: P.tilt, out: P.out };
    }
    if (serving) {
      if (game.state === 'serve') return { hand: V(0.38, 0.95, 0.12), tilt: 0.3, out: 0.6 };
      return { hand: V(0.58, 1.02, 0.02), tilt: pl.chargeType === 'coupe' ? -0.8 : 0.4, out: 0.7 };
    }
    // garde puis préparation : le bras s'arme avant l'arrivée de la balle
    if (pr && pr.x !== undefined) {
      const fore = (pr.x - pl.x) * pl.side * (pl.hand || 1) >= -0.15;
      const guard = { hand: V(fore ? 0.4 : 0.0, THREE.MathUtils.clamp(cy, 0.85, 1.25), 0.42), tilt: 0.25, out: fore ? 0.6 : -0.45 };
      const rem = pr.t !== undefined ? pr.t - game.simTime : 9;
      if (rem < 0.55 && rem > 0) {
        const P = poses(fore, pl.chargeType || 'top'), k = ease(1 - rem / 0.55);
        return { hand: guard.hand.clone().lerp(P.back, k * 0.9), tilt: lerp(guard.tilt, P.tilt, k), out: lerp(guard.out, P.out, k) };
      }
      return guard;
    }
    return ready;
  }
}

// ------------------------------------------------------------------ bonhomme néon
const UP = new THREE.Vector3(0, 1, 0);
// ------------------------------------------------------------------ athlète néon animé
// Bonhomme bâton néon, squelette procédural :
// appuis au sol, pas chassés, split-step, rotation du buste dans les coups,
// bras libre d'équilibre, regard sur la balle, respiration, célébrations.
const _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
const vv = () => new THREE.Vector3();

const relaxedState = st => st === 'between' || st === 'pointEnd' || st === 'over';
class StickFigure {
  constructor(scene, color) {
    this.g = new THREE.Group();
    // tube néon : cœur lumineux + halo additif
    this.mat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    this.halo = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    this.lineMat = this.mat;
    this.setColor(color);
    const seg = new THREE.CylinderGeometry(0.019, 0.019, 1, 10, 1, false); seg.translate(0, 0.5, 0);
    const segH = new THREE.CylinderGeometry(0.048, 0.048, 1, 12, 1, true); segH.translate(0, 0.5, 0);
    this.segs = {};
    for (const k of ['spine', 'shoulders', 'hips', 'uaL', 'faL', 'uaR', 'faR', 'thL', 'shL', 'thR', 'shR', 'neck']) {
      const m = new THREE.Mesh(seg, this.mat); m.castShadow = true;
      m.add(new THREE.Mesh(segH, this.halo));
      this.g.add(m); this.segs[k] = m;
    }
    const jg = new THREE.SphereGeometry(0.03, 12, 10), jh = new THREE.SphereGeometry(0.06, 12, 10);
    this.joints = {};
    for (const k of ['shL', 'shR', 'elL', 'elR', 'haL', 'haR', 'hiL', 'hiR', 'knL', 'knR', 'ftL', 'ftR', 'pelvis', 'neck']) {
      const m = new THREE.Mesh(jg, this.mat); m.castShadow = true;
      m.add(new THREE.Mesh(jh, this.halo));
      this.g.add(m); this.joints[k] = m;
    }
    // tête : anneau lumineux + disque sombre
    this.head = new THREE.Group();
    this.headRing = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.02, 12, 48), this.mat);
    ring.add(new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.05, 12, 48), this.halo));
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.11, 32), new THREE.MeshBasicMaterial({ color: 0x07060c }));
    disc.position.z = -0.004; ring.castShadow = true;
    this.headRing.add(ring, disc);
    this.head.add(this.headRing);
    this.g.add(this.head);
    // accessoires
    this.acc = {
      band: new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.035, 0.03), this.mat),
      cap: new THREE.Group(),
      wristL: new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.014, 8, 20), this.mat),
      wristR: new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.014, 8, 20), this.mat),
    };
    this.acc.band.position.set(0, 0.035, 0.01); this.headRing.add(this.acc.band);
    const dome = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.022, 10, 32, Math.PI), this.mat);
    dome.position.y = 0.025; dome.scale.set(1.08, 0.9, 1);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.022, 0.03), this.mat); visor.position.set(0.09, 0.03, 0.02);
    this.acc.cap.add(dome, visor); this.headRing.add(this.acc.cap);
    this.g.add(this.acc.wristL, this.acc.wristR);
    this.setAccessory(0);
    scene.add(this.g);
    this.mood = 0; this.moodT = 0;
    this.v = {}; for (const k of ['pelvis', 'neck', 'headC', 'chest', 'shL', 'shR', 'haL', 'haR', 'elL', 'elR', 'hiL', 'hiR', 'knL', 'knR', 'ftL', 'ftR']) this.v[k] = vv();
    // état d'animation
    this.ft = null; this.stepT = [0, 0]; this.stepFrom = [vv(), vv()]; this.stepTo = [vv(), vv()]; this.nextFoot = 0;
    this.vel = vv(); this.prev = null; this.t = Math.random() * 10; this.split = 0; this.lastHitId = null; this.look = vv(); this.lean = 0; this.yaw = 0;
  }
  setColor(c) {
    const col = new THREE.Color(c);
    this.mat.color.copy(col).lerp(new THREE.Color(0xffffff), 0.22).multiplyScalar(1.5);
    this.halo.color.copy(col);
  }
  setAccessory(a) {
    this.accId = a;
    this.acc.band.visible = a === 1; this.acc.cap.visible = a === 2;
    this.acc.wristL.visible = this.acc.wristR.visible = a === 3;
  }
  celebrate(win) { this.mood = win ? 1 : -1; this.moodT = win ? 1.8 : 1.6; this.moodType = Math.floor(Math.random() * 3); }
  setBadge(text, color) {
    if (!this.badge) {
      const c = document.createElement('canvas'); c.width = 256; c.height = 96;
      this.badgeCanvas = c; this.badgeTex = new THREE.CanvasTexture(c); this.badgeTex.colorSpace = THREE.SRGBColorSpace;
      this.badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.badgeTex, transparent: true, toneMapped: false, depthWrite: false }));
      this.badge.scale.set(0.22, 0.085, 1); this.g.add(this.badge);
    }
    this.badge.visible = !!text;
    if (!text) return;
    const g = this.badgeCanvas.getContext('2d');
    g.clearRect(0, 0, 256, 96);
    g.fillStyle = 'rgba(10,8,20,.85)'; g.fillRect(8, 14, 240, 68);
    g.strokeStyle = color || '#fff'; g.lineWidth = 5; g.strokeRect(8, 14, 240, 68);
    g.fillStyle = color || '#fff'; g.font = '900 italic 40px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text.toUpperCase().slice(0, 11), 128, 50);
    this.badgeTex.needsUpdate = true;
  }
  place(m, a, b) {
    const d = _a.copy(b).sub(a); const L = d.length();
    m.position.copy(a); m.scale.set(1, Math.max(L, 0.001), 1);
    m.quaternion.setFromUnitVectors(UP, d.normalize());
  }
  // ellipsoïde orienté selon un repère (x latéral, y axe, z avant)
  orient(m, pos, xAxis, yAxis, sx, sy, sz) {
    const y = _b.copy(yAxis).normalize(), x = _a.copy(xAxis).addScaledVector(y, -xAxis.dot(y)).normalize(), z = _c.crossVectors(x, y);
    _m.makeBasis(x, y, z); m.quaternion.setFromRotationMatrix(_m);
    m.position.copy(pos); m.scale.set(sx, sy, sz);
  }
  ik(a, target, l1, l2, pole, outElbow, outHand) {
    const d = target.clone().sub(a); let L = d.length();
    const maxL = (l1 + l2) * 0.999; if (L > maxL) { d.setLength(maxL); L = maxL; }
    const T = a.clone().add(d);
    const x = (l1 * l1 - l2 * l2 + L * L) / (2 * L), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
    const dir = d.normalize();
    const p = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize();
    outElbow.copy(a).addScaledVector(dir, x).addScaledVector(p, h);
    outHand.copy(T);
  }

  update(dt, pl, game, i, paddleObj, camera) {
    dt = Math.min(dt, 0.05);
    this.t += dt;
    const s = pl.side, hd = pl.hand || 1, V0 = this.v;
    const f = vv().set(0, 0, -s), r = vv().set(s * hd, 0, 0);
    const root = vv().set(pl.x, 0, pl.z);
    // vitesse lissée
    if (!this.prev) this.prev = root.clone();
    const rawV = root.clone().sub(this.prev).divideScalar(Math.max(dt, 1e-3)); this.prev.copy(root);
    if (rawV.length() > 12) { rawV.set(0, 0, 0); this.ft = null; this.pel = null; }
    this.vel.lerp(rawV, Math.min(1, dt * 10));
    const speed = Math.hypot(this.vel.x, this.vel.z);
    this.moodT = Math.max(0, this.moodT - dt); if (this.moodT <= 0) this.mood = 0;
    const win = this.mood === 1, sad = this.mood === -1;
    const state = game.state;
    const relaxed = relaxedState(state);
    // split-step quand l'adversaire frappe
    const lh = game.lastHit;
    if (lh && lh.time !== undefined && lh.time !== this.lastHitId) { this.lastHitId = lh.time; if (lh.p !== i && state === 'rally') this.split = 0.22; }
    this.split = Math.max(0, this.split - dt);
    const hop = this.split > 0 ? Math.sin((1 - this.split / 0.22) * Math.PI) * 0.045 : 0;
    // swing : phase 0..1 (armé → frappe → accompagnement)
    const sw = pl.swingT >= 0 && pl.swingT !== undefined ? Math.min(1, pl.swingT / 0.42) : -1;
    const fore = pl.swingFore !== false;
    let yawT = 0;
    const prd = game.pred && game.pred[i];
    const rem = prd && prd.t !== undefined && game.simTime !== undefined ? prd.t - game.simTime : 9;
    const prepFore = prd && prd.x !== undefined ? (prd.x - pl.x) * s * hd >= -0.15 : true;
    if (sw >= 0) { const k = sw < 0.3 ? -1 : -1 + (sw - 0.3) / 0.7 * 2.2; yawT = (fore ? 1 : -1) * k * 0.6; }
    else if (rem > 0 && rem < 0.55 && !relaxedState(state)) yawT = (prepFore ? -1 : 1) * 0.6 * (1 - rem / 0.55);
    else if (this.vel.x * s * hd > 0.4) yawT = 0.15; else if (this.vel.x * s * hd < -0.4) yawT = -0.15;
    this.yaw += (yawT - this.yaw) * Math.min(1, dt * (sw >= 0 ? 22 : 6));
    // posture
    const breath = Math.sin(this.t * 2.2) * 0.008;
    let crouch = relaxed ? 0.04 : 0.15;
    if (state === 'toss' && game.server && game.server() === i) crouch = 0.2;
    if (sw >= 0) crouch += Math.sin(sw * Math.PI) * 0.05;
    let jump = 0, forward = relaxed ? 0.04 : 0.16;
    if (win) { const ct = this.celebType || 0; jump = ct === 3 ? Math.abs(Math.sin(this.moodT * 7)) * 0.32 : Math.abs(Math.sin(this.moodT * 9)) * 0.1; crouch = 0.02; forward = -0.04; }
    if (sad) { crouch = this.moodType === 0 ? 0.25 : 0.06; forward = this.moodType === 0 ? 0.42 : 0.2; }
    const leanSide = Math.max(-0.12, Math.min(0.12, this.vel.x * 0.05)) * (sw >= 0 ? 0.3 : 1);
    this.lean += (leanSide - this.lean) * Math.min(1, dt * 8);
    // le bassin suit le corps avec un peu d'inertie et descend à chaque appui
    if (!this.pel) this.pel = root.clone();
    this.pel.lerp(root, Math.min(1, dt * 14));
    const stepBob = (this.stepT[0] > 0 || this.stepT[1] > 0) ? Math.sin((1 - Math.max(this.stepT[0], this.stepT[1]) / (this.stepDur || 0.15)) * Math.PI) * 0.02 : 0;
    V0.pelvis.copy(this.pel).setY(0.97 - crouch + hop + jump + breath * 0.5 + stepBob);
    V0.pelvis.addScaledVector(f, -0.02);
    // pieds : appuis plantés, pas chassés quand le corps s'éloigne
    const sideV = vv().set(s, 0, 0); // axe latéral monde
    const stance = relaxed ? 0.17 : 0.27;
    const ideal = [root.clone().addScaledVector(sideV, -stance).addScaledVector(f, 0.05 * hd), root.clone().addScaledVector(sideV, stance).addScaledVector(f, -0.05 * hd)];
    if (!this.ft || this.ft[0].distanceTo(ideal[0]) > 1.2) { this.ft = [ideal[0].clone(), ideal[1].clone()]; this.stepT = [0, 0]; }
    for (let k = 0; k < 2; k++) {
      if (this.stepT[k] > 0) {
        this.stepT[k] = Math.max(0, this.stepT[k] - dt);
        const u = 1 - this.stepT[k] / this.stepDur;
        this.ft[k].lerpVectors(this.stepFrom[k], this.stepTo[k], u * u * (3 - 2 * u));
        this.ft[k].y = Math.sin(u * Math.PI) * (0.05 + Math.min(0.06, speed * 0.02));
      } else this.ft[k].y = 0;
    }
    const busy = this.stepT[0] > 0 || this.stepT[1] > 0;
    if (!busy) {
      const d0 = this.ft[0].distanceTo(ideal[0]), d1 = this.ft[1].distanceTo(ideal[1]);
      const k = d0 > d1 ? 0 : 1, dmax = Math.max(d0, d1);
      if (dmax > (speed > 0.5 ? 0.09 : 0.16)) {
        this.stepDur = Math.max(0.09, 0.17 - speed * 0.02);
        this.stepT[k] = this.stepDur; this.stepFrom[k].copy(this.ft[k]); this.stepFrom[k].y = 0;
        this.stepTo[k].copy(ideal[k]).addScaledVector(this.vel, 0.08); this.stepTo[k].y = 0;
      }
    }
    if (win || jump > 0.001 || hop > 0) { for (const F of this.ft) F.y = Math.max(F.y, (jump + hop) * 0.8); }
    // hanches et buste : rotation autour de la colonne
    const rotY = (v, a) => v.clone().applyAxisAngle(UP, a);
    const hipAxis = rotY(r, this.yaw * 0.45);
    V0.hiL.copy(V0.pelvis).addScaledVector(hipAxis, -0.11); V0.hiR.copy(V0.pelvis).addScaledVector(hipAxis, 0.11);
    const spineDir = vv().set(0, 1, 0).addScaledVector(f, forward).addScaledVector(r, this.lean * hd).normalize();
    V0.chest.copy(V0.pelvis).addScaledVector(spineDir, 0.34);
    V0.neck.copy(V0.pelvis).addScaledVector(spineDir, 0.52);
    const shAxis = rotY(r, this.yaw);
    const shY = V0.neck.clone().addScaledVector(spineDir, -0.05);
    V0.shL.copy(shY).addScaledVector(shAxis, -0.2); V0.shR.copy(shY).addScaledVector(shAxis, 0.2);
    // jambes (genoux vers l'avant et un peu vers l'extérieur)
    for (const [hip, fk, kn, ftv, out] of [[V0.hiL, 0, V0.knL, V0.ftL, -1], [V0.hiR, 1, V0.knR, V0.ftR, 1]]) {
      const tgt = this.ft[fk].clone(); tgt.y += 0.075;
      const pole = f.clone().addScaledVector(sideV, out * 0.35).add(vv().set(0, 0.2, 0));
      this.ik(hip, tgt, 0.46, 0.45, pole, kn, ftv);
    }
    // tête : regarde la balle
    const ball = game.ball && game.ball.p;
    this.look.lerp(ball && !relaxed ? vv().set(ball.x, ball.y, ball.z) : V0.neck.clone().addScaledVector(f, 2).setY(1.2), Math.min(1, dt * 10));
    V0.headC.copy(V0.neck).addScaledVector(spineDir, 0.14).addScaledVector(f, 0.02);
    if (sad) V0.headC.addScaledVector(f, 0.06).y -= 0.08;
    // bras
    let handR, handL;
    const elbowPole = vv().set(0, -1, 0).addScaledVector(f, -0.35);
    if (win) {
      const ct = this.celebType || 0;
      if (ct === 1) { const p = Math.sin(this.moodT * 10) * 0.08; handR = V0.neck.clone().add(vv().set(0, 0.5 + p, 0)).addScaledVector(r, 0.14); handL = V0.pelvis.clone().addScaledVector(r, -0.24).add(vv().set(0, 0.05, 0)); }
      else if (ct === 2) { handR = V0.neck.clone().add(vv().set(0, 0.06, 0)).addScaledVector(r, 0.62); handL = V0.neck.clone().add(vv().set(0, 0.06, 0)).addScaledVector(r, -0.62); }
      else { const p = Math.sin(this.moodT * 8) * 0.06; handR = V0.neck.clone().add(vv().set(0, 0.48 + p, 0)).addScaledVector(r, 0.28); handL = V0.neck.clone().add(vv().set(0, 0.48 - p, 0)).addScaledVector(r, -0.28); }
    } else if (sad) {
      if (this.moodType === 0) { handR = V0.knR.clone().addScaledVector(f, 0.06).add(vv().set(0, 0.04, 0)); handL = V0.knL.clone().addScaledVector(f, 0.06).add(vv().set(0, 0.04, 0)); }
      else { handR = V0.pelvis.clone().addScaledVector(r, 0.22).add(vv().set(0, 0.02, 0)).addScaledVector(f, -0.03); handL = V0.pelvis.clone().addScaledVector(r, -0.22).add(vv().set(0, 0.02, 0)).addScaledVector(f, -0.03); }
    } else {
      handR = paddleObj.position.clone().addScaledVector(vv().set(0, 1, 0).applyQuaternion(paddleObj.quaternion), -0.05);
      const serving = (state === 'serve' || state === 'toss') && game.server && game.server() === i;
      if (serving && state === 'serve') handL = vv().set(game.ball.p.x, game.ball.p.y - 0.035, game.ball.p.z);
      else if (serving && state === 'toss') handL = V0.neck.clone().add(vv().set(0, 0.18, 0)).addScaledVector(r, -0.18).addScaledVector(f, 0.28);
      else {
        // bras libre : équilibre, suit la rotation du buste
        const swing = sw >= 0 ? Math.sin(sw * Math.PI) : 0;
        handL = V0.chest.clone().addScaledVector(shAxis, -0.32 + (fore ? 0.12 : -0.1) * swing).addScaledVector(f, 0.28 + (fore ? -0.1 : 0.12) * swing).add(vv().set(0, -0.06 + breath, 0));
      }
    }
    this.ik(V0.shR, handR, 0.3, 0.28, elbowPole.clone().addScaledVector(r, 0.7), V0.elR, V0.haR);
    this.ik(V0.shL, handL, 0.3, 0.28, elbowPole.clone().addScaledVector(r, -0.7), V0.elL, V0.haL);

    // pose des segments néon
    const S = this.segs, J = this.joints;
    this.place(S.spine, V0.pelvis, V0.neck);
    this.place(S.neck, V0.neck, V0.headC.clone().addScaledVector(spineDir, -0.11));
    this.place(S.shoulders, V0.shL, V0.shR);
    this.place(S.hips, V0.hiL, V0.hiR);
    this.place(S.thL, V0.hiL, V0.knL); this.place(S.shL, V0.knL, V0.ftL);
    this.place(S.thR, V0.hiR, V0.knR); this.place(S.shR, V0.knR, V0.ftR);
    this.place(S.uaL, V0.shL, V0.elL); this.place(S.faL, V0.elL, V0.haL);
    this.place(S.uaR, V0.shR, V0.elR); this.place(S.faR, V0.elR, V0.haR);
    for (const k of Object.keys(J)) J[k].position.copy(V0[k]);
    this.head.position.copy(V0.headC);
    this.head.lookAt(camera.position);
    if (this.badge && this.badge.visible) this.badge.position.copy(V0.chest).addScaledVector(f, 0.12);
    if (this.accId === 3) {
      this.acc.wristL.position.copy(V0.elL).lerp(V0.haL, 0.82); this.acc.wristL.lookAt(V0.haL);
      this.acc.wristR.position.copy(V0.elR).lerp(V0.haR, 0.82); this.acc.wristR.lookAt(V0.haR);
    }
  }
}

// ------------------------------------------------------------------ particules
class Particles {
  constructor(scene, n, additive) {
    this.n = n; this.i = 0;
    this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3); this.c = new Float32Array(n * 3);
    this.life = new Float32Array(n); this.max = new Float32Array(n); this.size = new Float32Array(n); this.g = new Float32Array(n);
    this.a = new Float32Array(n);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.p, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.c, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(this.a, 1));
    this.mesh = new THREE.Points(geo, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vc; varying float va;
        void main(){ vc = color; va = alpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = min(size * 300.0 / -mv.z, 20.0); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: additive
        ? `varying vec3 vc; varying float va; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vc * va * (1.0 - d * 2.0) * 1.6, 1.0); }`
        : `varying vec3 vc; varying float va; void main(){ if (va < 0.01) discard; gl_FragColor = vec4(vc, va); }`,
    }));
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }
  spawn(x, y, z, vx, vy, vz, color, life, size, grav) {
    const i = this.i; this.i = (this.i + 1) % this.n;
    this.p.set([x, y, z], i * 3); this.v.set([vx, vy, vz], i * 3); this.c.set(color, i * 3);
    this.life[i] = life; this.max[i] = life; this.size[i] = size; this.g[i] = grav;
  }
  update(dt, flutter = 0, t = 0) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) { this.a[i] = 0; continue; }
      this.life[i] -= dt;
      const k = i * 3;
      this.v[k + 1] -= this.g[i] * dt;
      if (flutter) { this.v[k] += Math.sin(t * 3 + i) * flutter * dt; this.v[k] *= 0.98; this.v[k + 2] *= 0.98; }
      this.p[k] += this.v[k] * dt; this.p[k + 1] += this.v[k + 1] * dt; this.p[k + 2] += this.v[k + 2] * dt;
      this.a[i] = Math.max(0, Math.min(1, this.life[i] / this.max[i] * 1.5));
    }
    const at = this.mesh.geometry.attributes;
    at.position.needsUpdate = at.color.needsUpdate = at.size.needsUpdate = at.alpha.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ rendu
export class Renderer {
  constructor(canvas) {
    this.r = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.r.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.r.shadowMap.enabled = true;
    this.r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.r.toneMapping = THREE.ACESFilmicToneMapping;
    this.r.toneMappingExposure = 1.05;
    this.r.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050409);
    this.scene.fog = new THREE.FogExp2(0x07050d, 0.03);
    const pm = new THREE.PMREMGenerator(this.r);
    this.pmrem = pm; this.defaultEnv = pm.fromScene(new RoomEnvironment(), 0.04).texture; this.envCache = {};
    this.scene.environment = this.defaultEnv;
    this.scene.environmentIntensity = 0.18;

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.03, 160);
    this.camPos = V(0, 1.6, 3);
    this.camLook = V(0, 0.8, 0);
    this.time = 0; this.shake = 0; this.cheer = 0;
    this.marks = [];
    this.lastScoreKey = '';

    this.mats = {
      neon: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: NEON, emissiveIntensity: 3 }),
      purple: new THREE.MeshPhysicalMaterial({ color: PURPLE, roughness: 0.28, metalness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.15, envMapIntensity: 1.2 }),
    };
    this.ambLights = [];
    this.themeHex = '#d23cff';
    this.buildLights();
    this.buildArena();
    this.buildTable();
    this.buildStands();
    this.buildScreens();
    this.buildBall();
    this.paddles = [0, 1, 2, 3].map(() => new PaddleRig(this.scene, 0xd0102e));
    this.figures = [0x3d8bff, 0xff3d6b, 0x3de8ff, 0xffa23d].map(c => new StickFigure(this.scene, c));
    this.robot = this.buildRobot();
    this.camMode = 'raquette';
    this.sparks = new Particles(this.scene, 500, true);
    this.confettiP = new Particles(this.scene, 1600, false);
    this.fireP = new Particles(this.scene, 3200, true);
    // flashs d'appareils photo dans le public + poussière qui danse dans la lumière des projecteurs
    this.flashP = new Particles(this.scene, 400, true);
    {
      const n = 700, p = new Float32Array(n * 3);
      for (let k = 0; k < n; k++) p.set([(Math.random() - 0.5) * 9, Math.random() * 7, (Math.random() - 0.5) * 15], k * 3);
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
      this.dust = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xfff2dd, size: 0.018, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
      this.scene.add(this.dust);
    }
    this.celeb = null;
    this.flash = 0; this.intro = 0;

    const rt = new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType });
    this.composer = new EffectComposer(this.r, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.55, 0.93);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    // étalonnage final : contraste, saturation, vignette et léger grain (rendu « diffusion TV »)
    this.grade = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVig: { value: 0.38 }, uSat: { value: 1.08 }, uCon: { value: 1.06 }, uTint: { value: new THREE.Vector3(1, 1, 1) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uVig, uSat, uCon; uniform vec3 uTint; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main(){
          vec2 dd = (vUv - 0.5); float ca = dot(dd, dd) * 0.006;
          vec4 c = texture2D(tDiffuse, vUv);
          c.r = texture2D(tDiffuse, vUv + dd * ca).r; c.b = texture2D(tDiffuse, vUv - dd * ca).b;
          float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
          c.rgb = mix(vec3(l), c.rgb, uSat);
          c.rgb = (c.rgb - 0.5) * uCon + 0.5;
          c.rgb *= uTint;
          vec2 d = vUv - 0.5; d.x *= 1.25;
          c.rgb *= 1.0 - uVig * smoothstep(0.25, 0.85, length(d));
          c.rgb += (h(vUv * 900.0 + uTime) - 0.5) * 0.018;
          gl_FragColor = vec4(clamp(c.rgb, 0.0, 1.0), c.a);
        }`,
    });
    this.composer.addPass(this.grade);
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  async load() { /* plus aucun modèle externe à charger */ }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.r.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 1.3 ? 64 : 50;
    this.camera.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------- lumières
  buildLights() {
    const s = this.scene;
    this.hemi = new THREE.HemisphereLight(0x6b4fa8, 0x0a0812, 0.35); s.add(this.hemi);
    const key = new THREE.DirectionalLight(0xffffff, 1.25); this.key = key;
    key.position.set(0.8, 12, 1.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const c = key.shadow.camera;
    c.left = -4.5; c.right = 4.5; c.top = 8; c.bottom = -8; c.near = 4; c.far = 20;
    key.shadow.bias = -0.0003; key.shadow.normalBias = 0.015; key.shadow.radius = 4;
    s.add(key);
    // projecteurs zénithaux sur l'aire de jeu
    for (const [x, z] of [[-2.2, -4], [2.2, -4], [-2.2, 4], [2.2, 4], [0, 0]]) {
      const sp = new THREE.SpotLight(0xfff8f0, x === 0 ? 30 : 22, 20, 0.5, 0.75, 1.5);
      (this.spots = this.spots || []).push(sp); sp.userData.base = sp.intensity;
      sp.position.set(x, 11, z); sp.target.position.set(x * 0.3, 0, z * 0.4);
      s.add(sp, sp.target);
    }
    // ambiance violette dans les tribunes
    for (const [x, z] of [[-11, 0], [11, 0], [0, -15], [0, 15]]) {
      const p = new THREE.PointLight(0x8a3cff, 22, 26, 1.6);
      this.ambLights.push(p);
      p.position.set(x, 6, z); s.add(p);
    }
  }

  // ---------------------------------------------------------------- arène
  buildArena() {
    const s = this.scene;
    // sol : texture couleur + masque de reflet (aux proportions exactes du terrain), posé sur un miroir
    const fc = document.createElement('canvas'); fc.width = 1152; fc.height = 2048;
    const mc = document.createElement('canvas'); mc.width = 288; mc.height = 512;
    this.floorCanvas = fc; this.floorMask = mc;
    const floorTex = new THREE.CanvasTexture(fc); floorTex.colorSpace = THREE.SRGBColorSpace; floorTex.anisotropy = 8;
    const maskTex = new THREE.CanvasTexture(mc);
    this.courtMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.5, metalness: 0.05, envMapIntensity: 0.8 });
    this.maskTex = maskTex;
    const court = new THREE.Mesh(new THREE.PlaneGeometry(COURT.hx * 2, COURT.hz * 2), this.courtMat);
    court.rotation.x = -Math.PI / 2; court.position.y = 0.002; court.receiveShadow = true; s.add(court);
    // reflet ajouté par-dessus le sol (additif : jamais de « trous » noirs), adouci et modulé par la matière
    const MirrorShader = {
      name: 'SoftMirror',
      uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, tMask: { value: maskTex }, uBlur: { value: 0.004 } },
      vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec2 vM;
        void main() { vUv = textureMatrix * vec4(position, 1.0); vM = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 color; uniform sampler2D tDiffuse, tMask; uniform float uBlur; varying vec4 vUv; varying vec2 vM;
        void main() {
          vec2 p = vUv.xy / vUv.w; float b = uBlur;
          vec3 c = texture2D(tDiffuse, p).rgb * 0.36;
          c += texture2D(tDiffuse, p + vec2(b, 0.0)).rgb * 0.16 + texture2D(tDiffuse, p - vec2(b, 0.0)).rgb * 0.16;
          c += texture2D(tDiffuse, p + vec2(0.0, b * 1.6)).rgb * 0.16 + texture2D(tDiffuse, p - vec2(0.0, b * 1.6)).rgb * 0.16;
          float k = clamp((1.0 - texture2D(tMask, vM).g) * 1.7, 0.0, 1.0);
          gl_FragColor = vec4(c * color * k, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    };
    this.mirror = new Reflector(new THREE.PlaneGeometry(COURT.hx * 2, COURT.hz * 2), { textureWidth: 768, textureHeight: 768, color: 0x9a9a9a, clipBias: 0.003, shader: MirrorShader });
    Object.assign(this.mirror.material, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.mirror.rotation.x = -Math.PI / 2; this.mirror.position.y = 0.0032; this.mirror.renderOrder = 1; s.add(this.mirror);
    // le reflet ne montre que l'aire de jeu (table, joueurs, panneaux, éclairages) : pas le décor lointain ni le public
    const mirrorRender = this.mirror.onBeforeRender;
    this.mirror.onBeforeRender = (...args) => {
      const hide = [this.kit && this.kit.g, this.crowd, this.crowdHeads, this.crowdArms, this.crowdFlags, this.crowdPhones, this.crowdHair, ...(this.tribunes || []), this.seatMesh].filter(Boolean);
      const was = hide.map(o => o.visible); hide.forEach(o => { o.visible = false; });
      mirrorRender.apply(this.mirror, args);
      hide.forEach((o, i) => { o.visible = was[i]; });
    };
    this.outerMat = new THREE.MeshStandardMaterial({ color: 0x0c0b12, roughness: 0.9 });
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), this.outerMat);
    outer.rotation.x = -Math.PI / 2; outer.receiveShadow = true; s.add(outer); this.outerMesh = outer;

    // panneaux : noirs, logos blancs, liseré néon violet
    this.boardTex = canvasTex(4096, 160, (g, w, h) => {
      g.fillStyle = '#0c0c12'; g.fillRect(0, 0, w, h);
      const items = ['PINGPONG', 'WORLD CHAMPIONSHIPS', '@PINGPONG', 'LE JEU. LA PASSION.', 'PINGPONG', 'FINALE'];
      let x = 60;
      g.textBaseline = 'middle';
      items.forEach((t, i) => {
        if (i % 2 === 0) { logo(g, x + 90, h / 2, 44, 0, 1); x += 480; }
        else { g.fillStyle = '#ffffff'; g.font = '800 46px Arial'; g.fillText(t, x, h / 2 + 2); x += g.measureText(t).width + 120; }
      });
    });
    this.boardTex.wrapS = THREE.RepeatWrapping;
    const frame = new THREE.MeshStandardMaterial({ color: 0x0a0a10, roughness: 0.45, metalness: 0.3 });
    const neon = this.mats.neon;
    const add = (w, x, z, ry) => {
      const g = new THREE.Group();
      const back = new THREE.Mesh(new THREE.BoxGeometry(w, 0.74, 0.06), frame); back.position.y = 0.37; back.receiveShadow = true; g.add(back);
      const t = this.boardTex.clone(); t.repeat.set(w / 9, 1); t.needsUpdate = true;
      const face = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.04, 0.56),
        new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.85, roughness: 0.5 }));
      face.position.set(0, 0.36, 0.031); g.add(face);
      this.boardMats = this.boardMats || []; this.boardMats.push(face.material);
      this.boards = this.boards || []; this.boards.push(t);
      const line = new THREE.Mesh(new THREE.BoxGeometry(w, 0.018, 0.02), neon); line.position.set(0, 0.745, 0.02); g.add(line);
      const line2 = new THREE.Mesh(new THREE.BoxGeometry(w, 0.01, 0.02), neon); line2.position.set(0, 0.04, 0.035); g.add(line2);
      g.position.set(x, 0, z); g.rotation.y = ry; s.add(g);
    };
    add(COURT.hx * 2, 0, -COURT.hz, 0); add(COURT.hx * 2, 0, COURT.hz, Math.PI);
    add(COURT.hz * 2, -COURT.hx, 0, Math.PI / 2); add(COURT.hz * 2, COURT.hx, 0, -Math.PI / 2);

    // table de l'arbitre
    const dark = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.5, metalness: 0.4 });
    // table d'arbitrage : plateau clair, façade lumineuse, compteur à volets et chaise
    const deskG = new THREE.Group();
    const top = new THREE.MeshStandardMaterial({ color: 0xe8e6f0, roughness: 0.35, metalness: 0.1 });
    const body = new THREE.MeshStandardMaterial({ color: 0x1a1726, roughness: 0.35, metalness: 0.5 });
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 1.0), top); deskTop.position.y = 0.72; deskTop.castShadow = true; deskG.add(deskTop);
    const front = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 1.0), body); front.position.set(-0.21, 0.4, 0); deskG.add(front);
    for (const z of [-0.47, 0.47]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.7, 0.04), body); leg.position.set(0, 0.35, z); deskG.add(leg); }
    const deskLine = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.02, 1.0), neon); deskLine.position.set(-0.235, 0.64, 0); deskG.add(deskLine);
    const deskLine2 = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 1.0), neon); deskLine2.position.set(-0.235, 0.14, 0); deskG.add(deskLine2);
    const chair = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, 0.38), body); seat.position.y = 0.46; chair.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.38), body); back.position.set(0.17, 0.68, 0); chair.add(back);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.44, 8), dark); pole.position.y = 0.22; chair.add(pole);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 16), dark); foot.position.y = 0.01; chair.add(foot);
    chair.position.set(0.4, 0, 0); deskG.add(chair);
    deskG.position.set(3.55, 0, 0); deskG.traverse(m => { if (m.isMesh) m.castShadow = true; }); s.add(deskG);
    this.counterTex = canvasTex(512, 256, () => {});
    const cMat = new THREE.MeshBasicMaterial({ map: this.counterTex });
    const counter = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.4), [dark, dark, dark, dark, cMat, cMat]);
    counter.position.set(3.5, 0.84, 0); counter.rotation.y = Math.PI / 2; s.add(counter);
    // boîtes à serviettes
    for (const z of [-COURT.hz + 0.7, COURT.hz - 0.7]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 0.3), new THREE.MeshStandardMaterial({ color: 0x24202f, roughness: 0.3, metalness: 0.4 })); b.position.set(-COURT.hx + 0.45, 0.275, z); b.castShadow = true; s.add(b);
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.012, 0.31), neon); l.position.set(-COURT.hx + 0.45, 0.556, z); s.add(l);
    }
    // anneau lumineux au plafond + rampes
    const truss = new THREE.MeshStandardMaterial({ color: 0x15141c, roughness: 0.6, metalness: 0.6 });
    this.ceilingG = new THREE.Group(); s.add(this.ceilingG);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(7.5, 0.12, 8, 80), truss); ring.rotation.x = Math.PI / 2; ring.position.y = 11.5; this.ceilingG.add(ring);
    const ringNeon = new THREE.Mesh(new THREE.TorusGeometry(7.5, 0.035, 6, 120), neon); ringNeon.rotation.x = Math.PI / 2; ringNeon.position.y = 11.32; this.ceilingG.add(ringNeon);
    const lamp = new THREE.MeshBasicMaterial({ color: 0xfffaf0 });
    for (let k = 0; k < 16; k++) {
      const a = k / 16 * Math.PI * 2;
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.18, 14), lamp);
      l.position.set(Math.cos(a) * 7.5, 11.3, Math.sin(a) * 7.5); this.ceilingG.add(l);
    }
    const coneTex = canvasTex(64, 256, (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, 'rgba(255,250,240,0)'); grd.addColorStop(0.2, 'rgba(255,250,240,0.05)'); grd.addColorStop(1, 'rgba(255,250,240,0)');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    });
    const coneMat = new THREE.MeshBasicMaterial({ map: coneTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }); this.coneMat = coneMat;
    for (const [x, z] of [[-2.2, -4], [2.2, -4], [-2.2, 4], [2.2, 4]]) {
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 2.8, 11, 24, 1, true), coneMat);
      cone.position.set(x * 0.8, 5.5, z * 0.8); s.add(cone); (this.cones = this.cones || []).push(cone);
    }
  }

  buildTable() {
    const s = this.scene, T = TABLE;
    const g = new THREE.Group();
    const topTex = canvasTex(512, 1024, (c, w, h) => {
      noiseFill(c, w, h, '#131a25', 5);
      c.fillStyle = '#d8d8d8';
      const lw = 0.02 / T.W * w, lh = 0.02 / T.L * h;
      c.fillRect(0, 0, lw, h); c.fillRect(w - lw, 0, lw, h);
      c.fillRect(0, 0, w, lh); c.fillRect(0, h - lh, w, lh);
      c.fillRect(w / 2 - 1.5, 0, 3, h);
      c.globalAlpha = 0.5; logo(c, w * 0.58, h * 0.92, 18, 0, 0.6); logo(c, w * 0.42, h * 0.08, 18, Math.PI, 0.6);
    });
    const topMat = new THREE.MeshPhysicalMaterial({ map: topTex, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3, envMapIntensity: 0.6 });
    this.tableTop = topTex;
    const purple = this.mats.purple;
    const top = new THREE.Mesh(new THREE.BoxGeometry(T.W, 0.025, T.L), [purple, purple, topMat, purple, purple, purple]);
    top.position.y = T.H - 0.0125; top.castShadow = true; top.receiveShadow = true; g.add(top);
    const apron = new THREE.Mesh(new THREE.BoxGeometry(T.W - 0.02, 0.05, T.L - 0.02), purple);
    apron.position.y = T.H - 0.05; g.add(apron);

    // pieds sculptés en arche
    const arch = new THREE.Shape();
    arch.moveTo(-0.86, 0);
    arch.quadraticCurveTo(-0.78, 0.66, 0, 0.7);
    arch.quadraticCurveTo(0.78, 0.66, 0.86, 0);
    arch.lineTo(0.66, 0);
    arch.quadraticCurveTo(0.6, 0.52, 0, 0.55);
    arch.quadraticCurveTo(-0.6, 0.52, -0.66, 0);
    arch.closePath();
    const archGeo = new THREE.ExtrudeGeometry(arch, { depth: 0.09, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 4, curveSegments: 32 });
    archGeo.translate(0, 0, -0.045);
    for (const z of [-0.78, 0.78]) {
      const a = new THREE.Mesh(archGeo, purple); a.position.z = z; a.castShadow = true; a.receiveShadow = true; g.add(a);
    }
    // poutre centrale courbe reliant les arches
    const curve = new THREE.CatmullRomCurve3([V(0, 0.66, -0.78), V(0, 0.3, -0.3), V(0, 0.22, 0), V(0, 0.3, 0.3), V(0, 0.66, 0.78)]);
    const beam = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.05, 16, false), purple); beam.castShadow = true; g.add(beam);
    for (const sx of [-1, 1]) {
      const c2 = new THREE.CatmullRomCurve3([V(sx * 0.62, 0.02, -0.78), V(sx * 0.3, 0.16, -0.25), V(0, 0.22, 0), V(sx * 0.3, 0.16, 0.25), V(sx * 0.62, 0.02, 0.78)]);
      const b2 = new THREE.Mesh(new THREE.TubeGeometry(c2, 48, 0.03, 12, false), purple); b2.castShadow = true; g.add(b2);
    }

    // filet
    const netTex = canvasTex(256, 32, (c, w, h) => {
      c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(20,20,30,0.95)'; c.lineWidth = 1.2;
      for (let x = 0; x <= w; x += 5) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
      for (let y = 0; y <= h; y += 5) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    });
    netTex.wrapS = netTex.wrapT = THREE.RepeatWrapping; netTex.repeat.set(5, 1);
    const net = new THREE.Mesh(new THREE.PlaneGeometry(NET.halfW * 2, NET.H - 0.016),
      new THREE.MeshStandardMaterial({ map: netTex, transparent: true, side: THREE.DoubleSide, alphaTest: 0.1 }));
    net.position.set(0, T.H + (NET.H - 0.016) / 2, 0); net.castShadow = true; g.add(net);
    const tape = new THREE.Mesh(new THREE.BoxGeometry(NET.halfW * 2, 0.016, 0.005), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }));
    tape.position.set(0, T.H + NET.H - 0.008, 0); g.add(tape);
    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.025, NET.H + 0.03, 0.04), purple);
      post.position.set(sx * NET.halfW, T.H + NET.H / 2 + 0.005, 0); post.castShadow = true; g.add(post);
    }
    s.add(g);

    this.aimRing = new THREE.Mesh(new THREE.RingGeometry(0.055, 0.075, 40),
      new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.9, depthWrite: false }));
    this.aimRing.rotation.x = -Math.PI / 2; this.aimRing.visible = false; s.add(this.aimRing);
  }

  buildStands() {
    const s = this.scene;
    const standMat = new THREE.MeshStandardMaterial({ color: 0x0b0a10, roughness: 0.95 }); this.standMat = standMat;
    const spots = [];
    const tribunes = [
      { cx: 0, cz: -9.6, w: 20, ry: 0 }, { cx: 0, cz: 9.6, w: 20, ry: Math.PI },
      { cx: -6.6, cz: 0, w: 17, ry: Math.PI / 2 }, { cx: 6.6, cz: 0, w: 17, ry: -Math.PI / 2 },
    ];
    this.tribunes = [];
    for (const t of tribunes) {
      const grp = new THREE.Group(); this.tribunes.push(grp);
      for (let r = 0; r < 16; r++) {
        const h = 0.6 + r * 0.42, d = r * 0.85;
        const step = new THREE.Mesh(new THREE.BoxGeometry(t.w + r * 1.2, 0.42, 0.85), standMat);
        step.position.set(0, h - 0.21, -d); step.receiveShadow = true; grp.add(step);
        const n = Math.floor((t.w + r * 1.2) / 0.55);
        for (let k = 0; k < n; k++) spots.push({ grp, lx: (k - n / 2) * 0.55 + (Math.random() - 0.5) * 0.06, ly: h, lz: -d - 0.12, ry: t.ry });
      }
      grp.position.set(t.cx, 0, t.cz); grp.rotation.y = t.ry; s.add(grp);
      grp.updateMatrixWorld(true);
    }
    const people = [], seats = [];
    for (const sp of spots) (Math.random() < 0.74 ? people : seats).push(sp);
    for (let i = people.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [people[i], people[j]] = [people[j], people[i]]; }
    // public : corps, têtes, bras, drapeaux et téléphones (instanciés)
    const N = people.length;
    const crowdMat = new THREE.MeshStandardMaterial({ roughness: 0.85, envMapIntensity: 0.05, emissive: 0x0c0c12 });
    const torso = new THREE.CapsuleGeometry(0.18, 0.3, 4, 10); torso.scale(1.18, 1, 0.78);
    this.crowd = new THREE.InstancedMesh(torso, crowdMat, N);
    // cheveux / casquettes : calotte posée sur la tête
    this.crowdHair = new THREE.InstancedMesh(new THREE.SphereGeometry(0.108, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), new THREE.MeshStandardMaterial({ roughness: 0.9, envMapIntensity: 0.05 }), N);
    this.crowdHeads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshStandardMaterial({ roughness: 0.8, envMapIntensity: 0.05, emissive: 0x0a0806 }), N);
    this.crowdArms = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.042, 0.3, 2, 6), crowdMat, N * 2);
    const skins = [0xf1c7a5, 0xd8a27f, 0x8d5524, 0xc68642, 0xffdbac, 0x5c3a21];
    const col = new THREE.Color();
    this.crowdItems = people.map((st, i) => {
      const w = V(st.lx, st.ly + 0.34, st.lz).applyMatrix4(st.grp.matrixWorld);
      this.crowdHeads.setColorAt(i, col.setHex(skins[Math.floor(Math.random() * skins.length)]).multiplyScalar(0.55));
      return { x: w.x, y: w.y, z: w.z, fx: Math.sin(st.ry), fz: Math.cos(st.ry), rx: Math.cos(st.ry), rz: -Math.sin(st.ry),
        ph: Math.random() * 6.28, sp: 0.7 + Math.random() * 0.6, ex: Math.random(), hs: 0.9 + Math.random() * 0.2, g: st.grp,
        team: Math.random() < 0.5 ? 0 : 1, flag: -1, phone: -1, ang: Math.atan2(w.z, w.x) };
    });
    // drapeaux (≈ 9 %) et téléphones (≈ 45 %)
    let nf = 0, np = 0;
    for (const it of this.crowdItems) { if (Math.random() < 0.09) it.flag = nf++; else if (Math.random() < 0.5) it.phone = np++; }
    this.crowdFlags = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.55, 0.36), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8, emissive: 0x111111 }), Math.max(1, nf));
    this.crowdPhones = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.1, 0.012), new THREE.MeshBasicMaterial({ color: 0xf4f8ff, toneMapped: false }), Math.max(1, np));
    this.recolorCrowd();
    // sièges vides
    const seatGeo = new THREE.BoxGeometry(0.44, 0.42, 0.4);
    const seatMesh = new THREE.InstancedMesh(seatGeo, new THREE.MeshStandardMaterial({ color: 0x6a0f1c, roughness: 0.7 }), seats.length); this.seatMesh = seatMesh;
    const d = new THREE.Object3D();
    seats.forEach((st, i) => {
      const w = V(st.lx, st.ly + 0.21, st.lz).applyMatrix4(st.grp.matrixWorld);
      d.position.copy(w); d.rotation.y = st.ry; d.updateMatrix(); seatMesh.setMatrixAt(i, d.matrix);
    });
    const hairs = [0x1a1410, 0x2a1a10, 0x4a2a14, 0x6a4a2a, 0xc8a060, 0x8a3a1a, 0x9a9a9a, 0x0e0e0e];
    this.crowdItems.forEach((it, i) => this.crowdHair.setColorAt(i, col.setHex(Math.random() < 0.12 ? [0x3d8bff, 0xff3d6b][it.team] : hairs[Math.floor(Math.random() * hairs.length)]).multiplyScalar(0.8)));
    for (const m of [this.crowd, this.crowdHeads, this.crowdArms, this.crowdFlags, this.crowdPhones, this.crowdHair]) m.frustumCulled = false;
    s.add(this.crowd, this.crowdHeads, this.crowdArms, this.crowdFlags, this.crowdPhones, this.crowdHair, seatMesh);
    this.dummy = new THREE.Object3D();
    this.clap = 0; this.ola = -1; this.ovation = 0; this.crowdFrame = 0;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._v = V(); this._s = V(1, 1, 1); this._up = V(0, 1, 0); this._d = V();
    this.updateCrowd(0);
  }
  // couleurs du public selon la salle : 1/3 porte les couleurs des joueurs
  recolorCrowd(pal) {
    pal = pal || [0x2b2b3a, 0x3a3f5c, 0x8a1f2b, 0x1e4a8e, 0x5a5a5a, 0x7b2a9a, 0x2a6a5a, 0xb0b0b0, 0x1a1a1a, 0xc08a2a, 0xffffff, 0xd84a3a];
    const col = new THREE.Color(), TEAM = [0x3d8bff, 0xff3d6b];
    this.crowdItems.forEach((it, i) => {
      const c = Math.random() < 0.3 ? TEAM[it.team] : pal[Math.floor(Math.random() * pal.length)];
      col.setHex(c).multiplyScalar(0.55 + Math.random() * 0.35);
      this.crowd.setColorAt(i, col); this.crowdArms.setColorAt(i * 2, col); this.crowdArms.setColorAt(i * 2 + 1, col);
      if (it.flag >= 0) this.crowdFlags.setColorAt(it.flag, col.setHex(TEAM[it.team]));
    });
    for (const m of [this.crowd, this.crowdArms, this.crowdFlags]) if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }
  // réactions : 'clap' (applaudit), 'cheer' (se lève et crie), 'ola', 'ovation' (fin de match), 'calm'
  crowdReact(kind) {
    if (kind === 'clap') this.clap = Math.max(this.clap, 2.2);
    else if (kind === 'cheer') { this.cheer = 1.4; this.clap = 2.6; }
    else if (kind === 'ola') { if (this.ola < 0) this.ola = 0; }
    else if (kind === 'ovation') { this.ovation = 1; this.cheer = 1.4; }
    else if (kind === 'calm') { this.ovation = 0; this.cheer = 0; this.clap = 0; this.ola = -1; }
  }

  // podium de remise des trophées
  setPodium(on, color = 0xffc83c, medal = false) {
    this.podiumPos = V(0, 0, 3.6);
    if (!this.podiumG) {
      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: 0x15121f, roughness: 0.4, metalness: 0.5 });
      this.podiumEdge = new THREE.MeshBasicMaterial({ color, toneMapped: false });
      [[0, 0.62, '1'], [-0.95, 0.42, '2'], [0.95, 0.28, '3']].forEach(([x, h]) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, h, 0.8), mat); b.position.set(x, h / 2, 0); b.castShadow = b.receiveShadow = true; g.add(b);
        const e = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.025, 0.82), this.podiumEdge); e.position.set(x, h, 0); g.add(e);
      });
      // trophée
      const pts = [[0, 0], [0.07, 0], [0.07, 0.02], [0.025, 0.05], [0.02, 0.13], [0.05, 0.16], [0.09, 0.22], [0.1, 0.3], [0.095, 0.31], [0, 0.31]].map(([x, y]) => new THREE.Vector2(x, y));
      this.trophyMat = new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: 0.18, emissive: color, emissiveIntensity: 0.25 });
      this.trophy = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), this.trophyMat);
      this.medalMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.012, 32), this.trophyMat); this.medalMesh.rotation.x = Math.PI / 2;
      g.add(this.trophy, this.medalMesh);
      this.scene.add(g); this.podiumG = g;
    }
    this.podiumOn = on;
    this.podiumG.visible = on;
    this.podiumG.position.copy(this.podiumPos);
    this.podiumEdge.color.setHex(color); this.trophyMat.color.setHex(color); this.trophyMat.emissive.setHex(color);
    this.trophy.visible = on && !medal; this.medalMesh.visible = on && !!medal;
    if (!on) for (const f of this.figures) f.g.position.y = 0;
    else { this.figures[0].mood = 1; this.figures[0].moodT = 999; }
  }
  updatePodium(dt, game) {
    const P = this.podiumPos;
    const spots = [[0, 0.62], [-0.95, 0.42]];
    for (const p of this.paddles) p.obj.visible = false;
    this.ballMesh.visible = this.glow.visible = false;
    for (let i = 0; i < this.figures.length; i++) {
      const fig = this.figures[i];
      if (i > 1 || (game.players && i >= game.players.length)) { fig.g.visible = false; continue; }
      const [x, h] = spots[i];
      fig.g.visible = true;
      if (i === 0) { fig.mood = 1; fig.moodT = 999; } else { fig.mood = 0; }
      fig.g.position.y = 0;
      fig.update(dt, { x: P.x + x, z: P.z, side: -1, hand: 1 }, { state: 'between', ball: game.ball, server: () => -1 }, i, this.paddles[i].obj, this.camera);
      fig.g.position.y = h;
    }
    const v = this.figures[0].v;
    const ct = this.figures[0].celebType || 0;
    const top = ct === 1 ? v.haR.clone() : ct === 2 ? v.headC.clone().add(V(0, 0.3, 0)) : v.haL.clone().add(v.haR).multiplyScalar(0.5);
    this.trophy.position.set(top.x - P.x, Math.min(top.y, v.headC.y + 0.6) + 0.62 - 0.05, top.z - P.z);
    this.medalMesh.position.set(v.neck.x - P.x, v.neck.y + 0.62 - 0.18, v.neck.z - P.z - 0.07);
  }

  setCrowdDensity(f) {
    this.crowdN = Math.max(1, Math.round(this.crowdItems.length * Math.max(0.05, Math.min(1, f))));
  }
  setEventTitle(t) { this.eventTitle = t || null; this.lastScoreKey = null; this.drawScreen(null); }
  // cible d'entraînement sur la table
  setTarget(t) {
    if (!this.targetMesh) {
      this.targetMesh = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48), new THREE.MeshBasicMaterial({ color: 0x6ee7a8, transparent: true, opacity: 0.85, toneMapped: false, side: THREE.DoubleSide }));
      this.targetFill = new THREE.Mesh(new THREE.CircleGeometry(0.8, 48), new THREE.MeshBasicMaterial({ color: 0x6ee7a8, transparent: true, opacity: 0.18, toneMapped: false }));
      for (const m of [this.targetMesh, this.targetFill]) { m.rotation.x = -Math.PI / 2; this.scene.add(m); }
    }
    for (const m of [this.targetMesh, this.targetFill]) {
      m.visible = !!t;
      if (t) { m.position.set(t.x, 0.762, t.z); m.scale.setScalar(t.r); }
    }
  }
  // visée du service
  setAim(t) {
    if (!this.aimMesh) {
      const g = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.11, 0.135, 40), new THREE.MeshBasicMaterial({ color: 0x3de8ff, transparent: true, opacity: 0.95, toneMapped: false, side: THREE.DoubleSide }));
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.035, 24), new THREE.MeshBasicMaterial({ color: 0x3de8ff, toneMapped: false }));
      const fill = new THREE.Mesh(new THREE.CircleGeometry(0.11, 40), new THREE.MeshBasicMaterial({ color: 0x3de8ff, transparent: true, opacity: 0.15, toneMapped: false }));
      for (const m of [ring, dot, fill]) { m.rotation.x = -Math.PI / 2; g.add(m); }
      this.scene.add(g); this.aimMesh = g;
    }
    this.aimMesh.visible = !!t;
    if (t) { this.aimMesh.position.set(t.x, 0.763, t.z); this.aimMesh.scale.setScalar(1 + 0.12 * Math.sin(this.time * 6)); }
  }
  flashTarget(ok) { if (this.targetMesh) { this.targetMesh.material.color.setHex(ok ? 0xffffff : 0xff3d5a); this.targetFlash = 0.35; } }

  updateCrowd(dt) {
    if (this.showKit && this.showKit.visible) for (const b of this.beams) { const a = b.userData.a + this.time * 0.4; b.rotation.z = Math.sin(this.time * 0.8 + a) * 0.5; b.rotation.x = Math.cos(this.time * 0.6 + a) * 0.4; }
    if (this.targetFlash > 0) { this.targetFlash -= dt; if (this.targetFlash <= 0) this.targetMesh.material.color.setHex(0x6ee7a8); }
    this.cheer = Math.max(0, this.cheer - dt * (this.ovation ? 0 : 0.4));
    this.clap = Math.max(0, this.clap - dt);
    if (this.ola >= 0) { this.ola += dt; if (this.ola > 6.5) this.ola = -1; }
    if (!this.crowd.visible) return;
    // les bras n'ont besoin d'être recalculés à chaque image que si le public bouge
    const busy = this.cheer > 0.02 || this.clap > 0 || this.ola >= 0 || this.ovation || this.crowdHype;
    this.crowdFrame++;
    if (!busy && this.crowdFrame % 4 && dt > 0) return;
    const t = this.time, items = this.crowdItems, M = this._m, Q = this._q, P = this._v, S = this._s, UP = this._up, D = this._d;
    const n = this.crowdN ?? items.length, cheer = Math.min(1, this.cheer), night = !!(this.venue && (this.venue.sky || this.venue.show || this.venue.kit));
    const olaA = this.ola >= 0 ? -Math.PI + this.ola * 2.1 : null;
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    const setArm = (k, sx, sy, sz, dx, dy, dz) => {
      const l = Math.hypot(dx, dy, dz) || 1; D.set(dx / l, dy / l, dz / l);
      Q.setFromUnitVectors(UP, D); P.set(sx + D.x * 0.19, sy + D.y * 0.19, sz + D.z * 0.19); S.set(1, 1, 1);
      this.crowdArms.setMatrixAt(k, M.compose(P, Q, S));
    };
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (i >= n || (it.g && !it.g.visible)) {
        this.crowd.setMatrixAt(i, zero); this.crowdHeads.setMatrixAt(i, zero); this.crowdHair.setMatrixAt(i, zero); this.crowdArms.setMatrixAt(i * 2, zero); this.crowdArms.setMatrixAt(i * 2 + 1, zero);
        if (it.flag >= 0) this.crowdFlags.setMatrixAt(it.flag, zero); if (it.phone >= 0) this.crowdPhones.setMatrixAt(it.phone, zero);
        continue;
      }
      // état de la personne
      let wave = false, stand = 0, jump = 0, clap = false, phone = false;
      if (this.ovation) { stand = 1; wave = it.phone < 0 || Math.sin(t * 0.5 + it.ph) > 0.2; phone = it.phone >= 0 && !wave; jump = Math.max(0, Math.sin(t * 7 * it.sp + it.ph)) * 0.1; }
      else if (it.ex < cheer * 0.85) { stand = 1; wave = true; jump = Math.max(0, Math.sin(t * 8 * it.sp + it.ph)) * 0.14 * cheer; }
      else if (this.crowdHype && it.ex < this.crowdHype) { stand = 1; wave = Math.sin(t * 1.3 + it.ph) > 0.3; jump = Math.max(0, Math.sin(t * 13.4 + it.ph * 0.2)) * 0.09; }
      else if (this.clap > 0 && it.ex < 0.92) clap = true;
      if (olaA !== null) { let da = Math.abs(((it.ang - olaA) % 6.283 + 9.425) % 6.283 - 3.1416); if (da < 0.45) { const k = 1 - da / 0.45; stand = Math.max(stand, k); if (k > 0.4) wave = true, clap = false; } }
      if (!stand && !clap && night && this.pressure && it.phone >= 0 && it.ex < 0.25) phone = true;
      const sway = Math.sin(t * 1.1 * it.sp + it.ph) * 0.012;
      const by = it.y + stand * 0.24 + jump + sway;
      P.set(it.x, by, it.z); S.set(1, it.hs, 1); Q.identity();
      this.crowd.setMatrixAt(i, M.compose(P, Q, S));
      P.y = by + 0.37 * it.hs; S.set(1, 1, 1);
      this.crowdHeads.setMatrixAt(i, M.compose(P, Q, S));
      P.y += 0.012; Q.setFromAxisAngle(UP, Math.atan2(it.fx, it.fz)); this._q2 = this._q2 || new THREE.Quaternion(); this._q2.setFromAxisAngle(this._x || (this._x = V(1, 0, 0)), -0.25); Q.multiply(this._q2);
      this.crowdHair.setMatrixAt(i, M.compose(P, Q, S)); Q.identity();
      // bras
      const fx = it.fx, fz = it.fz, rx = it.rx, rz = it.rz, shy = by + 0.2 * it.hs;
      for (const side of [-1, 1]) {
        const sx = it.x + rx * side * 0.2, sz = it.z + rz * side * 0.2, k = i * 2 + (side > 0 ? 1 : 0);
        let ux, uy, lat, fw;
        if (phone && side > 0) { uy = 0.8; fw = 0.6; lat = -0.1; }
        else if (wave) { uy = 0.92; fw = 0.12; lat = 0.32 + 0.28 * Math.sin(t * 6 * it.sp + it.ph + side); }
        else if (clap) { const c = Math.sin(t * 15 * it.sp + it.ph) * 0.5 + 0.5; uy = 0.3; fw = 0.85; lat = -(0.52 - 0.32 * c); }
        else { uy = -0.95; fw = 0.28; lat = 0.1; }
        ux = rx * side * lat + fx * fw; const uz = rz * side * lat + fz * fw;
        setArm(k, sx, shy, sz, ux, uy, uz);
        // main : drapeau ou téléphone
        if (side > 0) {
          const hx = sx + D.x * 0.38, hy = shy + D.y * 0.38, hz = sz + D.z * 0.38;
          if (it.flag >= 0) {
            if (wave || stand > 0.5) {
              Q.setFromAxisAngle(UP, Math.atan2(fx, fz) + Math.PI / 2 + Math.sin(t * 5 + it.ph) * 0.5);
              P.set(hx + rx * 0.27, hy + 0.22, hz + rz * 0.27); S.set(1, 1, 1);
              this.crowdFlags.setMatrixAt(it.flag, M.compose(P, Q, S));
            } else this.crowdFlags.setMatrixAt(it.flag, zero);
          }
          if (it.phone >= 0) {
            if (phone) { Q.setFromAxisAngle(UP, Math.atan2(fx, fz)); P.set(hx, hy + 0.05, hz); S.set(1, 1, 1); this.crowdPhones.setMatrixAt(it.phone, M.compose(P, Q, S)); }
            else this.crowdPhones.setMatrixAt(it.phone, zero);
          }
        }
      }
    }
    for (const m of [this.crowd, this.crowdHeads, this.crowdArms, this.crowdFlags, this.crowdPhones, this.crowdHair]) m.instanceMatrix.needsUpdate = true;
  }

  buildScreens() {
    this.screenCanvas = document.createElement('canvas');
    this.screenCanvas.width = 1024; this.screenCanvas.height = 512;
    this.screenTex = new THREE.CanvasTexture(this.screenCanvas);
    this.screenTex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: this.screenTex, emissiveIntensity: 0.75 });
    const frame = new THREE.MeshStandardMaterial({ color: 0x0b0a12, roughness: 0.4, metalness: 0.6 });
    for (const [z, ry] of [[-16, 0], [16, Math.PI]]) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(8.4, 4.4, 0.3), frame));
      const sc = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), mat); sc.position.z = 0.16; g.add(sc);
      g.position.set(0, 9, z); g.rotation.y = ry; this.scene.add(g); (this.screenGs = this.screenGs || []).push(g);
    }
    this.drawScreen(null);
  }

  drawScreen(game) {
    const g = this.screenCanvas.getContext('2d'), w = 1024, h = 512;
    const grd = g.createLinearGradient(0, 0, w, h); grd.addColorStop(0, '#1a0b2e'); grd.addColorStop(1, '#07060d');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = this.themeHex; g.fillRect(0, h - 10, w, 10);
    logo(g, w / 2 + 40, 80, 50, 0, 1);
    g.fillStyle = '#b9a8e6'; g.font = '700 26px Arial'; g.textAlign = 'center'; g.fillText((this.eventTitle || 'WORLD CHAMPIONSHIPS').toUpperCase(), w / 2, 140);
    if (game) {
      const m = game.match;
      [0, 1].forEach(p => {
        const y = 260 + p * 120;
        g.textAlign = 'left';
        g.fillStyle = p === 0 ? '#3d7bff' : '#ff3d6b'; g.fillRect(60, y - 66, 12, 86);
        g.fillStyle = '#fff'; g.font = '800 56px Arial'; g.fillText(game.names[p].toUpperCase().slice(0, 12), 100, y);
        g.textAlign = 'right';
        g.fillStyle = '#9a8cc8'; g.fillText(String(m.sets[p]), 780, y);
        g.fillStyle = '#ffffff'; g.font = '900 80px Arial'; g.fillText(String(m.score[p]), 960, y + 4);
      });
    }
    this.screenTex.needsUpdate = true;
    const c = this.counterTex.image.getContext('2d');
    c.fillStyle = '#08070d'; c.fillRect(0, 0, 512, 256);
    const sc = game ? game.match.score : [0, 0];
    c.font = '900 150px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#2a50c8'; c.fillRect(20, 30, 220, 196); c.fillStyle = '#c8243f'; c.fillRect(272, 30, 220, 196);
    c.fillStyle = '#fff'; c.fillText(String(sc[0]), 130, 135); c.fillText(String(sc[1]), 382, 135);
    this.counterTex.needsUpdate = true;
  }

  buildBall() {
    this.ballMesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_R * 1.15, 24, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.25, roughness: 0.35 }));
    this.ballMesh.castShadow = true;
    this.scene.add(this.ballMesh);
    // anneau coloré qui tourne avec la balle : on voit l'effet (rouge = lift, bleu = coupé, vert = latéral)
    this.spinBand = new THREE.Mesh(new THREE.TorusGeometry(BALL_R * 1.17, BALL_R * 0.28, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.ballMesh.add(this.spinBand);
    this.spinQ = new THREE.Quaternion();
    const glowTex = canvasTex(64, 64, (g, w, h) => {
      const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      grd.addColorStop(0, 'rgba(255,255,255,0.7)'); grd.addColorStop(0.3, 'rgba(220,200,255,0.25)'); grd.addColorStop(1, 'rgba(200,160,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    });
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    this.glow.scale.setScalar(0.12);
    this.scene.add(this.glow);
    const N = 22;
    this.trailN = N; this.trailPts = [];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3));
    const alpha = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) alpha[i * 2] = alpha[i * 2 + 1] = (i / (N - 1)) ** 1.6;
    geo.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
    const idx = [];
    for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setIndex(idx);
    this.trailU = { uColor: { value: new THREE.Vector3(0.85, 0.7, 1.0) }, uRainbow: { value: 0 }, uTime: { value: 0 }, uBoost: { value: 0.7 } };
    this.trail = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: this.trailU,
      vertexShader: 'attribute float alpha; varying float va; void main(){ va = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 uColor; uniform float uRainbow, uTime, uBoost; varying float va;
        void main(){ vec3 c = uColor;
          if (uRainbow > 0.5) c = 0.55 + 0.45 * cos(6.2831 * (va * 1.5 + uTime * 0.8 + vec3(0.0, 0.33, 0.67)));
          gl_FragColor = vec4(c * va * uBoost, 1.0); }`,
    }));
    this.trailColors = [0, 1, 2, 3].map(() => [0.85, 0.7, 1.0]);
    this.trailWidth = 1;
    this.trail.frustumCulled = false;
    this.scene.add(this.trail);
  }

  // ---------------------------------------------------------------- image
  update(game, dt) {
    this.time += dt;
    const b = game.ball.p;
    this.ballMesh.position.set(b.x, b.y, b.z);
    this.glow.position.copy(this.ballMesh.position);
    this.ballMesh.visible = this.glow.visible = game.state !== 'between' && !this.celeb;
    this.updateSpin(game, dt);
    const lh = game.lastHit ? game.lastHit.p : 0;
    const tc = game.superBall ? [1.0, 0.42, 0.08] : (this.trailColors[lh] || this.trailColors[0]);
    if (tc === 'rainbow') this.trailU.uRainbow.value = 1;
    else { this.trailU.uRainbow.value = 0; this.trailU.uColor.value.set(tc[0], tc[1], tc[2]); }
    this.trailU.uTime.value = this.time;
    this.trailU.uBoost.value = game.superBall ? 1.6 : 0.75;
    this.trailWidth = game.superBall ? 2.4 : 1;
    this.updateTrail(game);

    if (game.fx.length > 8) game.fx.splice(0, game.fx.length - 8);
    for (const f of game.fx) {
      if (f.type === 'bounce') { this.addMark(f.x, f.z); this.burst(f.x, TABLE.H + 0.01, f.z, 6, [0.9, 0.9, 1], 0.9, 0.25, 0.012); }
      if (f.type === 'cheer') { this.crowdReact(f.big ? 'cheer' : 'clap'); if (f.big && f.rally >= 10 && Math.random() < 0.6) this.crowdReact('ola'); this.flash = f.big ? 1 : 0.5; }
      if (f.type === 'hit') {
        if (f.sup) this.burst(f.x, f.y, f.z, 45, [1, 0.5, 0.1], 3.5, 0.5, 0.03);
        else this.burst(f.x, f.y, f.z, f.smash ? 26 : 12, this.neonRGB(), f.smash ? 2.6 : 1.6, 0.3, 0.02);
        if (f.smash || f.sup) this.shake = 0.25;
      }
    }
    game.fx.length = 0;
    this.marks = this.marks.filter(mk => {
      mk.t += dt;
      mk.m.material.opacity = Math.max(0, 0.8 - mk.t * 1.1);
      mk.m.scale.setScalar(1 + mk.t * 2);
      if (mk.t > 0.75) { this.scene.remove(mk.m); mk.m.geometry.dispose(); mk.m.material.dispose(); return false; }
      return true;
    });

    game.players.forEach((pl, i) => this.paddles[i].update(dt, pl, game, i));
    for (let i = game.players.length; i < 4; i++) { this.paddles[i].obj.visible = false; this.figures[i].g.visible = false; }
    const robotMode = !!(game.ctrl && game.ctrl[1] === 'robot');
    this.robot.visible = robotMode;
    game.players.forEach((pl, i) => {
      const fig = this.figures[i];
      const fp = this.camMode === 'raquette' && !this.orbit && !this.replayCam && !(this.intro > 0) && !this.celeb;
      // vue raquette : on ne voit ni son propre corps ni celui de son partenaire (seulement sa raquette)
      const hideMe = fp && (i === game.me || (game.doubles && game.partner && i === game.partner(game.me)));
      fig.g.visible = !hideMe && !(robotMode && i === 1);
      this.paddles[i].obj.visible = !(robotMode && i === 1);
      if (fig.g.visible) fig.update(dt, pl, game, i, this.paddles[i].obj, this.camera);
    });
    if (this.podiumOn) this.updatePodium(dt, game);
    // balle en feu (super coup)
    if (game.superBall && game.state === 'rally' && Math.random() < 0.9) {
      const p = game.ball.p;
      this.sparks.spawn(p.x, p.y, p.z, (Math.random() - 0.5) * 0.4, Math.random() * 0.4, (Math.random() - 0.5) * 0.4, [1, 0.35 + Math.random() * 0.3, 0.05], 0.3, 0.035, -0.5);
    }
    this.sparks.update(dt);
    this.confettiP.update(dt, 2.5, this.time);
    this.fireP.update(dt);
    this.flashP.update(dt);
    // flashs : quelques-uns en continu, une rafale sur les gros points et pendant la célébration
    const fr = (this.celeb ? 40 : this.cheer > 0.9 ? 30 : this.pressure ? 4 : 1.2) * dt;
    for (let n = fr; n > 0; n -= 1) {
      if (n < 1 && Math.random() > n) break;
      const it = this.crowdItems[(Math.random() * (this.crowdN ?? this.crowdItems.length)) | 0];
      if (it && (!it.g || it.g.visible) && this.crowd.visible) this.flashP.spawn(it.x, it.y + 0.55, it.z, 0, 0, 0, [1, 1, 1], 0.09, 0.35, 0);
    }
    { const P = this.dust.geometry.attributes.position.array; for (let i = 0; i < P.length; i += 3) { P[i] += Math.sin(this.time * 0.3 + i) * dt * 0.05; P[i + 1] += dt * 0.04 * Math.sin(i + this.time * 0.2); if (P[i + 1] > 7) P[i + 1] = 0; if (P[i + 1] < 0) P[i + 1] = 7; } this.dust.geometry.attributes.position.needsUpdate = true; }
    if (this.celeb && game.players) this.updateCelebration(dt, game);
    this.flash = Math.max(0, this.flash - dt * 1.6);
    this.mats.neon.emissiveIntensity = 3 + this.flash * 2.5;
    for (const m of this.boardMats) m.emissiveIntensity = 0.85 + this.flash * 0.5;
    const key = JSON.stringify([game.match.score, game.match.sets, game.names]);
    if (key !== this.lastScoreKey) { this.lastScoreKey = key; this.drawScreen(game); }
    for (const t of this.boards) t.offset.x = (this.time * 0.015) % 1;
    this.updateAim(game);
    this.updateCrowd(dt);
    if (this.kit) this.kit.update(dt, this.time, this.cheer);
    this.updateCamera(game, dt);
    this.grade.uniforms.uTime.value = this.time % 100;
    this.composer.render();
  }

  updateTrail(game) {
    const b = game.ball.p;
    const moving = game.state === 'rally' || game.state === 'pointEnd' || game.state === 'toss';
    this.trailPts.push(b.x, b.y, b.z);
    if (this.trailPts.length > this.trailN * 3) this.trailPts.splice(0, 3);
    if (!moving) this.trailPts.length = 0;
    this.trail.visible = moving && this.trailPts.length > 6;
    if (!this.trail.visible) return;
    const pos = this.trail.geometry.attributes.position.array;
    const n = this.trailPts.length / 3, cam = this.camera.position, P = this.trailPts;
    for (let i = 0; i < this.trailN; i++) {
      const k = Math.max(0, Math.min(n - 1, i - (this.trailN - n)));
      const j = k * 3, j2 = Math.min(n - 1, k + 1) * 3;
      const px = P[j], py = P[j + 1], pz = P[j + 2];
      const dx = P[j2] - px, dy = P[j2 + 1] - py, dz = P[j2 + 2] - pz;
      const vx = cam.x - px, vy = cam.y - py, vz = cam.z - pz;
      let wx = dy * vz - dz * vy, wy = dz * vx - dx * vz, wz = dx * vy - dy * vx;
      const l = Math.hypot(wx, wy, wz) || 1, width = BALL_R * 0.9 * this.trailWidth * (i / this.trailN);
      wx = wx / l * width; wy = wy / l * width; wz = wz / l * width;
      pos[i * 6] = px + wx; pos[i * 6 + 1] = py + wy; pos[i * 6 + 2] = pz + wz;
      pos[i * 6 + 3] = px - wx; pos[i * 6 + 4] = py - wy; pos[i * 6 + 5] = pz - wz;
    }
    this.trail.geometry.attributes.position.needsUpdate = true;
  }

  updateSpin(game, dt) {
    const w = game.ball.w, v = game.ball.v;
    if (!w) return;
    const wl = Math.hypot(w.x, w.y, w.z);
    const hv = Math.hypot(v.x, v.z) || 1;
    const ia = topAxis(v.x / hv, v.z / hv);
    const top = w.x * ia.x + w.z * ia.z;
    const col = Math.abs(w.y) > 60 && Math.abs(w.y) > Math.abs(top) ? 0x3dff8a : top > 40 ? 0xff4d4d : top < -40 ? 0x3da5ff : 0xffffff;
    this.spinBand.material.color.setHex(col);
    if (wl > 1) {
      // l'anneau contient l'axe de rotation : en tournant autour, il « roule » visiblement
      const axis = new THREE.Vector3(w.x / wl, w.y / wl, w.z / wl);
      if (!this.lastAxis || axis.dot(this.lastAxis) < 0.95) {
        const perp = Math.abs(axis.y) < 0.9 ? new THREE.Vector3().crossVectors(axis, UP).normalize() : new THREE.Vector3(1, 0, 0);
        this.ballMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), perp);
        this.lastAxis = axis.clone();
      }
      this.spinQ.setFromAxisAngle(axis, Math.min(0.45, wl * dt * 0.08));
      this.ballMesh.quaternion.premultiply(this.spinQ);
    }
  }

  buildRobot() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.4), new THREE.MeshStandardMaterial({ color: 0x15131d, roughness: 0.4, metalness: 0.6 }));
    body.position.y = 1.0; body.castShadow = true; g.add(body);
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.09, 32), this.mats.neon); eye.position.set(0, 1.02, 0.201); g.add(eye);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.75, 10), body.material); pole.position.y = 0.375; g.add(pole);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.06, 24), body.material); base.position.y = 0.03; g.add(base);
    g.position.set(0, 0, -1.75); g.visible = false;
    this.scene.add(g);
    return g;
  }

  neonRGB() { const c = this.mats.neon.emissive; return [Math.min(1, c.r + 0.3), Math.min(1, c.g + 0.3), Math.min(1, c.b + 0.3)]; }
  burst(x, y, z, n, color, speed, life, size) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI - Math.PI / 2;
      const v = speed * (0.4 + Math.random() * 0.6);
      this.sparks.spawn(x, y, z, Math.cos(a) * Math.cos(e) * v, Math.abs(Math.sin(e)) * v * 0.8 + 0.3, Math.sin(a) * Math.cos(e) * v, color, life * (0.6 + Math.random() * 0.6), size, 6);
    }
  }
  // ---------------------------------------------------------------- célébration de fin de match
  startCelebration({ winners, losers, mine, sfx }) {
    this.celeb = { t: 0, winners, losers, mine, next: 0.2, sfx, typeT: 0, saved: this.figures.map(f => f.celebType) };
    this.crowdReact('ovation');
    if (!this.celebSpot) {
      const sp = new THREE.SpotLight(0xfff2d8, 0, 22, 0.32, 0.5, 1.2); sp.castShadow = false;
      this.scene.add(sp, sp.target); this.celebSpot = sp;
      this.celebRing = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.75, 48), new THREE.MeshBasicMaterial({ color: 0xffd23c, transparent: true, opacity: 0.8, toneMapped: false, depthWrite: false, side: THREE.DoubleSide }));
      this.celebRing.rotation.x = -Math.PI / 2; this.scene.add(this.celebRing);
    }
    this.celebSpot.intensity = 0; this.celebRing.visible = true;
    // canons à confettis dans les quatre coins
    this.confettiCannons();
    for (const i of winners) { const f = this.figures[i]; f.mood = 1; f.moodT = 999; f.celebType = Math.floor(Math.random() * 4); }
    for (const i of losers) { const f = this.figures[i]; f.mood = -1; f.moodT = 999; f.moodType = Math.random() < 0.5 ? 0 : 1; }
  }
  stopCelebration() {
    if (!this.celeb) return;
    this.celeb.saved.forEach((c, i) => { this.figures[i].celebType = c; this.figures[i].mood = 0; this.figures[i].moodT = 0; });
    this.celeb = null; this.crowdReact('calm');
    if (this.celebSpot) { this.celebSpot.intensity = 0; this.celebRing.visible = false; }
  }
  confettiCannons() {
    const cols = [[1, 0.25, 0.4], [0.3, 0.6, 1], [1, 0.85, 0.2], [0.3, 1, 0.5], [0.85, 0.3, 1], [1, 1, 1]];
    for (const [x, z] of [[-4, -7], [4, -7], [-4, 7], [4, 7]]) for (let k = 0; k < 220; k++) {
      const a = Math.atan2(-z, -x) + (Math.random() - 0.5) * 0.9, v = 4 + Math.random() * 5;
      this.confettiP.spawn(x, 0.4, z, Math.cos(a) * v * 0.45, 6 + Math.random() * 5, Math.sin(a) * v * 0.45, cols[k % cols.length], 6 + Math.random() * 4, 0.05, 1.6);
    }
  }
  firework(x, y, z) {
    const pal = [[1, 0.3, 0.5], [0.3, 0.7, 1], [1, 0.85, 0.25], [0.4, 1, 0.6], [0.9, 0.4, 1], [1, 0.55, 0.2], [1, 1, 1]];
    const c1 = pal[Math.floor(Math.random() * pal.length)], c2 = pal[Math.floor(Math.random() * pal.length)];
    const n = 190, sp = 4.5 + Math.random() * 3, ring = Math.random() < 0.3;
    for (let k = 0; k < n; k++) {
      let vx, vy, vz;
      if (ring) { const a = k / n * Math.PI * 2; vx = Math.cos(a); vy = Math.sin(a) * 0.3; vz = Math.sin(a); }
      else { const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u); vx = Math.cos(a) * r; vy = u; vz = Math.sin(a) * r; }
      const v = sp * (0.85 + Math.random() * 0.3);
      this.fireP.spawn(x, y, z, vx * v, vy * v, vz * v, k % 3 ? c1 : c2, 1.4 + Math.random() * 0.9, 0.22, 2.0);
    }
    // éclair au centre
    for (let k = 0; k < 12; k++) this.fireP.spawn(x, y, z, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5, [1, 1, 0.9], 0.25, 0.4, 0);
    this.flash = Math.max(this.flash, 0.6);
  }
  updateCelebration(dt, game) {
    const C = this.celeb; C.t += dt;
    // fusées : elles montent depuis les tribunes et explosent au-dessus du terrain
    C.next -= dt;
    if (C.next <= 0 && C.t < 30) {
      C.next = C.t < 4 ? 0.25 + Math.random() * 0.35 : 0.6 + Math.random() * 0.9;
      // derrière le vainqueur, donc dans le champ de la caméra
      const s = C.side || 1, sx = Math.random() < 0.5 ? -1 : 1;
      const x0 = sx * (5 + Math.random() * 5), z0 = s * (8 + Math.random() * 6);
      const tx = (Math.random() - 0.5) * 12, ty = 5.5 + Math.random() * 4.5, tz = s * (7 + Math.random() * 7);
      (C.rockets = C.rockets || []).push({ x: x0, y: 4, z: z0, tx, ty, tz, t: 0, d: 0.9 + Math.random() * 0.4 });
      C.sfx && C.sfx.rocket && C.sfx.rocket();
    }
    C.rockets = (C.rockets || []).filter(r => {
      r.t += dt; const u = Math.min(1, r.t / r.d), e = 1 - (1 - u) * (1 - u);
      const x = r.x + (r.tx - r.x) * e, y = r.y + (r.ty - r.y) * e, z = r.z + (r.tz - r.z) * e;
      this.fireP.spawn(x, y, z, (Math.random() - 0.5) * 0.3, -0.5, (Math.random() - 0.5) * 0.3, [1, 0.75, 0.4], 0.35, 0.1, 0);
      if (u >= 1) { this.firework(x, y, z); C.sfx && C.sfx.boom && C.sfx.boom(1 + Math.hypot(x, z) / 10); return false; }
      return true;
    });
    // poursuite lumineuse sur le(s) vainqueur(s)
    const W = C.winners.map(i => game.players[i]).filter(Boolean);
    if (W.length) {
      const cx = W.reduce((a, p) => a + p.x, 0) / W.length, cz = W.reduce((a, p) => a + p.z, 0) / W.length;
      C.cx = cx; C.cz = cz; C.side = Math.sign(cz) || 1;
      this.celebSpot.position.set(cx, 9, cz + C.side * 1.5); this.celebSpot.target.position.set(cx, 0, cz);
      this.celebSpot.intensity = Math.min(1, C.t * 2) * 260;
      this.celebRing.position.set(cx, 0.015, cz); this.celebRing.scale.setScalar(W.length > 1 ? 2 : 1.2 + Math.sin(C.t * 3) * 0.05);
      this.celebRing.material.opacity = 0.55 + Math.sin(C.t * 4) * 0.25;
    }
    // le vainqueur enchaîne les célébrations
    C.typeT += dt;
    if (C.typeT > 2.4) { C.typeT = 0; for (const i of C.winners) this.figures[i].celebType = (this.figures[i].celebType + 1 + Math.floor(Math.random() * 2)) % 4; }
    for (const i of C.winners) { this.figures[i].mood = 1; this.figures[i].moodT = 999; }
    if (C.t > 3 && C.t < 3.1) this.confettiCannons();
  }
  confetti() {
    const cols = [[1, 0.25, 0.4], [0.3, 0.6, 1], [1, 0.85, 0.2], [0.3, 1, 0.5], [0.85, 0.3, 1], [1, 1, 1]];
    for (let k = 0; k < 900; k++) {
      this.confettiP.spawn((Math.random() - 0.5) * 9, 3 + Math.random() * 4, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 0.5, -0.8 - Math.random(), (Math.random() - 0.5) * 0.5,
        cols[k % cols.length], 7 + Math.random() * 3, 0.05, 0.25);
    }
  }

  addMark(x, z) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.018, 0.03, 24),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, TABLE.H + 0.002, z);
    this.scene.add(m); this.marks.push({ m, t: 0 });
  }

  updateAim(game) {
    const me = game.players[game.me];
    const serve = (game.state === 'serve' || game.state === 'toss') && game.server() === game.me;
    const incoming = game.state === 'rally' && game.rally && game.nextHitter && game.nextHitter() === game.me && game.pred && game.pred[game.me];
    const show = (me.charging && !serve) || serve || !!incoming;
    this.aimRing.visible = show;
    if (!show) return;
    const s = me.side;
    const ax = Math.max(-1, Math.min(1, me.aimX)), ay = Math.max(-1, Math.min(1, me.aimY));
    const depth = serve ? 0.8 + ay * 0.33 : me.chargeType === 'lob' ? 1.05 + ay * 0.15 : 0.92 + ay * 0.3;
    this.aimRing.position.set(ax * 0.6 * s, TABLE.H + 0.004, -s * depth);
    this.aimRing.scale.setScalar(1 + Math.sin(this.time * 10) * 0.08);
  }

  // ---------------------------------------------------------------- salles
  buildVenueKits() {
    const s = this.scene;
    // gymnase : murs clairs, fenêtres, néons, tables d'entraînement
    const gym = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xb9bcc4, roughness: 0.85 });
    const winMat = new THREE.MeshBasicMaterial({ color: 0xcfe6ff });
    const tubeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    for (const [x, z, w, ry] of [[0, -11, 30, 0], [0, 11, 30, Math.PI], [-9, 0, 24, Math.PI / 2], [9, 0, 24, -Math.PI / 2]]) {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(w, 9), wallMat); wall.position.set(x, 4.5, z); wall.rotation.y = ry; gym.add(wall);
      const along = ry === 0 || ry === Math.PI;
      for (let k = -3; k <= 3; k++) {
        const wi = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.2), winMat); wi.position.set(x + (along ? k * 3.6 : 0), 6.6, z + (along ? 0 : k * 3.2)); wi.rotation.y = ry; wi.translateZ(0.03); gym.add(wi);
      }
    }
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x8a8d96, roughness: 0.9, side: THREE.DoubleSide })); ceil.rotation.x = Math.PI / 2; ceil.position.y = 9; gym.add(ceil);
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 1.6), tubeMat); t.position.set(i * 3.2, 8.9, j * 3.6); gym.add(t); }
    const tMat = new THREE.MeshStandardMaterial({ color: 0x1f4fa8, roughness: 0.5 }), legMat = new THREE.MeshStandardMaterial({ color: 0x222228 });
    for (const [x, z] of [[-6.4, -4], [-6.4, 4], [6.4, -4], [6.4, 4]]) {
      const tt = new THREE.Mesh(new THREE.BoxGeometry(1.525, 0.03, 2.74), tMat); tt.position.set(x, 0.76, z); tt.castShadow = true; gym.add(tt);
      for (const sx of [-0.6, 0.6]) for (const sz of [-1.1, 1.1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.75, 0.05), legMat); l.position.set(x + sx, 0.375, z + sz); gym.add(l); }
      const n = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.15), new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true, opacity: 0.7, side: THREE.DoubleSide })); n.position.set(x, 0.85, z); gym.add(n);
    }
    gym.visible = false; s.add(gym); this.gymKit = gym;
    // guirlandes de drapeaux
    const flags = new THREE.Group();
    this.flagMats = [];
    for (const [x, z, ry, n] of [[0, -8.6, 0, 18], [0, 8.6, Math.PI, 18], [-5.7, 0, Math.PI / 2, 14], [5.7, 0, -Math.PI / 2, 14]]) {
      const along = ry === 0 || ry === Math.PI;
      for (let k = 0; k < n; k++) {
        const m = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.8 }); this.flagMats.push(m);
        const f = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), m);
        const off = (k - n / 2) * 1.05;
        f.position.set(x + (along ? off : 0), 7.2 + Math.sin(k) * 0.08, z + (along ? 0 : off)); f.rotation.y = ry;
        flags.add(f);
      }
    }
    flags.visible = false; s.add(flags); this.flagKit = flags;
    // piliers LED et faisceaux de couleur (spectacle)
    const show = new THREE.Group();
    this.ledMat = new THREE.MeshBasicMaterial({ color: 0xff3d8b, toneMapped: false });
    for (const [x, z] of [[-4.8, -8], [4.8, -8], [-4.8, 8], [4.8, 8], [-6.8, -3], [6.8, -3], [-6.8, 3], [6.8, 3]]) {
      const pl = new THREE.Mesh(new THREE.BoxGeometry(0.25, 6, 0.25), this.ledMat); pl.position.set(x, 3, z); show.add(pl);
    }
    const beamTex = canvasTex(64, 256, (g, w, h) => { const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, 'rgba(255,255,255,0.35)'); grd.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = grd; g.fillRect(0, 0, w, h); });
    this.beams = [];
    for (let k = 0; k < 8; k++) {
      const m = new THREE.MeshBasicMaterial({ map: beamTex, color: 0xff3d8b, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 1.4, 14, 16, 1, true), m);
      const a = k / 8 * Math.PI * 2; b.position.set(Math.cos(a) * 9, 10, Math.sin(a) * 9); b.userData.a = a; show.add(b); this.beams.push(b);
    }
    show.visible = false; s.add(show); this.showKit = show;
  }
  drawFloor(v) {
    paintFloor(this.floorCanvas, this.floorMask, v, logo);
    this.courtMat.map.needsUpdate = true; this.maskTex.needsUpdate = true;
    this.courtMat.roughness = v.floorRough ?? 0.5;
    this.mirror.visible = (v.reflect ?? 1) > 0;
    this.mirror.material.uniforms.color.value.setHex(v.mirrorTint ?? 0x8a8a8a);
    this.mirror.material.uniforms.uBlur.value = 0.002 + (v.floorRough ?? 0.5) * 0.012;
  }
  drawBoards(bg, fg, accent, items) {
    const c = this.boardTex.image, g = c.getContext('2d'), w = c.width, h = c.height;
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = accent; g.fillRect(0, h - 10, w, 10);
    let x = 60; g.textBaseline = 'middle'; g.textAlign = 'left';
    for (let k = 0; x < w; k++) {
      const t = items[k % items.length];
      if (t === '@logo') { logo(g, x + 90, h / 2, 44, 0, 1); x += 480; continue; }
      g.fillStyle = k % 3 === 2 ? accent : fg; g.font = 'italic 900 50px Arial'; g.fillText(t, x, h / 2 + 2); x += g.measureText(t).width + 140;
    }
    for (const t of this.boards) t.needsUpdate = true;
  }
  drawTableTop(color) {
    const c = this.tableTop.image, g = c.getContext('2d'), w = c.width, h = c.height, T = TABLE;
    noiseFill(g, w, h, color, 5);
    g.fillStyle = '#e4e4e4';
    const lw = 0.02 / T.W * w, lh = 0.02 / T.L * h;
    g.fillRect(0, 0, lw, h); g.fillRect(w - lw, 0, lw, h); g.fillRect(0, 0, w, lh); g.fillRect(0, h - lh, w, lh); g.fillRect(w / 2 - 1.5, 0, 3, h);
    logo(g, w * 0.58, h * 0.92, 18, 0, 0.35); logo(g, w * 0.42, h * 0.08, 18, Math.PI, 0.35);
    this.tableTop.needsUpdate = true;
  }
  // décor complet d'une salle (voir VENUES dans main.js)
  setVenue(v) {
    if (!this.gymKit) this.buildVenueKits();
    this.mats.neon.emissive.setHex(v.neon); this.mats.purple.color.setHex(v.legs);
    for (const l of this.ambLights) { l.color.setHex(v.light); l.intensity = v.amb ?? 22; }
    for (const p of this.paddles) p.obj.userData.cap.color.setHex(v.neon), p.obj.userData.cap.emissive.setHex(v.neon);
    this.themeHex = '#' + v.neon.toString(16).padStart(6, '0');
    this.scene.background.setHex(v.bg); this.scene.fog.color.setHex(v.bg); this.scene.fog.density = v.fog ?? 0.03;
    this.hemi.color.setHex(v.hemiSky ?? 0x6b4fa8); this.hemi.groundColor.setHex(v.hemiGround ?? 0x0a0812); this.hemi.intensity = v.hemi ?? 0.35;
    this.key.intensity = v.key ?? 1.25;
    for (const sp of this.spots) sp.intensity = sp.userData.base * (v.spots ?? 1);
    for (const c of this.cones) c.visible = v.cones !== false || !!v.coneColor;
    this.coneMat.color.setHex(v.coneColor ?? 0xffffff); this.coneMat.opacity = v.coneOpacity ?? 1;
    this.dust.material.color.setHex(v.dustColor ?? 0xfff2dd); this.dust.visible = v.dust !== false;
    this.crowdHype = v.crowdHype || 0;
    this.ceilingG.visible = v.ceiling !== false;
    for (const g of this.screenGs || []) g.visible = v.screens !== false;
    this.gymKit.visible = !!v.gym; this.flagKit.visible = !!v.flags; this.showKit.visible = !!v.show;
    if (v.show) { this.ledMat.color.setHex(v.neon); this.beams.forEach((b, k) => b.material.color.setHex(k % 2 ? v.neon : (v.neon2 ?? 0xffffff))); }
    if (v.flags) this.flagMats.forEach((m, k) => m.color.setHex(v.flagCols[k % v.flagCols.length]));
    const st = v.stands || 'all';
    this.tribunes.forEach((t, k) => { t.visible = st === 'all' || (st === 'sides' && k >= 2) || (st === 'one' && k === 2); });
    this.seatMesh.visible = st === 'all';
    this.crowd.visible = this.crowdHeads.visible = this.crowdArms.visible = this.crowdFlags.visible = this.crowdPhones.visible = this.crowdHair.visible = st !== 'none';
    if (this.venue !== v) this.recolorCrowd(v.crowdPal);
    this.venue = v; this.updateCrowd(0);
    // décor à thème
    hideKits(); this.kit = arenaKit(v.kit, this.scene); if (this.kit) this.kit.g.visible = true;
    this.outerMat.roughness = v.outerRough ?? 0.9; this.outerMat.metalness = v.outerMetal ?? 0;
    const os = v.outerSize; this.outerMesh.scale.set(os ? os[0] / 90 : 1, os ? os[1] / 90 : 1, 1);
    this.standMat.color.setHex(v.standCol ?? 0x0b0a10);
    this.seatMesh.material.color.setHex(v.seats ?? 0x6a0f1c);
    this.outerMat.color.setHex(v.outer);
    this.drawFloor(v);
    this.drawBoards(v.boardBg ?? '#0c0c12', v.boardFg ?? '#ffffff', v.accent, v.items || ['@logo', 'PINGPONG']);
    this.drawTableTop(v.table ?? '#131a25');
    this.r.toneMappingExposure = v.exposure ?? 1.05;
    // reflets d'environnement aux couleurs de la salle (table, raquettes, métal)
    this.scene.environment = v.sky || v.kit ? this.arenaEnv(v) : this.defaultEnv;
    this.scene.environmentIntensity = v.envI ?? (v.kit ? 0.45 : 0.18);
    // étalonnage propre à la salle
    const gr = v.grade || {};
    this.grade.uniforms.uSat.value = gr.sat ?? 1.08; this.grade.uniforms.uCon.value = gr.con ?? 1.06; this.grade.uniforms.uVig.value = gr.vig ?? 0.38;
    this.grade.uniforms.uTint.value.set(...(gr.tint || [1, 1, 1]));
    this.bloom.strength = v.bloom ?? 0.5;
    this.lastScoreKey = '';
    this.venue = v;
  }
  arenaEnv(v) {
    const key = v.title + (v.kit || '');
    if (this.envCache[key]) return this.envCache[key];
    const es = new THREE.Scene();
    const stops = Array.isArray(v.sky) ? v.sky : ['#000004', '#05060c', '#0a0c18', '#141826'];
    const c = document.createElement('canvas'); c.width = 8; c.height = 256; const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, 128); stops.forEach((col, i) => grd.addColorStop(i / (stops.length - 1), col)); g.fillStyle = grd; g.fillRect(0, 0, 8, 128);
    g.fillStyle = '#' + (v.outer ?? 0x111111).toString(16).padStart(6, '0'); g.fillRect(0, 128, 8, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    es.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide })));
    // panneaux lumineux : projecteurs blancs au plafond + néons de la salle tout autour
    const add = (col, w, h, x, y, z, k = 1) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 1, 0); es.add(m); };
    add(0xffffff, 8, 8, 0, 20, 0, 2.5);
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; add(k % 2 ? v.neon : (v.neon2 ?? v.light ?? v.neon), 6, 1.2, Math.cos(a) * 18, 3, Math.sin(a) * 18, 2); }
    if (v.sunEnv) add(0xffc080, 14, 10, -6, 4, -40, 4);
    const tex = this.pmrem.fromScene(es, 0.02).texture;
    this.envCache[key] = tex; return tex;
  }
  setTheme(t) {
    this.mats.neon.emissive.setHex(t.neon);
    this.mats.purple.color.setHex(t.legs);
    for (const l of this.ambLights) l.color.setHex(t.light);
    for (const p of this.paddles) p.obj.userData.cap.color.setHex(t.neon), p.obj.userData.cap.emissive.setHex(t.neon);
    this.themeHex = '#' + t.neon.toString(16).padStart(6, '0');
    this.lastScoreKey = '';
  }

  updateCamera(game, dt) {
    // caméra plus serrée sur les balles de set / de match
    const baseFov = innerWidth / innerHeight < 1.3 ? 64 : 50;
    const wantFov = this.replayCam ? 38 : (this.pressure ? baseFov - 8 : baseFov);
    if (Math.abs(this.camera.fov - wantFov) > 0.05) { this.camera.fov += (wantFov - this.camera.fov) * Math.min(1, dt * 3); this.camera.updateProjectionMatrix(); }
    if (this.replayCam) {
      // caméra télé latérale qui suit la balle
      // caméra télé en hauteur, en biais derrière le joueur : jamais dans un joueur
      const b = game.ball.p;
      const ms = (game.players[game.me] || {}).side || 1;
      const tgt = V(2.6 + b.x * 0.15, 3.3, 5.6 * ms);
      const rdt = dt / (this.replaySpeed || 1);
      this.camPos.lerp(tgt, Math.min(1, rdt * 2));
      this.camLook.lerp(V(b.x * 0.35, 0.85, b.z * 0.45), Math.min(1, rdt * 4));
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);
      return;
    }
    if (this.celeb && this.celeb.cx !== undefined && !this.podiumOn) {
      // caméra de célébration : on tourne lentement autour du vainqueur, face à lui
      const C = this.celeb, s = C.side, u = Math.min(1, C.t / 1.4);
      const a = Math.sin(C.t * 0.22) * 0.9 + (1 - ease(u)) * 1.2;
      const R2 = lerp(5.5, 3.6, ease(u)), h = lerp(3, 1.25, ease(u));
      const tgt = V(C.cx + Math.sin(a) * R2, h, C.cz - s * Math.cos(a) * R2);
      this.camPos.lerp(tgt, Math.min(1, dt * 3));
      this.camLook.lerp(V(C.cx, 0.95 + (1 - ease(u)) * 0.3, C.cz + s * 0.6), Math.min(1, dt * 4));
      this.camera.position.copy(this.camPos); this.camera.lookAt(this.camLook);
      return;
    }
    if (this.podiumOn) {
      const a = this.time * 0.25, P = this.podiumPos;
      const A = 0.5 * Math.sin(this.time * 0.22);
      this.camera.position.set(P.x + Math.sin(A) * 6.2, 2.3 + Math.sin(this.time * 0.4) * 0.15, P.z + Math.cos(A) * 6.2);
      this.camera.lookAt(P.x, 1.55, P.z);
      return;
    }
    if (this.intro > 0 && game.players) {
      // présentation du match : la caméra plonge de haut en bas vers la table
      this.intro -= dt;
      const me = game.players[game.me], s = me.side;
      const u = ease(Math.min(1, Math.max(0, 1 - this.intro / 3.2)));
      const a = (1 - u) * 2.2 + Math.max(0, this.intro - 3.2) * 0.35;
      const Rr = lerp(9, Math.abs(me.z) + 1.7, u);
      this.camPos.set(Math.sin(a) * Rr, lerp(6.5, 1.95, u), s * Math.cos(a) * Rr);
      this.camLook.set(0, lerp(0.6, 0.68, u), lerp(0, -s * 0.9, u));
      this.camera.position.copy(this.camPos); this.camera.lookAt(this.camLook);
      return;
    }
    if (this.orbit) {
      const a = this.time * 0.06;
      this.camera.position.set(Math.sin(a) * 7, 3 + Math.sin(this.time * 0.2) * 0.5, Math.cos(a) * 7);
      this.camera.lookAt(0, 0.8, 0);
      return;
    }
    const me = game.players[game.me];
    const s = me.side;
    if (this.camMode === 'tv' || this.camMode === 'haute') {
      const tv = this.camMode === 'tv';
      // haute : plongée fixe derrière sa moitié de table ; TV : plan large de trois quarts, comme à la télé
      // (indépendantes de la profondeur du joueur : en double on recule souvent loin)
      const bx = game.ball.p.x;
      const target = tv ? V(3.4 + bx * 0.1, 3.6, s * 4.3) : V(me.x * 0.15, 4.3, s * 4.0);
      const look = tv ? V(bx * 0.2, 0.55, -s * 0.15) : V(bx * 0.1, 0.45, -s * 0.6);
      this.camPos.lerp(target, Math.min(1, dt * 4)); this.camLook.lerp(look, Math.min(1, dt * 4));
      this.camera.position.copy(this.camPos); this.camera.lookAt(this.camLook);
      return;
    }
    // vue à la première personne, juste derrière la raquette
    const target = V(me.x * 0.6, this.pressure ? 1.8 : 1.95, s * (Math.abs(me.z) + (this.pressure ? 1.25 : 1.7)));
    const look = V(me.x * 0.25 + game.ball.p.x * 0.08, 0.68, -s * 0.9);
    const k = Math.min(1, dt * 6);
    this.camPos.lerp(target, k);
    this.camLook.lerp(look, Math.min(1, dt * 4));
    this.camera.position.copy(this.camPos);
    if (this.shake > 0) {
      this.shake -= dt;
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.08;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.08;
    }
    this.camera.lookAt(this.camLook);
  }

  worldToScreen(p) {
    const v = new THREE.Vector3(p.x, p.y, p.z).project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight };
  }

  // position écran de la raquette d'un joueur (pour la jauge)
  paddleScreen(i) {
    const p = this.paddles[i].obj.position.clone();
    p.project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * innerWidth, y: (-p.y * 0.5 + 0.5) * innerHeight };
  }
}
