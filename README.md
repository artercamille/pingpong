# Aura Pong

Ping-pong 3D dans le navigateur, façon TopSpin : timing, effets et placement. On y joue en ligne à deux, chacun sur son PC, à la manette.

## Jouer

- **Contre l'IA** : trois niveaux, matchs en 1, 3 ou 5 sets.
- **En ligne** : un joueur crée la partie et envoie le code de 5 lettres, l'autre le saisit. La connexion se fait directement entre les deux PC (WebRTC via PeerJS), sans serveur à héberger.

## Commandes

| Action | Manette | Clavier |
|---|---|---|
| Se déplacer / viser | Stick gauche | ZQSD ou flèches |
| Lift (top spin) | A / Croix | J ou Espace |
| Frappe à plat / smash | B / Rond | K |
| Coupé | X / Carré | U |
| Lob | Y / Triangle | I |
| Effet latéral | LB / RB | A / E |
| Pause (contre l'IA) | Start | Échap |

Maintiens le bouton pour charger, puis relâche juste avant l'arrivée de la balle. Le timing et le placement décident de la qualité du coup.

## Mettre en ligne (GitHub Pages)

Settings → Pages → Source : *Deploy from a branch* → `main` / `/ (root)` → Save.
Le jeu est ensuite disponible sur `https://artercamille.github.io/pingpong/`.

## Structure

- `js/physics.js` : balle (gravité, frottement de l'air, effet Magnus, rebonds avec effet) et solveur de trajectoire
- `js/game.js` : règles, service, score, frappe, synchronisation réseau
- `js/ai.js` : adversaire IA
- `js/render.js` : scène 3D (Three.js)
- `js/net.js` : connexion en ligne (PeerJS)
- `js/input.js` : manette + clavier
- `js/audio.js` : sons synthétisés
- `lib/` : Three.js et PeerJS embarqués (aucun CDN nécessaire)
