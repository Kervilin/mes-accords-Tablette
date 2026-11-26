import { Icon } from "@/components/Chrome";
import { MAIN, OTH } from "@/lib/music";

/* ============================================================
   Menu des types d'accord (appui long au centre du joystick)
   ============================================================ */
export function ChordMenu({
  open,
  enr,
  onPick,
  onClose,
}: {
  open: boolean;
  enr: string;
  onPick: (v: string) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  const all: [string, string][] = [...MAIN, ...OTH];
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center"
      style={{ background: "color-mix(in oklab, #05080c 55%, transparent)", backdropFilter: "blur(3px)" }}
      onClick={onClose}
    >
      <div
        className="sheet-in panel w-full max-w-[420px] p-3"
        role="dialog"
        aria-modal="true"
        aria-label="Type d'accord"
        onClick={(e) => e.stopPropagation()}
      >
        <p
          className="mb-2 text-center text-[11px] font-bold uppercase tracking-[0.18em]"
          style={{ color: "var(--c-mu)" }}
        >
          Type d'accord
        </p>
        <div className="grid grid-cols-3 gap-2">
          {all.map(([v, l]) => {
            const on = enr === v;
            return (
              <button
                key={v}
                type="button"
                className="ch min-h-[52px] text-[16px] font-bold"
                style={{
                  background: on ? "var(--c-sel)" : "var(--c-card)",
                  borderColor: on ? "var(--c-sel)" : "var(--c-bd)",
                  color: on ? "var(--c-selt)" : "var(--c-tx)",
                }}
                onClick={() => {
                  onPick(v);
                  onClose();
                }}
                aria-pressed={on}
              >
                {l}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Mode d'emploi (une page écran)
   ============================================================ */
const SECTIONS: { t: string; items: string[] }[] = [
  {
    t: "Choisir un accord",
    items: [
      "Touche une note en haut (Do, Ré…) ou une touche du clavier : haut = poussé, bas = tiré.",
      "Touche le grand rond : 1re ligne Do, Ré… ; 2e ligne Parfait, 7, 9… ; 3e ligne Maj, Min et les tierces. Fais défiler les lignes au doigt.",
      "Maintiens ce rond 0,35 s pour entendre l'accord. Le son continue tant que tu appuies et s'arrête au relâchement.",
    ],
  },
  {
    t: "Lire le clavier",
    items: [
      "Rouge : touches à jouer · double cercle : fondamentale · italique : notes ajoutées (6, 7, 9).",
      "Touche une note rouge à droite : elle et les suivantes plus aiguës s'allument (fenêtre de jeu).",
      "Appui long sur une touche : ajoute-la à l'accord, même éteinte ; appui long à nouveau : retire-la. Le rond affiche les notes choisies et le nom s'il est reconnu.",
      "Pince à deux doigts pour agrandir ou réduire le clavier.",
    ],
  },
  {
    t: "Mode piano (balayage)",
    items: [
      "Balaye l'écran vers la gauche ou vers la droite : le clavier d'accordéon et le joystick laissent place à un piano d'une octave, de Do à Si. Balaye à nouveau (ou touche « Accordéon » sous le clavier) pour revenir.",
      "Touche une note : elle reste rouge et s'ajoute à la sélection. Touche-la à nouveau : elle est retirée. Les touches noires (Do♯, Ré♯, Fa♯, Sol♯, La♯) fonctionnent de la même façon.",
      "Le grand rond affiche d'abord la note seule, puis, dès deux notes, le nom de l'accord formé (ex. Sol + Si + Ré → Sol, La + Do + Mi → Lam, Do7…), quel que soit l'ordre des notes. Si la combinaison ne forme aucun accord connu, le nom est effacé.",
      "Touche le grand rond pour écouter, ou « Écouter l'accord ». « Effacer » vide la sélection.",
      "Au retour vers l'accordéon, les notes choisies sont conservées et replacées sur les touches du clavier (même pour un accord non reconnu). Les boutons « Effacer » et « Accordéon » se trouvent sous le clavier.",
    ],
  },
  {
    t: "Joystick (sous les basses)",
    items: [
      "Glisse ← tiré · → poussé (ou touche T / P).",
      "Appui long ↑ Majeur · ↓ mineur.",
      "Double-toucher au centre : Raz. Appui long au centre : menu des types d'accord.",
    ],
  },
  {
    t: "Boutons du haut",
    items: [
      "Liste : choisir un clavier enregistré · 💾 enregistrer sous · ⚙ éditer / nouveau clavier · 🗑 supprimer.",
      "☾/☀ thème · ⓘ affiche l'aide et ce mode d'emploi. Balaye l'écran à gauche pour le piano.",
      "Tierces : accords de gauche à 3 notes (un mineur affiche son équivalent, ex. Rém → Fa).",
    ],
  },
  {
    t: "Éditer un clavier",
    items: [
      "Touche une touche ou un [+] rouge, puis joue la note (micro) ou saisis-la (G#5, Sol#4…).",
      "∅ pas de note dans ce sens · 🗑 efface les 2 sens · Raz P/T efface tout · ± transpose.",
      "Annuler / Enregistrer… en haut. Une touche sans note disparaît, sauf entre deux touches.",
    ],
  },
  {
    t: "Clavier d'ordinateur",
    items: [
      "← tiré · → poussé · + majeur · − mineur · 1…9 types d'accord · Espace écouter.",
      "E édition · T tierces · Échap raz · ←/→ tiré/poussé · balayage : piano ou accordéon.",
    ],
  },
];

export function HelpSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center sm:items-center sm:p-4"
      style={{ background: "color-mix(in oklab, #05080c 70%, transparent)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="sheet-in panel flex max-h-[100dvh] w-full max-w-[640px] flex-col rounded-none sm:max-h-[92dvh] sm:rounded-[20px]"
        role="dialog"
        aria-modal="true"
        aria-label="Mode d'emploi"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between gap-3 border-b px-4 py-3"
          style={{ borderColor: "var(--c-bd)", paddingTop: "calc(0.75rem + env(safe-area-inset-top,0px))" }}
        >
          <h2 className="font-display text-[20px] font-extrabold tracking-tight">Mode d'emploi</h2>
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

        <div className="grid flex-1 gap-x-5 gap-y-3 overflow-y-auto px-4 py-3 text-[13px] leading-snug sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <section key={s.t}>
              <h3
                className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em]"
                style={{ color: "var(--c-sel)" }}
              >
                {s.t}
              </h3>
              <ul className="space-y-1" style={{ color: "var(--c-tx)" }}>
                {s.items.map((it, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden="true" style={{ color: "var(--c-mu)" }}>
                      •
                    </span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div
          className="border-t px-4 py-3"
          style={{ borderColor: "var(--c-bd)", paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom,0px))" }}
        >
          <button
            type="button"
            className="ch w-full"
            style={{ background: "var(--c-sel)", borderColor: "var(--c-sel)", color: "var(--c-selt)" }}
            onClick={onClose}
          >
            Compris
          </button>
        </div>
      </div>
    </div>
  );
}
