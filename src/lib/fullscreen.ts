/* ============================================================
   Plein écran : API Fullscreen (Android/desktop), verrouillage
   d'orientation et maintien de l'écran allumé (Wake Lock).
   iPhone : Safari n'expose pas l'API → il faut installer la PWA.
   ============================================================ */
import { useCallback, useEffect, useState } from "react";

type FsDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  msFullscreenElement?: Element | null;
  msExitFullscreen?: () => Promise<void> | void;
};
type FsElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

type WakeLockSentinelLike = { release: () => Promise<void>; released: boolean };
type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
};

export const fullscreenElement = (): Element | null => {
  if (typeof document === "undefined") return null;
  const d = document as FsDocument;
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? d.msFullscreenElement ?? null;
};

/** L'API Fullscreen est disponible (faux sur iPhone Safari). */
export const fullscreenSupported = (): boolean => {
  if (typeof document === "undefined") return false;
  const el = document.documentElement as FsElement;
  return !!(
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.msRequestFullscreen ||
    document.fullscreenEnabled
  );
};

/** iOS (iPhone/iPod) : pas d'API plein écran dans Safari, il faut l'écran d'accueil. */
export const isIOSPhone = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPod/.test(ua) || (/iPad/.test(ua) && !fullscreenSupported());
};

export const isStandaloneMode = (): boolean => {
  if (typeof window === "undefined") return false;
  const iosStandalone = (navigator as unknown as { standalone?: boolean }).standalone === true;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    window.matchMedia?.("(display-mode: fullscreen)")?.matches === true ||
    iosStandalone
  );
};

let wakeLock: WakeLockSentinelLike | null = null;

async function keepAwake(on: boolean) {
  const nav = navigator as WakeLockNavigator;
  if (!nav.wakeLock) return;
  try {
    if (on && !wakeLock) {
      wakeLock = await nav.wakeLock.request("screen");
      wakeLock.release = wakeLock.release.bind(wakeLock);
      if ("addEventListener" in wakeLock) {
        (wakeLock as unknown as EventTarget).addEventListener("release", () => {
          wakeLock = null;
        });
      }
    } else if (!on && wakeLock && !wakeLock.released) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch {
    wakeLock = null;
  }
}

async function lockPortrait(on: boolean) {
  try {
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (o: "portrait") => Promise<void>;
    };
    if (on && orientation?.lock) await orientation.lock("portrait");
    else orientation?.unlock?.();
  } catch {
    /* non supporté : sans gravité */
  }
}

export async function enterFullscreen(): Promise<boolean> {
  if (fullscreenElement()) return true;
  const el = document.documentElement as FsElement;
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: "hide" });
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    else if (el.msRequestFullscreen) await el.msRequestFullscreen();
    else return false;
    void lockPortrait(true);
    void keepAwake(true);
    return true;
  } catch {
    return false;
  }
}

export async function exitFullscreen(): Promise<void> {
  const d = document as FsDocument;
  try {
    if (d.exitFullscreen) await d.exitFullscreen();
    else if (d.webkitExitFullscreen) await d.webkitExitFullscreen();
    else if (d.msExitFullscreen) await d.msExitFullscreen();
  } catch {
    /* ignore */
  }
  void lockPortrait(false);
  void keepAwake(false);
}

/* ---------- préférence « démarrer en plein écran » ---------- */
const FS_PREF = "mac_fsauto";
export const loadFsAuto = (): boolean => {
  try {
    return localStorage.getItem(FS_PREF) !== "0";
  } catch {
    return true;
  }
};
export const saveFsAuto = (on: boolean) => {
  try {
    localStorage.setItem(FS_PREF, on ? "1" : "0");
  } catch {
    /* ignore */
  }
};

/**
 * Tente le plein écran automatiquement à la première interaction.
 * Les navigateurs interdisent le plein écran sans geste utilisateur : on l'accroche
 * donc au premier toucher/clic, et seulement si l'appli a été installée.
 */
let autoTried = false;
export function autoFullscreenOnFirstGesture(enabled: boolean): () => void {
  if (!enabled || autoTried || !isStandaloneMode() || !fullscreenSupported()) return () => undefined;
  autoTried = true;
  let done = false;
  const handler = () => {
    if (done) return;
    done = true;
    cleanup();
    void enterFullscreen();
  };
  // Wait for the finger to lift: switching display mode on pointerdown can
  // cancel that same tap (notably on the chord card in Android WebView).
  const events: (keyof WindowEventMap)[] = ["pointerup", "touchend", "keydown"];
  const cleanup = () => events.forEach((e) => window.removeEventListener(e, handler as EventListener));
  events.forEach((e) => window.addEventListener(e, handler as EventListener, { once: false, passive: true }));
  return cleanup;
}

export type FullscreenApi = {
  active: boolean;
  supported: boolean;
  isIOS: boolean;
  toggle: () => Promise<"on" | "off" | "unsupported">;
};

export function useFullscreen(): FullscreenApi {
  const [active, setActive] = useState(() => !!fullscreenElement());
  const [supported] = useState(() => fullscreenSupported());

  useEffect(() => {
    const sync = () => {
      const on = !!fullscreenElement();
      setActive(on);
      if (!on) void keepAwake(false).then(() => undefined);
      else void keepAwake(true);
    };
    const events = [
      "fullscreenchange",
      "webkitfullscreenchange",
      "mozfullscreenchange",
      "MSFullscreenChange",
    ];
    events.forEach((e) => document.addEventListener(e, sync));
    const onVis = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVis);
    sync();
    return () => {
      events.forEach((e) => document.removeEventListener(e, sync));
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const toggle = useCallback(async (): Promise<"on" | "off" | "unsupported"> => {
    if (fullscreenElement()) {
      await exitFullscreen();
      return "off";
    }
    const ok = await enterFullscreen();
    return ok ? "on" : "unsupported";
  }, []);

  return { active, supported, isIOS: isIOSPhone(), toggle };
}
