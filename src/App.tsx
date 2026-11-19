import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bellows, KeyboardView } from "@/components/Accordion";
import { Icon, Reveal, Toast } from "@/components/Chrome";
import { DiagSheet, FullscreenHint, IconSheet, InstallSheet } from "@/components/Mobile";
import { ChordMenu, HelpSheet } from "@/components/Help";
import { ChordPicker } from "@/components/ChordPicker";
import { blip, holdChord, playChord, prepareAudio, stopChord } from "@/lib/audio";
import { autoFullscreenOnFirstGesture, exitFullscreen, isStandaloneMode, loadFsAuto, saveFsAuto, useFullscreen } from "@/lib/fullscreen";
import { registerSW, useInstall, usePwaStatus } from "@/lib/pwa";
import { isNative, nativeFullscreen, onAndroidBack } from "@/lib/native";
import {
  LEFT_MAX_ROWS,
  curName,
  defKB,
  layout,
  MIN_U,
  delKB,
  loadList,
  loadRange,
  loadTheme,
  loadTierces,
  saveTierces,
  readKB,
  saveList,
  saveRange,
  saveTheme,
  toCSV,
  writeKB,
  type Range,
} from "@/lib/keyboard";
import {
  LT,
  MAIN,
  N,
  NP,
  OTH,
  buildManualView,
  buildView,
  isSym,
  ld,
  midiToNote,
  nm,
  noteToMidi,
  parseNoteInput,
  pcOf,
  pn,
  type KB,
  type Sel,
} from "@/lib/music";
import {
  completion,
  initVals,
  lKey,
  razVals,
  transposeVals,
  valsToKB,
  type EV,
  type EditState,
} from "@/lib/edit";
import { detect } from "@/lib/pitch";

const cs = (...x: (string | false | null | undefined)[]) => x.filter(Boolean).join(" ");

type Ask = { kind: "saveedit" | "saveas" | "newkb" | "delete"; value: string } | null;
type Live = { note: string; info: string; pc: number | null; oct: number | null };

export default function App() {
  /* ---------- état ---------- */
  const [kb, setKb] = useState<KB>(() => {
    try {
      const n = curName();
      return (n ? readKB(n) : null) ?? defKB();
    } catch {
      return defKB();
    }
  });
  const [list, setList] = useState<string[]>([]);
  const [cur, setCur] = useState<string | null>(null);
  const [S, setS] = useState<Sel>(() => ({
    root: -1,
    mode: "maj",
    enr: "par",
    dir: 1,
    low: null,
    more: false,
    tierces: loadTierces(),
  }));
  const [edit, setEdit] = useState<EditState | null>(null);
  const [range, setRange] = useState<Range>({ lo: 36, hi: 108, tol: 50 });
  const [ask, setAsk] = useState<Ask>(null);
  const [toastTxt, setToastTxt] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [installOpen, setInstallOpen] = useState(false);
    const [bellowsPos, setBellowsPos] = useState<"top" | "bottom">("top");
  const [helpOpen, setHelpOpen] = useState(false);
  const [chordMenu, setChordMenu] = useState(false);
  const [picker, setPicker] = useState(false);
  const [manual, setManual] = useState<{
    right: Set<string>;
    left: Set<number>;
    touchedLeft: Set<number>;
  } | null>(null);
  /* Textes d'aide / légendes : masqués par défaut, réaffichés avec le bouton T */
  /* taille du clavier : null = ajusté automatiquement à l'écran ; sinon choisie au pincement */
  const [kbZoom, setKbZoom] = useState<number | null>(() => {
    try {
      const v = parseFloat(localStorage.getItem("mac_kb_zoom") ?? "");
      return Number.isFinite(v) && v > 0 && v <= 1 ? v : null;
    } catch {
      return null;
    }
  });
  const [viewH, setViewH] = useState(() => (typeof window === "undefined" ? 800 : window.innerHeight));
  useEffect(() => {
    const onR = () => setViewH(window.innerHeight);
    window.addEventListener("resize", onR);
    window.addEventListener("orientationchange", onR);
    return () => {
      window.removeEventListener("resize", onR);
      window.removeEventListener("orientationchange", onR);
    };
  }, []);
  const saveZoom = (z: number | null) => {
    setKbZoom(z);
    try {
      if (z == null) localStorage.removeItem("mac_kb_zoom");
      else localStorage.setItem("mac_kb_zoom", String(Math.round(z * 1000) / 1000));
    } catch {}
  };
  const [showTexts, setShowTexts] = useState(() => {
    try {
      return localStorage.getItem("mac_texts") === "1";
    } catch {
      return false;
    }
  });
  const [fsHint, setFsHint] = useState(false);
  const [iconOpen, setIconOpen] = useState(false);
  const [diagOpen, setDiagOpen] = useState(false);
  const [fsAuto, setFsAuto] = useState(() => loadFsAuto());
  const [iconChoice, setIconChoice] = useState<string>(() => {
    try {
      return localStorage.getItem("mac_icon") ?? "dark";
    } catch {
      return "dark";
    }
  });
  const fs = useFullscreen();
  /** appli Android (Capacitor) : plein écran natif, pas d'installation PWA */
  const native = isNative();
  const inst = useInstall();
  const pwa = usePwaStatus();
  const [live, setLive] = useState<Live>({ note: "—", info: "— Hz · — ¢", pc: null, oct: null });
  const [playing, setPlaying] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [bad, setBad] = useState(false);
  const [width, setWidth] = useState(() =>
    typeof window === "undefined" ? 560 : Math.min(820, Math.max(290, window.innerWidth - 24)),
  );

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const toastTimer = useRef<number | null>(null);
  const playTimer = useRef<number | null>(null);
  const cardSound = useRef(false);

  /* micro */
  const micRef = useRef<{
    ctx: AudioContext;
    stream: MediaStream;
    analyser: AnalyserNode;
    buf: Float32Array<ArrayBuffer>;
  } | null>(null);
  const rafRef = useRef<number | null>(null);
  const stRef = useRef<{ pc: number | null; oct: number | null; count: number }>({
    pc: null,
    oct: null,
    count: 0,
  });
  const sigRef = useRef<string>("");
  const lastHz = useRef(0);
  const mirror = useRef({
    on: false,
    listen: null as string | null,
    side: null as "d" | "l" | null,
    dir: 1 as 0 | 1,
    lo: 36,
    hi: 108,
  });

  useEffect(() => {
    mirror.current = {
      on: !!edit,
      listen: edit?.listen ?? null,
      side: edit?.side ?? null,
      dir: edit?.dir ?? 1,
      lo: range.lo,
      hi: range.hi,
    };
  });

  /* ---------- helpers ---------- */
  const toast = useCallback((t: string) => {
    setToastTxt(t);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastTxt(null), 4200);
  }, []);

  const automatic = useMemo(() => buildView(kb, S), [kb, S]);
    /* ---------- export JSON ---------- */
  const exportKB = () => {
    if (!kb) {
      toast("Aucun clavier à exporter.");
      return;
    }
    const data = {
      name: cur ?? "Mon clavier",
      exportedAt: new Date().toISOString(),
      keyboard: kb
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(cur ?? "clavier").replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(`Clavier « ${cur ?? "Mon clavier"} » exporté en JSON.`);
  };

  /* ---------- import JSON ---------- */
  /* ---------- import JSON ---------- */
  const importKB = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    document.body.appendChild(input);
    
    input.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.keyboard || !data.keyboard.b || !data.keyboard.l) {
          toast("Fichier JSON invalide : structure incorrecte.");
          return;
        }
        const name = data.name || file.name.replace(/\.json$/i, '');
        
        // 1. Écrire le clavier dans localStorage
        const nl = writeKB(name, toCSV(data.keyboard), list);
        
        // 2. Mettre à jour la liste
        setList(nl);
        
        // 3. Charger le clavier
        setKb(data.keyboard);
        setCur(name);
        try {
          localStorage.setItem("mac_kb_name", name);
        } catch {}
        resetSel();
        
        toast(`Clavier « ${name} » importé avec succès.`);
      } catch (err) {
        toast("Erreur lors de l'import : fichier JSON invalide.");
        console.error(err);
      } finally {
        document.body.removeChild(input);
      }
    });
    
    input.click();
  };
  const vm = useMemo(
    () => manual ? buildManualView(kb, S, manual.right, manual.left, manual.touchedLeft) : automatic,
    [kb, S, automatic, manual],
  );
  // A new chord, direction, keyboard or edit session resumes automatic fingering.
  useEffect(() => setManual(null), [S.root, S.enr, S.mode, S.dir, S.tierces, kb, edit]);

  const toggleManualRight = (id: string) => {
    if (edit || S.root < 0) return;
    setManual((current) => {
      const right = new Set(current?.right ?? automatic.selected);
      // Manual fingering starts with the lit right-hand keys; left-hand
      // accompaniment is added only if the player explicitly selects it.
      const left = new Set(current?.left);
      if (right.has(id)) right.delete(id);
      else right.add(id);
      return { right, left, touchedLeft: new Set(current?.touchedLeft) };
    });
  };
  const toggleManualLeft = (ix: number) => {
    if (edit || S.root < 0) return;
    setManual((current) => {
      const right = new Set(current?.right ?? automatic.selected);
      // Long-pressing a left-hand key means that the player takes over the
      // left hand: the first press clears ALL automatic bass and chord
      // suggestions, so none of them stays lit after the manual choice.
      const left = new Set(current?.left);
      const touchedLeft = new Set<number>();
      if (left.has(ix)) left.delete(ix);
      else left.add(ix);
      touchedLeft.add(ix);
      return { right, left, touchedLeft };
    });
  };

  /* ---------- initialisation ---------- */
  useEffect(() => {
    const th = loadTheme();
    setTheme(th);
    document.documentElement.dataset.theme = th;
    setRange(loadRange());

    let l = loadList();
    if (!l.length) {
      l = ["Mon clavier"];
      saveList(l);
      writeKB("Mon clavier", toCSV(defKB()), l);
      setCur("Mon clavier");
    } else {
      const saved = curName();
      const c = saved && l.includes(saved) ? saved : l[0];
      const r = readKB(c);
      if (r) setKb(r);
      setCur(c);
      try {
        localStorage.setItem("mac_kb_name", c);
      } catch {}
    }
    setList(l);
  }, []);

  /* largeur disponible pour le clavier */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (typeof ResizeObserver === "undefined") {
      setWidth(el.clientWidth);
      return;
    }
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? el.clientWidth;
      setWidth(Math.max(280, Math.floor(w)));
    });
    ro.observe(el);
    setWidth(Math.max(280, Math.floor(el.clientWidth)));
    return () => ro.disconnect();
  }, [edit === null]);

  /* ---------- taille du clavier : ajustement à l'écran + pincement à deux doigts ---------- */
  // hauteur disponible pour le clavier (en édition : place laissée par les barres du haut et du bas)
  const kbMaxH = edit ? Math.max(260, viewH - 330) : Math.max(300, viewH - 28);
  const kbLay = layout(kb, width, !!edit, { maxH: kbMaxH, zoom: kbZoom });
  const pinchRef = useRef<{ d0: number; u0: number; z: number } | null>(null);
  const pinchRaf = useRef<number | null>(null);
  const touchDist = (t: React.TouchList) =>
    Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const onKbTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;
    // pas de pincement si un doigt est sur le joystick
    for (let i = 0; i < e.touches.length; i++) {
      const el = e.touches[i].target as HTMLElement | null;
      if (el && el.closest && el.closest(".joy")) return;
    }
    pinchRef.current = { d0: Math.max(10, touchDist(e.touches)), u0: kbLay.U, z: kbLay.U / kbLay.Uw };
  };
  const onKbTouchMove = (e: React.TouchEvent) => {
    const pr = pinchRef.current;
    if (!pr || e.touches.length !== 2) return;
    const u = pr.u0 * (touchDist(e.touches) / pr.d0);
    pr.z = Math.max(MIN_U / kbLay.Uw, Math.min(1, u / kbLay.Uw));
    if (pinchRaf.current == null) {
      pinchRaf.current = requestAnimationFrame(() => {
        pinchRaf.current = null;
        if (pinchRef.current) setKbZoom(pinchRef.current.z);
      });
    }
  };
  const onKbTouchEnd = (e: React.TouchEvent) => {
    const pr = pinchRef.current;
    if (!pr || e.touches.length >= 2) return;
    pinchRef.current = null;
    saveZoom(pr.z);
    toast(`Taille du clavier : ${Math.round(pr.z * 100)} % — bouton (i) → « Ajuster à l'écran » pour revenir.`);
  };

  /* recentre la bande de notes sur la fondamentale */
  useEffect(() => {
    const st = stripRef.current;
    if (!st || S.root < 0) return;
    const c = st.querySelector<HTMLElement>(".on");
    if (c) st.scrollLeft = c.offsetLeft - (st.clientWidth - c.offsetWidth) / 2;
  }, [S.root]);

  /* synchronise la basse de référence normalisée */
  useEffect(() => {
    if (!edit && vm.low !== S.low) setS((s) => ({ ...s, low: vm.low }));
  }, [vm.low, S.low, edit]);

  /* ---------- micro ---------- */
  const applyDetection = useCallback((pc: number, oct: number) => {
    const st = mirror.current;
    if (!st.on || st.listen === null) return;
    const key = st.listen;
    setEdit((e) => {
      if (!e) return e;
      const vals = { ...e.vals };
      const cur = (vals[key] ?? [null, null]) as [EV | null, EV | null];
      const nv: [EV | null, EV | null] = [cur[0], cur[1]];
      if (st.side === "d") {
        nv[e.dir] = { pc, oct };
        vals[key] = nv;
      } else {
        // clé "l<j>:<i>"
        const parts = key.slice(1).split(":").map(Number);
        const j = parts[0] ?? 0;
        const i = parts[1] ?? 0;
        const isUp = i % 2 === 0;
        nv[e.dir] = { pc, oct: 0, lab: isUp ? LT[pc] : LT[pc].toLowerCase() };
        vals[key] = nv;
        if (isUp && i + 1 < LEFT_MAX_ROWS) {
          const k2 = lKey(j, i + 1);
          const c2 = (vals[k2] ?? [null, null]) as [EV | null, EV | null];
          const n2: [EV | null, EV | null] = [c2[0], c2[1]];
          n2[e.dir] = { pc, oct: 0, lab: LT[pc].toLowerCase() };
          vals[k2] = n2;
        }
      }
      return { ...e, vals };
    });
  }, []);

  const loop = useCallback(() => {
    const m = micRef.current;
    if (!m) return;
    const st = mirror.current;
    if (st.on && st.listen !== null) {
      m.analyser.getFloatTimeDomainData(m.buf);
      const det = detect(m.buf, m.ctx.sampleRate, m.analyser, st.side === "l");
      if (det) {
        const { pc, oct } = midiToNote(det.midi);
        const s = stRef.current;
        if (s.pc === pc && s.oct === oct) s.count++;
        else {
          s.pc = pc;
          s.oct = oct;
          s.count = 1;
        }
        if (s.count >= 3) {
          if (det.midi >= st.lo && det.midi <= st.hi) {
            const sig = `${st.side}:${st.listen}:${st.dir}:${pc}:${oct}`;
            const now = performance.now();
            if (sigRef.current !== sig) {
              sigRef.current = sig;
              lastHz.current = now;
              setLive({
                note: `${pn(pc)}${oct}`,
                info: `${det.freq} Hz · ${det.cents > 0 ? "+" : ""}${det.cents} ¢`,
                pc,
                oct,
              });
              applyDetection(pc, oct);
            } else if (now - lastHz.current > 220) {
              lastHz.current = now;
              setLive({
                note: `${pn(pc)}${oct}`,
                info: `${det.freq} Hz · ${det.cents > 0 ? "+" : ""}${det.cents} ¢`,
                pc,
                oct,
              });
            }
          } else {
            setLive((l) =>
              l.note === "hors plage" ? l : { note: "hors plage", info: `${det.freq} Hz`, pc: null, oct: null },
            );
          }
        }
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  }, [applyDetection]);

  const stopMic = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const m = micRef.current;
    if (m) {
      try {
        m.stream.getTracks().forEach((t) => t.stop());
      } catch {}
      try {
        void m.ctx.close();
      } catch {}
      micRef.current = null;
    }
    setMicOn(false);
  }, []);

  const startMic = useCallback(async () => {
    if (micRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const AC: typeof AudioContext =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      const src = ctx.createMediaStreamSource(stream);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 600;
      bp.Q.value = 0.5;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      src.connect(bp);
      bp.connect(analyser);
      micRef.current = { ctx, stream, analyser, buf: new Float32Array(analyser.fftSize) };
      stRef.current = { pc: null, oct: null, count: 0 };
      sigRef.current = "";
      setMicOn(true);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      setLive({ note: "—", info: "Micro indisponible — utilise la saisie.", pc: null, oct: null });
    }
  }, [loop]);

  useEffect(() => () => stopMic(), [stopMic]);

  /* ---------- lecture audio ---------- */
  const stopPlayback = useCallback(() => {
    if (playTimer.current !== null) window.clearTimeout(playTimer.current);
    playTimer.current = null;
    cardSound.current = false;
    stopChord();
    setPlaying(false);
  }, []);

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden") stopPlayback();
    };
    window.addEventListener("blur", stopPlayback);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("blur", stopPlayback);
      document.removeEventListener("visibilitychange", onHidden);
      if (playTimer.current !== null) window.clearTimeout(playTimer.current);
      stopChord();
    };
  }, [stopPlayback]);

  const soundingNotes = vm.playMidis.join(",");
  useEffect(() => stopPlayback(), [soundingNotes, !!edit, stopPlayback]);

  const togglePlay = useCallback(() => {
    if (playing) {
      stopPlayback();
      return;
    }
    if (!vm.playMidis.length) {
      toast("Choisis d'abord un accord présent sur le clavier.");
      return;
    }
    if (playChord(vm.playMidis)) {
      if (playTimer.current !== null) window.clearTimeout(playTimer.current);
      cardSound.current = false;
      setPlaying(true);
      playTimer.current = window.setTimeout(stopPlayback, 2000);
    } else toast("Audio indisponible sur ce navigateur.");
  }, [playing, vm.playMidis, toast, stopPlayback]);

  /* ---------- plein écran ---------- */
  const toggleFullscreen = useCallback(async () => {
    if (!fs.supported) {
      setFsHint(true);
      return;
    }
    const r = await fs.toggle();
    if (r === "unsupported") setFsHint(true);
    else if (r === "on") toast("Plein écran : la barre d'état est masquée.");
  }, [fs, toast]);

  /* ---------- démarrage en plein écran (appli installée) ---------- */
  useEffect(() => {
    const cleanup = autoFullscreenOnFirstGesture(!native && fsAuto && !fs.active);
    return cleanup;
  }, [fsAuto, fs.active, native]);

  useEffect(() => {
    try {
      localStorage.setItem("mac_icon", iconChoice);
    } catch {}
  }, [iconChoice]);

  /* ---------- actions clavier (musique) ---------- */
  const resetSel = () => setS((s) => ({ ...s, root: -1, dir: 1, low: null }));

  /** Tierces (accords de gauche à 3 notes) : bascule, mémorisée */
  const toggleTierces = () => {
    const v = !S.tierces;
    setS((s) => ({ ...s, tierces: v, low: null }));
    saveTierces(v);
    toast(v ? "Avec tierce : accords de gauche à 3 notes." : "Sans tierce : accords de gauche à 2 notes.");
  };
  /** appui long sur la carte : l'accord sonne tant que le doigt reste posé */
  const cardHoldStart = () => {
    stopPlayback();
    if (vm.none || !vm.playMidis.length) return;
    cardSound.current = holdChord(vm.playMidis);
    setPlaying(cardSound.current);
    if (!cardSound.current) toast("Audio indisponible sur ce navigateur.");
  };
  const cardHoldEnd = () => {
    if (cardSound.current) stopPlayback();
  };

  const setDir = (d: 0 | 1) => {
    setS((s) => ({ ...s, dir: d }));
    if (edit) {
      setEdit((e) => (e ? { ...e, dir: d } : e));
      sigRef.current = "";
      setLive({ note: "—", info: `sens : ${d ? "tiré" : "poussé"}`, pc: null, oct: null });
    }
  };

  /* ---------- claviers enregistrés ---------- */
  const applyKBObj = (k: KB, name: string | null) => {
    setKb(k);
    setCur(name);
    if (name) {
      try {
        localStorage.setItem("mac_kb_name", name);
      } catch {}
    }
    resetSel();
  };
  const applyKB = (name: string) => {
    const r = readKB(name);
    if (!r) {
      toast("Clavier illisible.");
      return;
    }
    applyKBObj(r, name);
    toast(`Clavier « ${name} » chargé.`);
  };

  /* ---------- édition ---------- */
  const startEdit = () => {
    setEdit({ dir: 1, vals: initVals(kb), listen: null, side: null, tmp: kb });
    setS((s) => ({ ...s, root: -1, dir: 1, low: null, more: false }));
    sigRef.current = "";
    setLive({ note: "—", info: "— Hz · — ¢", pc: null, oct: null });
    setNoteInput("");
    toast("Mode édition : touche un bouton ou un [+] rouge pour l'accorder.");
  };

  /* service worker (hors-ligne) + raccourci d'installation « Éditer mon clavier » */
  useEffect(() => {
    registerSW();
    void nativeFullscreen(true);
    const p = new URLSearchParams(window.location.search);
    if (p.get("action") === "edit") {
      setEdit({ dir: 1, vals: initVals(kb), listen: null, side: null, tmp: kb });
      setS((s) => ({ ...s, root: -1, dir: 1, low: null, more: false }));
      try {
        history.replaceState(null, "", window.location.pathname);
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancelEdit = () => {
    if (!edit) return;
    setKb(edit.tmp);
    setEdit(null);
    stopMic();
    resetSel();
    toast("Édition annulée.");
  };

  /** Demande le nom du clavier avant d'enregistrer. */
  const promptSaveEdit = () => {
    if (!edit) return;
    setAsk({ kind: "saveedit", value: cur ?? "Mon clavier" });
  };

  const confirmAsk = () => {
    if (!ask) return;
    if (ask.kind === "delete") {
      if (!cur) return;
      const nl = delKB(cur, list);
      setList(nl);
      const next = nl[0] ?? null;
      if (next) {
        const r = readKB(next);
        applyKBObj(r ?? defKB(), next);
      } else {
        applyKBObj(defKB(), null);
        saveList([]);
      }
      toast("Clavier supprimé.");
      setAsk(null);
      return;
    }

    const name = ask.value.trim();
    if (!name) {
      toast("Donne un nom au clavier.");
      return;
    }

    if (ask.kind === "saveedit") {
      if (!edit) {
        setAsk(null);
        return;
      }
      const nk = valsToKB(edit.vals);
      const c = completion(edit.vals);
      const nl = writeKB(name, toCSV(nk), list);
      setList(nl);
      setKb(nk);
      setCur(name);
      setEdit(null);
      stopMic();
      resetSel();
      const rest = c.total - c.done;
      toast(
        rest > 0
          ? `Clavier « ${name} » enregistré (${c.done}/${c.total} notes — tu pourras le reprendre).`
          : `Clavier « ${name} » enregistré (${nk.b.length} touches à droite, ${nk.l.length} à gauche).`,
      );
      setAsk(null);
      return;
    }

    if (ask.kind === "saveas") {
      const nl = writeKB(name, toCSV(kb), list);
      setList(nl);
      setCur(name);
      toast(`Clavier « ${name} » enregistré.`);
    } else {
      const base = defKB();
      const nl = writeKB(name, toCSV(base), list);
      setList(nl);
      applyKBObj(base, name);
      toast(`Nouveau clavier « ${name} » créé.`);
    }
    setAsk(null);
  };

  const setSlotAt = (key: string, v: EV | null) => {
    setEdit((e) => {
      if (!e) return e;
      const cur = (e.vals[key] ?? [null, null]) as [EV | null, EV | null];
      const nv: [EV | null, EV | null] = [cur[0], cur[1]];
      nv[e.dir] = v;
      const nextListen = v === null && nv[0] === null && nv[1] === null ? null : e.listen;
      return { ...e, vals: { ...e.vals, [key]: nv }, listen: nextListen };
    });
  };

  const pickRight = (key: string) => {
    setEdit((e) => {
      if (!e) return e;
      const cur = e.vals[key]?.[e.dir];
      setLive({
        note: cur && cur.pc !== null && cur.oct !== null ? pn(cur.pc) + cur.oct : "…",
        info: "écoute…",
        pc: null,
        oct: null,
      });
      return { ...e, listen: key, side: "d" };
    });
    sigRef.current = "";
    void startMic();
  };

  const pickLeft = (key: string) => {
    setEdit((e) => {
      if (!e) return e;
      const cur = e.vals[key]?.[e.dir];
      setLive({
        note: cur && cur.lab ? ld(cur.lab) : "…",
        info: "écoute / saisie du label",
        pc: null,
        oct: null,
      });
      return { ...e, listen: key, side: "l" };
    });
    sigRef.current = "";
    void startMic();
  };

  const deleteSelectedBtn = () => {
    if (!edit || edit.listen === null) {
      toast("Touche d'abord le bouton à retirer.");
      return;
    }
    const key = edit.listen;
    setEdit((e) => {
      if (!e) return e;
      const vals = { ...e.vals, [key]: [null, null] as [EV | null, EV | null] };
      if (e.side === "l") {
        const parts = key.slice(1).split(":").map(Number);
        const j = parts[0] ?? 0;
        const i = parts[1] ?? 0;
        if (i % 2 === 0 && i + 1 < LEFT_MAX_ROWS) {
          vals[lKey(j, i + 1)] = [null, null];
        }
      }
      return { ...e, vals, listen: null, side: null };
    });
    setLive({ note: "—", info: "touche retirée → [+]", pc: null, oct: null });
    toast("Touche retirée (son emplacement redevient un [+] rouge).");
  };

  const applyNoteInput = () => {
    if (!edit) {
      toast("Pas en mode édition.");
      return;
    }
    const key = edit.listen;
    if (!key) {
      toast("Touche d'abord un bouton ou un [+] rouge.");
      return;
    }
    const val = noteInput.trim();
    if (edit.side === "l") {
      const m = /^([A-Ga-g])([#b]?)$/.exec(val);
      if (!m) {
        setBad(true);
        toast("Label invalide. Ex. : C (basse), c (accord).");
        return;
      }
      const pc = pcOf(NP[m[1].toUpperCase()] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0));
      const parts = key.slice(1).split(":").map(Number);
      const j = parts[0] ?? 0;
      const i = parts[1] ?? 0;
      const up = i % 2 === 0;
      const lab = up ? m[1].toUpperCase() + (m[2] || "") : m[1].toLowerCase() + (m[2] || "");
      setBad(false);
      setEdit((e) => {
        if (!e) return e;
        const vals = { ...e.vals };
        const c1 = (vals[key] ?? [null, null]) as [EV | null, EV | null];
        const n1: [EV | null, EV | null] = [c1[0], c1[1]];
        n1[e.dir] = { pc, oct: 0, lab };
        vals[key] = n1;
        if (up && i + 1 < LEFT_MAX_ROWS) {
          const k2 = lKey(j, i + 1);
          const c2 = (vals[k2] ?? [null, null]) as [EV | null, EV | null];
          const n2: [EV | null, EV | null] = [c2[0], c2[1]];
          n2[e.dir] = { pc, oct: 0, lab: lab.toLowerCase() };
          vals[k2] = n2;
        }
        return { ...e, vals };
      });
      setNoteInput("");
      blip(760);
      toast(`Label ${lab} enregistré.`);
      return;
    }
    const q = parseNoteInput(val);
    if (!q) {
      setBad(true);
      toast("Note invalide. Ex. : G#5, Bb3, Sol#4.");
      return;
    }
    const midi = noteToMidi(q.pc, q.oct);
    if (midi < range.lo || midi > range.hi) {
      setBad(true);
      toast(
        `Hors plage (${pn(range.lo)}${Math.floor(range.lo / 12) - 1} → ${pn(range.hi)}${
          Math.floor(range.hi / 12) - 1
        }).`,
      );
      return;
    }
    setBad(false);
    setSlotAt(key, { pc: q.pc, oct: q.oct });
    setLive({ note: pn(q.pc) + q.oct, info: `${val} (saisi)`, pc: q.pc, oct: q.oct });
    sigRef.current = "";
    setNoteInput("");
    blip(880);
  };

  const editRaz = () => {
    if (!edit) return;
    // Raz P/T : efface les notes des DEUX sens (poussé et tiré)
    setEdit((e) => (e ? { ...e, vals: razVals(razVals(e.vals, 0), 1), listen: null } : e));
    sigRef.current = "";
    setLive({ note: "—", info: "Notes des deux sens effacées (P/T)", pc: null, oct: null });
    toast("Notes des deux sens effacées (P/T).");
  };

  const transpose = (delta: number) => {
    if (!edit) return;
    setEdit((e) => (e ? { ...e, vals: transposeVals(e.vals, delta) } : e));
    blip(delta > 0 ? 700 : 480);
    toast(`Clavier transposé de ${delta > 0 ? "+" : ""}${delta} demi-ton.`);
  };

  /* ---------- bouton « retour » Android (appli native) ---------- */
  const backRef = useRef<() => boolean>(() => false);
  backRef.current = () => {
    if (helpOpen) return setHelpOpen(false), true;
    if (picker) return setPicker(false), true;
    if (chordMenu) return setChordMenu(false), true;
    if (ask) return setAsk(null), true;
    if (diagOpen) return setDiagOpen(false), true;
    if (iconOpen) return setIconOpen(false), true;
    if (installOpen) return setInstallOpen(false), true;
    if (fsHint) return setFsHint(false), true;
    if (edit) return cancelEdit(), true;
    if (S.root >= 0) return resetSel(), true;
    return false; // rien à fermer : l'appli se ferme
  };
  useEffect(() => {
    let off = () => {};
    void onAndroidBack(() => backRef.current()).then((f) => (off = f));
    return () => off();
  }, []);

  /* ---------- raccourcis ----------
     ← = Tiré · → = Poussé · + = Majeur · - = Mineur
     1=Parfait 2=sus2 3=add9 4=sus4 5=5 6=6 7=7m 8=7M 9=9
     Espace = écouter · E = édition · Échap = Raz
     En édition : ←/→ = sens · 0 = pas de note (∅) pour le sens courant        */
  useEffect(() => {
    const ENR_KEY: Record<string, string> = {
      "1": "par",
      "2": "sus2",
      "3": "a9",
      "4": "sus4",
      "5": "q5",
      "6": "s6",
      "7": "s7",
      "8": "s7M",
      "9": "s9",
    };
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
      if (e.key === "Escape") {
        if (helpOpen) setHelpOpen(false);
        else if (picker) setPicker(false);
        else if (chordMenu) setChordMenu(false);
        else if (ask) setAsk(null);
        else if (edit) cancelEdit();
        else resetSel();
        return;
      }
      if (typing) return;
      const onCtrl = !!t && /^(BUTTON|A|SELECT)$/.test(t.tagName);
      if (edit) {
        if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          deleteSelectedBtn();
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          setDir(1);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          setDir(0);
        } else if (e.key === "0") {
          const k = edit.listen;
          if (!k) {
            toast("Touche d'abord un bouton ou un [+] rouge.");
            return;
          }
          setSlotAt(k, null);
          setLive({ note: "∅", info: "pas de note pour ce sens", pc: null, oct: null });
          toast(`Pas de note (${edit.dir ? "tiré" : "poussé"}).`);
        }
        return;
      }
      if (e.key === "ArrowLeft" && !onCtrl) {
        e.preventDefault();
        setDir(1); // Tiré
      } else if (e.key === "ArrowRight" && !onCtrl) {
        e.preventDefault();
        setDir(0); // Poussé
      } else if ((e.key === "+" || e.key === "=") && !onCtrl) {
        setS((s) => ({ ...s, mode: "maj", low: null }));
      } else if ((e.key === "-" || e.key === "_") && !onCtrl) {
        setS((s) => ({ ...s, mode: "min", low: null }));
      } else if (e.key === " " && !onCtrl) {
        e.preventDefault();
        togglePlay();
      } else if (e.key.toLowerCase() === "e" && !onCtrl) {
        startEdit();
      } else if (e.key.toLowerCase() === "f" && !onCtrl) {
        void toggleFullscreen();
      } else if (e.key.toLowerCase() === "t" && !onCtrl) {
        const v = !S.tierces;
        setS((s) => ({ ...s, tierces: v, low: null }));
        saveTierces(v);
        toast(v ? "Avec tierces (accords de gauche à 3 notes)." : "Sans tierces (accords de gauche à 2 notes).");
      } else if (ENR_KEY[e.key] && !onCtrl) {
        setS((s) => ({ ...s, enr: ENR_KEY[e.key], low: null, more: false }));
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const comp = edit ? completion(edit.vals) : { done: 0, total: 0 };
  const o4 = OTH.find((x) => x[0] === S.enr);
  const dirCol = (d: 0 | 1) => (d ? "var(--c-yel)" : "var(--c-org)");

  /* ---------- rendu ---------- */
  return (
    <div
      className={cs(
        "relative z-10 mx-auto w-full max-w-[760px] px-2 pt-2 sm:px-4 sm:pt-3",
        edit ? "pb-[248px]" : "pb-10",
      )}
    >
      {/* ======= bandeau d'édition : seulement Annuler / Enregistrer ======= */}
      {edit ? (
        <div
          className="panel rise sticky top-2 z-30 flex justify-end gap-2 p-2.5 sm:p-3"
          style={{ backdropFilter: "blur(8px)" }}
        >
          <button
            type="button"
            className="ch min-h-[44px] flex-1 px-4 text-[15px]"
            onClick={cancelEdit}
          >
            Annuler
          </button>
          <button
            type="button"
            className="ch min-h-[44px] flex-1 px-4 text-[15px]"
            style={{ background: "var(--c-sel)", borderColor: "var(--c-sel)", color: "var(--c-selt)" }}
            onClick={promptSaveEdit}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Icon n="save" /> Enregistrer…
            </span>
          </button>
        </div>
      ) : (
        /* ======= en-tête ======= */
        <header className="panel rise overflow-hidden">
              {bellowsPos === "top" && (
              <div className="flex items-center gap-1.5">
                <div
                  className="flex-1"
                  onClick={() => setDir(S.dir ? 0 : 1)}
                  title={S.dir ? "Cliquez pour passer en Poussé" : "Cliquez pour passer en Tiré"}
                  style={{ cursor: "pointer" }}
                  role="button"
                  aria-label="Basculer entre Poussé et Tiré"
                >
                  <Bellows open={S.dir ? 78 : 30} playing={playing} flush />
                </div>
                <button
                  type="button"
                  onClick={() => setBellowsPos("bottom")}
                  title="Déplacer l'accordéon en bas"
                  aria-label="Déplacer l'accordéon en bas"
                  className="ch grid h-9 w-9 min-h-[38px] shrink-0 place-items-center p-0 transition-transform hover:rotate-180"
                  style={{ background: "var(--c-card)", borderColor: "var(--c-bd)", color: "var(--c-tx)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 16V4M7 4L3 8M7 4l4 4M17 8v12M17 20l-4-4M17 20l4-4" />
                  </svg>
                </button>
              </div>
              )}
          <div className="flex flex-wrap items-end gap-2 p-2.5 sm:p-3">
            <div
              className="flex w-full flex-1 flex-wrap items-center gap-1.5 rounded-2xl border p-1.5"
              style={{ borderColor: "var(--c-bd)", background: "var(--c-bg2)" }}
            >
              <select
                aria-label="Clavier"
                value={cur ?? ""}
                onChange={(e) => e.target.value && applyKB(e.target.value)}
                className="min-h-[38px] min-w-0 flex-1 rounded-xl border px-2 text-[14px] font-semibold sm:flex-none"
                style={{ borderColor: "var(--c-bd)", background: "var(--c-card)", color: "var(--c-tx)" }}
              >
                {list.length ? (
                  list.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))
                ) : (
                  <option value="">(aucun)</option>
                )}
              </select>
              <button
                type="button"
                title="Enregistrer sous…"
                aria-label="Enregistrer sous…"
                className="ch grid h-9 w-9 min-h-[38px] place-items-center p-0"
                onClick={() => setAsk({ kind: "saveas", value: cur ?? "Mon clavier" })}
              >
                <Icon n="save" />
              </button>
              <button
                type="button"
                title="Éditer / Nouveau clavier"
                aria-label="Éditer ou créer un clavier"
                className="ch grid h-9 w-9 min-h-[38px] place-items-center p-0"
                onClick={startEdit}
              >
                <Icon n="tune" />
              </button>
              <button
                type="button"
                title="Gérer le clavier (Enregistrer / Exporter / Importer / Supprimer)"
                aria-label="Gérer le clavier"
                className="ch grid h-9 w-9 min-h-[38px] place-items-center p-0"
                onClick={() => setAsk({ kind: "manage", value: "" })}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
                </svg>
              </button>
              <button
                type="button"
                title="Supprimer ce clavier"
                aria-label="Supprimer ce clavier"
                className="ch grid h-9 w-9 min-h-[38px] place-items-center p-0"
                onClick={() => setAsk({ kind: "delete", value: "" })}
              >
                <Icon n="trash" />
              </button>
              {!native && (
              <button
                type="button"
                title={fs.active ? "Quitter le plein écran (F)" : "Plein écran (F)"}
                aria-label={fs.active ? "Quitter le plein écran" : "Passer en plein écran"}
                aria-pressed={fs.active}
                className="ch grid h-9 w-9 min-h-[38px] place-items-center p-0"
                onClick={() => void toggleFullscreen()}
              >
                <Icon n={fs.active ? "compress" : "expand"} />
              </button>
              )}
              <button
                type="button"
                title={theme === "dark" ? "Passer en clair" : "Passer en sombre"}
                aria-label="Changer de thème"
                className="ch grid h-9 w-9 min-h-[38px] place-items-center p-0"
                onClick={() => {
                  const t = theme === "dark" ? "light" : "dark";
                  setTheme(t);
                  saveTheme(t);
                }}
              >
                <Icon n={theme === "dark" ? "sun" : "moon"} />
              </button>
              <button
                type="button"
                title={showTexts ? "Masquer les textes" : "Afficher les textes (aide, raccourcis)"}
                aria-label="Afficher ou masquer les textes"
                aria-pressed={showTexts}
                className="ch grid h-9 w-9 min-h-[38px] place-items-center p-0"
                style={{
                  background: showTexts ? "var(--c-sel)" : "var(--c-card)",
                  borderColor: showTexts ? "var(--c-sel)" : "var(--c-bd)",
                  color: showTexts ? "var(--c-selt)" : "var(--c-mu)",
                }}
                onClick={() => {
                  const v = !showTexts;
                  setShowTexts(v);
                  try {
                    localStorage.setItem("mac_texts", v ? "1" : "0");
                  } catch {}
                }}
              >
                <Icon n="info" className="h-[1.3em] w-[1.3em]" />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* ======= signature + bouton Mode d'emploi (affichés par le bouton i) ======= */}
      {!edit && showTexts && (
        <>
          <p
            className="mt-2.5 text-center text-[11.5px] leading-snug"
            style={{ color: "var(--c-mu)" }}
          >
            Appli développée par Denis <span aria-hidden="true">·</span> 11/2026
          </p>
          <button
            type="button"
            className="ch mt-1.5 flex w-full items-center justify-center gap-2 text-[15px] font-bold"
            style={{ background: "var(--c-card)", borderColor: "var(--c-sel)", color: "var(--c-tx)" }}
            onClick={() => setHelpOpen(true)}
          >
            <span style={{ color: "var(--c-sel)" }} className="inline-flex">
              <Icon n="info" className="h-[1.2em] w-[1.2em]" />
            </span>
            Mode d'emploi
          </button>
        </>
      )}

      {/* ======= console accord ======= */}
      {!edit && (
        <section className="panel rise mt-2.5 p-3 sm:p-4" style={{ animationDelay: "70ms" }}>
          {/* bande de fondamentales */}
          <div ref={stripRef} className="nt flex gap-1.5 overflow-x-auto pb-1">
            {([[-1, "—"], ...N.map((n, i) => [i, nm(n)])] as [number, string][]).map(([v, l]) => (
              <button
                key={v}
                type="button"
                className={cs("ch min-w-[54px] flex-none", S.root === v && "on")}
                onClick={() => setS((s) => ({ ...s, root: v, low: null }))}
                aria-pressed={S.root === v}
              >
                {l}
              </button>
            ))}
          </div>

          {/* enrichissements */}
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {MAIN.map(([v, l]) => (
              <button
                key={v}
                type="button"
                className={cs("ch", S.enr === v && "on")}
                onClick={() => setS((s) => ({ ...s, enr: v, low: null, more: false }))}
                aria-pressed={S.enr === v}
              >
                {l}
              </button>
            ))}
            <button
              type="button"
              className={cs("ch", o4 && "on")}
              onClick={() => setS((s) => ({ ...s, more: !s.more }))}
              aria-expanded={S.more}
            >
              {o4 ? o4[1] : "Autres"} ▾
            </button>
          </div>
          <div
            className="grid transition-[grid-template-rows] duration-300 ease-out"
            style={{ gridTemplateRows: S.more ? "1fr" : "0fr" }}
          >
            <div className="overflow-hidden">
              <div className="mt-1.5 grid grid-cols-5 gap-1.5">
                {OTH.map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    className={cs("ch text-[14px]", S.enr === v && "on")}
                    onClick={() => setS((s) => ({ ...s, enr: v, low: null, more: false }))}
                    aria-pressed={S.enr === v}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* majeur/mineur + tierces + écouter */}
          <div className="mt-2.5 flex flex-wrap items-end justify-end gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={togglePlay}
                disabled={vm.none}
                className="ch grid min-h-[42px] w-[46px] place-items-center p-0 disabled:opacity-35"
                style={{
                  background: playing ? "var(--c-sel)" : "var(--c-card)",
                  borderColor: playing ? "var(--c-sel)" : "var(--c-bd)",
                  color: playing ? "var(--c-selt)" : "var(--c-tx)",
                }}
                title={playing ? "Arrêter (Espace)" : "Écouter l'accord (Espace)"}
                aria-label={playing ? "Arrêter" : "Écouter l'accord"}
              >
                <Icon n={playing ? "stop" : "play"} className="h-[1.3em] w-[1.3em]" />
              </button>
              <div className="flex overflow-hidden rounded-xl border" style={{ borderColor: "var(--c-bd)" }}>
                {(
                  [
                    ["maj", "Majeur"],
                    ["min", "Mineur"],
                  ] as const
                ).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    disabled={isSym(S.enr)}
                    onClick={() => setS((s) => ({ ...s, mode: v, low: null }))}
                    className="min-h-[42px] px-3.5 text-[14px] font-semibold transition disabled:opacity-35"
                    style={{
                      background: S.mode === v && !isSym(S.enr) ? "var(--c-sel)" : "var(--c-card)",
                      color: S.mode === v && !isSym(S.enr) ? "var(--c-selt)" : "var(--c-tx)",
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  const v = !S.tierces;
                  setS((s) => ({ ...s, tierces: v, low: null }));
                  saveTierces(v);
                  toast(
                    v
                      ? "Avec tierces : les accords de gauche ont 3 notes (fondamentale, tierce, quinte)."
                      : "Sans tierces : accords de gauche à 2 notes (fondamentale, quinte).",
                  );
                }}
                aria-pressed={S.tierces}
                title="Tierces : les accords de la main gauche passent de 2 à 3 notes"
                className="min-h-[42px] rounded-xl border px-3.5 text-[13.5px] font-bold transition"
                style={{
                  background: S.tierces ? "var(--c-yel)" : "var(--c-card)",
                  borderColor: S.tierces ? "var(--c-yel)" : "var(--c-bd)",
                  color: S.tierces ? "#1b1503" : "var(--c-mu)",
                }}
              >
                {S.tierces ? "Avec tierces" : "Sans tierces"}
              </button>
            </div>
          </div>
          {showTexts && (
            <p
              className="mt-1.5 text-[11.5px] leading-snug"
              style={{ color: S.tierces ? "var(--c-tx)" : "var(--c-mu)" }}
            >
              {S.tierces
                ? "Tierces : accords de gauche à 3 notes — tous majeurs sauf La. Pour un accord mineur, affiche l'accord équivalent : ex. Rém → Fa (Fa La Do), Mim → Sol (Sol Si Ré)."
                : "Tierces : accords de gauche à 2 notes (fondamentale + quinte)."}
            </p>
          )}
        </section>
      )}

      {/* ======= clavier PLEINE LARGEUR ======= */}
      <section className="panel rise mt-2.5 p-2 sm:p-4" style={{ animationDelay: "130ms" }}>
        <div
          ref={wrapRef}
          className="w-full overflow-x-auto py-1"
          style={{ touchAction: "pan-x pan-y" }}
          onTouchStart={onKbTouchStart}
          onTouchMove={onKbTouchMove}
          onTouchEnd={onKbTouchEnd}
          onTouchCancel={onKbTouchEnd}
        >
          <KeyboardView
            kb={kb}
            width={width}
            maxH={kbMaxH}
            zoom={kbZoom}
            vm={vm}
            edit={edit}
            live={{ pc: live.pc, oct: live.oct }}
            mode={S.mode}
            onDir={setDir}
            onMode={(m) => {
              if (!isSym(S.enr)) setS((s) => ({ ...s, mode: m, low: null }));
            }}
            onRight={(id) => {
              setManual(null);
              setS((s) => ({ ...s, low: id }));
            }}
            onLongRight={toggleManualRight}
            onRightRoot={(b, dd) =>
              b.m[dd] > 0 && setS((s) => ({ ...s, root: pcOf(b.m[dd]), dir: dd, low: null }))
            }
            onLeft={(ix, dd) =>
              kb.l[ix].k[dd] >= 0 &&
              setS((s) => ({ ...s, root: kb.l[ix].k[dd], dir: dd, low: null }))
            }
            onLongLeft={toggleManualLeft}
            onEditRight={pickRight}
            onEditLeft={pickLeft}
            onRaz={() => {
              if (edit) {
                editRaz();
              } else {
                resetSel();
              }
            }}
            onMenu={edit ? undefined : () => setChordMenu(true)}
            onCardOpen={() => {
              if (!edit) setPicker(true);
            }}
            onCardPressStart={prepareAudio}
            onCardHoldStart={cardHoldStart}
            onCardHoldEnd={cardHoldEnd}
          />
        </div>

        {showTexts && (
        <p
          className="mt-3 rounded-xl border-l-[3px] px-3 py-2 text-[13.5px] leading-relaxed"
          style={{
            borderColor: vm.miss.length ? "var(--c-org)" : "var(--c-bd)",
            background: "var(--c-bg2)",
            color: "var(--c-mu)",
            minHeight: 42,
          }}
        >
          {edit
            ? "Touche un [+] rouge pour ajouter une touche. Joystick sous les basses : glisse ← T (tiré), → P (poussé), double-toucher = Raz du sens."
            : vm.status}
        </p>
        )}
      </section>

      {/* ======= actions PWA & légendes (affichées avec le bouton info) ======= */}
      {showTexts && (
      <Reveal className="mt-2.5" delay={40}>
        <div className="panel p-3.5 sm:p-4">
          {!native && (
            <>
          <button
            type="button"
            data-install
            className="ch mt-2 flex w-full items-center justify-center gap-2 text-[13.5px]"
            style={{
              background: "var(--c-bg2)",
              borderColor: "var(--c-bd)",
              color: inst.installed ? "var(--c-mu)" : "var(--c-tx)",
            }}
            onClick={() => setInstallOpen(true)}
          >
            <img src="./icons/icon-512.png" alt="" className="h-5 w-5 rounded-md" />
            {inst.installed ? "Application installée · infos" : "Installer l'appli sur mon téléphone"}
          </button>
          <button
            type="button"
            className="ch mt-1.5 flex w-full items-center justify-center gap-2 text-[13px]"
            style={{ background: "var(--c-bg2)", borderColor: "var(--c-bd)", color: "var(--c-mu)" }}
            onClick={() => setIconOpen(true)}
          >
            <Icon n="hand" /> Changer l'icône de l'appli
          </button>
          {(!inst.installed || !pwa.iconsOk) && (
            <button
              type="button"
              className="ch mt-1.5 flex w-full items-center justify-center gap-2 text-[13px]"
              style={{
                background: "color-mix(in oklab, var(--c-sel) 12%, transparent)",
                borderColor: "var(--c-sel)",
                color: "var(--c-tx)",
              }}
              onClick={() => setDiagOpen(true)}
            >
              <Icon n="tune" /> Diagnostic : pas d'icône ou pas de plein écran ?
            </button>
          )}
            </>
          )}

          {showTexts && (
            <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--c-bd)" }}>
              <div className="mb-3 flex flex-wrap items-center justify-center gap-2 text-[12.5px]" style={{ color: "var(--c-mu)" }}>
                <span>
                  Taille du clavier :{" "}
                  <b style={{ color: "var(--c-tx)" }}>
                    {kbZoom == null ? "ajustée à l'écran" : `${Math.round(kbZoom * 100)} %`}
                  </b>{" "}
                  — pincez le clavier à deux doigts pour l'agrandir ou le réduire.
                </span>
                <button
                  type="button"
                  className="ch min-h-[34px] px-3 text-[12.5px]"
                  disabled={kbZoom == null}
                  onClick={() => {
                    saveZoom(null);
                    toast("Clavier ajusté à l'écran.");
                  }}
                >
                  Ajuster à l'écran
                </button>
              </div>
              <p className="text-center text-[12.5px] leading-relaxed" style={{ color: "var(--c-mu)" }}>
                Sans note : haut = poussé, bas = tiré. Touche une note d'un clavier pour choisir la note et
                le sens. Rouge : notes à jouer, double cercle : fondamentale, italique : notes ajoutées (6,
                7, 9). Touche une note de l'accord à droite : elle et les suivantes plus hautes s'allument.
                Joystick sous les basses : glisse ← T (tiré), → P (poussé), appui long ↑ Maj ou ↓ min,
                double-toucher = Raz. Entouré en jaune (T) ou orange (P).
              </p>
              <p className="mt-2 text-center text-[12px] leading-relaxed" style={{ color: "var(--c-mu)" }}>
                Raccourcis : <kbd>←</kbd> tiré · <kbd>→</kbd> poussé · <kbd>+</kbd> majeur ·{" "}
                <kbd>−</kbd> mineur · <kbd>1</kbd> parfait <kbd>2</kbd> sus2 <kbd>3</kbd> add9{" "}
                <kbd>4</kbd> sus4 <kbd>5</kbd> 5 <kbd>6</kbd> 6 <kbd>7</kbd> 7m <kbd>8</kbd> 7M{" "}
                <kbd>9</kbd> 9 · <kbd>Espace</kbd> écouter · <kbd>E</kbd> édition · <kbd>F</kbd> plein
                écran · <kbd>T</kbd> tierces · <kbd>Échap</kbd> raz · en édition <kbd>0</kbd> = pas de
                note, <kbd>Suppr</kbd> = effacer les 2 sens.
              </p>
              <p className="mt-2 text-center text-[11.5px]" style={{ color: "var(--c-mu)" }}>
                {list.length} clavier{list.length > 1 ? "s" : ""} enregistré
                {list.length > 1 ? "s" : ""}
                {cur ? ` · ${cur}` : ""}
              </p>
            </div>
          )}
        </div>
      </Reveal>
      )}

      {/* ======= barre d'édition (bas) ======= */}
      {edit && (
        <div
          className="panel fixed inset-x-0 bottom-0 z-40 rounded-b-none p-2.5 sm:p-3"
          style={{
            paddingBottom: "calc(0.65rem + env(safe-area-inset-bottom,0px))",
            borderTopWidth: 2,
            borderTopColor: dirCol(edit.dir),
          }}
        >
          <div className="mx-auto flex w-full max-w-[760px] flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="font-hand min-w-[3.2em] text-[25px] leading-none"
                style={{ color: "var(--c-sel)" }}
              >
                {live.note}
              </span>
              <span className="flex-1 text-[13px]" style={{ color: "var(--c-mu)" }}>
                {live.info}
                {micOn ? " · micro actif" : ""}
              </span>
              <button
                type="button"
                className="ch min-h-[38px] px-3 text-[13.5px]"
                onClick={editRaz}
                title="Effacer les notes des deux sens (Poussé et Tiré)"
              >
                Raz P/T
              </button>
              <button
                type="button"
                className="ch grid h-9 w-9 min-h-[38px] place-items-center p-0"
                title="Transposer d'un demi-ton vers le bas"
                onClick={() => transpose(-1)}
              >
                <Icon n="minus" />
              </button>
              <button
                type="button"
                className="ch grid h-9 w-9 min-h-[38px] place-items-center p-0"
                title="Transposer d'un demi-ton vers le haut"
                onClick={() => transpose(1)}
              >
                <Icon n="plus" />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                value={noteInput}
                onChange={(e) => {
                  setNoteInput(e.target.value);
                  setBad(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyNoteInput();
                  }
                }}
                placeholder={edit.side === "l" ? "Label gauche (C, c, Eb…)" : "Note (G#5, Bb3, Sol#4…)"}
                className="min-h-[42px] min-w-0 flex-1 rounded-xl border px-3 text-[15px] font-semibold outline-none transition"
                style={{
                  borderColor: bad ? "var(--c-sel)" : "var(--c-bd)",
                  background: "var(--c-bg2)",
                  color: bad ? "var(--c-sel)" : "var(--c-tx)",
                }}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                className="ch grid h-[42px] w-11 place-items-center p-0"
                style={{ background: "var(--c-sel)", borderColor: "var(--c-sel)", color: "var(--c-selt)" }}
                onClick={applyNoteInput}
                aria-label="Valider la note"
                title="Valider la note saisie"
              >
                <Icon n="check" />
              </button>
              <button
                type="button"
                className="ch grid h-[42px] w-11 place-items-center p-0"
                onClick={() => {
                  const k = edit.listen;
                  if (!k) {
                    toast("Touche d'abord un bouton du clavier.");
                    return;
                  }
                  setSlotAt(k, null);
                  setLive({ note: "—", info: "note vidée pour ce sens", pc: null, oct: null });
                  toast("Note vidée pour ce sens (si l'autre sens est vide aussi, elle redevient [+]).");
                }}
                aria-label="Vider la note de ce sens"
                title="Vider la note de ce sens (∅)"
              >
                <Icon n="void" />
              </button>
              <button
                type="button"
                className="ch grid h-[42px] w-11 place-items-center p-0"
                onClick={deleteSelectedBtn}
                disabled={edit.listen === null}
                aria-label="Effacer les 2 sens (Suppr) et remettre un [+]"
                title="Suppr — effacer les 2 sens de cette touche (remet un [+] rouge)"
              >
                <Icon n="trash" />
              </button>
            </div>
            {showTexts && (
              <p className="text-center text-[11px] leading-none" style={{ color: "var(--c-mu)" }}>
                <kbd>←</kbd> tiré · <kbd>→</kbd> poussé · <kbd>0</kbd> pas de note ·{" "}
                <kbd>Suppr</kbd> efface les 2 sens
              </p>
            )}

            {showTexts && (
            <div className="flex flex-wrap items-center gap-3 text-[12px]" style={{ color: "var(--c-mu)" }}>
              <label className="inline-flex items-center gap-1.5">
                Mini
                <select
                  value={range.lo}
                  onChange={(e) => {
                    const r = { ...range, lo: +e.target.value };
                    setRange(r);
                    saveRange(r);
                  }}
                  className="min-h-[32px] rounded-lg border px-1 text-[13px] font-semibold"
                  style={{ borderColor: "var(--c-bd)", background: "var(--c-bg2)", color: "var(--c-tx)" }}
                >
                  {Array.from({ length: 109 }, (_, i) => i + 12).map((m) => (
                    <option key={m} value={m}>
                      {pn(m)}
                      {Math.floor(m / 12) - 1}
                    </option>
                  ))}
                </select>
              </label>
              <label className="inline-flex items-center gap-1.5">
                Maxi
                <select
                  value={range.hi}
                  onChange={(e) => {
                    const r = { ...range, hi: +e.target.value };
                    setRange(r);
                    saveRange(r);
                  }}
                  className="min-h-[32px] rounded-lg border px-1 text-[13px] font-semibold"
                  style={{ borderColor: "var(--c-bd)", background: "var(--c-bg2)", color: "var(--c-tx)" }}
                >
                  {Array.from({ length: 109 }, (_, i) => i + 12).map((m) => (
                    <option key={m} value={m}>
                      {pn(m)}
                      {Math.floor(m / 12) - 1}
                    </option>
                  ))}
                </select>
              </label>
              <span className="inline-flex items-center gap-1.5">
                <Icon n="mic" className={micOn ? "breathe" : ""} />
                {micOn ? "écoute micro" : "micro en veille"}
              </span>
            </div>
            )}
          </div>
        </div>
      )}

      {/* ======= demande de nom / confirmation ======= */}
      {ask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "color-mix(in oklab, #05080c 66%, transparent)", backdropFilter: "blur(4px)" }}
          onClick={() => setAsk(null)}
        >
          <div
            className="sheet-in panel w-full max-w-[420px] p-4"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-[20px] font-extrabold tracking-tight">
              {ask.kind === "saveedit"
                ? "Enregistrer le clavier"
                : ask.kind === "saveas"
                  ? "Enregistrer sous…"
                  : ask.kind === "newkb"
                    ? "Nouveau clavier"
                    : ask.kind === "manage"
                      ? "Gérer le clavier"
                      : "Supprimer le clavier"}
            </h2>

            {ask.kind === "manage" ? (
              <>
                <p className="mt-1 text-[13.5px]" style={{ color: "var(--c-mu)" }}>
                  Que souhaitez-vous faire avec le clavier « {cur ?? "Mon clavier"} » ?
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <button
                    type="button"
                    className="ch min-h-[44px] text-[14px]"
                    style={{ background: "var(--c-card)", borderColor: "var(--c-bd)", color: "var(--c-tx)" }}
                    onClick={() => setAsk({ kind: "saveas", value: cur ?? "Mon clavier" })}
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      <Icon n="save" /> Enregistrer sous…
                    </span>
                  </button>
                  <button
                    type="button"
                    className="ch min-h-[44px] text-[14px]"
                    style={{ background: "var(--c-card)", borderColor: "var(--c-bd)", color: "var(--c-tx)" }}
                    onClick={() => { setAsk(null); exportKB(); }}
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      <Icon n="export" /> Exporter (télécharger en JSON)
                    </span>
                  </button>
                  <button
                    type="button"
                    className="ch min-h-[44px] text-[14px]"
                    style={{ background: "var(--c-card)", borderColor: "var(--c-bd)", color: "var(--c-tx)" }}
                    onClick={() => { setAsk(null); importKB(); }}
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      <Icon n="export" /> Importer (depuis un fichier JSON)
                    </span>
                  </button>
                  <button
                    type="button"
                    className="ch min-h-[44px] text-[14px]"
                    style={{ background: "var(--c-sel)", borderColor: "var(--c-sel)", color: "var(--c-selt)" }}
                    onClick={() => setAsk({ kind: "delete", value: "" })}
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      <Icon n="trash" /> Supprimer ce clavier
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-1 text-[13.5px]" style={{ color: "var(--c-mu)" }}>
                  {ask.kind === "delete"
                    ? `⚠️ Êtes-vous sûr de vouloir supprimer « ${cur} » ? Cette action est irréversible. Le clavier sera définitivement effacé de ce navigateur.`
                    : ask.kind === "saveedit"
                      ? `Choisis le nom du clavier (${comp.done}/${comp.total} notes renseignées).`
                      : ask.kind === "newkb"
                        ? "Un clavier d'usine sera créé sous ce nom."
                        : "Une copie du clavier actuel sera enregistrée sous ce nom."}
                </p>
                {ask.kind !== "delete" && (
                  <input
                    autoFocus
                    value={ask.value}
                    onChange={(e) => setAsk({ ...ask, value: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") confirmAsk();
                    }}
                    placeholder="Nom du clavier"
                    className="mt-3 min-h-[46px] w-full rounded-xl border px-3 text-[16px] font-semibold outline-none"
                    style={{ borderColor: "var(--c-bd)", background: "var(--c-bg2)", color: "var(--c-tx)" }}
                  />
                )}
                <div className="mt-3 flex gap-2">
                  <button type="button" className="ch flex-1" onClick={() => setAsk(null)}>
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="ch flex-1"
                    style={{
                      background: ask.kind === "delete" ? "var(--c-sel)" : "var(--c-tx)",
                      borderColor: ask.kind === "delete" ? "var(--c-sel)" : "var(--c-tx)",
                      color: ask.kind === "delete" ? "var(--c-selt)" : "var(--c-bg)",
                    }}
                    onClick={confirmAsk}
                  >
                    {ask.kind === "delete" ? "Supprimer" : "Enregistrer"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <FullscreenHint
        open={fsHint}
        onClose={() => setFsHint(false)}
        isIOS={fs.isIOS}
        active={fs.active}
        auto={fsAuto}
        canAuto={fs.supported && isStandaloneMode()}
        onAuto={(v) => {
          setFsAuto(v);
          saveFsAuto(v);
          if (!v && fs.active) void exitFullscreen();
          toast(v ? "L'appli passera en plein écran dès la première touche." : "Démarrage en mode normal.");
        }}
        onIcons={() => {
          setFsHint(false);
          setIconOpen(true);
        }}
        onInstall={() => {
          setFsHint(false);
          setInstallOpen(true);
        }}
      />

      <DiagSheet
        open={diagOpen}
        onClose={() => setDiagOpen(false)}
        status={pwa}
        installed={inst.installed}
        canPrompt={inst.canPrompt}
        onInstall={() => {
          setDiagOpen(false);
          setInstallOpen(true);
        }}
      />

      <IconSheet
        open={iconOpen}
        onClose={() => setIconOpen(false)}
        current={iconChoice}
        onPick={(id) => {
          setIconChoice(id);
          toast(`Icône « ${id === "dark" ? "Nuit" : id === "light" ? "Papier" : "Laiton"} » sélectionnée : télécharge les PNG ci-dessous.`);
        }}
      />

      <ChordPicker
        open={picker}
        root={S.root}
        enr={S.enr}
        mode={S.mode}
        isSym={isSym(S.enr)}
        tierces={S.tierces}
        onRoot={(value) => {
          setManual(null);
          setS((st) => ({ ...st, root: value, low: null }));
        }}
        onEnr={(v) => {
          setManual(null);
          setS((st) => ({ ...st, enr: v, low: null, more: false }));
        }}
        onMode={(m) => {
          if (!isSym(S.enr)) {
            setManual(null);
            setS((st) => ({ ...st, mode: m, low: null }));
          }
        }}
        onTierces={toggleTierces}
        onClose={() => setPicker(false)}
      />
      <ChordMenu
        open={chordMenu}
        enr={S.enr}
        onPick={(v) => setS((st) => ({ ...st, enr: v, low: null, more: false }))}
        onClose={() => setChordMenu(false)}
      />
      <HelpSheet open={helpOpen} onClose={() => setHelpOpen(false)} />

      <InstallSheet
        open={installOpen}
        onClose={() => setInstallOpen(false)}
        canPrompt={inst.canPrompt}
        installed={inst.installed}
        status={pwa}
        variant={iconChoice}
        onDiag={() => {
          setInstallOpen(false);
          setDiagOpen(true);
        }}
        onInstall={async () => {
          const r = await inst.promptInstall();
          if (r === "accepted") {
            setInstallOpen(false);
            toast("Application installée : lance-la depuis son icône.");
          } else if (r === "unavailable") {
            toast("Utilise le menu du navigateur → « Installer l'application ».");
          }
        }}
      />
            {bellowsPos === "bottom" && (
        <div className="panel rise mt-2.5 p-2.5 sm:p-3">
          <div className="flex items-center gap-1.5">
            <div
              className="flex-1"
              onClick={() => setDir(S.dir ? 0 : 1)}
              title={S.dir ? "Cliquez pour passer en Poussé" : "Cliquez pour passer en Tiré"}
              style={{ cursor: "pointer" }}
              role="button"
              aria-label="Basculer entre Poussé et Tiré"
            >
              <Bellows open={S.dir ? 78 : 30} playing={playing} flush />
            </div>
            <button
              type="button"
              onClick={() => setBellowsPos("top")}
              title="Remonter l'accordéon en haut"
              aria-label="Remonter l'accordéon en haut"
              className="ch grid h-9 w-9 min-h-[38px] shrink-0 place-items-center p-0 transition-transform hover:rotate-180"
              style={{ background: "var(--c-card)", borderColor: "var(--c-bd)", color: "var(--c-tx)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 8v12M7 20l-4-4M7 20l4-4M17 16V4M17 4l-4 4M17 4l4 4" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <Toast text={toastTxt} />
    </div>
  );
}
