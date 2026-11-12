import React, { useEffect, useRef, useState } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { CameraPreview } from "@capgo/camera-preview";

const NativeCamera2 = registerPlugin("ShivashaCamera2");

const panel = { background: "#101827", color: "#f8fafc", borderRadius: 18, padding: 18, boxShadow: "0 12px 36px rgba(15,23,42,.16)" };
const button = { border: 0, borderRadius: 12, padding: "12px 16px", fontWeight: 800, cursor: "pointer" };

export default function CameraStudio() {
  const videoRef = useRef(null);
  const previewBoxRef = useRef(null);
  const streamRef = useRef(null);
  const trackRef = useRef(null);
  const [status, setStatus] = useState("Camera बंद है");
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);
  const [zoomMin, setZoomMin] = useState(1);
  const [zoomMax, setZoomMax] = useState(8);
  const [hardwareZoom, setHardwareZoom] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [nativePhotoBase64, setNativePhotoBase64] = useState("");
  const [busy, setBusy] = useState(false);
  const [nativeInfo, setNativeInfo] = useState(null);
  const [nativePreviewActive, setNativePreviewActive] = useState(false);
  const nativePreviewRef = useRef(false);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    if (Capacitor.isNativePlatform()) CameraPreview.stop().catch(() => {});
    document.documentElement.style.backgroundColor = "";
    document.body.style.backgroundColor = "";
  }, []);

  useEffect(() => () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);

  const stopCamera = async () => {
    if (Capacitor.isNativePlatform() && nativePreviewRef.current) {
      try { await CameraPreview.stop(); } catch (e) { setError(e.message || "Native camera बंद नहीं हो सका।"); }
    }
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    trackRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    nativePreviewRef.current = false;
    setNativePreviewActive(false);
    document.documentElement.style.backgroundColor = "";
    document.body.style.backgroundColor = "";
    setStatus("Camera बंद है");
    setHardwareZoom(false);
    setZoom(1);
  };

  const startCamera = async () => {
    setError("");
    setPhotoUrl("");
    if (!Capacitor.isNativePlatform() && !navigator.mediaDevices?.getUserMedia) {
      setError("इस browser में camera access उपलब्ध नहीं है।");
      return;
    }
    try {
      setStatus("Camera शुरू हो रहा है…");
      let cameraInfo = null;
      if (Capacitor.isNativePlatform()) {
        cameraInfo = await NativeCamera2.getCameraInfo();
        setNativeInfo(cameraInfo);
        const permission = await CameraPreview.requestPermissions({ disableAudio: true });
        if (permission.camera !== "granted") throw new Error("Camera permission नहीं मिली। Android Settings में SHIVASHA को Camera permission दें।");
        document.documentElement.style.backgroundColor = "transparent";
        document.body.style.backgroundColor = "transparent";
        const previewBounds = previewBoxRef.current?.getBoundingClientRect();
        if (!previewBounds || previewBounds.width < 1 || previewBounds.height < 1) throw new Error("Camera preview area तैयार नहीं है।");
        await CameraPreview.start({
          position: "rear",
          x: Math.max(0, previewBounds.left),
          y: Math.max(0, previewBounds.top),
          width: previewBounds.width,
          height: previewBounds.height,
          toBack: true,
          disableAudio: true,
          aspectMode: "cover",
          initialZoomLevel: 1
        });
        nativePreviewRef.current = true;
        setNativePreviewActive(true);
        const zoomInfo = await CameraPreview.getZoom();
        const max = Math.max(1, Number(zoomInfo.max || cameraInfo.maxZoomRatio || cameraInfo.maxDigitalZoom || 1));
        setZoomMin(Math.max(1, Number(zoomInfo.min || 1)));
        setZoomMax(max);
        setZoom(1);
        setHardwareZoom(true);
        setNativePreviewActive(true);
        setStatus("Native CameraX Live Preview चालू है");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      trackRef.current = track;
      const capabilities = track.getCapabilities?.() || {};
      const range = capabilities.zoom;
      const nativeMax = Capacitor.isNativePlatform()
        ? Math.max(1, Number(cameraInfo?.maxZoomRatio || cameraInfo?.maxDigitalZoom || 1))
        : null;
      if (range && Number.isFinite(range.max) && range.max >= 1) {
        setZoomMin(1);
        setZoomMax(nativeMax !== null ? Math.min(range.max, nativeMax) : range.max);
        setHardwareZoom(true);
        const initial = Math.max(range.min || 1, 1);
        try { await track.applyConstraints({ advanced: [{ zoom: initial }] }); } catch { setHardwareZoom(false); }
      } else {
        setZoomMin(1);
        setZoomMax(nativeMax !== null ? nativeMax : 8);
        setHardwareZoom(false);
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setZoom(1);
      setStatus("Rear camera चालू है");
    } catch (e) {
      setStatus("Camera चालू नहीं हुआ");
      setError(e.name === "NotAllowedError"
        ? "Camera permission नहीं मिली। Android Settings में SHIVASHA को Camera permission दें।"
        : e.name === "NotFoundError"
          ? "इस device पर usable camera नहीं मिला।"
          : e.message || "Camera शुरू करने में समस्या आई।");
      stopCamera();
    }
  };

  const changeZoom = async value => {
    const next = Number(value);
    setZoom(next);
    if (Capacitor.isNativePlatform() && nativePreviewActive) {
      try { await CameraPreview.setZoom({ level: next }); }
      catch (e) { setError(e.message || "Native zoom लागू नहीं हो सका।"); }
      return;
    }
    if (hardwareZoom && trackRef.current) {
      try {
        await trackRef.current.applyConstraints({ advanced: [{ zoom: next }] });
      } catch {
        setHardwareZoom(false);
        setError("इस WebView ने hardware zoom command स्वीकार नहीं की; preview में software crop इस्तेमाल होगा।");
      }
    }
  };

  const capture = async () => {
    if (Capacitor.isNativePlatform() && nativePreviewActive) {
      setBusy(true);
      setError("");
      try {
        const result = await CameraPreview.capture({ quality: 95 });
        const encoded = String(result.value || "").replace(/^data:image\/[^;]+;base64,/, "");
        if (!encoded) throw new Error("Native preview ने photo data नहीं लौटाया।");
        const binary = atob(encoded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: "image/jpeg" });
        setNativePhotoBase64(encoded);
        if (photoUrl) URL.revokeObjectURL(photoUrl);
        setPhotoUrl(URL.createObjectURL(blob));
        setStatus("Native live preview से photo captured · " + zoom.toFixed(1) + "X");
      } catch (e) {
        setStatus("Native preview capture नहीं हो सका");
        setError(e.message || "Native camera preview से photo capture में समस्या आई।");
      } finally { setBusy(false); }
      return;
    }
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setError("पहले camera preview शुरू करें।");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const canvas = document.createElement("canvas");
      const width = video.videoWidth;
      const height = video.videoHeight;
      const crop = hardwareZoom ? 1 : Math.max(1, zoom);
      const cropWidth = Math.round(width / crop);
      const cropHeight = Math.round(height / crop);
      const sx = Math.round((width - cropWidth) / 2);
      const sy = Math.round((height - cropHeight) / 2);
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      const context = canvas.getContext("2d");
      context.drawImage(video, sx, sy, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.94));
      if (!blob) throw new Error("Photo तैयार नहीं हो सकी।");
      setNativePhotoBase64("");
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      setPhotoUrl(URL.createObjectURL(blob));
    } catch (e) {
      setError(e.message || "Photo capture में समस्या आई।");
    } finally {
      setBusy(false);
    }
  };

  const savePhoto = async () => {
    if (!photoUrl) return;
    if (Capacitor.isNativePlatform() && nativePhotoBase64 && typeof NativeCamera2.savePhoto === "function") {
      setBusy(true);
      setError("");
      try {
        const saved = await NativeCamera2.savePhoto({ base64: nativePhotoBase64 });
        setStatus("Photo Gallery में Pictures/SHIVASHA folder में save हो गई: " + saved.fileName);
      } catch (e) {
        setError(e.message || "Gallery में photo save नहीं हो सकी।");
      } finally {
        setBusy(false);
      }
      return;
    }
    const link = document.createElement("a");
    link.href = photoUrl;
    link.download = "shivasha-camera-" + new Date().toISOString().replace(/[:.]/g, "-") + ".jpg";
    link.click();
  };

  const displayedMax = Math.max(zoomMin, zoomMax);
  const cameraActive = Capacitor.isNativePlatform() ? nativePreviewActive : !!streamRef.current;
  return (
    <section style={{ maxWidth: 920, margin: "0 auto", padding: "18px 12px 32px", background: "rgba(2,6,23,.08)", minHeight: "100vh" }}>
      <div style={{ marginBottom: 16 }}>
        <span style={{ color: "#6b4eff", fontWeight: 900, letterSpacing: 1, fontSize: 12 }}>SHIVASHA IMAGING LAB</span>
        <h2 style={{ margin: "6px 0", fontSize: 26 }}>2000X Super Zoom Camera</h2>
        <p style={{ color: "var(--muted, #64748b)", margin: 0 }}>पहला चरण: Rear camera preview, zoom control और photo capture.</p>
      </div>
      <div style={{ ...panel, background: "rgba(16,24,39,.28)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
          <b>{status}</b>
          <span style={{ fontSize: 12, color: "#a5b4fc" }}>{Capacitor.isNativePlatform() ? "CameraX native preview + capture" : (hardwareZoom ? "Web camera hardware zoom" : "Software crop fallback")}</span>
        </div>
        {nativeInfo && <div style={{ background: "#172554", color: "#dbeafe", borderRadius: 10, padding: 10, marginBottom: 12, fontSize: 13 }}>
          Native Camera2: {nativeInfo.hardwareSupportLevel} · Maximum reported zoom ratio: {Number(nativeInfo.maxZoomRatio || nativeInfo.maxDigitalZoom || 1).toFixed(1)}X · Camera ID {nativeInfo.cameraId}
        </div>}
        <div ref={previewBoxRef} style={{ background: Capacitor.isNativePlatform() && nativePreviewActive ? "transparent" : "#020617", borderRadius: 14, overflow: "hidden", aspectRatio: "16 / 9", display: "grid", placeItems: "center", position: "relative" }}>
          <video ref={videoRef} playsInline muted autoPlay aria-label="Rear camera preview"
            style={{ width: "100%", height: "100%", objectFit: "contain", transform: hardwareZoom ? "none" : "scale(" + zoom + ")", display: !Capacitor.isNativePlatform() && streamRef.current ? "block" : "none" }} />
          {!cameraActive && <div style={{ textAlign: "center", color: "#94a3b8", padding: 24 }}>📷<br/>Camera preview यहाँ दिखाई देगा</div>}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", margin: "16px 0 8px", alignItems: "center" }}>
          <label htmlFor="shivasha-zoom" style={{ fontWeight: 800 }}>Zoom</label>
          <strong style={{ fontSize: 22, color: "#c4b5fd" }}>{zoom.toFixed(1)}X</strong>
        </div>
        <input id="shivasha-zoom" type="range" min={zoomMin} max={displayedMax} step="0.1" value={Math.min(zoom, displayedMax)} onChange={e => changeZoom(e.target.value)} disabled={!cameraActive}
          style={{ width: "100%", accentColor: "#8b5cf6" }} />
        <div style={{ display: "flex", justifyContent: "space-between", color: "#cbd5e1", fontSize: 12 }}>
          <span>{zoomMin.toFixed(1)}X</span><span>{displayedMax.toFixed(1)}X available in this camera session</span>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
          {!cameraActive
            ? <button style={{ ...button, background: "#8b5cf6", color: "#fff" }} onClick={startCamera}>Start Rear Camera</button>
            : <button style={{ ...button, background: "#334155", color: "#fff" }} onClick={stopCamera}>Stop Camera</button>}
          <button style={{ ...button, background: "#16a34a", color: "#fff" }} onClick={capture} disabled={!cameraActive || busy}>{busy ? "Capturing…" : (Capacitor.isNativePlatform() ? "Native Capture Photo" : "Capture Photo")}</button>
        </div>
        {error && <p role="alert" style={{ color: "#fecaca", background: "#7f1d1d", padding: 12, borderRadius: 10, marginTop: 14 }}>{error}</p>}
      </div>
      {photoUrl && <div style={{ ...panel, marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Captured photo</h3>
        <img src={photoUrl} alt="Captured by Shivasha Camera" style={{ width: "100%", borderRadius: 12, display: "block" }} />
        <button style={{ ...button, background: "#8b5cf6", color: "#fff", marginTop: 12 }} onClick={savePhoto}>Save Photo</button>
      </div>}
      <div style={{ marginTop: 16, padding: 14, border: "1px solid var(--border, #dbe2ea)", borderRadius: 14 }}>
        <b>महत्वपूर्ण जानकारी</b>
        <p style={{ marginBottom: 0, color: "var(--muted, #64748b)", lineHeight: 1.6 }}>
          Android app में native CameraX live preview, live zoom और उसी active preview session से photo capture इस्तेमाल होता है। Gallery save के लिए फोटो native MediaStore bridge से Pictures/SHIVASHA में भेजी जाती है। Browser build में WebView camera fallback चलता है। यह digital zoom है, optical zoom नहीं; 2000X quality का दावा नहीं है। OnePlus 6 पर वास्तविक camera और lifecycle testing अभी आवश्यक है।
        </p>
      </div>
    </section>
  );
}
