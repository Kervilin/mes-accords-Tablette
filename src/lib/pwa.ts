/* ============================================================
   PWA : installation, mode autonome, service worker
   ============================================================ */
import { useEffect, useState } from "react";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export const isStandalone = () => {
  if (typeof window === "undefined") return false;
  const ios = (window.navigator as unknown as { standalone?: boolean }).standalone;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    window.matchMedia?.("(display-mode: fullscreen)")?.matches === true ||
    ios === true
  );
};

export const isIOS = () => {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && "ontouchend" in document);
};

export const isAndroid = () => typeof navigator !== "undefined" && /Android/.test(navigator.userAgent);

export const isMobile = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(pointer: coarse)")?.matches === true || window.innerWidth <= 820);


/** Enregistre le service worker (production uniquement, silencieux en cas d'échec). */
export function registerSW() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  // Dans l'appli Android (Capacitor), les fichiers sont déjà embarqués : pas de service worker
  // (il risquerait de servir une ancienne version après une mise à jour de l'APK).
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (cap?.isNativePlatform?.()) return;
  const secure = location.protocol === "https:" || location.hostname === "localhost";
  if (!secure) return;
  const go = () => {
    navigator.serviceWorker.register("./sw.js").catch(() => undefined);
  };
  if (document.readyState === "complete") go();
  else window.addEventListener("load", go, { once: true });
}

export type PwaStatus = {
  secure: boolean;
  sw: boolean;
  manifest: boolean;
  standalone: boolean;
  /** mode d'affichage réel : browser, standalone, fullscreen, minimal-ui… */
  displayMode: string;
  /** l'appli tourne dans un iframe/preview : installation impossible */
  iframe: boolean;
  /** nombre d'icônes déclarées dans le manifest (null = manifest illisible) */
  iconCount: number | null;
  manifestName: string | null;
  /** les PNG du manifest se chargent-ils vraiment ? */
  iconsOk: boolean | null;
  manifestUrl: string;
};

/**
 * Diagnostic PWA pour l'aide intégrée :
 * - secure   : contexte sécurisé (HTTPS ou localhost) — obligatoire pour installer / hors-ligne
 * - sw       : service worker actif (mise en cache hors-ligne)
 * - manifest : lien <link rel="manifest"> présent
 * - standalone : l'appli tourne déjà comme une appli installée
 */
export function usePwaStatus(): PwaStatus {
  const [st, setSt] = useState<PwaStatus>(() => ({
    secure: false,
    sw: false,
    manifest: false,
    standalone: false,
    displayMode: "browser",
    iframe: false,
    iconCount: null,
    manifestName: null,
    iconsOk: null,
    manifestUrl: "",
  }));

  useEffect(() => {
    let stopped = false;
    const check = async () => {
      const secure =
        location.protocol === "https:" ||
        ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
      let sw = false;
      try {
        const reg = await navigator.serviceWorker?.getRegistration();
        sw = !!reg?.active;
      } catch {
        sw = false;
      }
      const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
      const manifest = !!link;
      const displayMode = isStandalone()
        ? window.matchMedia?.("(display-mode: fullscreen)")?.matches
          ? "fullscreen"
          : "standalone"
        : "browser";
      const iframe = window.self !== window.top;

      let iconCount: number | null = null;
      let manifestName: string | null = null;
      let iconsOk: boolean | null = null;
      let manifestUrl = link?.href ?? "";
      if (link) {
        try {
          const res = await fetch(link.href, { cache: "no-store" });
          if (res.ok) {
            const mf = (await res.json()) as {
              name?: string;
              icons?: { src: string; sizes?: string }[];
            };
            manifestName = mf.name ?? null;
            iconCount = mf.icons?.length ?? 0;
            const probe = (mf.icons ?? []).find((i) => /192|512/.test(i.sizes ?? "")) ?? mf.icons?.[0];
            if (probe) {
              iconsOk = await new Promise<boolean>((resolve) => {
                const img = new Image();
                img.onload = () => resolve(true);
                img.onerror = () => resolve(false);
                img.src = new URL(probe.src, link.href).href;
              });
            } else iconsOk = false;
          } else {
            iconCount = null;
            iconsOk = false;
          }
        } catch {
          iconCount = null;
          iconsOk = false;
        }
      }

      if (!stopped)
        setSt({
          secure,
          sw,
          manifest,
          standalone: isStandalone(),
          displayMode,
          iframe,
          iconCount,
          manifestName,
          iconsOk,
          manifestUrl,
        });
    };
    void check();
    const id = window.setInterval(check, 2500);
    const onVis = () => document.visibilityState === "visible" && void check();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stopped = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return st;
}

export type InstallApi = {
  canPrompt: boolean;
  installed: boolean;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
};

export function useInstall(): InstallApi {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandalone());

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setEvt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    const mq = window.matchMedia?.("(display-mode: standalone)");
    const onChange = () => setInstalled(isStandalone());
    mq?.addEventListener?.("change", onChange);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      mq?.removeEventListener?.("change", onChange);
    };
  }, []);

  const promptInstall = async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!evt) return "unavailable";
    try {
      await evt.prompt();
      const choice = await evt.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setEvt(null);
      return choice.outcome;
    } catch {
      return "unavailable";
    }
  };

  return { canPrompt: !!evt, installed, promptInstall };
}
