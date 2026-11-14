#!/usr/bin/env bash
# ============================================================
# Génère l'icône et l'écran de démarrage de l'APPLI ANDROID.
#
# Usage :
#   bash deploy/android-icons.sh            → VOTRE icône si assets/mon-icone.png existe,
#                                             sinon variante « Nuit »
#   bash deploy/android-icons.sh light      → variante « Papier »
#   bash deploy/android-icons.sh gold       → variante « Laiton »
#   bash deploy/android-icons.sh image.jpg  → une image précise (PNG, JPG, WEBP…)
#   bash deploy/android-icons.sh image.png "#ffffff"  → idem, avec une couleur de fond imposée
#
# Votre icône : déposez-la dans  assets/mon-icone.png  (ou .jpg / .jpeg / .webp).
# Conseils : carrée, 1024 × 1024 px idéalement (512 minimum), motif bien au centre.
# Le fond de l'icône Android et de l'écran de démarrage est déduit des coins de l'image.
#
# Nécessite ImageMagick (commande « convert »).
# À relancer chaque fois que vous changez d'icône, puis reconstruire l'APK.
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

RES="android/app/src/main/res"
[[ -d "$RES" ]] || { echo "Projet Android absent : lancez d'abord « npx cap add android »." >&2; exit 1; }
command -v convert >/dev/null || { echo "ImageMagick requis (convert)." >&2; exit 1; }

# icône personnelle déposée dans assets/ ?
PERSO=""
for f in assets/mon-icone.png assets/mon-icone.jpg assets/mon-icone.jpeg assets/mon-icone.webp; do
  [[ -f "$f" ]] && { PERSO="$f"; break; }
done

CHOICE="${1:-${PERSO:-dark}}"
BG=""
BUILTIN=0
case "$CHOICE" in
  dark)  SRC="public/icons/icon-512.png";   BG="#0f141b"; BUILTIN=1 ;;
  light) SRC="public/icons/icon-light.png"; BG="#f7f1e3"; BUILTIN=1 ;;
  gold)  SRC="public/icons/icon-gold.png";  BG="#161b22"; BUILTIN=1 ;;
  *)     SRC="$CHOICE";                     BG="${2:-}" ;;
esac
if [[ ! -s "$SRC" ]]; then
  if [[ -n "${1:-}" ]]; then echo "Image introuvable : $SRC" >&2; exit 1; fi
  echo "  ⚠ aucune image d'icône trouvée : icône Android par défaut conservée."
  exit 0
fi

# contrôle de l'image
W=$(identify -format '%w' "$SRC[0]"); H=$(identify -format '%h' "$SRC[0]")
echo "Image : $SRC (${W} × ${H} px)"
(( W < 512 || H < 512 )) && echo "  ⚠ image petite : elle risque d'être floue (1024 × 1024 px conseillé)."
R100=$(( W * 100 / H ))
(( R100 < 90 || R100 > 111 )) && echo "  ⚠ image non carrée : elle sera recadrée au centre."

# couleur de fond automatique : couleur moyenne des coins de l'image (si non imposée)
if [[ -z "$BG" ]]; then
  BG=$(convert "$SRC[0]" -resize 64x64! -alpha remove -background white \
    \( -clone 0 -crop 6x6+0+0 \) \( -clone 0 -crop 6x6+58+0 \) \
    \( -clone 0 -crop 6x6+0+58 \) \( -clone 0 -crop 6x6+58+58 \) \
    -delete 0 +append -resize 1x1! -depth 8 -format '#%[hex:p{0,0}]' info: | cut -c1-7)
  echo "  fond déduit des coins : $BG"
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# 1) source carrée 1024, coins blancs rendus transparents (si l'image en a)
convert "$SRC" -resize 1024x1024^ -gravity center -extent 1024x1024 -strip "$TMP/src.png"
CORNER=$(convert "$TMP/src.png" -format '%[fx:int(255*min(p{3,3}.r,min(p{3,3}.g,p{3,3}.b)))]' info:)
if (( BUILTIN == 1 && CORNER >= 248 )); then
  convert "$TMP/src.png" -alpha set -fuzz 8% -fill none \
    -draw "color 0,0 floodfill" -draw "color 1023,0 floodfill" \
    -draw "color 0,1023 floodfill" -draw "color 1023,1023 floodfill" "$TMP/icon.png"
else
  cp "$TMP/src.png" "$TMP/icon.png"
fi
# version « pleine » sans transparence (fond de la couleur de l'appli), pour l'icône adaptative
convert "$TMP/icon.png" -background "$BG" -flatten "$TMP/full.png"
# version ronde (centre de l'icône, découpé en cercle)
convert "$TMP/full.png" -gravity center -crop 86%x86%+0+0 +repage -resize 1024x1024 \
  \( +clone -alpha extract -fill black -colorize 100 -fill white -draw "circle 512,512 512,2" \) \
  -alpha off -compose CopyOpacity -composite "$TMP/round.png"

# 2) icônes : classiques (48dp) et premier plan adaptatif (108dp)
declare -A LEG=( [mdpi]=48 [hdpi]=72 [xhdpi]=96 [xxhdpi]=144 [xxxhdpi]=192 )
declare -A FG=(  [mdpi]=108 [hdpi]=162 [xhdpi]=216 [xxhdpi]=324 [xxxhdpi]=432 )
for d in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
  dir="$RES/mipmap-$d"; mkdir -p "$dir"
  convert "$TMP/icon.png"  -resize "${LEG[$d]}x${LEG[$d]}" -strip "$dir/ic_launcher.png"
  convert "$TMP/round.png" -resize "${LEG[$d]}x${LEG[$d]}" -strip "$dir/ic_launcher_round.png"
  # premier plan : seul le centre (~66 %) est visible dans le masque Android
  # motif réduit à 80 % sur fond uni pour ne pas toucher le bord du masque
  S80=$(( FG[$d] * 80 / 100 ))
  convert -size "${FG[$d]}x${FG[$d]}" "xc:$BG" \( "$TMP/full.png" -resize "${S80}x${S80}" \) \
    -gravity center -composite -strip "$dir/ic_launcher_foreground.png"
done

# 3) couleur de fond de l'icône adaptative
cat > "$RES/values/ic_launcher_background.xml" <<XML
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">$BG</color>
</resources>
XML

# 4) écrans de démarrage : fond de l'appli + icône au centre.
#    Tous les formats sont (re)créés : le thème Android exige @drawable/splash.
SPLASH=(
  "drawable:480x320"
  "drawable-port-mdpi:320x480"    "drawable-land-mdpi:480x320"
  "drawable-port-hdpi:480x800"    "drawable-land-hdpi:800x480"
  "drawable-port-xhdpi:720x1280"  "drawable-land-xhdpi:1280x720"
  "drawable-port-xxhdpi:960x1600" "drawable-land-xxhdpi:1600x960"
  "drawable-port-xxxhdpi:1280x1920" "drawable-land-xxxhdpi:1920x1280"
)
for e in "${SPLASH[@]}"; do
  dir="$RES/${e%%:*}"; size="${e##*:}"; W="${size%x*}"; H="${size#*x}"
  mkdir -p "$dir"
  S=$(( (W < H ? W : H) * 34 / 100 ))
  convert -size "${W}x${H}" "xc:$BG" \( "$TMP/icon.png" -resize "${S}x${S}" \) \
    -gravity center -composite -strip "$dir/splash.png"
done

echo "Icône Android « $CHOICE » générée (fond $BG) :"
echo "  - mipmap-*/ic_launcher*.png (5 densités)"
echo "  - icône adaptative (premier plan + fond)"
echo "  - écrans de démarrage ($(find "$RES" -name splash.png | wc -l) fichiers)"
echo "Ensuite : npx cap sync android, puis reconstruire l'APK."
