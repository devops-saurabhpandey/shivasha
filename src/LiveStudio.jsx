import React, { useEffect, useRef, useState } from "react";\n\nconst API_BASE = (import.meta.env.VITE_API_URL || "https://shivasha.onrender.com").replace(/\\/$/, "");

export default function LiveStudio({ socket, me, auth }) {
  const [rooms, setRooms] = useState([]);
  const [title, setTitle] = useState("");
  const [stream, setStream] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [watching, setWatching] = useState(null);
  const [chat, setChat] = useState([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [saveState, setSaveState] = useState("");
  const [savedVideos, setSavedVideos] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recordStartedRef = useRef(0);
  const titleRef = useRef("");
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const peers = useRef(new Map());
  const streamRef = useRef(null);
  const roomRef = useRef(null);

  useEffect(() => {
    if (!socket) return;
    const onList = data => setRooms(data.rooms || []);
    const onStarted = room => setRooms(prev => [room, ...prev.filter(x => x.id !== room.id)]);
    const onStopped = ({ roomId }) => {
      setRooms(prev => prev.filter(x => x.id !== roomId));
      if (roomRef.current === roomId) stopLocal(false);
    };
    const onViewerJoin = async ({ roomId, viewerSocketId }) => {
      if (!isLive || roomId !== roomRef.current || !streamRef.current) return;
      try {
        const pc = makePeer(viewerSocketId);
        streamRef.current.getTracks().forEach(track => pc.addTrack(track, streamRef.current));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("live:signal", { roomId, to: viewerSocketId, signal: { type: "offer", sdp: offer } });
      } catch (e) { setError("Could not connect a viewer: " + e.message); }
    };
    const onSignal = async ({ roomId, from, signal }) => {
      if (roomId !== roomRef.current || !signal) return;
      try {
        let pc = peers.current.get(from);
        if (!pc && signal.type === "offer") pc = makePeer(from);
        if (!pc) return;
        if (signal.type === "offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("live:signal", { roomId, to: from, signal: { type: "answer", sdp: answer } });
        } else if (signal.type === "answer") {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        } else if (signal.type === "ice" && signal.candidate) {
          try { await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)); } catch {}
        }
      } catch (e) { setError("Live connection issue: " + e.message); }
    };
    const onChat = item => { if (item.roomId === roomRef.current) setChat(prev => [...prev.slice(-99), item]); };
    const onViewerCount = ({ roomId, viewers }) => setRooms(prev => prev.map(x => x.id === roomId ? { ...x, viewers } : x));
    const onReaction = ({ roomId, emoji }) => { if (roomRef.current === roomId) setChat(prev => [...prev.slice(-99), { id: Date.now()+Math.random(), system: true, text: emoji + " reaction" }]); };
    socket.on("live:list", onList);
    socket.on("live:started", onStarted);
    socket.on("live:stopped", onStopped);
    socket.on("live:viewer-join", onViewerJoin);
    socket.on("live:signal", onSignal);
    socket.on("live:chat", onChat);
    socket.on("live:viewers", onViewerCount);
    socket.on("live:reaction", onReaction);
    socket.emit("live:list");
    return () => {
      socket.off("live:list", onList); socket.off("live:started", onStarted);
      socket.off("live:stopped", onStopped); socket.off("live:viewer-join", onViewerJoin);
      socket.off("live:signal", onSignal); socket.off("live:chat", onChat);
      socket.off("live:viewers", onViewerCount); socket.off("live:reaction", onReaction);
      peers.current.forEach(pc => pc.close()); peers.current.clear();
    };
  }, [socket, isLive]);

  function makePeer(id) {
    const old = peers.current.get(id); if (old) return old;
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pc.onicecandidate = e => { if (e.candidate && socket) socket.emit("live:signal", { roomId: roomRef.current, to: id, signal: { type: "ice", candidate: e.candidate } }); };
    pc.ontrack = e => { if (remoteVideo.current) { remoteVideo.current.srcObject = e.streams[0]; remoteVideo.current.play?.().catch(() => {}); } };
    pc.onconnectionstatechange = () => { if (["failed", "closed"].includes(pc.connectionState)) { pc.close(); peers.current.delete(id); } };
    peers.current.set(id, pc); return pc;
  }

  async function startLive() {
    setError("");
    if (!socket?.connected) { setError("Real-time server is offline. Please try again shortly."); return; }
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
      streamRef.current = media; setStream(media);
      chunksRef.current = [];
      titleRef.current = title.trim() || (me?.name || "SHIVASHA member") + "'s Live";
      setSaveState("");
      if (typeof MediaRecorder !== "undefined") {
        const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find(type => MediaRecorder.isTypeSupported?.(type));
        const recorder = new MediaRecorder(media, mimeType ? { mimeType } : undefined);
        recorder.ondataavailable = event => { if (event.data?.size) chunksRef.current.push(event.data); };
        recorder.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
          chunksRef.current = [];
          if (!blob.size) { setSaveState("No video data was captured, so nothing was saved."); return; }
          if (blob.size > 150 * 1024 * 1024) { setSaveState("Recording exceeds 150 MB. It was not uploaded; try a shorter live video."); return; }
          if (!auth?.token) { setSaveState("Please log in again to save this live video."); return; }
          setSaveState("Saving live video… keep this page open.");
          try {
            const form = new FormData();
            const ext = (blob.type || "").includes("mp4") ? "mp4" : "webm";
            form.append("video", blob, "shivasha-live-" + Date.now() + "." + ext);
            form.append("title", titleRef.current || "SHIVASHA Live");
            form.append("durationSeconds", String(Math.max(1, Math.round((Date.now() - recordStartedRef.current) / 1000))));
            const response = await fetch(API_BASE + "/api/live-videos/upload", { method: "POST", headers: { Authorization: "Bearer " + auth.token }, body: form });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Video save failed");
            setSavedVideos(prev => [data.video, ...prev]);
            setSaveState("Live video saved successfully in My Live Videos.");
          } catch (error) { setSaveState("Could not save recording: " + error.message); }
        };
        recorder.start(1000);
        recorderRef.current = recorder;
        recordStartedRef.current = Date.now();
      } else { setSaveState("This browser does not support live recording."); }
      if (localVideo.current) localVideo.current.srcObject = media;
      const room = { id: "live-" + (crypto.randomUUID?.() || Date.now().toString(36)), title: title.trim() || (me?.name || "SHIVASHA member") + "'s Live", hostId: me?._id || me?.id, hostName: me?.name || "SHIVASHA member", viewers: 0, startedAt: new Date().toISOString() };
      roomRef.current = room.id; setChat([]); setIsLive(true);
      socket.emit("live:start", room);
    } catch (e) {
      setError(e.name === "NotAllowedError" ? "Camera/microphone permission was denied. Allow access in browser settings." : "Could not start camera: " + e.message);
    }
  }
  function stopLocal(notify = true) {
    if (notify && socket && roomRef.current) socket.emit("live:stop", { roomId: roomRef.current });
    peers.current.forEach(pc => pc.close()); peers.current.clear();
    streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null;
    if (localVideo.current) localVideo.current.srcObject = null;
    if (remoteVideo.current) remoteVideo.current.srcObject = null;
    roomRef.current = null; setStream(null); setIsLive(false); setWatching(null);
  }
  function joinLive(room) {
    if (!socket?.connected) { setError("Real-time server is offline."); return; }
    if (isLive) stopLocal();
    roomRef.current = room.id; setWatching(room); setChat([]);
    socket.emit("live:join", { roomId: room.id });
  }
  function leaveLive() {
    if (watching && socket) socket.emit("live:leave", { roomId: watching.id });
    peers.current.forEach(pc => pc.close()); peers.current.clear();
    if (remoteVideo.current) remoteVideo.current.srcObject = null;
    roomRef.current = null; setWatching(null);
  }
  function sendChat(e) {
    e.preventDefault(); if (!draft.trim() || !roomRef.current || !socket) return;
    socket.emit("live:chat", { roomId: roomRef.current, text: draft.trim().slice(0, 300) }); setDraft("");
  }
  function react(emoji) { if (roomRef.current && socket) socket.emit("live:reaction", { roomId: roomRef.current, emoji }); }

  async function deleteSavedVideo(video) {
    if (!window.confirm("Permanently delete this saved live video?")) return;
    try {
      const response = await fetch(API_BASE + "/api/live-videos/" + video._id, { method: "DELETE", headers: { Authorization: "Bearer " + auth.token } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Delete failed");
      setSavedVideos(prev => prev.filter(item => item._id !== video._id));
      setSaveState("Saved live video deleted.");
    } catch (error) { setSaveState("Could not delete video: " + error.message); }
  }

  return <section className="content live-studio">
    <div className="live-hero"><div><span className="live-kicker">SHIVASHA LIVE</span><h2>Go Live. Connect in Real Time.</h2><p>Broadcast with your camera, interact with viewers, and share live moments with your community.</p></div><div className="live-hero-icon">◉</div></div>
    {error && <div className="login-message" role="alert">{error}</div>}\n    {saveState && <div className="login-message" role="status">{saveState}</div>}
    <div className="live-layout">
      <div className="live-main">
        <div className="live-video-card">
          {(isLive || watching) ? <><div className="live-video-wrap"><video ref={isLive ? localVideo : remoteVideo} autoPlay playsInline muted={isLive || muted} /><span className="live-badge">● {isLive ? "YOU ARE LIVE" : "LIVE"}</span><span className="live-viewers">👁 {rooms.find(x=>x.id===(watching?.id||roomRef.current))?.viewers ?? 0} watching</span></div><div className="live-controls">{isLive ? <><button className="secondary" onClick={()=>{const next=!muted;setMuted(next);streamRef.current?.getAudioTracks().forEach(t=>t.enabled=!next)}}>{muted?"🔇 Unmute":"🎙 Mute"}</button><button className="secondary" onClick={()=>{const next=!cameraOff;setCameraOff(next);streamRef.current?.getVideoTracks().forEach(t=>t.enabled=!next)}}>{cameraOff?"📷 Camera on":"📷 Camera off"}</button><button className="live-stop" onClick={()=>stopLocal()}>End Live &amp; Save</button></> : <><button className="secondary" onClick={()=>react("❤️")}>❤️</button><button className="secondary" onClick={()=>react("👏")}>👏</button><button className="secondary" onClick={()=>react("🔥")}>🔥</button><button className="live-stop" onClick={leaveLive}>Leave Live</button></>}</div></> : <div className="live-placeholder"><span>◉</span><h3>Your live broadcast starts here</h3><p>Start a live video using your phone or computer camera.</p></div>}
        </div>
        {!isLive && !watching && <div className="panel live-start-panel"><h3>Start a live video</h3><label>Live title<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={90} placeholder="What are you going live about?"/></label><button className="live-start" onClick={startLive}>🔴 Go Live</button><small>Camera and microphone permission are required. Keep the tab open while broadcasting.</small></div>}
        {(isLive || watching) && <div className="panel live-chat-panel"><div className="panel-head"><h3>Live comments</h3><span>{chat.length} messages/reactions</span></div><div className="live-chat-list">{chat.map((m,i)=><div className={m.system?"live-chat-system":"live-chat-message"} key={m.id||m._id||i}>{!m.system&&<b>{m.name||"Member"}: </b>}{m.text}</div>)}</div><form className="live-chat-form" onSubmit={sendChat}><input value={draft} onChange={e=>setDraft(e.target.value)} maxLength={300} placeholder="Write a comment…" /><button className="primary">Send</button></form></div>}
      </div>
      <div className="panel live-library"><div className="panel-head"><h3>My Live Videos</h3><button className="secondary" onClick={async()=>{setLibraryLoading(true);try{const r=await fetch(API_BASE+"/api/live-videos",{headers:{Authorization:"Bearer "+auth?.token}});const d=await r.json();if(!r.ok)throw new Error(d.message||"Could not refresh videos");setSavedVideos(d.videos||[])}catch(e){setSaveState(e.message)}finally{setLibraryLoading(false)}}}>Refresh</button></div><p className="live-library-note">Your finished broadcasts appear here after upload completes.</p>{libraryLoading?<p className="empty">Loading saved videos…</p>:savedVideos.length?savedVideos.map(video=><article className="live-saved-video" key={video._id}><video controls preload="metadata" src={video.videoUrl} /><div className="live-saved-meta"><b>{video.title}</b><small>{new Date(video.createdAt).toLocaleString()} · {Math.round((video.bytes||0)/1024/1024*10)/10} MB</small><div><a href={video.videoUrl} target="_blank" rel="noreferrer">Open video</a><button className="live-delete" onClick={()=>deleteSavedVideo(video)}>Delete</button></div></div></article>):<div className="empty">No saved live videos yet. End a broadcast to save it here.</div>}</div>
      <aside className="live-sidebar"><div className="panel"><div className="panel-head"><h3>Live now</h3><button className="secondary" onClick={()=>socket?.emit("live:list")}>Refresh</button></div>{rooms.filter(x=>x.id!==roomRef.current).length ? rooms.filter(x=>x.id!==roomRef.current).map(room=><article className="live-room" key={room.id}><div className="live-room-dot">●</div><div><b>{room.title}</b><small>{room.hostName} · {room.viewers||0} watching</small></div><button className="primary" onClick={()=>joinLive(room)}>Watch</button></article>) : <div className="empty">No other live broadcasts right now. Start one and invite your community.</div>}</div><div className="live-safety-note"><b>Live safety</b><p>Broadcast only content you have the right to share. End the stream before leaving this page.</p></div></aside>
    </div>
  </section>;
}
