/* ============================================================
   Capacitor — empaquette l'appli web (dist/) dans une vraie appli Android
   Identifiant : fr.mesaccords.app   ·   Nom : Mes accords
   ============================================================ */
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "fr.mesaccords.app",
  appName: "Mes accords",
  webDir: "dist",
  android: {
    // l'appli est chargée en https://localhost (contexte sécurisé : micro, Web Audio…)
    allowMixedContent: false,
    backgroundColor: "#0f141b",
  },
  server: {
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 900,
      launchAutoHide: true,
      backgroundColor: "#0f141b",
      showSpinner: false,
      androidScaleType: "CENTER_INSIDE",
    },
    StatusBar: {
      // barre d'état masquée au démarrage (voir src/lib/native.ts)
      overlaysWebView: true,
      style: "DARK",
      backgroundColor: "#0f141b",
    },
  },
};

export default config;
