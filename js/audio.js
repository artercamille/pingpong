// Sons synthétisés (aucun fichier audio nécessaire)
let ctx = null, master = null, noiseBuf = null;

export function initAudio() {
  if (ctx) { ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { ctx = null; }
}

function tone(freq, dur, vol, type = 'sine', drop = 0.5) {
  if (!ctx) return;
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
  if (!ctx) return;
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
    if (!ctx) return;
    for (let i = 0; i < 26 * intensity; i++) {
      setTimeout(() => noise(0.05 + Math.random() * 0.05, 0.05 + Math.random() * 0.06, 1500 + Math.random() * 2500, 1.2), Math.random() * 1600 * intensity);
    }
    noise(1.6 * intensity, 0.06, 900, 0.4, 0.15);
  },
  ui() { tone(660, 0.07, 0.15, 'sine', 1.2); },
};
