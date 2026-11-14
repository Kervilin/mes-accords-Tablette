#!/usr/bin/env bash
# ============================================================
# Crée une NOUVELLE clé de signature pour l'appli Android, sous forme
# de texte : _PRIVE_cle-android/CLE_ANDROID.txt (une ligne « motdepasse:base64 »).
#
# À n'utiliser que si la clé a été perdue : un APK signé avec une autre clé
# ne peut pas mettre à jour l'appli installée (il faut la désinstaller,
# et les claviers enregistrés sont alors perdus).
# Ensuite : remplacer le secret CLE_ANDROID sur GitHub (voir GUIDE-APK.md).
# Nécessite openssl (fourni avec Git pour Windows / Git Bash).
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=_PRIVE_cle-android/CLE_ANDROID.txt
if [[ -s "$OUT" && "${1:-}" != "--force" ]]; then
  echo "Une clé existe déjà ($OUT). Pour la remplacer : bash deploy/new-keystore.sh --force" >&2
  exit 1
fi
command -v openssl >/dev/null || { echo "openssl requis." >&2; exit 1; }
mkdir -p _PRIVE_cle-android

PASS=$(openssl rand -base64 18 | tr -dc 'A-Za-z0-9' | head -c 20)
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
openssl req -x509 -newkey rsa:2048 -sha256 -days 10950 -nodes \
  -keyout "$T/k.pem" -out "$T/c.pem" -subj "/CN=Mes accords/O=Mes accords/C=FR" 2>/dev/null
openssl pkcs12 -export -inkey "$T/k.pem" -in "$T/c.pem" -name mesaccords \
  -passout "pass:$PASS" -out "$T/cle.p12"
B64=$(base64 -w0 "$T/cle.p12" 2>/dev/null || base64 "$T/cle.p12" | tr -d '\n')
printf '%s:%s' "$PASS" "$B64" > "$OUT"

echo "Nouvelle clé créée ✔ : $OUT"
echo "  - sauvegardez le dossier _PRIVE_cle-android (clé USB, cloud perso)"
echo "  - collez le contenu de $OUT dans le secret GitHub CLE_ANDROID"
