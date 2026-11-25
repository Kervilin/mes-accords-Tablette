/* ============================================================
   Piano : une octave complète (Do → Si) et reconnaissance
   d'accords à partir des notes choisies.
   ============================================================ */
import { N, Q4I, intervals, pcOf, pn, type Sel } from "./music";

import { identifyChord, type ChordId } from "./music";
export { identifyChord, chordLabel, type ChordId } from "./music";

/** Classe de hauteur de chaque touche blanche, dans l'ordre du piano. */
export const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];

/** Touches noires : classe de hauteur + index de la blanche qui la précède. */
export const BLACK_KEYS: { pc: number; afterWhite: number }[] = [
  { pc: 1, afterWhite: 0 }, // Do#
  { pc: 3, afterWhite: 1 }, // Ré#
  { pc: 6, afterWhite: 3 }, // Fa#
  { pc: 8, afterWhite: 4 }, // Sol#
  { pc: 10, afterWhite: 5 }, // La#
];

/** Nom court d'une classe de hauteur, ex. 3 → « Mi♭ ». */
export const pcName = (pc: number) => pn(pc);

/** Nom d'une note dans une octave donnée : « Mi♭4 ». */
export const pcOctName = (pc: number, oct = 4) => `${pn(pc)}${oct}`;

/** Fréquences/MIDI d'une note pour l'écoute (octave 4 par défaut). */
export const midiOf = (pc: number, oct = 4) => 12 * (oct + 1) + pcOf(pc);

/** Notes « ajoutées » (7, 9, 6…) affichées en italique, relatives à l'accord reconnu. */
export function addedPcs(id: ChordId): number[] {
  return (Q4I[id.enr] ?? []).map((iv) => pcOf(id.root + iv));
}

/** Notes de l'accord reconnu, dans l'ordre d'empilement (fondamentale d'abord). */
export function chordNotes(id: ChordId): number[] {
  const t = id.mode === "min" ? 3 : 4;
  return [...new Set(intervals(id.enr, t).map((iv) => pcOf(id.root + iv)))];
}

/** MIDI à jouer pour les notes choisies (octave 4). */
export function notesToMidis(pcs: Iterable<number>, oct = 4): number[] {
  return [...new Set([...pcs].map(pcOf))].sort((a, b) => a - b).map((pc) => midiOf(pc, oct));
}

/**
 * Applique les notes du piano à la sélection d'accordéon : si elles forment
 * un accord connu, on retrouve sa fondamentale / son mode / son type.
 */
export function toSelection(pcs: Iterable<number>, base: Sel): Sel | null {
  const id = identifyChord(pcs, base.root, base.mode);
  if (!id) return null;
  return { ...base, root: id.root, mode: id.mode, enr: id.enr, low: null };
}

/** Tonalité d'une note (pour l'affichage « Do4 · Mi4 · Sol4 »). */
export const noteNames = (pcs: Iterable<number>) => [...pcs].map((pc) => N[pcOf(pc)]);
