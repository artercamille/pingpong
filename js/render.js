// Rendu 3D : arène style circuit pro (sombre, néons violets), raquettes seules (vue à la 1re personne).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { TABLE, NET, BALL_R } from './physics.js';
import { IDEAL_REL } from './game.js';

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
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, 0.076, 0.082, 0, Math.PI * 2, false, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.0025, bevelEnabled: true, bevelThickness: 0.0008, bevelSize: 0.0012, bevelSegments: 2, curveSegments: 48 });
  const front = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: rubber, roughness: 0.6, sheen: 0.5, sheenColor: 0xffffff }));
  front.position.set(0, 0.115, 0.0008);
  const back = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0x0b0b0b, roughness: 0.65, sheen: 0.4 }));
  back.position.set(0, 0.115, -0.0043);
  const wood = new THREE.Mesh(new THREE.CylinderGeometry(0.0775, 0.0775, 0.0045, 48), new THREE.MeshStandardMaterial({ color: 0xd8b07a, roughness: 0.7 }));
  wood.rotation.x = Math.PI / 2; wood.position.set(0, 0.115, -0.0005); wood.scale.set(1, 1, 1.07);
  const hm = new THREE.MeshPhysicalMaterial({ color: 0x2a1c14, roughness: 0.4, clearcoat: 0.6 });
  const handle = new THREE.Mesh(new THREE.CapsuleGeometry(0.0125, 0.075, 4, 12), hm);
  handle.scale.set(1.05, 1, 0.85);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.017, 0.012, 16), new THREE.MeshStandardMaterial({ color: NEON, emissive: NEON, emissiveIntensity: 0.6 }));
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
  toWorld(pl, v) { return V(pl.x + pl.side * v.x, v.y, pl.z - pl.side * v.z); }

  update(dt, pl, game, i) {
    const t = this.target(pl, game, i);
    const k = Math.min(1, dt * (pl.swingT >= 0 ? 55 : 14));
    this.hand.lerp(t.hand, k);
    this.tilt = lerp(this.tilt, t.tilt, Math.min(1, dt * 18));
    this.out = lerp(this.out, t.out, Math.min(1, dt * 14));
    const p = this.toWorld(pl, this.hand);
    // axe du manche : vers le haut et vers l'extérieur
    const upL = V(this.out * 0.75, 0.55, 0.12).normalize();
    const up = V(pl.side * upL.x, upL.y, -pl.side * upL.z).normalize();
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
    const ballSide = (game.ball.p.x - pl.x) * pl.side >= -0.05;
    const poses = (fore, type) => {
      const dy = type === 'top' ? -0.16 : type === 'coupe' ? 0.14 : type === 'lob' ? -0.22 : 0;
      const tilt = type === 'top' ? 0.55 : type === 'coupe' ? -0.8 : type === 'lob' ? -0.2 : 0.15;
      if (fore) return { back: V(0.7, cy + dy, 0.05), contact: V(0.42, cy, 0.42), follow: V(-0.05, cy + 0.28 - dy, 0.5), tilt, out: 0.7 };
      return { back: V(-0.2, cy + dy * 0.6, 0.25), contact: V(0.05, cy, 0.46), follow: V(0.5, cy + 0.24 - dy, 0.48), tilt, out: -0.55 };
    };
    const serving = (game.state === 'serve' || game.state === 'toss') && game.server() === i;
    if (pl.swingT >= 0) {
      const P = poses(pl.swingFore, pl.swingType);
      const t = pl.swingT, tc = IDEAL_REL + 0.02;
      let hand;
      if (t < tc) hand = P.back.clone().lerp(P.contact, ease(t / tc));
      else if (t < 0.3) hand = P.contact.clone().lerp(P.follow, ease((t - tc) / (0.3 - tc)));
      else hand = P.follow.clone().lerp(ready.hand, ease(Math.min(1, (t - 0.3) / 0.12)));
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
    // garde : suit la balle latéralement quand elle arrive
    if (pr && pr.x !== undefined) {
      const fore = (pr.x - pl.x) * pl.side >= -0.15;
      return { hand: V(fore ? 0.4 : 0.0, THREE.MathUtils.clamp(cy, 0.85, 1.25), 0.42), tilt: 0.25, out: fore ? 0.6 : -0.45 };
    }
    return ready;
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
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.18;

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.03, 160);
    this.camPos = V(0, 1.6, 3);
    this.camLook = V(0, 0.8, 0);
    this.time = 0; this.shake = 0; this.cheer = 0;
    this.marks = [];
    this.lastScoreKey = '';

    this.buildLights();
    this.buildArena();
    this.buildTable();
    this.buildStands();
    this.buildScreens();
    this.buildBall();
    this.paddles = [new PaddleRig(this.scene, 0xd0102e), new PaddleRig(this.scene, 0xd0102e)];

    const rt = new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType });
    this.composer = new EffectComposer(this.r, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.55, 0.93);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
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
    s.add(new THREE.HemisphereLight(0x6b4fa8, 0x0a0812, 0.35));
    const key = new THREE.DirectionalLight(0xffffff, 1.25);
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
      sp.position.set(x, 11, z); sp.target.position.set(x * 0.3, 0, z * 0.4);
      s.add(sp, sp.target);
    }
    // ambiance violette dans les tribunes
    for (const [x, z] of [[-11, 0], [11, 0], [0, -15], [0, 15]]) {
      const p = new THREE.PointLight(0x8a3cff, 22, 26, 1.6);
      p.position.set(x, 6, z); s.add(p);
    }
  }

  // ---------------------------------------------------------------- arène
  buildArena() {
    const s = this.scene;
    // sol : anthracite mat avec logos blancs
    const floorTex = canvasTex(2048, 2048, (g, w, h) => {
      noiseFill(g, w, h, '#1d1f25', 8);
      const grd = g.createRadialGradient(w / 2, h / 2, 100, w / 2, h / 2, w * 0.6);
      grd.addColorStop(0, 'rgba(255,255,255,0.05)'); grd.addColorStop(1, 'rgba(0,0,0,0.35)');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      const sx = w / (COURT.hx * 2), sz = h / (COURT.hz * 2);
      logo(g, w * 0.78, h * 0.27, 46, Math.PI / 2, 0.85);
      logo(g, w * 0.22, h * 0.73, 46, -Math.PI / 2, 0.85);
      logo(g, w * 0.3, h * 0.12, 40, 0, 0.8);
      logo(g, w * 0.72, h * 0.88, 40, Math.PI, 0.8);
      g.font = '800 34px Arial'; g.fillStyle = 'rgba(255,255,255,0.75)'; g.textAlign = 'center';
      g.save(); g.translate(w * 0.7, h * 0.12); g.fillText('WORLD CHAMPIONSHIPS', 0, 0); g.restore();
      g.save(); g.translate(w * 0.3, h * 0.88); g.rotate(Math.PI); g.fillText('WORLD CHAMPIONSHIPS', 0, 0); g.restore();
      void sx; void sz;
    });
    const court = new THREE.Mesh(new THREE.PlaneGeometry(COURT.hx * 2, COURT.hz * 2),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.62, envMapIntensity: 0.5 }));
    court.rotation.x = -Math.PI / 2; court.position.y = 0.002; court.receiveShadow = true; s.add(court);
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ color: 0x0c0b12, roughness: 0.9 }));
    outer.rotation.x = -Math.PI / 2; outer.receiveShadow = true; s.add(outer);

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
    const neon = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: NEON, emissiveIntensity: 3 });
    const add = (w, x, z, ry) => {
      const g = new THREE.Group();
      const back = new THREE.Mesh(new THREE.BoxGeometry(w, 0.74, 0.06), frame); back.position.y = 0.37; back.receiveShadow = true; g.add(back);
      const t = this.boardTex.clone(); t.repeat.set(w / 9, 1); t.needsUpdate = true;
      const face = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.04, 0.56),
        new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.85, roughness: 0.5 }));
      face.position.set(0, 0.36, 0.031); g.add(face);
      this.boards = this.boards || []; this.boards.push(t);
      const line = new THREE.Mesh(new THREE.BoxGeometry(w, 0.018, 0.02), neon); line.position.set(0, 0.745, 0.02); g.add(line);
      const line2 = new THREE.Mesh(new THREE.BoxGeometry(w, 0.01, 0.02), neon); line2.position.set(0, 0.04, 0.035); g.add(line2);
      g.position.set(x, 0, z); g.rotation.y = ry; s.add(g);
    };
    add(COURT.hx * 2, 0, -COURT.hz, 0); add(COURT.hx * 2, 0, COURT.hz, Math.PI);
    add(COURT.hz * 2, -COURT.hx, 0, Math.PI / 2); add(COURT.hz * 2, COURT.hx, 0, -Math.PI / 2);

    // table de l'arbitre
    const dark = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.5, metalness: 0.4 });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.74, 1.1), dark); desk.position.set(3.2, 0.37, 0); desk.castShadow = true; s.add(desk);
    const deskLine = new THREE.Mesh(new THREE.BoxGeometry(0.51, 0.012, 1.11), neon); deskLine.position.set(3.2, 0.74, 0); s.add(deskLine);
    this.counterTex = canvasTex(512, 256, () => {});
    const cMat = new THREE.MeshBasicMaterial({ map: this.counterTex });
    const counter = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.42), [dark, dark, dark, dark, cMat, cMat]);
    counter.position.set(3.2, 0.86, 0); counter.rotation.y = Math.PI / 2; s.add(counter);
    // boîtes à serviettes
    for (const z of [-COURT.hz + 0.7, COURT.hz - 0.7]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.65, 0.35), dark); b.position.set(-COURT.hx + 0.5, 0.325, z); b.castShadow = true; s.add(b);
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.012, 0.36), neon); l.position.set(-COURT.hx + 0.5, 0.65, z); s.add(l);
    }
    // anneau lumineux au plafond + rampes
    const truss = new THREE.MeshStandardMaterial({ color: 0x15141c, roughness: 0.6, metalness: 0.6 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(7.5, 0.12, 8, 80), truss); ring.rotation.x = Math.PI / 2; ring.position.y = 11.5; s.add(ring);
    const ringNeon = new THREE.Mesh(new THREE.TorusGeometry(7.5, 0.035, 6, 120), neon); ringNeon.rotation.x = Math.PI / 2; ringNeon.position.y = 11.32; s.add(ringNeon);
    const lamp = new THREE.MeshBasicMaterial({ color: 0xfffaf0 });
    for (let k = 0; k < 16; k++) {
      const a = k / 16 * Math.PI * 2;
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.18, 14), lamp);
      l.position.set(Math.cos(a) * 7.5, 11.3, Math.sin(a) * 7.5); s.add(l);
    }
    const coneTex = canvasTex(64, 256, (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, 'rgba(255,250,240,0)'); grd.addColorStop(0.2, 'rgba(255,250,240,0.05)'); grd.addColorStop(1, 'rgba(255,250,240,0)');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    });
    const coneMat = new THREE.MeshBasicMaterial({ map: coneTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    for (const [x, z] of [[-2.2, -4], [2.2, -4], [-2.2, 4], [2.2, 4]]) {
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 2.8, 11, 24, 1, true), coneMat);
      cone.position.set(x * 0.8, 5.5, z * 0.8); s.add(cone);
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
    const purple = new THREE.MeshPhysicalMaterial({ color: PURPLE, roughness: 0.28, metalness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.15, envMapIntensity: 1.2 });
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
    const standMat = new THREE.MeshStandardMaterial({ color: 0x0b0a10, roughness: 0.95 });
    const spots = [];
    const tribunes = [
      { cx: 0, cz: -9.6, w: 20, ry: 0 }, { cx: 0, cz: 9.6, w: 20, ry: Math.PI },
      { cx: -6.6, cz: 0, w: 17, ry: Math.PI / 2 }, { cx: 6.6, cz: 0, w: 17, ry: -Math.PI / 2 },
    ];
    for (const t of tribunes) {
      const grp = new THREE.Group();
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
    for (const sp of spots) (Math.random() < 0.72 ? people : seats).push(sp);
    // public
    const bodyGeo = new THREE.CapsuleGeometry(0.19, 0.32, 3, 8);
    const headGeo = new THREE.SphereGeometry(0.1, 10, 8);
    this.crowd = new THREE.InstancedMesh(bodyGeo, new THREE.MeshStandardMaterial({ roughness: 0.9, envMapIntensity: 0.05 }), people.length);
    this.crowdHeads = new THREE.InstancedMesh(headGeo, new THREE.MeshStandardMaterial({ roughness: 0.8, envMapIntensity: 0.05 }), people.length);
    const pal = [0x2b2b3a, 0x3a3f5c, 0x5a1f2b, 0x1e3a6e, 0x4a4a4a, 0x6b2a8a, 0x2a5a4a, 0x8a8a8a, 0x1a1a1a, 0x7a5a2a];
    const skins = [0xf1c7a5, 0xd8a27f, 0x8d5524, 0xc68642, 0xffdbac, 0x5c3a21];
    const col = new THREE.Color();
    this.crowdItems = people.map((st, i) => {
      const w = V(st.lx, st.ly + 0.34, st.lz).applyMatrix4(st.grp.matrixWorld);
      this.crowd.setColorAt(i, col.setHex(pal[Math.floor(Math.random() * pal.length)]).multiplyScalar(0.35 + Math.random() * 0.25));
      this.crowdHeads.setColorAt(i, col.setHex(skins[Math.floor(Math.random() * skins.length)]).multiplyScalar(0.4));
      return { x: w.x, y: w.y, z: w.z, ph: Math.random() * 6.28, sp: 0.7 + Math.random() * 0.6 };
    });
    // sièges rouges vides
    const seatGeo = new THREE.BoxGeometry(0.44, 0.42, 0.4);
    const seatMesh = new THREE.InstancedMesh(seatGeo, new THREE.MeshStandardMaterial({ color: 0x6a0f1c, roughness: 0.7 }), seats.length);
    const d = new THREE.Object3D();
    seats.forEach((st, i) => {
      const w = V(st.lx, st.ly + 0.21, st.lz).applyMatrix4(st.grp.matrixWorld);
      d.position.copy(w); d.rotation.y = st.ry; d.updateMatrix(); seatMesh.setMatrixAt(i, d.matrix);
    });
    s.add(this.crowd, this.crowdHeads, seatMesh);
    this.dummy = new THREE.Object3D();
    this.updateCrowd(0);
  }

  updateCrowd(dt) {
    this.cheer = Math.max(0, this.cheer - dt * 0.4);
    const d = this.dummy, t = this.time, items = this.crowdItems;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const jump = this.cheer > 0.02 ? Math.max(0, Math.sin(t * 8 * it.sp + it.ph)) * 0.18 * Math.min(1, this.cheer) : Math.sin(t * 1.1 * it.sp + it.ph) * 0.01;
      d.position.set(it.x, it.y + jump, it.z); d.updateMatrix();
      this.crowd.setMatrixAt(i, d.matrix);
      d.position.y += 0.37; d.updateMatrix();
      this.crowdHeads.setMatrixAt(i, d.matrix);
    }
    this.crowd.instanceMatrix.needsUpdate = true;
    this.crowdHeads.instanceMatrix.needsUpdate = true;
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
      g.position.set(0, 9, z); g.rotation.y = ry; this.scene.add(g);
    }
    this.drawScreen(null);
  }

  drawScreen(game) {
    const g = this.screenCanvas.getContext('2d'), w = 1024, h = 512;
    const grd = g.createLinearGradient(0, 0, w, h); grd.addColorStop(0, '#1a0b2e'); grd.addColorStop(1, '#07060d');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d23cff'; g.fillRect(0, h - 10, w, 10);
    logo(g, w / 2 + 40, 80, 50, 0, 1);
    g.fillStyle = '#b9a8e6'; g.font = '700 26px Arial'; g.textAlign = 'center'; g.fillText('WORLD CHAMPIONSHIPS', w / 2, 140);
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
    this.trail = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: 'attribute float alpha; varying float va; void main(){ va = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying float va; void main(){ gl_FragColor = vec4(vec3(0.85,0.7,1.0) * va * 0.7, 1.0); }',
    }));
    this.trail.frustumCulled = false;
    this.scene.add(this.trail);
  }

  // ---------------------------------------------------------------- image
  update(game, dt) {
    this.time += dt;
    const b = game.ball.p;
    this.ballMesh.position.set(b.x, b.y, b.z);
    this.glow.position.copy(this.ballMesh.position);
    this.ballMesh.visible = this.glow.visible = game.state !== 'between';
    this.updateTrail(game);

    if (game.fx.length > 8) game.fx.splice(0, game.fx.length - 8);
    for (const f of game.fx) {
      if (f.type === 'bounce') this.addMark(f.x, f.z);
      if (f.type === 'cheer') this.cheer = f.big ? 1.4 : 0.8;
      if (f.type === 'hit' && f.smash) this.shake = 0.25;
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
    const key = JSON.stringify([game.match.score, game.match.sets, game.names]);
    if (key !== this.lastScoreKey) { this.lastScoreKey = key; this.drawScreen(game); }
    for (const t of this.boards) t.offset.x = (this.time * 0.015) % 1;
    this.updateAim(game);
    this.updateCrowd(dt);
    this.updateCamera(game, dt);
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
      const l = Math.hypot(wx, wy, wz) || 1, width = BALL_R * 0.9 * (i / this.trailN);
      wx = wx / l * width; wy = wy / l * width; wz = wz / l * width;
      pos[i * 6] = px + wx; pos[i * 6 + 1] = py + wy; pos[i * 6 + 2] = pz + wz;
      pos[i * 6 + 3] = px - wx; pos[i * 6 + 4] = py - wy; pos[i * 6 + 5] = pz - wz;
    }
    this.trail.geometry.attributes.position.needsUpdate = true;
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
    const show = (me.charging && !serve) || serve;
    this.aimRing.visible = show;
    if (!show) return;
    const s = me.side;
    const ax = Math.max(-1, Math.min(1, me.aimX)), ay = Math.max(-1, Math.min(1, me.aimY));
    const depth = serve ? 0.8 + ay * 0.33 : me.chargeType === 'lob' ? 1.05 + ay * 0.15 : 0.92 + ay * 0.3;
    this.aimRing.position.set(ax * 0.6 * s, TABLE.H + 0.004, -s * depth);
    this.aimRing.scale.setScalar(1 + Math.sin(this.time * 10) * 0.08);
  }

  updateCamera(game, dt) {
    if (this.orbit) {
      const a = this.time * 0.06;
      this.camera.position.set(Math.sin(a) * 7, 3 + Math.sin(this.time * 0.2) * 0.5, Math.cos(a) * 7);
      this.camera.lookAt(0, 0.8, 0);
      return;
    }
    // vue à la première personne, juste derrière la raquette
    const me = game.players[game.me];
    const s = me.side;
    const target = V(me.x * 0.6, 1.95, s * (Math.abs(me.z) + 1.7));
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

  // position écran de la raquette d'un joueur (pour la jauge)
  paddleScreen(i) {
    const p = this.paddles[i].obj.position.clone();
    p.project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * innerWidth, y: (-p.y * 0.5 + 0.5) * innerHeight };
  }
}
