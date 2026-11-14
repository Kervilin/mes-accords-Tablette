#!/usr/bin/env bash
# ============================================================
# Vérifie que le dossier dist/ est un paquet PWA complet.
# Usage : bash deploy/check-pwa.sh [dossier]   (défaut : dist)
# Code retour 0 = tout est bon.
# ============================================================
set -uo pipefail
DIR="${1:-dist}"
FAIL=0
ok()   { echo "  ✔ $1"; }
bad()  { echo "  ✘ $1"; FAIL=1; }

[[ -d "$DIR" ]] || { echo "Dossier introuvable : $DIR (lance « bash deploy/prepare-icons.sh && npm run build »)"; exit 1; }

echo "Paquet : $DIR"

for f in index.html manifest.webmanifest sw.js icons/icon-512.png icons/icon-192.png icons/apple-touch-icon.png; do
  [[ -s "$DIR/$f" ]] && ok "$f" || bad "$f manquant ou vide"
done

# signature PNG (89 50 4E 47)
for f in icons/icon-512.png icons/icon-192.png icons/apple-touch-icon.png; do
  [[ -f "$DIR/$f" ]] || continue
  sig=$(head -c 4 "$DIR/$f" | od -An -tx1 | tr -d ' \n')
  [[ "$sig" == "89504e47" ]] && ok "$f est un vrai PNG" || bad "$f n'est pas un PNG valide"
done

# manifest
python3 - "$DIR" <<'PY' || FAIL=1
import json, os, sys
d = sys.argv[1]
p = os.path.join(d, "manifest.webmanifest")
try:
    m = json.load(open(p, encoding="utf8"))
except Exception as e:
    print("  ✘ manifest illisible :", e); sys.exit(1)
err = 0
if m.get("display") not in ("fullscreen", "standalone", "minimal-ui"):
    print("  ✘ display doit être fullscreen/standalone/minimal-ui (lu :", m.get("display"), ")"); err = 1
else:
    print("  ✔ display =", m.get("display"))
if not m.get("start_url"):
    print("  ✘ start_url manquant"); err = 1
else:
    print("  ✔ start_url =", m.get("start_url"))
icons = m.get("icons") or []
if not any(i.get("sizes") == "512x512" for i in icons) or not any(i.get("sizes") == "192x192" for i in icons):
    print("  ✘ icônes 192 et 512 requises"); err = 1
else:
    print("  ✔ icônes 192/512 déclarées")
for i in icons:
    src = i.get("src", "").lstrip("./")
    if not os.path.exists(os.path.join(d, src)):
        print("  ✘ icône déclarée absente du dossier :", src); err = 1
sys.exit(err)
PY

# index : détection build compilé
if grep -q 'src="/src/main.tsx"' "$DIR/index.html"; then
  bad "index.html n'est pas compilé (lance npm run build)"
else
  ok "index.html compilé (fichier unique)"
fi

# lien manifest dans le HTML
grep -q 'rel="manifest"' "$DIR/index.html" && ok "lien vers le manifest" || bad "lien manifest absent de index.html"

echo
[[ $FAIL -eq 0 ]] && echo "Tout est prêt : déploie le dossier $DIR (Netlify Drop, Vercel…)." || echo "Corrige les lignes ✘ avant de déployer."
exit $FAIL
