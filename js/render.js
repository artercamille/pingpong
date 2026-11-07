// Rendu 3D (Three.js) : salle, table, joueurs, balle, caméra.
import * as THREE from 'three';
import { TABLE, NET, BALL_R } from './physics.js';
import { PLANE_OFF } from './game.js';

const COLORS = [
  { shirt: 0x2f7cf6, shorts: 0x14213d, hair: 0xd9692b, skin: 0xf1c7a5 },
  { shirt: 0xe63946, shorts: 0x1d1d1d, hair: 0x2b1b12, skin: 0xd8a27f },
];

export class Renderer {
  constructor(canvas) {
    this.r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.r.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.r.shadowMap.enabled = true;
    this.r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.r.toneMapping = THREE.ACESFilmicToneMapping;
    this.r.toneMappingExposure = 1.05;
    this.r.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070b16);
    this.scene.fog = new THREE.Fog(0x070b16, 16, 34);
    this.camera = new THREE.PerspectiveCamera(52, 1, 0.05, 80);
    this.camera.position.set(0, 2.2, 4.6);
    this.camPos = this.camera.position.clone();
    this.camLook = new THREE.Vector3(0, 0.8, -0.8);
    this.time = 0;
    this.side = 1;
    this.shake = 0;

    this.buildLights();
    this.buildArena();
    this.buildTable();
    this.buildCrowd();
    this.players = [this.buildPlayer(COLORS[0]), this.buildPlayer(COLORS[1])];
    this.players[1].root.rotation.y = Math.PI;
    this.buildBall();
    this.marks = [];
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.r.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  buildLights() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight(0xbfd4ff, 0x302020, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(0.6, 9, 1.2);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const c = key.shadow.camera;
    c.left = -5; c.right = 5; c.top = 6; c.bottom = -6; c.near = 2; c.far = 14;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.01;
    s.add(key);
    for (const [x, z, col] of [[-6, -7, 0x4f7dff], [6, 7, 0xff4f6d], [6, -7, 0x9b5cff], [-6, 7, 0x3ad1ff]]) {
      const p = new THREE.PointLight(col, 14, 16, 1.6);
      p.position.set(x, 5, z);
      s.add(p);
    }
  }

  buildArena() {
    const s = this.scene;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x141b2e, roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; s.add(floor);
    const court = new THREE.Mesh(new THREE.PlaneGeometry(10, 14), new THREE.MeshStandardMaterial({ color: 0x8e2b2b, roughness: 0.65 }));
    court.rotation.x = -Math.PI / 2; court.position.y = 0.002; court.receiveShadow = true; s.add(court);

    // panneaux de séparation
    const tex = this.textTexture('PING PONG  •  TOP SPIN  •  PING PONG  •  TOP SPIN', '#ffffff', '#1a2c66', 2048, 128);
    tex.wrapS = THREE.RepeatWrapping;
    const panelMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
    const add = (w, x, z, ry) => {
      const t = tex.clone(); t.repeat.set(w / 7, 1); t.needsUpdate = true;
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.7, 0.05), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }));
      m.position.set(x, 0.35, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; s.add(m);
    };
    add(10, 0, -7, 0); add(10, 0, 7, Math.PI); add(14, -5, 0, Math.PI / 2); add(14, 5, 0, -Math.PI / 2);
    panelMat.dispose();

    // gradins
    const standMat = new THREE.MeshStandardMaterial({ color: 0x1b2238, roughness: 0.9 });
    this.standRows = [];
    for (let k = 0; k < 6; k++) {
      const h = 0.4 + k * 0.45, off = 1.2 + k * 0.8;
      for (const [w, x, z, ry] of [[16, 0, -7 - off, 0], [16, 0, 7 + off, 0], [20, -5 - off, 0, Math.PI / 2], [20, 5 + off, 0, Math.PI / 2]]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w + k * 1.6, h, 0.8), standMat);
        m.position.set(x, h / 2, z); m.rotation.y = ry; m.receiveShadow = true; s.add(m);
        this.standRows.push({ w: w + k * 1.6, x, z, ry, h });
      }
    }
    // projecteurs au plafond
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff6dd });
    for (const x of [-2.5, 0, 2.5]) for (const z of [-3, 3]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.3), lampMat);
      l.position.set(x, 8, z); s.add(l);
    }
  }

  textTexture(text, fg, bg, w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.font = `900 ${h * 0.55}px Arial Black, Arial, sans-serif`;
    g.textBaseline = 'middle'; g.textAlign = 'center';
    g.fillText(text, w / 2, h / 2 + 2);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }

  buildTable() {
    const s = this.scene, T = TABLE;
    const g = new THREE.Group();
    const topMat = new THREE.MeshStandardMaterial({ color: 0x1d4fa8, roughness: 0.45, metalness: 0.05 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(T.W, 0.03, T.L), topMat);
    top.position.y = T.H - 0.015; top.castShadow = true; top.receiveShadow = true; g.add(top);
    const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const line = (w, l, x, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.002, l), white);
      m.position.set(x, T.H + 0.001, z); m.receiveShadow = true; g.add(m);
    };
    line(0.02, T.L, -T.halfW + 0.01, 0); line(0.02, T.L, T.halfW - 0.01, 0);
    line(T.W, 0.02, 0, -T.halfL + 0.01); line(T.W, 0.02, 0, T.halfL - 0.01);
    line(0.003, T.L, 0, 0);
    const dark = new THREE.MeshStandardMaterial({ color: 0x1a1a1f, roughness: 0.6, metalness: 0.4 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, T.H - 0.03, 0.05), dark);
      leg.position.set(sx * (T.halfW - 0.12), (T.H - 0.03) / 2, sz * (T.halfL - 0.25)); leg.castShadow = true; g.add(leg);
    }
    const apron = new THREE.Mesh(new THREE.BoxGeometry(T.W - 0.2, 0.08, T.L - 0.3), dark);
    apron.position.y = T.H - 0.07; g.add(apron);

    // filet
    const nc = document.createElement('canvas'); nc.width = 256; nc.height = 32;
    const ng = nc.getContext('2d');
    ng.strokeStyle = 'rgba(20,20,30,0.9)'; ng.lineWidth = 1;
    for (let x = 0; x <= 256; x += 4) { ng.beginPath(); ng.moveTo(x, 0); ng.lineTo(x, 32); ng.stroke(); }
    for (let y = 0; y <= 32; y += 4) { ng.beginPath(); ng.moveTo(0, y); ng.lineTo(256, y); ng.stroke(); }
    const nt = new THREE.CanvasTexture(nc); nt.wrapS = nt.wrapT = THREE.RepeatWrapping; nt.repeat.set(4, 1);
    const net = new THREE.Mesh(new THREE.PlaneGeometry(NET.halfW * 2, NET.H - 0.015),
      new THREE.MeshStandardMaterial({ map: nt, transparent: true, side: THREE.DoubleSide, alphaTest: 0.05 }));
    net.position.set(0, T.H + (NET.H - 0.015) / 2, 0); net.castShadow = true; g.add(net);
    const tape = new THREE.Mesh(new THREE.BoxGeometry(NET.halfW * 2, 0.015, 0.006), white);
    tape.position.set(0, T.H + NET.H - 0.0075, 0); g.add(tape);
    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.02, NET.H + 0.02, 0.03), dark);
      post.position.set(sx * NET.halfW, T.H + NET.H / 2, 0); g.add(post);
    }
    s.add(g);

    // marqueur de visée
    this.aimRing = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.085, 32),
      new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.85, depthWrite: false }));
    this.aimRing.rotation.x = -Math.PI / 2; this.aimRing.visible = false; s.add(this.aimRing);
  }

  buildCrowd() {
    const rows = this.standRows;
    const geo = new THREE.CapsuleGeometry(0.17, 0.3, 3, 8);
    const headGeo = new THREE.SphereGeometry(0.11, 10, 8);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.8 });
    const items = [];
    for (const r of rows) {
      const n = Math.floor(r.w / 0.55);
      for (let k = 0; k < n; k++) {
        if (Math.random() < 0.18) continue;
        const u = (k / n - 0.5) * r.w + (Math.random() - 0.5) * 0.15;
        const x = r.x + Math.cos(r.ry) * u, z = r.z - Math.sin(r.ry) * u;
        items.push({ x, y: r.h + 0.32, z, ph: Math.random() * 6.28 });
      }
    }
    this.crowd = new THREE.InstancedMesh(geo, mat, items.length);
    const col = new THREE.Color();
    const palette = [0xe63946, 0x2f7cf6, 0xf1faee, 0xffb703, 0x8ecae6, 0x2a9d8f, 0x6d597a, 0xf4a261, 0x222222];
    items.forEach((it, i) => this.crowd.setColorAt(i, col.setHex(palette[i % palette.length]).offsetHSL(0, 0, (Math.random() - 0.5) * 0.2)));
    this.crowdHeads = new THREE.InstancedMesh(headGeo, new THREE.MeshStandardMaterial({ roughness: 0.8 }), items.length);
    const skins = [0xf1c7a5, 0xd8a27f, 0x8d5524, 0xc68642, 0xffdbac];
    items.forEach((it, i) => this.crowdHeads.setColorAt(i, col.setHex(skins[i % skins.length])));
    this.scene.add(this.crowdHeads);
    this.crowdItems = items;
    this.cheer = 0;
    this.dummy = new THREE.Object3D();
    this.scene.add(this.crowd);
    this.updateCrowd(0);
  }

  updateCrowd(dt) {
    this.cheer = Math.max(0, this.cheer - dt * 0.45);
    const d = this.dummy, t = this.time;
    this.crowdItems.forEach((it, i) => {
      const jump = this.cheer > 0 ? Math.max(0, Math.sin(t * 9 + it.ph)) * 0.18 * this.cheer : Math.sin(t * 1.3 + it.ph) * 0.01;
      d.position.set(it.x, it.y + jump, it.z);
      d.updateMatrix();
      this.crowd.setMatrixAt(i, d.matrix);
      d.position.y += 0.4;
      d.updateMatrix();
      this.crowdHeads.setMatrixAt(i, d.matrix);
    });
    this.crowd.instanceMatrix.needsUpdate = true;
    this.crowdHeads.instanceMatrix.needsUpdate = true;
  }

  buildPlayer(c) {
    const root = new THREE.Group();
    const m = (col, r = 0.7) => new THREE.MeshStandardMaterial({ color: col, roughness: r });
    const skin = m(c.skin, 0.6), shirt = m(c.shirt, 0.55), shorts = m(c.shorts), shoe = m(0xf5f5f5);
    const mesh = (geo, mat, x, y, z, parent = root) => {
      const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o;
    };
    const legs = [];
    for (const sx of [-1, 1]) {
      const hip = new THREE.Group(); hip.position.set(sx * 0.1, 0.88, 0); root.add(hip);
      mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.82, 10), skin, 0, -0.41, 0, hip);
      mesh(new THREE.BoxGeometry(0.11, 0.07, 0.24), shoe, 0, -0.84, -0.04, hip);
      legs.push(hip);
    }
    mesh(new THREE.CylinderGeometry(0.17, 0.16, 0.22, 12), shorts, 0, 0.9, 0);
    const torso = new THREE.Group(); torso.position.y = 1.0; root.add(torso);
    mesh(new THREE.CapsuleGeometry(0.16, 0.36, 4, 12), shirt, 0, 0.28, 0, torso);
    mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 8), skin, 0, 0.6, 0, torso);
    mesh(new THREE.SphereGeometry(0.115, 16, 12), skin, 0, 0.74, 0, torso);
    const hair = mesh(new THREE.SphereGeometry(0.122, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), m(c.hair, 0.9), 0, 0.76, 0.01, torso);
    hair.scale.set(1.04, 1, 1.08);
    // bras gauche
    const lArm = new THREE.Group(); lArm.position.set(-0.21, 0.48, 0); torso.add(lArm);
    mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.55, 8), skin, 0, -0.26, 0, lArm);
    lArm.rotation.set(-0.6, 0, 0.35);
    // bras droit + raquette
    const arm = new THREE.Group(); arm.position.set(0.21, 0.46, 0); arm.rotation.order = 'YXZ'; torso.add(arm);
    const a = mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.55, 8), skin, 0, 0, -0.27, arm);
    a.rotation.x = Math.PI / 2;
    const paddle = new THREE.Group(); paddle.position.set(0, 0, -0.6); arm.add(paddle);
    const handle = mesh(new THREE.BoxGeometry(0.03, 0.025, 0.1), m(0x8b5a2b, 0.6), 0, 0, 0.02, paddle);
    const red = mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.006, 24), m(0xd62828, 0.5), 0.0035, 0, -0.1, paddle);
    red.rotation.z = Math.PI / 2;
    const black = mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.006, 24), m(0x111111, 0.5), -0.0035, 0, -0.1, paddle);
    black.rotation.z = Math.PI / 2;
    handle.castShadow = false;
    this.scene.add(root);
    return { root, torso, arm, legs, lArm, walk: 0, lastX: 0, lastZ: 0 };
  }

  buildBall() {
    this.ballMesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_R * 1.15, 18, 14),
      new THREE.MeshStandardMaterial({ color: 0xfff3e0, emissive: 0xff9a3c, emissiveIntensity: 0.25, roughness: 0.35 }));
    this.ballMesh.castShadow = true;
    this.scene.add(this.ballMesh);
    const N = 16;
    this.trailPts = [];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    const cols = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const k = i / (N - 1); cols[i * 3] = 1; cols[i * 3 + 1] = 0.75 * k + 0.2; cols[i * 3 + 2] = 0.4 * k; }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    this.trail = new THREE.Line(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55 }));
    this.trail.frustumCulled = false;
    this.trailN = N;
    this.scene.add(this.trail);
  }

  setView(side) { this.side = side; }

  // ------------------------------------------------------------------ frame
  update(game, dt) {
    this.time += dt;
    const b = game.ball.p;
    this.ballMesh.position.set(b.x, b.y, b.z);
    this.ballMesh.visible = game.state !== 'between';

    // traînée
    this.trailPts.push(b.x, b.y, b.z);
    if (this.trailPts.length > this.trailN * 3) this.trailPts.splice(0, 3);
    const pos = this.trail.geometry.attributes.position;
    const n = this.trailPts.length / 3;
    for (let i = 0; i < this.trailN; i++) {
      const k = Math.max(0, i - (this.trailN - n));
      const j = Math.min(n - 1, k) * 3;
      pos.array[i * 3] = this.trailPts[j]; pos.array[i * 3 + 1] = this.trailPts[j + 1]; pos.array[i * 3 + 2] = this.trailPts[j + 2];
    }
    pos.needsUpdate = true;
    this.trail.visible = game.state === 'rally' || game.state === 'pointEnd';

    // effets
    if (game.fx.length > 8) game.fx.splice(0, game.fx.length - 8);
    for (const f of game.fx) {
      if (f.type === 'bounce') this.addMark(f.x, f.z);
      if (f.type === 'cheer') this.cheer = f.big ? 1.3 : 0.7;
      if (f.type === 'hit' && f.smash) this.shake = 0.25;
    }
    game.fx.length = 0;
    this.marks = this.marks.filter(mk => {
      mk.t += dt;
      mk.m.material.opacity = Math.max(0, 0.7 - mk.t * 0.9);
      mk.m.scale.setScalar(1 + mk.t * 1.5);
      if (mk.t > 0.8) { this.scene.remove(mk.m); mk.m.geometry.dispose(); mk.m.material.dispose(); return false; }
      return true;
    });

    game.players.forEach((pl, i) => this.updatePlayer(this.players[i], pl, game, dt));
    this.updateAim(game);
    this.updateCrowd(dt);
    this.updateCamera(game, dt);
    this.r.render(this.scene, this.camera);
  }

  addMark(x, z) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.035, 20),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, TABLE.H + 0.002, z);
    this.scene.add(m); this.marks.push({ m, t: 0 });
  }

  updatePlayer(v, pl, game, dt) {
    v.root.position.set(pl.x, 0, pl.z);
    const moved = Math.hypot(pl.x - v.lastX, pl.z - v.lastZ) / Math.max(dt, 1e-3);
    v.lastX = pl.x; v.lastZ = pl.z;
    v.walk += dt * Math.min(moved, 5) * 3.2;
    const amp = Math.min(0.6, moved * 0.18);
    v.legs[0].rotation.x = Math.sin(v.walk) * amp;
    v.legs[1].rotation.x = -Math.sin(v.walk) * amp;
    // posture de base : légèrement penché, genoux fléchis
    const crouch = 0.04 + (pl.charging ? 0.04 : 0);
    v.root.position.y = -crouch;
    v.torso.rotation.x = -0.22 - (pl.charging ? 0.08 : 0);

    // bras
    let yaw = -0.35, pitch = -0.25, twist = 0;
    const ballSide = (game.ball.p.x - pl.x) * pl.side >= -0.05;
    if (pl.swingT >= 0) {
      const t = Math.min(1, pl.swingT / 0.3);
      const e = t < 0.4 ? t / 0.4 : 1;           // accélération jusqu'au contact
      const fore = pl.swingFore;
      const ty = pl.swingType;
      const [y0, y1] = fore ? [-1.35, 0.95] : [1.75, -0.15];
      const [p0, p1] = ty === 'coupe' ? [0.45, -0.45] : ty === 'lob' ? [-0.5, 0.9] : ty === 'plat' ? [0.05, -0.05] : [-0.6, 0.6];
      const k = t < 0.4 ? e * 0.55 : 0.55 + (t - 0.4) / 0.6 * 0.45;
      yaw = y0 + (y1 - y0) * k; pitch = p0 + (p1 - p0) * k;
      twist = (fore ? -1 : 1) * 0.35 * (1 - 2 * k);
    } else if (pl.charging) {
      const p = Math.min(1, pl.chargeT / 0.8);
      const fore = ballSide;
      const yb = fore ? -1.35 : 1.75;
      yaw = -0.35 + (yb + 0.35) * (0.4 + 0.6 * p);
      const ty = pl.chargeType;
      pitch = ty === 'coupe' ? 0.45 : ty === 'lob' ? -0.5 : ty === 'plat' ? 0.05 : -0.6;
      twist = (fore ? 0.35 : -0.35) * p;
    }
    if (game.state === 'serve' && game.server() === pl.i) { yaw = -0.6; pitch = -0.3; }
    v.arm.rotation.y += (yaw - v.arm.rotation.y) * Math.min(1, dt * (pl.swingT >= 0 ? 40 : 14));
    v.arm.rotation.x += (pitch - v.arm.rotation.x) * Math.min(1, dt * (pl.swingT >= 0 ? 40 : 14));
    v.torso.rotation.y += (twist - v.torso.rotation.y) * Math.min(1, dt * 14);
    // bras gauche : lance la balle au service
    const tossing = (game.state === 'serve' || game.state === 'toss') && game.server() === pl.i;
    const lx = tossing ? -1.3 : -0.6;
    v.lArm.rotation.x += (lx - v.lArm.rotation.x) * Math.min(1, dt * 10);
  }

  updateAim(game) {
    const me = game.players[game.me];
    const show = (me.charging && game.state !== 'toss') || ((game.state === 'serve' || game.state === 'toss') && game.server() === game.me);
    this.aimRing.visible = show;
    if (!show) return;
    const serve = game.state === 'serve' || game.state === 'toss';
    const s = me.side;
    const ax = Math.max(-1, Math.min(1, me.aimX)), ay = Math.max(-1, Math.min(1, me.aimY));
    let depth = serve ? 0.8 + ay * 0.33 : me.chargeType === 'lob' ? 1.05 + ay * 0.15 : 0.92 + ay * 0.3;
    this.aimRing.position.set(ax * 0.6 * s, TABLE.H + 0.004, -s * depth);
    const pulse = 1 + Math.sin(this.time * 10) * 0.08;
    this.aimRing.scale.setScalar(pulse);
  }

  updateCamera(game, dt) {
    const me = game.players[game.me];
    const s = me.side;
    const tx = me.x * 0.55, tz = s * (Math.abs(me.z) * 0.7 + 3.3);
    const target = new THREE.Vector3(tx, 2.95, tz);
    const look = new THREE.Vector3(me.x * 0.2 + game.ball.p.x * 0.08, 0.55, -s * 0.55);
    const k = Math.min(1, dt * 4);
    this.camPos.lerp(target, k);
    this.camLook.lerp(look, k);
    this.camera.position.copy(this.camPos);
    if (this.shake > 0) {
      this.shake -= dt;
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.15;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.15;
    }
    this.camera.lookAt(this.camLook);
  }

  // vue de présentation pour le menu
  idle(dt) {
    this.time += dt;
    const a = this.time * 0.12;
    this.camera.position.set(Math.sin(a) * 5.5, 2.6, Math.cos(a) * 5.5);
    this.camera.lookAt(0, 0.7, 0);
    this.ballMesh.position.set(Math.sin(this.time * 2.2) * 0.4, TABLE.H + 0.15 + Math.abs(Math.sin(this.time * 4.4)) * 0.3, Math.cos(this.time * 1.1) * 1.0);
    this.trail.visible = false;
    this.aimRing.visible = false;
    this.players[0].root.position.set(0.3, 0, 2.1);
    this.players[1].root.position.set(-0.3, 0, -2.1);
    this.updateCrowd(dt);
    this.r.render(this.scene, this.camera);
  }
}
