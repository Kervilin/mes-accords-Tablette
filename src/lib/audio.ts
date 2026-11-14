/* ============================================================
   Petit synthé « anches libres » : deux oscillateurs légèrement
   désaccordés par note (effet musette), filtre passe-bas,
   enveloppe de soufflet.
   ============================================================ */

let actx: AudioContext | null = null;
let live: { osc: OscillatorNode[]; gain: GainNode; stopAt: number } | null = null;

function ctx(): AudioContext | null {
  try {
    if (!actx || actx.state === "closed") {
      const AC: typeof AudioContext =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
    }
    if (actx.state === "suspended") void actx.resume().catch(() => undefined);
    return actx;
  } catch {
    return null;
  }
}

/** Call from the initial touch so mobile audio is unlocked before the hold timer. */
export function prepareAudio(): void {
  ctx();
}

function trackVoice(osc: OscillatorNode[], gain: GainNode, nodes: AudioNode[], stopAt: number) {
  const voice = { osc, gain, stopAt };
  live = voice;
  let remaining = osc.length;
  for (const oscillator of osc) {
    oscillator.onended = () => {
      if (--remaining > 0) return;
      nodes.forEach((node) => node.disconnect());
      if (live === voice) live = null;
    };
  }
}

export function stopChord() {
  const c = actx;
  if (!c || !live) return;
  const { osc, gain, stopAt } = live;
  const t = c.currentTime;
  if (t < stopAt) {
    try {
      if (typeof gain.gain.cancelAndHoldAtTime === "function") gain.gain.cancelAndHoldAtTime(t);
      else {
        const level = Math.max(gain.gain.value, 0.0001);
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(level, t);
      }
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      osc.forEach((o) => o.stop(t + 0.08));
    } catch {}
  }
  live = null;
}

/** midis : liste de hauteurs MIDI à jouer ensemble. */
export function playChord(midis: number[], dur = 1.9): boolean {
  const c = ctx();
  if (!c) return false;
  stopChord();
  const uniq = [...new Set(midis.filter((m) => m > 20 && m < 110))];
  if (!uniq.length) return false;

  const t0 = c.currentTime + 0.03;
  const master = c.createGain();
  master.gain.setValueAtTime(0.0001, t0);
  master.gain.exponentialRampToValueAtTime(0.24, t0 + 0.09);
  master.gain.setTargetAtTime(0.19, t0 + 0.12, 0.35);
  master.gain.setValueAtTime(0.19, t0 + dur * 0.62);
  master.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 5;
  master.connect(comp);
  comp.connect(c.destination);

  const oscs: OscillatorNode[] = [];
  const nodes: AudioNode[] = [master, comp];
  uniq.forEach((m, i) => {
    const f = 440 * Math.pow(2, (m - 69) / 12);
    const delay = i * 0.016;
    const g = c.createGain();
    g.gain.value = 0.42 / (1 + i * 0.12);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(Math.min(7000, f * 3.2), t0);
    lp.frequency.linearRampToValueAtTime(Math.min(9000, f * 7), t0 + 0.18 + delay);
    lp.frequency.linearRampToValueAtTime(Math.min(4200, f * 3), t0 + dur);
    lp.Q.value = 0.8;
    g.connect(lp);
    lp.connect(master);
    nodes.push(g, lp);
    [-8, 8].forEach((det) => {
      const o = c.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(f, t0);
      o.detune.value = det;
      const og = c.createGain();
      og.gain.setValueAtTime(0.0001, t0);
      og.gain.linearRampToValueAtTime(0.55, t0 + 0.05 + delay);
      o.connect(og);
      og.connect(g);
      o.start(t0 + delay);
      o.stop(t0 + dur + 0.06);
      oscs.push(o);
      nodes.push(o, og);
    });
  });

  trackVoice(oscs, master, nodes, t0 + dur + 0.1);
  return true;
}

/** Bip court de confirmation (édition / accordage). */
export function blip(freq = 880, dur = 0.08) {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime;
  const o = c.createOscillator();
  o.type = "triangle";
  o.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

/**
 * Accord tenu : joué tant que `stopChord()` n'est pas appelé (appui long).
 * Même timbre que `playChord`, sans extinction automatique.
 */
export function holdChord(midis: number[]): boolean {
  const c = ctx();
  if (!c) return false;
  stopChord();
  const uniq = [...new Set(midis.filter((m) => m > 20 && m < 110))];
  if (!uniq.length) return false;

  const t0 = c.currentTime + 0.02;
  const master = c.createGain();
  master.gain.setValueAtTime(0.0001, t0);
  master.gain.exponentialRampToValueAtTime(0.24, t0 + 0.08);
  master.gain.setTargetAtTime(0.19, t0 + 0.12, 0.35);

  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 5;
  master.connect(comp);
  comp.connect(c.destination);

  const oscs: OscillatorNode[] = [];
  const nodes: AudioNode[] = [master, comp];
  uniq.forEach((m, i) => {
    const f = 440 * Math.pow(2, (m - 69) / 12);
    const delay = i * 0.016;
    const g = c.createGain();
    g.gain.value = 0.42 / (1 + i * 0.12);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(Math.min(7000, f * 3.2), t0);
    lp.frequency.linearRampToValueAtTime(Math.min(8000, f * 5), t0 + 0.2 + delay);
    lp.Q.value = 0.8;
    g.connect(lp);
    lp.connect(master);
    nodes.push(g, lp);
    [-8, 8].forEach((det) => {
      const o = c.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(f, t0);
      o.detune.value = det;
      const og = c.createGain();
      og.gain.setValueAtTime(0.0001, t0);
      og.gain.linearRampToValueAtTime(0.55, t0 + 0.05 + delay);
      o.connect(og);
      og.connect(g);
      o.start(t0 + delay);
      oscs.push(o);
      nodes.push(o, og);
    });
  });

  // stopAt infini : tant que rien ne l'arrête, le son continue
  trackVoice(oscs, master, nodes, Number.POSITIVE_INFINITY);
  return true;
}
