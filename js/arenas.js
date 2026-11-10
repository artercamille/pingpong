// Salles à thème : chaque salle a son décor 3D complet (ciel, horizon, objets animés).
// Les kits sont construits à la demande et cachés quand on change de salle.
import * as THREE from 'three';

// ------------------------------------------------------------------ définitions (paramètres de setVenue)
export const ARENA_VENUES = {
  neotokyo: {
    bloom: 0.75, grade: { sat: 1.15, con: 1.08, tint: [1, 0.96, 1.05] }, coneColor: 0xff7ad8, coneOpacity: 0.7, dustColor: 0xffa8e8, floorStyle: 'asphalt', floorRough: 0.25, mirrorTint: 0x7a7a7a, kit: 'tokyo', title: 'NEO TOKYO', sub: 'ROOFTOP SERIES', pattern: 'grid', floor: '#15111f', outer: 0x17161d, outerRough: 0.22, outerMetal: 0.35, outerSize: [46, 40],
    accent: '#ff2bd6', neon: 0xff2bd6, neon2: 0x2be8ff, legs: 0x2be8ff, light: 0xff2bd6, amb: 16, bg: 0x0b0620, fog: 0.012,
    hemi: 0.45, hemiSky: 0x8a5fe6, hemiGround: 0x10081a, key: 1.1, spots: 0.85, ceiling: false, cones: false, screens: true, stands: 'sides',
    standCol: 0x16131e, seats: 0x2a1a40, table: '#0f1626', boardBg: '#0a0612', exposure: 1.1,
    sky: ['#03020b', '#120838', '#3a1260', '#9a2a8a', '#ff5fa8'], crowdPal: [0x1a1a24, 0x2a2440, 0xff2bd6, 0x2be8ff, 0x101016, 0x5a4a8a, 0xe8e8f0],
    items: ['NEO TOKYO', '@logo', 'ピンポン', 'ROOFTOP SERIES', '卓球'],
  },
  beach: {
    bloom: 0.32, boardGlow: 0.42, sunEnv: true, grade: { sat: 1.12, con: 1.05, tint: [1.05, 0.98, 0.92] }, dust: false, crowdDim: 0.85, crowdTop: 0.8, floorVig: 0.2, floorStyle: 'deck', floorRough: 0.7, mirrorTint: 0x606060, kit: 'beach', title: 'SUNSET BEACH', sub: 'MIAMI OPEN AIR', pattern: 'waves', floor: '#1d6f8f', outer: 0xc89a68, outerRough: 0.95, outerSize: [56, 48],
    accent: '#ffd23c', neon: 0xff8a3c, neon2: 0xffd23c, legs: 0xff6a3c, light: 0xff8a50, amb: 8, bg: 0xff8a5a, fog: 0.009,
    hemi: 0.7, hemiSky: 0xffb890, hemiGround: 0x8a5a40, key: 1.25, spots: 0.55, ceiling: false, cones: false, screens: false, stands: 'sides',
    standCol: 0xd8d2c8, seats: 0x3cb6c8, table: '#1f4fa8', boardBg: '#fff6e8', boardFg: '#1a3a6a', exposure: 0.84,
    sky: ['#150f45', '#3e2475', '#a83a6a', '#f2604a', '#ffa850'], crowdPal: [0xff5a5a, 0xffd23c, 0x3cc8ff, 0xffffff, 0xff8ad8, 0x3cff8a, 0xff8a3c, 0x2a6aff],
    items: ['SUNSET BEACH', '@logo', 'MIAMI OPEN AIR', 'SUMMER TOUR'],
  },
  underground: {
    bloom: 0.8, grade: { sat: 1.1, con: 1.12, vig: 0.5 }, crowdHype: 0.75, dustColor: 0xb0ffc8, crowdDim: 0.5, crowdTop: 0.35, floorStyle: 'concrete', floorRough: 0.3, mirrorTint: 0x9a9a9a, kit: 'club', title: 'UNDERGROUND', sub: 'NIGHT SESSION', pattern: 'grid', floor: '#09090b', outer: 0x121214, outerRough: 0.35, outerMetal: 0.3,
    accent: '#3dff6e', neon: 0x3dff6e, neon2: 0xff3dc8, legs: 0x18181c, light: 0x3dff6e, amb: 12, bg: 0x020402, fog: 0.02,
    hemi: 0.3, hemiSky: 0x3dff6e, hemiGround: 0x050505, key: 1.1, spots: 1.0, ceiling: false, cones: true, screens: false, stands: 'sides',
    standCol: 0x111111, seats: 0x1a1a1a, table: '#101012', boardBg: '#050505', exposure: 1.05,
    crowdPal: [0x111111, 0x1a1a1a, 0x2a2a2a, 0x3dff6e, 0xff3dc8, 0xeeeeee, 0x3a2a4a],
    items: ['UNDERGROUND', '@logo', 'PING PONG CLUB', 'NIGHT SESSION'],
  },
  orbit: {
    bloom: 0.65, grade: { sat: 1.05, con: 1.1, tint: [0.95, 1, 1.06] }, coneColor: 0x8fe0ff, coneOpacity: 0.6, dustColor: 0xbfefff, floorStyle: 'metal', floorRough: 0.3, mirrorTint: 0xa0a0a0, kit: 'space', title: 'ORBITAL', sub: 'STATION ZÉRO-G', pattern: 'hex', floor: '#141a24', outer: 0x1c222c, outerRough: 0.3, outerMetal: 0.7, outerSize: [46, 40],
    accent: '#7fe3ff', neon: 0x7fe3ff, neon2: 0xffffff, legs: 0x9aa6b8, light: 0x7fe3ff, amb: 14, bg: 0x000000, fog: 0.003,
    hemi: 0.45, hemiSky: 0x6fa0ff, hemiGround: 0x0a0c12, key: 1.25, spots: 0.9, ceiling: false, cones: false, screens: true, stands: 'sides',
    standCol: 0x262c38, seats: 0x1f6fd6, table: '#0f1a30', boardBg: '#081018', exposure: 1.08, sky: 'space',
    crowdPal: [0xe8ecf2, 0xff8a3c, 0x2a3a5a, 0x7fe3ff, 0x9aa6b8, 0x1f6fd6],
    items: ['ORBITAL', '@logo', 'STATION ZÉRO-G', 'PING PONG SPATIAL'],
  },
  sakura: {
    bloom: 0.6, grade: { sat: 1.1, con: 1.05, tint: [1.04, 0.98, 1] }, coneColor: 0xffc890, coneOpacity: 0.55, dustColor: 0xffd0e0, crowdDim: 0.6, crowdTop: 0.45, floorStyle: 'darkwood', floorRough: 0.28, mirrorTint: 0x9a9a9a, kit: 'sakura', title: 'SAKURA', sub: 'TEMPLE MATSURI', pattern: 'planks', floor: '#5a3622', outer: 0x5a564c, outerRough: 0.95, outerSize: [60, 60],
    accent: '#ff9ad8', neon: 0xff7ab8, neon2: 0xffc83c, legs: 0xc8202e, light: 0xffb070, amb: 12, bg: 0x4a2a5a, fog: 0.011,
    hemi: 0.75, hemiSky: 0xffa8cc, hemiGround: 0x2a2a20, key: 1.25, spots: 0.6, ceiling: false, cones: false, screens: false, stands: 'sides',
    standCol: 0x4a2c18, seats: 0x8a1a1a, table: '#1d3a2c', boardBg: '#1c0808', boardFg: '#ffe8d0', exposure: 1.02,
    sky: ['#1a1040', '#4a2a6a', '#b8507a', '#ff9a7a', '#ffd6a8'], crowdPal: [0xc8202e, 0xffffff, 0x1a1a2a, 0xff9ad8, 0x2a4a8a, 0xffc83c, 0x6a2a5a],
    items: ['SAKURA', '@logo', 'TEMPLE MATSURI', '桜'],
  },
  aurora: {
    bloom: 0.7, grade: { sat: 1.08, con: 1.06, tint: [0.95, 1, 1.05] }, dustColor: 0xdff4ff, crowdDim: 0.55, crowdTop: 0.4, floorVig: 0.35, floorStyle: 'ice', floorRough: 0.15, mirrorTint: 0xb0c8d8, kit: 'aurora', title: 'AURORA', sub: 'CERCLE POLAIRE', pattern: 'ice', floor: '#a9d6ec', floorText: '#0a3a5a', outer: 0xb8cad8, outerRough: 0.75, outerSize: [70, 70],
    accent: '#14b88a', neon: 0x3dffb0, neon2: 0x8a5aff, legs: 0x2a4a6a, light: 0x6affd0, amb: 10, bg: 0x06121e, fog: 0.008,
    hemi: 0.55, hemiSky: 0x5a90d8, hemiGround: 0x8ab0d0, key: 0.9, spots: 0.75, ceiling: false, cones: false, screens: false, stands: 'sides',
    standCol: 0x2a3a4a, seats: 0x1a4a6a, table: '#14304a', boardBg: '#06121c', exposure: 0.88,
    sky: ['#010309', '#03122a', '#0a2a40', '#16485a', '#2a6a70'], crowdPal: [0xc8202e, 0xffffff, 0x2a4a8a, 0xffc83c, 0x1a1a1a, 0x3dffb0, 0xff8a3c],
    items: ['AURORA', '@logo', 'CERCLE POLAIRE', 'ARCTIC OPEN'],
  },
};

// ------------------------------------------------------------------ outils
let seed = 1;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const R = (a, b) => a + rnd() * (b - a);
function tex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
const place = (m, x, y, z) => { m.position.set(x, y, z); return m; };
const basic = (color, o = {}) => new THREE.MeshBasicMaterial({ color, toneMapped: false, ...o });
// la zone des tribunes latérales (à éviter pour le décor)
const inStands = (x, z) => Math.abs(z) < 20 && Math.abs(x) > 5.5 && Math.abs(x) < 21.5;
const nearCourt = (x, z) => Math.abs(x) < 6 && Math.abs(z) < 10;

function skyDome(stops) {
  const t = tex(8, 512, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h * 0.5);
    stops.forEach((c, i) => grd.addColorStop(i / (stops.length - 1), c));
    g.fillStyle = grd; g.fillRect(0, 0, w, h * 0.5);
    g.fillStyle = stops[stops.length - 1]; g.fillRect(0, h * 0.5, w, h * 0.5);
  });
  return new THREE.Mesh(new THREE.SphereGeometry(110, 32, 24), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false }));
}
function stars(n, r, minY, size = 0.5, color = 0xffffff) {
  const p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = R(minY, 1), a = R(0, Math.PI * 2), s = Math.sqrt(1 - u * u);
    p.set([Math.cos(a) * s * r, u * r, Math.sin(a) * s * r], i * 3);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color, size, sizeAttenuation: true, fog: false, transparent: true, opacity: 0.9, depthWrite: false }));
}
// particules qui tombent (pluie, neige, pétales) dans une boîte autour du terrain
function fallers(n, box, color, size, opacity = 0.8) {
  const p = new Float32Array(n * 3), ph = new Float32Array(n);
  for (let i = 0; i < n; i++) { p.set([R(-box[0], box[0]), R(0, box[1]), R(-box[2], box[2])], i * 3); ph[i] = R(0, 6.28); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, transparent: true, opacity, depthWrite: false }));
  pts.userData = { p, ph, box };
  return pts;
}
function fall(pts, dt, t, vy, drift, swirl = 0) {
  const { p, ph, box } = pts.userData;
  for (let i = 0; i < p.length; i += 3) {
    p[i + 1] -= vy * dt;
    p[i] += (drift + Math.sin(t * 1.3 + ph[i / 3]) * swirl) * dt;
    p[i + 2] += Math.cos(t * 1.1 + ph[i / 3]) * swirl * 0.6 * dt;
    if (p[i + 1] < 0) { p[i + 1] = box[1]; p[i] = R(-box[0], box[0]); p[i + 2] = R(-box[2], box[2]); }
    if (p[i] > box[0]) p[i] -= box[0] * 2;
  }
  pts.geometry.attributes.position.needsUpdate = true;
}
// guirlande suspendue (ampoules ou lanternes) entre deux points
function garland(group, a, b, n, sag, mat, geo) {
  const pts = [];
  for (let k = 0; k <= n; k++) {
    const u = k / n, x = a.x + (b.x - a.x) * u, z = a.z + (b.z - a.z) * u, y = a.y + (b.y - a.y) * u - Math.sin(u * Math.PI) * sag;
    pts.push(new THREE.Vector3(x, y, z));
  }
  const wire = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x111111 }));
  group.add(wire);
  const bulbs = new THREE.InstancedMesh(geo, mat, n - 1), m = new THREE.Matrix4();
  for (let k = 1; k < n; k++) { const q = pts[k]; m.makeTranslation(q.x, q.y - 0.08, q.z); bulbs.setMatrixAt(k - 1, m); }
  group.add(bulbs);
  return bulbs;
}
// halo lumineux doux autour d'une source (lanterne, torche, ampoule…)
let haloTex = null;
function halo(color, size, opacity = 0.6) {
  haloTex = haloTex || tex(128, 128, (c, w, h) => { const r = c.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.2, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = r; c.fillRect(0, 0, w, h); });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  sp.scale.setScalar(size); return sp;
}
// nuages peints (couches douces), teintés selon la lumière de la salle
const cloudTexs = [];
function cloudTex(k) {
  if (cloudTexs[k]) return cloudTexs[k];
  return (cloudTexs[k] = tex(512, 256, (c, w, h) => {
    for (let i = 0; i < 70; i++) {
      const x = w * 0.12 + Math.random() * w * 0.76, y = h * 0.35 + Math.random() * h * 0.35 - (Math.abs(x - w / 2) / w) * h * 0.25, r = 30 + Math.random() * 70;
      const gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,255,255,${0.16 + Math.random() * 0.12})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }));
}
function clouds(g, n, rMin, rMax, yMin, yMax, color, opacity, aMin = 0, aMax = Math.PI * 2, scale = 1) {
  const list = [];
  for (let k = 0; k < n; k++) {
    const a = R(aMin, aMax), d = R(rMin, rMax);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(R(30, 55) * scale, R(9, 16) * scale), new THREE.MeshBasicMaterial({ map: cloudTex(k % 4), color, transparent: true, opacity, depthWrite: false, fog: false }));
    m.position.set(Math.cos(a) * d, R(yMin, yMax), Math.sin(a) * d); m.lookAt(0, m.position.y, 0); g.add(m); list.push(m);
  }
  return list;
}
function signTex(text, col, vertical, bg = 'rgba(0,0,0,0.75)') {
  const w = vertical ? 128 : 512, h = vertical ? 512 : 160;
  return tex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = col; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#ffffff'; g.shadowColor = col; g.shadowBlur = 24; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (vertical) { g.font = '900 86px sans-serif'; [...text].forEach((ch, i, a) => g.fillText(ch, w / 2, h / 2 + (i - (a.length - 1) / 2) * 100)); }
    else { g.font = 'italic 900 92px Arial'; g.fillText(text, w / 2, h / 2 + 4); }
  });
}

// ------------------------------------------------------------------ kits
const BUILD = {
  // ---------------- Néo-Tokyo : toit d'immeuble, skyline néon, pluie fine
  tokyo() {
    seed = 7;
    const g = new THREE.Group();
    g.add(skyDome(ARENA_VENUES.neotokyo.sky));
    g.add(stars(400, 100, 0.35, 0.35, 0xbfa8ff));
    const winTex = [0, 1, 2].map(k => tex(128, 256, (c, w, h) => {
      c.fillStyle = '#07060c'; c.fillRect(0, 0, w, h);
      const cols = ['#ffd890', '#9fd8ff', '#ff8ad8', '#ffffff'];
      for (let y = 6; y < h - 4; y += 10) for (let x = 6; x < w - 4; x += 12) if (Math.random() < 0.3 + k * 0.08) { c.fillStyle = cols[(Math.random() * (k === 2 ? 4 : 2)) | 0]; c.globalAlpha = 0.5 + Math.random() * 0.5; c.fillRect(x, y, 7, 5); }
      c.globalAlpha = 1;
    }));
    const bmats = winTex.map(t => new THREE.MeshStandardMaterial({ color: 0x0a0912, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1.1, roughness: 0.6, fog: false }));
    const tops = [];
    for (let i = 0; i < 95; i++) {
      const a = R(0, Math.PI * 2), d = R(24, 70), x = Math.cos(a) * d, z = Math.sin(a) * d;
      const w = R(4, 11), dd = R(4, 11), h = R(14, 62) * (d > 45 ? 1.25 : 0.8);
      const m = bmats[i % 3].clone(); m.emissiveMap = winTex[i % 3].clone(); m.emissiveMap.needsUpdate = true; m.emissiveMap.repeat.set(Math.max(1, w / 5) | 0, Math.max(1, h / 12) | 0); m.emissiveMap.wrapS = m.emissiveMap.wrapT = THREE.RepeatWrapping;
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), m);
      b.position.set(x, h / 2 - 30, z); b.rotation.y = R(-0.3, 0.3); g.add(b);
      if (rnd() < 0.3) tops.push(new THREE.Vector3(x, h - 30 + 0.6, z));
      // néons de toit
      if (rnd() < 0.35) { const n = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.25, dd + 0.2), basic(rnd() < 0.5 ? 0xff2bd6 : 0x2be8ff, { fog: false })); n.position.set(x, h - 30, z); n.rotation.y = b.rotation.y; g.add(n); }
    }
    // enseignes géantes
    const signs = [['ピンポン', '#ff2bd6', true], ['卓球', '#2be8ff', true], ['PINGPONG', '#ff2bd6', false], ['NEON', '#2be8ff', false], ['東京', '#ffd23c', true], ['SMASH', '#ff2bd6', false]];
    signs.forEach(([t, c, v], k) => {
      const a = k / signs.length * Math.PI * 2 + 0.4, d = 26;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(v ? 2.4 : 9, v ? 9.6 : 2.8), new THREE.MeshBasicMaterial({ map: signTex(t, c, v), toneMapped: false, fog: false, side: THREE.DoubleSide }));
      m.position.set(Math.cos(a) * d, v ? R(4, 9) : R(7, 12), Math.sin(a) * d); m.lookAt(0, m.position.y, 0); g.add(m);
    });
    // garde-corps néon du toit + équipements
    const rail = basic(0xff2bd6);
    for (const [w, x, z, ry] of [[46, 0, -20, 0], [46, 0, 20, 0], [40, -23, 0, Math.PI / 2], [40, 23, 0, Math.PI / 2]]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, 0.06), rail); r.position.set(x, 1.05, z); r.rotation.y = ry; g.add(r);
      const r2 = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, 0.04), basic(0x2be8ff)); r2.position.set(x, 0.55, z); r2.rotation.y = ry; g.add(r2);
    }
    // panneaux géants en bout de terrain (dans l'axe de la caméra), avec néon qui grésille
    const flick = [];
    for (const [z, ry, t, c] of [[-27, 0, 'PINGPONG 卓球', '#ff2bd6'], [27, Math.PI, 'NEO TOKYO 東京', '#2be8ff']]) {
      const bb = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(16.6, 4.6, 0.4), new THREE.MeshStandardMaterial({ color: 0x0c0b12, metalness: 0.6, roughness: 0.4 })); bb.add(frame);
      const mat = new THREE.MeshBasicMaterial({ map: tex(1024, 280, (c2, w, h) => { const gr = c2.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#16052a'); gr.addColorStop(1, '#05122a'); c2.fillStyle = gr; c2.fillRect(0, 0, w, h); c2.font = 'italic 900 150px Arial'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.shadowColor = c; c2.shadowBlur = 40; c2.fillStyle = c; c2.fillText(t, w / 2, h / 2 + 6); c2.shadowBlur = 0; c2.fillStyle = 'rgba(255,255,255,0.85)'; c2.font = 'italic 900 144px Arial'; c2.fillText(t, w / 2, h / 2 + 6); for (let y = 0; y < h; y += 4) { c2.fillStyle = 'rgba(0,0,0,0.18)'; c2.fillRect(0, y, w, 1); } }), toneMapped: false });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(16, 4.2), mat); face.position.z = 0.21; bb.add(face); flick.push(mat);
      for (const sx of [-6, 6]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6, 0.3), frame.material); leg.position.set(sx, -4.5, 0); bb.add(leg); }
      bb.position.set(0, 4.6, z); bb.rotation.y = ry; g.add(bb);
    }
    // monorail illuminé qui traverse la ville
    const train = new THREE.Group();
    const winT = tex(256, 32, (c2, w, h) => { c2.fillStyle = '#0a0a12'; c2.fillRect(0, 0, w, h); for (let x = 6; x < w; x += 16) { c2.fillStyle = '#fff2c0'; c2.fillRect(x, 8, 10, 14); } });
    winT.wrapS = THREE.RepeatWrapping; winT.repeat.set(4, 1);
    for (let k = 0; k < 4; k++) { const car = new THREE.Mesh(new THREE.BoxGeometry(9, 2.4, 2.6), [new THREE.MeshBasicMaterial({ color: 0x15131c }), new THREE.MeshBasicMaterial({ color: 0x15131c }), new THREE.MeshBasicMaterial({ color: 0x2a2838 }), new THREE.MeshBasicMaterial({ color: 0x0a0a0e }), new THREE.MeshBasicMaterial({ map: winT, toneMapped: false }), new THREE.MeshBasicMaterial({ map: winT, toneMapped: false })]); car.position.x = k * 9.4; train.add(car); }
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(37.6, 0.15, 2.65), basic(0x2be8ff)); stripe.position.set(14.1, -1.1, 0); train.add(stripe);
    train.position.set(0, 6, -45); g.add(train);
    const track = new THREE.Mesh(new THREE.BoxGeometry(200, 0.6, 1.2), new THREE.MeshStandardMaterial({ color: 0x1a1a22, metalness: 0.5, roughness: 0.6 })); track.position.set(0, 4.5, -45); g.add(track);
    for (let x = -90; x <= 90; x += 15) { const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 40, 0.8), track.material); p2.position.set(x, -15.5, -45); g.add(p2); }
    // tour de Tokyo illuminée (treillis lumineux) derrière la ville
    const tower = new THREE.Group(), lat = [];
    const H = 92, lvls = 26, wAt = y => 9 * Math.pow(1 - y / H, 1.6) + 0.5;
    const ring = (y) => { const w = wAt(y) / 2; return [[-w, y, -w], [w, y, -w], [w, y, w], [-w, y, w]]; };
    for (let i = 0; i < lvls; i++) {
      const y0 = i / lvls * H * 0.82, y1 = (i + 1) / lvls * H * 0.82, A = ring(y0), B = ring(y1);
      for (let k = 0; k < 4; k++) { const n = (k + 1) % 4; lat.push(...A[k], ...B[k], ...A[k], ...A[n], ...A[k], ...B[n], ...A[n], ...B[k]); }
    }
    const latGeo = new THREE.BufferGeometry(); latGeo.setAttribute('position', new THREE.Float32BufferAttribute(lat, 3));
    tower.add(new THREE.LineSegments(latGeo, new THREE.LineBasicMaterial({ color: 0xff7a2a, toneMapped: false, fog: false })));
    for (const [y, w, hh] of [[H * 0.36, 7.2, 3.2], [H * 0.62, 4.2, 2]]) {
      const deck = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, hh, 8), new THREE.MeshBasicMaterial({ color: 0xffe8c0, toneMapped: false, fog: false })); deck.position.y = y; tower.add(deck);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(w / 2 + 0.05, w / 2 + 0.05, hh * 0.3, 8), new THREE.MeshBasicMaterial({ color: 0x401808, fog: false })); band.position.y = y + hh * 0.2; tower.add(band);
    }
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.4, H * 0.18, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, fog: false })); ant.position.y = H * 0.91; tower.add(ant);
    const towerTop = halo(0xff3030, 6, 0.9); towerTop.position.y = H; tower.add(towerTop);
    tower.position.set(-26, -46, -96); g.add(tower);
    const towerGlow = halo(0xff8a3a, 60, 0.18); towerGlow.position.set(-26, 0, -95); g.add(towerGlow);
    // nuages bas éclairés par la ville
    clouds(g, 14, 70, 100, 10, 26, 0x8a4ab8, 0.55);
    // projecteurs qui balaient le ciel
    const beamM = new THREE.MeshBasicMaterial({ map: tex(32, 256, (c2, w, h) => { const gr2 = c2.createLinearGradient(0, h, 0, 0); gr2.addColorStop(0, 'rgba(255,255,255,0.5)'); gr2.addColorStop(1, 'rgba(255,255,255,0)'); c2.fillStyle = gr2; c2.fillRect(0, 0, w, h); }), color: 0xb0c8ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false });
    const sbeams = [];
    for (const [x, z] of [[30, -60], [-50, -40], [45, 50]]) { const geo = new THREE.CylinderGeometry(1.8, 0.2, 90, 12, 1, true); geo.translate(0, 45, 0); const b = new THREE.Mesh(geo, beamM); b.position.set(x, 10, z); g.add(b); sbeams.push(b); }
    // avions qui clignotent
    const planes = [0, 1].map(k => { const p = halo(k ? 0xff4040 : 0xffffff, 1.2, 1); p.position.set(0, 45 + k * 8, -80); g.add(p); return p; });
    // dragon holographique qui ondule au-dessus de la ville
    const dragon = [], dN = 46;
    const dGeo = new THREE.SphereGeometry(1, 12, 8);
    for (let k = 0; k < dN; k++) {
      const u = k / dN, col = new THREE.Color().setHSL(0.55 + u * 0.35, 1, 0.6);
      const m = new THREE.Mesh(dGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55 * (1 - u * 0.5), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
      const sc = k === 0 ? 1.3 : 1.05 * Math.sin(Math.min(1, (1 - u) * 1.4) * Math.PI * 0.5) + 0.12; m.scale.setScalar(sc); g.add(m); dragon.push(m);
    }
    const dHalo = halo(0x60d8ff, 9, 0.35); g.add(dHalo);
    const blink = basic(0xff2020, { fog: false });
    const blinks = tops.map(p => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), blink); m.position.copy(p); g.add(m); return m; });
    const rain = fallers(1400, [18, 14, 20], 0x9fb8ff, 0.05, 0.55); g.add(rain);
    return { g, update(dt, t) {
      fall(rain, dt, t, 13, 1.2); const on = Math.sin(t * 3) > 0.6; blink.color.setRGB(on ? 1 : 0.2, 0.04, 0.04);
      train.position.x = ((t * 9) % 160) - 100;
      sbeams.forEach((b, k) => { b.rotation.z = Math.sin(t * 0.25 + k * 2) * 0.5; b.rotation.x = Math.cos(t * 0.2 + k) * 0.3; });
      planes.forEach((p, k) => { p.position.x = ((t * (4 + k) + k * 60) % 220) - 110; p.material.opacity = Math.sin(t * 5 + k) > 0.3 ? 1 : 0.1; });
      towerTop.material.opacity = Math.sin(t * 2) > 0 ? 0.9 : 0.25;
      for (let k = 0; k < dN; k++) { const u = t * 0.18 - k * 0.022; const r2 = 34 + Math.sin(u * 3) * 6; dragon[k].position.set(Math.cos(u) * r2, 7.5 + Math.sin(u * 5 + k * 0.25) * 2, Math.sin(u) * r2 - 8); }
      dHalo.position.copy(dragon[0].position);
      flick.forEach((m, k) => { const f = Math.sin(t * 37 + k * 9) > 0.97 || (Math.sin(t * 0.7 + k) > 0.985) ? 0.35 : 1; m.color.setScalar(f); });
    } };
  },

  // ---------------- Sunset Beach : coucher de soleil, mer, palmiers, guirlandes
  beach() {
    seed = 11;
    const g = new THREE.Group();
    g.add(skyDome(ARENA_VENUES.beach.sky));
    const sun = new THREE.Mesh(new THREE.CircleGeometry(7, 48), basic(0xffd890, { fog: false }));
    sun.position.set(-6, 3.2, -98); sun.lookAt(0, 3.2, 0); g.add(sun);
    const sunHalo = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), new THREE.MeshBasicMaterial({ map: tex(128, 128, (c, w, h) => { const r = c.createRadialGradient(64, 64, 4, 64, 64, 64); r.addColorStop(0, 'rgba(255,200,120,0.75)'); r.addColorStop(0.25, 'rgba(255,130,80,0.28)'); r.addColorStop(1, 'rgba(255,100,70,0)'); c.fillStyle = r; c.fillRect(0, 0, w, h); }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
    sunHalo.position.set(-6, 3.2, -97); sunHalo.lookAt(0, 3.2, 0); g.add(sunHalo);
    // mer avec reflets qui scintillent
    const seaTex = tex(256, 256, (c, w, h) => { c.fillStyle = '#0c2a4a'; c.fillRect(0, 0, w, h); for (let k = 0; k < 200; k++) { c.fillStyle = `rgba(255,${150 + Math.random() * 80 | 0},110,${Math.random() * 0.45})`; c.fillRect(Math.random() * w, Math.random() * h, 6 + Math.random() * 30, 2); } });
    seaTex.wrapS = seaTex.wrapT = THREE.RepeatWrapping; seaTex.repeat.set(30, 30);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshStandardMaterial({ color: 0x1a4a70, roughness: 0.1, metalness: 0.7, emissive: 0xffffff, emissiveMap: seaTex, emissiveIntensity: 0.4 }));
    sea.rotation.x = -Math.PI / 2; sea.position.y = -0.25; g.add(sea);
    const glitter = new THREE.Mesh(new THREE.PlaneGeometry(10, 70), new THREE.MeshBasicMaterial({ map: tex(64, 512, (c, w, h) => { for (let k = 0; k < 900; k++) { const y = Math.random() * h, a = (1 - y / h) * 0.9; c.fillStyle = `rgba(255,${190 + Math.random() * 50 | 0},120,${Math.random() * a})`; const ww = 4 + Math.random() * 30 * (1 - y / h); c.fillRect(w / 2 - ww / 2 + (Math.random() - 0.5) * 20 * (1 - y / h), y, ww, 1.5); } }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
    glitter.rotation.x = -Math.PI / 2; glitter.position.set(-4, -0.2, -62); g.add(glitter);
    // torches tiki aux quatre coins
    const flames = [];
    for (const [x, z] of [[-4.9, -9.5], [4.9, -9.5], [-4.9, 9.5], [4.9, 9.5], [-2.5, -9.6], [2.5, -9.6], [-2.5, 9.6], [2.5, 9.6]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.2, 8), new THREE.MeshStandardMaterial({ color: 0x3a2412, roughness: 1 })); pole.position.set(x, 1.1, z); g.add(pole);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.08, 0.28, 10), new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.9 })); cup.position.set(x, 2.3, z); g.add(cup);
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.5, 10), basic(0xffa040, { transparent: true, opacity: 0.95 })); f.position.set(x, 2.68, z); g.add(f);
      const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.32, 8), basic(0xfff0a0)); f2.position.set(x, 2.6, z); g.add(f2);
      const hl = halo(0xff9040, 2.4, 0.55); hl.position.set(x, 2.7, z); g.add(hl);
      flames.push(f, f2);
    }
    for (const [x, z] of [[-4.9, -9.5], [4.9, 9.5]]) { const l = new THREE.PointLight(0xff9040, 8, 9, 1.6); l.position.set(x, 2.8, z); g.add(l); flames.push(l); }
    // îles au loin, nuages dorés, voiliers, mouettes, rayons du soleil
    for (const [x, z, w, h] of [[-55, -100, 40, 6], [-20, -105, 22, 3.5], [48, -98, 34, 8], [80, -60, 30, 5], [-85, -40, 26, 4]]) { const isl = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x3a1e40, fog: true })); isl.scale.set(w, h, 6); isl.position.set(x, -0.3, z); g.add(isl); }
    clouds(g, 10, 80, 100, 9, 22, 0xffb088, 0.85, -Math.PI * 0.85, -Math.PI * 0.15);
    clouds(g, 10, 80, 100, 14, 30, 0xb070a0, 0.6);
    const rays = [];
    for (let k = 0; k < 7; k++) { const r2 = new THREE.Mesh(new THREE.PlaneGeometry(4 + k % 3 * 2, 70), new THREE.MeshBasicMaterial({ map: tex(32, 256, (c2, w, h) => { const gr2 = c2.createLinearGradient(0, h, 0, 0); gr2.addColorStop(0, 'rgba(255,200,140,0.35)'); gr2.addColorStop(1, 'rgba(255,200,140,0)'); c2.fillStyle = gr2; c2.fillRect(0, 0, w, h); }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false, side: THREE.DoubleSide })); r2.geometry.translate(0, 35, 0); r2.position.set(-6, 3.2, -96); r2.rotation.z = (k - 3) * 0.32; g.add(r2); rays.push(r2); }
    const sailMat = new THREE.MeshBasicMaterial({ color: 0xffe8d8, side: THREE.DoubleSide }), hullMat = new THREE.MeshBasicMaterial({ color: 0x2a1a30 });
    const boats = [[-35, -70], [22, -78], [55, -66]].map(([x, z]) => { const b = new THREE.Group(); const hull = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 0.9), hullMat); b.add(hull); const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(1.6, 0); sh.lineTo(0, 4); const sail = new THREE.Mesh(new THREE.ShapeGeometry(sh), sailMat); sail.position.set(-0.6, 0.3, 0); b.add(sail); b.position.set(x, 0, z); g.add(b); return b; });
    const gullGeo = new THREE.BufferGeometry(); gullGeo.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0.15, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.15, 0], 3));
    const gulls = []; for (let k = 0; k < 9; k++) { const gl = new THREE.LineSegments(gullGeo, new THREE.LineBasicMaterial({ color: 0x2a1a28 })); g.add(gl); gulls.push({ gl, a: R(0, 6), r: R(14, 26), y: R(6, 10), sp: R(0.15, 0.3), cx: R(-8, 8), cz: R(-40, -25) }); }
    // palmiers
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.9 }), leafMat = new THREE.MeshStandardMaterial({ color: 0x1f4a24, roughness: 0.8, side: THREE.DoubleSide });
    const leafGeo = new THREE.PlaneGeometry(0.55, 3, 1, 6); { const p = leafGeo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 1.5; p.setY(i, y); p.setZ(i, -y * y * 0.12); p.setX(i, p.getX(i) * Math.sin(Math.max(0.1, y / 3) * Math.PI)); } leafGeo.computeVertexNormals(); }
    const palms = [];
    const spots = [[-4, -22], [5, 23], [0, -27], [-24, -6], [24, 6], [-25, 14], [26, -15], [-12, -22], [13, 22], [-28, 22], [29, -24], [-33, 0], [33, 2], [-18, -24], [19, 25]];
    for (const [x, z] of spots) {
      const h = R(6, 9), lean = R(-0.25, 0.25), pts = [];
      for (let k = 0; k <= 8; k++) { const u = k / 8; pts.push(new THREE.Vector3(Math.sin(lean) * u * u * 2.5, u * h, Math.cos(lean) * u * u * 0.8)); }
      const palm = new THREE.Group();
      palm.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.16, 7), trunkMat));
      const top = pts[8], crown = new THREE.Group(); crown.position.copy(top);
      for (let k = 0; k < 8; k++) { const l = new THREE.Mesh(leafGeo, leafMat); l.rotation.set(0, k / 8 * Math.PI * 2, 0); l.rotateX(-0.9 - R(0, 0.4)); crown.add(l); }
      palm.add(crown); palm.position.set(x, 0, z); palm.rotation.y = R(0, 6.28); g.add(palm); palms.push({ crown, ph: R(0, 6) });
    }
    // guirlandes guinguette au-dessus des tribunes
    const bulbMat = basic(0xffd890), bulbGeo = new THREE.SphereGeometry(0.07, 8, 6);
    const poles = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 });
    for (const sx of [-1, 1]) for (const z of [-9, 0, 9]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 6.5, 8), poles); p.position.set(sx * 4.9, 3.25, z); g.add(p); }
    for (const z of [-9, 0, 9]) garland(g, new THREE.Vector3(-4.9, 6.3, z), new THREE.Vector3(4.9, 6.3, z), 18, 0.9, bulbMat, bulbGeo);
    for (const sx of [-1, 1]) for (const [z1, z2] of [[-9, 0], [0, 9]]) garland(g, new THREE.Vector3(sx * 4.9, 6.3, z1), new THREE.Vector3(sx * 4.9, 6.3, z2), 14, 0.6, bulbMat, bulbGeo);
    // parasols
    const umb = [0xff5a5a, 0x3cc8ff, 0xffd23c, 0xff8ad8];
    [[-24, -20], [25, 19], [-27, 9], [27, -9], [-9, -24], [10, 24]].forEach(([x, z], k) => {
      const c = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.6, 12, 1, true), new THREE.MeshStandardMaterial({ color: umb[k % 4], side: THREE.DoubleSide, roughness: 0.7 })); c.position.set(x, 2.3, z); g.add(c);
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.3, 6), poles); p.position.set(x, 1.15, z); g.add(p);
    });
    return { g, update(dt, t) {
      seaTex.offset.x = t * 0.004; seaTex.offset.y = Math.sin(t * 0.3) * 0.01;
      for (const p of palms) p.crown.rotation.z = Math.sin(t * 0.9 + p.ph) * 0.06;
      rays.forEach((r2, k) => { r2.material.opacity = 0.6 + Math.sin(t * 0.4 + k * 1.3) * 0.4; });
      boats.forEach((b, k) => { b.position.x += dt * (0.3 + k * 0.1); if (b.position.x > 70) b.position.x = -70; b.rotation.z = Math.sin(t + k) * 0.05; });
      for (const q of gulls) { q.a += dt * q.sp; q.gl.position.set(q.cx + Math.cos(q.a) * q.r, q.y + Math.sin(q.a * 3) * 0.4, q.cz + Math.sin(q.a) * q.r * 0.5); q.gl.rotation.y = -q.a; q.gl.scale.y = 1 + Math.sin(t * 9 + q.a * 10) * 0.8; }
      flames.forEach((f, k) => { if (f.isMesh) f.scale.set(1, 0.85 + Math.sin(t * 14 + k * 1.7) * 0.15 + Math.random() * 0.08, 1); else f.intensity = 7 + Math.random() * 2; });
      bulbMat.color.setScalar(0.92 + Math.sin(t * 7) * 0.04); bulbMat.color.b = 0.55;
    } };
  },

  // ---------------- Underground : entrepôt en briques, lasers, boule à facettes, DJ
  club() {
    seed = 23;
    const g = new THREE.Group();
    const brick = tex(512, 256, (c, w, h) => {
      c.fillStyle = '#1a1210'; c.fillRect(0, 0, w, h);
      for (let y = 0, r = 0; y < h; y += 32, r++) for (let x = (r % 2) * -32; x < w; x += 64) { const v = 40 + Math.random() * 30; c.fillStyle = `rgb(${v + 40},${v * 0.6},${v * 0.5})`; c.fillRect(x + 3, y + 3, 58, 26); }
    });
    brick.wrapS = brick.wrapT = THREE.RepeatWrapping; brick.repeat.set(9, 3);
    const wallMat = new THREE.MeshStandardMaterial({ map: brick, roughness: 0.95, color: 0x8a7a70 });
    for (const [w, x, z, ry] of [[44, 0, -17, 0], [44, 0, 17, Math.PI], [34, -22, 0, Math.PI / 2], [34, 22, 0, -Math.PI / 2]]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 11), wallMat); m.position.set(x, 5.5, z); m.rotation.y = ry; g.add(m);
    }
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(44, 34), new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 1 })); ceil.rotation.x = Math.PI / 2; ceil.position.y = 11; g.add(ceil);
    const pipe = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.5, metalness: 0.7 });
    for (const x of [-15, -9, -3, 3, 9, 15]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 34, 10), pipe); p.rotation.x = Math.PI / 2; p.position.set(x, 10.3, 0); g.add(p); }
    // graffitis néon sur les murs du fond
    for (const [z, ry, t, c] of [[16.9, Math.PI, 'PING PONG CLUB', '#3dff6e']]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(16, 3.2), new THREE.MeshBasicMaterial({ map: tex(1024, 200, (c2, w, h) => { c2.font = 'italic 900 130px Arial'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.shadowColor = c; c2.shadowBlur = 30; c2.fillStyle = c; c2.fillText(t, w / 2, h / 2); c2.fillStyle = '#ffffff'; c2.shadowBlur = 0; c2.globalAlpha = 0.6; c2.fillText(t, w / 2, h / 2); }), transparent: true, toneMapped: false }));
      m.position.set(0, 6.8, z); m.rotation.y = ry; g.add(m);
    }
    // barres LED sur les murs latéraux
    const leds = [];
    for (const sx of [-1, 1]) for (let k = 0; k < 7; k++) { const m = basic(k % 2 ? 0x3dff6e : 0xff3dc8); const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 3.4), m); b.position.set(sx * 21.9, 8.6, -14 + k * 4.6); g.add(b); leds.push(m); }
    // scène DJ au fond : estrade, platines, enceintes, mur LED animé (égaliseur)
    const stageMat = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.5, metalness: 0.4 });
    const plat = new THREE.Mesh(new THREE.BoxGeometry(9, 1.4, 3), stageMat); plat.position.set(0, 0.7, -15.4); g.add(plat);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(9.02, 0.05, 0.05), basic(0x3dff6e)); edge.position.set(0, 1.42, -13.9); g.add(edge);
    const booth = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.05, 1.0), stageMat); booth.position.set(0, 1.92, -14.9); g.add(booth);
    const boothFront = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 0.9), new THREE.MeshBasicMaterial({ map: signTex('DJ', '#3dff6e', false, 'rgba(0,0,0,0.9)'), toneMapped: false })); boothFront.position.set(0, 1.92, -14.39); g.add(boothFront);
    for (const sx of [-0.8, 0.8]) { const deck = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 24), new THREE.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0.6, roughness: 0.3 })); deck.position.set(sx, 2.47, -14.9); g.add(deck); }
    for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.25, 1.0), new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.7 })); sp.position.set(sx * 3.7, 2.05 + k * 1.27, -15.6); g.add(sp);
      for (const [yy, r] of [[0.2, 0.42], [-0.35, 0.18]]) { const cone = new THREE.Mesh(new THREE.RingGeometry(r * 0.3, r, 24), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide })); cone.position.set(sx * 3.7, 2.05 + k * 1.27 + yy, -15.09); g.add(cone); }
    }
    const eqC = document.createElement('canvas'); eqC.width = 256; eqC.height = 96;
    const eqT = new THREE.CanvasTexture(eqC); eqT.colorSpace = THREE.SRGBColorSpace;
    const led = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.8), new THREE.MeshBasicMaterial({ map: eqT, toneMapped: false })); led.position.set(0, 5.6, -16.85); g.add(led);
    const ledFrame = new THREE.Mesh(new THREE.BoxGeometry(10.3, 4.1, 0.1), stageMat); ledFrame.position.set(0, 5.6, -16.95); g.add(ledFrame);
    const eqBars = new Float32Array(32);
    const drawEq = (t) => {
      const c = eqC.getContext('2d'); c.fillStyle = '#020302'; c.fillRect(0, 0, 256, 96);
      for (let i = 0; i < 32; i++) {
        const target = (Math.sin(t * 6 + i * 0.5) * 0.5 + 0.5) * (Math.sin(t * 2.1 + i * 0.21) * 0.3 + 0.7) * (0.6 + Math.random() * 0.4);
        eqBars[i] += (target - eqBars[i]) * 0.5;
        const hgt = Math.round(eqBars[i] * 11);
        for (let k = 0; k < hgt; k++) { c.fillStyle = k > 8 ? '#ff3dc8' : k > 5 ? '#e8ff3d' : '#3dff6e'; c.fillRect(i * 8 + 1, 90 - k * 8, 6, 6); }
      }
      eqT.needsUpdate = true;
    };
    // tubes néon sur les murs de briques
    for (const [x, z, ry, t, c] of [[-21.9, -6, Math.PI / 2, 'SMASH', '#ff3dc8'], [21.9, 6, -Math.PI / 2, 'TOPSPIN', '#3dff6e'], [-21.9, 8, Math.PI / 2, 'NO LIMIT', '#3de8ff'], [21.9, -8, -Math.PI / 2, 'CLUB', '#ffd23c']]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.6), new THREE.MeshBasicMaterial({ map: tex(512, 140, (c2, w, h) => { c2.font = 'italic 900 100px Arial'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.lineWidth = 6; c2.shadowColor = c; c2.shadowBlur = 26; c2.strokeStyle = c; c2.strokeText(t, w / 2, h / 2); c2.shadowBlur = 0; c2.strokeStyle = '#ffffff'; c2.lineWidth = 2; c2.strokeText(t, w / 2, h / 2); }), transparent: true, toneMapped: false }));
      m.position.set(x, 7.2, z); m.rotation.y = ry; g.add(m);
    }
    // nappes de fumée
    const smokeTex = tex(128, 128, (c2, w, h) => { const r = c2.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(160,255,190,0.08)'); r.addColorStop(1, 'rgba(160,255,190,0)'); c2.fillStyle = r; c2.fillRect(0, 0, w, h); });
    const smokes = [];
    for (let k = 0; k < 14; k++) { const sm = new THREE.Mesh(new THREE.PlaneGeometry(9, 4), new THREE.MeshBasicMaterial({ map: smokeTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); sm.position.set(R(-14, 14), R(0.5, 3), R(-15, 15)); if (Math.abs(sm.position.x) < 6 && Math.abs(sm.position.z) < 10) sm.position.z = Math.sign(sm.position.z || 1) * 12; g.add(sm); smokes.push(sm); }
    // boule à facettes
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 2), new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 1, roughness: 0.08, flatShading: true, envMapIntensity: 3 }));
    ball.position.set(0, 9, 0); g.add(ball);
    // lasers depuis deux émetteurs au plafond
    const lasers = [];
    for (const z of [-15.5, 15.5]) for (let k = 0; k < 9; k++) {
      const m = new THREE.MeshBasicMaterial({ color: k % 3 === 0 ? 0xff3dc8 : 0x3dff6e, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      const geo = new THREE.CylinderGeometry(0.012, 0.012, 34, 5, 1, true); geo.translate(0, -17, 0);
      const l = new THREE.Mesh(geo, m); l.position.set(0, 10.2, z); g.add(l); lasers.push({ l, k, z, m });
    }
    // lyres motorisées sur un pont lumière : faisceaux colorés qui balaient la piste
    const truss = new THREE.MeshStandardMaterial({ color: 0x2a2a30, metalness: 0.8, roughness: 0.35 });
    for (const z of [-9, 9]) { const tb = new THREE.Mesh(new THREE.BoxGeometry(18, 0.35, 0.35), truss); tb.position.set(0, 8.4, z); g.add(tb); }
    const heads = [];
    const hbTex = tex(32, 256, (c2, w, h) => { const gr2 = c2.createLinearGradient(0, 0, 0, h); gr2.addColorStop(0, 'rgba(255,255,255,0.55)'); gr2.addColorStop(1, 'rgba(255,255,255,0)'); c2.fillStyle = gr2; c2.fillRect(0, 0, w, h); });
    for (const z of [-9, 9]) for (let k = 0; k < 5; k++) {
      const x = -7 + k * 3.5, col = [0xff3dc8, 0x3dff6e, 0x3de8ff, 0xffd23c, 0xff3dc8][k];
      const head = new THREE.Group(); head.position.set(x, 8.1, z); g.add(head);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.5, 12), truss); head.add(body);
      const geo = new THREE.CylinderGeometry(0.15, 1.6, 12, 16, 1, true); geo.translate(0, -6, 0);
      const beam = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: hbTex, color: col, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false }));
      head.add(beam); const lens = halo(col, 1.2, 0.9); lens.position.y = -0.3; head.add(lens);
      heads.push({ head, k, z });
    }
    // canons à CO2 sur la scène : panaches blancs sur les gros points
    const co2Tex = tex(64, 256, (c2, w, h) => { for (let k = 0; k < 40; k++) { const y = Math.random() * h, r = 10 + (1 - y / h) * 22; const gr2 = c2.createRadialGradient(w / 2, y, 0, w / 2, y, r); gr2.addColorStop(0, 'rgba(255,255,255,0.25)'); gr2.addColorStop(1, 'rgba(255,255,255,0)'); c2.fillStyle = gr2; c2.fillRect(0, 0, w, h); } });
    const jets = [-4.4, -1.5, 1.5, 4.4].map(x => { const geo = new THREE.PlaneGeometry(1.4, 6); geo.translate(0, 3, 0); const j = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: co2Tex, transparent: true, opacity: 0, depthWrite: false, fog: false })); j.position.set(x, 1.4, -14.2); g.add(j); return j; });
    let jetT = 0;
    const ballGlow = halo(0xffffff, 3, 0.35); ballGlow.position.set(0, 9, 0); g.add(ballGlow);
    const strobe = new THREE.PointLight(0xffffff, 0, 40, 1.4); strobe.position.set(0, 9, 0); g.add(strobe);
    let st = 0;
    return { g, update(dt, t, cheer) {
      ball.rotation.y += dt * 0.6;
      for (const H2 of heads) { H2.head.rotation.x = Math.sin(t * 0.8 + H2.k) * 0.5 + (H2.z > 0 ? 0.35 : -0.35); H2.head.rotation.z = Math.sin(t * 0.6 + H2.k * 1.7 + (H2.z > 0 ? 2 : 0)) * 0.6; }
      const beat = t * 2.133;
      leds.forEach((m, k) => { const on = (Math.floor(beat) + k) % 4 === 0; m.color.setHex(on ? 0xffffff : k % 2 ? 0x3dff6e : 0xff3dc8); });
      for (const L of lasers) { const s = Math.sign(L.z); L.l.rotation.set(s * (0.75 + Math.sin(t * 0.7 + L.k) * 0.35), 0, Math.sin(t * 0.9 + L.k * 0.7) * 0.9); L.m.opacity = 0.35 + 0.3 * Math.max(0, Math.sin(beat * Math.PI)); }
      st -= dt; if (cheer > 0.5 && st <= 0) st = 0.09;
      if (cheer > 1.2 && jetT <= 0) jetT = 1.4;
      jetT -= dt; for (const j of jets) { const u = Math.max(0, jetT) / 1.4; j.material.opacity = u > 0 ? Math.min(1, u * 2.5) * 0.9 : 0; j.scale.set(1 + (1 - u) * 1.5, 0.4 + (1 - u) * 0.9, 1); j.lookAt(0, j.position.y, 0); }
      if (((t * 20) | 0) !== this._eqF) { this._eqF = (t * 20) | 0; drawEq(t); }
      for (const sm of smokes) { sm.lookAt(0, sm.position.y, 4 * Math.sign(sm.position.z || 1)); sm.position.x += Math.sin(t * 0.2 + sm.id) * 0.004; }
      strobe.intensity = st > 0.045 ? 60 : 0;
    } };
  },

  // ---------------- Orbital : station spatiale, planète géante, astéroïdes
  space() {
    seed = 31;
    const g = new THREE.Group();
    const neb = tex(1024, 512, (c, w, h) => {
      c.fillStyle = '#000003'; c.fillRect(0, 0, w, h);
      for (let k = 0; k < 40; k++) { const x = Math.random() * w, y = h * 0.15 + Math.random() * h * 0.6, r = 40 + Math.random() * 160; const gr = c.createRadialGradient(x, y, 0, x, y, r); const col = ['80,40,160', '30,80,200', '160,40,120', '20,140,180'][k % 4]; gr.addColorStop(0, `rgba(${col},0.16)`); gr.addColorStop(1, `rgba(${col},0)`); c.fillStyle = gr; c.fillRect(0, 0, w, h); }
    });
    g.add(new THREE.Mesh(new THREE.SphereGeometry(115, 48, 24), new THREE.MeshBasicMaterial({ map: neb, side: THREE.BackSide, fog: false, depthWrite: false })));
    const st1 = stars(2600, 105, -0.9, 0.45), st2 = stars(500, 104, -0.9, 0.9, 0xbfdfff); g.add(st1, st2);
    // planète géante avec atmosphère
    const pt = tex(1024, 512, (c, w, h) => {
      for (let y = 0; y < h; y++) { const v = Math.sin(y * 0.05) * 0.5 + Math.sin(y * 0.013 + 1) * 0.5; c.fillStyle = `rgb(${30 + v * 30 | 0},${90 + v * 50 | 0},${150 + v * 50 | 0})`; c.fillRect(0, y, w, 1); }
      for (let k = 0; k < 220; k++) { c.fillStyle = `rgba(255,255,255,${Math.random() * 0.35})`; c.beginPath(); c.ellipse(Math.random() * w, Math.random() * h, 20 + Math.random() * 90, 4 + Math.random() * 10, 0, 0, 7); c.fill(); }
    });
    const planet = new THREE.Mesh(new THREE.SphereGeometry(30, 64, 48), new THREE.MeshStandardMaterial({ map: pt, roughness: 1, emissive: 0x0a2040, emissiveIntensity: 0.6, fog: false }));
    planet.position.set(-40, -12, -78); planet.rotation.z = 0.35; g.add(planet);
    const atm = new THREE.Mesh(new THREE.SphereGeometry(32.5, 48, 32), new THREE.MeshBasicMaterial({ color: 0x4fb8ff, transparent: true, opacity: 0.22, side: THREE.BackSide, blending: THREE.AdditiveBlending, fog: false, depthWrite: false }));
    atm.position.copy(planet.position); g.add(atm);
    const ring = new THREE.Mesh(new THREE.RingGeometry(38, 52, 96), new THREE.MeshBasicMaterial({ color: 0xc8b8a0, transparent: true, opacity: 0.25, side: THREE.DoubleSide, fog: false, depthWrite: false }));
    ring.position.copy(planet.position); ring.rotation.set(-1.2, 0.2, 0.3); g.add(ring);
    const moon = new THREE.Mesh(new THREE.SphereGeometry(5, 32, 24), new THREE.MeshStandardMaterial({ color: 0xb8b0a8, roughness: 1, emissive: 0x222222, fog: false }));
    moon.position.set(46, 30, 62); g.add(moon);
    // arches de la station au-dessus du terrain
    const metal = new THREE.MeshStandardMaterial({ color: 0x8a94a6, roughness: 0.35, metalness: 0.85 });
    const lightStrip = basic(0x7fe3ff);
    for (const z of [-14, -7, 7, 14]) {
      const a = new THREE.Mesh(new THREE.TorusGeometry(21, 0.32, 8, 64, Math.PI), metal); a.position.set(0, 0, z); g.add(a);
      const l = new THREE.Mesh(new THREE.TorusGeometry(20.6, 0.07, 6, 96, Math.PI), lightStrip); l.position.set(0, 0, z); g.add(l);
    }
    for (const sx of [-1, 1]) { const beam = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 30), metal); beam.position.set(sx * 14.8, 14.8, 0); g.add(beam); }
    // bord de la plateforme
    for (const [w, x, z, ry] of [[46, 0, -20, 0], [46, 0, 20, 0], [40, -23, 0, Math.PI / 2], [40, 23, 0, Math.PI / 2]]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, 0.12), lightStrip); r.position.set(x, 0.06, z); r.rotation.y = ry; g.add(r);
      const under = new THREE.Mesh(new THREE.BoxGeometry(w, 2, 0.6), metal); under.position.set(x, -1, z); under.rotation.y = ry; g.add(under);
    }
    // astéroïdes et satellites
    const rocks = [];
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x5a5048, roughness: 1, flatShading: true, fog: false });
    for (let k = 0; k < 26; k++) {
      const a = R(0, 6.28), d = R(28, 70), r = new THREE.Mesh(new THREE.IcosahedronGeometry(R(0.4, 2.2), 0), rockMat);
      r.position.set(Math.cos(a) * d, R(-8, 25), Math.sin(a) * d); g.add(r); rocks.push({ r, sp: R(0.1, 0.5) });
    }
    // anneau de station au loin et vaisseaux qui passent
    const ringSt = new THREE.Group();
    ringSt.add(new THREE.Mesh(new THREE.TorusGeometry(26, 2.2, 12, 80), new THREE.MeshStandardMaterial({ color: 0x8a94a6, metalness: 0.8, roughness: 0.4, fog: false })));
    const winRing = new THREE.Mesh(new THREE.TorusGeometry(26, 2.25, 4, 160), new THREE.MeshBasicMaterial({ map: (() => { const t2 = tex(512, 16, (c2, w, h) => { c2.fillStyle = '#000'; c2.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 6) if (Math.random() < 0.6) { c2.fillStyle = Math.random() < 0.8 ? '#bfe8ff' : '#ffd890'; c2.fillRect(x, 6, 3, 4); } }); t2.wrapS = THREE.RepeatWrapping; t2.repeat.set(6, 1); return t2; })(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
    ringSt.add(winRing);
    for (let k = 0; k < 6; k++) { const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 26, 8), new THREE.MeshStandardMaterial({ color: 0x6a7486, metalness: 0.8, roughness: 0.4, fog: false })); sp.rotation.z = k / 6 * Math.PI; ringSt.add(sp); }
    ringSt.position.set(55, 12, -85); ringSt.rotation.set(0.5, -0.6, 0); g.add(ringSt);
    const ships = [0, 1, 2].map(k => {
      const sh = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.ConeGeometry(0.6, 3.2, 6), metal); hull.rotation.z = -Math.PI / 2; sh.add(hull);
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 2.6), metal); wing.position.x = -0.6; sh.add(wing);
      const eng = halo(k === 1 ? 0xff8a3c : 0x7fe3ff, 2.2, 1); eng.position.x = -1.8; sh.add(eng);
      const trail = new THREE.Mesh(new THREE.PlaneGeometry(14, 0.35), new THREE.MeshBasicMaterial({ map: tex(256, 8, (c2, w, h) => { const gr2 = c2.createLinearGradient(0, 0, w, 0); gr2.addColorStop(0, 'rgba(127,227,255,0)'); gr2.addColorStop(1, 'rgba(127,227,255,0.8)'); c2.fillStyle = gr2; c2.fillRect(0, 0, w, h); }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false, side: THREE.DoubleSide }));
      trail.position.x = -8.8; sh.add(trail);
      g.add(sh); return { sh, k };
    });
    const sat = new THREE.Group();
    sat.add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 2), metal));
    for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(4, 0.05, 1.4), new THREE.MeshStandardMaterial({ color: 0x1a3a8a, metalness: 0.6, roughness: 0.3, emissive: 0x0a1a4a })); p.position.x = sx * 2.7; sat.add(p); }
    const satLight = basic(0xff3030, { fog: false }); const sl = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), satLight); sl.position.y = 0.7; sat.add(sl);
    g.add(sat);
    return { g, update(dt, t) {
      planet.rotation.y += dt * 0.012; ring.rotation.z += dt * 0.004; ringSt.rotation.z += dt * 0.03;
      for (const S2 of ships) { const u = ((t * (0.05 + S2.k * 0.015) + S2.k * 0.33) % 1); S2.sh.position.set(-90 + u * 180, 6 + S2.k * 5, -45 - S2.k * 12 + Math.sin(u * 6) * 3); S2.sh.rotation.z = Math.sin(u * 6) * 0.1; }
      for (const r of rocks) { r.r.rotation.x += dt * r.sp; r.r.rotation.y += dt * r.sp * 0.7; }
      sat.position.set(Math.cos(t * 0.05) * 40, 18 + Math.sin(t * 0.1) * 2, Math.sin(t * 0.05) * 40); sat.rotation.y = -t * 0.05; sat.rotation.z = 0.3;
      satLight.color.setScalar(Math.sin(t * 4) > 0.7 ? 1 : 0.1); satLight.color.r = 1;
      st2.material.opacity = 0.6 + Math.sin(t * 1.7) * 0.3;
    } };
  },

  // ---------------- Sakura : temple au crépuscule, torii, cerisiers, lanternes, pétales
  sakura() {
    seed = 41;
    const g = new THREE.Group();
    g.add(skyDome(ARENA_VENUES.sakura.sky));
    g.add(stars(160, 100, 0.55, 0.4, 0xffe0f0));
    // mont Fuji et collines
    const fujiMat = new THREE.MeshStandardMaterial({ color: 0x3a3060, roughness: 1, fog: true });
    const fuji = new THREE.Mesh(new THREE.ConeGeometry(42, 30, 64, 1, true), fujiMat); fuji.position.set(18, 11, -92); g.add(fuji);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(12.6, 9, 64, 1, true), new THREE.MeshStandardMaterial({ color: 0xf2e8f8, roughness: 0.9 })); cap.position.set(18, 21.6, -92); g.add(cap);
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, h = new THREE.Mesh(new THREE.SphereGeometry(R(14, 22), 16, 10), new THREE.MeshStandardMaterial({ color: 0x2a2440, roughness: 1 })); h.scale.y = 0.35; h.position.set(Math.cos(a) * 78, -2, Math.sin(a) * 78); g.add(h); }
    // torii aux deux bouts
    const red = new THREE.MeshStandardMaterial({ color: 0xc8202e, roughness: 0.6 }), black = new THREE.MeshStandardMaterial({ color: 0x141014, roughness: 0.6 });
    for (const z of [-15, 15]) {
      const t = new THREE.Group();
      for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 7.5, 16), red); p.position.set(sx * 3.6, 3.75, 0); t.add(p); }
      const top = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 0.7), black); top.position.y = 7.6; t.add(top);
      const top2 = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.45, 0.55), red); top2.position.y = 7.15; t.add(top2);
      const mid = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.3, 0.4), red); mid.position.y = 6.0; t.add(mid);
      t.position.z = z; g.add(t);
    }
    // pagode
    const pag = new THREE.Group();
    for (let k = 0; k < 5; k++) {
      const s = 4.2 - k * 0.6;
      const body = new THREE.Mesh(new THREE.BoxGeometry(s * 0.7, 1.6, s * 0.7), new THREE.MeshStandardMaterial({ color: 0x8a2a1a, roughness: 0.8 })); body.position.y = k * 2.1 + 0.8; pag.add(body);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(s * 0.85, 0.9, 4), black); roof.position.y = k * 2.1 + 1.9; roof.rotation.y = Math.PI / 4; pag.add(roof);
      const glow = new THREE.Mesh(new THREE.BoxGeometry(s * 0.72, 0.3, s * 0.72), basic(0xffb060)); glow.position.y = k * 2.1 + 1.0; pag.add(glow);
    }
    pag.position.set(-26, 0, -30); g.add(pag);
    // cerisiers : tronc noueux, branches, et des centaines de petites touffes de fleurs
    const trunk = new THREE.MeshStandardMaterial({ color: 0x2a1812, roughness: 1 });
    const petalCols = [0xffc4dc, 0xffb0cf, 0xff9ac2, 0xffd6e6, 0xfff0f5];
    const blossomGeo = new THREE.IcosahedronGeometry(0.34, 0);
    const blossom = new THREE.InstancedMesh(blossomGeo, new THREE.MeshStandardMaterial({ roughness: 0.75, emissive: 0xff7ab0, emissiveIntensity: 0.22, flatShading: true }), 14 * 120);
    let bi = 0; const bm = new THREE.Matrix4(), bq = new THREE.Quaternion(), bs = new THREE.Vector3(), bp = new THREE.Vector3(), bc = new THREE.Color(), eu = new THREE.Euler();
    const trees = [[-24, -14], [24, -12], [-25, 12], [25, 13], [-27, 0], [27, 2], [-10, -22], [11, 23], [-30, -22], [30, 21], [-33, 9], [33, -8], [6, -24], [-6, 26]];
    for (const [x, z] of trees) {
      const h = R(3.2, 4.6), lean = R(-0.25, 0.25);
      const pts = [0, 1, 2, 3].map(k => new THREE.Vector3(Math.sin(lean) * k * 0.4, k / 3 * h, R(-0.2, 0.2)));
      g.add(place(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.26, 8), trunk), x, 0, z));
      const top = pts[3].clone().add(new THREE.Vector3(x, 0, z));
      const tips = [];
      for (let k = 0; k < 5; k++) {
        const a = k / 5 * Math.PI * 2 + R(-0.3, 0.3), L = R(1.6, 2.6);
        const tip = top.clone().add(new THREE.Vector3(Math.cos(a) * L, R(0.3, 1.2), Math.sin(a) * L)); tips.push(tip);
        g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([top.clone().add(new THREE.Vector3(0, -0.6, 0)), top.clone().lerp(tip, 0.5).add(new THREE.Vector3(0, 0.3, 0)), tip]), 8, 0.09, 6), trunk));
      }
      for (let k = 0; k < 120 && bi < blossom.count; k++, bi++) {
        const tp = tips[k % tips.length];
        bp.set(tp.x + R(-1.3, 1.3), tp.y + R(-0.6, 0.9), tp.z + R(-1.3, 1.3));
        bq.setFromEuler(eu.set(R(0, 3), R(0, 3), R(0, 3))); const sc = R(0.6, 1.25); bs.set(sc, sc * 0.8, sc);
        blossom.setMatrixAt(bi, bm.compose(bp, bq, bs)); blossom.setColorAt(bi, bc.setHex(petalCols[(rnd() * 5) | 0]));
      }
    }
    blossom.count = bi; g.add(blossom);
    // gravier zen ratissé autour du terrain
    const gravel = new THREE.Mesh(new THREE.RingGeometry(9, 40, 64), new THREE.MeshStandardMaterial({ roughness: 1, map: (() => { const t = tex(512, 512, (c2, w, h) => { c2.fillStyle = '#8a8478'; c2.fillRect(0, 0, w, h); for (let k = 0; k < 9000; k++) { const v = 100 + Math.random() * 90; c2.fillStyle = `rgb(${v},${v - 4},${v - 12})`; c2.fillRect(Math.random() * w, Math.random() * h, 2, 2); } c2.strokeStyle = 'rgba(40,36,30,0.35)'; c2.lineWidth = 3; for (let y = 0; y < h; y += 14) { c2.beginPath(); c2.moveTo(0, y); c2.lineTo(w, y); c2.stroke(); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(12, 2); return t; })() }));
    gravel.rotation.x = -Math.PI / 2; gravel.position.y = 0.005; g.add(gravel);
    // lanternes de pierre (tōrō) aux coins, avec flamme
    const stone = new THREE.MeshStandardMaterial({ color: 0x6a665e, roughness: 1, flatShading: true });
    for (const [x, z] of [[-5.6, -9.4], [5.6, -9.4], [-5.6, 9.4], [5.6, 9.4]]) {
      const t2 = new THREE.Group();
      t2.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.3, 6), stone), 0, 0.15, 0));
      t2.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.9, 8), stone), 0, 0.75, 0));
      t2.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.55), stone), 0, 1.42, 0));
      t2.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.6), basic(0xffb050)), 0, 1.42, 0));
      t2.add(place(new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.42, 6), stone), 0, 1.86, 0));
      t2.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), stone), 0, 2.12, 0));
      t2.position.set(x, 0, z); g.add(t2);
      const pl = new THREE.PointLight(0xffa050, 4, 6, 1.8); pl.position.set(x, 1.5, z); g.add(pl);
    }
    // lanternes en papier sur poteaux
    const lantern = basic(0xff9a40), lanternGeo = new THREE.SphereGeometry(0.26, 14, 10); lanternGeo.scale(1, 1.25, 1);
    const post = new THREE.MeshStandardMaterial({ color: 0x1a1210 });
    for (const sx of [-1, 1]) for (const z of [-4, 4]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), post); p.position.set(sx * 4.8, 1.3, z); g.add(p);
      const l = new THREE.Mesh(lanternGeo, lantern); l.position.set(sx * 4.8, 2.5, z); g.add(l);
      for (const dy of [0.33, -0.33]) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 12), post); cap.position.set(sx * 4.8, 2.5 + dy, z); g.add(cap); }
    }
    const moon = new THREE.Mesh(new THREE.CircleGeometry(6, 48), basic(0xfff4e0, { fog: false })); moon.position.set(-22, 20, -100); moon.lookAt(0, 20, 0); g.add(moon);
    const moonGlow = halo(0xffe0f0, 40, 0.35); moonGlow.position.set(-22, 20, -99); g.add(moonGlow);
    clouds(g, 12, 80, 100, 12, 26, 0xffb0c0, 0.7);
    // seconde pagode et lucioles
    const pag2 = pag.clone(); pag2.position.set(30, 0, -42); pag2.scale.setScalar(0.8); g.add(pag2);
    const ffN = 160, ffP = new Float32Array(ffN * 3), ffPh = [];
    for (let k = 0; k < ffN; k++) { ffP.set([R(-22, 22), R(0.4, 4), R(-24, 24)], k * 3); ffPh.push(R(0, 6)); }
    const ffGeo = new THREE.BufferGeometry(); ffGeo.setAttribute('position', new THREE.BufferAttribute(ffP, 3));
    const ff = new THREE.Points(ffGeo, new THREE.PointsMaterial({ color: 0xffe08a, size: 0.12, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); g.add(ff);
    for (const sx of [-1, 1]) for (const z of [-4, 4]) { const hl = halo(0xffa040, 1.8, 0.5); hl.position.set(sx * 4.8, 2.5, z); g.add(hl); }
    for (const [x, z] of [[-5.6, -9.4], [5.6, -9.4], [-5.6, 9.4], [5.6, 9.4]]) { const hl = halo(0xffb050, 1.6, 0.45); hl.position.set(x, 1.42, z); g.add(hl); }
    const redLantern = basic(0xff3a2a), rl = new THREE.SphereGeometry(0.2, 10, 8);
    for (const z of [-12, 12]) garland(g, new THREE.Vector3(-3.6, 6.2, z * 1.25), new THREE.Vector3(3.6, 6.2, z * 1.25), 9, 0.6, redLantern, rl);
    for (const sx of [-1, 1]) garland(g, new THREE.Vector3(sx * 4.8, 4.4, -12), new THREE.Vector3(sx * 4.8, 4.4, 12), 16, 1.2, redLantern, rl);
    const petals = fallers(700, [16, 12, 18], 0xffb7d5, 0.09, 0.95); g.add(petals);
    return { g, update(dt, t) {
      fall(petals, dt, t, 0.6, 0.5, 0.8); lantern.color.setRGB(1, 0.6 + Math.sin(t * 5) * 0.03, 0.25);
      for (let k = 0; k < ffN; k++) { const i = k * 3, ph = ffPh[k]; ffP[i] += Math.sin(t * 0.7 + ph) * dt * 0.4; ffP[i + 1] += Math.cos(t * 0.9 + ph * 2) * dt * 0.25; ffP[i + 2] += Math.cos(t * 0.6 + ph) * dt * 0.4; if (Math.abs(ffP[i]) < 5.5 && Math.abs(ffP[i + 2]) < 9) ffP[i] += Math.sign(ffP[i] || 1) * dt; }
      ff.geometry.attributes.position.needsUpdate = true; ff.material.opacity = 0.6 + Math.sin(t * 3) * 0.3;
    } };
  },

  // ---------------- Aurora : arène sur la banquise, aurores boréales, montagnes, sapins, neige
  aurora() {
    seed = 53;
    const g = new THREE.Group();
    g.add(skyDome(ARENA_VENUES.aurora.sky));
    g.add(stars(1600, 105, 0.05, 0.45));
    // rubans d'aurore animés
    const aTex = tex(512, 256, (c, w, h) => {
      const grd = c.createLinearGradient(0, h, 0, 0);
      grd.addColorStop(0, 'rgba(60,255,170,0)'); grd.addColorStop(0.08, 'rgba(60,255,170,0.9)'); grd.addColorStop(0.35, 'rgba(60,255,190,0.45)'); grd.addColorStop(0.7, 'rgba(140,90,255,0.25)'); grd.addColorStop(1, 'rgba(140,90,255,0)');
      c.fillStyle = grd;
      // rideaux : chaque colonne a sa propre intensité
      let a = 0.6;
      for (let x = 0; x < w; x += 2) { a = Math.max(0.2, Math.min(1, a + (Math.random() - 0.5) * 0.35)); c.globalAlpha = a; c.fillRect(x, 0, 2, h); }
      c.globalAlpha = 1;
    });
    aTex.wrapS = THREE.RepeatWrapping;
    const ribbons = [];
    for (const [z, y, len, ry] of [[-58, 10, 160, 0], [-70, 15, 180, 0.15], [58, 10, 160, Math.PI], [64, 15, 170, Math.PI + 0.15], [-20, 16, 130, Math.PI / 2]]) {
      const geo = new THREE.PlaneGeometry(len, 20, 96, 1);
      const m = new THREE.MeshBasicMaterial({ map: aTex.clone(), transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, fog: false, toneMapped: false });
      m.map.wrapS = THREE.RepeatWrapping; m.map.needsUpdate = true;
      const r = new THREE.Mesh(geo, m); r.position.set(ry === Math.PI / 2 ? -70 : 0, y, z); r.rotation.y = ry; g.add(r);
      ribbons.push({ r, base: Float32Array.from(geo.attributes.position.array), ph: R(0, 6) });
    }
    // montagnes enneigées
    for (let k = 0; k < 18; k++) {
      const a = k / 18 * Math.PI * 2 + R(-0.1, 0.1), d = R(72, 92), h = R(18, 40), rad = R(14, 24);
      const geo = new THREE.ConeGeometry(rad, h, 9, 4).toNonIndexed(); const p = geo.attributes.position, col = [];
      for (let i = 0; i < p.count; i++) { const y = (p.getY(i) + h / 2) / h; const snow = y > 0.55 + Math.sin(i) * 0.06; col.push(...(snow ? [0.92, 0.96, 1] : [0.18, 0.25, 0.36])); }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
      m.position.set(Math.cos(a) * d, h / 2 - 3, Math.sin(a) * d); m.rotation.y = R(0, 6); g.add(m);
    }
    // sapins
    const pine = new THREE.MeshStandardMaterial({ color: 0x14302a, roughness: 1, flatShading: true }), snowM = new THREE.MeshStandardMaterial({ color: 0xeef6ff, roughness: 1 });
    for (let k = 0; k < 46; k++) {
      const a = R(0, 6.28), d = R(17, 40), x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (inStands(x, z) || nearCourt(x, z)) continue;
      const t = new THREE.Group(), s = R(0.8, 1.6);
      for (let j = 0; j < 3; j++) { const c = new THREE.Mesh(new THREE.ConeGeometry(1.4 - j * 0.35, 1.8, 7), j === 2 ? snowM : pine); c.position.y = 1.2 + j * 1.0; t.add(c); }
      t.scale.setScalar(s); t.position.set(x, 0, z); g.add(t);
    }
    // braseros
    const fire = [];
    for (const [x, z] of [[-4.9, -8.6], [4.9, -8.6], [-4.9, 8.6], [4.9, 8.6]]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.22, 0.9, 12), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.5 })); b.position.set(x, 0.45, z); g.add(b);
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 10), basic(0xff8a2a, { transparent: true, opacity: 0.9 })); f.position.set(x, 1.25, z); g.add(f); fire.push(f);
      const l = new THREE.PointLight(0xff8a3a, 6, 8, 1.6); l.position.set(x, 1.6, z); g.add(l); fire.push(l);
    }
    // chalet aux fenêtres chaudes, étoiles filantes, halos des braseros
    const cabin = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ color: 0x4a2c18, roughness: 1 });
    cabin.add(place(new THREE.Mesh(new THREE.BoxGeometry(6, 3, 4.5), wood), 0, 1.5, 0));
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 4.2, 2.4, 4, 1), new THREE.MeshStandardMaterial({ color: 0xeef6ff, roughness: 1 })); roof.rotation.y = Math.PI / 4; roof.scale.set(1.15, 1, 0.85); roof.position.y = 4.2; cabin.add(roof);
    for (const x of [-1.6, 1.6]) { const w2 = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.9), basic(0xffb050)); w2.position.set(x, 1.7, 2.26); cabin.add(w2); const hl = halo(0xffa040, 3, 0.5); hl.position.set(x, 1.7, 2.4); cabin.add(hl); }
    cabin.position.set(14, 0, -30); cabin.rotation.y = -0.4; g.add(cabin);
    const cabin2 = cabin.clone(); cabin2.position.set(-18, 0, 32); cabin2.rotation.y = Math.PI + 0.3; g.add(cabin2);
    for (const f of fire) if (f.isMesh) { const hl = halo(0xff8a3a, 1.5, 0.35); hl.position.copy(f.position); g.add(hl); }
    const shoot = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.12), new THREE.MeshBasicMaterial({ map: tex(256, 8, (c2, w, h) => { const gr2 = c2.createLinearGradient(0, 0, w, 0); gr2.addColorStop(0, 'rgba(255,255,255,0)'); gr2.addColorStop(1, 'rgba(255,255,255,1)'); c2.fillStyle = gr2; c2.fillRect(0, 0, w, h); }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false, side: THREE.DoubleSide }));
    g.add(shoot); let shootT = 0, shootV = new THREE.Vector3();
    const snow = fallers(1200, [20, 14, 22], 0xffffff, 0.07, 0.85); g.add(snow);
    return { g, update(dt, t) {
      for (const R2 of ribbons) {
        const p = R2.r.geometry.attributes.position, b = R2.base;
        for (let i = 0; i < p.count; i++) { const x = b[i * 3], y = b[i * 3 + 1]; p.setZ(i, Math.sin(x * 0.045 + t * 0.35 + R2.ph) * 7 + Math.sin(x * 0.11 - t * 0.6) * 2); p.setY(i, y + Math.sin(x * 0.07 + t * 0.5) * 2.5); }
        p.needsUpdate = true; R2.r.material.map.offset.x = t * 0.01 + R2.ph;
        R2.r.material.opacity = 0.75 + Math.sin(t * 0.4 + R2.ph) * 0.25;
      }
      fall(snow, dt, t, 0.9, 0.3, 0.4);
      shootT -= dt;
      if (shootT <= 0) { shootT = R(2.5, 6); const a = R(-0.6, 0.6); shoot.position.set(R(-40, 40), R(14, 24), R(-70, -50) * (rnd() < 0.5 ? 1 : -1)); shootV.set(Math.cos(a) * 40, -12, 0); shoot.lookAt(shoot.position.x, shoot.position.y, 0); shoot.material.opacity = 1; }
      shoot.position.addScaledVector(shootV, dt); shoot.material.opacity = Math.max(0, shoot.material.opacity - dt * 1.4); shoot.rotation.z = Math.atan2(shootV.y, shootV.x);
      fire.forEach((f, k) => { if (f.isMesh) f.scale.set(1, 0.8 + Math.sin(t * 13 + k) * 0.2 + Math.random() * 0.1, 1); else f.intensity = 5 + Math.random() * 2; });
    } };
  },
};

const built = {};
export function arenaKit(id, scene) {
  if (!id || !BUILD[id]) return null;
  if (!built[id]) { built[id] = BUILD[id](); scene.add(built[id].g); }
  return built[id];
}
export function hideKits() { for (const k of Object.values(built)) k.g.visible = false; }
