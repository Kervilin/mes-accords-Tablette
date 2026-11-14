/* ============================================================
   Théorie musicale + modèle de vue du clavier
   (logique reprise de l'appli d'origine, typée et purifiée)
   ============================================================ */

export type Btn = { r: number; n: number; m: [number, number]; x: number; u: number };
export type LBtn = {
  i: number;
  j: number;
  n: number;
  lab: [string, string];
  up: boolean;
  k: [number, number];
  q5?: boolean;
};
export type KB = { b: Btn[]; l: LBtn[] };
export type Geo = { maxU: number; xmax: number; jmax: number; rows: number };

export const N = ["Do", "Do#", "Ré", "Mib", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "Sib", "Si"];
export const LT = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B"];
export const NP: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const FR: Record<string, number> = { do: 0, re: 2, mi: 4, fa: 5, sol: 7, la: 9, si: 11 };

export const nm = (s: string) => s.replace(/b$/, "♭");
export const pn = (p: number) => nm(N[((p % 12) + 12) % 12]);
/** label français avec ♭ (utilisé pour les basses) */
export const ld = (s: string) => (s.length > 1 && s[1] === "b" ? s[0] + "♭" : s);
/** label → classe de hauteur */
export const lp = (s: string) =>
  (((NP[s[0].toUpperCase()] ?? 0) + (s[1] === "#" ? 1 : s[1] === "b" ? -1 : 0)) % 12 + 12) % 12;

export const pcOf = (m: number) => ((m % 12) + 12) % 12;
export const midiToNote = (m: number) => ({ pc: pcOf(m), oct: Math.floor(m / 12) - 1 });
export const noteToMidi = (pc: number, oct: number) => 12 * (oct + 1) + pc;
export const freqToMidi = (f: number) => 69 + 12 * Math.log2(f / 440);

/** « G#5 », « Bb3 », « Sol#4 », « do2 »… → {pc, oct} */
export function parseNoteInput(raw: string): { pc: number; oct: number } | null {
  if (!raw) return null;
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/♯/g, "#")
    .replace(/♭/g, "b")
    .replace(/\s+/g, "");
  let m = /^([a-g])([#b]?)(-?\d+)$/.exec(s);
  if (m) {
    const base = NP[m[1].toUpperCase()];
    const alt = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
    return { pc: pcOf(base + alt), oct: +m[3] };
  }
  m = /^(do|re|mi|fa|sol|la|si)(#|b)?(-?\d+)$/.exec(s);
  if (m) {
    const base = FR[m[1]];
    const alt = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
    return { pc: pcOf(base + alt), oct: +m[3] };
  }
  return null;
}

/* ---------- Accords ---------- */
export const MAIN: [string, string][] = [
  ["par", "Parfait"],
  ["s7", "7"],
  ["s9", "9"],
];
export const OTH: [string, string][] = [
  ["q5", "5"],
  ["sus2", "sus2"],
  ["sus4", "sus4"],
  ["s6", "6"],
  ["s7M", "7M"],
  ["a9", "add9"],
];
export const SUF: Record<string, string> = {
  par: "",
  q5: "5",
  sus2: "sus2",
  sus4: "sus4",
  s6: "6",
  s7: "7",
  s7M: "7M",
  s9: "9",
  a9: "add9",
};
/** intervalles des notes « ajoutées » (italique rouge) par type d'accord */
export const Q4I: Record<string, number[]> = {
  par: [],
  q5: [],
  sus2: [],
  sus4: [],
  s6: [9],
  s7: [10],
  s7M: [11],
  s9: [10, 14],
  a9: [14],
};
/** accords sans tierce → le segment majeur/mineur est inopérant */
export const isSym = (enr: string) => ["q5", "sus2", "sus4"].includes(enr);
export function intervals(enr: string, t: number): number[] {
  switch (enr) {
    case "par":
      return [0, t, 7];
    case "q5":
      return [0, 7];
    case "sus2":
      return [0, 2, 7];
    case "sus4":
      return [0, 5, 7];
    case "s6":
      return [0, t, 7, 9];
    case "s7":
      return [0, t, 7, 10];
    case "s7M":
      return [0, t, 7, 11];
    case "s9":
      return [0, t, 7, 10, 14];
    case "a9":
      return [0, t, 14];
    default:
      return [0, t, 7];
  }
}

export const btnId = (b: Btn) => b.r + "-" + b.n;
export const btnLab = (b: Btn) => b.n + (["", "′", "″"][b.r] ?? "");

/* ---------- Sélection de la fenêtre de jeu ---------- */
/**
 * Depuis une basse `s`, cherche la meilleure suite de boutons (au plus `m`)
 * strictement plus aigus, proches géographiquement et couvrant des degrés distincts.
 */
export function bestWin(s: Btn, cands: Btn[], d: 0 | 1, m: number): Btn[] {
  const up = cands.filter((b) => b.m[d] > s.m[d] && b.m[d] - s.m[d] <= 19);
  const dist = (a: Btn, b: Btn) => Math.hypot(a.x - b.x, a.u - b.u);
  for (let L = m; L > 0; L--) {
    let best: { sc: number; seq: Btn[] } | null = null;
    const go = (prev: Btn, seq: Btn[], cost: number) => {
      if (seq.length === L) {
        const sc =
          cost +
          0.05 * (prev.m[d] - s.m[d]) -
          100 * new Set([s, ...seq].map((b) => pcOf(b.m[d]))).size -
          0.15 * seq.filter((b) => b.r === s.r).length;
        if (!best || sc < (best as { sc: number }).sc) best = { sc, seq: [...seq] };
        return;
      }
      for (const b of up) {
        if (b.m[d] <= prev.m[d]) continue;
        seq.push(b);
        go(b, seq, cost + dist(prev, b));
        seq.pop();
      }
    };
    go(s, [], 0);
    if (best) return [s, ...(best as { seq: Btn[] }).seq];
  }
  return [s];
}

export type Sel = {
  root: number;
  mode: "maj" | "min";
  enr: string;
  dir: 0 | 1;
  low: string | null;
  more: boolean;
  /** Accords de la main gauche : false = fondamentale + quinte, true = avec tierce */
  tierces: boolean;
};

/* ---------- Tierces (main gauche) ----------
   Sans tierce : l'accord de gauche = fondamentale + quinte (2 notes).
   Avec tierce : fondamentale + tierce + quinte (3 notes).
   Tous les accords sont majeurs, SAUF La (La–Do–Mi).
   Pour un accord mineur demandé, on affiche l'accord équivalent :
   + 7e mineure puis − fondamentale = accord majeur situé 3 demi-tons au-dessus.
   Ex : Rém → Fa (Fa La Do) ; Mim → Sol (Sol Si Ré) ; Lam → La (direct, déjà mineur). */

/** Largeur de tierce d'un accord complet de gauche : La est mineur, les autres majeurs. */
export const thirdOf = (root: number) => (root === 9 ? 3 : 4);

/** Notes (classes de hauteur) jouées par un bouton d'accord de gauche sur `root`. */
export const leftTriad = (root: number): number[] => [
  pcOf(root),
  pcOf(root + thirdOf(root)),
  pcOf(root + 7),
];

export type VM = {
  none: boolean;
  d: 0 | 1;
  isS: boolean;
  cp: number[];
  q4: number[];
  name: string;
  notes: { p: number; added: boolean }[];
  low: string | null;
  selected: Set<string>;
  roots: Set<string>;
  pb: LBtn | null;
  pc: LBtn | null;
  leftPick: Set<number>;
  leftAlt: Set<number>;
  miss: number[];
  status: string;
  playMidis: number[];
  /** classes de hauteur de la basse jouée à gauche */
  bassNotes: number[];
  /** classes de hauteur de l'accord joué à gauche (2 notes sans tierce, 3 avec) */
  chordNotes: number[];
};

/** Calcule tout ce qui doit être affiché pour une sélection donnée. */
export function buildView(kb: KB, S: Sel): VM {
  const t = S.mode === "min" ? 3 : 4;
  const d = S.dir;
  const none = S.root < 0;
  const isS = isSym(S.enr);
  const suf = SUF[S.enr] ?? "";
  const iv = none ? [] : intervals(S.enr, t);
  const cp = iv.map((i) => pcOf(S.root + i));
  const q4 = (Q4I[S.enr] ?? []).map((i) => pcOf(S.root + i));
  const name = none ? "Clavier" : pn(S.root) + (!isS && S.mode === "min" ? "m" : "") + suf;
  const notes = cp.map((p) => ({ p, added: q4.includes(p) }));

  const empty: VM = {
    none,
    d,
    isS,
    cp,
    q4,
    name,
    notes,
    low: null,
    selected: new Set(),
    roots: new Set(),
    pb: null,
    pc: null,
    leftPick: new Set<number>(),
    leftAlt: new Set<number>(),
    miss: [],
    status: "Touche une note, à gauche ou à droite : haut = poussé, bas = tiré.",
    playMidis: [],
    bassNotes: [],
    chordNotes: [],
  };
  if (none) return empty;

  const cands = kb.b
    .filter((b) => b.m[d] > 0 && cp.includes(pcOf(b.m[d])))
    .sort((a, b) => a.m[d] - b.m[d] || a.r * 20 + a.n - (b.r * 20 + b.n));

  let low = cands.some((b) => btnId(b) === S.low) ? S.low : cands.length ? btnId(cands[0]) : null;
  const i0 = low ? cands.findIndex((b) => btnId(b) === low) : -1;
  const wl = Math.min(cp.length, 4);
  const win = i0 >= 0 ? bestWin(cands[i0], cands, d, wl - 1) : [];
  const selected = new Set(win.map(btnId));
  const roots = new Set(win.filter((b) => pcOf(b.m[d]) === S.root).map(btnId));

  /* ---------- résolution de l'accord de gauche ---------- */
  // Sans tierce : bouton dont la fondamentale ET la quinte sont dans l'accord.
  // Avec tierce : fondamentale demandée, transformée pour les mineurs (accord équivalent).
  const tierces = S.tierces;
  let leftRoot = S.root; // fondamentale de la touche gauche recherchée
  let equiv: string | null = null; // "équivalent de Rém"
  let noEquiv = false; // mineur sans accord équivalent disponible
  let naturalMinor = false; // La majeur sur un bouton La naturellement mineur

  if (tierces && !isS) {
    if (S.mode === "min") {
      if (S.root === 9) {
        leftRoot = 9; // La mineur : le bouton La est déjà mineur → direct
      } else {
        const rel = pcOf(S.root + 3); // +7e mineure puis −fondamentale
        const relMinorBtn = rel === 9; // le bouton La serait mineur, donc inutilisable
        const exists = kb.l.some((x) => !x.up && x.k[d] === rel);
        if (relMinorBtn || !exists) {
          noEquiv = true;
        } else {
          leftRoot = rel;
          equiv = pn(S.root) + "m";
        }
      }
    } else if (S.root === 9) {
      naturalMinor = true; // demande La majeur, mais le bouton La est mineur
    }
  }

  const bassC = kb.l.filter((x) => x.up && x.k[d] >= 0 && cp.includes(x.k[d]));
  const chC = kb.l.filter((x) => {
    if (x.up || x.k[d] < 0 || noEquiv) return false;
    if (tierces && !isS) {
      // mineur : uniquement l'accord équivalent (relatif majeur)
      if (S.mode === "min") return x.k[d] === leftRoot;
      // majeur : la fondamentale d'abord, sinon un accord dont la triade complète est dans l'accord
      return x.k[d] === leftRoot || leftTriad(x.k[d]).every((n) => cp.includes(n));
    }
    return cp.includes(x.k[d]) && cp.includes(pcOf(x.k[d] + 7));
  });
  const pb =
    bassC.find((x) => x.k[d] === S.root) ??
    bassC.find((x) => cp.filter((c) => !win.some((b) => pcOf(b.m[d]) === c)).includes(x.k[d])) ??
    bassC.find((x) => x.k[d] === pcOf(S.root + 7)) ??
    bassC[0] ??
    null;
  // d'abord la fondamentale visée, sinon le premier accord compatible
  const pc = noEquiv ? null : chC.find((x) => x.k[d] === leftRoot) ?? chC[0] ?? null;

  const leftPick = new Set<number>();
  if (pb) leftPick.add(kb.l.indexOf(pb));
  if (pc) leftPick.add(kb.l.indexOf(pc));
  const leftAlt = new Set<number>();
  kb.l.forEach((x, ix) => {
    if (!leftPick.has(ix) && (bassC.includes(x) || chC.includes(x))) leftAlt.add(ix);
  });

  const wp = new Set(win.map((b) => pcOf(b.m[d])));
  const miss = cp.filter((c) => !wp.has(c));

  /* notes réellement jouées à gauche (basse + accord) */
  const bassPcs = pb ? [pcOf(pb.k[d])] : [];
  const chordPcs = pc ? (tierces && !isS ? leftTriad(pc.k[d]) : [pcOf(pc.k[d]), pcOf(pc.k[d] + 7)]) : [];

  let status: string;
  if (!cands.length) {
    status = `Aucun bouton ${d ? "tiré" : "poussé"} ne contient les notes de ${name}. Essaie l'autre sens, ou une autre basse.`;
  } else {
    const lp2 = new Set<number>([...bassPcs, ...chordPcs]);
    const o: string[] = [];
    o.push(pb ? `Basse ${ld(pb.lab[d])}` : "Pas de basse");
    if (pc && tierces && !isS) {
      const tri = leftTriad(pc.k[d]).map(pn).join(" ");
      o.push(
        equiv
          ? `accord ${ld(pc.lab[d])} → ${tri} (équivalent de ${equiv})`
          : `accord ${ld(pc.lab[d])} → ${tri}`,
      );
    } else if (pc) {
      o.push(`accord ${ld(pc.lab[d])}`);
    } else if (noEquiv) {
      o.push("aucun accord équivalent à gauche");
    } else {
      o.push("pas d'accord");
    }
    status = o.join(" · ") + ".";
    if (naturalMinor) status += " La est naturellement mineur sur ce clavier.";
    miss.forEach((m) => {
      status += ` ${pn(m)} manque à droite : ${lp2.has(m) ? "jouée à gauche" : "absente"}.`;
    });
  }

  const playMidis = [
    ...win.map((b) => b.m[d]),
    ...bassPcs.map((p) => 36 + p),
    ...chordPcs.map((p) => 48 + p),
  ].sort((a, b) => a - b);

  return {
    none,
    d,
    isS,
    cp,
    q4,
    name,
    notes,
    low,
    selected,
    roots,
    pb,
    pc,
    leftPick,
    leftAlt,
    miss,
    status,
    playMidis,
    bassNotes: bassPcs,
    chordNotes: chordPcs,
  };
}

/**
 * After a long touch, the player chooses actual keys rather than the automatic
 * fingering. Recognize a chord only when its exact pitch classes match one of
 * the known shapes relative to the requested fundamental.
 */
export function buildManualView(
  kb: KB,
  S: Sel,
  right: ReadonlySet<string>,
  left: ReadonlySet<number>,
  touchedLeft: ReadonlySet<number> = new Set(),
): VM {
  const base = buildView(kb, S);
  if (S.root < 0) return base;
  const pickedRight = kb.b.filter((b) => right.has(btnId(b)) && b.m[S.dir] > 0);
  const pickedLeft = kb.l.filter((b, ix) => left.has(ix) && b.k[S.dir] >= 0);
  const bass = pickedLeft.find((b) => b.up) ?? null;
  const chord = pickedLeft.find((b) => !b.up) ?? null;
  const bassNotes = bass ? [bass.k[S.dir]] : [];
  const chordNotes = chord
    ? S.tierces
      ? leftTriad(chord.k[S.dir])
      : [chord.k[S.dir], pcOf(chord.k[S.dir] + 7)]
    : [];
  const midis = [
    ...pickedRight.map((b) => b.m[S.dir]),
    ...bassNotes.map((p) => 36 + p),
    ...chordNotes.map((p) => 48 + p),
  ].sort((a, b) => a - b);
  // Automatic bass/chord suggestions do not define the requested composition:
  // only the selected right-hand keys and left-hand keys explicitly long-pressed do.
  const composition = [
    ...pickedRight.map((b) => b.m[S.dir]),
    ...pickedLeft.filter((b) => touchedLeft.has(kb.l.indexOf(b))).flatMap((b) =>
      b.up ? [b.k[S.dir]] : S.tierces ? leftTriad(b.k[S.dir]) : [b.k[S.dir], pcOf(b.k[S.dir] + 7)],
    ),
  ];
  const pcs = [...new Set(composition.map(pcOf))];
  const ordered = pcs.sort((a, b) => pcOf(a - S.root) - pcOf(b - S.root));
  const degrees = ordered.map((p) => pcOf(p - S.root)).sort((a, b) => a - b);

  let recognized: { enr: string; mode: "maj" | "min" } | null = null;
  if (degrees.includes(0)) {
    for (const enr of ["par", "s7", "s9", "q5", "sus2", "sus4", "s6", "s7M", "a9"]) {
      for (const mode of [S.mode, S.mode === "maj" ? "min" : "maj"] as const) {
        const expected = [...new Set(intervals(enr, mode === "min" ? 3 : 4).map(pcOf))].sort((a, b) => a - b);
        if (degrees.length === expected.length && degrees.every((p, i) => p === expected[i])) {
          recognized = { enr, mode };
          break;
        }
      }
      if (recognized) break;
    }
  }
  const name = recognized
    ? pn(S.root) + (!isSym(recognized.enr) && recognized.mode === "min" ? "m" : "") + SUF[recognized.enr]
    : pn(S.root);
  const added = recognized ? (Q4I[recognized.enr] ?? []).map((i) => pcOf(S.root + i)) : [];
  return {
    ...base,
    cp: ordered,
    q4: added,
    name,
    notes: ordered.map((p) => ({ p, added: added.includes(p) })),
    selected: new Set(pickedRight.map(btnId)),
    roots: new Set(pickedRight.filter((b) => pcOf(b.m[S.dir]) === S.root).map(btnId)),
    low: null,
    pb: bass,
    pc: chord,
    leftPick: new Set(kb.l.flatMap((b, ix) => pickedLeft.includes(b) ? [ix] : [])),
    leftAlt: new Set(),
    bassNotes,
    chordNotes,
    miss: [],
    status: `Touches choisies : ${ordered.length ? ordered.map(pn).join(" · ") : "aucune"}. ${recognized ? name : `Fondamentale ${pn(S.root)}`}.`,
    playMidis: midis,
  };
}
