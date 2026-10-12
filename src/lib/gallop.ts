// Hoofbeats: each dot is one clop, each dash a clip-clop, in Morse timing.
import type { Model } from "./morse";

export const UNIT = 0.11;

export interface Step { at: number; dash: boolean; letter: number; symbol: number; word: number }

export function timeline(model: Model) {
  const steps: Step[] = [];
  let t = 0, letter = 0, symbol = 0;
  model.forEach((word, wi) => {
    if (wi) t += UNIT * 4;                       // 7 units between words
    word.forEach((m, li) => {
      if (li) t += UNIT * 2;                     // 3 units between letters
      [...m].forEach((sym, si) => {
        if (si) t += UNIT;                       // 1 unit between symbols
        const dash = sym === "-";
        steps.push({ at: t, dash, letter, symbol: symbol++, word: wi });
        t += dash ? UNIT * 3 : UNIT;
      });
      letter++;
    });
  });
  return { steps, length: t };
}

function clop(ac: BaseAudioContext, dest: AudioNode, t: number, pitch: number) {
  const len = 0.07;
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * len), ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 6);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 900 * pitch;
  bp.Q.value = 4;
  const g = ac.createGain();
  g.gain.value = 1.6;
  src.connect(bp).connect(g).connect(dest);
  src.start(t);
  return src;
}

export const hooves = (ac: BaseAudioContext, dest: AudioNode, start: number, steps: Step[]) =>
  steps.flatMap(({ at, dash }) => {
    const s = [clop(ac, dest, start + at, 1.1)];
    if (dash) s.push(clop(ac, dest, start + at + UNIT * 1.6, 0.8));
    return s;
  });

// ---------- live playback ----------

type AC = typeof AudioContext;
let ctx: AudioContext | null = null;

// on iPhone, web audio follows the silent switch unless it's marked as media playback
const nav = navigator as Navigator & { audioSession?: { type: string } };
if (nav.audioSession) nav.audioSession.type = "playback";

export function play(model: Model, onStep: (s: Step | null) => void, onEnd: () => void) {
  const Ctor: AC = window.AudioContext || (window as unknown as { webkitAudioContext: AC }).webkitAudioContext;
  ctx ||= new Ctor();
  ctx.resume();
  const master = ctx.createGain();
  master.connect(ctx.destination);
  const { steps, length } = timeline(model);
  const sources = hooves(ctx, master, ctx.currentTime + 0.05, steps);
  const timers = steps.map(s => window.setTimeout(() => onStep(s), s.at * 1000 + 50));
  timers.push(window.setTimeout(() => { stop(); onEnd(); }, length * 1000 + 300));

  function stop() {
    timers.forEach(clearTimeout);
    sources.forEach(src => { try { src.stop(); } catch { /* already stopped */ } });
    master.disconnect();
    onStep(null);
  }
  return stop;
}

// ---------- mp3 ----------

interface LameJs { Mp3Encoder: new (ch: number, rate: number, kbps: number) => { encodeBuffer(b: Int16Array): Int8Array; flush(): Int8Array } }

let lame: Promise<LameJs> | null = null;
const loadLame = () => lame ||= new Promise<LameJs>((resolve, reject) => {
  const sc = document.createElement("script");
  sc.src = "https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js";
  sc.onload = () => resolve((window as unknown as { lamejs: LameJs }).lamejs);
  sc.onerror = () => { lame = null; reject(new Error("encoder failed to load")); };
  document.head.appendChild(sc);
});

function toMp3(lamejs: LameJs, audio: AudioBuffer) {
  const pcm = audio.getChannelData(0);
  const ints = new Int16Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) ints[i] = Math.max(-1, Math.min(1, pcm[i])) * 0x7fff;
  const enc = new lamejs.Mp3Encoder(1, audio.sampleRate, 128);
  const parts: Uint8Array[] = [];
  for (let i = 0; i < ints.length; i += 1152) {
    const chunk = enc.encodeBuffer(ints.subarray(i, i + 1152));
    if (chunk.length) parts.push(new Uint8Array(chunk));
  }
  const end = enc.flush();
  if (end.length) parts.push(new Uint8Array(end));
  return new Blob(parts as BlobPart[], { type: "audio/mpeg" });
}

type OAC = typeof OfflineAudioContext;

export async function gallopFile(model: Model, name: string) {
  const { steps, length } = timeline(model);
  const lamejs = await loadLame();
  const rate = 44100;
  const Ctor: OAC = window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext: OAC }).webkitOfflineAudioContext;
  const off = new Ctor(1, Math.ceil((length + 0.4) * rate), rate);
  hooves(off, off.destination, 0.1, steps);
  const audio = await new Promise<AudioBuffer>((resolve, reject) => {
    off.oncomplete = e => resolve(e.renderedBuffer);
    const p = off.startRendering() as Promise<AudioBuffer> | undefined;
    if (p) p.then(resolve, reject);
  });
  return new File([toMp3(lamejs, audio)], `gallop-${name}.mp3`, { type: "audio/mpeg" });
}

// opens the system share sheet (contacts, apps…); browsers without file sharing get a download
export const canShareFiles = (() => {
  try { return !!navigator.canShare?.({ files: [new File([""], "x.mp3", { type: "audio/mpeg" })] }); }
  catch { return false; }
})();

export function download(file: File) {
  const url = URL.createObjectURL(file);
  const a = Object.assign(document.createElement("a"), { href: url, download: file.name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const shareFile = async (file: File) => {
  if (canShareFiles && navigator.canShare({ files: [file] })) {
    // falls back to a download if the browser refuses the share
    await navigator.share({ files: [file] }).catch(e => { if (e.name !== "AbortError") download(file); });
  } else {
    download(file);
  }
};
