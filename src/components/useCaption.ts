import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// bottom text: tap for a new one; it also changes whenever you copy or share
const CAPTIONS = [
  "but make it horse",
  "neigh means neigh",
  "straight from the horse's mouth",
  "hold your horses",
  "samuel morse is shaking",
  "why the long face",
  "hay is for horses",
  "sent from my horse",
  "no horsing around",
  "stable genius communication",
  "you can lead a horse to morse",
  "certified neigh-tive speaker",
];

export function useCaption() {
  const [caption, setText] = useState(CAPTIONS[0]);
  const [bump, setBump] = useState(0);
  const captionRef = useRef<HTMLButtonElement>(null);

  // shrink the bottom text until it fits on two lines
  const fit = useCallback(() => {
    const el = captionRef.current;
    if (!el) return;
    el.style.removeProperty("--fit");
    let size = parseFloat(getComputedStyle(el).fontSize);
    while (el.scrollHeight > size * 2.15 && size > 18) {
      size -= 2;
      el.style.setProperty("--fit", `${size}px`);
    }
  }, []);

  useLayoutEffect(() => {
    fit();
    const el = captionRef.current;
    if (!el || !bump) return;
    el.classList.remove("bump");
    void el.offsetWidth;
    el.classList.add("bump");
  }, [caption, bump, fit]);

  useEffect(() => {
    addEventListener("resize", fit);
    document.fonts?.ready.then(fit);
    return () => removeEventListener("resize", fit);
  }, [fit]);

  const setCaption = useCallback((t: string) => { setText(t); setBump(b => b + 1); }, []);
  const nextCaption = useCallback(() => {
    setText(c => {
      let n = c;
      while (n === c) n = CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)];
      return n;
    });
    setBump(b => b + 1);
  }, []);

  return { caption, setCaption, nextCaption, captionRef };
}
