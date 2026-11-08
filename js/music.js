// Musique synthwave générée en direct (menus et fin de match).
import { getCtx, getMusicBus } from './audio.js';

let BPM = 104, KEY = 0;
let STEP = 60 / BPM / 4;              // double-croche
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]; // Am F C G
const BASS = [45, 41, 36, 43];
const ARP = [0, 1, 2, 1, 2, 0, 2, 1];
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

let timer = null, step = 0, next = 0, out = null, playing = false, intensity = 1;

function env(g, t, a, d, peak) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}
function kick(ctx, t) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  env(g, t, 0.002, 0.28, 0.9); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.32);
}
let noiseBuf = null;
function noise(ctx, t, dur, freq, peak, type = 'highpass') {
  if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
  const g = ctx.createGain(); env(g, t, 0.002, dur, peak);
  s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}
function synth(ctx, t, midi, dur, peak, type, cutoff, detune = 0) {
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = 4;
  const g = ctx.createGain(); env(g, t, 0.01, dur, peak);
  for (const d of detune ? [-detune, detune] : [0]) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = mtof(midi); o.detune.value = d;
    o.connect(f); o.start(t); o.stop(t + dur + 0.05);
  }
  f.connect(g); g.connect(out);
}

function schedule() {
  const ctx = getCtx();
  if (!ctx) return;
  while (next < ctx.currentTime + 0.15) {
    const bar = Math.floor(step / 16) % 4, s16 = step % 16, t = next;
    const ch = CHORDS[bar].map(n => n + KEY);
    if (s16 % 4 === 0) kick(ctx, t);
    if (s16 === 4 || s16 === 12) noise(ctx, t, 0.18, 1800, 0.35, 'bandpass');
    if (s16 % 2 === 1) noise(ctx, t, 0.04, 7000, 0.12 * intensity);
    if (s16 % 2 === 0) synth(ctx, t, BASS[bar] + KEY + (s16 % 8 === 6 ? 12 : 0), STEP * 1.6, 0.32, 'sawtooth', 600);
    if (intensity > 0.5) synth(ctx, t, ch[ARP[s16 % 8] % 3] + 12, STEP * 0.9, 0.08, 'square', 2400);
    if (s16 === 0) for (const n of ch) synth(ctx, t, n, STEP * 15, 0.05, 'sawtooth', 1200, 9);
    step++; next += STEP;
  }
}

export const music = {
  start(level = 1) {
    const ctx = getCtx();
    intensity = level;
    if (!ctx || playing) return;
    out = ctx.createGain(); out.gain.value = 0.0001; out.connect(getMusicBus());
    out.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 1.5);
    playing = true; next = ctx.currentTime + 0.05; step = 0;
    timer = setInterval(schedule, 40);
  },
  stop() {
    const ctx = getCtx();
    if (!ctx || !playing) return;
    playing = false;
    const o = out;
    o.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4);
    clearInterval(timer);
    setTimeout(() => { try { o.disconnect(); } catch (e) {} }, 2000);
  },
  get playing() { return playing; },
  // ambiance selon le tournoi
  setStyle(name) {
    const S = { challenger: [96, -2], contender: [104, 0], star: [112, 2], finals: [116, 4], slam: [120, 3], worlds: [124, 5], olympics: [118, 7], team: [114, 1] }[name] || [104, 0];
    BPM = S[0]; KEY = S[1]; STEP = 60 / BPM / 4;
  },
  // fanfare de cérémonie (hymne)
  fanfare() {
    const ctx = getCtx(); if (!ctx) return;
    const o0 = out; out = ctx.createGain(); out.gain.value = 0.9; out.connect(getMusicBus());
    const t0 = ctx.currentTime + 0.05, q = 0.42;
    const mel = [[67, 1], [72, 1.5], [71, 0.5], [72, 1], [76, 1], [74, 1.5], [72, 0.5], [74, 1], [79, 2], [76, 1], [77, 1], [79, 3]];
    let t = t0;
    for (const [n, d] of mel) {
      synth(ctx, t, n, q * d * 0.95, 0.12, 'sawtooth', 2200, 6);
      synth(ctx, t, n - 12, q * d * 0.95, 0.07, 'square', 900);
      t += q * d;
    }
    const chords = [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67, 72]];
    chords.forEach((c, i) => c.forEach(n => synth(ctx, t0 + i * q * 4, n - 12, q * 4, 0.05, 'sawtooth', 1400, 8)));
    for (let k = 0; k < 8; k++) noise(ctx, t0 + k * q * 2, 0.3, 300, 0.25, 'lowpass');
    const fin = out; out = o0;
    setTimeout(() => { try { fin.disconnect(); } catch (e) {} }, 9000);
  },
};
