# PingPong

Ping-pong 3D dans le navigateur, vue raquette, dans une arène de championnats du monde. Contre l IA, en ligne entre potes, avec tutoriel. On y joue en ligne à deux, chacun sur son PC, à la manette.

## Jouer

- **Contre l'IA** : trois niveaux, matchs en 1, 3 ou 5 sets.
- **En ligne** : un joueur crée la partie et envoie le code de 5 lettres, l'autre le saisit. La connexion se fait directement entre les PC (WebRTC via PeerJS), sans serveur à héberger.
- **Double (2 contre 2)** : contre l'IA (avec un partenaire IA) ou en ligne jusqu'à 4 joueurs, les places vides sont prises par l'IA. Service en diagonale et frappes à tour de rôle, comme en vrai.
- **Entraînement** : robot lanceur de balles réglable.

## Progression

- **Classé en ligne** : rangs Fer → Bronze → Argent → Or → Platine → Émeraude → Diamant (divisions IV à I), puis Maître, Grand Maître et Challenger. Chaque match en ligne fait gagner ou perdre des LP selon le niveau de l'adversaire.
- **Face-à-face** : bilan et série en cours contre chaque adversaire.
- **Niveaux et XP** : chaque match rapporte de l'XP, les niveaux débloquent raquettes, traînées et salles (Vestiaire).
- **Succès** : 17 défis (ace, smash gagnant, échange de 20 coups, set parfait, remontada, balle de match sauvée…).
- **Super coup** : la jauge SUPER se remplit avec les bons coups ; pleine, RT (ou L) arme un coup surpuissant.
- **Ralentis** sur les gros points, statistiques de fin de match et vidéo du meilleur point à télécharger.
- **Défis du jour** : 3 nouveaux défis chaque jour, avec XP bonus.
- **Présentation VS** avant chaque match, séries de points, confettis à la victoire.

Le profil est sauvegardé dans le navigateur.

## Commandes

| Action | Manette | Clavier |
|---|---|---|
| Se déplacer / viser | Stick gauche | ZQSD ou flèches |
| Lift (top spin) | A / Croix | J ou Espace |
| Frappe à plat / smash | B / Rond | K |
| Coupé | X / Carré | U |
| Lob | Y / Triangle | I |
| Effet latéral | LB / RB | A / E |
| Super coup (jauge pleine) | RT | L |
| Caméra (raquette / TV / haute) | Select | C |
| Pause / temps mort en ligne | Start | Échap |

Quand la balle arrive, un cercle se referme sur elle : appuie sur un coup pile quand il touche le cercle blanc. A sur balle courte = flip, B sur gros lift = contre, X sur gros lift = bloc. L'anneau sur la balle montre l'effet (rouge = lift, bleu = coupé, vert = latéral).

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

## Crédits

- Sons de public : enregistrements CC0 de freesound.org (« Large crowd applause » par Bansemer, « Crowd Cheering » par SoundsExciting), recoupés et normalisés.

- Moteur 3D : [Three.js](https://threejs.org) (MIT)
- Connexion en ligne : [PeerJS](https://peerjs.com) (MIT)
