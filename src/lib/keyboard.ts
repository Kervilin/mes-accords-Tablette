/* ============================================================
   Clavier : modèle par défaut, grille physique (12 / 11 / 10 à droite,
   6 × 3 à gauche), CSV et stockage local
   ============================================================ */
import { LT, NP, pcOf, type Btn, type KB, type LBtn } from "./music";

/** 3 rangées main droite — [poussé, tiré] par bouton (MIDI) */
const D: [number[], number[]][] = [
  [
    [44, 50, 55, 59, 62, 67, 71, 74, 79, 83, 86],
    [52, 54, 57, 60, 64, 66, 69, 72, 76, 78, 81],
  ],
  [
    [52, 55, 60, 64, 67, 72, 76, 79, 84, 88],
    [53, 59, 62, 65, 69, 71, 74, 77, 81, 83],
  ],
  [
    [63, 69, 68, 75, 80],
    [61, 67, 70, 73, 82],
  ],
];
/** décalage vertical du clavier d'usine par rangée */
export const OFF = [0, 0.57, 3.05];

/**
 * Grille physique maximale de la main droite :
 * - r = 0 (rangée 1, x = 2) : maxi 12 touches, u = 0 .. 11
 * - r = 1 (rangée 2, x = 1) : maxi 11 touches, u = 0.57 .. 10.57
 * - r = 2 (rangée 3, x = 0) : maxi 10 touches, u = 1.05 (milieu 1'-2') .. 10.05 (milieu 10'-11')
 */
export const RIGHT_GRID: { r: number; x: number; maxSlots: number; u0: number }[] = [
  { r: 0, x: 2, maxSlots: 12, u0: 0 },
  { r: 1, x: 1, maxSlots: 11, u0: 0.57 },
  { r: 2, x: 0, maxSlots: 10, u0: 1.05 },
];

/** Grille physique maximale de la main gauche : 3 colonnes (j = 0, 1, 2 vers l'intérieur) × 6 touches (i = 0..5) */
export const LEFT_MAX_ROWS = 6;
export const LEFT_MAX_COLS = 3;

/** 6 lignes de basses d'usine (2 colonnes j = 0, 1) */
const L = [
  ["C G", "F F"],
  ["c g", "f f"],
  ["G D", "E A"],
  ["g d", "e a"],
  ["Eb Bb", "G# B"],
  ["eb bb", "g# b"],
];

const lpSafe = (s: string) =>
  (((NP[s[0].toUpperCase()] ?? 0) + (s[1] === "#" ? 1 : s[1] === "b" ? -1 : 0)) % 12 + 12) % 12;

export function defKB(): KB {
  const b: Btn[] = [];
  const l: LBtn[] = [];
  D.forEach(([P, Q], r) =>
    P.forEach((p, i) => b.push({ r, n: i + 1, m: [p, Q[i]], x: 2 - r, u: i + OFF[r] })),
  );
  L.forEach((row, i) =>
    row.forEach((s, j) => {
      const t = s.split(" ");
      l.push({
        i,
        j,
        n: 6 - i,
        lab: [t[0], t[1]],
        up: t[0][0] === t[0][0].toUpperCase(),
        k: [lpSafe(t[0]), lpSafe(t[1])],
      });
    }),
  );
  return { b, l };
}

export type RightSlot = { r: number; x: number; slot: number; u: number };
export type LeftSlot = { j: number; i: number; n: number; up: boolean };

/** Retourne les 33 emplacements physiques (12 + 11 + 10) de la main droite. */
export function allRightGridSlots(): RightSlot[] {
  const out: RightSlot[] = [];
  for (const cfg of RIGHT_GRID) {
    for (let slot = 0; slot < cfg.maxSlots; slot++) {
      const u = Math.round((cfg.u0 + slot) * 100) / 100;
      out.push({ r: cfg.r, x: cfg.x, slot, u });
    }
  }
  return out;
}

/** Retourne les 18 emplacements physiques (3 colonnes × 6 touches) de la main gauche. */
export function allLeftGridSlots(): LeftSlot[] {
  const out: LeftSlot[] = [];
  for (let j = 0; j < LEFT_MAX_COLS; j++) {
    for (let i = 0; i < LEFT_MAX_ROWS; i++) {
      out.push({ j, i, n: LEFT_MAX_ROWS - i, up: i % 2 === 0 });
    }
  }
  return out;
}

/** Trouve l'indice `slot` (0..maxSlots-1) d'un bouton droit sur sa rangée. */
export function rightSlotIndex(r: number, u: number): number {
  const cfg = RIGHT_GRID.find((c) => c.r === r) ?? RIGHT_GRID[0];
  const s = Math.round(u - cfg.u0);
  return Math.max(0, Math.min(cfg.maxSlots - 1, s));
}

/**
 * Nettoie et normalise un clavier selon la règle :
 * « Quand une touche n'a aucune note elle disparaît SAUF si elle est située entre 2 touches ».
 * - À droite : dans chaque rangée (r = 0, 1, 2), seules les touches ayant au moins une note
 *   définissent le début (`minSlot`) et la fin (`maxSlot`) de la rangée. Les touches sans aucune note
 *   en dehors de `[minSlot, maxSlot]` disparaissent ; celles situées entre `minSlot` et `maxSlot`
 *   sont conservées avec leur numéro `n` pour ne pas décaler la rangée.
 * - À gauche : dans chaque colonne (j = 0, 1, 2), les touches sans note en dehors des touches
 *   renseignées disparaissent ; celles situées entre deux touches renseignées restent en place.
 */
export function normalizeKB(kb: KB): KB {
  const bOut: Btn[] = [];
  for (const cfg of RIGHT_GRID) {
    const col = kb.b.filter((b) => b.r === cfg.r || b.x === cfg.x);
    const bySlot = new Map<number, Btn>();
    col.forEach((b) => {
      const s = rightSlotIndex(cfg.r, b.u);
      bySlot.set(s, b);
    });
    const activeSlots = [...bySlot.entries()]
      .filter(([, b]) => b.m[0] > 0 || b.m[1] > 0)
      .map(([s]) => s)
      .sort((a, b) => a - b);

    if (!activeSlots.length) continue;
    const minS = activeSlots[0];
    const maxS = activeSlots[activeSlots.length - 1];

    for (let s = minS; s <= maxS; s++) {
      const u = Math.round((cfg.u0 + s) * 100) / 100;
      const n = s - minS + 1;
      const existing = bySlot.get(s);
      bOut.push({
        r: cfg.r,
        x: cfg.x,
        n,
        u,
        m: existing ? [existing.m[0], existing.m[1]] : [0, 0],
      });
    }
  }

  const lOut: LBtn[] = [];
  for (let j = 0; j < LEFT_MAX_COLS; j++) {
    const col = kb.l.filter((l) => l.j === j && l.i >= 0 && l.i < LEFT_MAX_ROWS);
    const byI = new Map<number, LBtn>();
    col.forEach((l) => byI.set(l.i, l));
    const activeIs = [...byI.entries()]
      .filter(([, l]) => l.k[0] >= 0 || l.k[1] >= 0)
      .map(([i]) => i)
      .sort((a, b) => a - b);

    if (!activeIs.length) continue;
    const minI = activeIs[0];
    const maxI = activeIs[activeIs.length - 1];

    for (let i = minI; i <= maxI; i++) {
      const existing = byI.get(i);
      const up = i % 2 === 0;
      lOut.push({
        i,
        j,
        n: LEFT_MAX_ROWS - i,
        up,
        lab: existing ? existing.lab : ["?", "?"],
        k: existing ? existing.k : [-1, -1],
      });
    }
  }

  return { b: bOut, l: lOut };
}

export function geom(kb: KB, editing = false) {
  if (editing) {
    return {
      maxU: 11,
      minU: 0,
      xmax: 2,
      jmax: LEFT_MAX_COLS - 1, // 3 colonnes (j = 0, 1, 2) en édition
      rows: LEFT_MAX_ROWS,     // 6 touches maxi par colonne
    };
  }
  const maxU = kb.b.length ? Math.max(...kb.b.map((x) => x.u)) : 10;
  const minU = kb.b.length ? Math.min(0, ...kb.b.map((x) => x.u)) : 0;
  const xmax = kb.b.length ? Math.max(2, ...kb.b.map((x) => x.x)) : 2;
  const activeLeftCols = kb.l.filter((x) => x.k[0] >= 0 || x.k[1] >= 0).map((x) => x.j);
  const jmax = activeLeftCols.length ? Math.max(1, ...activeLeftCols) : 1;
  const rows = kb.l.length ? Math.min(LEFT_MAX_ROWS, Math.max(...kb.l.map((x) => x.i)) + 1) : LEFT_MAX_ROWS;
  return { maxU, minU, xmax, jmax, rows };
}

/** Mesures du dessin du clavier (optimisées mobile). */
/** taille minimale d'un pas de bouton (px) */
export const MIN_U = 22;

/** Mesures du dessin pour un pas de bouton U donné. */
function measure(g: ReturnType<typeof geom>, U: number) {
  const Dm = Math.round(U * 0.9);
  const W0 = g.jmax * U + Dm;
  const Wr = g.xmax * U + Dm;
  const spanU = g.maxU - g.minU;
  const Hr = Math.round(spanU * U + Dm);
  const Cd = Math.round(Math.min(W0 * 0.95, (U + Dm) * 0.95));
  const lt = Math.max(Math.round(((spanU - (g.rows - 1)) * U) / 2), Cd + 14);
  const Hl = (g.rows - 1) * U + Dm;
  // joystick sous la colonne gauche : 2 × la taille d'un bouton
  const joyH = Math.max(64, Math.round(Dm * 2) + 12);
  const Hc = Math.max(Hr, lt + Hl + joyH + 10);
  return { U, Dm, W0, Wr, Hr, Cd, lt, Hl, Hc, joyH };
}

export type LayoutOpts = {
  /** hauteur disponible (px) : le clavier est réduit pour y tenir (mode automatique) */
  maxH?: number;
  /** taille choisie par l'utilisateur (pincement), en fraction de la taille « pleine largeur » */
  zoom?: number | null;
};

/**
 * Mesures du dessin du clavier.
 * - Uw : taille maximale permise par la largeur ;
 * - automatique : la plus grande taille qui tient aussi en hauteur (maxH) ;
 * - zoom : taille choisie au pincement (fraction de Uw).
 */
export function layout(kb: KB, width: number, editing = false, opts: LayoutOpts = {}) {
  const g = geom(kb, editing);
  const fac = g.jmax + g.xmax + 2.35;
  const Uw = Math.max(MIN_U, Math.min(110, Math.floor((width - 4) / fac)));
  let U = Uw;
  if (opts.zoom != null && Number.isFinite(opts.zoom)) {
    U = Math.max(MIN_U, Math.min(Uw, Math.round(Uw * opts.zoom)));
  } else if (opts.maxH && opts.maxH > 0) {
    while (U > MIN_U && measure(g, U).Hc > opts.maxH) U--;
  }
  return { g, Uw, auto: opts.zoom == null, ...measure(g, U) };
}

/* ---------- CSV (supporte les claviers complets ET en cours, et la 3e rangée de basses) ---------- */
const nn = (p: number) => LT[pcOf(p)] + (Math.floor(p / 12) - 1);

export function toCSV(rawKB: KB): string {
  const kb = normalizeKB(rawKB);
  const { b: B, l: LB } = kb;
  const nR = 3;
  const maxLeftJ = LB.length ? Math.max(1, ...LB.map((x) => x.j)) : 1;
  const nL = Math.max(2, maxLeftJ + 1);
  const rows = Math.max(12, ...B.map((x) => x.n), ...LB.map((x) => x.n));
  const rep = (a: string, n: number) => Array(n).fill(a) as string[];
  const offc = [...Array(nR).keys()].map((k) => {
    const col = B.filter((x) => x.x === k).sort((a, b) => a.n - b.n);
    const bb = col[0];
    return bb ? (Math.round((bb.u - (bb.n - 1)) * 100) / 100 + "").replace(".", ",") : "";
  });
  const out: string[][] = [
    ["", ...rep("P", nL + nR), ...rep("T", nL + nR)],
    ["", ...rep("G", nL), ...rep("D", nR), ...rep("G", nL), ...rep("D", nR)],
    ["Décalage", ...rep("", nL), ...offc, ...rep("", nL), ...offc],
  ];
  for (let n = rows; n >= 1; n--) {
    const c = [String(n)];
    ([0, 1] as const).forEach((d) => {
      for (let j = 0; j < nL; j++) {
        const l = LB.find((x) => x.j === j && x.n === n);
        if (!l || (l.k[0] < 0 && l.k[1] < 0)) {
          c.push("");
        } else {
          const valid = l.k[d] >= 0 && l.lab[d] && l.lab[d] !== "?" && l.lab[d] !== "∅" && l.lab[d] !== "—";
          c.push(valid ? l.lab[d] : "?");
        }
      }
      for (let k = 0; k < nR; k++) {
        const bb = B.find((x) => x.x === k && x.n === n);
        if (!bb || (bb.m[0] <= 0 && bb.m[1] <= 0)) {
          c.push("");
        } else {
          c.push(bb.m[d] > 0 ? nn(bb.m[d]) : "?");
        }
      }
    });
    out.push(c);
  }
  return "\ufeff" + out.map((r) => r.join(";")).join("\r\n") + "\r\n";
}

type PNote = { pc: number; oct: number | null; up: boolean };
function pnote2(s: string): PNote | null {
  const m = /^([A-Ga-g])([#b]?)(-?\d+)?$/.exec((s || "").trim());
  if (!m) return null;
  return {
    pc: (((NP[m[1].toUpperCase()] ?? 0) + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0)) % 12 + 12) % 12,
    oct: m[3] === undefined ? null : +m[3],
    up: m[1] === m[1].toUpperCase(),
  };
}
const isEmptySlot = (s: string) => {
  const t = (s || "").trim();
  return t === "" || t === "?" || t === "∅" || t === "—";
};

export type Parsed = { b: Btn[]; l: LBtn[]; warn?: boolean } | { err: string[] };

export function parseCSV(txt: string): Parsed {
  try {
    const er: string[] = [];
    const lines = txt
      .replace(/^\ufeff/, "")
      .split(/\r?\n/)
      .filter((l) => l.replace(/[;,\s]/g, "") !== "" || /^\s*\d+[;,]/.test(l));
    if (lines.length < 3) return { err: ["Fichier trop court."] };
    const dl = lines[0].split(";").length >= lines[0].split(",")!.length ? ";" : ",";
    const row = (l: string) => l.split(dl).map((s) => s.trim());
    const h1 = row(lines[0]);
    const h2 = row(lines[1]);
    const cols: { c: number; d: number; h: string }[] = [];
    for (let c = 1; c < h1.length; c++) {
      const a = (h1[c] || "").toUpperCase();
      const h = (h2[c] || "").toUpperCase();
      if ((a === "P" || a === "T") && (h === "G" || h === "D")) cols.push({ c, d: a === "T" ? 1 : 0, h });
    }
    const pick = (d: number, h: string) => cols.filter((x) => x.d === d && x.h === h);
    const gP = pick(0, "G");
    const gT = pick(1, "G");
    const dP = pick(0, "D");
    const dT = pick(1, "D");
    if (!dP.length || dP.length !== dT.length || gP.length !== gT.length)
      return { err: ["Colonnes P/T et G/D incohérentes."] };

    let i0 = 2;
    let offs: number[] = [];
    const o3 = row(lines[2]);
    if (o3[0] !== "" && isNaN(+o3[0])) {
      i0 = 3;
      offs = dP.map((x) => parseFloat((o3[x.c] || "").replace(",", ".")));
    }
    const nR = Math.min(3, dP.length);

    type R = { n: number; k: number; p: [PNote | null, PNote | null]; m: [number, number] };
    const Rr: R[] = [];
    const Lf: {
      n: number;
      j: number;
      lab: [string, string];
      up: boolean | null;
      k: [number, number];
    }[] = [];

    for (const ln of lines.slice(i0)) {
      const c = row(ln);
      const n = parseInt(c[0]);
      if (isNaN(n)) continue;
      dP.slice(0, 3).forEach((x, k) => {
        const a = (c[x.c] || "").trim();
        const b = (c[dT[k].c] || "").trim();
        if (!a && !b) return;
        const pa = isEmptySlot(a) ? null : pnote2(a);
        const pb = isEmptySlot(b) ? null : pnote2(b);
        if ((!isEmptySlot(a) && !pa) || (!isEmptySlot(b) && !pb)) {
          er.push(`Ligne ${n} : note droite illisible (${a || b}).`);
          return;
        }
        if (!pa && !pb) return;
        Rr.push({ n, k, p: [pa, pb], m: [0, 0] });
      });
      gP.slice(0, LEFT_MAX_COLS).forEach((x, k) => {
        const a = (c[x.c] || "").trim();
        const b = (c[gT[k].c] || "").trim();
        if (!a && !b) return;
        const pa = isEmptySlot(a) ? null : pnote2(a);
        const pb = isEmptySlot(b) ? null : pnote2(b);
        if ((!isEmptySlot(a) && (!pa || pa.oct !== null)) || (!isEmptySlot(b) && (!pb || pb.oct !== null))) {
          er.push(`Ligne ${n} : bouton gauche illisible (${a || b}).`);
          return;
        }
        if (!pa && !pb) return;
        Lf.push({
          n,
          j: k,
          lab: [pa ? a : "?", pb ? b : "?"],
          up: pa ? pa.up : pb ? pb.up : null,
          k: [pa ? pa.pc : -1, pb ? pb.pc : -1],
        });
      });
    }
    if (er.length) return { err: er.slice(0, 4) };
    if (!Rr.length && !Lf.length) return { err: ["Aucun bouton trouvé."] };

    let warn = false;
    const REF = [
      [44, 52, 63],
      [52, 53, 61],
    ];
    const b2: Btn[] = [];
    for (let k = 0; k < nR; k++) {
      const r = nR - 1 - k;
      const items = Rr.filter((x) => x.k === k).sort((a, b) => a.n - b.n);
      ([0, 1] as const).forEach((d) => {
        let prev: number | null = null;
        items.forEach((it) => {
          const q = it.p[d];
          if (!q) {
            it.m[d] = 0;
            return;
          }
          let p: number;
          if (q.oct !== null) {
            p = 12 * (q.oct + 1) + q.pc;
          } else {
            warn = true;
            if (prev === null) {
              const ref = REF[d][r] ?? 52;
              let dd = (((q.pc - pcOf(ref)) % 12) + 12) % 12;
              if (dd > 6) dd -= 12;
              p = ref + dd;
            } else {
              p = prev + ((((q.pc - pcOf(prev) - 1) % 12) + 12) % 12) + 1;
            }
          }
          prev = p;
          it.m[d] = p;
        });
      });
      items.forEach((it) =>
        b2.push({
          r,
          n: it.n,
          m: it.m,
          x: k,
          u: it.n - 1 + (Number.isFinite(offs[k]) ? offs[k] : (OFF[r] ?? 0)),
        }),
      );
    }
    const lm = Lf.length ? Math.max(LEFT_MAX_ROWS, ...Lf.map((x) => x.n)) : LEFT_MAX_ROWS;
    const rawL: LBtn[] = Lf.map((x) => {
      const i = Math.max(0, Math.min(LEFT_MAX_ROWS - 1, lm - x.n));
      return {
        i,
        j: x.j,
        n: LEFT_MAX_ROWS - i,
        lab: x.lab,
        up: x.up !== null ? x.up : i % 2 === 0,
        k: x.k,
      };
    });
    const norm = normalizeKB({ b: b2, l: rawL });
    return { b: norm.b, l: norm.l, warn };
  } catch {
    return { err: ["Fichier illisible."] };
  }
}

/* ---------- Stockage (mêmes clés que l'appli d'origine) ---------- */
const K_LIST = "mac_kbs";
const K_NAME = "mac_kb_name";
const K_RANGE = "mac_range";
const K_THEME = "mac_theme";
const kKB = (n: string) => "mac_kb_" + n;

export type Range = { lo: number; hi: number; tol: number };

export function loadList(): string[] {
  try {
    const r = JSON.parse(localStorage.getItem(K_LIST) || "null");
    if (r && Array.isArray(r.list)) return r.list as string[];
  } catch {}
  return [];
}
export function saveList(list: string[]) {
  try {
    localStorage.setItem(K_LIST, JSON.stringify({ list }));
  } catch {}
}
export function readKB(name: string): KB | null {
  try {
    const t = localStorage.getItem(kKB(name));
    if (!t) return null;
    const r = parseCSV(t);
    if ("err" in r) return null;
    return { b: r.b, l: r.l };
  } catch {
    return null;
  }
}
export function writeKB(name: string, txt: string, list: string[]) {
  try {
    localStorage.setItem(kKB(name), txt);
  } catch {}
  const next = list.includes(name) ? list : [...list, name];
  saveList(next);
  try {
    localStorage.setItem(K_NAME, name);
  } catch {}
  return next;
}
export function delKB(name: string, list: string[]) {
  try {
    localStorage.removeItem(kKB(name));
  } catch {}
  const next = list.filter((x) => x !== name);
  saveList(next);
  return next;
}
export function curName(): string | null {
  try {
    return localStorage.getItem(K_NAME);
  } catch {
    return null;
  }
}
export function loadRange(): Range {
  const R: Range = { lo: 36, hi: 108, tol: 50 };
  try {
    const r = JSON.parse(localStorage.getItem(K_RANGE) || "null");
    if (r && typeof r.lo === "number" && typeof r.hi === "number") {
      R.lo = r.lo;
      R.hi = r.hi;
      R.tol = typeof r.tol === "number" ? r.tol : 50;
    }
  } catch {}
  return R;
}
export function saveRange(r: Range) {
  try {
    localStorage.setItem(K_RANGE, JSON.stringify(r));
  } catch {}
}
/* Option « Tierces » (accords de gauche à 3 notes) : mémorisée */
export const K_TIERCES = "mac_tierces";
export function loadTierces(): boolean {
  try {
    return localStorage.getItem(K_TIERCES) === "1";
  } catch {
    return false;
  }
}
export function saveTierces(on: boolean) {
  try {
    localStorage.setItem(K_TIERCES, on ? "1" : "0");
  } catch {}
}
export function loadTheme(): "dark" | "light" {
  try {
    const t = localStorage.getItem(K_THEME);
    if (t === "light" || t === "dark") return t;
  } catch {}
  if (typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: light)").matches) return "light";
  return "dark";
}
export function saveTheme(t: "dark" | "light") {
  try {
    localStorage.setItem(K_THEME, t);
  } catch {}
  document.documentElement.dataset.theme = t;
}

export function downloadCSV(txt: string, filename = "clavier.csv") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([txt], { type: "text/csv;charset=utf-8" }));
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
