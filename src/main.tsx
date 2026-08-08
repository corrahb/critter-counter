import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";

registerSW({
  immediate: true,
  // fires once, when the app's complete offline copy is safely stored —
  // the UI turns it into a toast so nobody has to guess whether
  // airplane-mode is safe yet
  onOfflineReady() {
    window.dispatchEvent(new Event("cc-offline-ready"));
  },
});

// ask Chrome to shield this origin's storage from automatic eviction —
// granted silently for installed PWAs, and the walk log lives there
navigator.storage?.persist?.().catch(() => {});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
