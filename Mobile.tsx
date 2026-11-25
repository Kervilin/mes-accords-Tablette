import { useState } from "react";
import { Icon } from "@/components/Chrome";
import { isAndroid, isIOS, type PwaStatus } from "@/lib/pwa";
import { ICON_META, buildPublishZip, downloadBlob, type IconVariant } from "@/lib/publish";

const cs = (...x: (string | false | null | undefined)[]) => x.filter(Boolean).join(" ");

/* ============================================================
   Feuille « Installer l'application »
   ============================================================ */
type Platform = "ios" | "android" | "desktop";

const STEPS: Record<Platform, { t: string; d: string }[]> = {
  ios: [
    { t: "Ouvre l'adresse dans Safari", d: "Sur iPhone/iPad, l'ajout passe par Safari (pas Chrome)." },
    { t: "Bouton Partager", d: "Carré avec une flèche vers le haut, en bas de l'écran." },
    { t: "« Sur l'écran d'accueil »", d: "Fais défiler, touche Ajouter : l'icône apparaît." },
    { t: "Lance depuis l'icône", d: "Plein écran, sans barre d'adresse. Les claviers restent enregistrés." },
  ],
  android: [
    { t: "Ouvre l'adresse dans Chrome", d: "Chrome, Edge ou Samsung Internet." },
    { t: "Menu ⋮ en haut à droite", d: "Choisis « Installer l'application » (ou « Ajouter à l'écran d'accueil »)." },
    { t: "Confirme « Installer »", d: "Une bannière « Installer » apparaît aussi en bas." },
    { t: "Lance depuis l'icône", d: "L'appli s'ouvre en plein écran, icône dans le tiroir d'applis." },
  ],
  desktop: [
    { t: "Installe sur l'ordinateur", d: "Chrome/Edge : icône écran + flèche à droite de la barre d'adresse." },
    { t: "Envoie le lien au téléphone", d: "Copie l'adresse et ouvre-la sur le mobile, puis onglet iPhone/Android." },
    { t: "Lance depuis l'icône", d: "Fenêtre dédiée, sans barre d'adresse." },
    { t: "Mets à jour", d: "Retélécharge le paquet et redéploie quand tu modifies le clavier." },
  ],
};

function Dot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-semibold"
      style={{
        borderColor: ok ? "color-mix(in oklab, #22c55e 55%, var(--c-bd))" : "var(--c-bd)",
        background: ok ? "color-mix(in oklab, #22c55e 12%, transparent)" : "var(--c-bg2)",
        color: ok ? "var(--c-tx)" : "var(--c-mu)",
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: ok ? "#22c55e" : "var(--c-mu)" }} />
      {label}
    </span>
  );
}

/* ---------- fabricate le ZIP prêt à publier ---------- */
function usePublishZip() {
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const run = async (variant: IconVariant) => {
    setBusy(true);
    setErr(null);
    setDone(false);
    setStep("Préparation…");
    try {
      const blob = await buildPublishZip(variant, setStep);
      downloadBlob(blob, "mes-accords-pwa.zip");
      setStep("Paquet téléchargé");
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Téléchargement impossible.");
      setStep("");
    } finally {
      setBusy(false);
    }
  };

  return { busy, step, err, done, run };
}

/* ============================================================
   Feuille « Installer l'application » — mode d'emploi pas à pas
   ============================================================ */
export function InstallSheet({
  open,
  onClose,
  installed,
  canPrompt,
  onInstall,
  status,
  onDiag,
  variant,
}: {
  open: boolean;
  onClose: () => void;
  installed: boolean;
  canPrompt: boolean;
  onInstall: () => void;
  status: PwaStatus;
  onDiag: () => void;
  variant: string;
}) {
  const [tab, setTab] = useState<Platform>(() => (isIOS() ? "ios" : isAndroid() ? "android" : "desktop"));
  const [copied, setCopied] = useState(false);
  const zip = usePublishZip();
  if (!open) return null;

  const iconName = ICON_META[(variant as IconVariant) in ICON_META ? (variant as IconVariant) : "dark"].name;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {}
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const TABS: [Platform, string][] = [
    ["ios", "iPhone"],
    ["android", "Android"],
    ["desktop", "Ordinateur"],
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: "color-mix(in oklab, #05080c 66%, transparent)", backdropFilter: "blur(5px)" }}
      onClick={onClose}
    >
      <div
        className="sheet-in panel max-h-[94dvh] w-full max-w-[480px] overflow-y-auto rounded-b-none p-4 sm:rounded-b-[20px] sm:p-5"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom,0px))" }}
        role="dialog"
        aria-modal="true"
        aria-label="Installer Mes accords"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="./icons/icon-192.png"
              alt=""
              className="h-14 w-14 rounded-2xl border object-cover"
              style={{ borderColor: "var(--c-bd)" }}
            />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--c-mu)" }}>
                Mode d'emploi
              </p>
              <h2 className="font-display text-[21px] font-extrabold leading-tight tracking-tight">
                Installer l'appli
              </h2>
            </div>
          </div>
          <button
            type="button"
            aria-label="Fermer"
            className="grid h-9 w-9 place-items-center rounded-full border transition hover:rotate-90"
            style={{ borderColor: "var(--c-bd)", color: "var(--c-mu)" }}
            onClick={onClose}
          >
            <Icon n="close" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Dot ok={status.secure} label={status.secure ? "HTTPS" : "HTTPS requis"} />
          <Dot ok={status.sw} label={status.sw ? "Hors-ligne prêt" : "Hors-ligne en attente"} />
          <Dot ok={status.iconsOk === true} label="Icônes" />
          <Dot ok={status.standalone} label={status.standalone ? "Mode appli" : "Onglet"} />
        </div>

        {/* 1 — paquet */}
        <div className="mt-3 rounded-2xl border p-3" style={{ borderColor: "var(--c-sel)" }}>
          <div className="flex items-baseline gap-2">
            <span
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-extrabold"
              style={{ background: "var(--c-sel)", color: "#fff" }}
            >
              1
            </span>
            <p className="text-[14px] font-bold leading-tight">Télécharge le paquet de l'appli</p>
          </div>
          <p className="mt-1 pl-8 text-[12.5px] leading-snug" style={{ color: "var(--c-mu)" }}>
            Un fichier ZIP contenant l'appli complète, l'icône <b>{iconName}</b> et le mode plein écran.
            Aucune installation de logiciel.
          </p>
          <button
            type="button"
            className="ch mt-2 ml-8 flex min-h-[46px] w-[calc(100%-2rem)] items-center justify-center gap-2 text-[14px]"
            style={{ background: "var(--c-sel)", borderColor: "var(--c-sel)", color: "#fff" }}
            onClick={() => void zip.run((variant as IconVariant) in ICON_META ? (variant as IconVariant) : "dark")}
            disabled={zip.busy}
          >
            <Icon n={zip.done ? "check" : "export"} />
            {zip.busy ? zip.step || "Préparation…" : zip.done ? "Téléchargé — retélécharger" : "Télécharger mes-accords-pwa.zip"}
          </button>
          {zip.err && (
            <p className="mt-2 ml-8 rounded-lg px-2 py-1.5 text-[12px]" style={{ background: "color-mix(in oklab, var(--c-sel) 15%, transparent)", color: "var(--c-sel)" }}>
              {zip.err}
            </p>
          )}
        </div>

        {/* 2 — publier */}
        <div className="mt-2 rounded-2xl border p-3" style={{ borderColor: "var(--c-bd)", background: "var(--c-bg2)" }}>
          <div className="flex items-baseline gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-extrabold" style={{ background: "var(--c-tx)", color: "var(--c-bg)" }}>
              2
            </span>
            <p className="text-[14px] font-bold leading-tight">Mets-la en ligne (gratuit, 2 min)</p>
          </div>
          <p className="mt-1 pl-8 text-[12.5px] leading-snug" style={{ color: "var(--c-mu)" }}>
            Glisse le ZIP sur <b>app.netlify.com/drop</b>. Tu obtiens une adresse <b>https://…netlify.app</b>.
            C'est ce lien qu'on ouvre sur le téléphone.
          </p>
          <a
            href="https://app.netlify.com/drop"
            target="_blank"
            rel="noreferrer"
            className="ch mt-2 ml-8 flex min-h-[42px] w-[calc(100%-2rem)] items-center justify-center gap-2 text-[13.5px] no-underline"
            style={{ color: "var(--c-tx)", background: "var(--c-card)" }}
          >
            <Icon n="export" /> Ouvrir Netlify Drop
          </a>
        </div>

        {/* 3 — installer */}
        <div className="mt-2 rounded-2xl border p-3" style={{ borderColor: "var(--c-bd)", background: "var(--c-bg2)" }}>
          <div className="flex items-baseline gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-extrabold" style={{ background: "var(--c-tx)", color: "var(--c-bg)" }}>
              3
            </span>
            <p className="text-[14px] font-bold leading-tight">Installe sur le téléphone</p>
          </div>
          <div className="mt-2 flex overflow-hidden rounded-xl border" style={{ borderColor: "var(--c-bd)" }} role="tablist">
            {TABS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className="min-h-[38px] flex-1 px-1 text-[12.5px] font-semibold"
                style={{
                  background: tab === id ? "var(--c-sel)" : "var(--c-card)",
                  color: tab === id ? "var(--c-selt)" : "var(--c-mu)",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <ol className="mt-2 space-y-1.5">
            {STEPS[tab].map((st, i) => (
              <li key={st.t} className="flex gap-2">
                <span className="w-3 shrink-0 text-[12px] font-bold" style={{ color: "var(--c-mu)" }}>
                  {i + 1}.
                </span>
                <p className="text-[12.5px] leading-snug">
                  <b>{st.t}</b>{" "}
                  <span style={{ color: "var(--c-mu)" }}>— {st.d}</span>
                </p>
              </li>
            ))}
          </ol>
          {canPrompt && (
            <button
              type="button"
              className="ch mt-2 w-full min-h-[42px] text-[13.5px]"
              style={{ background: "var(--c-tx)", borderColor: "var(--c-tx)", color: "var(--c-bg)" }}
              onClick={onInstall}
            >
              Installer maintenant (ce navigateur)
            </button>
          )}
        </div>

        {/* 4 — lancer */}
        <div className="mt-2 rounded-2xl border p-3" style={{ borderColor: "var(--c-bd)", background: "var(--c-bg2)" }}>
          <div className="flex items-baseline gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-extrabold" style={{ background: "var(--c-tx)", color: "var(--c-bg)" }}>
              4
            </span>
            <p className="text-[14px] font-bold leading-tight">Ouvre l'appli depuis son icône</p>
          </div>
          <p className="mt-1 pl-8 text-[12.5px] leading-snug" style={{ color: "var(--c-mu)" }}>
            C'est là qu'elle s'ouvre en plein écran. Dans un onglet, ni icône ni plein écran.
            {installed ? " Sur cet appareil, c'est déjà installé ✓" : ""}
          </p>
        </div>

        <button
          type="button"
          className="mt-2 w-full rounded-xl border px-3 py-2 text-left text-[12.5px] font-semibold"
          style={{ borderColor: "var(--c-sel)", background: "color-mix(in oklab, var(--c-sel) 10%, transparent)" }}
          onClick={onDiag}
        >
          Ça ne marche pas ? Lancer le diagnostic →
        </button>

        <a
          href="./guide-installation.html"
          target="_blank"
          rel="noreferrer"
          className="ch mt-2 flex min-h-[42px] w-full items-center justify-center gap-2 text-[13px] no-underline"
          style={{ background: "var(--c-card)", borderColor: "var(--c-bd)", color: "var(--c-tx)" }}
        >
          <span className="inline-flex items-center gap-1.5">
            <Icon n="export" /> Guide imprimable (papier / PDF)
          </span>
        </a>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" className="ch min-h-[42px] text-[13px]" onClick={copyLink} style={{ background: "var(--c-bg2)", borderColor: "var(--c-bd)", color: "var(--c-tx)" }}>
            <span className="inline-flex items-center gap-1.5">
              <Icon n={copied ? "check" : "copy"} /> {copied ? "Lien copié" : "Copier le lien"}
            </span>
          </button>
          <button type="button" className="ch min-h-[42px] text-[13px]" onClick={onClose} style={{ background: "var(--c-card)", borderColor: "var(--c-bd)", color: "var(--c-tx)" }}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Barre d'actions mobile (jeu)
   ============================================================ */
export function MobileBar({
  playing,
  onPlay,
  onEdit,
  onInstall,
  onFullscreen,
  fsActive,
  installable,
  visible,
}: {
  playing: boolean;
  onPlay: () => void;
  onEdit: () => void;
  onInstall: () => void;
  onFullscreen: () => void;
  fsActive: boolean;
  installable: boolean;
  visible: boolean;
}) {
  if (!visible) return null;
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 px-2 pb-[calc(8px+env(safe-area-inset-bottom,0px))] lg:hidden"
      style={{ pointerEvents: "none" }}
    >
      <div
        className="panel mx-auto flex max-w-[520px] items-center gap-1.5 p-1.5"
        style={{
          pointerEvents: "auto",
          borderRadius: 18,
          background: "color-mix(in oklab, var(--c-card) 88%, transparent)",
          backdropFilter: "blur(10px)",
        }}
      >
        <button
          type="button"
          className="ch min-h-[46px] flex-1 px-2 text-[13.5px]"
          style={{
            background: playing ? "var(--c-sel)" : "var(--c-card)",
            borderColor: playing ? "var(--c-sel)" : "var(--c-bd)",
            color: playing ? "var(--c-selt)" : "var(--c-tx)",
          }}
          onClick={onPlay}
        >
          <span className="inline-flex items-center gap-1.5">
            <Icon n={playing ? "stop" : "play"} /> {playing ? "Stop" : "Écouter"}
          </span>
        </button>
        <button
          type="button"
          data-edit
          className={cs("ch min-h-[46px] flex-1 px-2 text-[13.5px]")}
          style={{ background: "var(--c-card)", borderColor: "var(--c-bd)" }}
          onClick={onEdit}
        >
          <span className="inline-flex items-center gap-1.5">
            <Icon n="tune" /> Éditer
          </span>
        </button>
        <button
          type="button"
          className="ch grid h-[46px] w-[48px] place-items-center p-0"
          style={{
            background: fsActive ? "var(--c-yel)" : "var(--c-card)",
            borderColor: fsActive ? "var(--c-yel)" : "var(--c-bd)",
            color: fsActive ? "#1b1503" : "var(--c-tx)",
          }}
          onClick={onFullscreen}
          aria-label={fsActive ? "Quitter le plein écran" : "Passer en plein écran"}
          aria-pressed={fsActive}
          title={fsActive ? "Quitter le plein écran" : "Plein écran"}
        >
          <Icon n={fsActive ? "compress" : "expand"} />
        </button>
        <button
          type="button"
          className="ch relative grid h-[46px] w-[48px] place-items-center p-0"
          style={{
            background: installable ? "var(--c-tx)" : "var(--c-card)",
            borderColor: installable ? "var(--c-tx)" : "var(--c-bd)",
            color: installable ? "var(--c-bg)" : "var(--c-mu)",
          }}
          onClick={onInstall}
          aria-label="Installer l'application"
          title="Installer l'application sur le téléphone"
        >
          <Icon n={installable ? "plus" : "hand"} />
          {installable && (
            <span
              className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#e01b24]"
              aria-hidden="true"
            />
          )}
        </button>
      </div>
    </div>
  );
}
