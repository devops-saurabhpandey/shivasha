import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

function PwaControls() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [waitingWorker, setWaitingWorker] = useState(null);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    let registration;
    let reloading = false;
    const onControllerChange = () => {
      if (!reloading) {
        reloading = true;
        window.location.reload();
      }
    };
    navigator.serviceWorker?.addEventListener("controllerchange", onControllerChange);

    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
      const swUrl = new URL("sw.js", import.meta.env.BASE_URL).toString();
      navigator.serviceWorker.register(swUrl, { scope: import.meta.env.BASE_URL })
        .then((reg) => {
          registration = reg;
          if (reg.waiting && navigator.serviceWorker.controller) {
            setWaitingWorker(reg.waiting);
            setUpdateReady(true);
          }
          reg.addEventListener("updatefound", () => {
            const worker = reg.installing;
            if (!worker) return;
            worker.addEventListener("statechange", () => {
              if (worker.state === "installed" && navigator.serviceWorker.controller) {
                setWaitingWorker(worker);
                setUpdateReady(true);
              }
            });
          });
          reg.update().catch(() => {});
        })
        .catch((error) => console.error("SHIVASHA PWA setup failed:", error));
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      navigator.serviceWorker?.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  };
  const update = () => waitingWorker?.postMessage("SKIP_WAITING");

  return <>
    {installPrompt && <button onClick={install} style={barStyle}>Install SHIVASHA</button>}
    {updateReady && <div role="status" style={updateStyle}>
      <span>New SHIVASHA update is ready.</span>
      <button onClick={update} style={buttonStyle}>Update now</button>
      <button onClick={() => setUpdateReady(false)} aria-label="Dismiss update" style={dismissStyle}>×</button>
    </div>}
  </>;
}

const barStyle = { position: "fixed", right: 16, bottom: 16, zIndex: 9999, padding: "12px 16px", border: 0, borderRadius: 12, background: "#f59e0b", color: "#111827", fontWeight: 700, boxShadow: "0 4px 18px #0004" };
const updateStyle = { position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 10000, display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", padding: 14, borderRadius: 14, background: "#111827", color: "white", boxShadow: "0 4px 24px #0005" };
const buttonStyle = { border: 0, borderRadius: 8, padding: "9px 12px", background: "#f59e0b", color: "#111827", fontWeight: 700 };
const dismissStyle = { border: 0, background: "transparent", color: "white", fontSize: 22 };

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    <PwaControls />
  </React.StrictMode>
);