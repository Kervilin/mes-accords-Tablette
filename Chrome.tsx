import { useEffect, useRef, useState, type ReactNode } from "react";

const cs = (...x: (string | false | null | undefined)[]) => x.filter(Boolean).join(" ");

/* ---------- icônes ---------- */
const PATHS: Record<string, ReactNode> = {
  play: <path d="M7 4.5v15l12-7.5z" />,
  stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
  export: (
    <>
      <path d="M12 16V4" />
      <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </>
  ),
  import: (
    <>
      <path d="M12 4v12" />
      <path d="m7.5 11.5 4.5 4.5 4.5-4.5" />
      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </>
  ),
  tune: (
    <>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2.2" />
      <circle cx="10" cy="17" r="2.2" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
      <path d="M12 18v3" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M19.1 4.9l-1.5 1.5M6.4 17.6l-1.5 1.5" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z" />,
  trash: (
    <>
      <path d="M4 7h16M9.5 7V5h5v2M6.5 7l1 13h9l1-13" />
      <path d="M10.5 11v5M13.5 11v5" />
    </>
  ),
  save: (
    <>
      <path d="M5 4h11l3 3v13H5z" />
      <path d="M8 4v6h7V4M8 20v-6h8v6" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h8" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6" />
      <path d="M12 7.2v.1" strokeWidth={2.6} />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  check: <path d="m5 13 4.5 4.5L19 7" />,
  void: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m6.5 6.5 11 11" />
    </>
  ),
  expand: (
    <>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </>
  ),
  compress: (
    <>
      <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
    </>
  ),
  bellows: (
    <>
      <path d="M3 6v12M21 6v12" />
      <path d="M6 7.5 9 6v12l-3-1.5zM9 6l3 1.5v9L9 18zM12 7.5 15 6v12l-3-1.5zM15 6l3 1.5v9L15 18z" />
    </>
  ),
  hand: (
    <>
      <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M12 11V4.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M15 11.5V7a1.5 1.5 0 0 1 3 0v7a7 7 0 0 1-7 7h-1a7 7 0 0 1-6-3.3L3 14a1.6 1.6 0 0 1 2.7-1.7L9 16V6.5a1.5 1.5 0 0 1 3 0" />
    </>
  ),
};

export function Icon({ n, className }: { n: keyof typeof PATHS | string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cs("h-[1.15em] w-[1.15em] shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[n] ?? null}
    </svg>
  );
}

/* ---------- révélation au défilement ---------- */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setSeen(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return (
    <div
      ref={ref}
      className={cs("reveal", seen && "in", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ---------- toast ---------- */
export function Toast({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div
      key={text}
      role="status"
      aria-live="polite"
      className="toast-in fixed bottom-[calc(16px+env(safe-area-inset-bottom,0px))] left-1/2 z-50 w-max max-w-[92%] -translate-x-1/2 rounded-full px-4 py-2.5 text-center text-sm font-medium shadow-[0_16px_36px_-16px_rgba(0,0,0,.9)]"
      style={{ background: "var(--c-tx)", color: "var(--c-bg)" }}
    >
      {text}
    </div>
  );
}

/* ---------- modale import / export ---------- */
export type Dlg =
  | { mode: "exp"; text: string }
  | { mode: "imp"; text: string; err: string | null; file: string | null }
  | null;

export function Dialog({
  dlg,
  setDlg,
  onLoad,
  onDefault,
  onCopy,
  onSave,
}: {
  dlg: Dlg;
  setDlg: (d: Dlg) => void;
  onLoad: (txt: string) => void;
  onDefault: () => void;
  onCopy: (txt: string) => void;
  onSave: (txt: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  if (!dlg) return null;

  const btn =
    "flex-1 min-h-[46px] rounded-xl border px-4 font-semibold text-[15px] transition active:scale-[.97]";

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center sm:items-center"
      style={{ background: "color-mix(in oklab, #05080c 62%, transparent)", backdropFilter: "blur(4px)" }}
      onClick={() => setDlg(null)}
    >
      <div
        className="sheet-in panel w-full max-w-[580px] rounded-b-none p-4 sm:rounded-b-[20px] sm:p-5"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom,0px))" }}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-[22px] font-extrabold tracking-tight">
              {dlg.mode === "exp" ? "Export du clavier" : "Importer un clavier"}
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--c-mu)" }}>
              {dlg.mode === "exp"
                ? "Format CSV compatible avec l'appli d'origine : enregistre-le sous clavier.csv."
                : "Choisis un fichier CSV ou colle son contenu ci-dessous, puis charge."}
            </p>
          </div>
          <button
            type="button"
            aria-label="Fermer"
            className="grid h-9 w-9 place-items-center rounded-full border transition hover:rotate-90"
            style={{ borderColor: "var(--c-bd)", color: "var(--c-mu)" }}
            onClick={() => setDlg(null)}
          >
            <Icon n="close" />
          </button>
        </div>

        {dlg.mode === "imp" && (
          <>
            <label
              className="mb-3 flex min-h-[74px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-3 text-center text-sm transition hover:border-solid"
              style={{ borderColor: "var(--c-bd)", color: "var(--c-mu)" }}
            >
              <Icon n="import" className="h-5 w-5" />
              <span className="font-semibold" style={{ color: "var(--c-tx)" }}>
                {dlg.file ?? "Choisir un fichier .csv"}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                className="hidden"
                onChange={() => {
                  const f = fileRef.current?.files?.[0];
                  if (!f) return;
                  const r = new FileReader();
                  r.onload = () => {
                    setDlg({ mode: "imp", text: String(r.result ?? ""), err: null, file: f.name });
                  };
                  r.readAsText(f);
                }}
              />
            </label>
            {dlg.err && (
              <p
                className="mb-3 rounded-lg px-3 py-2 text-sm font-medium"
                style={{
                  background: "color-mix(in oklab, var(--c-sel) 16%, transparent)",
                  color: "var(--c-sel)",
                }}
              >
                {dlg.err}
              </p>
            )}
          </>
        )}

        <textarea
          value={dlg.text}
          readOnly={dlg.mode === "exp"}
          spellCheck={false}
          onChange={(e) =>
            setDlg({ mode: "imp", text: e.target.value, err: null, file: dlg.mode === "imp" ? dlg.file : null })
          }
          className="mt-1 w-full rounded-xl border p-3 text-[12px] leading-[1.35]"
          style={{
            minHeight: 170,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            borderColor: "var(--c-bd)",
            background: "var(--c-bg2)",
            color: "var(--c-tx)",
          }}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {dlg.mode === "exp" ? (
            <>
              <button
                type="button"
                className={btn}
                style={{ borderColor: "var(--c-sel)", background: "var(--c-sel)", color: "var(--c-selt)" }}
                onClick={() => onCopy(dlg.text)}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon n="copy" /> Copier
                </span>
              </button>
              <button
                type="button"
                className={btn}
                style={{ borderColor: "var(--c-bd)", background: "var(--c-card2)", color: "var(--c-tx)" }}
                onClick={() => onSave(dlg.text)}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon n="export" /> Télécharger
                </span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={btn}
                style={{ borderColor: "var(--c-sel)", background: "var(--c-sel)", color: "var(--c-selt)" }}
                onClick={() => onLoad(dlg.text)}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon n="check" /> Charger
                </span>
              </button>
              <button
                type="button"
                className={btn}
                style={{ borderColor: "var(--c-bd)", background: "var(--c-card2)", color: "var(--c-tx)" }}
                onClick={onDefault}
              >
                Clavier d'usine
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
