// Enregistrement des dernières secondes de jeu et relecture au ralenti.

const KEYS = ['i', 'side', 'x', 'z', 'swingT', 'swingFore', 'swingType', 'charging', 'chargeT', 'chargeType', 'aimX', 'aimY', 'superArmed'];

export class Recorder {
  constructor(maxSec = 6) { this.frames = []; this.max = maxSec; this.time = 0; }
  reset() { this.frames = []; this.time = 0; }

  record(game, dt) {
    this.time += dt;
    const players = game.players.map(pl => { const o = {}; for (const k of KEYS) o[k] = pl[k]; return o; });
    this.frames.push({
      t: this.time, ball: { ...game.ball.p }, players, state: game.state,
      superBall: !!game.superBall, lastHit: game.lastHit ? game.lastHit.p : 0,
    });
    while (this.frames.length && this.time - this.frames[0].t > this.max) this.frames.shift();
  }

  // les `sec` dernières secondes, en ignorant ce qui précède la frappe du service
  clip(sec) {
    const end = this.time;
    let fr = this.frames.filter(f => end - f.t <= sec);
    const firstRally = fr.findIndex(f => f.state === 'rally');
    if (firstRally > 4) fr = fr.slice(firstRally - 4);
    return fr.map(f => ({ ...f, players: f.players.map(p => ({ ...p })) }));
  }
}

// Lecteur : rejoue un clip dans un faux « game » que le rendu sait afficher
export class Player {
  constructor(clip, base, speed = 0.35) {
    this.clip = clip; this.speed = speed; this.t = clip.length ? clip[0].t : 0; this.done = !clip.length;
    this.end = clip.length ? clip[clip.length - 1].t + 0.5 : 0;
    this.fake = {
      ball: { p: { x: 0, y: 1, z: 0 } }, players: base.players.map(p => ({ ...p })), pred: [null, null], state: 'rally',
      match: base.match, names: base.names, me: base.me, fx: [], superBall: false, lastHit: { p: 0 }, server: () => -1,
    };
  }

  step(dt) {
    if (this.done) return this.fake;
    this.t += dt * this.speed;
    if (this.t >= this.end) { this.done = true; return this.fake; }
    const c = this.clip;
    let i = c.findIndex(f => f.t >= this.t);
    if (i < 0) i = c.length - 1;
    const f = c[i];
    Object.assign(this.fake.ball.p, f.ball);
    f.players.forEach((p, k) => Object.assign(this.fake.players[k], p));
    this.fake.state = f.state === 'pointEnd' ? 'rally' : f.state;
    this.fake.superBall = f.superBall;
    this.fake.lastHit.p = f.lastHit;
    return this.fake;
  }
}

// Enregistre le canvas en vidéo pendant la relecture
export function recordCanvas(canvas) {
  if (!canvas.captureStream || !window.MediaRecorder) return null;
  const stream = canvas.captureStream(30);
  const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t)) || '';
  const rec = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 6e6 } : undefined);
  const chunks = [];
  rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  rec.start();
  return {
    stop: () => new Promise(res => {
      rec.onstop = () => res(new Blob(chunks, { type: 'video/webm' }));
      rec.stop();
    }),
  };
}
