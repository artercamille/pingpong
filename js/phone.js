// Page téléphone : lit les capteurs de mouvement, reconnaît les gestes de raquette
// et les envoie au jeu sur le PC (connexion pair-à-pair via PeerJS).
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const qs = new URLSearchParams(location.search);
  const PREFIX = 'aurapingpong-v1-';
  const custom = qs.get('peer');
  const ICE = {
    ...(custom ? { host: custom.split(':')[0], port: +(custom.split(':')[1] || 9000), path: '/', secure: false } : {}),
    config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }] },
  };
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  let devId = store.get('pp-tel-id');
  if (!devId) { devId = Math.random().toString(36).slice(2, 12); store.set('pp-tel-id', devId); }

  // ------------------------------------------------------------------ écrans
  const show = id => document.querySelectorAll('.scr').forEach(s => s.classList.toggle('on', s.id === id));
  let code = (qs.get('c') || store.get('pp-tel-code') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
  if (!qs.get('c')) { $('#code-box').style.display = ''; $('#code').value = code; }
  const err = t => { $('#err').textContent = t || ''; };

  // ------------------------------------------------------------------ son et vibration
  let ac = null;
  function beep(f = 880, d = 0.05, v = 0.15) {
    if (!ac) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = f; o.type = 'triangle';
    g.gain.setValueAtTime(v, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + d);
    o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + d + 0.02);
  }
  // iPhone : pas d'API de vibration dans Safari, mais un interrupteur natif déclenche un retour haptique (iOS 18+)
  const hl = document.createElement('label'), hi = document.createElement('input');
  hi.type = 'checkbox'; hi.setAttribute('switch', ''); hl.appendChild(hi); hl.style.cssText = 'position:fixed;left:-99px;opacity:0;pointer-events:none';
  document.body.appendChild(hl);
  function haptic(ms = 25) { if (navigator.vibrate) navigator.vibrate(ms); else { try { hl.click(); } catch (e) {} } }

  // garder l'écran allumé
  let wake = null;
  async function keepAwake() { try { if ('wakeLock' in navigator && document.visibilityState === 'visible') wake = await navigator.wakeLock.request('screen'); } catch (e) {} }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { keepAwake(); if (started && (!conn || !conn.open)) reconnect(); } });

  // ------------------------------------------------------------------ connexion
  let peer = null, conn = null, started = false, slot = -1, retry = null, state = { mode: 'menu' };
  function net(txt, cls) { for (const el of [$('#net1'), $('#net2')]) { el.className = 'net ' + (cls || ''); el.querySelector('span').textContent = txt; } }
  function connect() {
    clearTimeout(retry);
    net('Connexion…');
    try { if (peer) peer.destroy(); } catch (e) {}
    peer = new window.Peer(undefined, ICE);
    peer.on('open', () => {
      conn = peer.connect(PREFIX + 'tel-' + code, { reliable: true, serialization: 'json' });
      conn.on('open', () => { net('Connecté', 'ok'); conn.send({ t: 'hello', id: devId, name: store.get('pp-tel-name') || '' }); });
      conn.on('data', onMsg);
      conn.on('close', () => { net('Déconnecté, nouvelle tentative…', 'bad'); reconnect(); });
      conn.on('error', () => {});
    });
    peer.on('error', e => {
      if (e.type === 'peer-unavailable') net('Jeu introuvable : vérifie le code', 'bad');
      else net('Connexion impossible, nouvelle tentative…', 'bad');
      reconnect();
    });
  }
  function reconnect() { clearTimeout(retry); retry = setTimeout(connect, 2500); }
  function send(m) { if (conn && conn.open) { try { conn.send(m); } catch (e) {} } }

  function onMsg(m) {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'ping') { send({ t: 'pong', ts: m.ts }); return; }
    if (m.t === 'welcome') {
      slot = m.slot;
      document.documentElement.style.setProperty('--pc', m.color || '#ff3d6e');
      document.querySelectorAll('.pname').forEach(e => { e.textContent = `Joueur ${slot + 1}`; });
      haptic(40); beep(660, 0.08); setTimeout(() => beep(990, 0.1), 90);
      return;
    }
    if (m.t === 'full') { net('Déjà deux téléphones connectés', 'bad'); clearTimeout(retry); return; }
    if (m.t === 'st') { state = m; renderState(); return; }
    if (m.t === 'fb') {
      const g = m.q >= 0.95 ? 3 : m.q >= 0.75 ? 2 : m.q >= 0.5 ? 1 : 0;
      setShot(m.shot ? m.shot.charAt(0) + m.shot.slice(1).toLowerCase() : '', cap(m.label), g);
      haptic(g === 3 ? 45 : 20);
      if (g === 3) beep(1320, 0.09, 0.18);
    }
  }
  const cap = s => s ? s.charAt(0) + s.slice(1).toLowerCase() : '';

  function renderState() {
    const st = state, game = st.mode === 'game';
    $('#pad').classList.toggle('on', st.mode === 'menu');
    $('#pause').style.display = game ? '' : 'none';
    $('#serve').classList.toggle('on', game && !!st.serve);
    $('#score').innerHTML = game && st.score ? `${st.score[0]} – ${st.score[1]}<small>Manches ${st.sets[0]} – ${st.sets[1]}${st.opp ? ' · contre ' + esc(st.opp) : ''}</small>` : '';
    let h;
    if (st.mode === 'menu') h = 'Utilise les flèches pour naviguer dans les menus du jeu.';
    else if (st.mode === 'wait') h = 'Tu es prêt. Le match à deux se lance depuis l\'écran Téléphone du PC.';
    else if (st.toss) h = 'Frappe !';
    else if (st.serve) h = 'À toi de servir.';
    else h = 'Frappe quand la balle arrive sur toi.';
    $('#hint').textContent = h;
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function setShot(name, grade, g) {
    const s = $('#shot'); s.textContent = name; s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop');
    const gr = $('#grade'); gr.textContent = grade || ''; gr.className = g != null ? 'g' + g : '';
  }

  // ------------------------------------------------------------------ capteurs
  const D2R = Math.PI / 180;
  let q = [1, 0, 0, 0], q0 = null, haveOri = false, gsign = 1;
  // quaternion de l'orientation (convention W3C, angles Z-X'-Y'')
  function eulerQuat(a, b, g) {
    const x = b * D2R / 2, y = g * D2R / 2, z = a * D2R / 2;
    const cX = Math.cos(x), cY = Math.cos(y), cZ = Math.cos(z), sX = Math.sin(x), sY = Math.sin(y), sZ = Math.sin(z);
    return [cX * cY * cZ - sX * sY * sZ, sX * cY * cZ - cX * sY * sZ, cX * sY * cZ + sX * cY * sZ, cX * cY * sZ + sX * sY * cZ];
  }
  const qmul = (a, b) => [a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3], a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2], a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1], a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
  const qconj = a => [a[0], -a[1], -a[2], -a[3]];
  const rot = (a, v) => { const r = qmul(qmul(a, [0, v[0], v[1], v[2]]), qconj(a)); return [r[1], r[2], r[3]]; };
  // rotation autour de la verticale depuis le calibrage, ramenée entre -90° et +90° (le revers retourne la raquette)
  function yaw() {
    if (!q0) return 0;
    const r = qmul(q, qconj(q0));
    let a = 2 * Math.atan2(r[3], r[0]);
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    if (a > Math.PI / 2) a -= Math.PI; else if (a < -Math.PI / 2) a += Math.PI;
    return a;
  }

  // sensibilité : seuil de déclenchement et vitesse « à fond » (°/s)
  const SENS = [{ n: 'légers', on: 170, full: 700 }, { n: 'normaux', on: 240, full: 950 }, { n: 'amples', on: 320, full: 1250 }];
  let sens = +(store.get('pp-tel-sens') ?? 1);
  if (!SENS[sens]) sens = 1;
  const sensLabel = () => { $('#sens').textContent = 'Gestes : ' + SENS[sens].n; };
  sensLabel();

  const buf = [];            // derniers échantillons (temps, accélération verticale, vitesse de rotation)
  let sw = null, cool = 0, tossCool = 0, meterW = 0;
  function onMotion(e) {
    const now = performance.now();
    const rr = e.rotationRate || {};
    const w = Math.hypot(rr.alpha || 0, rr.beta || 0, rr.gamma || 0);
    const acc = e.acceleration, aig = e.accelerationIncludingGravity;
    // le signe de la gravité diffère selon les navigateurs : on le mesure quand le téléphone est immobile
    if (aig && aig.z != null && haveOri && w < 30) { const gw = rot(q, [aig.x, aig.y, aig.z]); gsign = gsign * 0.95 + Math.sign(gw[2]) * 0.05; }
    let az = 0, amag = 0;
    if (acc && acc.x != null) { const a = rot(q, [acc.x, acc.y, acc.z]); az = a[2] * (gsign >= 0 ? 1 : -1); amag = Math.hypot(a[0], a[1], a[2]); }
    buf.push({ t: now, az });
    while (buf.length && now - buf[0].t > 450) buf.shift();
    meterW = Math.max(meterW * 0.85, w);

    const S = SENS[sens];
    if (now < cool) return;
    if (!sw) {
      if (w > S.on) sw = { t0: now, peak: w, tp: now };
      else if (amag > 12 && w < 200 && now > tossCool && state.mode === 'game' && state.serve) {
        tossCool = now + 900; send({ t: 'toss' }); haptic(15); beep(520, 0.05);
      }
      return;
    }
    if (w > sw.peak) { sw.peak = w; sw.tp = now; return; }
    if (w < sw.peak * 0.75 || now - sw.t0 > 350) fire(now, S);
  }

  function fire(now, S) {
    const s = sw; sw = null; cool = now + 280;
    const speed = Math.max(0, Math.min(1, (s.peak - S.on) / (S.full - S.on)));
    // vitesse verticale de la raquette juste avant le pic : le geste monte, descend ou reste à plat
    let vz = 0;
    for (let k = 1; k < buf.length; k++) { const a = buf[k], b = buf[k - 1]; if (a.t > s.tp - 180 && a.t <= s.tp + 20) vz += a.az * Math.min(0.05, (a.t - b.t) / 1000); }
    let type;
    if (vz > 0.45) type = speed < 0.3 ? 'lob' : 'top';
    else if (vz < -0.45) type = speed > 0.5 ? 'plat' : 'coupe';
    else type = speed < 0.25 ? 'coupe' : speed > 0.8 ? 'plat' : 'top';
    const aim = Math.max(-1, Math.min(1, -yaw() / (40 * D2R)));
    send({ t: 'sw', type, speed: +speed.toFixed(3), aim: +aim.toFixed(3), ago: Math.round(now - s.tp), play: state.mode === 'game' });
    const NAMES = { top: 'Lift', plat: 'Frappe', coupe: 'Coupé', lob: 'Lob' };
    if (state.mode !== 'game') setShot(NAMES[type], `Puissance ${Math.round(speed * 100)} %`, null);
    beep(300 + speed * 600, 0.04, 0.12); haptic(12);
  }

  function onOri(e) {
    if (e.alpha == null) return;
    q = eulerQuat(e.alpha, e.beta || 0, e.gamma || 0); haveOri = true;
    if (!q0) q0 = q;
  }

  // jauge du geste
  (function meterLoop() { const S = SENS[sens]; $('#meter').style.width = Math.min(100, meterW / S.full * 100) + '%'; requestAnimationFrame(meterLoop); })();

  // ------------------------------------------------------------------ boutons
  $('#go').addEventListener('click', async () => {
    err('');
    if (!qs.get('c')) {
      code = $('#code').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (code.length !== 5) { err('Le code fait 5 caractères.'); return; }
    }
    if (!code) { err('Scanne le QR code affiché sur le PC.'); return; }
    store.set('pp-tel-code', code);
    if (!window.isSecureContext) { err('Les capteurs ne fonctionnent que sur une adresse sécurisée (https). Scanne le QR code du PC.'); return; }
    try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); ac.resume(); } catch (e) {}
    try {
      // iPhone : autorisation obligatoire, demandée directement dans le geste de l'utilisateur
      const asks = [];
      if (window.DeviceMotionEvent && DeviceMotionEvent.requestPermission) asks.push(DeviceMotionEvent.requestPermission());
      if (window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission) asks.push(DeviceOrientationEvent.requestPermission());
      const res = await Promise.all(asks);
      if (res.some(r => r !== 'granted')) throw new Error('refus');
    } catch (e) {
      err('Accès aux mouvements refusé. Sur iPhone : ferme l\'onglet, rouvre le lien et appuie sur « Autoriser ».');
      return;
    }
    if (!window.DeviceMotionEvent) { err('Ce téléphone ne donne pas accès à ses capteurs de mouvement.'); return; }
    addEventListener('devicemotion', onMotion);
    addEventListener('deviceorientation', onOri);
    started = true;
    keepAwake();
    connect();
    show('s-cal');
    setTimeout(() => { if (!buf.length) $('#err2').textContent = 'Aucun mouvement détecté : vérifie que l\'accès aux mouvements est autorisé.'; }, 1500);
  });
  $('#cal').addEventListener('click', () => { q0 = q; haptic(30); beep(880, 0.06); show('s-play'); renderState(); });
  $('#recal').addEventListener('click', () => { q0 = q; haptic(30); beep(880, 0.06); setShot('Calibré', 'Pointe toujours vers l\'écran', null); });
  $('#sens').addEventListener('click', () => { sens = (sens + 1) % SENS.length; store.set('pp-tel-sens', sens); sensLabel(); });
  $('#pause').addEventListener('click', () => { send({ t: 'btn', b: 'start' }); haptic(15); });
  $('#serve').addEventListener('click', () => { if (state.serve) { send({ t: 'toss' }); haptic(15); beep(520, 0.05); } });
  document.querySelectorAll('#pad button').forEach(b => b.addEventListener('click', () => { send({ t: 'btn', b: b.dataset.b }); haptic(10); beep(700, 0.03, 0.08); }));
  $('#code').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5); });
})();
