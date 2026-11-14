/* ============================================================
   Détection de hauteur — NSDF (McLeod) + correction d'octave par FFT
   Reprise telle quelle de l'appli d'origine.
   ============================================================ */
import { freqToMidi } from "./music";

export type Detection = { midi: number; freq: number; cents: number; clarity: number };

export function nsdf(buf: Float32Array, sr: number): { freq: number; clarity: number } | null {
  const n = buf.length;
  let rms = 0;
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / n);
  if (rms < 0.004) return null;

  const W = Math.min(2048, n);
  const off = Math.floor((n - W) / 2);
  const x = buf.subarray(off, off + W);
  const minLag = Math.floor(sr / 2200);
  const maxLag = Math.floor(sr / 40);
  const nsdfArr = new Float32Array(maxLag + 2);

  for (let lag = minLag; lag <= maxLag; lag++) {
    let acf = 0;
    let m = 0;
    for (let i = 0; i < W - lag; i++) {
      const a = x[i];
      const b = x[i + lag];
      acf += a * b;
      m += a * a + b * b;
    }
    nsdfArr[lag] = m > 0 ? (2 * acf) / m : 0;
  }

  let maxV = 0;
  for (let lag = minLag; lag <= maxLag; lag++) if (nsdfArr[lag] > maxV) maxV = nsdfArr[lag];
  if (maxV < 0.3) return null;

  const thr = maxV * 0.9;
  let bestLag = -1;
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    if (nsdfArr[lag] > thr && nsdfArr[lag] >= nsdfArr[lag - 1] && nsdfArr[lag] >= nsdfArr[lag + 1]) {
      bestLag = lag;
      break;
    }
  }
  if (bestLag < 0) {
    for (let lag = minLag; lag <= maxLag; lag++)
      if (nsdfArr[lag] === maxV) {
        bestLag = lag;
        break;
      }
  }
  if (bestLag < 0) return null;

  const y0 = nsdfArr[bestLag - 1] || 0;
  const y1 = nsdfArr[bestLag];
  const y2 = nsdfArr[bestLag + 1] || 0;
  const den = y0 - 2 * y1 + y2;
  const sh = den !== 0 ? (0.5 * (y0 - y2)) / den : 0;
  const period = bestLag + sh;
  if (period <= 0) return null;

  const freq = sr / period;
  if (freq < 40 || freq > 2200) return null;
  return { freq, clarity: maxV };
}

export function fftCorrect(freq: number, analyser: AnalyserNode, sr: number): number {
  const N = analyser.frequencyBinCount;
  const spec = new Float32Array(N);
  analyser.getFloatFrequencyData(spec);
  const binHz = sr / 2 / N;
  const mag = (f: number) => {
    const b = Math.round(f / binHz);
    if (b < 1 || b >= N) return -200;
    return spec[b];
  };
  const m1 = mag(freq);
  const m2 = mag(freq / 2);
  const m3 = mag(freq * 2);
  if (m2 > m1 + 6 && m2 > m3 - 6) return freq / 2;
  if (m3 > m1 + 6 && m3 > m2 - 6) return freq * 2;
  return freq;
}

export function detect(
  buf: Float32Array,
  sr: number,
  analyser: AnalyserNode,
  skipOctaveCorrection = false,
): Detection | null {
  const r = nsdf(buf, sr);
  if (!r) return null;
  const freq = skipOctaveCorrection ? r.freq : fftCorrect(r.freq, analyser, sr);
  if (freq < 40 || freq > 2200) return null;
  const midiF = freqToMidi(freq);
  const midi = Math.round(midiF);
  const cents = Math.round((midiF - midi) * 100);
  return { midi, freq: Math.round(freq * 10) / 10, cents, clarity: r.clarity };
}
