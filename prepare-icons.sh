#!/usr/bin/env bash
# ============================================================
# Régénère les icônes de la version web (PWA) depuis les 3 images d'origine :
#   public/icons/icon-512.png   → variante Nuit   (source et icône 512)
#   public/icons/icon-light.png → variante Papier
#   public/icons/icon-gold.png  → variante Laiton
# Génère : icon-192, icon-512, apple-touch-icon, light-*, gold-*.
# Sans ImageMagick ou sans les images, les icônes existantes sont conservées.
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."
DEST="public/icons"

for f in "$DEST/icon-512.png" "$DEST/icon-light.png" "$DEST/icon-gold.png"; do
  if [[ ! -s "$f" ]]; then
    echo "  ⚠ $f absent : icônes web existantes conservées."
    exit 0
  fi
done
if ! command -v convert >/dev/null 2>&1; then
  echo "  ⚠ ImageMagick absent : icônes web existantes conservées."
  exit 0
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cp "$DEST/icon-512.png"   "$TMP/dark.png"
cp "$DEST/icon-light.png" "$TMP/light.png"
cp "$DEST/icon-gold.png"  "$TMP/gold.png"

gen() {
  local src="$1" base="$2" ios="$3"
  convert "$src" -resize 512x512 -colors 200 -depth 8 -strip "$DEST/$base-512.png"
  convert "$src" -resize 192x192 -colors 160 -depth 8 -strip "$DEST/$base-192.png"
  convert "$src" -resize 180x180 -colors 160 -depth 8 -strip -background "#0f141b" -flatten "$DEST/$ios.png"
}
gen "$TMP/dark.png"  "icon"  "apple-touch-icon"
gen "$TMP/light.png" "light" "light-apple-touch"
gen "$TMP/gold.png"  "gold"  "gold-apple-touch"
echo "Icônes web régénérées ✔"
