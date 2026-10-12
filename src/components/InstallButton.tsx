import { useEffect, useState } from "react";

interface InstallPrompt extends Event { prompt(): Promise<void> }

const standalone = () =>
  matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

// put horse code on the home screen: Android/desktop get the real install prompt, iPhone gets the steps
export function InstallButton() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(standalone);

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as InstallPrompt); };
    const onInstalled = () => { setInstalled(true); setOpen(false); };
    addEventListener("beforeinstallprompt", onPrompt);
    addEventListener("appinstalled", onInstalled);
    return () => {
      removeEventListener("beforeinstallprompt", onPrompt);
      removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open]);

  if (installed) return null;

  const install = async () => {
    if (prompt) {
      await prompt.prompt();
      setPrompt(null);
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <button className="install" type="button" onClick={install} aria-label="Add horse code to your home screen" title="Add to home screen">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="5" y="2" width="10" height="16" rx="2.2" /><path d="M10 6.5v6M7.5 10 10 12.5 12.5 10" />
        </svg>
      </button>

      {open && (
        <div className="sheet-backdrop" onClick={() => setOpen(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="install-title" onClick={e => e.stopPropagation()}>
            <h2 id="install-title" className="meme">get the horse app</h2>
            {isIOS() ? (
              <ol>
                <li>Tap <b>Share</b> <ShareIcon /> in Safari</li>
                <li>Scroll down, tap <b>Add to Home Screen</b></li>
                <li>Tap <b>Add</b>. The horse lives there now.</li>
              </ol>
            ) : (
              <ol>
                <li>Open your browser menu <b>⋮</b></li>
                <li>Tap <b>Install app</b> or <b>Add to Home screen</b></li>
                <li>Done. The horse lives there now.</li>
              </ol>
            )}
            <button className="pill" type="button" onClick={() => setOpen(false)}>got it</button>
          </div>
        </div>
      )}
    </>
  );
}

const ShareIcon = () => (
  <svg className="inline-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 10V2.5M5 5.5 8 2.5l3 3M4.5 8H4a1 1 0 0 0-1 1v4.5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-.5" />
  </svg>
);
