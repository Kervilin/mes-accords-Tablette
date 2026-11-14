#!/usr/bin/env bash
# ============================================================
# Génère le jeu d'icônes PWA depuis une image carrée (1024 px conseillé).
# Usage :
#   bash deploy/make-icons.sh ma-icone.png           → remplace l'icône par défaut
#   bash deploy/make-icons.sh ma-icone.png mescouleurs → crée aussi mescouleurs-512/192/apple-touch
# Nécessite ImageMagick (commande « convert »).
# ============================================================
set -euo pipefail

SRC="${1:-}"
NAME="${2:-}"

if [[ -z "$SRC" || ! -f "$SRC" ]]; then
  echo "Usage : bash deploy/make-icons.sh <image-carrée.png> [nom-de-variante]" >&2
  echo "Exemple : bash deploy/make-icons.sh assets/mon-icone.png" >&2
  exit 1
fi

if ! command -v convert >/dev/null 2>&1; then
  echo "ImageMagick est requis (commande « convert »)." >&2
  echo "Ubuntu/Debian : sudo apt install imagemagick · macOS : brew install imagemagick" >&2
  exit 1
fi

DEST="public/icons"
mkdir -p "$DEST"
TMP="$(mktemp -d)/icone-source.png"

# recadre au carré (centre), puis exporte les tailles utiles
convert "$SRC" -resize 1024x1024^ -gravity center -extent 1024x1024 -strip "$TMP"

if [[ -z "$NAME" ]]; then
  OUT512="$DEST/icon-512.png"
  OUT192="$DEST/icon-192.png"
  OUTIOS="$DEST/apple-touch-icon.png"
else
  OUT512="$DEST/$NAME-512.png"
  OUT192="$DEST/$NAME-192.png"
  OUTIOS="$DEST/$NAME-apple-touch.png"
fi

convert "$TMP" -resize 512x512 -strip -quality 84 "$OUT512"
convert "$TMP" -resize 192x192 -strip -quality 86 "$OUT192"
convert "$TMP" -resize 180x180 -strip -background "#0f141b" -flatten -quality 86 "$OUTIOS"
rm -f "$TMP"

echo "Icônes générées :"
echo "  $OUT512"
echo "  $OUT192"
echo "  $OUTIOS"
echo
echo "Étapes suivantes : npm run build · redéployer dist/ · désinstaller puis réinstaller l'appli."
