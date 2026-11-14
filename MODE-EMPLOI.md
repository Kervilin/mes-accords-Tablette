# Mode d'emploi — plein écran + icône (5 minutes)

## En 4 gestes

1. **Dans l'appli** : sous le clavier, touche **« Installer l'appli sur mon téléphone »**
   → **« Télécharger mes-accords-pwa.zip »**. Tu obtiens un fichier ZIP.
2. **Sur un ordinateur ou le téléphone** : va sur **https://app.netlify.com/drop** et glisse le ZIP.
   Note l'adresse affichée : `https://quelque-chose.netlify.app`.
3. **Sur le téléphone**, ouvre cette adresse :
   - **Android / Chrome** : menu ⋮ → **Installer l'application**.
   - **iPhone / Safari** : **Partager** → **Sur l'écran d'accueil** → **Ajouter**.
4. **Lance l'appli depuis l'icône** (pas depuis l'onglet). Elle s'ouvre **en plein écran**.

C'est tout. Le ZIP contient déjà : l'appli, l'icône, le manifest `fullscreen` et le mode hors-ligne.

---

## Changer l'icône

1. Dans l'appli : **« Changer l'icône de l'appli »** → choisis **Nuit**, **Papier** ou **Laiton**.
2. Touche **« Télécharger le paquet avec l'icône … »** (nouveau ZIP).
3. Sur Netlify, ouvre **ton site** → onglet **Deploys** → **Deploy manually** → glisse le nouveau ZIP.
4. Sur le téléphone : **désinstalle** l'appli (appui long sur l'icône → Désinstaller),
   rouvre l'adresse, **réinstalle**. La nouvelle icône apparaît.

> L'icône est lue à l'installation : sans désinstaller/réinstaller, l'ancienne reste affichée.
> Android garde parfois un cache : Paramètres → Applications → l'appli → Stockage → **Vider le cache**.

### Sa propre image

```bash
bash deploy/make-icons.sh mon-image.png
npm run build
bash deploy/check-pwa.sh
```
Puis redéployer `dist/` (glisser le dossier sur Netlify Drop, ou le ZIP de nouveau).

---

## Vérifications utiles

```bash
npm run build
bash deploy/check-pwa.sh
```
Doit afficher « Tout est prêt ». Sinon, la ligne ✘ indique le fichier manquant.

Dans l'appli, **« Ça ne marche pas ? Lancer le diagnostic »** teste en direct :
HTTPS, manifest, icônes réellement téléchargeables, hors-ligne, installation, mode d'affichage.

---

## Pourquoi ça ne marchait pas avant

| Symptôme | Cause | Solution |
|---|---|---|
| Pas d'icône sur l'écran d'accueil | appli ouverte dans un onglet, jamais installée | installer puis lancer depuis l'icône |
| Icône générique (lettre) | manifest ou dossier `icons/` absent du déploiement | redéployer **tout** `dist/` |
| Toujours pas de plein écran | iPhone : Apple l'interdit aux PWA | maximum sur iOS = sans barre d'adresse |
| Ancienne icône | cache d'installation | désinstaller / réinstaller |
| Le bouton ZIP affiche « version de développement » | page ouverte hors du site publié | utiliser l'adresse `https://…` déployée |
