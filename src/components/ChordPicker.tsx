import { useEffect, useRef } from "react";
import { Icon } from "@/components/Chrome";
import { MAIN, N, OTH, nm } from "@/lib/music";

/* ============================================================
   Réglage de l'accord, ouvert par un toucher sur le grand rond :
     1re ligne : notes, défilement horizontal
     2e ligne  : types d'accord, défilement horizontal
     3e ligne  : Maj, Min, et Tierces (Sans tierce / Avec tierces)
   ============================================================ */
export function ChordPicker({
  open,
  root,
  enr,
  mode,
  isSym,
  tierces,
  onRoot,
  onEnr,
  onMode,
  onTierces,
  onClose,
}: {
  open: boolean;
  root: number;
  enr: string;
  mode: "maj" | "min";
  isSym: boolean;
  tierces: boolean;
  onRoot: (root: number) => void;
  onEnr: (v: string) => void;
  onMode: (m: "maj" | "min") => void;
  onTierces: () => void;
  onClose: () => void;
}) {
  const types: [string, string][] = [...MAIN, ...OTH];
  const notesRef = useRef<HTMLDivElement>(null);
  const typesRef = useRef<HTMLDivElement>(null);

  // Centrer les choix actifs à l'ouverture, sans faire défiler la page derrière.
  useEffect(() => {
    if (!open) return;
    for (const list of [notesRef.current, typesRef.current]) {
      const selected = list?.querySelector<HTMLElement>('[aria-pressed="true"]');
      if (list && selected) {
        list.scrollLeft = selected.offsetLeft - (list.clientWidth - selected.offsetWidth) / 2;
      }
    }
  }, [open]);

  if (!open) return null;

  const chip = (on: boolean, disabled = false) => ({
    background: on ? "var(--c-sel)" : "var(--c-card)",
    borderColor: on ? "var(--c-sel)" : "var(--c-bd)",
    color: on ? "var(--c-selt)" : "var(--c-tx)",
    opacity: disabled ? 0.35 : 1,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center"
      style={{ background: "color-mix(in oklab, #05080c 55%, transparent)", backdropFilter: "blur(3px)" }}
      onClick={onClose}
    >
      <div
        className="sheet-in panel w-full max-w-[460px] p-3"
        role="dialog"
        aria-modal="true"
        aria-label="Réglage de l'accord"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom,0px))" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--c-mu)" }}>
            Réglage de l'accord
          </p>
          <button
            type="button"
            aria-label="Fermer"
            className="grid h-8 w-8 place-items-center rounded-full border"
            style={{ borderColor: "var(--c-bd)", color: "var(--c-mu)" }}
            onClick={onClose}
          >
            <Icon n="close" />
          </button>
        </div>

        {/* 1re ligne : les mêmes notes défilantes qu'en haut de l'appli */}
        <div ref={notesRef} className="nt relative flex gap-1.5 overflow-x-auto pb-1" aria-label="Notes">
          {([[-1, "—"], ...N.map((n, i) => [i, nm(n)])] as [number, string][]).map(([v, l]) => (
            <button
              key={v}
              type="button"
              className="ch min-w-[54px] shrink-0"
              style={chip(root === v)}
              aria-pressed={root === v}
              onClick={() => onRoot(v)}
            >
              {l}
            </button>
          ))}
        </div>

        {/* 2e ligne : tous les types d'accord sur une seule ligne défilante */}
        <div ref={typesRef} className="nt relative mt-2 flex gap-1.5 overflow-x-auto pb-1" aria-label="Types d'accord">
          {types.map(([v, l]) => (
            <button
              key={v}
              type="button"
              className="ch min-h-[46px] shrink-0 whitespace-nowrap px-4 text-[15px] font-bold"
              style={chip(enr === v)}
              aria-pressed={enr === v}
              onClick={() => onEnr(v)}
            >
              {l}
            </button>
          ))}
        </div>

        {/* 3e ligne : Maj, Min, tierces */}
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <button
            type="button"
            className="ch min-h-[46px] text-[15px] font-bold"
            style={chip(mode === "maj" && !isSym, isSym)}
            disabled={isSym}
            aria-pressed={mode === "maj" && !isSym}
            onClick={() => onMode("maj")}
          >
            Maj
          </button>
          <button
            type="button"
            className="ch min-h-[46px] text-[15px] font-bold"
            style={chip(mode === "min" && !isSym, isSym)}
            disabled={isSym}
            aria-pressed={mode === "min" && !isSym}
            onClick={() => onMode("min")}
          >
            Min
          </button>
          <button
            type="button"
            className="ch min-h-[46px] text-[14px] font-bold"
            style={chip(tierces)}
            aria-pressed={tierces}
            title="Tierces : accords de gauche à 3 notes"
            onClick={onTierces}
          >
            {tierces ? "Avec tierce" : "Sans tierce"}
          </button>
        </div>
      </div>
    </div>
  );
}
