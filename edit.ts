/* ============================================================
   Édition du clavier sur la grille physique fixe :
   - Main droite : clés "d<r>:<slot>" (r=0: 0..11, r=1: 0..10, r=2: 0..9)
   - Main gauche : clés "l<j>:<i>"   (j=0..2, i=0..5)
   Toute case sans aucune note (ni poussé ni tiré) s'affiche comme un [+]
   rouge en mode édition (sauf lorsqu'elle est sélectionnée pour écoute/saisie).
   ============================================================ */
import {
  LEFT_MAX_COLS,
  LEFT_MAX_ROWS,
  RIGHT_GRID,
  normalizeKB,
  rightSlotIndex,
} from "./keyboard";
import { LT, noteToMidi, pcOf, type Btn, type KB, type LBtn } from "./music";

export type EV = { pc: number | null; oct: number | null; lab?: string };
export type EditVals = Record<string, [EV | null, EV | null]>;
export type EditState = {
  dir: 0 | 1;
  vals: EditVals;
  /** Clé en écoute : "d<r>:<slot>" ou "l<j>:<i>" */
  listen: string | null;
  side: "d" | "l" | null;
  tmp: KB;
};

export const dKey = (r: number, slot: number) => `d${r}:${slot}`;
export const lKey = (j: number, i: number) => `l${j}:${i}`;

export const hasSlotNote = (pair?: [EV | null, EV | null] | null): boolean => {
  if (!pair) return false;
  const a = pair[0];
  const b = pair[1];
  return (a !== null && a !== undefined && a.pc !== null) || (b !== null && b !== undefined && b.pc !== null);
};

export function initVals(kb: KB): EditVals {
  const v: EditVals = {};
  for (const cfg of RIGHT_GRID) {
    for (let slot = 0; slot < cfg.maxSlots; slot++) {
      v[dKey(cfg.r, slot)] = [null, null];
    }
  }
  for (let j = 0; j < LEFT_MAX_COLS; j++) {
    for (let i = 0; i < LEFT_MAX_ROWS; i++) {
      v[lKey(j, i)] = [null, null];
    }
  }

  kb.b.forEach((b) => {
    const slot = rightSlotIndex(b.r, b.u);
    v[dKey(b.r, slot)] = [
      b.m[0] > 0 ? { pc: pcOf(b.m[0]), oct: Math.floor(b.m[0] / 12) - 1 } : null,
      b.m[1] > 0 ? { pc: pcOf(b.m[1]), oct: Math.floor(b.m[1] / 12) - 1 } : null,
    ];
  });

  kb.l.forEach((x) => {
    if (x.j >= 0 && x.j < LEFT_MAX_COLS && x.i >= 0 && x.i < LEFT_MAX_ROWS) {
      v[lKey(x.j, x.i)] = [
        x.k[0] >= 0 && x.lab[0] !== "?" ? { pc: x.k[0], oct: 0, lab: x.lab[0] } : null,
        x.k[1] >= 0 && x.lab[1] !== "?" ? { pc: x.k[1], oct: 0, lab: x.lab[1] } : null,
      ];
    }
  });

  return v;
}

/**
 * Reconstruit le clavier à partir des valeurs éditées :
 * - Toute touche ayant au moins une note (poussé ou tiré) est conservée.
 * - Une touche sans aucune note disparaît SAUF si elle est située entre 2 touches
 *   ayant une note dans la même rangée/colonne.
 */
export function valsToKB(vals: EditVals): KB {
  const rawB: Btn[] = [];
  for (const cfg of RIGHT_GRID) {
    for (let slot = 0; slot < cfg.maxSlots; slot++) {
      const pair = vals[dKey(cfg.r, slot)];
      if (!hasSlotNote(pair)) continue;
      const mm = (e: EV | null) => (e && e.pc !== null && e.oct !== null ? noteToMidi(e.pc, e.oct) : 0);
      const u = Math.round((cfg.u0 + slot) * 100) / 100;
      rawB.push({
        r: cfg.r,
        x: cfg.x,
        n: slot + 1,
        u,
        m: [mm(pair[0]), mm(pair[1])],
      });
    }
  }

  const rawL: LBtn[] = [];
  for (let j = 0; j < LEFT_MAX_COLS; j++) {
    for (let i = 0; i < LEFT_MAX_ROWS; i++) {
      const pair = vals[lKey(j, i)];
      if (!hasSlotNote(pair)) continue;
      const up = i % 2 === 0;
      const side = (e: EV | null) => {
        if (!e || e.pc === null) return { pc: -1, lab: "?" };
        const s = LT[pcOf(e.pc)];
        return { pc: e.pc, lab: e.lab || (up ? s : s.toLowerCase()) };
      };
      const a = side(pair[0]);
      const bb = side(pair[1]);
      rawL.push({
        i,
        j,
        n: LEFT_MAX_ROWS - i,
        up,
        lab: [a.lab, bb.lab],
        k: [a.pc, bb.pc],
      });
    }
  }

  return normalizeKB({ b: rawB, l: rawL });
}

/**
 * Calcule le numéro d'affichage `n` (`1, 2…`) de chaque slot actif ou en écoute
 * d'une rangée droite `r` en mode édition :
 * la numérotation `1, 2…` commence au premier slot occupé (ou en écoute) en partant du bas.
 */
export function editRowNumbers(r: number, vals: EditVals, listen: string | null): Map<number, number> {
  const cfg = RIGHT_GRID.find((c) => c.r === r) ?? RIGHT_GRID[0];
  const occupied: number[] = [];
  for (let slot = 0; slot < cfg.maxSlots; slot++) {
    const k = dKey(r, slot);
    if (hasSlotNote(vals[k]) || listen === k) {
      occupied.push(slot);
    }
  }
  const map = new Map<number, number>();
  if (!occupied.length) return map;
  const minSlot = occupied[0];
  for (let slot = minSlot; slot < cfg.maxSlots; slot++) {
    map.set(slot, slot - minSlot + 1);
  }
  return map;
}

export function transposeVals(vals: EditVals, delta: number): EditVals {
  const out: EditVals = {};
  for (const k in vals) {
    const v = vals[k];
    out[k] = v.map((e) => {
      if (!e || e.pc === null || e.oct === null) return e;
      if (k.startsWith("l")) {
        const pc = pcOf(e.pc + delta);
        const isUp = e.lab ? e.lab[0] === e.lab[0].toUpperCase() : true;
        return { ...e, pc, lab: isUp ? LT[pc] : LT[pc].toLowerCase() };
      }
      const pc = pcOf(e.pc + delta);
      const oct = e.oct + Math.floor((e.pc + delta) / 12);
      return { ...e, pc, oct };
    }) as [EV | null, EV | null];
  }
  return out;
}

export function razVals(vals: EditVals, dir: 0 | 1): EditVals {
  const out: EditVals = {};
  for (const k in vals) {
    const v = [...vals[k]] as [EV | null, EV | null];
    v[dir] = null;
    out[k] = v;
  }
  return out;
}

export function completion(vals: EditVals) {
  let done = 0;
  let total = 0;
  for (const k in vals) {
    const pair = vals[k];
    if (!hasSlotNote(pair)) continue;
    ([0, 1] as const).forEach((d) => {
      total++;
      if (pair[d] && pair[d]!.pc !== null) done++;
    });
  }
  return { done, total };
}
