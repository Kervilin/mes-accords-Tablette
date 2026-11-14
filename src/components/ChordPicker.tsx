import { useEffect, useRef } from "react";
import { Icon } from "@/components/Chrome";
import { MAIN, N, OTH, nm } from "@/lib/music";

const TYPES: [string, string][] = [...MAIN, ...OTH];

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
  onRoot: (value: number) => void;
  onEnr: (v: string) => void;
  onMode: (m: "maj" | "min") => void;
  onTierces: () => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const rootRowRef = useRef<HTMLDivElement>(null);
  const modeRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Keep each selection visible in its single, horizontally scrollable row.
    for (const row of [rootRowRef.current, modeRowRef.current]) {
      const selected = row?.querySelector<HTMLElement>('[aria-pressed="true"]');
      if (row && selected) {
        row.scrollLeft = selected.offsetLeft - (row.clientWidth - selected.offsetWidth) / 2;
      }
    }
  }, [open, root, enr]);

  if (!open) return null;

  return (
    <div
      className="chord-picker-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="sheet-in panel chord-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chord-picker-title"
        tabIndex={-1}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          } else if (event.key === "Tab") {
            const buttons = panelRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
            if (!buttons?.length) return;
            const first = buttons[0];
            const last = buttons[buttons.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <div className="chord-picker-heading">
          <h2 id="chord-picker-title">Choisir un accord</h2>
          <button
            type="button"
            aria-label="Fermer"
            className="ch chord-picker-close"
            onClick={onClose}
          >
            <Icon n="close" />
          </button>
        </div>

        <div ref={rootRowRef} className="chord-picker-row" role="group" aria-label="Fondamentale de l'accord">
          {N.map((note, value) => (
            <button
              key={note}
              type="button"
              className={`ch chord-picker-option${root === value ? " on" : ""}`}
              aria-pressed={root === value}
              onClick={() => onRoot(value)}
            >
              {nm(note)}
            </button>
          ))}
        </div>

        <div ref={modeRowRef} className="chord-picker-row" role="group" aria-label="Mode de l'accord">
          {TYPES.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`ch chord-picker-option${enr === value ? " on" : ""}`}
              aria-pressed={enr === value}
              onClick={() => onEnr(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="chord-picker-quality" role="group" aria-label="Majeur, mineur et tierces">
          <button
            type="button"
            className={`ch${mode === "maj" && !isSym ? " on" : ""}`}
            disabled={isSym}
            aria-pressed={mode === "maj" && !isSym}
            onClick={() => onMode("maj")}
          >
            Maj
          </button>
          <button
            type="button"
            className={`ch${mode === "min" && !isSym ? " on" : ""}`}
            disabled={isSym}
            aria-pressed={mode === "min" && !isSym}
            onClick={() => onMode("min")}
          >
            Min
          </button>
          <button
            type="button"
            className={`ch${tierces ? " on" : ""}`}
            aria-pressed={tierces}
            title="Tierces des accords de la main gauche"
            onClick={onTierces}
          >
            {tierces ? "Avec tierce" : "Sans tierce"}
          </button>
        </div>
      </div>
    </div>
  );
}
