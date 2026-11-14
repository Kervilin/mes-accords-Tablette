#!/usr/bin/env bash
# ============================================================
# Fabrique l'APK de « Mes accords » sur votre ordinateur.
#
# Usage :
#   bash deploy/build-apk.sh            → APK signé (installable / mettable à jour)
#   bash deploy/build-apk.sh 7          → idem, avec le numéro de version 7
#
# Prérequis (une seule fois) : Node 20+, Java 21 (JDK), Android SDK
# (le plus simple : installer Android Studio, qui fournit Java et le SDK).
# Résultat : ./mes-accords.apk à copier sur le téléphone.
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

say() { printf '\n\033[1m▶ %s\033[0m\n' "$*"; }
die() { printf '\n\033[31m✘ %s\033[0m\n' "$*" >&2; exit 1; }

# --- 1. vérifications ---------------------------------------------------------
say "Vérification des outils"
command -v node >/dev/null || die "Node.js absent : installez Node 20 ou plus (https://nodejs.org)."
command -v java >/dev/null || die "Java absent : installez Android Studio (il fournit Java 21) ou un JDK 21, puis rouvrez le terminal."
JV=$(java -version 2>&1 | head -1 | sed -E 's/.*version "([0-9]+).*/\1/')
[[ "$JV" -ge 21 ]] 2>/dev/null || die "Java $JV détecté : il faut Java 21 ou plus (Capacitor 7). Dans Android Studio : Settings → Build Tools → Gradle → Gradle JDK = 21."

if [[ -z "${ANDROID_HOME:-}${ANDROID_SDK_ROOT:-}" && ! -f android/local.properties ]]; then
  for d in "$HOME/Android/Sdk" "$HOME/Library/Android/sdk" "${LOCALAPPDATA:-}/Android/Sdk"; do
    if [[ -d "$d" ]]; then export ANDROID_HOME="$d"; break; fi
  done
  [[ -n "${ANDROID_HOME:-}" ]] || die "Android SDK introuvable : ouvrez une fois Android Studio (il télécharge le SDK), ou définissez ANDROID_HOME."
  echo "sdk.dir=${ANDROID_HOME//\\//}" > android/local.properties
fi
echo "  Node $(node -v) · Java $JV · SDK ${ANDROID_HOME:-android/local.properties}"

if [[ -s _PRIVE_cle-android/CLE_ANDROID.txt || -n "${CLE_ANDROID:-}" ]]; then
  echo "  Signature : clé du projet (_PRIVE_cle-android/CLE_ANDROID.txt) ✔"
  SIGNED=1
else
  echo "  ⚠ _PRIVE_cle-android/CLE_ANDROID.txt absent : APK de test (mise à jour impossible sans désinstaller)."
  SIGNED=0
fi

# --- 2. appli web -------------------------------------------------------------
say "Construction de l'appli web"
[[ -d node_modules ]] || npm ci
if command -v convert >/dev/null; then bash deploy/prepare-icons.sh >/dev/null; fi
npm run build

# --- 3. projet Android --------------------------------------------------------
say "Copie dans le projet Android"
npx cap sync android
bash deploy/android-repair.sh
if command -v convert >/dev/null; then
  bash deploy/android-icons.sh        # votre icône assets/mon-icone.* si présente
else
  echo "  ⚠ ImageMagick absent : icône Android inchangée."
fi

# --- 4. APK -------------------------------------------------------------------
say "Compilation de l'APK (la 1re fois peut prendre plusieurs minutes)"
export VERSION_CODE="${1:-${VERSION_CODE:-1}}"
if (( SIGNED == 1 )); then
  TASK=assembleRelease; OUT=release
else
  TASK=assembleDebug;   OUT=debug   # sans clé : APK de test, installable mais non mettable à jour
fi
( cd android && chmod +x gradlew && ./gradlew --no-daemon "$TASK" )

APK=$(ls android/app/build/outputs/apk/$OUT/*.apk | grep -v unsigned | head -1)
[[ -n "$APK" ]] || die "APK introuvable dans android/app/build/outputs/apk/$OUT/"
cp "$APK" ./mes-accords.apk
say "Terminé : $(pwd)/mes-accords.apk ($(du -h mes-accords.apk | cut -f1), version $VERSION_CODE)"
echo "Copiez ce fichier sur le téléphone et ouvrez-le pour l'installer (voir GUIDE-APK.md)."
