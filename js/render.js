// Rendu 3D : salle des championnats du monde, athlètes animés, balle, caméra TV, post-traitement.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { TABLE, NET, BALL_R } from './physics.js';
import { IDEAL_REL } from './game.js';

const KITS = [
  { shirt: 0x1f5fe0, accent: 0xffffff, shorts: 0x0d1b3d, sock: 0xffffff, shoe: 0xf2f2f2, skin: 0xf0c4a2, hair: 0xc8642a },
  { shirt: 0xd8253a, accent: 0x111111, shorts: 0x151515, sock: 0x151515, shoe: 0x1a1a1a, skin: 0xc98d68, hair: 0x2a1a10 },
];
const COURT = { hx: 3.6, hz: 7 };
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);

// ------------------------------------------------------------------ textures
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
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
}

// ------------------------------------------------------------------ athlète
class Athlete {
  constructor(gltf, kit, scene) {
    this.root = SkeletonUtils.clone(gltf.scene);
    this.kit = kit;
    const uniforms = {};
    for (const k of ['shirt', 'accent', 'shorts', 'sock', 'shoe', 'skin', 'hair']) uniforms['u_' + k] = { value: new THREE.Color(kit[k]) };
    this.root.traverse(o => {
      if (o.isSkinnedMesh) {
        o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
        const joints = /Joints/.test(o.name);
        const m = new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0, envMapIntensity: 0.6 });
        m.onBeforeCompile = sh => {
          Object.assign(sh.uniforms, uniforms);
          sh.vertexShader = sh.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vBP;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBP = position;');
          sh.fragmentShader = sh.fragmentShader
            .replace('#include <common>', `#include <common>
varying vec3 vBP;
uniform vec3 u_shirt, u_accent, u_shorts, u_sock, u_shoe, u_skin, u_hair;`)
            .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
vec3 c = u_skin; float y = vBP.y; float ax = abs(vBP.x);
if (y < 0.115) c = u_shoe;
else if (y < 0.30) c = u_sock;
else if (y > 0.66 && y < 1.03 && ax < 0.3) c = u_shorts;
if (y >= 1.0 && y < 1.535 && ax < 0.305) {
  c = u_shirt;
  if (ax > 0.272) c = u_accent;                       // bord des manches
  if (y > 1.06 && y < 1.40 && ax > 0.13 && ax < 0.155 && ax < 0.2) c = mix(c, u_accent, 0.85); // bandes latérales
}
if (y > 1.505 && y < 1.53 && ax < 0.09) c = u_accent; // col
if (y > 1.66 && (vBP.z < 0.05 || y > 1.735)) c = u_hair;
${joints ? 'c *= 0.82;' : ''}
vec4 diffuseColor = vec4( c, opacity );`);
        };
        o.material = m;
      }
    });
    this.bones = {};
    this.root.traverse(o => { if (o.isBone) this.bones[o.name.replace('mixamorig', '')] = o; });
    this.mixer = new THREE.AnimationMixer(this.root);
    const clip = n => gltf.animations.find(a => a.name === n);
    this.actions = {};
    for (const n of ['idle', 'walk', 'run']) {
      const a = this.mixer.clipAction(clip(n));
      a.play(); a.setEffectiveWeight(n === 'idle' ? 1 : 0);
      this.actions[n] = a;
    }
    this.paddle = buildPaddle();
    scene.add(this.root);
    scene.add(this.paddle);
    this.hand = V(0.3, 1.0, 0.3);
    this.lhand = V(-0.22, 1.05, 0.2);
    this.speed = 0;
    this.last = null;
    this.twist = 0;
    this.lean = 0;
    this.tmp = { a: V(), b: V(), c: V(), q: new THREE.Quaternion(), q2: new THREE.Quaternion(), m: new THREE.Matrix4() };
  }

  // repère local joueur (x = sa droite, z = vers le filet) -> monde
  toWorld(v, out) {
    return out.set(-v.x, v.y, v.z).applyMatrix4(this.root.matrixWorld);
  }

  aimBone(bone, child, target) {
    const { a, b, c, q, q2 } = this.tmp;
    bone.getWorldPosition(a); child.getWorldPosition(b);
    b.sub(a).normalize();
    c.copy(target).sub(a).normalize();
    q.setFromUnitVectors(b, c);
    bone.getWorldQuaternion(q2);
    q2.premultiply(q);
    bone.parent.getWorldQuaternion(q);
    bone.quaternion.copy(q.invert().multiply(q2));
    bone.updateMatrixWorld(true);
  }

  // IK analytique à deux os avec vecteur de pôle
  ik(upper, lower, end, targetW, poleW) {
    const S = V(), E0 = V(), H = V();
    upper.getWorldPosition(S); lower.getWorldPosition(E0); end.getWorldPosition(H);
    const la = S.distanceTo(E0), lb = E0.distanceTo(H);
    const T = targetW.clone();
    let d = T.distanceTo(S);
    const maxd = (la + lb) * 0.995;
    const dir = T.clone().sub(S).normalize();
    if (d > maxd) { d = maxd; T.copy(S).addScaledVector(dir, d); }
    d = Math.max(d, Math.abs(la - lb) + 0.01);
    const x = (la * la - lb * lb + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, la * la - x * x));
    const p = poleW.clone().addScaledVector(dir, -poleW.dot(dir)).normalize();
    const E = S.clone().addScaledVector(dir, x).addScaledVector(p, h);
    this.aimBone(upper, lower, E);
    this.aimBone(lower, end, T);
  }

  update(dt, pl, game, i) {
    const R = this.root;
    R.position.set(pl.x, 0, pl.z);
    R.rotation.y = pl.side > 0 ? Math.PI : 0;
    // vitesse de déplacement -> idle / marche / course
    if (this.last) {
      const v = Math.hypot(pl.x - this.last.x, pl.z - this.last.z) / Math.max(dt, 1e-3);
      this.speed = lerp(this.speed, v, Math.min(1, dt * 8));
    }
    this.last = { x: pl.x, z: pl.z };
    const s = this.speed;
    const wIdle = Math.max(0, 1 - s / 1.2), wRun = Math.min(1, Math.max(0, (s - 1.6) / 1.4));
    const wWalk = Math.max(0, 1 - wIdle - wRun);
    this.actions.idle.setEffectiveWeight(wIdle);
    this.actions.walk.setEffectiveWeight(wWalk);
    this.actions.run.setEffectiveWeight(wRun);
    this.actions.walk.timeScale = 0.8 + s * 0.5;
    this.actions.run.timeScale = 0.7 + s * 0.15;
    this.mixer.update(dt);
    R.updateMatrixWorld(true);

    // ---- posture du haut du corps
    const B = this.bones;
    const target = this.computeHand(pl, game, i);
    const k = Math.min(1, dt * (pl.swingT >= 0 ? 60 : 16));
    this.hand.lerp(target.hand, k);
    this.twist = lerp(this.twist, target.twist, Math.min(1, dt * 14));
    this.lean = lerp(this.lean, target.lean, Math.min(1, dt * 8));
    if (B.Spine) B.Spine.rotation.x += 0.2 + this.lean;
    if (B.Spine1) { B.Spine1.rotation.y += this.twist * 0.5; B.Spine1.rotation.x += 0.08; }
    if (B.Spine2) B.Spine2.rotation.y += this.twist * 0.5;
    R.updateMatrixWorld(true);
    // regard vers la balle
    if (B.Head) {
      const hb = this.tmp.a; B.Head.getWorldPosition(hb);
      const bp = game.ball.p;
      const yawW = Math.atan2(bp.x - hb.x, bp.z - hb.z);
      let rel = yawW - R.rotation.y; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      B.Head.rotation.y += THREE.MathUtils.clamp(rel, -0.9, 0.9) * 0.7;
      B.Head.updateMatrixWorld(true);
    }
    // bras droit (raquette)
    const hw = this.toWorld(this.hand, V());
    const pole = this.toWorld(V(0.9, 0.4, -0.6), V()).sub(R.position);
    pole.y = -0.8;
    this.ik(B.RightArm, B.RightForeArm, B.RightHand, hw, pole.normalize());
    // bras gauche
    this.lhand.lerp(target.lhand, Math.min(1, dt * 12));
    const lw = this.toWorld(this.lhand, V());
    const lpole = this.toWorld(V(-0.9, 0.3, -0.5), V()).sub(R.position); lpole.y = -0.8;
    this.ik(B.LeftArm, B.LeftForeArm, B.LeftHand, lw, lpole.normalize());

    // raquette dans la main
    const hand = B.RightHand.getWorldPosition(V());
    const fore = B.RightForeArm.getWorldPosition(V());
    const up = hand.clone().sub(fore).normalize();
    const fwdLocal = V(0, 0, 1).applyAxisAngle(V(1, 0, 0), -target.tilt);
    const fwd = this.toWorld(fwdLocal, V()).sub(R.position).normalize();
    const n = fwd.addScaledVector(up, -fwd.dot(up)).normalize();
    const x = V().crossVectors(up, n).normalize();
    const m = this.tmp.m.makeBasis(x, up, n);
    this.paddle.quaternion.setFromRotationMatrix(m);
    this.paddle.position.copy(hand).addScaledVector(up, 0.06);
  }

  computeHand(pl, game, i) {
    const pr = game.pred[i];
    const cy = THREE.MathUtils.clamp(pr && pr.y ? pr.y - 0.0 : 0.98, 0.78, 1.55);
    const ready = { hand: V(0.3, 1.0, 0.32), lhand: V(-0.24, 1.02, 0.22), twist: 0, lean: 0.12, tilt: 0.25 };
    const ballSide = (game.ball.p.x - pl.x) * pl.side >= -0.05;
    const poses = (fore, type) => {
      const dy = type === 'top' ? -0.16 : type === 'coupe' ? 0.14 : type === 'lob' ? -0.22 : 0;
      const tilt = type === 'top' ? 0.55 : type === 'coupe' ? -0.75 : type === 'lob' ? -0.2 : 0.15;
      if (fore) return {
        back: V(0.66, cy + dy, -0.12), contact: V(0.44, cy, 0.4), follow: V(-0.05, cy + 0.3 - dy * 1.2, 0.36),
        twistBack: -0.7, twistFollow: 0.55, tilt,
      };
      return {
        back: V(-0.12, cy + dy * 0.6, 0.16), contact: V(0.1, cy, 0.44), follow: V(0.55, cy + 0.26 - dy, 0.34),
        twistBack: 0.55, twistFollow: -0.35, tilt,
      };
    };
    const serving = (game.state === 'serve' || game.state === 'toss') && game.server() === i;
    let out = ready;
    if (pl.swingT >= 0) {
      const P = poses(pl.swingFore, pl.swingType);
      const t = pl.swingT, tc = IDEAL_REL + 0.02;
      let hand, twist;
      if (t < tc) { const u = ease(t / tc); hand = P.back.clone().lerp(P.contact, u); twist = lerp(P.twistBack, 0, u); }
      else if (t < 0.3) { const u = ease((t - tc) / (0.3 - tc)); hand = P.contact.clone().lerp(P.follow, u); twist = lerp(0, P.twistFollow, u); }
      else { const u = ease(Math.min(1, (t - 0.3) / 0.12)); hand = P.follow.clone().lerp(ready.hand, u); twist = lerp(P.twistFollow, 0, u); }
      out = { hand, lhand: V(-0.3, 1.05, 0.25), twist, lean: 0.18, tilt: P.tilt };
    } else if (pl.charging && !(serving && game.state === 'toss')) {
      const P = poses(ballSide, pl.chargeType);
      const c = Math.min(1, pl.chargeT / 0.5);
      out = { hand: ready.hand.clone().lerp(P.back, 0.5 + 0.5 * ease(c)), lhand: V(-0.3, 1.05, 0.25), twist: P.twistBack * (0.5 + 0.5 * c), lean: 0.18, tilt: P.tilt };
    }
    if (serving) {
      const lp = this.worldToLocal(game.ball.p);
      if (game.state === 'serve') out = { ...out, hand: V(0.42, 1.0, 0.0), lhand: lp, twist: -0.35, tilt: 0.3 };
      else {
        out = { ...out, lhand: V(-0.28, 1.25, 0.25) };
        if (pl.swingT < 0) out = { ...out, hand: V(0.55, 1.05, -0.1), twist: -0.5, tilt: pl.chargeType === 'coupe' ? -0.75 : 0.4 };
      }
    }
    return out;
  }

  worldToLocal(p) {
    const v = V(p.x, p.y, p.z);
    const inv = this.tmp.m.copy(this.root.matrixWorld).invert();
    v.applyMatrix4(inv);
    return V(-v.x, v.y, v.z);
  }
}

function buildPaddle() {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, 0.076, 0.082, 0, Math.PI * 2, false, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.003, bevelEnabled: true, bevelThickness: 0.0008, bevelSize: 0.0012, bevelSegments: 2, curveSegments: 40 });
  const red = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.55 }));
  red.position.set(0, 0.11, 0.0005);
  const black = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.6 }));
  black.position.set(0, 0.11, -0.0045);
  const wood = new THREE.Mesh(new THREE.CylinderGeometry(0.0775, 0.0775, 0.0045, 40), new THREE.MeshStandardMaterial({ color: 0xc89b62, roughness: 0.7 }));
  wood.rotation.x = Math.PI / 2; wood.position.set(0, 0.11, -0.0005); wood.scale.set(1, 1, 1.07);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.1, 0.022), new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.65 }));
  handle.position.set(0, 0.0, 0);
  const flare = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.02, 12), handle.material);
  flare.position.set(0, -0.055, 0);
  for (const o of [red, black, wood, handle, flare]) { o.castShadow = true; g.add(o); }
  return g;
}

// ------------------------------------------------------------------ rendu
export class Renderer {
  constructor(canvas) {
    this.r = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.r.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.r.shadowMap.enabled = true;
    this.r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.r.toneMapping = THREE.ACESFilmicToneMapping;
    this.r.toneMappingExposure = 1.0;
    this.r.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x04060c);
    this.scene.fog = new THREE.FogExp2(0x04060c, 0.018);
    const pm = new THREE.PMREMGenerator(this.r);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.22;

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.05, 160);
    this.camPos = V(0, 3, 6);
    this.camLook = V(0, 0.8, 0);
    this.time = 0;
    this.shake = 0;
    this.cheer = 0;
    this.marks = [];
    this.lastScoreKey = '';

    this.buildLights();
    this.buildArena();
    this.buildTable();
    this.buildStands();
    this.buildScreens();
    this.buildBall();

    const rt = new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType });
    this.composer = new EffectComposer(this.r, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.5, 0.93);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.resize();
    addEventListener('resize', () => this.resize());
  }

  async load(onProgress) {
    const gltf = await new GLTFLoader().loadAsync('assets/athlete.glb', e => onProgress && e.total && onProgress(e.loaded / e.total));
    this.athletes = [new Athlete(gltf, KITS[0], this.scene), new Athlete(gltf, KITS[1], this.scene)];
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.r.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------- décor
  buildLights() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight(0x9fb4ff, 0x1a1010, 0.25));
    const key = new THREE.DirectionalLight(0xfff4e6, 1.9);
    key.position.set(1.2, 12, 2.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const c = key.shadow.camera;
    c.left = -4.2; c.right = 4.2; c.top = 7.5; c.bottom = -7.5; c.near = 4; c.far = 20;
    key.shadow.bias = -0.0003; key.shadow.normalBias = 0.015; key.shadow.radius = 3;
    s.add(key);
    for (const [x, z] of [[-3, -4.5], [3, -4.5], [-3, 4.5], [3, 4.5]]) {
      const sp = new THREE.SpotLight(0xffffff, 38, 22, 0.42, 0.6, 1.6);
      sp.position.set(x, 11, z); sp.target.position.set(x * 0.2, 0.7, z * 0.25);
      s.add(sp, sp.target);
    }
    // lumières d'ambiance des tribunes
    for (const [x, z, col] of [[-12, 0, 0x3355ff], [12, 0, 0x3355ff], [0, -16, 0xff3355], [0, 16, 0xff3355]]) {
      const p = new THREE.PointLight(col, 14, 30, 1.8);
      p.position.set(x, 7, z); s.add(p);
    }
  }

  buildArena() {
    const s = this.scene;
    // sol extérieur
    const outerTex = canvasTex(512, 512, (g, w, h) => noiseFill(g, w, h, '#0b1226', 10));
    outerTex.wrapS = outerTex.wrapT = THREE.RepeatWrapping; outerTex.repeat.set(10, 10);
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ map: outerTex, roughness: 0.85 }));
    outer.rotation.x = -Math.PI / 2; outer.receiveShadow = true; s.add(outer);
    // aire de jeu (sol sportif)
    const courtTex = canvasTex(1024, 2048, (g, w, h) => {
      noiseFill(g, w, h, '#7e1f2a', 14);
      const grd = g.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, h * 0.7);
      grd.addColorStop(0, 'rgba(255,255,255,0.06)'); grd.addColorStop(1, 'rgba(0,0,0,0.25)');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      g.save(); g.translate(w / 2, h * 0.86); g.globalAlpha = 0.12; g.fillStyle = '#fff';
      g.font = '900 120px Arial Black, Arial'; g.textAlign = 'center'; g.fillText('PINGPONG', 0, 0); g.restore();
      g.save(); g.translate(w / 2, h * 0.14); g.rotate(Math.PI); g.globalAlpha = 0.12; g.fillStyle = '#fff';
      g.font = '900 120px Arial Black, Arial'; g.textAlign = 'center'; g.fillText('PINGPONG', 0, 0); g.restore();
    });
    const court = new THREE.Mesh(new THREE.PlaneGeometry(COURT.hx * 2, COURT.hz * 2),
      new THREE.MeshStandardMaterial({ map: courtTex, roughness: 0.55, metalness: 0.0, envMapIntensity: 0.4 }));
    court.rotation.x = -Math.PI / 2; court.position.y = 0.003; court.receiveShadow = true; s.add(court);

    // panneaux LED autour de l'aire
    this.ledTex = canvasTex(4096, 128, (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#0a1a4a'); grd.addColorStop(1, '#06102e');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      const items = ['PINGPONG', 'WORLD CHAMPIONSHIPS', 'PINGPONG', 'FINALE', 'PINGPONG', 'WORLD CHAMPIONSHIPS'];
      g.font = 'italic 900 70px Arial Black, Arial'; g.textBaseline = 'middle';
      let x = 40;
      items.forEach((t, i) => {
        g.fillStyle = i % 2 ? '#ffffff' : '#ffb43c'; g.fillText(t, x, h / 2 + 4);
        x += g.measureText(t).width + 60;
        g.fillStyle = '#3d6bff'; g.fillRect(x - 38, h / 2 - 6, 16, 16); x += 10;
      });
    });
    this.ledTex.wrapS = THREE.RepeatWrapping;
    const ledMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: this.ledTex, emissiveIntensity: 1.6, roughness: 0.4 });
    const frame = new THREE.MeshStandardMaterial({ color: 0x0b1020, roughness: 0.5, metalness: 0.3 });
    const add = (w, x, z, ry) => {
      const g = new THREE.Group();
      const back = new THREE.Mesh(new THREE.BoxGeometry(w, 0.78, 0.08), frame); back.position.y = 0.39; g.add(back);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.06, 0.62), ledMat); scr.position.set(0, 0.42, 0.041); g.add(scr);
      back.castShadow = true; back.receiveShadow = true;
      g.position.set(x, 0, z); g.rotation.y = ry; s.add(g);
    };
    add(COURT.hx * 2, 0, -COURT.hz, 0); add(COURT.hx * 2, 0, COURT.hz, Math.PI);
    add(COURT.hz * 2, -COURT.hx, 0, Math.PI / 2); add(COURT.hz * 2, COURT.hx, 0, -Math.PI / 2);

    // chaise d'arbitre et table de marque
    const dark = new THREE.MeshStandardMaterial({ color: 0x141a2c, roughness: 0.5, metalness: 0.4 });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 1.2), dark); desk.position.set(2.75, 0.375, 0); desk.castShadow = true; s.add(desk);
    const chair = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 0.45), dark); seat.position.y = 0.5; chair.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.45), dark); back.position.set(0.2, 0.78, 0); chair.add(back);
    for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.5, 0.03), dark); l.position.set(dx, 0.25, dz); chair.add(l);
    }
    chair.position.set(3.2, 0, 0); s.add(chair);
    // compteur de score côté table
    this.counterTex = canvasTex(512, 256, () => {});
    const counter = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.42),
      [dark, dark, dark, dark, new THREE.MeshBasicMaterial({ map: this.counterTex }), new THREE.MeshBasicMaterial({ map: this.counterTex })]);
    counter.position.set(2.75, 0.86, 0); counter.rotation.y = Math.PI / 2; s.add(counter);
    // boîtes à serviettes
    const towel = new THREE.MeshStandardMaterial({ color: 0x1f3c9a, roughness: 0.6 });
    for (const z of [-COURT.hz + 0.6, COURT.hz - 0.6]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.6, 0.35), towel); b.position.set(-COURT.hx + 0.4, 0.3, z); b.castShadow = true; s.add(b);
    }

    // charpente et projecteurs
    const truss = new THREE.MeshStandardMaterial({ color: 0x1a1f2e, roughness: 0.6, metalness: 0.7 });
    for (const x of [-6, -2, 2, 6]) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 34), truss); t.position.set(x, 11.5, 0); s.add(t); }
    for (const z of [-12, -6, 0, 6, 12]) { const t = new THREE.Mesh(new THREE.BoxGeometry(26, 0.25, 0.25), truss); t.position.set(0, 11.5, z); s.add(t); }
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const coneTex = canvasTex(64, 256, (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, 'rgba(255,250,235,0.0)'); grd.addColorStop(0.15, 'rgba(255,250,235,0.07)'); grd.addColorStop(1, 'rgba(255,250,235,0.0)');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    });
    const coneMat = new THREE.MeshBasicMaterial({ map: coneTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    for (const [x, z] of [[-2, -3], [2, -3], [-2, 3], [2, 3], [-2, 0], [2, 0]]) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 20), lampMat);
      l.position.set(x, 11.2, z); s.add(l);
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 2.4, 10.5, 24, 1, true), coneMat);
      cone.position.set(x * 0.85, 5.9, z * 0.85); cone.rotation.z = x * 0.012; s.add(cone);
    }
  }

  buildTable() {
    const s = this.scene, T = TABLE;
    const g = new THREE.Group();
    const topTex = canvasTex(512, 1024, (c, w, h) => {
      noiseFill(c, w, h, '#1a3f96', 6);
      c.fillStyle = '#ffffff';
      const lw = 0.02 / T.W * w;
      c.fillRect(0, 0, lw, h); c.fillRect(w - lw, 0, lw, h);
      const lh = 0.02 / T.L * h;
      c.fillRect(0, 0, w, lh); c.fillRect(0, h - lh, w, lh);
      c.fillRect(w / 2 - 1.5, 0, 3, h);
    });
    const topMat = new THREE.MeshPhysicalMaterial({ map: topTex, roughness: 0.5, clearcoat: 0.2, clearcoatRoughness: 0.5, envMapIntensity: 0.5 });
    const edge = new THREE.MeshStandardMaterial({ color: 0x14306f, roughness: 0.5 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(T.W, 0.025, T.L), [edge, edge, topMat, edge, edge, edge]);
    top.position.y = T.H - 0.0125; top.castShadow = true; top.receiveShadow = true; g.add(top);
    // pieds façon table de compétition
    const leg = new THREE.MeshStandardMaterial({ color: 0x0d1a3d, roughness: 0.35, metalness: 0.5 });
    const apronTex = canvasTex(1024, 64, (c, w, h) => {
      c.fillStyle = '#0d1a3d'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffffff'; c.font = 'italic 900 40px Arial Black, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('PINGPONG', w / 2, h / 2 + 2);
    });
    for (const sz of [-1, 1]) {
      const frame = new THREE.Group();
      const a = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.06), leg); a.position.y = 0.06; frame.add(a);
      for (const sx of [-1, 1]) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.06), leg);
        p.position.set(sx * 0.42, 0.38, 0); p.rotation.z = sx * 0.18; frame.add(p);
      }
      frame.position.z = sz * 0.85;
      frame.children.forEach(o => { o.castShadow = true; });
      g.add(frame);
    }
    const apron = new THREE.Mesh(new THREE.BoxGeometry(T.W - 0.06, 0.07, T.L - 0.06),
      [new THREE.MeshStandardMaterial({ map: apronTex }), new THREE.MeshStandardMaterial({ map: apronTex }), leg, leg, leg, leg]);
    apron.position.y = T.H - 0.06; g.add(apron);

    // filet
    const netTex = canvasTex(256, 32, (c, w, h) => {
      c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(15,20,40,0.95)'; c.lineWidth = 1.2;
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
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.025, NET.H + 0.03, 0.04), leg);
      post.position.set(sx * NET.halfW, T.H + NET.H / 2 + 0.005, 0); post.castShadow = true; g.add(post);
    }
    s.add(g);

    this.aimRing = new THREE.Mesh(new THREE.RingGeometry(0.055, 0.075, 40),
      new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.9, depthWrite: false }));
    this.aimRing.rotation.x = -Math.PI / 2; this.aimRing.visible = false; s.add(this.aimRing);
  }

  buildStands() {
    // gradins : 4 tribunes inclinées avec public instancié
    const s = this.scene;
    const standMat = new THREE.MeshStandardMaterial({ color: 0x0a0d16, roughness: 0.95 });
    const seats = [];
    const tribunes = [
      { cx: 0, cz: -9.2, w: 18, ry: 0 }, { cx: 0, cz: 9.2, w: 18, ry: Math.PI },
      { cx: -6.2, cz: 0, w: 15, ry: Math.PI / 2 }, { cx: 6.2, cz: 0, w: 15, ry: -Math.PI / 2 },
    ];
    for (const t of tribunes) {
      const grp = new THREE.Group();
      for (let r = 0; r < 14; r++) {
        const h = 0.5 + r * 0.42, d = r * 0.85;
        const step = new THREE.Mesh(new THREE.BoxGeometry(t.w + r * 1.2, 0.42, 0.85), standMat);
        step.position.set(0, h - 0.21, -d); step.receiveShadow = true; grp.add(step);
        const n = Math.floor((t.w + r * 1.2) / 0.55);
        for (let k = 0; k < n; k++) {
          if (Math.random() < 0.08) continue;
          seats.push({ grp, lx: (k - n / 2) * 0.55 + (Math.random() - 0.5) * 0.08, ly: h, lz: -d - 0.1 });
        }
      }
      grp.position.set(t.cx, 0, t.cz); grp.rotation.y = t.ry; s.add(grp);
      grp.updateMatrixWorld(true);
    }
    const bodyGeo = new THREE.CapsuleGeometry(0.19, 0.34, 3, 8);
    const headGeo = new THREE.SphereGeometry(0.105, 10, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ roughness: 0.9, envMapIntensity: 0.1 });
    const headMat = new THREE.MeshStandardMaterial({ roughness: 0.8, envMapIntensity: 0.1 });
    this.crowd = new THREE.InstancedMesh(bodyGeo, bodyMat, seats.length);
    this.crowdHeads = new THREE.InstancedMesh(headGeo, headMat, seats.length);
    const pal = [0xe63946, 0x1d4ed8, 0xf1faee, 0xffb703, 0x8ecae6, 0x2a9d8f, 0x6d597a, 0xf4a261, 0x222222, 0x3a86ff, 0xff006e, 0x8338ec, 0xffbe0b];
    const skins = [0xf1c7a5, 0xd8a27f, 0x8d5524, 0xc68642, 0xffdbac, 0x5c3a21];
    const col = new THREE.Color();
    this.crowdItems = seats.map((st, i) => {
      const w = V(st.lx, st.ly + 0.34, st.lz).applyMatrix4(st.grp.matrixWorld);
      this.crowd.setColorAt(i, col.setHex(pal[Math.floor(Math.random() * pal.length)]).multiplyScalar(0.25 + Math.random() * 0.25));
      this.crowdHeads.setColorAt(i, col.setHex(skins[Math.floor(Math.random() * skins.length)]).multiplyScalar(0.45));
      return { x: w.x, y: w.y, z: w.z, ph: Math.random() * 6.28, sp: 0.7 + Math.random() * 0.6 };
    });
    s.add(this.crowd, this.crowdHeads);
    this.dummy = new THREE.Object3D();
    this.updateCrowd(0);
  }

  updateCrowd(dt) {
    this.cheer = Math.max(0, this.cheer - dt * 0.4);
    const d = this.dummy, t = this.time;
    const items = this.crowdItems;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const jump = this.cheer > 0.02 ? Math.max(0, Math.sin(t * 8 * it.sp + it.ph)) * 0.2 * Math.min(1, this.cheer) : Math.sin(t * 1.1 * it.sp + it.ph) * 0.012;
      d.position.set(it.x, it.y + jump, it.z); d.updateMatrix();
      this.crowd.setMatrixAt(i, d.matrix);
      d.position.y += 0.39; d.updateMatrix();
      this.crowdHeads.setMatrixAt(i, d.matrix);
    }
    this.crowd.instanceMatrix.needsUpdate = true;
    this.crowdHeads.instanceMatrix.needsUpdate = true;
  }

  buildScreens() {
    // écrans géants au-dessus des tribunes
    this.screenCanvas = document.createElement('canvas');
    this.screenCanvas.width = 1024; this.screenCanvas.height = 512;
    this.screenTex = new THREE.CanvasTexture(this.screenCanvas);
    this.screenTex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: this.screenTex, emissiveIntensity: 0.9 });
    const frame = new THREE.MeshStandardMaterial({ color: 0x0b0f1a, roughness: 0.4, metalness: 0.6 });
    for (const [z, ry] of [[-15, 0], [15, Math.PI]]) {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(8.4, 4.4, 0.3), frame); g.add(b);
      const sc = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), mat); sc.position.z = 0.16; g.add(sc);
      g.position.set(0, 8.2, z); g.rotation.y = ry; this.scene.add(g);
    }
    this.drawScreen(null);
  }

  drawScreen(game) {
    const g = this.screenCanvas.getContext('2d'), w = 1024, h = 512;
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#0b1a4a'); grd.addColorStop(1, '#050a1c');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffb43c'; g.font = 'italic 900 64px Arial Black, Arial'; g.textAlign = 'center';
    g.fillText('PINGPONG', w / 2, 90);
    g.fillStyle = '#9fb0d6'; g.font = '700 30px Arial'; g.fillText('WORLD CHAMPIONSHIPS', w / 2, 135);
    if (game) {
      const m = game.match;
      g.textAlign = 'left';
      [0, 1].forEach(p => {
        const y = 250 + p * 120;
        g.fillStyle = p === 0 ? '#2f6bff' : '#e3263e'; g.fillRect(60, y - 70, 14, 90);
        g.fillStyle = '#fff'; g.font = '800 58px Arial'; g.fillText(game.names[p].toUpperCase().slice(0, 12), 100, y);
        g.textAlign = 'right';
        g.fillStyle = '#9fb0d6'; g.fillText(String(m.sets[p]), 780, y);
        g.fillStyle = '#ffb43c'; g.font = '900 80px Arial'; g.fillText(String(m.score[p]), 960, y + 4);
        g.textAlign = 'left';
      });
    }
    this.screenTex.needsUpdate = true;
    // compteur courtside
    const c = this.counterTex.image.getContext('2d');
    c.fillStyle = '#0a0f1e'; c.fillRect(0, 0, 512, 256);
    const sc = game ? game.match.score : [0, 0];
    c.font = '900 150px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#2f6bff'; c.fillRect(20, 30, 220, 196); c.fillStyle = '#e3263e'; c.fillRect(272, 30, 220, 196);
    c.fillStyle = '#fff'; c.fillText(String(sc[0]), 130, 135); c.fillText(String(sc[1]), 382, 135);
    this.counterTex.needsUpdate = true;
  }

  buildBall() {
    this.ballMesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_R * 1.25, 24, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xff8a2a, emissiveIntensity: 0.35, roughness: 0.3 }));
    this.ballMesh.castShadow = true;
    this.scene.add(this.ballMesh);
    const glowTex = canvasTex(64, 64, (g, w, h) => {
      const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      grd.addColorStop(0, 'rgba(255,200,120,0.9)'); grd.addColorStop(0.3, 'rgba(255,160,60,0.35)'); grd.addColorStop(1, 'rgba(255,140,40,0)');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    });
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    this.glow.scale.setScalar(0.16);
    this.scene.add(this.glow);
    // traînée en ruban
    const N = 22;
    this.trailN = N; this.trailPts = [];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3));
    const alpha = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) { alpha[i * 2] = alpha[i * 2 + 1] = (i / (N - 1)) ** 1.6; }
    geo.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
    const idx = [];
    for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setIndex(idx);
    this.trail = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: 'attribute float alpha; varying float va; void main(){ va = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying float va; void main(){ gl_FragColor = vec4(vec3(1.0,0.72,0.4) * va * 0.75, 1.0); }',
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
    const showBall = game.state !== 'between';
    this.ballMesh.visible = this.glow.visible = showBall;
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

    if (this.athletes) game.players.forEach((pl, i) => this.athletes[i].update(dt, pl, game, i));
    const key = JSON.stringify([game.match.score, game.match.sets, game.names]);
    if (key !== this.lastScoreKey) { this.lastScoreKey = key; this.drawScreen(game); }
    this.ledTex.offset.x = (this.time * 0.02) % 1;
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
    const n = this.trailPts.length / 3;
    const cam = this.camera.position;
    for (let i = 0; i < this.trailN; i++) {
      const k = Math.max(0, Math.min(n - 1, i - (this.trailN - n)));
      const j = k * 3, j2 = Math.min(n - 1, k + 1) * 3;
      const px = this.trailPts[j], py = this.trailPts[j + 1], pz = this.trailPts[j + 2];
      // largeur perpendiculaire à la caméra
      let dx = this.trailPts[j2] - px, dy = this.trailPts[j2 + 1] - py, dz = this.trailPts[j2 + 2] - pz;
      const vx = cam.x - px, vy = cam.y - py, vz = cam.z - pz;
      let wx = dy * vz - dz * vy, wy = dz * vx - dx * vz, wz = dx * vy - dy * vx;
      const l = Math.hypot(wx, wy, wz) || 1;
      const width = BALL_R * 0.9 * (i / this.trailN);
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
      this.camera.position.set(Math.sin(a) * 8, 3.6 + Math.sin(this.time * 0.2) * 0.5, Math.cos(a) * 8);
      this.camera.lookAt(0, 0.9, 0);
      return;
    }
    const me = game.players[game.me];
    const s = me.side;
    const target = V(me.x * 0.4, 3.9, s * (Math.abs(me.z) * 0.5 + 4.6));
    const look = V(me.x * 0.15 + game.ball.p.x * 0.1, 0.35, -s * 1.5);
    const k = Math.min(1, dt * 3.5);
    this.camPos.lerp(target, k);
    this.camLook.lerp(look, k);
    this.camera.position.copy(this.camPos);
    if (this.shake > 0) {
      this.shake -= dt;
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.12;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.12;
    }
    this.camera.lookAt(this.camLook);
  }

  // position écran d'un point au-dessus de la tête d'un joueur
  headScreen(i) {
    const a = this.athletes && this.athletes[i];
    if (!a) return null;
    const p = V(); a.bones.Head.getWorldPosition(p); p.y += 0.12;
    p.project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * innerWidth, y: (-p.y * 0.5 + 0.5) * innerHeight, vis: p.z < 1 };
  }
}
