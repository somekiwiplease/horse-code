import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { LANG, decode, detect, encode, horseText, isHorses, parse, toHorse, type Model } from "./lib/morse";
import { gallopFile, play, shareFile, type Step } from "./lib/gallop";
import { LanguageBar } from "./components/LanguageBar";
import { InstallButton } from "./components/InstallButton";
import { useCaption } from "./components/useCaption";

type Mode = "encode" | "decode";

// text shared into the installed app (Android share sheet) or linked with ?q=
function sharedText() {
  const p = new URLSearchParams(location.search);
  const text = [p.get("q"), p.get("title"), p.get("text"), p.get("url")].filter(Boolean).join(" ");
  if (text) history.replaceState(null, "", location.pathname);
  return text;
}

const slug = (s: string) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 32) || "gallop";

export default function App() {
  const [initial] = useState(sharedText);
  const [text, setText] = useState(initial);
  const [mode, setMode] = useState<Mode>(() => (isHorses(initial) ? "decode" : "encode"));
  const [src, setSrc] = useState("auto");   // language typed in (english → horse)
  const [dst, setDst] = useState("en");     // language decoded into (horse → english)
  const { caption, setCaption, nextCaption, captionRef } = useCaption();

  const detected = useMemo(() => detect(text), [text]);
  const encLang = src === "auto" ? detected : src;

  const model: Model = useMemo(
    () => (mode === "encode" ? encode(text, encLang) : parse(text)),
    [mode, text, encLang],
  );
  const decoded = useMemo(() => (mode === "decode" ? decode(model, dst) : null), [mode, model, dst]);
  const plain = mode === "encode" ? horseText(model) : model.length ? decoded!.text : "";

  // ---------- input ----------

  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (matchMedia("(pointer: fine)").matches) inputRef.current?.focus();
  }, []);
  useLayoutEffect(() => {
    const el = inputRef.current!;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + el.offsetHeight - el.clientHeight + "px";
    // only scroll once it hits its max height
    el.style.overflowY = el.scrollHeight > el.clientHeight + 1 ? "auto" : "hidden";
  }, [text, mode]);

  const onInput = (value: string) => {
    setText(value);
    // pasting horses while encoding flips straight to decode, like a translator would
    if (mode === "encode" && isHorses(value)) {
      if (src !== "auto") setDst(src);
      setMode("decode");
      setCaption("straight from the horse's mouth");
    }
  };

  // swap sides: the result becomes the new input, like Google Translate
  const swap = () => {
    if (mode === "encode") {
      setDst(encLang);
      setMode("decode");
      setCaption("straight from the horse's mouth");
    } else {
      setSrc(dst);
      setMode("encode");
      setCaption("but make it horse");
    }
    if (plain) setText(plain);
    inputRef.current?.focus();
  };

  // ---------- hear gallop ----------

  const [active, setActive] = useState<Step | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const playing = !!stopRef.current;
  const [, force] = useState(0);

  const stop = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    setActive(null);
    force(n => n + 1);
  }, []);

  useEffect(stop, [model, dst, stop]);
  useEffect(() => {
    const onHide = () => document.hidden && stop();
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [stop]);

  const toggleGallop = () => {
    if (stopRef.current) return stop();
    stopRef.current = play(model, setActive, () => { stopRef.current = null; setActive(null); force(n => n + 1); });
    force(n => n + 1);
  };

  // which bit of the output lights up: horses when encoding, letters (or whole words) when decoding
  const wordLevel = mode === "decode" && (dst === "ar" || dst === "ja");
  const lit = active ? (mode === "encode" ? active.symbol : wordLevel ? active.word : active.letter) : -1;

  const outRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = outRef.current;
    const el = box?.querySelector<HTMLElement>(".on");
    if (!box || !el) return;
    // scroll only the output box, never the page
    const top = el.offsetTop - box.offsetTop, bottom = top + el.offsetHeight;
    if (top < box.scrollTop + 46) box.scrollTop = top - 46;
    else if (bottom > box.scrollTop + box.clientHeight - 12) box.scrollTop = bottom - box.clientHeight + 12;
  }, [lit]);

  // ---------- copy ----------

  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number>(0);
  const copy = async () => {
    if (!plain) return;
    try {
      await navigator.clipboard.writeText(plain);
    } catch {
      const t = document.createElement("textarea");
      t.value = plain;
      t.setAttribute("readonly", "");
      t.style.cssText = "position:fixed;opacity:0;top:0";
      document.body.appendChild(t);
      t.select();
      t.setSelectionRange(0, plain.length);
      document.execCommand("copy");
      t.remove();
    }
    setCopied(true);
    clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
    nextCaption();
  };

  // ---------- share gallop ----------

  // the mp3 is built in the background, so the tap can open the share sheet right away (iPhone needs that)
  const key = mode + "|" + plain;
  const gallop = useRef<{ key: string; file: File | null; promise: Promise<File> | null }>({ key: "", file: null, promise: null });
  const getGallop = useCallback(() => {
    if (gallop.current.key !== key) {
      const g = { key, file: null as File | null, promise: gallopFile(model, slug(mode === "encode" ? text : plain)) };
      g.promise.then(f => { g.file = f; }, () => { if (gallop.current === g) gallop.current = { key: "", file: null, promise: null }; });
      gallop.current = g;
    }
    return gallop.current;
  }, [key, model, mode, text, plain]);

  useEffect(() => {
    if (!plain) return;
    const t = setTimeout(getGallop, 600);
    return () => clearTimeout(t);
  }, [plain, getGallop]);

  const [shareLabel, setShareLabel] = useState("share gallop");
  const [sharing, setSharing] = useState(false);
  const share = async () => {
    if (sharing || !plain) return;
    const g = getGallop();
    setSharing(true);
    try {
      if (g.file) await shareFile(g.file);
      else {
        setShareLabel("saddling up…");
        await shareFile(await g.promise!);
      }
      setShareLabel("giddy up");
      nextCaption();
    } catch {
      setShareLabel("try again");
    }
    setTimeout(() => { setShareLabel("share gallop"); setSharing(false); }, 1600);
  };

  // ---------- render ----------

  const outLang = mode === "decode" ? LANG[dst] : null;
  let symbol = 0, letter = 0;

  return (
    <>
      <div className="scene" aria-hidden="true">
        <span className="cloud" style={{ top: "14%", "--w": "120px", "--d": "70s", "--delay": "-20s" } as React.CSSProperties} />
        <span className="cloud" style={{ top: "34%", "--w": "80px", "--d": "55s", "--delay": "-42s" } as React.CSSProperties} />
        <span className="cloud" style={{ top: "52%", "--w": "150px", "--d": "90s", "--delay": "-5s" } as React.CSSProperties} />
      </div>

      <main>
        <InstallButton />
        <h1 className="meme">Horse code</h1>

        <LanguageBar
          mode={mode}
          src={src}
          dst={dst}
          detected={text.trim() ? detected : null}
          onSrc={setSrc}
          onDst={setDst}
          onSwap={swap}
        />

        <div className="stack">
          <textarea
            ref={inputRef}
            value={text}
            onChange={e => onInput(e.target.value)}
            rows={1}
            dir="auto"
            placeholder={mode === "encode" ? "type in any language" : "paste horse code 🐴🐎"}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="Message"
          />

          {plain && (
            <div className="outbox">
              <div
                ref={outRef}
                id="out"
                className={`${mode === "decode" ? "decoded" : ""} ${playing ? "playing" : ""}`}
                dir={outLang?.dir ?? "ltr"}
                role="button"
                tabIndex={0}
                aria-label={`${mode === "encode" ? "Horse code" : "Translation"}, tap to copy`}
                onClick={copy}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); copy(); } }}
              >
                {mode === "encode"
                  ? model.map((w, wi) => (
                      <span className="word" key={wi}>
                        {w.map((m, li) => (
                          <span className="letter" key={li}>
                            {[...m].map((s, si) => {
                              const i = symbol++;
                              return <span key={si} className={`h${i === lit ? " on" : ""}`}>{toHorse(s)}</span>;
                            })}
                          </span>
                        ))}
                      </span>
                    ))
                  : decoded!.words.map((w, wi) =>
                      wordLevel ? (
                        <span className={`word whole${wi === lit ? " on" : ""}`} key={wi}>
                          {w.map(l => l.ch).join("").normalize("NFC")}
                        </span>
                      ) : (
                        <span className="word" key={wi}>
                          {w.map((l, li) => {
                            const i = letter++;
                            return <span key={li} className={`ch${l.ok ? "" : " unk"}${i === lit ? " on" : ""}`}>{l.ch}</span>;
                          })}
                        </span>
                      ),
                    )}
                {mode === "decode" && decoded!.unknown > 0 && (
                  <p className="hint">some horses made no sense. check there's a space between letters.</p>
                )}
              </div>
              <button className={`tag${copied ? " done" : ""}`} type="button" onClick={copy} aria-live="polite">
                <svg className="sheets" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="5" width="9" height="9" rx="2" /><path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" /></svg>
                <svg className="tick" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" /></svg>
                <span>{copied ? "copied" : "copy"}</span>
              </button>
            </div>
          )}

          {plain && (
            <div className="bar">
              <button className={`pill${playing ? " on" : ""}`} type="button" onClick={toggleGallop}>
                <svg className="i-play" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 2.8v10.4a.8.8 0 0 0 1.2.7l8.4-5.2a.8.8 0 0 0 0-1.4L5.7 2.1a.8.8 0 0 0-1.2.7z" fill="currentColor" /></svg>
                <svg className="i-stop" viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="3.5" width="9" height="9" rx="1.5" fill="currentColor" /></svg>
                <span>{playing ? "stop" : "hear gallop"}</span>
              </button>
              <button className="pill ghost" type="button" onClick={share} disabled={sharing}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 10V2.5M5 5.5 8 2.5l3 3M4.5 8H4a1 1 0 0 0-1 1v4.5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-.5" /></svg>
                <span>{shareLabel}</span>
              </button>
            </div>
          )}
        </div>

        <footer className="ground">
          <button ref={captionRef} className="meme bottom" type="button" aria-label="New caption" onClick={nextCaption}>
            {caption}
          </button>
        </footer>
      </main>
    </>
  );
}
