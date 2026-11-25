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

/* ============================================================
   Choix / personnalisation de l'icône
   ============================================================ */
const VARIANTS = [
  {
    id: "dark",
    name: "Nuit",
    note: "Fond marine, soufflet rouge",
    file: "icon",
    colors: ["#0f141b", "#c4152b", "#ffd23f"],
  },
  {
    id: "light",
    name: "Papier",
    note: "Fond crème, soufflet vermillon",
    file: "light",
    colors: ["#f7f1e3", "#c4152b", "#16233a"],
  },
  {
    id: "gold",
    name: "Laiton",
    note: "Fond anthracite, soufflet doré",
    file: "gold",
    colors: ["#161b22", "#d9a52a", "#c4152b"],
  },
] as const;

export function IconSheet({
  open,
  onClose,
  current,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  current: string;
  onPick: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const zip = usePublishZip();
  if (!open) return null;
  const chosen = (current in ICON_META ? current : "dark") as IconVariant;

  const copySteps = async () => {
    const txt = [
      "Changer l'icône de la PWA Mes accords",
      "1. Télécharge les 3 PNG de la variante choisie (192, 512, 180).",
      "2. Remplace dist/icons/icon-192.png, icon-512.png et apple-touch-icon.png.",
      "3. Redéploie le dossier dist (ou pousse sur Git).",
      "4. Désinstalle l'appli de l'écran d'accueil puis réinstalle-la : l'icône est mise en cache par le système.",
      "Sur Android, si l'icône ne change toujours pas : Paramètres → Applications → Mes accords → Stockage → Vider le cache, puis réinstaller.",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(txt);
    } catch {}
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: "color-mix(in oklab, #05080c 66%, transparent)", backdropFilter: "blur(5px)" }}
      onClick={onClose}
    >
      <div
        className="sheet-in panel max-h-[92dvh] w-full max-w-[460px] overflow-y-auto rounded-b-none p-4 sm:rounded-b-[20px] sm:p-5"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom,0px))" }}
        role="dialog"
        aria-modal="true"
        aria-label="Icône de l'application"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--c-mu)" }}>
              Personnalisation
            </p>
            <h2 className="font-display text-[20px] font-extrabold leading-tight tracking-tight">
              Icône de l'appli
            </h2>
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

        <p className="mt-1.5 text-[12.5px] leading-snug" style={{ color: "var(--c-mu)" }}>
          L'icône installée sur l'écran d'accueil est lue dans le <b>manifest</b> : on choisit un jeu, on
          l'exporte, puis on le remplace dans le dossier déployé. Le système garde l'ancienne icône tant que
          l'appli n'est pas réinstallée.
        </p>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {VARIANTS.map((v) => {
            const on = current === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onPick(v.id)}
                className="rounded-2xl border p-1.5 text-left transition hover:-translate-y-0.5"
                style={{
                  borderColor: on ? "var(--c-sel)" : "var(--c-bd)",
                  background: on ? "color-mix(in oklab, var(--c-sel) 10%, transparent)" : "var(--c-bg2)",
                  boxShadow: on ? "0 0 0 1px var(--c-sel)" : "none",
                }}
                aria-pressed={on}
              >
                <img
                  src={`./icons/${v.file === "icon" ? "icon-512" : v.file + "-512"}.png`}
                  alt={`Icône ${v.name}`}
                  className="aspect-square w-full rounded-xl border object-cover"
                  style={{ borderColor: "var(--c-bd)" }}
                />
                <p className="mt-1 text-[12.5px] font-bold leading-tight">
                  {v.name} {on ? "✓" : ""}
                </p>
                <p className="text-[10.5px] leading-tight" style={{ color: "var(--c-mu)" }}>
                  {v.note}
                </p>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="ch mt-3 flex w-full min-h-[46px] items-center justify-center gap-2 text-[13.5px]"
          style={{ background: "var(--c-sel)", borderColor: "var(--c-sel)", color: "#fff" }}
          onClick={() => void zip.run(chosen)}
          disabled={zip.busy}
        >
          <Icon n={zip.done ? "check" : "export"} />
          {zip.busy ? zip.step || "Préparation…" : `Télécharger le paquet avec l'icône ${ICON_META[chosen].name}`}
        </button>
        {zip.err && (
          <p className="mt-2 rounded-lg px-2 py-1.5 text-[12px]" style={{ background: "color-mix(in oklab, var(--c-sel) 15%, transparent)", color: "var(--c-sel)" }}>
            {zip.err}
          </p>
        )}

        <div className="mt-3 space-y-1.5">
          {[
            ["1", "Choisis une icône ci-dessus, puis touche le bouton rouge : tu obtiens un ZIP."],
            ["2", "Sur Netlify (ton site) : onglet « Deploys » → « Deploy manually » → glisse le ZIP."],
            ["3", "Sur le téléphone : désinstalle l'ancienne icône, rouvre le lien, réinstalle."],
            ["4", "La nouvelle icône apparaît sur l'écran d'accueil."],
          ].map(([n, d]) => (
            <div key={n} className="flex gap-2.5">
              <span
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-extrabold"
                style={{ background: "var(--c-tx)", color: "var(--c-bg)" }}
              >
                {n}
              </span>
              <p className="text-[12.5px] leading-snug">{d}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {(() => {
            const v = VARIANTS.find((x) => x.id === current) ?? VARIANTS[0];
            const base = v.file === "icon" ? "icon" : v.file;
            return [
              { label: "512", href: `./icons/${base}-512.png`, name: "icon-512.png" },
              { label: "192", href: `./icons/${base}-192.png`, name: "icon-192.png" },
              {
                label: "iOS 180",
                href: v.file === "icon" ? "./icons/apple-touch-icon.png" : `./icons/${v.file}-apple-touch.png`,
                name: "apple-touch-icon.png",
              },
            ].map((d) => (
              <a
                key={d.label}
                href={d.href}
                download={d.name}
                className="ch flex min-h-[42px] items-center justify-center gap-1.5 text-[12.5px] no-underline"
                style={{ color: "var(--c-tx)" }}
              >
                <Icon n="export" /> {d.label}
              </a>
            ));
          })()}
        </div>

        <button
          type="button"
          className="ch mt-2 w-full text-[13px]"
          style={{ background: "var(--c-bg2)", borderColor: "var(--c-bd)", color: "var(--c-tx)" }}
          onClick={copySteps}
        >
          <span className="inline-flex items-center gap-2">
            <Icon n={copied ? "check" : "copy"} /> {copied ? "Étapes copiées" : "Copier les étapes"}
          </span>
        </button>

        <p className="mt-2 rounded-xl px-3 py-2 text-[11.5px] leading-snug" style={{ color: "var(--c-mu)", background: "var(--c-bg2)" }}>
          Pour utiliser <b>ta propre photo ou ton dessin</b> : mets une image carrée de 1024 px dans
          <code> public/icons/ma-icone.png</code>, lance <code>bash deploy/make-icons.sh public/icons/ma-icone.png</code>,
          puis redéploie et réinstalle. Android recadre l'icône en cercle : garde le motif au centre.
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   Diagnostic d'installation — explique précisément ce qui bloque
   ============================================================ */
function Check({
  ok,
  warn,
  label,
  value,
}: {
  ok: boolean;
  warn?: boolean;
  label: string;
  value: string;
}) {
  const color = ok ? "#22c55e" : warn ? "var(--c-yel)" : "var(--c-sel)";
  return (
    <div
      className="flex items-start gap-2.5 rounded-xl border px-2.5 py-2"
      style={{ borderColor: "var(--c-bd)", background: "var(--c-bg2)" }}
    >
      <span
        className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-extrabold"
        style={{ background: color, color: "#0b0f14" }}
        aria-hidden="true"
      >
        {ok ? "✓" : warn ? "!" : "✕"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold leading-tight">{label}</p>
        <p className="break-words text-[11.5px] leading-snug" style={{ color: "var(--c-mu)" }}>
          {value}
        </p>
      </div>
    </div>
  );
}

export function DiagSheet({
  open,
  onClose,
  status,
  installed,
  canPrompt,
  onInstall,
}: {
  open: boolean;
  onClose: () => void;
  status: PwaStatus;
  installed: boolean;
  canPrompt: boolean;
  onInstall: () => void;
}) {
  if (!open) return null;

  const good = status.secure && status.manifest && status.iconsOk && status.sw;
  const verdict = status.iframe
    ? "Cette page est affichée dans un cadre (aperçu / iframe) : l'installation y est impossible. Ouvre le lien directement dans le navigateur du téléphone."
    : !status.secure
      ? "L'adresse n'est pas en HTTPS : le téléphone refuse l'installation et le hors-ligne."
      : !status.manifest
        ? "Le fichier manifest.webmanifest n'est pas trouvé : sans lui, pas d'icône personnalisée ni de mode plein écran."
        : status.iconsOk === false
          ? "Les icônes du manifest renvoient une erreur 404 : le téléphone utilise alors une icône générique (lettre du site)."
          : !status.sw
            ? "Le service worker n'est pas actif : le hors-ligne ne fonctionne pas encore (recharge la page une fois)."
            : !installed
              ? "Tout est prêt techniquement, mais l'appli n'est pas encore installée : c'est l'installation sur l'écran d'accueil qui donne l'icône et le plein écran."
              : status.standalone
                ? "Tout est bon : l'appli tourne déjà comme une application installée."
                : "Tout est bon côté fichiers, mais la page est ouverte dans un onglet. Lance l'appli depuis son icône.";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: "color-mix(in oklab, #05080c 66%, transparent)", backdropFilter: "blur(5px)" }}
      onClick={onClose}
    >
      <div
        className="sheet-in panel max-h-[92dvh] w-full max-w-[480px] overflow-y-auto rounded-b-none p-4 sm:rounded-b-[20px] sm:p-5"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom,0px))" }}
        role="dialog"
        aria-modal="true"
        aria-label="Diagnostic d'installation"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--c-mu)" }}>
              Installation · diagnostic
            </p>
            <h2 className="font-display text-[20px] font-extrabold leading-tight tracking-tight">
              Pourquoi pas d'icône / plein écran ?
            </h2>
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

        <p
          className="mt-2 rounded-xl px-3 py-2.5 text-[13px] font-medium leading-snug"
          style={{
            background: good ? "color-mix(in oklab, #22c55e 12%, transparent)" : "color-mix(in oklab, var(--c-org) 13%, transparent)",
            color: "var(--c-tx)",
          }}
        >
          {verdict}
        </p>

        <div className="mt-3 space-y-1.5">
          <Check
            ok={status.secure}
            label="Adresse sécurisée (HTTPS)"
            value={status.secure ? "OK" : "Obligatoire : https:// (ou localhost). Une IP http:// ne suffit pas."}
          />
          <Check
            ok={status.manifest}
            warn={status.manifest && status.iconCount === null}
            label="Manifest chargé"
            value={
              !status.manifest
                ? "Fichier manifest.webmanifest introuvable à côté de index.html."
                : `Trouvé · ${status.manifestName ?? "sans nom"} · ${status.iconCount ?? "?"} icône(s)`
            }
          />
          <Check
            ok={status.iconsOk === true}
            label="Icônes du manifest accessibles"
            value={
              status.iconsOk === true
                ? "Les PNG 192 / 512 se chargent : l'icône personnalisée est disponible."
                : "Le téléphone affichera une icône générique. Vérifie que le dossier icons/ est déployé."
            }
          />
          <Check
            ok={status.sw}
            warn={!status.sw && status.secure}
            label="Service worker (hors-ligne)"
            value={status.sw ? "Actif" : "Pas encore actif : recharge la page une fois sur le site déployé."}
          />
          <Check
            ok={installed}
            warn={!installed}
            label="Installée sur cet appareil"
            value={
              installed
                ? "Oui — lance-la depuis son icône."
                : canPrompt
                  ? "Pas encore : utilise le bouton « Installer maintenant »."
                  : "Pas encore : menu du navigateur → « Installer l'application » (Safari : Partager → Sur l'écran d'accueil)."
            }
          />
          <Check
            ok={status.displayMode !== "browser"}
            warn={status.displayMode === "browser"}
            label="Mode d'affichage actuel"
            value={
              status.displayMode === "browser"
                ? "Navigateur (onglet). Une appli installée affiche « standalone » ou « fullscreen »."
                : status.displayMode
            }
          />
          {status.iframe && (
            <Check ok={false} label="Affichage en cadre (iframe)" value="Ouvre le lien hors de l'aperçu." />
          )}
        </div>

        <div className="mt-3 rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--c-bd)" }}>
          <p className="text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--c-mu)" }}>
            Les 3 erreurs les plus fréquentes
          </p>
          <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-[12.5px] leading-snug" style={{ color: "var(--c-mu)" }}>
            <li>
              <b style={{ color: "var(--c-tx)" }}>Seul index.html a été mis en ligne.</b> Il faut tout le
              dossier <code>dist/</code> : manifest, sw.js et le dossier <code>icons/</code>.
            </li>
            <li>
              <b style={{ color: "var(--c-tx)" }}>L'appli a été installée avant le déploiement.</b>{" "}
              Désinstalle l'icône, recharge le site, réinstalle.
            </li>
            <li>
              <b style={{ color: "var(--c-tx)" }}>La page est ouverte depuis un aperçu ou un onglet.</b> Une
              appli ne prend le plein écran et son icône qu'installée, lancée depuis son icône.
            </li>
          </ol>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="ch min-h-[44px] text-[13px]"
            style={{ background: "var(--c-bg2)", borderColor: "var(--c-bd)", color: "var(--c-tx)" }}
            onClick={() => window.location.reload()}
          >
            Recharger
          </button>
          <button
            type="button"
            className="ch min-h-[44px] text-[13px]"
            style={{ background: "var(--c-sel)", borderColor: "var(--c-sel)", color: "var(--c-selt)" }}
            onClick={onInstall}
          >
            Installer
          </button>
        </div>
      </div>
    </div>
  );
}
