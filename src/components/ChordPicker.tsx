import { Icon } from "@/components/Chrome";
import { MAIN, OTH } from "@/lib/music";

/* ============================================================
   Réglage de l'accord, ouvert par un toucher sur le grand rond :
     1re ligne : types d'accord (Parfait, 7, 9, 5, sus2…)
     2e ligne  : sens (Poussé / Tiré)
     3e ligne  : Maj, Min, et Tierces (Sans tierce / Avec tierces)
   ============================================================ */
export function ChordPicker({
  open,
  enr,
  dir,
  mode,
  isSym,
  tierces,
  onEnr,
  onDir,
  onMode,
  onTierces,
  onClose,
}: {
  open: boolean;
  enr: string;
  dir: 0 | 1;
  mode: "maj" | "min";
  isSym: boolean;
  tierces: boolean;
  onEnr: (v: string) => void;
  onDir: (d: 0 | 1) => void;
  onMode: (m: "maj" | "min") => void;
  onTierces: () => void;
  onClose: () => void;
}) {
  if (!open) return null;
  const types: [string, string][] = [...MAIN, ...OTH];

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

        {/* 1re ligne : types d'accord */}
        <div className="grid grid-cols-3 gap-1.5">
          {types.map(([v, l]) => (
            <button
              key={v}
              type="button"
              className="ch min-h-[46px] text-[15px] font-bold"
              style={chip(enr === v)}
              aria-pressed={enr === v}
              onClick={() => onEnr(v)}
            >
              {l}
            </button>
          ))}
        </div>

        {/* 2e ligne : sens */}
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            className="ch min-h-[46px] text-[15px] font-bold"
            style={{
              ...chip(dir === 0),
              background: dir === 0 ? "var(--c-org)" : "var(--c-card)",
              borderColor: dir === 0 ? "var(--c-org)" : "var(--c-bd)",
              color: dir === 0 ? "#1b1005" : "var(--c-tx)",
            }}
            aria-pressed={dir === 0}
            onClick={() => onDir(0)}
          >
            Poussé
          </button>
          <button
            type="button"
            className="ch min-h-[46px] text-[15px] font-bold"
            style={{
              ...chip(dir === 1),
              background: dir === 1 ? "var(--c-yel)" : "var(--c-card)",
              borderColor: dir === 1 ? "var(--c-yel)" : "var(--c-bd)",
              color: dir === 1 ? "#1b1503" : "var(--c-tx)",
            }}
            aria-pressed={dir === 1}
            onClick={() => onDir(1)}
          >
            Tiré
          </button>
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
