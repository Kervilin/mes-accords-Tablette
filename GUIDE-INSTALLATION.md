# Mes accords — Guide d'installation (PWA)

> **Objectif :** ouvrir l'appli **directement en plein écran** depuis **son icône**,
> comme une vraie appli, sans passer par le navigateur.
>
> **Temps :** 5 minutes la première fois, 2 minutes les suivantes.
> **Coût :** 0 €. **Logiciel à installer :** aucun.

---

## 1. Ce qu'il faut comprendre (30 secondes)

- Une PWA **ne s'installe pas depuis un fichier** : il faut une **adresse https://**
  (c'est le navigateur du téléphone qui fait l'installation).
- **Onglet de navigateur ≠ appli installée.**
  L'icône et le plein écran n'apparaissent que si tu lances l'appli
  **depuis l'icône ajoutée sur l'écran d'accueil**.
- L'icône est « photographiée » **au moment où tu installes**.
  Pour changer d'icône, il faut **désinstaller puis réinstaller**.
- Sur **iPhone**, Apple interdit le plein écran total aux applis web :
  le maximum, c'est **sans barre d'adresse** (la barre d'heure reste).
  Sur **Android**, on a le **vrai plein écran**.

---

## 2. Fiche à remplir (pratique pour la prochaine fois)

| Info | À noter |
|---|---|
| Mon adresse Netlify | `https://` …………………………………`.netlify.app` |
| Date d'installation | …… / …… / ………… |
| Icône choisie | ☐ Nuit ☐ Papier ☐ Laiton ☐ Perso |
| Téléphone | ☐ Android ☐ iPhone |
| Version du cache (`sw.js`) | `v`……… |

---

## 3. Première installation — pas à pas

### Étape 1 — Télécharger le paquet (dans l'appli)

- [ ] Sous le clavier, touche **« Installer l'appli sur mon téléphone »**.
- [ ] Touche le bouton rouge **« Télécharger mes-accords-pwa.zip »**.
- [ ] Tu obtiens un fichier `mes-accords-pwa.zip` (≈ 450 Ko).

> Ce ZIP contient déjà tout : l'appli, l'icône choisie,
> le mode plein écran et le hors-ligne. Rien d'autre à préparer.

### Étape 2 — Mettre en ligne (gratuit, 2 minutes)

- [ ] Va sur **https://app.netlify.com/drop**
      (sur ordinateur ou sur le téléphone, peu importe).
- [ ] **Glisse le fichier ZIP** (ou le dossier dézippé) dans la grande zone.
- [ ] Attends « Site is live » puis **note l'adresse affichée**,
      par exemple `https://melodic-bonbon-8f3a2c.netlify.app`.
- [ ] Ouvre cette adresse une fois pour vérifier que l'appli s'affiche.

> (Optionnel) Crée un compte Netlify gratuit pour garder le site,
> le renommer, et pouvoir le mettre à jour avec « Deploy manually ».

### Étape 3 — Installer sur le téléphone

**Sur Android (Chrome, Edge, Samsung Internet) :**

- [ ] Ouvre l'adresse `https://…netlify.app` **dans Chrome**.
- [ ] Menu **⋮** en haut à droite → **« Installer l'application »**.
      (Une bannière « Installer » peut aussi apparaître en bas.)
- [ ] Confirme **Installer**. L'icône apparaît sur l'accueil.

**Sur iPhone / iPad (Safari obligatoirement) :**

- [ ] Ouvre l'adresse **dans Safari** (pas Chrome, pas Firefox).
- [ ] Bouton **Partager** (carré avec une flèche vers le haut, en bas).
- [ ] Fais défiler → **« Sur l'écran d'accueil »** → **Ajouter**.
- [ ] L'icône **Mes accords** apparaît sur l'écran d'accueil.

**Sur ordinateur (Chrome / Edge) :**

- [ ] Ouvre l'adresse.
- [ ] Icône **écran + flèche** à droite de la barre d'adresse,
      ou menu **⋮ → Installer Mes accords**.

### Étape 4 — Lancer en plein écran

- [ ] **Ferme l'onglet du navigateur.**
- [ ] Lance l'appli **depuis sa nouvelle icône** (pas depuis l'onglet).
- [ ] Touche l'écran une fois : sur Android, la barre d'état disparaît
      (option « Démarrer en plein écran », activée par défaut).
- [ ] Vérifie : plus de barre d'adresse = c'est gagné.

> Le bouton **⤢** (barre du bas ou en-tête, touche **F** sur clavier)
> permet de passer / quitter le plein écran à tout moment.
> Sur Android, le plein écran garde aussi **l'écran allumé** pendant que tu joues.

---

## 3 bis. Utiliser l'appli sur ordinateur (souris + clavier)

L'appli fonctionne exactement pareil sur PC et sur téléphone,
mais le grand écran et le clavier physique changent tout.

### Ouvrir et installer

- [ ] Ouvre ton adresse `https://…netlify.app` dans **Chrome ou Edge**.
- [ ] Pour l'installer : icône **écran + flèche** à droite de la barre d'adresse,
      ou menu **⋮ → Installer Mes accords**.
      Elle s'ouvre alors dans sa propre fenêtre, sans barre d'adresse.
- [ ] Plein écran : touche **F** (ou bouton **⤢** dans l'en-tête).

### Utiliser à la souris

Tout se clique exactement comme au doigt sur mobile :
choisir une fondamentale, un accord (Parfait, 7, 9, Autres),
**Majeur / Mineur**, le cadran **Poussé / Tiré**,
cliquer un bouton du clavier pour le choisir comme note de départ,
bouton **Son** pour écouter, **Raz** pour tout effacer.

### Les raccourcis clavier (le plus rapide sur PC)

| Touche | Action |
|---|---|
| `←` / `→` | Tiré / Poussé |
| `+` / `−` | Majeur / Mineur |
| `1`–`9` | Parfait, sus2, add9, sus4, 5, 6, 7m, 7M, 9 |
| `Espace` | Écouter / Stop |
| `E` | Passer en édition |
| `F` | Plein écran |
| `Échap` | Raz (tout effacer) |
| En édition : `0` | Pas de note pour ce sens |
| En édition : `Suppr` | Effacer les 2 sens de la touche |

> La liste complète est aussi affichée sous le clavier, dans l'appli.

### Le point important : PC et téléphone ne partagent rien

Les claviers sont enregistrés **dans le navigateur de chaque appareil**.
Ceux créés sur le téléphone **n'apparaissent pas** sur le PC, et inversement.

Pour transférer un clavier du téléphone vers le PC (ou l'inverse) :

- [ ] Sur l'appareil source : bouton **Export** → récupère le fichier `clavier.csv`.
- [ ] Envoie-toi le fichier (mail, message, cloud, clé USB…).
- [ ] Sur l'appareil cible : bouton **Import** → choisis le fichier → **Charger**.

### Micro et édition sur PC

- Le micro d'accordage fonctionne aussi sur PC (en HTTPS) :
  le navigateur demande l'autorisation la première fois.
- S'il y a plusieurs micros (webcam, casque…), choisis le bon :
  icône 🔒/🎙 à gauche de la barre d'adresse → paramètres du site → Micro.
- L'édition au clavier (`0`, `Suppr`, saisie `G#5`…) est plus confortable
  sur PC : c'est l'idéal pour créer ou corriger un clavier,
  puis l'**exporter en CSV** vers le téléphone.

---

## 4. Changer d'icône (la prochaine fois)

L'appli propose 3 icônes : **Nuit** (marine/rouge, par défaut),
**Papier** (crème/vermillon), **Laiton** (anthracite/doré).

- [ ] Dans l'appli : **« Changer l'icône de l'appli »** → choisis Nuit / Papier / Laiton.
- [ ] Touche **« Télécharger le paquet avec l'icône … »** → nouveau ZIP.
- [ ] Sur Netlify : ouvre **ton site** → onglet **Deploys** →
      **« Deploy manually »** (en bas) → glisse le nouveau ZIP.
- [ ] Sur le téléphone : **appui long sur l'icône → Désinstaller**
      (ou « Supprimer l'app » sur iPhone).
- [ ] Rouvre l'adresse dans le navigateur, **réinstalle** (étape 3).
- [ ] La nouvelle icône apparaît sur l'écran d'accueil.

> Sans désinstaller/réinstaller, l'ancienne icône reste affichée : c'est normal,
> le téléphone la met en cache au moment de l'installation.
> Si elle ne change toujours pas sur Android :
> Paramètres → Applications → Mes accords → Stockage → **Vider le cache**,
> puis réinstalle.

### Utiliser ta propre image

```bash
bash deploy/make-icons.sh mon-image.png   # image carrée, 1024 px conseillé
bash deploy/prepare-icons.sh              # régénère les 9 icônes
npm run build
bash deploy/check-pwa.sh                  # doit dire « Tout est prêt »
```

Puis redéploie `dist/` (glisse le dossier sur Netlify Drop),
et désinstalle/réinstalle sur le téléphone.
Garde le motif **au centre** : Android recadre l'icône en cercle/arrondi.

---

## 5. Mettre l'appli à jour (après une modification)

- [ ] Modifie le code, puis :

```bash
npm run build
bash deploy/check-pwa.sh
```

- [ ] Si le code a changé, incrémente la version dans `public/sw.js`
      (`v10` → `v11`…), puis `npm run build` à nouveau.
- [ ] Redéploie `dist/` sur Netlify (glisser-déposer).
- [ ] Sur le téléphone : ouvre l'appli **deux fois**
      (la 1ʳᵉ visite télécharge la mise à jour, la 2ᵉ l'active).

---

## 6. Sauvegarder tes claviers (important)

Les claviers sont stockés **dans le téléphone**, pas sur internet.
Si tu vides les données du navigateur, ils sont perdus.

- [ ] Régulièrement : bouton **Export** (sous le clavier) → garde le fichier `clavier.csv`.
- [ ] Pour restaurer : bouton **Import** → choisis le fichier CSV.
- [ ] Pour changer de téléphone : Export sur l'ancien → Import sur le nouveau.

---

## 7. Dépannage — « ça ne marche pas »

Dans l'appli : **« Ça ne marche pas ? Lancer le diagnostic »**.
Il teste tout en direct et dit quoi corriger.

| Ce que tu vois | Cause la plus probable | Que faire |
|---|---|---|
| Pas d'icône sur l'accueil | appli jamais installée, juste ouverte dans un onglet | étape 3, puis lancer depuis l'icône |
| Icône générique (lettre) | `manifest` ou dossier `icons/` absent du site | redéployer **tout** le ZIP / `dist/` |
| Toujours pas de plein écran (Android) | appli lancée depuis un onglet | fermer l'onglet, lancer depuis l'icône |
| Toujours pas de plein écran (iPhone) | normal : Apple l'interdit aux applis web | le max = sans barre d'adresse |
| Ancienne icône après changement | cache d'installation | désinstaller → réinstaller |
| « Installer l'application » absent (Android) | déjà installée, ou page en `http://` | vérifier `https://`, ou désinstaller/réinstaller |
| iPhone : pas d'option d'ajout | page ouverte dans Chrome/Firefox | rouvrir **dans Safari** |
| Pastille « Hors-ligne en attente » | service worker pas encore actif | recharger la page une fois |
| Bouton ZIP : « version de développement » | page ouverte hors du site publié | utiliser l'adresse `https://…` déployée |
| Page blanche après déploiement | `index.html` mal placé, ou cache | vérifier l'URL, vider le cache, redéployer |
| Mise à jour invisible | ancien cache | incrémenter `VERSION` dans `sw.js`, rouvrir 2 fois |

**Test express du site déployé** (remplace par ton adresse) :
`…/manifest.webmanifest` → doit afficher du JSON,
`…/icons/icon-192.png` → doit afficher l'icône,
`…/sw.js` → doit afficher du code. Si l'un fait 404, redéploie tout.

---

## 8. Mémo ultra-court (à garder)

```
1. Appli → « Installer » → « Télécharger mes-accords-pwa.zip »
2. Glisser le ZIP sur https://app.netlify.com/drop → noter l'adresse https://…
3. Téléphone → ouvrir l'adresse →
   Android : ⋮ → « Installer l'application »
   iPhone  : Safari → Partager → « Sur l'écran d'accueil »
4. Lancer depuis l'ICÔNE → plein écran ✓
5. Nouvelle icône ? Nouveau ZIP → Deploy manually → désinstaller → réinstaller
6. Sauvegarde : bouton Export → garder clavier.csv
```

---

## 9. Fichiers utiles dans le projet

| Fichier | Rôle |
|---|---|
| `deploy/prepare-icons.sh` | régénère les 9 icônes depuis les 3 sources (avant chaque build) |
| `deploy/MODE-EMPLOI.md` | version courte de ce guide |
| `deploy/PROCEDURE-PWA.md` | version technique complète (Vercel, GitHub Pages, Azure…) |
| `deploy/check-pwa.sh` | `bash deploy/check-pwa.sh` — vérifie le paquet avant déploi |
| `deploy/make-icons.sh` | fabrique les 3 tailles d'icônes depuis ton image |
| `public/guide-installation.html` | ce guide en version imprimable (bouton Imprimer / PDF) |
| `deploy/assetlinks.json.example` | pour un futur APK (TWA) — pas utile maintenant |

*Guide généré pour « Mes accords » — PWA accordéon diatonique.*
