// Manette (API Gamepad) + clavier de secours.
// Mapping manette standard : A/Croix = Lift, B/Rond = Frappe, X/Carré = Coupé, Y/Triangle = Lob,
// LB/L1 et RB/R1 = effet latéral, RT/R2 = super coup, Start = pause/menu.
// Clavier (touches physiques) : ZQSD ou flèches, J = Lift, K = Frappe, U = Coupé, I = Lob, A/E = latéral, L = super coup.

export const SHOTS = ['top', 'plat', 'coupe', 'lob'];
const PAD_BTN = { top: 0, plat: 1, coupe: 2, lob: 3, sideL: 4, sideR: 5, super: 7, cam: 8, start: 9 };
const KEYS = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  top: ['KeyJ', 'Space'], plat: ['KeyK'], coupe: ['KeyU'], lob: ['KeyI'], sideL: ['KeyQ'], sideR: ['KeyE'], super: ['KeyL'], cam: ['KeyC'],
  start: ['Escape'],
};

const DEAD = 0.18;
const dz = v => (Math.abs(v) < DEAD ? 0 : (v - Math.sign(v) * DEAD) / (1 - DEAD));

export class Input {
  constructor() {
    this.keys = new Set();
    this.prev = {};
    this.padName = null;
    this.invertY = false;
    addEventListener('keydown', e => {
      if (e.target && e.target.tagName === 'INPUT') return;
      this.keys.add(e.code);
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
  }

  k(name) { return KEYS[name].some(c => this.keys.has(c)); }

  // État fusionné clavier + toutes les manettes branchées
  poll() {
    let mx = 0, my = 0;
    const btn = {};
    for (const n of Object.keys(PAD_BTN)) btn[n] = this.k(n);
    if (this.k('left')) mx -= 1;
    if (this.k('right')) mx += 1;
    if (this.k('up')) my += 1;
    if (this.k('down')) my -= 1;

    let pads = [];
    try { pads = navigator.getGamepads ? [...navigator.getGamepads()] : []; } catch (e) { pads = []; }
    this.padName = null;
    for (const gp of pads) {
      if (!gp || !gp.connected) continue;
      this.padName = gp.id;
      const ax = dz(gp.axes[0] || 0), ay = dz(gp.axes[1] || 0);
      if (Math.abs(ax) > Math.abs(mx)) mx = ax;
      if (Math.abs(ay) > Math.abs(my)) my = -ay;
      // croix directionnelle
      const b = gp.buttons;
      if (b[14] && b[14].pressed) mx = -1;
      if (b[15] && b[15].pressed) mx = 1;
      if (b[12] && b[12].pressed) my = 1;
      if (b[13] && b[13].pressed) my = -1;
      for (const [n, i] of Object.entries(PAD_BTN)) if (b[i] && b[i].pressed) btn[n] = true;
    }
    if (this.invertY) my = -my;
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }

    const pressed = {}, released = {};
    for (const n of Object.keys(btn)) {
      pressed[n] = btn[n] && !this.prev[n];
      released[n] = !btn[n] && this.prev[n];
    }
    this.prev = btn;
    return { mx, my, aimX: mx, aimY: my, btn, pressed, released };
  }
}

export function emptyInput() {
  const btn = {}, pressed = {}, released = {};
  for (const n of Object.keys(PAD_BTN)) { btn[n] = false; pressed[n] = false; released[n] = false; }
  return { mx: 0, my: 0, aimX: 0, aimY: 0, btn, pressed, released };
}
