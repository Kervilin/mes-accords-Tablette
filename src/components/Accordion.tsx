import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import { allLeftGridSlots, allRightGridSlots, layout } from "@/lib/keyboard";
import {
  dKey,
  editRowNumbers,
  hasSlotNote,
  lKey,
  type EV,
  type EditState,
} from "@/lib/edit";
import { LT, btnId, btnLab, ld, pcOf, pn, type KB, type VM } from "@/lib/music";

const cs = (...x: (string | false | null | undefined)[]) => x.filter(Boolean).join(" ");
const V = (o: Record<string, string | number>) => o as CSSProperties;

/* ============================================================
   Soufflet : s'ouvre en tiré, se referme en poussé
   ============================================================ */


export function Bellows({
  open,
  playing,
  flush,
  className,
}: {
  open: number;
  playing?: boolean;
  flush?: boolean;
  className?: string;
}) {
  // ═══════════════════════════════════════════════════════════════
  // ⚙️ VARIABLES D'AJUSTEMENT (modifiez ces 4 valeurs)
  // ═══════════════════════════════════════════════════════════════
  const OUV = 76    // % d'ouverture (0-100)
  const MD = 20;    // % de marge fixe (0-100)
  const So: 'G' | 'D' = 'G';  // Sens : 'G' = vers Gauche, 'D' = vers Droite
  const Fi: 'D' | 'G' = 'D';  // Fixation : 'D' = à Droite, 'G' = à Gauche
  // ═══════════════════════════════════════════════════════════════

  const folds = Array.from({ length: 26 });
  const factor = Math.max(0, Math.min(1, (open - 24) / 56));

  console.log("🪗 Bellows : OUV=", OUV, "MD=", MD, "So=", So, "Fi=", Fi, "factor=", factor.toFixed(2));

  let leftPos: string;
  let rightPos: string;

  if (Fi === 'D' && So === 'G') {
    const leftFerme = 100 - MD;
    const leftOuvert = 100 - MD - OUV;
    leftPos = `calc(${leftFerme}% - ${(leftFerme - leftOuvert)}% * ${factor.toFixed(4)})`;
    rightPos = '0';
  } else if (Fi === 'G' && So === 'D') {
    const rightFerme = 100 - MD;
    const rightOuvert = 100 - MD - OUV;
    rightPos = `calc(${rightFerme}% - ${(rightFerme - rightOuvert)}% * ${factor.toFixed(4)})`;
    leftPos = '0';
  } else if (Fi === 'D' && So === 'D') {
    leftPos = `${100 - MD}%`;
    rightPos = `calc(${OUV}% * ${(1 - factor).toFixed(4)})`;
  } else {
    rightPos = `${100 - MD}%`;
    leftPos = `calc(${OUV}% * ${(1 - factor).toFixed(4)})`;
  }

  return (
    <div
      aria-hidden="true"
      className={cs("relative h-14 w-full overflow-hidden rounded-xl border", className)}
      style={{
        borderColor: "var(--c-bd)",
        background: "linear-gradient(180deg, var(--c-card2), var(--c-card))",
        ...(flush
          ? { borderRadius: 0, borderLeftWidth: 0, borderRightWidth: 0, borderTopWidth: 0 }
          : null),
      }}
    >
      <div
        className="absolute inset-y-[3px]"
        style={{
          left: leftPos,
          right: rightPos,
          transition:
            "left .85s cubic-bezier(.34,.86,.24,1), right .85s cubic-bezier(.34,.86,.24,1)",
        }}
      >
        <div
          className="absolute inset-y-0 left-0 w-8 rounded-[7px] border border-black/40"
          style={{
            background: "linear-gradient(180deg,#a8b2c0,#5a6472 42%,#2c333e)",
            boxShadow: "0 6px 14px -6px rgba(0,0,0,.85), inset 0 1px 0 rgba(255,255,255,.4)",
          }}
        >
          {[0.22, 0.5, 0.78].map((t) => (
            <span key={t} className="absolute left-1/2 h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-black/45 shadow-[inset_0_1px_0_rgba(255,255,255,.5)]" style={{ top: `${t * 100}%` }} />
          ))}
        </div>
        <div
          className="absolute inset-y-0 right-0 w-8 rounded-[7px] border border-black/40"
          style={{
            background: "linear-gradient(180deg,#a8b2c0,#5a6472 42%,#2c333e)",
            boxShadow: "0 6px 14px -6px rgba(0,0,0,.85), inset 0 1px 0 rgba(255,255,255,.4)",
          }}
        >
          {[0.22, 0.5, 0.78].map((t) => (
            <span key={t} className="absolute left-1/2 h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-black/45 shadow-[inset_0_1px_0_rgba(255,255,255,.5)]" style={{ top: `${t * 100}%` }} />
          ))}
        </div>
        <div className="absolute inset-y-[3px] left-8 right-8 flex items-stretch overflow-hidden">
          {folds.map((_, i) => (
            <div
              key={i}
              className="h-full min-w-0 flex-1"
              style={{
                clipPath: i % 2 ? "polygon(0 9%, 100% 0, 100% 91%, 0 100%)" : "polygon(0 0, 100% 9%, 100% 100%, 0 91%)",
                background: i % 2
                  ? "linear-gradient(90deg, rgba(0,0,0,.55), color-mix(in oklab, var(--c-sel) 78%, #1a070c) 48%, rgba(0,0,0,.6))"
                  : "linear-gradient(90deg, rgba(0,0,0,.3), color-mix(in oklab, var(--c-sel) 34%, #2b0e14) 52%, rgba(0,0,0,.42))",
              }}
            />
          ))}
        </div>
      </div>
      {playing && (
        <div className="breathe pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 130% at 50% 50%, color-mix(in oklab, var(--c-yel) 40%, transparent), transparent 70%)" }} />
      )}
    </div>
  );
}

   /* ============================================================
   Joystick tactile (sous le clavier gauche, remplace Raz)
   ← tiré · → poussé · ↑ majeur · ↓ mineur · double-toucher = Raz
   ============================================================ */
export type JoyDir = "left" | "right" | "up" | "down" | null;

/**
 * Calcul de direction adapté à l'usage réel :
 * - Les mouvements horizontaux (gauche = tiré, droite = poussé) peuvent déborder
 *   largement vers le haut ou vers le bas (cône large à ~2:1, soit ±26° de la verticale).
 * - Les mouvements verticaux (haut = majeur, bas = mineur) doivent être bien plus
 *   précis et verticaux (|dy| >= 2 * |dx|) pour ne pas changer accidentellement le mode.
 */
export function dirFromVector(dx: number, dy: number, threshold: number): JoyDir {
  if (Math.hypot(dx, dy) < threshold) return null;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  // Haut / Bas très précis : le doigt doit aller nettement verticalement
  if (absY >= 2 * absX) {
    return dy > 0 ? "down" : "up";
  }
  // Tout le reste (y compris en débordant vers le haut/bas) part en Gauche / Droite
  return dx > 0 ? "right" : "left";
}

const buzz = (pattern: number | number[]) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* non supporté (iPhone) */
  }
};

function Joystick({
  width,
  height,
  buttonD,
  cd,
  dir,
  mode,
  modeLocked,
  onDir,
  onMode,
  onRaz,
  onMenu,
  isEdit = false,
}: {
  width: number;
  height: number;
  buttonD: number;
  cd: number;
  dir: 0 | 1;
  mode: "maj" | "min";
  modeLocked: boolean;
  onDir: (d: 0 | 1) => void;
  onMode: (m: "maj" | "min") => void;
  onRaz: () => void;
  /** appui long au centre : ouvre le menu des types d'accord */
  onMenu?: () => void;
  isEdit?: boolean;
}) {
  // Taille demandée : un bouton du clavier + 50 % (Dm × 1.5),
  // borné pour rester dans le boîtier et sous le grand cadran Poussé/Tiré.
  // Taille demandée : bouton du clavier × 2 (borné pour tenir dans son emplacement)
  void cd;
  const targetDiam = Math.round(buttonD * 2);
  const knob = Math.max(buttonD + 4, Math.min(width - 4, height - 4, targetDiam));
  // Course de déplacement (relative au point où l'on pose le doigt)
  const maxR = Math.max(14, Math.min(34, Math.round(knob * 0.24)));
  const fireAt = maxR * 0.42;
  const releaseAt = maxR * 0.18;
  /** tolérance de mouvement pour un clic long (px) */
  const LONG_TOL = 8;
  /** durée d'un clic long (ms) */
  const LONG_MS = 350;

  const [active, setActive] = useState<JoyDir>(null);
  const [flash, setFlash] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);
  const fired = useRef<JoyDir>(null);
  const pid = useRef(-1);
  const t0 = useRef(0);
  const lastTap = useRef(0);
  const holdTimer = useRef<number | null>(null);
  const heldDir = useRef<"up" | "down" | null>(null);
  const longTimer = useRef<number | null>(null);
  const longFired = useRef(false);
  const start = useRef({ x: 0, y: 0 });

  const centerOf = () => {
    const el = boxRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  const clearHold = () => {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    heldDir.current = null;
  };

  const moveKnob = (dx: number, dy: number, snap: boolean) => {
    const k = knobRef.current;
    if (!k) return;
    k.style.transition = snap ? "transform .22s cubic-bezier(.2,.9,.25,1.2)" : "none";
    k.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  };

  const fire = (d: Exclude<JoyDir, null>) => {
    if (d === "left") {
      clearHold();
      onDir(1);
      buzz(12);
    } else if (d === "right") {
      clearHold();
      onDir(0);
      buzz(12);
    } else if (d === "up" || d === "down") {
      if (modeLocked) {
        clearHold();
        return;
      }
      // Majeur et mineur ne sont modifiés que si on maintient la direction (LONG_MS)
      if (heldDir.current !== d) {
        clearHold();
        heldDir.current = d;
        holdTimer.current = window.setTimeout(() => {
          if (heldDir.current === "up") onMode("maj");
          else if (heldDir.current === "down") onMode("min");
          buzz([15, 30, 20]);
          clearHold();
        }, LONG_MS);
      }
    }
  };

  const cancelLong = () => {
    if (longTimer.current !== null) {
      window.clearTimeout(longTimer.current);
      longTimer.current = null;
    }
  };

  /** zone touchée dans le rond : Majeur (haut), mineur (bas), T (gauche), P (droite) */
  const zoneAt = (x: number, y: number): JoyDir => {
    const c = centerOf();
    const vx = x - c.x;
    const vy = y - c.y;
    if (Math.hypot(vx, vy) < knob * 0.17) return null; // centre
    return Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? "right" : "left") : vy > 0 ? "down" : "up";
  };
  const isCenter = (x: number, y: number) => {
    const c = centerOf();
    return Math.hypot(x - c.x, y - c.y) < knob * 0.17;
  };

  /** action sur une étiquette : P / T immédiat, Majeur / mineur après l'appui long */
  const fireNow = (d: Exclude<JoyDir, null>) => {
    if (d === "left") onDir(1);
    else if (d === "right") onDir(0);
    else if (modeLocked) return;
    else onMode(d === "up" ? "maj" : "min");
    buzz(d === "left" || d === "right" ? 12 : [15, 30, 20]);
  };

  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (pid.current !== -1) return;
    pid.current = e.pointerId;
    t0.current = performance.now();
    start.current = { x: e.clientX, y: e.clientY };
    longFired.current = false;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const z = zoneAt(e.clientX, e.clientY);
    cancelLong();
    if (z === "left" || z === "right") {
      // P / T : action immédiate dès que le doigt touche l'étiquette (aucun délai)
      longFired.current = true;
      setActive(z);
      fireNow(z);
    } else if (z) {
      // Majeur / mineur : appui long (LONG_MS) pour éviter les changements accidentels
      longTimer.current = window.setTimeout(() => {
        longTimer.current = null;
        if (pid.current === -1) return;
        longFired.current = true;
        setActive(z);
        fireNow(z);
      }, LONG_MS);
    } else if (onMenu && isCenter(e.clientX, e.clientY)) {
      // centre : appui long → menu des types d'accord (le double-toucher reste le Raz)
      longTimer.current = window.setTimeout(() => {
        longTimer.current = null;
        if (pid.current === -1) return;
        longFired.current = true;
        lastTap.current = 0;
        buzz(18);
        onMenu();
      }, LONG_MS + 100);
    }
  };

  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== pid.current) return;
    let dx = e.clientX - start.current.x;
    let dy = e.clientY - start.current.y;
    if (Math.hypot(dx, dy) > LONG_TOL) cancelLong();
    if (longFired.current) return; // clic long déjà déclenché : on ne glisse plus
    const m = Math.hypot(dx, dy);
    if (m > maxR) {
      dx = (dx / m) * maxR;
      dy = (dy / m) * maxR;
    }
    moveKnob(Math.round(dx * 10) / 10, Math.round(dy * 10) / 10, false);
    const d = dirFromVector(dx, dy, fireAt);
    if (!d) {
      if (Math.hypot(dx, dy) < releaseAt) {
        fired.current = null;
        setActive(null);
        clearHold();
      }
      return;
    }
    setActive(d);
    if (d !== fired.current) {
      fired.current = d;
      fire(d);
    }
  };

  const endDrag = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== pid.current) return;
    pid.current = -1;
    clearHold();
    cancelLong();
    const moved = Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y);
    const dt = performance.now() - t0.current;
    if (!longFired.current && moved < 12 && dt < 400) {
      const now = performance.now();
      if (now - lastTap.current < 350) {
        lastTap.current = 0;
        setFlash(true);
        window.setTimeout(() => setFlash(false), 280);
        buzz([25, 40, 25]);
        onRaz();
      } else {
        lastTap.current = now;
      }
    }
    fired.current = null;
    setActive(null);
    moveKnob(0, 0, true);
  };

  const joyColor = dir === 1 ? "var(--c-yel)" : "var(--c-org)";

  const dirItem = (
    which: Exclude<JoyDir, null>,
    text: string,
    pos: Record<string, string | number>,
    isMode = false,
  ) => {
    const on = active === which;
    const isCurrent =
      which === "left"
        ? dir === 1
        : which === "right"
          ? dir === 0
          : which === "up"
            ? mode === "maj"
            : mode === "min";
    const isLocked = isMode && modeLocked;

    // Pour Majeur / mineur : plus grand, et surtout plus gras qd actifs
    // Pour P / T : lettres nettes à gauche et droite
    return (
      <span
        className={cs(
          "joy-item",
          isMode ? "joy-item-mode" : "joy-item-dir",
          isCurrent && "joy-item-current",
          on && "joy-item-active",
          isLocked && "joy-item-locked",
        )}
        style={V({ ...pos })}
      >
        {text}
      </span>
    );
  };

  return (
    <div
      ref={boxRef}
      className={cs("joy", isEdit && "joy-edit")}
      style={V({ width: `${width}px`, height: `${height}px` })}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Le rond lui-même est le bouton joystick complet :
          il a le look des boutons (.c) avec son relief 3D,
          prend la couleur Poussé (orange) / Tiré (jaune),
          bouge avec le doigt (haut, bas, gauche, droite),
          contient les textes P, T, Majeur, mineur,
          et déclenche Raz au double-toucher sans afficher le texte RAZ. */}
      <div
        ref={knobRef}
        className={cs("joy-btn", flash && "joy-flash")}
        role="button"
        tabIndex={0}
        aria-label="Bouton de commande : gauche T (tiré), droite P (poussé), haut Majeur (appui long), bas mineur (appui long), double appui Raz, appui long au centre : types d'accord"
        title={
          isEdit
            ? "Bouton de commande : glisse ← T (tiré) · → P (poussé) · double-toucher = Raz sens courant"
            : "Glisse ← T (tiré) · → P (poussé) · ↑ Majeur (appui long) · ↓ mineur (appui long) · double-toucher = Raz"
        }
        style={V({
          width: `${knob}px`,
          height: `${knob}px`,
          // textes proportionnels à la taille du rond (lisibles même réduit)
          fontSize: `${Math.max(7, Math.round(knob / 8.5))}px`,
          "--bc": joyColor,
        })}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            onDir(1);
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            onDir(0);
          } else if (e.key === "ArrowUp" && !modeLocked) {
            e.preventDefault();
            onMode("maj");
          } else if (e.key === "ArrowDown" && !modeLocked) {
            e.preventDefault();
            onMode("min");
          }
        }}
      >
        {/* Textes intégrés DANS le rond : Majeur en haut, mineur en bas, T à gauche, P à droite */}
        {dirItem(
          "up",
          "Majeur",
          { top: "11%", left: "50%", transform: "translateX(-50%)" },
          true,
        )}
        {dirItem(
          "down",
          "mineur",
          { bottom: "11%", left: "50%", transform: "translateX(-50%)" },
          true,
        )}
        {dirItem(
          "left",
          "T",
          { left: "12%", top: "50%", transform: "translateY(-50%)" },
          false,
        )}
        {dirItem(
          "right",
          "P",
          { right: "12%", top: "50%", transform: "translateY(-50%)" },
          false,
        )}

        {/* Centre sobre : indicateur tactile subtil sans texte RAZ */}
        <div className="joy-center-pip" aria-hidden="true" />
      </div>
    </div>
  );
}

/* ============================================================
   Clavier
   ============================================================ */
/* ============================================================
   Carte de l'accord (le grand rond central)
   - toucher court  → ouvre le réglage (fondamentale, mode, majeur/mineur, tierces)
   - appui long     → joue l'accord tant que le doigt reste posé
   ============================================================ */
function ChordCard(p: {
  style: CSSProperties;
  interactive: boolean;
  onOpen?: () => void;
  onPressStart?: () => void;
  onHoldStart?: () => void;
  onHoldEnd?: () => void;
  children: React.ReactNode;
}) {
  const callbacks = useRef(p);
  callbacks.current = p;
  const timer = useRef<number | null>(null);
  const tapTimer = useRef<number | null>(null);
  const down = useRef<{
    id: number;
    x: number;
    y: number;
    bounds: DOMRect;
    target: HTMLButtonElement;
  } | null>(null);
  const held = useRef(false);
  const skipClick = useRef(false);
  const [visual, setVisual] = useState<"idle" | "pressed" | "holding">("idle");

  const clearTimer = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  const clearTap = () => {
    if (tapTimer.current !== null) window.clearTimeout(tapTimer.current);
    tapTimer.current = null;
  };
  const finish = (updateVisual = true) => {
    const press = down.current;
    down.current = null;
    clearTimer();
    const wasHeld = held.current;
    held.current = false;
    if (wasHeld) callbacks.current.onHoldEnd?.();
    if (updateVisual) setVisual("idle");
    try {
      if (press?.target.hasPointerCapture(press.id)) press.target.releasePointerCapture(press.id);
    } catch { /* The browser may already have released capture. */ }
    return wasHeld;
  };
  const cancel = (updateVisual = true) => {
    skipClick.current = true;
    clearTap();
    finish(updateVisual);
  };
  const cancelRef = useRef(cancel);
  cancelRef.current = cancel;

  useEffect(() => {
    const onBlur = () => cancelRef.current();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") cancelRef.current();
    };
    const onOtherPointer = (event: PointerEvent) => {
      if (down.current && event.pointerId !== down.current.id) cancelRef.current();
    };
    const onOutsideRelease = (event: PointerEvent) => {
      if (down.current?.id === event.pointerId) cancelRef.current();
    };
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("pointerdown", onOtherPointer, true);
    window.addEventListener("pointerup", onOutsideRelease);
    window.addEventListener("pointercancel", onOutsideRelease);
    return () => {
      cancelRef.current(false);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("pointerdown", onOtherPointer, true);
      window.removeEventListener("pointerup", onOutsideRelease);
      window.removeEventListener("pointercancel", onOutsideRelease);
    };
  }, []);

  useEffect(() => {
    if (!p.interactive) cancelRef.current();
  }, [p.interactive]);

  const open = () => {
    clearTap();
    if (!callbacks.current.interactive || skipClick.current) return;
    skipClick.current = true;
    callbacks.current.onOpen?.();
  };
  const onDown = (event: RPointerEvent<HTMLButtonElement>) => {
    if (!p.interactive || down.current || event.isPrimary === false || event.button !== 0) return;
    clearTap();
    clearTimer();
    skipClick.current = false;
    held.current = false;
    down.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      bounds: event.currentTarget.getBoundingClientRect(),
      target: event.currentTarget,
    };
    // Resume Web Audio during the user gesture, not later inside the timeout.
    p.onPressStart?.();
    setVisual("pressed");
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch { /* Older WebViews still have the window release listener. */ }
    timer.current = window.setTimeout(() => {
      timer.current = null;
      if (!down.current || !callbacks.current.interactive) return;
      held.current = true;
      skipClick.current = true;
      setVisual("holding");
      callbacks.current.onHoldStart?.();
    }, 350);
  };
  const onUp = (event: RPointerEvent<HTMLButtonElement>) => {
    if (down.current?.id !== event.pointerId) return;
    const wasHeld = finish();
    if (wasHeld || skipClick.current) return;
    // Usually the native button click opens the dialog. This fallback also
    // covers Android WebViews that omit that click after a touch release.
    if (event.pointerType !== "mouse") tapTimer.current = window.setTimeout(open, 80);
  };
  return (
    <button
      type="button"
      className={cs("chord-card", visual !== "idle" && "chord-card-pressed", visual === "holding" && "chord-card-sounding")}
      style={p.style}
      disabled={!p.interactive}
      aria-haspopup="dialog"
      aria-label={p.interactive ? "Accord : toucher pour régler, appui long pour l'entendre" : undefined}
      onPointerDown={onDown}
      onPointerMove={(event) => {
        const press = down.current;
        if (!press || press.id !== event.pointerId) return;
        const { left, right, top, bottom } = press.bounds;
        const outside = event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom;
        const moving = !held.current && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 12;
        if (outside || moving) cancel();
      }}
      onPointerUp={onUp}
      onPointerCancel={() => cancel()}
      onLostPointerCapture={(event) => {
        if (down.current?.id === event.pointerId) cancel();
      }}
      onClick={(event) => {
        event.stopPropagation();
        open();
      }}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.stopPropagation();
          if (event.repeat) event.preventDefault();
          else skipClick.current = false;
        }
      }}
    >
      {p.children}
    </button>
  );
}

/** A long touch toggles a key without also firing its normal short-click action. */
function PlayKey({
  className,
  style,
  title,
  onShort,
  onLong,
  children,
}: {
  className: string;
  style: CSSProperties;
  title: string;
  onShort: () => void;
  onLong: () => void;
  children: React.ReactNode;
}) {
  const timer = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const skipClick = useRef(false);
  const clear = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clear, []);

  return (
    <div
      className={className}
      style={style}
      role="button"
      tabIndex={0}
      title={title}
      onPointerDown={(e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        skipClick.current = false;
        origin.current = { x: e.clientX, y: e.clientY };
        clear();
        timer.current = window.setTimeout(() => {
          timer.current = null;
          skipClick.current = true;
          buzz(12);
          onLong();
        }, 420);
      }}
      onPointerMove={(e) => {
        if (Math.hypot(e.clientX - origin.current.x, e.clientY - origin.current.y) > 12) {
          clear();
          skipClick.current = true;
        }
      }}
      onPointerUp={clear}
      onPointerCancel={() => {
        clear();
        skipClick.current = true;
      }}
      onPointerLeave={clear}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (!skipClick.current) onShort();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onShort();
        }
      }}
    >
      {children}
    </div>
  );
}

export type KeyboardViewProps = {
  kb: KB;
  width: number;
  /** hauteur disponible : le clavier s'y ajuste automatiquement */
  maxH?: number;
  /** taille choisie au pincement (fraction de la taille pleine largeur), null = automatique */
  zoom?: number | null;
  vm: VM;
  edit: EditState | null;
  live: { pc: number | null; oct: number | null };
  mode: "maj" | "min";
  onDir: (d: 0 | 1) => void;
  onMode: (m: "maj" | "min") => void;
  onRight: (id: string) => void;
  onLongRight?: (id: string) => void;
  onRightRoot: (b: { m: [number, number] }, d: 0 | 1) => void;
  onLeft: (ix: number, d: 0 | 1) => void;
  onLongLeft?: (ix: number) => void;
  onEditRight: (key: string) => void;
  onEditLeft: (key: string) => void;
  onRaz: () => void;
  onMenu?: () => void;
  /** carte de l'accord : toucher = réglage, appui long = son tenu */
  onCardOpen?: () => void;
  onCardPressStart?: () => void;
  onCardHoldStart?: () => void;
  onCardHoldEnd?: () => void;
};

export function KeyboardView(p: KeyboardViewProps) {
  const { kb, width, vm, edit, live } = p;
  const { g, U, Dm, W0, Wr, Hr, Cd, lt, Hl, Hc, joyH } = layout(kb, width, !!edit, {
    maxH: p.maxH,
    zoom: p.zoom,
  });
  const d: 0 | 1 = edit ? edit.dir : vm.d;
  const bc = d ? "var(--c-yel)" : "var(--c-org)";
  const none = vm.none && !edit;
  const root = vm.cp.length ? vm.cp[0] : -1;

  const val = (key: string, dd: 0 | 1): EV | null | undefined =>
    edit ? (edit.vals[key] ? edit.vals[key][dd] : undefined) : null;

  const fmtRightEdit = (key: string, dd: 0 | 1, isListen: boolean) => {
    if (isListen && edit?.dir === dd && live.pc !== null && live.oct !== null) {
      return pn(live.pc) + live.oct;
    }
    const cur = val(key, dd);
    if (cur && cur.pc !== null && cur.oct !== null) return pn(cur.pc) + cur.oct;
    return "—";
  };

  const fmtLeftEdit = (key: string, dd: 0 | 1, isListen: boolean, up: boolean) => {
    if (isListen && edit?.dir === dd && live.pc !== null) {
      return up ? LT[live.pc] : LT[live.pc].toLowerCase();
    }
    const cur = val(key, dd);
    if (cur && cur.pc !== null) {
      const raw = cur.lab && cur.lab !== "?" ? cur.lab : up ? LT[pcOf(cur.pc)] : LT[pcOf(cur.pc)].toLowerCase();
      return ld(raw);
    }
    return "—";
  };

  /* ---- main droite ---- */
  const renderRight = () => {
    if (edit) {
      const numMaps = [
        editRowNumbers(0, edit.vals, edit.listen),
        editRowNumbers(1, edit.vals, edit.listen),
        editRowNumbers(2, edit.vals, edit.listen),
      ];
      return allRightGridSlots().map((s) => {
        const key = dKey(s.r, s.slot);
        const isListen = edit.side === "d" && edit.listen === key;
        const active = hasSlotNote(edit.vals[key]) || isListen;

        if (!active) {
          return (
            <button
              key={"pr-" + key}
              type="button"
              className="plbtn"
              title="Ajouter une touche à cet emplacement"
              style={V({
                left: `${s.x * U + Dm / 2}px`,
                top: `${(g.maxU - s.u) * U + Dm / 2}px`,
              })}
              onClick={(e) => {
                e.stopPropagation();
                p.onEditRight(key);
              }}
            >
              +
            </button>
          );
        }

        const n = numMaps[s.r].get(s.slot) ?? s.slot + 1;
        const badge = n + (["", "′", "″"][s.r] ?? "");
        const n0 = fmtRightEdit(key, 0, isListen);
        const n1 = fmtRightEdit(key, 1, isListen);
        const pos = V({ left: `${s.x * U}px`, top: `${(g.maxU - s.u) * U}px` });

        return (
          <div
            key={"er-" + key}
            className={cs("w cand", isListen && "listen")}
            style={pos}
            onClick={() => p.onEditRight(key)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                p.onEditRight(key);
              }
            }}
          >
            <div className="c dual edit-dual">
              <i
                className={cs(edit.dir !== 0 && "off-dir", n0 === "—" && "empty-slot")}
                style={edit.dir === 0 ? V({ background: "var(--c-org)", color: "#1b1005" }) : undefined}
              >
                {n0}
              </i>
              <i
                className={cs(edit.dir !== 1 && "off-dir", n1 === "—" && "empty-slot")}
                style={edit.dir === 1 ? V({ background: "var(--c-yel)", color: "#1b1503" }) : undefined}
              >
                {n1}
              </i>
            </div>
            <em>{badge}</em>
          </div>
        );
      });
    }

    return kb.b.map((b) => {
      const k = btnId(b);
      const pos = V({ left: `${b.x * U}px`, top: `${(g.maxU - b.u) * U}px` });

      if (none) {
        return (
          <div key={k} className="w cand" style={pos}>
            <div className="c dual">
              <i onClick={() => b.m[0] > 0 && p.onRightRoot(b, 0)}>{b.m[0] > 0 ? pn(b.m[0]) : "—"}</i>
              <i onClick={() => b.m[1] > 0 && p.onRightRoot(b, 1)}>{b.m[1] > 0 ? pn(b.m[1]) : "—"}</i>
            </div>
            <em>{btnLab(b)}</em>
          </div>
        );
      }

      const pc = pcOf(b.m[d]);
      const isCand = b.m[d] > 0 && vm.cp.includes(pc);
      const sel = vm.selected.has(k);
      return (
        <PlayKey
          key={k}
          className={cs("w", isCand ? "cand" : "dim", vm.roots.has(k) && "root")}
          style={pos}
          onShort={() => {
            if (isCand) p.onRight(k);
            else if (b.m[d] > 0) p.onRightRoot(b, d);
          }}
          onLong={() => {
            if (b.m[d] > 0) p.onLongRight?.(k);
          }}
          title="Toucher : choisir la note. Appui long : ajouter ou retirer cette touche de l'accord."
        >
          <div
            className={cs("c", d ? "pl" : "ph", sel && "sel", vm.q4.includes(pc) && "it")}
            style={V({ "--bc": bc })}
          >
            {b.m[d] > 0 ? pn(b.m[d]) : "—"}
          </div>
          <em>{btnLab(b)}</em>
        </PlayKey>
      );
    });
  };

  /* ---- main gauche ---- */
  const renderLeft = () => {
    if (edit) {
      return allLeftGridSlots().map((s) => {
        const key = lKey(s.j, s.i);
        const isListen = edit.side === "l" && edit.listen === key;
        const active = hasSlotNote(edit.vals[key]) || isListen;

        if (!active) {
          return (
            <button
              key={"pl-" + key}
              type="button"
              className="plbtn"
              title={`Ajouter ${s.up ? "une basse (majuscule)" : "un accord (minuscule)"} (colonne ${s.j + 1})`}
              style={V({
                left: `${s.j * U + Dm / 2}px`,
                top: `${s.i * U + Dm / 2}px`,
              })}
              onClick={(e) => {
                e.stopPropagation();
                p.onEditLeft(key);
              }}
            >
              +
            </button>
          );
        }

        const l0 = fmtLeftEdit(key, 0, isListen, s.up);
        const l1 = fmtLeftEdit(key, 1, isListen, s.up);
        const pos = V({ left: `${s.j * U}px`, top: `${s.i * U}px` });

        return (
          <div
            key={"el-" + key}
            className={cs("w cand", isListen && "listen")}
            style={pos}
            onClick={() => p.onEditLeft(key)}
            role="button"
            tabIndex={0}
            title={s.up ? "Basse" : "Accord"}
          >
            <div className="c dual edit-dual">
              <i
                className={cs(edit.dir !== 0 && "off-dir", l0 === "—" && "empty-slot")}
                style={edit.dir === 0 ? V({ background: "var(--c-org)", color: "#1b1005" }) : undefined}
              >
                {l0}
              </i>
              <i
                className={cs(edit.dir !== 1 && "off-dir", l1 === "—" && "empty-slot")}
                style={edit.dir === 1 ? V({ background: "var(--c-yel)", color: "#1b1503" }) : undefined}
              >
                {l1}
              </i>
            </div>
          </div>
        );
      });
    }

    return kb.l.map((x, ix) => {
      const pos = V({ left: `${x.j * U}px`, top: `${x.i * U}px` });

      if (none) {
        return (
          <div key={ix} className="w cand" style={pos}>
            <div className="c dual">
              <i onClick={() => x.k[0] >= 0 && p.onLeft(ix, 0)}>{x.k[0] >= 0 ? ld(x.lab[0]) : "—"}</i>
              <i onClick={() => x.k[1] >= 0 && p.onLeft(ix, 1)}>{x.k[1] >= 0 ? ld(x.lab[1]) : "—"}</i>
            </div>
          </div>
        );
      }

      const k = x.k[d];
      const pick = vm.leftPick.has(ix);
      const alt = vm.leftAlt.has(ix);
      return (
        <PlayKey
          key={ix}
          className={cs("w cand", !pick && !alt && "dim", alt && "alt", pick && k === root && "root")}
          style={pos}
          onShort={() => {
            if (k >= 0) p.onLeft(ix, d);
          }}
          onLong={() => {
            if (k >= 0) p.onLongLeft?.(ix);
          }}
          title={`${x.up ? "Basse" : "Accord"}. Appui long : ajouter ou retirer cette touche.`}
        >
          <div
            className={cs("c", d ? "pl" : "ph", pick && "sel", vm.q4.includes(k) && "it")}
            style={V({ "--bc": bc })}
            data-l={`${ix}-${d}`}
          >
            {k >= 0 ? ld(x.lab[d]) : "—"}
          </div>
        </PlayKey>
      );
    });
  };

  return (
    <div
      className="kb"
      style={V({
        "--D": `${Dm}px`,
        "--bc": bc,
        gap: `${Math.round(U * 0.26)}px`,
      })}
    >
      {/* colonne gauche : composition de l'accord + basses + joystick */}
      <div className="col" style={V({ width: `${W0}px`, height: `${Hc}px` })}>
        <ChordCard
          interactive={!edit}
          onOpen={p.onCardOpen}
          onPressStart={p.onCardPressStart}
          onHoldStart={p.onCardHoldStart}
          onHoldEnd={p.onCardHoldEnd}
          style={V({
            left: `${Math.round((W0 - Cd) / 2)}px`,
            top: 0,
            width: `${Cd}px`,
            height: `${Cd}px`,
            borderColor: bc,
            boxShadow: `0 0 0 3px color-mix(in oklab, ${bc} 26%, transparent), 0 12px 26px -16px rgba(0,0,0,.9)`,
          })}
        >
          <span className="cc-name" style={V({ fontSize: `${Math.round(Cd * 0.2)}px` })}>
            {vm.name}
          </span>
          <span className="cc-notes" style={V({ fontSize: `${Math.round(Cd * 0.115)}px` })}>
            {vm.notes.length
              ? vm.notes.map((n, i) => (
                  <span key={i} className={cs(n.added && "cc-added")}>
                    {pn(n.p)}
                    {i < vm.notes.length - 1 ? <span className="cc-sep">·</span> : null}
                  </span>
                ))
              : "Touche une note"}
          </span>
        </ChordCard>

        <div
          className="hand"
          style={V({ position: "absolute", left: 0, top: `${lt}px`, width: `${W0}px`, height: `${Hl}px` })}
        >
          {renderLeft()}
        </div>

        <Joystick
          width={W0}
          height={joyH}
          buttonD={Dm}
          cd={Cd}
          dir={d}
          mode={p.mode}
          modeLocked={vm.isS}
          onDir={p.onDir}
          onMode={p.onMode}
          onRaz={p.onRaz}
          onMenu={p.onMenu}
          isEdit={!!edit}
        />
      </div>

      <div className="sep" style={V({ height: `${Hc}px` })} />

      {/* main droite */}
      <div className="hand" style={V({ width: `${Wr}px`, height: `${Hr}px` })}>
        {renderRight()}
      </div>
    </div>
  );
}
