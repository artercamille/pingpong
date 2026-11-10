// Sols procéduraux haute définition : chaque salle a sa vraie matière (taraflex, asphalte mouillé,
// terrasse en bois, béton ciré, panneaux métalliques, parquet laqué, glace).
// Chaque style dessine la couleur ET un masque de reflet (blanc = mat, noir = miroir) utilisé
// par le sol réfléchissant.
const PX = 137; // pixels par mètre (le terrain fait 8,4 m x 15 m → 1152 x 2048)

let seed = 3;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const R = (a, b) => a + rnd() * (b - a);

function grain(g, w, h, amount, mono = true) {
  const img = g.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    if (mono) { d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    else { d[i] += n; d[i + 1] += (Math.random() - 0.5) * amount; d[i + 2] += (Math.random() - 0.5) * amount; }
  }
  g.putImageData(img, 0, 0);
}
function blobs(g, w, h, n, rMin, rMax, cols, alpha) {
  for (let k = 0; k < n; k++) {
    const x = rnd() * w, y = rnd() * h, r = R(rMin, rMax);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    const c = cols[k % cols.length];
    gr.addColorStop(0, `rgba(${c},${alpha})`); gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
}
function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

// --- styles : (couleur, masque) ---------------------------------------------------------------
const STYLES = {
  taraflex(g, m, w, h, v) {
    g.fillStyle = v.floor; g.fillRect(0, 0, w, h);
    blobs(g, w, h, 40, 120, 380, ['255,255,255', '0,0,0'], 0.025);
    grain(g, w, h, 9);
    // zone de jeu un peu plus claire sous la table
    const gr = g.createRadialGradient(w / 2, h / 2, 60, w / 2, h / 2, h * 0.42);
    gr.addColorStop(0, 'rgba(255,255,255,0.06)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    m.fillStyle = '#b0b0b0'; m.fillRect(0, 0, w, h);
  },
  asphalt(g, m, w, h) {
    g.fillStyle = '#26222f'; g.fillRect(0, 0, w, h);
    blobs(g, w, h, 60, 80, 300, ['58,52,74', '14,12,20'], 0.45);
    grain(g, w, h, 34);
    for (let k = 0; k < 2600; k++) { g.fillStyle = `rgba(${R(120, 200) | 0},${R(110, 190) | 0},${R(130, 210) | 0},${R(0.1, 0.35)})`; g.fillRect(rnd() * w, rnd() * h, R(1, 3), R(1, 3)); }
    // fissures et joints goudronnés
    g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 3;
    for (let k = 0; k < 14; k++) { let x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 9; j++) { x += R(-60, 60); y += R(-60, 60); g.lineTo(x, y); } g.stroke(); }
    // flaques : plus sombres et très réfléchissantes
    m.fillStyle = '#9a9a9a'; m.fillRect(0, 0, w, h);
    for (let k = 0; k < 26; k++) {
      const x = rnd() * w, y = rnd() * h, rx = R(60, 260), ry = R(40, 160), a = R(0, 3);
      for (const [ctx, col] of [[g, 'rgba(10,8,16,0.35)'], [m, '#303030']]) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath();
        for (let t = 0; t <= 24; t++) { const ang = t / 24 * Math.PI * 2, rr = 1 + Math.sin(ang * 3 + k) * 0.18 + Math.sin(ang * 5 + k * 2) * 0.1; ctx.lineTo(Math.cos(ang) * rx * rr, Math.sin(ang) * ry * rr); }
        ctx.fillStyle = col; ctx.fill(); ctx.restore();
      }
    }
  },
  deck(g, m, w, h) {
    const pw = Math.round(0.145 * PX);
    g.fillStyle = '#6a4228'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += pw) {
      let y = -R(0, 400);
      while (y < h) {
        const len = R(2.2, 4.2) * PX, base = [R(140, 176), R(92, 116), R(58, 74)];
        const gr = g.createLinearGradient(x, 0, x + pw, 0);
        gr.addColorStop(0, `rgb(${base[0] - 12 | 0},${base[1] - 10 | 0},${base[2] - 8 | 0})`); gr.addColorStop(0.5, `rgb(${base[0] | 0},${base[1] | 0},${base[2] | 0})`); gr.addColorStop(1, `rgb(${base[0] - 16 | 0},${base[1] - 12 | 0},${base[2] - 10 | 0})`);
        g.fillStyle = gr; g.fillRect(x + 2, y, pw - 4, len - 3);
        // veinage
        g.strokeStyle = 'rgba(60,32,16,0.25)'; g.lineWidth = 1;
        for (let k = 0; k < 4; k++) { g.beginPath(); const xx = x + R(4, pw - 4); g.moveTo(xx, y); for (let yy = y; yy < y + len; yy += 30) g.lineTo(xx + Math.sin(yy * 0.02 + k) * 2, yy); g.stroke(); }
        // clous
        g.fillStyle = 'rgba(30,20,12,0.8)'; for (const yy of [y + 10, y + len - 14]) { g.fillRect(x + 5, yy, 2, 2); g.fillRect(x + pw - 7, yy, 2, 2); }
        y += len;
      }
    }
    // sel et soleil : bois délavé par endroits
    blobs(g, w, h, 30, 100, 300, ['255,230,200', '40,20,10'], 0.08);
    grain(g, w, h, 10);
    m.fillStyle = '#d8d8d8'; m.fillRect(0, 0, w, h);
  },
  concrete(g, m, w, h) {
    g.fillStyle = '#3b3b40'; g.fillRect(0, 0, w, h);
    blobs(g, w, h, 90, 60, 320, ['90,90,96', '20,20,24', '60,58,52'], 0.22);
    // traces de truelle
    g.strokeStyle = 'rgba(255,255,255,0.035)'; g.lineWidth = 18;
    for (let k = 0; k < 40; k++) { g.beginPath(); g.arc(rnd() * w, rnd() * h, R(80, 240), R(0, 6), R(0, 6) + R(0.6, 1.6)); g.stroke(); }
    grain(g, w, h, 16);
    // taches
    blobs(g, w, h, 14, 30, 110, ['10,10,12'], 0.35);
    // joints sciés tous les 2 m
    g.fillStyle = 'rgba(0,0,0,0.6)';
    for (let x = PX * 0.2; x < w; x += PX * 2) g.fillRect(x, 0, 3, h);
    for (let y = PX * 0.5; y < h; y += PX * 2) g.fillRect(0, y, w, 3);
    m.fillStyle = '#7a7a7a'; m.fillRect(0, 0, w, h);
    blobs(m, w, h, 40, 100, 300, ['255,255,255', '0,0,0'], 0.25);
  },
  metal(g, m, w, h, v) {
    const ps = Math.round(1.05 * PX);
    for (let y = 0; y < h; y += ps) for (let x = 0; x < w; x += ps) {
      const b = R(30, 42);
      g.fillStyle = `rgb(${b | 0},${b + 4 | 0},${b + 10 | 0})`; g.fillRect(x, y, ps, ps);
      // brossé
      for (let k = 0; k < 70; k++) { g.fillStyle = `rgba(255,255,255,${R(0.01, 0.05)})`; g.fillRect(x, y + rnd() * ps, ps, 1); }
      // biseau
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x, y, ps, 2); g.fillRect(x, y, 2, ps);
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x, y + ps - 3, ps, 3); g.fillRect(x + ps - 3, y, 3, ps);
      // rivets
      g.fillStyle = 'rgba(200,210,225,0.5)'; for (const [a, c] of [[8, 8], [ps - 10, 8], [8, ps - 10], [ps - 10, ps - 10]]) { g.beginPath(); g.arc(x + a, y + c, 2.5, 0, 7); g.fill(); }
      if (rnd() < 0.12) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + ps * 0.3, y + ps * 0.3, ps * 0.4, ps * 0.4); }
    }
    // joints lumineux
    const [r, gg, bb] = hex2rgb(v.accent);
    g.fillStyle = `rgba(${r},${gg},${bb},0.35)`;
    for (let x = ps * 2; x < w; x += ps * 2) g.fillRect(x - 1, 0, 2, h);
    for (let y = ps * 3; y < h; y += ps * 3) g.fillRect(0, y - 1, w, 2);
    // bandes de sécurité sur les bords
    g.save(); g.beginPath(); g.rect(0, 0, w, 46); g.rect(0, h - 46, w, 46); g.clip();
    for (let x = -60; x < w + 60; x += 46) { g.fillStyle = 'rgba(255,190,40,0.55)'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 23, 0); g.lineTo(x - 23, h); g.lineTo(x - 46, h); g.fill(); }
    g.restore();
    grain(g, w, h, 8);
    m.fillStyle = '#8a8a8a'; m.fillRect(0, 0, w, h);
  },
  darkwood(g, m, w, h) {
    const pw = Math.round(0.19 * PX);
    for (let x = 0; x < w; x += pw) {
      let y = -R(0, 600);
      while (y < h) {
        const len = R(3, 5.5) * PX, b = [R(78, 98), R(36, 46), R(24, 30)];
        g.fillStyle = `rgb(${b[0] | 0},${b[1] | 0},${b[2] | 0})`; g.fillRect(x, y, pw - 1, len - 1);
        for (let k = 0; k < 7; k++) { g.strokeStyle = `rgba(${k % 2 ? '30,12,6' : '140,70,40'},${R(0.12, 0.3)})`; g.lineWidth = R(1, 2.5); g.beginPath(); const xx = x + R(2, pw - 2); g.moveTo(xx, y); for (let yy = y; yy < y + len; yy += 24) g.lineTo(xx + Math.sin(yy * 0.013 + k * 2) * 4 + Math.sin(yy * 0.05) * 1.2, yy); g.stroke(); }
        g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(x, y + len - 1, pw, 2);
        y += len;
      }
      g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(x + pw - 1, 0, 1, h);
    }
    blobs(g, w, h, 20, 150, 400, ['255,180,140'], 0.04);
    grain(g, w, h, 7);
    m.fillStyle = '#7c7c7c'; m.fillRect(0, 0, w, h);
  },
  ice(g, m, w, h) {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#5e9ec4'); gr.addColorStop(0.5, '#7ab6d6'); gr.addColorStop(1, '#5a98c0'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    // profondeur : poches bleu profond
    blobs(g, w, h, 46, 120, 360, ['14,70,130', '200,235,250'], 0.3);
    // traces de lames
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    for (let k = 0; k < 90; k++) { g.lineWidth = R(0.6, 2); g.beginPath(); const cx = rnd() * w, cy = rnd() * h, r = R(100, 600), a = R(0, 6); g.arc(cx, cy, r, a, a + R(0.2, 0.9)); g.stroke(); }
    // fissures
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1.4;
    for (let k = 0; k < 22; k++) { let x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 8; j++) { x += R(-70, 70); y += R(-70, 70); g.lineTo(x, y); if (rnd() < 0.3) { g.moveTo(x, y); } } g.stroke(); }
    // bulles prises dans la glace
    for (let k = 0; k < 500; k++) { g.fillStyle = `rgba(255,255,255,${R(0.2, 0.6)})`; g.beginPath(); g.arc(rnd() * w, rnd() * h, R(0.8, 2.5), 0, 7); g.fill(); }
    grain(g, w, h, 5);
    m.fillStyle = '#6a6a6a'; m.fillRect(0, 0, w, h);
    blobs(m, w, h, 30, 100, 300, ['255,255,255'], 0.2);
  },
};

// marquages communs : liseré, titres, logos
function markings(g, w, h, v, logo) {
  const acc = v.accent, txt = v.floorText || 'rgba(255,255,255,0.8)';
  g.save();
  g.strokeStyle = acc; g.globalAlpha = 0.85; g.lineWidth = 10; g.strokeRect(26, 26, w - 52, h - 52);
  g.globalAlpha = 0.25; g.lineWidth = 3; g.strokeRect(52, 52, w - 104, h - 104);
  g.restore();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const [x, y, r] of [[w * 0.5, h * 0.085, 0], [w * 0.5, h * 0.915, Math.PI]]) {
    g.save(); g.translate(x, y); g.rotate(r); g.globalAlpha = 0.85;
    g.fillStyle = txt; g.font = 'italic 900 78px Arial'; g.fillText((v.title || 'PINGPONG').toUpperCase(), 0, 0);
    g.font = '800 30px Arial'; g.fillStyle = acc; g.fillText((v.sub || '').toUpperCase(), 0, 58); g.restore();
  }
  logo(g, w * 0.86, h * 0.5, 44, Math.PI / 2, 0.55); logo(g, w * 0.14, h * 0.5, 44, -Math.PI / 2, 0.55);
}

export const FLOOR_STYLE = { finale: 'taraflex' };
export function paintFloor(colorCanvas, maskCanvas, v, logo) {
  seed = 3 + (v.title || '').length * 7;
  const g = colorCanvas.getContext('2d', { willReadFrequently: true }), m = maskCanvas.getContext('2d');
  const w = colorCanvas.width, h = colorCanvas.height;
  m.setTransform(maskCanvas.width / w, 0, 0, maskCanvas.height / h, 0, 0);
  (STYLES[v.floorStyle] || STYLES.taraflex)(g, m, w, h, v);
  markings(g, w, h, v, logo);
  // la lumière tombe au centre : les bords du terrain s'assombrissent
  const k = v.floorVig ?? 0.55;
  if (k > 0) { const vg = g.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.6); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${k})`); g.fillStyle = vg; g.fillRect(0, 0, w, h); }
}
