# Mes accords — fabriquer l'APK avec GitHub (pas à pas)

> **Le principe** : vous déposez le dossier du projet sur le site GitHub,
> et GitHub fabrique l'appli Android (le fichier `.apk`) à votre place.
> **Tout se fait dans le navigateur, sur un ordinateur.** Rien à installer.

**À savoir avant de commencer**
- Faites-le sur **un ordinateur** (pas sur le téléphone : les menus y sont cachés).
- Le site GitHub est **en anglais**. Ce guide donne les mots exacts à
  chercher, en **gras**, avec la traduction entre parenthèses.
- Si votre navigateur **traduit la page en français**, les boutons changent de
  nom : voir le tableau *« Si la page est traduite »* en fin de guide.
  Le plus simple : désactiver la traduction pour github.com.

Durée : ~20 minutes la première fois, puis ~5 minutes d'attente à chaque APK.

---

## ÉTAPE 1 — Préparer le dossier sur votre PC

Ouvrez le dossier du projet `mes-accords`. Vous y voyez notamment :

```
mes-accords/
├── _PRIVE_cle-android/   ← PRIVÉ : à garder, NE PAS envoyer sur GitHub
├── android/
├── assets/               ← mettez ici votre icône
├── deploy/
├── public/
├── src/
├── .github/
└── (quelques fichiers : package.json, index.html, …)
```

**Votre icône** : copiez votre image dans le dossier `assets` et
renommez-la **`mon-icone.png`** (ou `mon-icone.jpg`).
Image carrée de préférence (1024 × 1024 px idéal), motif au centre.

> ⚠️ Sous Windows, vérifiez qu'elle ne s'appelle pas `mon-icone.png.png` :
> Explorateur de fichiers → menu **Affichage** → cocher
> **Extensions de noms de fichiers**.

---

## ÉTAPE 2 — Créer votre compte GitHub (une seule fois)

1. Allez sur **https://github.com**.
2. Cliquez sur **Sign up** (*S'inscrire*), en haut à droite.
3. Suivez les étapes (e-mail, mot de passe, nom d'utilisateur), puis
   validez le code reçu par e-mail.

---

## ÉTAPE 3 — Créer le « dépôt » (une seule fois)

Un *dépôt* (*repository*) est simplement un dossier en ligne pour votre projet.

1. Une fois connecté, en **haut à droite**, cliquez sur le bouton **+**
   (signe plus), puis sur **New repository** (*Nouveau dépôt*).
2. Remplissez la page :
   - **Repository name** (*nom du dépôt*) : tapez `mes-accords`
   - Choisissez **Private** (*privé* : vous seul le voyez)
   - **Add README** : mettez l'interrupteur sur **On** (activé).
     *Important : sans cela, le bouton d'envoi de fichiers n'apparaît pas.*
3. En bas, cliquez sur le bouton vert **Create repository** (*Créer le dépôt*).

Vous arrivez sur la page de votre dépôt, avec un fichier `README.md`.

---

## ÉTAPE 4 — Envoyer les fichiers du projet

1. Sur la page du dépôt, **au-dessus de la liste des fichiers**, cliquez sur
   le bouton **Add file** (*Ajouter un fichier*), puis sur
   **Upload files** (*Envoyer des fichiers*).
2. Sur votre PC, ouvrez le dossier `mes-accords` :
   - sélectionnez **tout** (**Ctrl + A**) ;
   - puis, en maintenant **Ctrl**, cliquez sur ces éléments pour les
     **désélectionner** :
     - **`_PRIVE_cle-android`** (obligatoire : c'est votre clé secrète)
     - **`node_modules`** et **`dist`** (s'ils existent)
3. **Glissez** la sélection sur la page GitHub (dans le grand cadre
   *« Drag files here »*). Attendez que la liste des fichiers s'affiche.
4. En bas de la page, section **Commit changes** :
   - cochez **Commit directly to the `main` branch**
     (*enregistrer directement dans la branche principale*) ;
     **ne choisissez pas** l'option « create a new branch » ;
   - cliquez sur le bouton vert **Commit changes** (*Enregistrer*).
5. Patientez : la page du dépôt affiche ensuite les dossiers `.github`,
   `android`, `assets`, `deploy`, `public`, `src`, etc.

> Si GitHub dit *« too many files »* (trop de fichiers, limite 100) :
> refaites l'envoi en deux fois — d'abord tout **sauf** `android`,
> puis le dossier `android` seul.

> Une fabrication démarre automatiquement après cet envoi. Comme la clé
> n'est pas encore donnée à GitHub (étape 5), elle produira un APK « de test » :
> **ignorez-la**, et lancez-en une nouvelle à l'étape 6.

---

## ÉTAPE 5 — Donner la clé secrète à GitHub (une seule fois)

La clé garantit que chaque nouvelle version s'installera **par-dessus**
l'ancienne, **sans perdre vos claviers**.

1. Sur votre PC, ouvrez le dossier `_PRIVE_cle-android`, puis le fichier
   **`CLE_ANDROID.txt`** avec le **Bloc-notes**.
   Faites **Ctrl + A** (tout sélectionner) puis **Ctrl + C** (copier).
2. Sur GitHub, sur la page de votre dépôt, cliquez sur l'onglet
   **Settings** (*Paramètres*, icône ⚙) — c'est le **dernier onglet** de la
   rangée sous le nom du dépôt. *S'il n'est pas visible, cliquez sur les
   trois points `…` au bout de la rangée.*
3. Dans le **menu de gauche**, descendez jusqu'à la rubrique **Security**
   (*Sécurité*), cliquez sur **Secrets and variables**, puis sur **Actions**.
4. Vérifiez que l'onglet **Secrets** est sélectionné, puis cliquez sur le
   bouton vert **New repository secret** (*Nouveau secret*).
5. Remplissez :
   - **Name** (*nom*) : tapez exactement **`CLE_ANDROID`**
   - **Secret** : collez (**Ctrl + V**) le contenu copié à l'étape 1
6. Cliquez sur **Add secret** (*Ajouter le secret*).

Le secret `CLE_ANDROID` apparaît dans la liste (sa valeur reste cachée, c'est normal).

---

## ÉTAPE 5 bis — Vérifier que la « recette » de fabrication est bien là

Sur la page du dépôt (onglet **Code**), regardez la liste des dossiers :
il doit y avoir un dossier **`.github`** (avec un point devant).

**Si `.github` n'apparaît pas**, ou si l'onglet **Actions** affiche une page
**« Get started with GitHub Actions »** / **« Choose a workflow »** (une
grille de modèles avec des boutons *Configure*), c'est que la recette n'a
pas été envoyée : son dossier commence par un point, il est souvent caché.
On la crée alors directement sur le site, par copier-coller.

**Le plus rapide, depuis la page « Get started with GitHub Actions »** :
1. Cliquez sur le lien bleu **set up a workflow yourself →** (sous le titre).
2. Un éditeur s'ouvre, avec un fichier nommé `main.yml` déjà rempli d'un
   exemple. **Gardez ce nom**, il convient très bien.
3. Cliquez dans le texte → **Ctrl + A** → touche **Suppr** (tout effacer).
4. Sur votre PC, ouvrez **`deploy/WORKFLOW-A-COLLER.txt`** avec le Bloc-notes
   → **Ctrl + A** → **Ctrl + C**, puis revenez sur GitHub et **Ctrl + V**.
5. En haut à droite : bouton vert **Commit changes…** → dans la fenêtre,
   laissez **Commit directly to the main branch** → **Commit changes**.
6. Retournez dans l'onglet **Actions** : **APK Android** apparaît à gauche et
   une fabrication démarre toute seule.

**Ou, depuis l'onglet Code** :

1. Sur votre PC, ouvrez le fichier **`deploy/WORKFLOW-A-COLLER.txt`** avec le
   **Bloc-notes** → **Ctrl + A** (tout sélectionner) → **Ctrl + C** (copier).
2. Sur GitHub, onglet **Code** → bouton **Add file** → **Create new file**
   (*Créer un nouveau fichier*).
3. Dans la case du nom du fichier (*Name your file…*), en haut, tapez
   exactement :

   **`.github/workflows/android-apk.yml`**

   (chaque **/** crée un dossier : c'est normal que le nom se découpe en morceaux).
4. Cliquez dans la grande zone de texte en dessous et collez (**Ctrl + V**).
5. En haut à droite, cliquez sur le bouton vert **Commit changes…**
   (*Enregistrer*) → dans la petite fenêtre, laissez
   **Commit directly to the main branch** → bouton vert **Commit changes**.
6. Retournez dans l'onglet **Actions** : **APK Android** apparaît maintenant
   dans le menu de gauche, et une fabrication démarre toute seule.

> Si vous avez déjà créé le secret `CLE_ANDROID` (étape 5), cette fabrication
> automatique est la bonne : passez directement à l'étape 6 point 4.

---

## ÉTAPE 6 — Fabriquer l'APK

1. Sur la page du dépôt, cliquez sur l'onglet **Actions**.
   - Si un message demande d'activer les automatismes, cliquez sur
     **I understand my workflows, go ahead and enable them**
     (*je comprends, activer*).
2. Dans le **menu de gauche**, cliquez sur **APK Android**.
3. À droite, au-dessus de la liste, cliquez sur le bouton **Run workflow**
   (*Lancer*). Une petite fenêtre s'ouvre : laissez *Branch: main* et
   cliquez sur le bouton vert **Run workflow**.
4. Une ligne apparaît dans la liste (rafraîchissez la page si besoin) :
   - rond **jaune** = en cours (environ 5 minutes) ;
   - coche **verte** ✅ = terminé ;
   - croix **rouge** ❌ = problème (voir *Dépannage*).

---

## ÉTAPE 7 — Récupérer et installer l'APK

1. Cliquez sur l'onglet **Code** (le premier onglet, page d'accueil du dépôt).
2. Dans la **colonne de droite**, rubrique **Releases** (*versions*),
   cliquez sur **Mes accords — version N** (la plus récente).
3. Dans la partie **Assets** (*fichiers*), cliquez sur
   **`mes-accords-N.apk`** : il se télécharge.
4. Envoyez ce fichier sur votre téléphone (câble USB, Google Drive,
   e-mail à vous-même…), puis ouvrez-le sur le téléphone.
5. La première fois, Android demande d'**autoriser l'installation depuis
   cette source** : **Paramètres** → activez **Autoriser** → revenez →
   **Installer**. (Si Play Protect avertit « appli inconnue » :
   **Installer quand même**.)

> Astuce : vous pouvez aussi ouvrir github.com **sur le téléphone**,
> vous connecter, et télécharger l'APK directement depuis la page Releases.

---

## Les fois suivantes : changer d'icône ou mettre à jour

1. Sur GitHub, onglet **Code** → cliquez sur le dossier **`assets`**.
2. **Add file** → **Upload files** → glissez votre nouvelle `mon-icone.png`
   (elle remplace l'ancienne).
3. **Commit directly to the main branch** → **Commit changes**.
4. La fabrication **démarre toute seule**. Après ~5 minutes, une nouvelle
   version est dans **Releases** (étape 7).
5. Sur le téléphone, installez-la **par-dessus** : Android propose
   **Mettre à jour**, vos claviers sont conservés.

---

## Si la page est traduite en français par le navigateur

| Sur la page en anglais | Possible traduction affichée |
|---|---|
| New repository | Nouveau référentiel / Nouveau dépôt |
| Add README | Ajouter README |
| Create repository | Créer un référentiel |
| Add file → Upload files | Ajouter un fichier → Télécharger des fichiers |
| Commit directly to the main branch | S'engager directement dans la branche principale |
| Commit changes | Valider les modifications |
| Settings | Paramètres |
| Secrets and variables → Actions | Secrets et variables → Actions |
| New repository secret | Nouveau secret de référentiel |
| Add secret | Ajouter un secret |
| Run workflow | Exécuter le flux de travail |
| Releases / Assets | Versions / Actifs |

Pour revenir à l'anglais dans Chrome : icône de traduction dans la barre
d'adresse → **Afficher l'original**.

---

## Dépannage

| Ce que vous voyez | Que faire |
|---|---|
| Pas de bouton **Add file** | le dépôt a été créé sans **Add README** : sur sa page, cliquez sur le lien bleu **uploading an existing file** (*envoyer un fichier existant*), c'est le même écran d'envoi |
| L'onglet **Actions** affiche « Get started with GitHub Actions » / « Choose a workflow » | la recette (dossier **`.github`**) n'a pas été envoyée : suivez l'**étape 5 bis** (copier-coller de `deploy/WORKFLOW-A-COLLER.txt`) |
| Pas de bouton **Run workflow** | vous n'avez pas cliqué sur **APK Android** dans le menu de gauche (étape 6.2) |
| Croix rouge ❌ | cliquez sur la ligne, puis sur l'étape marquée en rouge : copiez-moi le message |
| Avertissement *« Secret CLE_ANDROID absent »* | le secret n'est pas créé ou mal nommé : refaites l'étape 5 (nom exact `CLE_ANDROID`), puis l'étape 6 |
| Pas de rubrique **Releases** | elle apparaît après une fabrication réussie (coche verte) |
| Mon icône n'est pas utilisée | nom exact `mon-icone.png` dans le dossier `assets` (attention au `.png.png`) |
| « Appli non installée » sur le téléphone | une version faite avec une autre clé (ex. APK de test) est installée : désinstallez-la puis réinstallez |

**Toujours bloqué ?** Envoyez-moi une capture d'écran de la page où vous êtes :
je vous dirai exactement où cliquer.

---

## ⚠️ Le dossier `_PRIVE_cle-android` : à garder précieusement

- Copiez-le sur une **clé USB** ou un **cloud personnel**.
- Ne l'envoyez **jamais** sur GitHub et ne le partagez pas.
- Sans lui, impossible de mettre l'appli à jour : il faudrait la désinstaller,
  et les claviers enregistrés seraient perdus.

---

## Annexe — fabriquer l'APK sur le PC, sans GitHub (avancé)

Installez **Android Studio** (Java 21 + SDK Android) et **Git pour Windows**
(Git Bash). Dans Git Bash, dans le dossier du projet :
```bash
bash deploy/build-apk.sh 5      # 5 = numéro de version, toujours plus grand
```
→ `mes-accords.apk` dans le dossier du projet (votre `assets/mon-icone.*` est utilisé).
