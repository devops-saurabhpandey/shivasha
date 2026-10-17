import React, { useEffect, useState } from "react";
import packageInfo from "../package.json";

const RELEASES_API = "https://api.github.com/repos/devops-saurabhpandey/shivasha/releases/latest";
const CURRENT_VERSION = packageInfo.version || "1.0.0";

function normalizeVersion(value = "") {
  return value.replace(/^v/i, "").split(/[+-]/)[0].split(".").map(part => Number.parseInt(part, 10) || 0);
}
function isNewer(candidate, current) {
  const a = normalizeVersion(candidate);
  const b = normalizeVersion(current);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if ((a[i] || 0) > (b[i] || 0)) return true;
    if ((a[i] || 0) < (b[i] || 0)) return false;
  }
  return false;
}

export default function UpdateChecker() {
  const [state, setState] = useState("idle");
  const [release, setRelease] = useState(null);
  const [details, setDetails] = useState("");

  const check = async (manual = false) => {
    setState("checking");
    setDetails("");
    try {
      const response = await fetch(RELEASES_API, {
        headers: { Accept: "application/vnd.github+json" },
        cache: "no-store"
      });
      if (response.status === 404) {
        setRelease(null);
        setState("current");
        setDetails("No official update has been published yet.");
        return;
      }
      if (!response.ok) throw new Error("Could not check updates right now.");
      const data = await response.json();
      const apk = (data.assets || []).find(asset => asset.name.toLowerCase().endsWith(".apk"));
      if (!apk || !isNewer(data.tag_name || data.name, CURRENT_VERSION)) {
        setRelease(null);
        setState("current");
        setDetails("You are using the latest published version.");
        return;
      }
      setRelease({ ...data, apk });
      setState("available");
    } catch {
      setState("error");
      setDetails("Update check failed. Please try again when you are online.");
    }
  };

  useEffect(() => {
    check();
    const timer = window.setInterval(() => check(), 6 * 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const download = () => {
    if (!release?.apk?.browser_download_url) return;
    // Opening the release asset lets Android show its normal download/install confirmation.
    window.open(release.apk.browser_download_url, "_blank", "noopener,noreferrer");
  };

  return (
    <aside aria-live="polite" style={panelStyle}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <strong>SHIVASHA Updates</strong>
        {state === "available" && <p style={textStyle}>Version {release.tag_name} is available.</p>}
        {state === "checking" && <p style={textStyle}>Checking for updates…</p>}
        {(state === "current" || state === "error") && details && <p style={textStyle}>{details}</p>}
      </div>
      {state === "available" && <button onClick={download} style={primaryStyle}>Download Update</button>}
      <button onClick={() => check(true)} disabled={state === "checking"} style={secondaryStyle}>Check</button>
      <span style={versionStyle}>Installed: v{CURRENT_VERSION}</span>
    </aside>
  );
}

const panelStyle = { position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 10001, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, padding: 14, borderRadius: 14, background: "#111827", color: "#fff", boxShadow: "0 4px 24px #0005", fontSize: 13 };
const textStyle = { margin: "5px 0 0", color: "#d1d5db" };
const primaryStyle = { border: 0, borderRadius: 8, padding: "9px 12px", background: "#f59e0b", color: "#111827", fontWeight: 700 };
const secondaryStyle = { border: "1px solid #6b7280", borderRadius: 8, padding: "8px 10px", background: "transparent", color: "#fff" };
const versionStyle = { width: "100%", color: "#9ca3af", fontSize: 11 };