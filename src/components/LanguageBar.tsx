import { LANG, LANGS } from "../lib/morse";

interface Props {
  mode: "encode" | "decode";
  src: string;
  dst: string;
  detected: string | null;
  onSrc: (code: string) => void;
  onDst: (code: string) => void;
  onSwap: () => void;
}

// [language ▾] ⇄ [horse], flipped when decoding — the Google Translate layout
export function LanguageBar({ mode, src, dst, detected, onSrc, onDst, onSwap }: Props) {
  // the pill shows our own label; the real <select> sits on top, invisible, so phones get their native picker
  const sourceName = src === "auto" ? (detected ? LANG[detected].name : "detect") : LANG[src].name;
  const source = (
    <label className="lang">
      <span className="lang-text" aria-hidden="true">
        {sourceName}
        {src === "auto" && detected && <small>auto</small>}
      </span>
      <span className="sr">Translate from</span>
      <select value={src} onChange={e => onSrc(e.target.value)}>
        <option value="auto">{detected ? `${LANG[detected].name} (auto)` : "detect"}</option>
        {LANGS.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
      </select>
      <Caret />
    </label>
  );

  const target = (
    <label className="lang">
      <span className="lang-text" aria-hidden="true">{LANG[dst].name}</span>
      <span className="sr">Translate into</span>
      <select value={dst} onChange={e => onDst(e.target.value)}>
        {LANGS.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
      </select>
      <Caret />
    </label>
  );

  const horse = <span className="lang horse"><span className="emoji" aria-hidden="true">🐴</span>horse</span>;

  return (
    <div className="langbar">
      {mode === "encode" ? source : horse}
      <button className={`swap${mode === "decode" ? " flipped" : ""}`} type="button" onClick={onSwap} aria-label="Swap languages">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 7h13M12.5 3.5 16 7l-3.5 3.5M17 13H4M7.5 9.5 4 13l3.5 3.5" />
        </svg>
      </button>
      {mode === "encode" ? horse : target}
    </div>
  );
}

const Caret = () => (
  <svg className="caret" viewBox="0 0 12 12" aria-hidden="true">
    <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
