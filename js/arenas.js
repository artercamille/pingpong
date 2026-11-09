// Salles à thème : chaque salle a son décor 3D complet (ciel, horizon, objets animés).
// Les kits sont construits à la demande et cachés quand on change de salle.
import * as THREE from 'three';

// ------------------------------------------------------------------ définitions (paramètres de setVenue)
export const ARENA_VENUES = {
  neotokyo: {
    kit: 'tokyo', title: 'NEO TOKYO', sub: 'ROOFTOP SERIES', pattern: 'grid', floor: '#15111f', outer: 0x17161d, outerRough: 0.22, outerMetal: 0.35, outerSize: [46, 40],
    accent: '#ff2bd6', neon: 0xff2bd6, neon2: 0x2be8ff, legs: 0x2be8ff, light: 0xff2bd6, amb: 16, bg: 0x0b0620, fog: 0.012,
    hemi: 0.45, hemiSky: 0x8a5fe6, hemiGround: 0x10081a, key: 1.1, spots: 0.85, ceiling: false, cones: false, screens: true, stands: 'sides',
    standCol: 0x16131e, seats: 0x2a1a40, table: '#0f1626', boardBg: '#0a0612', exposure: 1.1,
    sky: ['#03020b', '#120838', '#3a1260', '#9a2a8a', '#ff5fa8'], crowdPal: [0x1a1a24, 0x2a2440, 0xff2bd6, 0x2be8ff, 0x101016, 0x5a4a8a, 0xe8e8f0],
    items: ['NEO TOKYO', '@logo', 'ピンポン', 'ROOFTOP SERIES', '卓球'],
  },
  beach: {
    kit: 'beach', title: 'SUNSET BEACH', sub: 'MIAMI OPEN AIR', pattern: 'waves', floor: '#1d6f8f', outer: 0xe6c690, outerRough: 0.95, outerSize: [56, 48],
    accent: '#ffd23c', neon: 0xff8a3c, neon2: 0xffd23c, legs: 0xff6a3c, light: 0xffa060, amb: 10, bg: 0xff9d78, fog: 0.007,
    hemi: 1.05, hemiSky: 0xffc8a0, hemiGround: 0xb0805a, key: 1.7, spots: 0.45, ceiling: false, cones: false, screens: false, stands: 'sides',
    standCol: 0xeeeae2, seats: 0x3cb6c8, table: '#1f4fa8', boardBg: '#fff6e8', boardFg: '#1a3a6a', exposure: 1.0,
    sky: ['#2a1e6e', '#6a3a90', '#e85a6a', '#ff9a5a', '#ffe0a0'], crowdPal: [0xff5a5a, 0xffd23c, 0x3cc8ff, 0xffffff, 0xff8ad8, 0x3cff8a, 0xff8a3c, 0x2a6aff],
    items: ['SUNSET BEACH', '@logo', 'MIAMI OPEN AIR', 'SUMMER TOUR'],
  },
  underground: {
    kit: 'club', title: 'UNDERGROUND', sub: 'NIGHT SESSION', pattern: 'grid', floor: '#09090b', outer: 0x121214, outerRough: 0.35, outerMetal: 0.3,
    accent: '#3dff6e', neon: 0x3dff6e, neon2: 0xff3dc8, legs: 0x18181c, light: 0x3dff6e, amb: 14, bg: 0x020402, fog: 0.032,
    hemi: 0.25, hemiSky: 0x3dff6e, hemiGround: 0x050505, key: 1.0, spots: 0.9, ceiling: false, cones: true, screens: false, stands: 'sides',
    standCol: 0x111111, seats: 0x1a1a1a, table: '#101012', boardBg: '#050505', exposure: 1.05,
    crowdPal: [0x111111, 0x1a1a1a, 0x2a2a2a, 0x3dff6e, 0xff3dc8, 0xeeeeee, 0x3a2a4a],
    items: ['UNDERGROUND', '@logo', 'PING PONG CLUB', 'NIGHT SESSION'],
  },
  orbit: {
    kit: 'space', title: 'ORBITAL', sub: 'STATION ZÉRO-G', pattern: 'hex', floor: '#141a24', outer: 0x1c222c, outerRough: 0.3, outerMetal: 0.7, outerSize: [46, 40],
    accent: '#7fe3ff', neon: 0x7fe3ff, neon2: 0xffffff, legs: 0x9aa6b8, light: 0x7fe3ff, amb: 14, bg: 0x000000, fog: 0.003,
    hemi: 0.45, hemiSky: 0x6fa0ff, hemiGround: 0x0a0c12, key: 1.25, spots: 0.9, ceiling: false, cones: false, screens: true, stands: 'sides',
    standCol: 0x262c38, seats: 0x1f6fd6, table: '#0f1a30', boardBg: '#081018', exposure: 1.08, sky: 'space',
    crowdPal: [0xe8ecf2, 0xff8a3c, 0x2a3a5a, 0x7fe3ff, 0x9aa6b8, 0x1f6fd6],
    items: ['ORBITAL', '@logo', 'STATION ZÉRO-G', 'PING PONG SPATIAL'],
  },
  sakura: {
    kit: 'sakura', title: 'SAKURA', sub: 'TEMPLE MATSURI', pattern: 'planks', floor: '#5a3622', outer: 0x2c3a24, outerRough: 0.95, outerSize: [60, 60],
    accent: '#ff9ad8', neon: 0xff7ab8, neon2: 0xffc83c, legs: 0xc8202e, light: 0xffb070, amb: 12, bg: 0x4a2a5a, fog: 0.011,
    hemi: 0.75, hemiSky: 0xffa8cc, hemiGround: 0x2a2a20, key: 1.25, spots: 0.6, ceiling: false, cones: false, screens: false, stands: 'sides',
    standCol: 0x4a2c18, seats: 0x8a1a1a, table: '#1d3a2c', boardBg: '#1c0808', boardFg: '#ffe8d0', exposure: 1.02,
    sky: ['#1a1040', '#4a2a6a', '#b8507a', '#ff9a7a', '#ffd6a8'], crowdPal: [0xc8202e, 0xffffff, 0x1a1a2a, 0xff9ad8, 0x2a4a8a, 0xffc83c, 0x6a2a5a],
    items: ['SAKURA', '@logo', 'TEMPLE MATSURI', '桜'],
  },
  aurora: {
    kit: 'aurora', title: 'AURORA', sub: 'CERCLE POLAIRE', pattern: 'ice', floor: '#a9d6ec', floorText: '#0a3a5a', outer: 0xe8f2f8, outerRough: 0.75, outerSize: [70, 70],
    accent: '#14b88a', neon: 0x3dffb0, neon2: 0x8a5aff, legs: 0x2a4a6a, light: 0x6affd0, amb: 10, bg: 0x06121e, fog: 0.008,
    hemi: 0.7, hemiSky: 0x7ab8ff, hemiGround: 0xcfe6ff, key: 1.05, spots: 0.55, ceiling: false, cones: false, screens: false, stands: 'sides',
    standCol: 0x2a3a4a, seats: 0x1a4a6a, table: '#14304a', boardBg: '#06121c', exposure: 1.0,
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
    const blink = basic(0xff2020, { fog: false });
    const blinks = tops.map(p => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), blink); m.position.copy(p); g.add(m); return m; });
    const rain = fallers(1400, [18, 14, 20], 0x9fb8ff, 0.05, 0.55); g.add(rain);
    return { g, update(dt, t) { fall(rain, dt, t, 13, 1.2); const on = Math.sin(t * 3) > 0.6; blink.color.setRGB(on ? 1 : 0.2, 0.04, 0.04); } };
  },

  // ---------------- Sunset Beach : coucher de soleil, mer, palmiers, guirlandes
  beach() {
    seed = 11;
    const g = new THREE.Group();
    g.add(skyDome(ARENA_VENUES.beach.sky));
    const sun = new THREE.Mesh(new THREE.CircleGeometry(9, 48), basic(0xffe7a0, { fog: false }));
    sun.position.set(-8, 7, -95); sun.lookAt(0, 7, 0); g.add(sun);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), new THREE.MeshBasicMaterial({ map: tex(128, 128, (c, w, h) => { const r = c.createRadialGradient(64, 64, 4, 64, 64, 64); r.addColorStop(0, 'rgba(255,220,150,0.9)'); r.addColorStop(0.3, 'rgba(255,150,90,0.35)'); r.addColorStop(1, 'rgba(255,120,80,0)'); c.fillStyle = r; c.fillRect(0, 0, w, h); }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
    halo.position.set(-8, 7, -94); halo.lookAt(0, 7, 0); g.add(halo);
    // mer avec reflets qui scintillent
    const seaTex = tex(256, 256, (c, w, h) => { c.fillStyle = '#1a4a7a'; c.fillRect(0, 0, w, h); for (let k = 0; k < 260; k++) { c.fillStyle = `rgba(255,${180 + Math.random() * 60 | 0},120,${Math.random() * 0.6})`; c.fillRect(Math.random() * w, Math.random() * h, 6 + Math.random() * 30, 2); } });
    seaTex.wrapS = seaTex.wrapT = THREE.RepeatWrapping; seaTex.repeat.set(30, 30);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshStandardMaterial({ color: 0x2a6a9a, roughness: 0.12, metalness: 0.6, emissive: 0xffffff, emissiveMap: seaTex, emissiveIntensity: 0.55 }));
    sea.rotation.x = -Math.PI / 2; sea.position.y = -0.25; g.add(sea);
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
    for (const [z, ry, t, c] of [[-16.9, 0, 'PING PONG CLUB', '#3dff6e'], [16.9, Math.PI, 'NIGHT SESSION', '#ff3dc8']]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(16, 3.2), new THREE.MeshBasicMaterial({ map: tex(1024, 200, (c2, w, h) => { c2.font = 'italic 900 130px Arial'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.shadowColor = c; c2.shadowBlur = 30; c2.fillStyle = c; c2.fillText(t, w / 2, h / 2); c2.fillStyle = '#ffffff'; c2.shadowBlur = 0; c2.globalAlpha = 0.6; c2.fillText(t, w / 2, h / 2); }), transparent: true, toneMapped: false }));
      m.position.set(0, 6.8, z); m.rotation.y = ry; g.add(m);
    }
    // barres LED sur les murs latéraux
    const leds = [];
    for (const sx of [-1, 1]) for (let k = 0; k < 7; k++) { const m = basic(k % 2 ? 0x3dff6e : 0xff3dc8); const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 3.4), m); b.position.set(sx * 21.9, 8.6, -14 + k * 4.6); g.add(b); leds.push(m); }
    // cabine DJ
    const booth = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 1.4), new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.4, metalness: 0.5 })); booth.position.set(0, 2.6, -15.4); g.add(booth);
    const plat = new THREE.Mesh(new THREE.BoxGeometry(6, 2, 2.6), new THREE.MeshStandardMaterial({ color: 0x111113 })); plat.position.set(0, 1, -15.6); g.add(plat);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(3.9, 1.1), basic(0x3dff6e)); front.position.set(0, 2.6, -14.69); g.add(front);
    for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.3, 1.1), new THREE.MeshStandardMaterial({ color: 0x080808 })); sp.position.set(sx * 4.2, 0.65 + k * 1.32, -15.6); g.add(sp); const cone = new THREE.Mesh(new THREE.CircleGeometry(0.45, 20), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6, roughness: 0.3 })); cone.position.set(sx * 4.2, 0.65 + k * 1.32, -15.04); g.add(cone); }
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
    const strobe = new THREE.PointLight(0xffffff, 0, 40, 1.4); strobe.position.set(0, 9, 0); g.add(strobe);
    let st = 0;
    return { g, update(dt, t, cheer) {
      ball.rotation.y += dt * 0.6;
      const beat = t * 2.133;
      leds.forEach((m, k) => { const on = (Math.floor(beat) + k) % 4 === 0; m.color.setHex(on ? 0xffffff : k % 2 ? 0x3dff6e : 0xff3dc8); });
      for (const L of lasers) { const s = Math.sign(L.z); L.l.rotation.set(s * (0.75 + Math.sin(t * 0.7 + L.k) * 0.35), 0, Math.sin(t * 0.9 + L.k * 0.7) * 0.9); L.m.opacity = 0.35 + 0.3 * Math.max(0, Math.sin(beat * Math.PI)); }
      st -= dt; if (cheer > 0.5 && st <= 0) st = 0.09;
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
    const sat = new THREE.Group();
    sat.add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 2), metal));
    for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(4, 0.05, 1.4), new THREE.MeshStandardMaterial({ color: 0x1a3a8a, metalness: 0.6, roughness: 0.3, emissive: 0x0a1a4a })); p.position.x = sx * 2.7; sat.add(p); }
    const satLight = basic(0xff3030, { fog: false }); const sl = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), satLight); sl.position.y = 0.7; sat.add(sl);
    g.add(sat);
    return { g, update(dt, t) {
      planet.rotation.y += dt * 0.012; ring.rotation.z += dt * 0.004;
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
    // cerisiers
    const trunk = new THREE.MeshStandardMaterial({ color: 0x2a1a14, roughness: 1 });
    const blossom = new THREE.MeshStandardMaterial({ color: 0xffb7d5, roughness: 0.8, flatShading: true, emissive: 0xff6aa8, emissiveIntensity: 0.18 });
    const trees = [[-24, -14], [24, -12], [-25, 12], [25, 13], [-27, 0], [27, 2], [-10, -22], [11, 23], [-30, -22], [30, 21], [-33, 9], [33, -8], [0, -26], [-3, 27]];
    for (const [x, z] of trees) {
      const t = new THREE.Group(), h = R(3, 4.5);
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, h, 8), trunk); tr.position.y = h / 2; tr.rotation.z = R(-0.15, 0.15); t.add(tr);
      for (let k = 0; k < 9; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(R(1.0, 1.7), 1), blossom); b.position.set(R(-1.8, 1.8), h + R(-0.4, 1.4), R(-1.8, 1.8)); t.add(b); }
      t.position.set(x, 0, z); g.add(t);
    }
    // lanternes en papier sur poteaux et guirlandes au-dessus du terrain
    const lantern = basic(0xffa040), lanternGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.42, 12);
    const post = new THREE.MeshStandardMaterial({ color: 0x1a1210 });
    for (const sx of [-1, 1]) for (const z of [-11, -4, 4, 11]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), post); p.position.set(sx * 4.8, 1.2, z); g.add(p);
      const l = new THREE.Mesh(lanternGeo, lantern); l.position.set(sx * 4.8, 2.6, z); g.add(l);
    }
    const redLantern = basic(0xff3a2a), rl = new THREE.SphereGeometry(0.2, 10, 8);
    for (const z of [-12, 12]) garland(g, new THREE.Vector3(-3.6, 6.2, z * 1.25), new THREE.Vector3(3.6, 6.2, z * 1.25), 9, 0.6, redLantern, rl);
    for (const sx of [-1, 1]) garland(g, new THREE.Vector3(sx * 4.8, 4.4, -12), new THREE.Vector3(sx * 4.8, 4.4, 12), 16, 1.2, redLantern, rl);
    const petals = fallers(700, [16, 12, 18], 0xffb7d5, 0.09, 0.95); g.add(petals);
    return { g, update(dt, t) { fall(petals, dt, t, 0.6, 0.5, 0.8); lantern.color.setRGB(1, 0.6 + Math.sin(t * 5) * 0.03, 0.25); } };
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
      c.fillStyle = grd; c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = 'destination-in';
      for (let x = 0; x < w; x += 2) { c.fillStyle = `rgba(0,0,0,${0.35 + Math.random() * 0.65})`; c.fillRect(x, 0, 2, h); }
    });
    aTex.wrapS = THREE.RepeatWrapping;
    const ribbons = [];
    for (const [z, y, len, ry] of [[-60, 15, 150, 0], [-72, 21, 170, 0.2], [62, 16, 150, Math.PI], [-20, 24, 120, Math.PI / 2]]) {
      const geo = new THREE.PlaneGeometry(len, 24, 96, 1);
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
    const snow = fallers(1200, [20, 14, 22], 0xffffff, 0.07, 0.85); g.add(snow);
    return { g, update(dt, t) {
      for (const R2 of ribbons) {
        const p = R2.r.geometry.attributes.position, b = R2.base;
        for (let i = 0; i < p.count; i++) { const x = b[i * 3], y = b[i * 3 + 1]; p.setZ(i, Math.sin(x * 0.045 + t * 0.35 + R2.ph) * 7 + Math.sin(x * 0.11 - t * 0.6) * 2); p.setY(i, y + Math.sin(x * 0.07 + t * 0.5) * 2.5); }
        p.needsUpdate = true; R2.r.material.map.offset.x = t * 0.01 + R2.ph;
        R2.r.material.opacity = 0.75 + Math.sin(t * 0.4 + R2.ph) * 0.25;
      }
      fall(snow, dt, t, 0.9, 0.3, 0.4);
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
