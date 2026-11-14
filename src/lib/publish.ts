/* ============================================================
   Générateur de ZIP minimal (méthode « store », sans compression)
   Permet à l'appli de fabriquer elle-même le paquet PWA prêt à
   publier, avec l'icône choisie. Aucune dépendance externe.
   ============================================================ */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(d = new Date()): { time: number; date: number } {
  const time = ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | ((d.getSeconds() / 2) & 31);
  const date = (((d.getFullYear() - 1980) & 127) << 9) | (((d.getMonth() + 1) & 15) << 5) | (d.getDate() & 31);
  return { time, date };
}

class Writer {
  private chunks: Uint8Array<ArrayBuffer>[] = [];
  length = 0;
  push(b: Uint8Array<ArrayBuffer>) {
    this.chunks.push(b);
    this.length += b.length;
  }
  u16(n: number) {
    const b = new Uint8Array(new ArrayBuffer(2));
    b[0] = n & 0xff;
    b[1] = (n >>> 8) & 0xff;
    this.push(b);
  }
  u32(n: number) {
    const b = new Uint8Array(new ArrayBuffer(4));
    b[0] = n & 0xff;
    b[1] = (n >>> 8) & 0xff;
    b[2] = (n >>> 16) & 0xff;
    b[3] = (n >>> 24) & 0xff;
    this.push(b);
  }
  bytes(): Uint8Array<ArrayBuffer> {
    const out = new Uint8Array(new ArrayBuffer(this.length));
    let o = 0;
    for (const c of this.chunks) {
      out.set(c, o);
      o += c.length;
    }
    return out;
  }
}

export type ZipEntry = { name: string; data: Uint8Array | string };

const enc = new TextEncoder();

export function makeZip(entries: ZipEntry[]): Blob {
  const { time, date } = dosDateTime();
  const local = new Writer();
  const central = new Writer();

  for (const entry of entries) {
    const nameBytes = enc.encode(entry.name.replace(/\\/g, "/")) as Uint8Array<ArrayBuffer>;
    const data =
      typeof entry.data === "string"
        ? (enc.encode(entry.data) as Uint8Array<ArrayBuffer>)
        : (entry.data as Uint8Array<ArrayBuffer>);
    const crc = crc32(data);
    const offset = local.length;

    local.u32(0x04034b50);
    local.u16(20);
    local.u16(0x0800); // noms UTF-8
    local.u16(0); // store (sans compression)
    local.u16(time);
    local.u16(date);
    local.u32(crc);
    local.u32(data.length);
    local.u32(data.length);
    local.u16(nameBytes.length);
    local.u16(0);
    local.push(nameBytes);
    local.push(data);

    central.u32(0x02014b50);
    central.u16(20);
    central.u16(20);
    central.u16(0x0800);
    central.u16(0);
    central.u16(time);
    central.u16(date);
    central.u32(crc);
    central.u32(data.length);
    central.u32(data.length);
    central.u16(nameBytes.length);
    central.u16(0);
    central.u16(0);
    central.u16(0);
    central.u16(0);
    central.u32(0);
    central.u32(offset);
    central.push(nameBytes);
  }

  const localBytes = local.bytes();
  const centralBytes = central.bytes();
  const end = new Writer();
  end.u32(0x06054b50);
  end.u16(0);
  end.u16(0);
  end.u16(entries.length);
  end.u16(entries.length);
  end.u32(centralBytes.length);
  end.u32(localBytes.length);
  end.u16(0);

  return new Blob([localBytes, centralBytes, end.bytes()], { type: "application/zip" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 8000);
}

/* ---------- Manifest généré pour la variante d'icône choisie ---------- */
export type IconVariant = "dark" | "light" | "gold";

export const ICON_META: Record<
  IconVariant,
  { name: string; theme: string; background: string; files: { png: string; apple: string } }
> = {
  dark: { name: "Nuit", theme: "#0f141b", background: "#0f141b", files: { png: "icon", apple: "apple-touch-icon" } },
  light: { name: "Papier", theme: "#f7f1e3", background: "#f7f1e3", files: { png: "light", apple: "light-apple-touch" } },
  gold: { name: "Laiton", theme: "#161b22", background: "#161b22", files: { png: "gold", apple: "gold-apple-touch" } },
};

export function manifestFor(variant: IconVariant): string {
  const meta = ICON_META[variant];
  return JSON.stringify(
    {
      name: "Mes accords — accordéon diatonique",
      short_name: "Mes accords",
      description:
        "Visualiseur d'accords et éditeur de clavier pour accordéon diatonique : basses, poussé/tiré, CSV et accordage au micro.",
      lang: "fr",
      dir: "ltr",
      id: "./",
      start_url: "./",
      scope: "./",
      display: "fullscreen",
      display_override: ["fullscreen", "standalone", "minimal-ui"],
      orientation: "any",
      background_color: meta.background,
      theme_color: meta.theme,
      categories: ["music", "utilities", "education"],
      icons: [
        { src: "./icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "./icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "./icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
      shortcuts: [
        {
          name: "Éditer mon clavier",
          short_name: "Éditer",
          url: "./?action=edit",
        },
      ],
    },
    null,
    2,
  );
}

const README = `MES ACCORDS — paquet prêt à publier (PWA)
=========================================

Ce dossier contient :
  index.html            l'application complète
  manifest.webmanifest  nom, icône, mode plein écran
  sw.js                 fonctionnement hors-ligne
  icons/                icônes 192 / 512 / iOS

PUBLIER (5 minutes, gratuit)
----------------------------
1. Ouvrir https://app.netlify.com/drop
2. Glisser CE DOSSIER (ou ce fichier ZIP) dans la page.
3. Noter l'adresse https://....netlify.app affichée.

INSTALLER SUR LE TÉLÉPHONE
--------------------------
Android : ouvrir l'adresse dans Chrome > menu ⋮ > « Installer l'application »
iPhone  : ouvrir l'adresse dans Safari > Partager > « Sur l'écran d'accueil »

Lancer ensuite l'application DEPUIS SON ICÔNE : elle s'ouvre en plein écran.

CHANGER D'ICÔNE
---------------
Changer l'icône dans l'application, retélécharger ce paquet, glisser le
nouveau dossier sur Netlify (même site, « Deploy manually »), puis
désinstaller et réinstaller l'application sur le téléphone.

Plus d'aide : deploy/PROCEDURE-PWA.md dans le projet.
`;

export type ZipProgress = (label: string) => void;

/** Assemble le paquet PWA complet, avec l'icône choisie. */
export async function buildPublishZip(variant: IconVariant, onStep?: ZipProgress): Promise<Blob> {
  const meta = ICON_META[variant];
  const entries: ZipEntry[] = [];

  const get = async (path: string, label: string): Promise<Uint8Array> => {
    onStep?.(label);
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`${path} introuvable (${res.status})`);
    return new Uint8Array(await res.arrayBuffer());
  };

  const index = await get("./index.html", "Application…");
  const idxText = new TextDecoder().decode(index);
  // Détection de la version « dev » (Vite non compilé). Le marqueur est assemblé
  // à l'exécution pour ne pas apparaître lui-même dans le bundle de production.
  const devMarkers = [["/src/", "main", ".tsx"].join(""), ['src="/src/', 'main.tsx"'].join("")];
  if (devMarkers.some((m) => idxText.includes(m))) {
    throw new Error(
      "Cette page est la version de développement. Ouvre la version publiée (build) puis réessaie.",
    );
  }

  entries.push({ name: "index.html", data: index });
  entries.push({ name: "manifest.webmanifest", data: manifestFor(variant) });
  entries.push({ name: "sw.js", data: await get("./sw.js", "Hors-ligne…") });
  entries.push({ name: ".nojekyll", data: "" });
  entries.push({ name: "LISEZ-MOI.txt", data: README });
  try {
    entries.push({
      name: "guide-installation.html",
      data: await get("./guide-installation.html", "Guide…"),
    });
  } catch {
    /* guide optionnel : le paquet reste valide sans lui */
  }

  entries.push({
    name: "icons/icon-512.png",
    data: await get(`./icons/${meta.files.png}-512.png`, "Icône 512…"),
  });
  entries.push({
    name: "icons/icon-192.png",
    data: await get(`./icons/${meta.files.png}-192.png`, "Icône 192…"),
  });
  entries.push({
    name: "icons/apple-touch-icon.png",
    data: await get(`./icons/${meta.files.apple}.png`, "Icône iOS…"),
  });

  onStep?.("Compression…");
  return makeZip(entries);
}
