// Connexion en ligne pair-à-pair (WebRTC via PeerJS). L'hôte crée un code, l'invité le saisit.
const PREFIX = 'aurapingpong-v1-';
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// ?peer=hote:port permet d'utiliser son propre serveur PeerJS (tests en local)
const custom = new URLSearchParams(location.search).get('peer');
const ICE = {
  ...(custom ? { host: custom.split(':')[0], port: +(custom.split(':')[1] || 9000), path: '/', secure: false } : {}),
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
    ],
  },
};

export class Net {
  constructor() {
    this.peer = null; this.conn = null;
    this.rtt = 60;
    this.onMessage = () => {};
    this.onClose = () => {};
    this.pingTimer = null;
  }

  static code() {
    let s = '';
    for (let i = 0; i < 5; i++) s += ALPHA[Math.floor(Math.random() * ALPHA.length)];
    return s;
  }

  host(onCode, onConnected, onError) {
    const code = Net.code();
    this.peer = new window.Peer(PREFIX + code, ICE);
    this.peer.on('open', () => onCode(code));
    this.peer.on('connection', conn => {
      if (this.conn) { conn.close(); return; }
      this.setup(conn, onConnected);
    });
    this.peer.on('error', err => {
      if (err.type === 'unavailable-id') { this.destroy(); this.host(onCode, onConnected, onError); return; }
      onError(this.describe(err));
    });
  }

  join(code, onConnected, onError) {
    code = code.trim().toUpperCase();
    this.peer = new window.Peer(undefined, ICE);
    this.peer.on('open', () => {
      const conn = this.peer.connect(PREFIX + code, { reliable: true, serialization: 'json' });
      this.setup(conn, onConnected);
      setTimeout(() => { if (!this.conn || !this.conn.open) onError('Connexion impossible : vérifie le code ou réessaie.'); }, 12000);
    });
    this.peer.on('error', err => onError(this.describe(err)));
  }

  describe(err) {
    if (err.type === 'peer-unavailable') return 'Aucune partie avec ce code.';
    if (err.type === 'network' || err.type === 'server-error') return 'Serveur de connexion injoignable. Vérifie ta connexion internet.';
    if (err.type === 'browser-incompatible') return 'Navigateur incompatible (essaie Chrome ou Firefox).';
    return 'Erreur réseau : ' + (err.type || err.message || err);
  }

  setup(conn, onConnected) {
    conn.on('open', () => {
      this.conn = conn;
      this.pingTimer = setInterval(() => this.send({ t: 'ping', ts: performance.now() }), 1000);
      onConnected();
    });
    conn.on('data', msg => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.t === 'ping') { this.send({ t: 'pong', ts: msg.ts }); return; }
      if (msg.t === 'pong') { const r = performance.now() - msg.ts; this.rtt = this.rtt * 0.7 + r * 0.3; return; }
      this.onMessage(msg);
    });
    conn.on('close', () => { this.onClose(); this.cleanup(); });
    conn.on('error', () => {});
  }

  send(msg) {
    if (this.conn && this.conn.open) {
      try { this.conn.send(msg); } catch (e) { /* ignore */ }
    }
  }

  cleanup() {
    clearInterval(this.pingTimer);
    this.conn = null;
  }

  destroy() {
    clearInterval(this.pingTimer);
    try { this.conn && this.conn.close(); } catch (e) {}
    try { this.peer && this.peer.destroy(); } catch (e) {}
    this.conn = null; this.peer = null;
  }
}
