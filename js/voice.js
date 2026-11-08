// Voix de l'arbitre / commentateur (synthèse vocale du navigateur, en français).
let enabled = true, voice = null;
function pick() {
  if (!('speechSynthesis' in window)) return null;
  const vs = speechSynthesis.getVoices().filter(v => v.lang && v.lang.toLowerCase().startsWith('fr'));
  return vs.find(v => /google|premium|enhanced|natural/i.test(v.name)) || vs[0] || null;
}
if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => { voice = pick(); };
export const announcer = {
  set enabled(v) { enabled = v; if (!v && 'speechSynthesis' in window) speechSynthesis.cancel(); },
  get enabled() { return enabled; },
  say(text, urgent = false) {
    if (!enabled || !('speechSynthesis' in window)) return;
    if (!voice) voice = pick();
    if (urgent) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR'; if (voice) u.voice = voice;
    u.rate = 1.05; u.pitch = 0.95; u.volume = 0.9;
    speechSynthesis.speak(u);
  },
};
