import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/anton/400.css";
import "./styles.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// offline + installable
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  addEventListener("load", async () => {
    await navigator.serviceWorker.register("./sw.js");
    const reg = await navigator.serviceWorker.ready;
    // hand over everything this first visit loaded, so the app also opens offline
    const urls = performance.getEntriesByType("resource").map(e => e.name);
    reg.active?.postMessage({ type: "cache", urls });
  });
}
