/* ============================================================
   Intégration native (appli Android via Capacitor)
   - détection : appli native ou site web / PWA
   - plein écran : barre d'état masquée au démarrage
   - bouton « retour » Android
   Sur le web, toutes ces fonctions sont sans effet.
   ============================================================ */
import { Capacitor } from "@capacitor/core";

export const isNative = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

/** Plein écran natif : masque la barre d'état (heure, batterie). */
export async function nativeFullscreen(on = true): Promise<void> {
  if (!isNative()) return;
  try {
    const { StatusBar } = await import("@capacitor/status-bar");
    await StatusBar.setOverlaysWebView({ overlay: true });
    if (on) await StatusBar.hide();
    else await StatusBar.show();
  } catch {
    /* plugin indisponible : sans gravité */
  }
}

/**
 * Bouton « retour » Android.
 * `handler` renvoie true si l'appli a consommé l'appui (fermer une fenêtre,
 * quitter l'édition…) ; sinon l'appli se ferme (comportement Android standard).
 */
export async function onAndroidBack(handler: () => boolean): Promise<() => void> {
  if (!isNative()) return () => undefined;
  try {
    const { App } = await import("@capacitor/app");
    const sub = await App.addListener("backButton", () => {
      if (!handler()) void App.exitApp();
    });
    return () => void sub.remove();
  } catch {
    return () => undefined;
  }
}
