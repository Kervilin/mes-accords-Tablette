#!/usr/bin/env bash
# ============================================================
# Restaure les fichiers binaires indispensables du projet Android s'ils
# manquent (gradle-wrapper.jar, images…). Ils proviennent du modèle
# officiel de Capacitor fourni dans node_modules.
# Lancé automatiquement par build-apk.sh et par la compilation GitHub.
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

TPL="node_modules/@capacitor/cli/assets/android-template.tar.gz"
[[ -f "$TPL" ]] || { echo "Modèle Capacitor absent : lancez « npm install » d'abord." >&2; exit 1; }
[[ -d android ]] || { echo "Dossier android/ absent : lancez « npx cap add android »." >&2; exit 1; }

n=0
while read -r f; do
  if [[ ! -s "android/$f" ]]; then
    mkdir -p "android/$(dirname "$f")"
    tar xzf "$TPL" -C android "$f"
    echo "  restauré : android/$f"
    n=$((n + 1))
  fi
done < <(tar tzf "$TPL" | grep -E '\.(jar|png|webp)$')

chmod +x android/gradlew 2>/dev/null || true
if (( n == 0 )); then echo "Projet Android complet ✔"; else echo "$n fichier(s) restauré(s) ✔"; fi
