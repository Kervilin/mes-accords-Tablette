import { useMemo } from "react";
import { Icon } from "@/components/Chrome";
import { BLACK_KEYS, WHITE_PCS, addedPcs, chordNotes, identifyChord, pcName } from "@/lib/piano";
import { pcOf } from "@/lib/music";

/* ============================================================
   Mode piano — une octave complète, de Do à Si.
   • une touche touchée reste rouge et s'ajoute aux notes choisies
   • la même touche touchée à nouveau retire la note
   • le grand rond affiche la note seule, puis le nom de l'accord
   ============================================================ */

type Props = {
  notes: Set<number>;
  onToggle: (pc: number) => void;
  onClear: () => void;
  onPlay: () => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
  onSwipeBack: () => void;
  playing?: boolean;
};

export function PianoMode({ notes, onToggle, onClear, onPlay, onHoldStart, onHoldEnd, onSwipeBack, playing }: Props) {
  const selected = useMemo(() => [...notes].sort((a, b) => pcOf(a) - pcOf(b)), [notes]);
  const id = useMemo(() => (selected.length >= 2 ? identifyChord(selected) : null), [selected]);
  const noteList = id ? chordNotes(id) : selected;
  const added = id ? addedPcs(id) : [];
  const single = selected.length === 1;

  // Nom affiché dans le grand rond : la note seule, puis l'accord reconnu.
  // Si les notes ne forment aucun accord connu, le nom est effacé.
  const title = single ? pcName(selected[0]) : id ? id.name : "";
  const quality = id
    ? `${id.mode === "maj" ? "Majeur" : "Mineur"}${
        id.enr === "par" ? "" : " · " + ({ q5: "quinte", sus2: "sus2", sus4: "sus4", s6: "6", s7: "7", s7M: "7M", s9: "9", a9: "add9" } as Record<string, string>)[id.enr]
      }`
    : selected.length >= 2
      ? "Accord non reconnu"
      : "Choisis tes notes";

  const total = selected.length;
  const canPlay = total > 0;

  return (
    <section className="panel rise mt-2.5 overflow-hidden p-3 sm:p-5" aria-label="Piano" style={{ touchAction: "none" }}>
      <p className="mb-3 text-center text-[12.5px]" style={{ color: "var(--c-mu)" }}>
        Touche une note pour l’ajouter · touche-la à nouveau pour la retirer
      </p>
      {/* grand rond + touches */}
      <div className="grid items-center gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="flex flex-col items-center">
          <div
            className={`chord-card piano-card${playing ? " chord-card-sounding" : ""}`}
            role="button"
            tabIndex={0}
            aria-label={
              title
                ? `Accord ${title} — ${noteList.map(pcName).join(", ")}. Toucher pour écouter.`
                : "Aucune note choisie"
            }
            onClick={() => canPlay && onPlay()}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && canPlay) {
                e.preventDefault();
                onPlay();
              }
            }}
            onPointerDown={(e) => {
              if (!canPlay) return;
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                /* ignore */
              }
            }}
            onPointerUp={onHoldEnd}
            onPointerCancel={onHoldEnd}
            onContextMenu={(e) => e.preventDefault()}
            onDoubleClick={() => canPlay && onHoldStart()}
          >
            <span className="cc-name piano-card-name">{title || "\u00A0"}</span>
            <span className="cc-notes piano-card-notes">
              {noteList.length
                ? noteList.map((pc, i) => (
                    <span key={pc} className={added.includes(pc) ? "cc-added" : undefined}>
                      {pcName(pc)}
                      {i < noteList.length - 1 ? <span className="cc-sep">·</span> : null}
                    </span>
                  ))
                : "Choisis une note"}
            </span>
            <span className="piano-card-hint">
              {canPlay ? (id ? quality : total === 1 ? "note seule" : "aucun accord") : "Do → Si"}
            </span>
          </div>
          {canPlay ? (
            <button
              type="button"
              onClick={onPlay}
              className="ch mt-2 min-h-[36px] px-3 text-[12.5px]"
              title="Écouter les notes choisies"
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon n={playing ? "stop" : "play"} /> {playing ? "Arrêter" : "Écouter l’accord"}
              </span>
            </button>
          ) : null}
        </div>

        <div>
          {/* clavier */}
          <div className="piano" role="group" aria-label="Clavier de piano, de Do à Si">
            <div className="piano-whites">
              {WHITE_PCS.map((pc) => {
                const on = notes.has(pc);
                return (
                  <button
                    key={pc}
                    type="button"
                    className={`piano-key${on ? " on" : ""}`}
                    aria-pressed={on}
                    aria-label={`${pcName(pc)} — ${on ? "retirer" : "ajouter"}`}
                    onClick={() => onToggle(pc)}
                  >
                    <span className="piano-key-label">{pcName(pc)}</span>
                    {on ? <span className="piano-key-dot" aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
            {BLACK_KEYS.map((b) => {
              const on = notes.has(b.pc);
              return (
                <button
                  key={b.pc}
                  type="button"
                  className={`piano-black${on ? " on" : ""}`}
                  style={{ left: `calc(${((b.afterWhite + 1) / 7) * 100}% - var(--bw) / 2)` }}
                  aria-pressed={on}
                  aria-label={`${pcName(b.pc)} — ${on ? "retirer" : "ajouter"}`}
                  onClick={() => onToggle(b.pc)}
                >
                  <span>{pcName(b.pc)}</span>
                </button>
              );
            })}
          </div>

          {/* notes choisies */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 font-mono text-[10.5px] uppercase tracking-[0.12em]" style={{ color: "var(--c-mu)" }}>
              Notes
            </span>
            {total ? (
              [...notes].map((pc) => (
                <button
                  key={pc}
                  type="button"
                  onClick={() => onToggle(pc)}
                  className="rounded-full border px-2.5 py-1 text-[12px] font-semibold transition"
                  style={{
                    borderColor: "var(--c-sel)",
                    background: "color-mix(in oklab, var(--c-sel) 16%, var(--c-card))",
                    color: "var(--c-selt)",
                  }}
                  title={`Retirer ${pcName(pc)}`}
                >
                  {pcName(pc)} <span aria-hidden="true">×</span>
                </button>
              ))
            ) : (
              <span className="text-[12px]" style={{ color: "var(--c-mu)" }}>
                aucune note pour l’instant
              </span>
            )}
            {total >= 2 ? (
              <span className="ml-auto text-[12px] font-semibold" style={{ color: id ? "var(--c-yel)" : "var(--c-mu)" }}>
                {id ? id.name : "—"}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* actions : sous le clavier */}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onClear}
          disabled={!total}
          className="ch min-h-[42px] flex-1 px-3 text-[13.5px] disabled:opacity-35"
          title="Effacer toutes les notes choisies"
        >
          <span className="inline-flex items-center gap-1.5">
            <Icon n="trash" /> Effacer
          </span>
        </button>
        <button
          type="button"
          onClick={onSwipeBack}
          className="ch min-h-[42px] flex-1 px-3 text-[13.5px]"
          title="Revenir au clavier d'accordéon (ou balaye vers le bas)"
        >
          <span className="inline-flex items-center gap-1.5">
            <Icon n="expand" className="rotate-180" /> Accordéon
          </span>
        </button>
      </div>

    </section>
  );
}
