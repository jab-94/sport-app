# Sport — contexte du projet pour Claude Code

App PWA (Progressive Web App) mono-fichier de suivi de musculation à deux, pour **Am**
et **Jab**. Auto-hébergée sur GitHub Pages : `https://jab-94.github.io/sport-app/`
(repo `jab-94/sport-app`). Design sombre uniquement, style "Liquid Glass" iOS.

Pas de framework, pas de build : tout vit dans `index.html` (HTML + CSS + JS vanilla
dans un seul fichier), plus `service-worker.js` pour le mode hors-ligne/PWA.

## Fichiers du repo

- `index.html` — toute l'app (markup, styles, logique). Les données utilisateur
  (séances, historique, réglages) vivent dans `localStorage`, pas de backend.
- `service-worker.js` — cache-first avec refresh en fond pour les assets, network-first
  pour `index.html`. **`CACHE_VERSION`** doit être bumpé à chaque déploiement de fichiers,
  sinon les téléphones gardent une version périmée en cache.
- `manifest.json`, icônes (`icon-192.png`, `icon-512.png`, `apple-touch-icon.png`,
  `maskable-icon-512.png`)
- `videos/` — clips d'exécution d'exercices (mp4, ~480px large, réencodés légers),
  affichés via le bouton (i) sur certains exercices.

## Convention de versioning (IMPORTANT)

Deux compteurs à incrémenter **ensemble** à chaque changement livré :
- `BUILD_VERSION` (variable JS dans `index.html`, ex. `"b29"`) — affiché dans un badge
  à côté du titre "Sport", tapable pour ouvrir un panneau de debug (mesures d'écran,
  safe-area, etc.). Sert à vérifier depuis le téléphone qu'on a bien la dernière version.
- `CACHE_VERSION` (dans `service-worker.js`, ex. `"sport-v29"`) — force le service worker
  à jeter l'ancien cache et retélécharger les fichiers.

Il existe aussi `CONTENT_VERSION` (dans `index.html`) : à bumper spécifiquement quand on
change les exercices par défaut (`defaultState()`), pour que `migrateContent()` fusionne
les nouveautés dans les données déjà sauvegardées sur le téléphone d'un utilisateur
existant, sans écraser ses séries/historique.

**Sans utilisateurs qui uploadent manuellement les fichiers** (ce que Claude Code peut
maintenant faire directement via git push), le workflow devient : éditer → bumper les
3 versions concernées → commit → push → GitHub Pages redéploie tout seul en ~1 min.

## Design "Liquid Glass"

Tokens CSS centralisés dans `:root` (`--glass-bg`, `--glass-border`, `--glass-hi`,
`--glass-blur`, etc.) réutilisés sur la plupart des panneaux. La nav bar du bas
(`nav#tabs`) utilise un jeu de tokens séparé (`--ios27-tab-*`) calé sur les vraies
valeurs mesurées du kit Figma officiel iOS 27 d'Apple (repo de référence :
`github.com/seunghan91/ios27-design-system`) — beaucoup plus transparent/léger que
le reste de l'UI. Un "tab-highlight" (pastille de verre neutre, `#999` à 17% d'opacité,
PAS teintée avec la couleur d'accent — testé et rejeté comme "trop fake") glisse en
douceur sous l'onglet actif via `moveTabHighlight()`.

## Bugs iOS résolus (ne pas régresser)

1. **Bande noire en bas d'écran en mode standalone (PWA installée)** : bug de mesure
   WebKit — `window.innerHeight`/`visualViewport.height` sous-estiment la vraie hauteur
   d'écran d'exactement la valeur du safe-area-inset-top. Fix : utiliser
   `window.screen.height` quand `navigator.standalone` est true et que c'est plus grand
   que la valeur mesurée (voir le script inline en tête de `<head>`).
2. **Scroll bloqué après verrouillage/déverrouillage du téléphone en pleine séance** :
   WKWebView "gèle" son moteur de scroll à vélocité sur le conteneur actif au retour
   de background. Fix : `kickScroll()` force un reflow (`webkitOverflowScrolling`
   auto → touch) déclenché sur `visibilitychange`/`pageshow`/`focus`.
3. **Même bug de scroll bloqué après avoir regardé une vidéo d'exercice (i) puis fermé
   la modale** : fermer une modale en page ne déclenche PAS les événements ci-dessus
   (la page n'a jamais été mise en arrière-plan). Fix : `closeOverlay()` centralise
   toutes les fermetures de modale et relance le même kick via
   `window.__kickScrollAfterOverlay`.

Avant toute modif touchant au scroll/à la hauteur d'écran, lire le script inline en
tête de `<head>` — il est abondamment commenté sur le pourquoi de chaque bout.

## Fonctionnalités principales déjà en place

- 4 onglets : Séances (accueil), Historique, Progrès, Réglages.
- Séance à deux : chaque exercice a un bloc par personne (poids/reps), avec stepper
  "+"/"-" animé (glyphe "+" seul coloré + pulse, pas tout le bouton).
- **Skip d'exercice par personne** : appui long (500ms) sur le nom ("Am"/"Jab", pas
  tout le bloc) bascule `entry.skipped`, exclut cette entrée des stats/historique.
  Geste choisi après itération avec l'utilisateur (swipe/bouton visible rejetés).
- **Ajout d'exercice à la volée** pendant une séance (`openAddExerciseModal` /
  `addAdhocExercise`) — exercice "adhoc" propre à cette séance, pas ajouté au template
  permanent des séances.
- **Sauvegarde/export** : `exportData()` essaie `navigator.share` (partage réel vers
  iCloud/Mail/etc.) avant de retomber sur un téléchargement simple. Bannière de rappel
  si pas de sauvegarde depuis 14 jours.
- **Vidéos d'exécution** sur certains exercices (bouton (i)), extraites de vidéos
  Instagram/TikTok fournies par l'utilisateur, recadrées et compressées.
- **Objectifs nutrition** (onglet Progrès) : calcul BMR (Mifflin-St Jeor) × facteur
  d'activité = TDEE, ajusté selon l'objectif (perte/maintien/prise) pour les calories
  cibles, + protéines cibles (g/kg selon objectif). Basé sur un profil par personne
  (taille, âge, sexe, activité, objectif) rempli dans Réglages → "Vous deux".
- Couleur "Am" = rouge rosé discret (`--p1: #e2677c`), "Jab" = bleu (`--p2`).

## Connecteurs claude.ai en cours d'exploration (pas encore fonctionnels)

- **Carrefour** (recherche produits + ajout panier, PAS d'historique d'achats
  disponible dans ses outils) : connecté côté claude.ai mais l'auth OAuth échouait
  côté Carrefour au moment de la rédaction ("Impossible de s'inscrire auprès du
  service de connexion de Carrefour", ref `ofid_0beb143b76da9f65`). À retester.
- Idée en cours : proposer des menus à Am/Jab visant leurs objectifs kcal/protéines,
  puis chercher/ajouter les produits correspondants au panier Carrefour une fois
  l'auth réglée.

## Historique de versions notable

- b17 → dernière version stable "classique" (avant l'expérimentation Liquid Glass
  poussée à fond, que l'utilisateur a ensuite préféré annuler).
- b18-b19 → tentative de Liquid Glass généralisé (transparence/flou/sheen partout),
  **rejetée par l'utilisateur** ("je crois que je préfère l'ancienne version") →
  revert au style b17, juste avec le badge remonté pour forcer le cache.
- b20 → retrait des liserés colorés en haut des blocs de séance (jugés "trop IA").
- b21 → couleur "Am" en rouge rosé.
- b22-b24 → nav bar refaite avec les vraies valeurs mesurées iOS 27 (voir section
  Liquid Glass ci-dessus), pastille glissante animée, puis dé-teintée (accent →
  neutre) après retour utilisateur ("ça fait trop fake").
- b25 → objectifs nutrition (calories/protéines).
- b26-b28 → vidéos d'exécution reliées à 4 exercices (triceps poulie, leg curl,
  abduction, presse à cuisses), extraites de 3 vidéos Instagram fournies par
  l'utilisateur.
- b29 → fix scroll bloqué après fermeture de la modale vidéo (voir bugs iOS ci-dessus).

## Style de travail avec cet utilisateur

- Toujours vérifier visuellement les changements (avant de considérer fini) plutôt
  que de livrer à l'aveugle — l'utilisateur a été échaudé par plusieurs tentatives
  ratées au début du projet, corrigées seulement une fois un vrai outil de debug
  ajouté dans l'app (panneau tap-to-reveal sur le badge de version).
- L'utilisateur donne des retours visuels très précis (captures d'écran) et un avis
  esthétique tranché ("ça fait trop IA", "trop fake") — itérer vite sur ses retours
  plutôt que d'argumenter la version précédente.
- Toujours bumper `BUILD_VERSION` + `CACHE_VERSION` (+ `CONTENT_VERSION` si les
  exercices par défaut changent) à chaque livraison, jamais oublier.
