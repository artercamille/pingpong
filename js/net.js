// Connexion en ligne pair-à-pair (WebRTC via PeerJS).
// Simple : 2 joueurs. Double : l'hôte accepte jusqu'à 3 invités et relaie les messages (topologie en étoile).
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
    this.peer = null;
    this.conns = [];          // hôte : tous les invités ; invité : [hôte]
    this.isHost = false;
    this.maxGuests = 1;
    this.rtt = 60;
    this.onMessage = () => {};
    this.onClose = () => {};
    this.onGuest = () => {};
    this.pingTimer = null;
  }

  get conn() { return this.conns[0] || null; }

  static code() {
    let s = '';
    for (let i = 0; i < 5; i++) s += ALPHA[Math.floor(Math.random() * ALPHA.length)];
    return s;
  }

  host(onCode, onConnected, onError) {
    this.isHost = true;
    const code = Net.code();
    this.peer = new window.Peer(PREFIX + code, ICE);
    this.peer.on('open', () => onCode(code));
    this.peer.on('connection', conn => {
      if (this.conns.length >= this.maxGuests || this.locked) { conn.on('open', () => { conn.send({ t: 'full' }); setTimeout(() => conn.close(), 300); }); return; }
      this.setup(conn, () => onConnected(conn));
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
      this.conns.push(conn);
      conn.rtt = 60;
      if (!this.pingTimer) this.pingTimer = setInterval(() => this.send({ t: 'ping', ts: performance.now() }), 1000);
      onConnected();
    });
    conn.on('data', msg => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.t === 'ping') { try { conn.send({ t: 'pong', ts: msg.ts }); } catch (e) {} return; }
      if (msg.t === 'pong') {
        conn.rtt = conn.rtt * 0.7 + (performance.now() - msg.ts) * 0.3;
        this.rtt = this.conns.reduce((a, c) => a + (c.rtt || 60), 0) / this.conns.length;
        return;
      }
      // l'hôte relaie les messages de jeu aux autres invités
      if (this.isHost && !msg.lobby) for (const c of this.conns) if (c !== conn && c.open) { try { c.send(msg); } catch (e) {} }
      this.onMessage(msg, conn);
    });
    conn.on('close', () => {
      this.conns = this.conns.filter(c => c !== conn);
      this.onClose(conn);
      if (!this.conns.length) clearInterval(this.pingTimer), (this.pingTimer = null);
    });
    conn.on('error', () => {});
  }

  send(msg) {
    for (const c of this.conns) if (c.open) { try { c.send(msg); } catch (e) { /* ignore */ } }
  }
  sendTo(conn, msg) { if (conn && conn.open) { try { conn.send(msg); } catch (e) {} } }

  destroy() {
    clearInterval(this.pingTimer); this.pingTimer = null;
    for (const c of this.conns) { try { c.close(); } catch (e) {} }
    try { this.peer && this.peer.destroy(); } catch (e) {}
    this.conns = []; this.peer = null;
  }
}
