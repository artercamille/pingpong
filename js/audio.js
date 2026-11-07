// Sons synthétisés (aucun fichier audio nécessaire)
let ctx = null, master = null, noiseBuf = null, muted = false, muffle = null, crowd = null, crowdGain = null;
export function setMuted(v) {
  muted = v;
  if (crowdGain && ctx) crowdGain.gain.setTargetAtTime(v ? 0 : crowdLevel, ctx.currentTime, 0.2);
}
let crowdLevel = 0.035;
// ambiance continue du public (le volume monte pendant les longs échanges)
export function setCrowd(level) {
  if (!ctx) return;
  crowdLevel = level;
  if (!crowd) {
    crowd = ctx.createBufferSource(); crowd.buffer = noiseBuf; crowd.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 0.5;
    crowdGain = ctx.createGain(); crowdGain.gain.value = 0;
    crowd.connect(f); f.connect(crowdGain); crowdGain.connect(master); crowd.start();
  }
  crowdGain.gain.setTargetAtTime(muted ? 0 : level, ctx.currentTime, 0.4);
}
// son étouffé pendant les moments de pression
export function setMuffle(on) {
  if (!muffle) return;
  muffle.frequency.setTargetAtTime(on ? 1100 : 20000, ctx.currentTime, 0.25);
}

export function initAudio() {
  if (ctx) { ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.7;
    muffle = ctx.createBiquadFilter();
    muffle.type = 'lowpass'; muffle.frequency.value = 20000;
    master.connect(muffle); muffle.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { ctx = null; }
}

function tone(freq, dur, vol, type = 'sine', drop = 0.5) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * drop, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur, vol, freq, q = 1, attack = 0.002) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(master);
  s.start(t, Math.random()); s.stop(t + dur + 0.05);
}

export const sfx = {
  table(speed = 5) { const v = Math.min(1, 0.25 + speed / 18); tone(2300, 0.05, 0.35 * v, 'triangle', 0.6); noise(0.03, 0.25 * v, 3500, 2); },
  paddle(power = 0.5) { tone(900 + power * 500, 0.06, 0.4, 'triangle', 0.5); noise(0.05, 0.35 + power * 0.3, 1800, 1.5); },
  net() { noise(0.12, 0.25, 600, 0.8); },
  floor() { tone(1500, 0.06, 0.15, 'triangle', 0.7); },
  toss() { noise(0.05, 0.08, 4000, 1); },
  applause(intensity = 1) {
    if (!ctx || muted) return;
    for (let i = 0; i < 26 * intensity; i++) {
      setTimeout(() => noise(0.05 + Math.random() * 0.05, 0.05 + Math.random() * 0.06, 1500 + Math.random() * 2500, 1.2), Math.random() * 1600 * intensity);
    }
    noise(1.6 * intensity, 0.06, 900, 0.4, 0.15);
  },
  ui() { tone(660, 0.07, 0.15, 'sine', 1.2); },
  superArm() { tone(300, 0.5, 0.25, 'sawtooth', 3); noise(0.4, 0.12, 2500, 0.7, 0.05); },
  superHit() { tone(140, 0.35, 0.5, 'sine', 0.4); noise(0.3, 0.4, 900, 0.6); },
  ooh() { if (!ctx || muted) return; noise(1.0, 0.09, 450, 1.5, 0.15); tone(220, 0.9, 0.05, 'sine', 0.85); },
  unlock() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.18, 0.18, 'triangle', 1), i * 90)); },
};
