// Sons du jeu : impacts de balle synthétisés (synthèse modale) + vrais enregistrements de public (CC0),
// le tout passé dans une réverbération de grande salle.
let ctx = null, master = null, dry = null, wetSend = null, muffle = null, muted = false;
let sfxBus = null, crowdBus = null, musicBus = null;
const vol = { master: 0.8, sfx: 0.8, crowd: 0.8, music: 0.5 };
export function getCtx() { return ctx; }
export function getMusicBus() { return musicBus; }
export function setVolumes(v) {
  Object.assign(vol, v);
  if (!ctx) return;
  master.gain.setTargetAtTime(muted ? 0 : VOLUME * vol.master, ctx.currentTime, 0.1);
  sfxBus.gain.value = vol.sfx; crowdBus.gain.value = vol.crowd; musicBus.gain.value = vol.music;
}
const buffers = {};
const SAMPLES = { applause: 'assets/sfx/applause.mp3', cheer: 'assets/sfx/cheer.mp3', ovation: 'assets/sfx/ovation.mp3' };
const VOLUME = 0.55;

export function setMuted(v) {
  muted = v;
  if (sfxBus) { sfxBus.gain.setTargetAtTime(v ? 0 : vol.sfx, ctx.currentTime, 0.15); crowdBus.gain.setTargetAtTime(v ? 0 : vol.crowd, ctx.currentTime, 0.15); }
}
export function setCrowd() { /* plus de bruit de fond continu */ }
export function setMuffle(on) {
  if (muffle) muffle.frequency.setTargetAtTime(on ? 1400 : 20000, ctx.currentTime, 0.3);
}

// réponse impulsionnelle d'une grande salle (bruit qui décroît)
function hallIR(sec = 1.6) {
  const len = Math.floor(ctx.sampleRate * sec);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3.2) * (i < 400 ? i / 400 : 1);
    }
  }
  return ir;
}

export function initAudio() {
  if (ctx) { ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = VOLUME * vol.master;
    muffle = ctx.createBiquadFilter(); muffle.type = 'lowpass'; muffle.frequency.value = 20000;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
    master.connect(muffle); muffle.connect(comp); comp.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = muted ? 0 : vol.sfx; sfxBus.connect(master);
    crowdBus = ctx.createGain(); crowdBus.gain.value = muted ? 0 : vol.crowd; crowdBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = vol.music; musicBus.connect(master);
    dry = sfxBus;
    const verb = ctx.createConvolver(); verb.buffer = hallIR();
    wetSend = ctx.createGain(); wetSend.gain.value = 0.22;
    wetSend.connect(verb); verb.connect(sfxBus);
    for (const [k, url] of Object.entries(SAMPLES)) {
      fetch(url).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).then(buf => { buffers[k] = buf; }).catch(() => {});
    }
  } catch (e) { ctx = null; }
}

function out(node, wet = 1, bus = null) {
  node.connect(bus || dry);
  if (wet) { const g = ctx.createGain(); g.gain.value = wet; node.connect(g); g.connect(wetSend); }
}

// impact « modal » : quelques résonances amorties + un petit clic
function modal(freqs, decays, amps, vol, click = 0.4, clickFreq = 4000, wet = 1) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const det = 1 + (Math.random() - 0.5) * 0.06;
  const bus = ctx.createGain(); bus.gain.value = vol;
  out(bus, wet);
  freqs.forEach((f, i) => {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * det;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amps[i], t + 0.0008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decays[i] * 5);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + decays[i] * 5 + 0.02);
  });
  if (click > 0) {
    const n = ctx.createBufferSource();
    const len = Math.floor(ctx.sampleRate * 0.004);
    const b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    n.buffer = b;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = clickFreq;
    const g = ctx.createGain(); g.gain.value = click;
    n.connect(f); f.connect(g); g.connect(bus); n.start(t);
  }
}

function noiseBurst(dur, vol, freq, q, type = 'bandpass', sweepTo = 0) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const len = Math.floor(ctx.sampleRate * dur);
  const b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const n = ctx.createBufferSource(); n.buffer = b;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  n.connect(f); f.connect(g); out(g, 0.6); n.start(t);
}

function sample(name, vol = 1, rate = 1, offset = 0) {
  if (!ctx || muted || !buffers[name]) return;
  const s = ctx.createBufferSource(); s.buffer = buffers[name]; s.playbackRate.value = rate;
  const g = ctx.createGain(); g.gain.value = vol;
  s.connect(g); g.connect(crowdBus);
  s.start(ctx.currentTime, offset);
}

function tone(freq, dur, vol, type = 'sine') {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur + 0.02);
}

const rnd = (a, b) => a + Math.random() * (b - a);

export const sfx = {
  // rebond sur la table : « tic » sec et brillant
  table(speed = 5) {
    const v = Math.min(1, 0.35 + speed / 16);
    modal([1180, 2650, 4300], [0.012, 0.008, 0.005], [1, 0.45, 0.25], 0.32 * v, 0.5, 5000);
  },
  // frappe de raquette : « toc » plus rond (bois + caoutchouc)
  paddle(power = 0.5) {
    const p = Math.min(1, power);
    modal([620 + p * 120, 1450, 2900], [0.018, 0.01, 0.006], [1, 0.5, 0.25 + p * 0.2], 0.3 + p * 0.25, 0.35 + p * 0.3, 2500);
    modal([170], [0.02], [1], 0.12 + p * 0.1, 0, 0, 0.3);
  },
  net() { noiseBurst(0.14, 0.12, 1800, 0.9); modal([900], [0.01], [1], 0.06, 0.1); },
  floor() { modal([950, 2000], [0.015, 0.01], [1, 0.4], 0.12, 0.2, 3000, 1.5); },
  toss() { noiseBurst(0.06, 0.03, 3000, 0.7); },
  // réactions du public (vrais enregistrements)
  crowd(level = 1) {
    if (level >= 3) { sample('ovation', 0.75, rnd(0.97, 1.03)); sample('cheer', 0.35, rnd(0.9, 0.95), 0.2); }
    else if (level === 2) { sample('cheer', 0.5, rnd(0.96, 1.04)); sample('applause', 0.35, rnd(0.97, 1.03), 0.4); }
    else sample('applause', 0.32, rnd(0.95, 1.05), rnd(0, 0.5));
  },
  applause(intensity = 1) { this.crowd(intensity >= 1.4 ? 3 : intensity >= 1 ? 2 : 1); },
  ooh() { /* supprimé */ },
  ui() { modal([1500], [0.008], [1], 0.06, 0.15, 6000, 0); },
  superArm() { noiseBurst(0.5, 0.12, 400, 1.2, 'bandpass', 3000); tone(220, 0.4, 0.05, 'triangle'); },
  superHit() { modal([180, 420], [0.06, 0.03], [1, 0.6], 0.35, 0.6, 1500); noiseBurst(0.35, 0.15, 3000, 0.6, 'bandpass', 300); },
  unlock() { [784, 988, 1175].forEach((f, i) => setTimeout(() => tone(f, 0.22, 0.05, 'triangle'), i * 80)); },
  whoosh() { noiseBurst(0.4, 0.05, 600, 0.8, 'bandpass', 2400); },
};
