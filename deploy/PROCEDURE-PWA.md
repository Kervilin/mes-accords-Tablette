# Procédure détaillée — PWA « Mes accords »

> Version courte, pas à pas : **`deploy/MODE-EMPLOI.md`**.
> L'appli sait maintenant fabriquer elle-même son paquet ZIP (bouton « Télécharger mes-accords-pwa.zip »).

Ce guide va du build à l'icône sur l'écran d'accueil. La PWA a besoin d'être servie en **HTTPS** (ou sur `localhost`) : c'est la seule contrainte technique.

---

## 0. Ce que produit le build

```bash
npm install
npm run build
```

Le dossier `dist/` contient tout le site, prêt à héberger :

```
dist/
├── index.html            ← l'application entière (JS + CSS inlinés)
├── manifest.webmanifest  ← nom, icônes, mode plein écran
├── sw.js                 ← service worker (hors-ligne)
└── icons/
    ├── icon-192.png
    ├── icon-512.png
    └── apple-touch-icon.png
```

> Ne déplace pas `index.html` : le manifest et le service worker sont référencés en **relatif** (`./`), donc ça marche à la racine **comme dans un sous-dossier** (`https://exemple.fr/accords/`).

---

## 1. Tester sur l'ordinateur (2 minutes)

```bash
npm run build
npx vite preview --port 4173
```

Ouvrir <http://localhost:4173>. `localhost` est considéré comme sécurisé : le service worker et l'installation fonctionnent.

Vérifications dans Chrome (F12) :

| Onglet | À vérifier |
|---|---|
| **Application → Manifest** | nom « Mes accords », icônes 192 et 512, `display: standalone` |
| **Application → Service Workers** | statut **activated** |
| **Lighthouse → PWA** | l'appli est signalée comme installable |

Dans l'appli : **Installer l'appli sur mon téléphone** (sous le clavier) doit afficher les pastilles **HTTPS**, **Hors-ligne prêt**, **Manifest** en vert.

---

## 2. Mettre en ligne (choisir UNE option)

### Option A — Netlify Drop (le plus rapide, sans compte technique)

1. Aller sur <https://app.netlify.com/drop>.
2. **Glisser le dossier `dist/`** dans la zone de dépôt.
3. Netlify donne une adresse en `https://…netlify.app` : c'est votre lien PWA.
4. (Facultatif) Créer un compte pour garder le site, le renommer, brancher un domaine.

> Le fichier `deploy/netlify.toml` sert si vous connectez un dépôt Git à Netlify (build automatique). Placez-le alors **à la racine** du dépôt.

### Option B — Vercel (build automatique depuis Git)

1. Pousser le projet sur GitHub/GitLab.
2. Sur <https://vercel.com> → **Add New → Project** → importer le dépôt.
3. Framework détecté : **Vite** — Build `npm run build` — Output `dist`.
4. Déployer. Adresse `https://…vercel.app`.

Le fichier `deploy/vercel.json` documente les en-têtes du service worker : copiez-le à la racine du dépôt si Vercel ne le détecte pas automatiquement.

### Option C — GitHub Pages (gratuit, dépôt public)

```bash
npm run build
cd dist
git init
git add -A
git commit -m "PWA Mes accords"
git branch -M gh-pages
git remote add origin https://github.com/<vous>/<depot>.git
git push -u origin gh-pages
```

Puis dans GitHub : **Settings → Pages → Branch: gh-pages / (root)**.
Adresse : `https://<vous>.github.io/<depot>/` (les chemins relatifs gèrent le sous-dossier).
Laissez le fichier `.nojekyll` fourni dans `dist/` : il évite le traitement Jekyll.

### Option D — Azure Static Web Apps

1. Le site se déploie depuis GitHub (workflow Azure) ou avec la CLI `swa deploy ./dist`.
2. Copier `deploy/staticwebapp.config.json` à la racine du dépôt : il configure le fallback SPA, le type MIME `.webmanifest` et les en-têtes du service worker.

### Option E — Hébergement perso / NAS

Servir `dist/` avec **HTTPS** (Let's Encrypt via Nginx, Caddy, Traefik…). Sans certificat valide, l'installation et le hors-ligne sont bloqués par le navigateur.

---

## 3. Installer sur le téléphone

### Android (Chrome, Edge, Samsung Internet)

1. Ouvrir le lien `https://…` dans Chrome.
2. Menu **⋮** en haut à droite → **« Installer l'application »** (ou la bannière **Installer** en bas).
3. Confirmer : l'icône apparaît dans le tiroir d'applis et sur l'accueil.

### iPhone / iPad (Safari obligatoire)

1. Ouvrir le lien **dans Safari** (Chrome et Firefox iOS ne proposent pas l'ajout).
2. Bouton **Partager** (carré avec une flèche vers le haut).
3. Faire défiler → **« Sur l'écran d'accueil »** → **Ajouter**.
4. Lancer **Mes accords** depuis l'icône : plein écran, sans barre d'adresse.

### Ordinateur (Chrome / Edge)

1. Ouvrir le site.
2. Icône **écran + flèche** à droite de la barre d'adresse, ou menu **⋮ → Installer Mes accords**.

### Vérifier que c'est bien installé

Dans l'appli, ouvrir le guide d'installation : la pastille **Mode appli** doit être verte, et la barre d'adresse a disparu.

---

## 3 bis. Mettre en plein écran

Trois niveaux, selon ce que tu veux masquer :

| Mode | Barre d'adresse | Barre d'état (heure, batterie) | Comment |
|---|---|---|---|
| Onglet navigateur | visible | visible | rien |
| **PWA installée** (`standalone`) | masquée | visible | installer sur l'écran d'accueil |
| **Plein écran réel** | masquée | masquée | bouton dans l'appli, ou `F` / menu du navigateur |

### Android / ordinateur

- Bouton **⤢** dans la barre du bas (ou dans l'en-tête), raccourci **F**, ou touche d'agrandissement de la barre d'adresse.
- Sur Android, le plein écran verrouille l'orientation en portrait et **garde l'écran allumé** pendant l'utilisation.
- Le bouton devient **⤡** pour revenir à l'affichage normal.

### iPhone / iPad

- **Safari sur iPhone n'expose pas l'API plein écran** pour une page web : le bouton affiche alors un mode d'emploi.
- La seule solution plein écran sur iPhone est d'**installer l'appli** : Partager → « Sur l'écran d'accueil ». Elle démarre sans barre d'adresse, et la barre d'état est en `black-translucent` (fond de l'appli dessous).
- Sur **iPad**, Safari accepte le plein écran : le bouton fonctionne directement.
- Chrome/Firefox sur iOS ne permettent ni l'installation ni le plein écran : utiliser Safari.

### Réglages concernés

- `public/manifest.webmanifest` : `display: "standalone"`, `display_override: ["standalone", "fullscreen", "minimal-ui"]`.
- `src/lib/fullscreen.ts` : API Fullscreen (préfixes inclus), Wake Lock, verrouillage portrait.
- `src/components/Mobile.tsx` : bouton de la barre mobile + feuille d'aide adaptée iOS.

---

## 3 ter. Démarrage direct en plein écran (look « appli »)

Deux mécanismes se complètent :

1. **Manifest** (`public/manifest.webmanifest`) :
   ```json
   "display": "fullscreen",
   "display_override": ["fullscreen", "standalone", "minimal-ui"]
   ```
   Sur Android, l'appli **installée** s'ouvre alors sans barre d'état, dès son lancement.
   Sur iOS, Apple ignore `fullscreen` : l'appli installée s'ouvre en `standalone` (sans barre d'adresse),
   barre d'état transparente (`black-translucent`).

2. **Passage automatique au premier toucher** (réglage dans l'appli : bouton ⤢ → « Démarrer en plein écran ») :
   les navigateurs interdisent le plein écran sans geste utilisateur. L'appli installée le demande donc au
   **premier toucher**, une seule fois par session. Réglage conservé dans le stockage local.

À vérifier après déploiement :
- ouvrir l'appli **installée** (icône, pas un onglet) ;
- toucher l'écran une fois → barre d'état masquée ;
- le bouton ⤡ permet de revenir, et l'écran reste allumé pendant l'utilisation (Wake Lock).

> Si l'appli est ouverte dans un onglet, le plein écran ne s'applique qu'à l'onglet : c'est normal.

---

## 3 quater. Changer l'icône

L'icône de l'écran d'accueil est **lue dans le manifest** : elle ne peut pas être changée depuis l'appli
en cours d'exécution, il faut remplacer les fichiers puis réinstaller.

### Option 1 — les variantes fournies

Trois icônes sont incluses dans l'appli (bouton **« Changer l'icône de l'appli »**) :

| Variante | Fichiers |
|---|---|
| Nuit (défaut) | `icon-512.png`, `icon-192.png`, `apple-touch-icon.png` |
| Papier | `light-512.png`, `light-192.png`, `light-apple-touch.png` |
| Laiton | `gold-512.png`, `gold-192.png`, `gold-apple-touch.png` |

1. Choisir la variante et **télécharger les 3 PNG** (boutons 512 / 192 / iOS 180).
2. Les renommer `icon-512.png`, `icon-192.png`, `apple-touch-icon.png` et remplacer ceux de
   `dist/icons/` (ou de `public/icons/` puis `npm run build`).
3. Redéployer `dist/`.
4. **Désinstaller puis réinstaller** l'appli : Android/iOS gardent l'ancienne icône en cache.

### Option 2 — votre propre image

```bash
bash deploy/make-icons.sh mon-image.png
npm run build
```

L'image est recadrée au carré (1024 px conseillé) et convertie aux 3 tailles. Puis redéployer et
réinstaller. Pour Android, gardez le motif **au centre** (l'icône adaptative est recadrée en cercle/arrondi).

### Option 3 — changer l'URL des icônes dans le manifest

Si vous hébergez vos icônes ailleurs, modifiez le tableau `icons` du manifest avec les URL absolues,
en conservant au minimum un **192×192**, un **512×512** et une entrée `purpose: "maskable"`.

---

## 4. Sauvegarder ses claviers

Les claviers sont stockés dans le **navigateur du téléphone** (`localStorage`), pas sur un serveur.

- Faire régulièrement **Export** (bouton sous le clavier) → télécharge `clavier.csv`.
- **Import** permet de restaurer un clavier sur un autre appareil.
- Vider les données du navigateur = perte des claviers locaux (le CSV est la sauvegarde).

---

## 5. Mettre à jour l'appli déployée

1. Modifier le code, puis `npm run build`.
2. **Changer la version du cache** dans `public/sw.js` :
   ```js
   const VERSION = "v5"; // incrémenter à chaque déploiement
   ```
3. Redéployer le contenu de `dist/`.
4. Rouvrir l'appli : la nouvelle version se met en cache à la première visite (fermer/rouvrir si besoin).

> Important : `sw.js` et `manifest.webmanifest` doivent être servis **sans cache long** ; les configs `deploy/` le font déjà.

---

## 6. Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| Pas de bannière « Installer » | site en `http://`, ou ouverture depuis un fichier local | servir en **HTTPS** / `localhost` |
| Rien dans « Installer l'application » | déjà installée (mode appli) | désinstaller puis réinstaller |
| iPhone : pas d'option d'ajout | page ouverte dans Chrome/Firefox iOS | rouvrir **dans Safari** |
| Pastille « Hors-ligne en attente » | service worker pas encore actif | recharger une fois, vérifier `/sw.js` en 200 |
| Micro d'accordage refusé | permission ou contexte non sécurisé | autoriser le micro, rester en HTTPS |
| Page blanche après déploiement | `index.html` mal placé / cache | vérifier l'URL, vider le cache, redéployer `dist/` |
| Mise à jour invisible | ancien cache du service worker | incrémenter `VERSION`, recharger |

---

## 7. Plus tard : APK depuis la même PWA (TWA)

La PWA peut devenir un APK Android **sans réécrire l'appli** (Trusted Web Activity) :

1. Déployer d'abord la PWA sur une URL HTTPS stable.
2. Sur <https://www.pwabuilder.com>, saisir l'URL → **Package for stores → Android**.
3. Renseigner le nom du package (ex. `fr.mesaccords.app`), la version, les icônes.
4. PWABuilder fournit un **APK/AAB** + un fichier `assetlinks.json`.
5. Publier `assetlinks.json` à l'adresse `https://votre-domaine/.well-known/assetlinks.json`
   (un modèle est fourni : `deploy/assetlinks.json.example`). Cela supprime la barre d'adresse dans l'APK.
6. Publier l'APK sur le Play Store (compte développeur, 25 $ une fois) ou le partager directement.

Pour une appli **native sans dépendance au site en ligne**, il faudra passer par Capacitor — étape ultérieure.
