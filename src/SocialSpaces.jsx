import React, { useEffect, useMemo, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || "https://shivasha.onrender.com").replace(/\/$/, "");
const styles = {
 shell:{maxWidth:1100,margin:"0 auto",padding:"clamp(14px,3vw,28px)",color:"var(--text,#172033)"},
 panel:{background:"var(--panel,#fff)",border:"1px solid var(--border,#e4e8f0)",borderRadius:16,padding:18,boxShadow:"0 4px 18px rgba(20,35,65,.04)"},
 button:{border:0,borderRadius:10,padding:"10px 14px",fontWeight:750,cursor:"pointer"},
 input:{width:"100%",padding:"12px 13px",border:"1px solid #d7dce7",borderRadius:10,font:"inherit",boxSizing:"border-box",background:"#fff",color:"#172033"},
 muted:{color:"var(--muted,#667085)",fontSize:13,lineHeight:1.55}
};
async function request(path,auth,options={}) {
 const response=await fetch(API_BASE+path,{...options,headers:{...(options.body instanceof FormData?{}:{"Content-Type":"application/json"}),Authorization:"Bearer "+auth.token,...(options.headers||{})}});
 const raw=await response.text();let data={};try{data=raw?JSON.parse(raw):{}}catch{}
 if(!response.ok)throw new Error(data.message||"Request failed ("+response.status+")");
 return data;
}
export default function SocialSpaces({auth,socket}) {
 const [kind,setKind]=useState("groups"),[items,setItems]=useState([]),[selected,setSelected]=useState(null),[membership,setMembership]=useState(null),[posts,setPosts]=useState([]);
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [showCreate,setShowCreate]=useState(false),[name,setName]=useState(""),[description,setDescription]=useState(""),[privacy,setPrivacy]=useState("private");
 const [text,setText]=useState(""),[files,setFiles]=useState([]),[comments,setComments]=useState({}),[commentDrafts,setCommentDrafts]=useState({});
 const [inviteToken,setInviteToken]=useState("");
 const [members,setMembers]=useState([]),[pendingMembers,setPendingMembers]=useState([]),[issuedInvite,setIssuedInvite]=useState(null);
 const [chatMessages,setChatMessages]=useState([]),[chatDraft,setChatDraft]=useState(""),[chatLoading,setChatLoading]=useState(false),[chatSending,setChatSending]=useState(false);
 const root=kind==="groups"?"/api/social/groups":"/api/social/communities";
 const label=kind==="groups"?"Group":"Community";
 const loadItems=async()=>{
  setLoading(true);setError("");
  try{const data=await request(root,auth);setItems(Array.isArray(data)?data:[])}
  catch(e){setError(e.message);setItems([])}finally{setLoading(false)}
 };
 const loadSpace=async(item)=>{
  setSelected(item);setPosts([]);setError("");setNotice("");setMembership(null);setMembers([]);setPendingMembers([]);setIssuedInvite(null);
  try{
   const [detail,feed]=await Promise.all([request(root+"/"+item._id,auth),request(root+"/"+item._id+"/posts",auth)]);
   const nextMembership=detail.membership||null;
   setMembership(nextMembership);setSelected(detail[kind==="groups"?"group":"community"]||item);setPosts(feed.posts||[]);
   if(nextMembership?.status==="active"&&["owner","admin"].includes(nextMembership.role)){
    const [active,pending]=await Promise.all([request(root+"/"+item._id+"/members",auth),request(root+"/"+item._id+"/members?status=pending",auth)]);
    setMembers(active.members||[]);setPendingMembers(pending.members||[]);
   }
  }catch(e){setError(e.message)}
 };
 useEffect(()=>{setSelected(null);setMembership(null);setPosts([]);loadItems()},[kind]);
 const createSpace=async e=>{
  e.preventDefault();setBusy(true);setError("");setNotice("");
  try{const data=await request(root,auth,{method:"POST",body:JSON.stringify({name,description,privacy})});const item=data[kind==="groups"?"group":"community"];setName("");setDescription("");setPrivacy("private");setShowCreate(false);await loadItems();if(item)await loadSpace(item);setNotice(label+" created successfully")}
  catch(e){setError(e.message)}finally{setBusy(false)}
 };
 const join=async()=>{
  if(!selected)return;setBusy(true);setError("");setNotice("");
  try{const data=await request(root+"/"+selected._id+"/join",auth,{method:"POST",body:JSON.stringify({})});setMembership({status:data.status});setNotice(data.message||"Membership request sent");await loadSpace(selected)}
  catch(e){setError(e.message)}finally{setBusy(false)}
 };
 const redeem=async e=>{
  e.preventDefault();setBusy(true);setError("");setNotice("");
  try{await request(root+"/invitations/redeem",auth,{method:"POST",body:JSON.stringify({token:inviteToken.trim()})});setInviteToken("");await loadItems();setNotice("Invitation accepted. Open the "+label+" from the list.")}
  catch(e){setError(e.message)}finally{setBusy(false)}
 };
 const publish=async e=>{
  e.preventDefault();if(!selected)return;setBusy(true);setError("");setNotice("");
  try{
   const assetIds=[];
   for(const file of files){
    const form=new FormData();form.append("media",file);
    const asset=await request(root+"/"+selected._id+"/posts/media",auth,{method:"POST",body:form});
    assetIds.push(asset.assetId);
   }
   const data=await request(root+"/"+selected._id+"/posts",auth,{method:"POST",body:JSON.stringify({text,mediaAssetIds:assetIds})});
   setPosts(prev=>[data.post,...prev]);setText("");setFiles([]);setNotice("Post published");
   const picker=document.getElementById("social-space-files");if(picker)picker.value="";
  }catch(e){setError(e.message)}finally{setBusy(false)}
 };
 const toggleLike=async post=>{
  try{const result=await request(root+"/"+selected._id+"/posts/"+post._id+"/like",auth,{method:"POST",body:JSON.stringify({})});setPosts(prev=>prev.map(p=>p._id===post._id?{...p,likes:result.liked?[...(p.likes||[]),auth.user?._id].filter(Boolean):(p.likes||[]).filter(id=>String(id)!==String(auth.user?._id))}:p))}
  catch(e){setError(e.message)}
 };
 const addComment=async(post)=>{
  const value=(commentDrafts[post._id]||"").trim();if(!value)return;
  try{const data=await request(root+"/"+selected._id+"/posts/"+post._id+"/comments",auth,{method:"POST",body:JSON.stringify({text:value})});setPosts(prev=>prev.map(p=>p._id===post._id?{...p,comments:[...(p.comments||[]),data.comment]}:p));setCommentDrafts(prev=>({...prev,[post._id]:""}))}
  catch(e){setError(e.message)}
 };
 const canPost=membership?.status==="active";
 const canManage=canPost&&["owner","admin"].includes(membership?.role);
 const reviewMember=async(userId,action)=>{setBusy(true);setError("");try{await request(root+"/"+selected._id+"/members/"+userId+"/review",auth,{method:"POST",body:JSON.stringify({action})});await loadSpace(selected);setNotice("Member status updated")}catch(e){setError(e.message)}finally{setBusy(false)}};
 const createInvite=async()=>{setBusy(true);setError("");try{const data=await request(root+"/"+selected._id+"/invitations",auth,{method:"POST",body:JSON.stringify({})});setIssuedInvite(data.invitation);setNotice("Invitation token created. Copy it now; it is shown only once.")}catch(e){setError(e.message)}finally{setBusy(false)}};
 const revokeInvite=async()=>{if(!issuedInvite)return;setBusy(true);setError("");try{await request(root+"/"+selected._id+"/invitations/"+issuedInvite.id+"/revoke",auth,{method:"POST",body:JSON.stringify({})});setIssuedInvite(null);setNotice("Invitation revoked")}catch(e){setError(e.message)}finally{setBusy(false)}};
 useEffect(()=>{
  if(!selected?._id||membership?.status!=="active"){setChatMessages([]);return}
  let cancelled=false;
  const path=root+"/"+selected._id+"/chat/messages";
  setChatLoading(true);
  request(path,auth).then(data=>{
   if(cancelled)return;
   setChatMessages(data.messages||[]);
   return request(root+"/"+selected._id+"/chat/read",auth,{method:"POST",body:JSON.stringify({})});
  }).catch(e=>{if(!cancelled)setError(e.message)}).finally(()=>{if(!cancelled)setChatLoading(false)});
  const onMessage=message=>{
   if(String(message.resourceId)!==String(selected._id)||message.resourceType!==(kind==="groups"?"group":"community"))return;
   setChatMessages(prev=>prev.some(item=>item._id===message._id)?prev:[...prev,message]);
  };
  const onDeleted=event=>{
   if(String(event.resourceId)!==String(selected._id)||event.resourceType!==(kind==="groups"?"group":"community"))return;
   setChatMessages(prev=>prev.map(item=>item._id===event.messageId?{...item,text:"This message was removed",deletedAt:event.deletedAt}:item));
  };
  socket?.on("social-space:message:new",onMessage);
  socket?.on("social-space:message:deleted",onDeleted);
  return ()=>{cancelled=true;socket?.off("social-space:message:new",onMessage);socket?.off("social-space:message:deleted",onDeleted)};
 },[selected?._id,membership?.status,kind,auth?.token,socket]);
 const sendChatMessage=async e=>{
  e.preventDefault();const value=chatDraft.trim();if(!value||!selected)return;
  setChatSending(true);setError("");
  try{
   const message=await request(root+"/"+selected._id+"/chat/messages",auth,{method:"POST",body:JSON.stringify({text:value})});
   setChatMessages(prev=>prev.some(item=>item._id===message._id)?prev:[...prev,message]);setChatDraft("");
  }catch(e){setError(e.message)}finally{setChatSending(false)}
 };
 const privacyLabel={public:"Public",private:"Private", "invite-only":"Invite only"};
 return <section style={styles.shell}>
  <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:18}}>
   <div><div style={{fontSize:11,fontWeight:850,letterSpacing:".12em",color:"#667085"}}>SHIVASHA SOCIAL</div><h2 style={{margin:"5px 0",fontSize:"clamp(23px,4vw,32px)"}}>Groups & Communities</h2><p style={styles.muted}>Apne interest ke groups aur communities banayein, join karein aur updates share karein.</p></div>
   <button type="button" style={{...styles.button,background:"#172554",color:"#fff"}} onClick={()=>setShowCreate(v=>!v)}>＋ Create {label}</button>
  </header>
  <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
   {["groups","communities"].map(value=><button key={value} type="button" onClick={()=>{setKind(value);setShowCreate(false)}} style={{...styles.button,background:kind===value?"#172554":"#eef1f7",color:kind===value?"#fff":"#344054"}}>{value==="groups"?"👥 Groups":"🌐 Communities"}</button>)}
  </div>
  {error&&<div role="alert" style={{...styles.panel,borderColor:"#f2b8b5",color:"#a12b24",marginBottom:12}}>{error}</div>}
  {notice&&<div role="status" style={{...styles.panel,borderColor:"#b8dfc9",color:"#176b42",marginBottom:12}}>{notice}</div>}
  {showCreate&&<form onSubmit={createSpace} style={{...styles.panel,display:"grid",gap:12,marginBottom:16}}>
   <h3 style={{margin:0}}>Create {label}</h3><input required minLength={2} maxLength={kind==="groups"?100:120} value={name} onChange={e=>setName(e.target.value)} placeholder={label+" name"} style={styles.input}/>
   <textarea maxLength={kind==="groups"?1000:1500} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description (optional)" rows={3} style={styles.input}/>
   <label style={{fontSize:13,fontWeight:700}}>Privacy<select value={privacy} onChange={e=>setPrivacy(e.target.value)} style={{...styles.input,marginTop:6}}><option value="private">Private — approval required</option><option value="public">Public — anyone can view</option><option value="invite-only">Invite only — invitation token required</option></select></label>
   <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button disabled={busy} style={{...styles.button,background:"#172554",color:"#fff"}}>{busy?"Creating…":"Create "+label}</button><button type="button" onClick={()=>setShowCreate(false)} style={{...styles.button,background:"#eef1f7"}}>Cancel</button></div>
  </form>}
  <form onSubmit={redeem} style={{...styles.panel,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:16}}>
   <div style={{flex:"1 1 220px"}}><b>Have an invitation token?</b><div style={styles.muted}>Paste the secure token shared by a Group/Community owner or admin.</div></div>
   <input aria-label="Invitation token" value={inviteToken} onChange={e=>setInviteToken(e.target.value)} placeholder="Invitation token" style={{...styles.input,flex:"2 1 240px"}}/>
   <button disabled={busy||!inviteToken.trim()} style={{...styles.button,background:"#e8edf8",color:"#172554"}}>Redeem</button>
  </form>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,290px),1fr))",gap:14,alignItems:"start"}}>
   <div style={{display:"grid",gap:10}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><b>{label} directory</b><button type="button" onClick={loadItems} style={{...styles.button,background:"#eef1f7"}}>↻ Refresh</button></div>
    {loading?<div style={styles.panel}>Loading {label.toLowerCase()}…</div>:items.length?items.map(item=><button key={item._id} type="button" onClick={()=>loadSpace(item)} style={{...styles.panel,textAlign:"left",cursor:"pointer",borderColor:selected?._id===item._id?"#6176bc":"#e4e8f0",background:selected?._id===item._id?"#f3f5fc":"#fff"}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:8}}><b>{item.name}</b><span style={{fontSize:11,color:"#667085"}}>{privacyLabel[item.privacy]||item.privacy}</span></div><p style={{...styles.muted,margin:"7px 0 0"}}>{item.description||"No description yet."}</p>
     </button>):<div style={styles.panel}><b>No {label.toLowerCase()} to show</b><p style={styles.muted}>Create one or ask an owner for an invitation to a private space.</p></div>}
   </div>
   <div style={{display:"grid",gap:12}}>
    {!selected?<div style={{...styles.panel,minHeight:190,display:"grid",placeContent:"center",textAlign:"center"}}><div style={{fontSize:34}}>✦</div><b>Select a {label.toLowerCase()}</b><p style={styles.muted}>Posts and discussions will appear here.</p></div>:<>
     <div style={styles.panel}>
      <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"start"}}><div><h3 style={{margin:"0 0 6px"}}>{selected.name}</h3><p style={styles.muted}>{selected.description||"No description."}</p></div><span style={{fontSize:11,fontWeight:750,whiteSpace:"nowrap"}}>{privacyLabel[selected.privacy]}</span></div>
      {membership?.status==="active"?<div style={{fontSize:13,color:"#176b42",fontWeight:750}}>✓ Active member · {membership.role||"member"}</div>:membership?.status==="pending"?<div style={{fontSize:13,color:"#8a5a12",fontWeight:750}}>⌛ Membership request pending</div>:<button disabled={busy||selected.privacy==="invite-only"} onClick={join} style={{...styles.button,background:"#172554",color:"#fff"}}>{selected.privacy==="invite-only"?"Invitation required":"Request to join"}</button>}
     </div>
     {canManage&&<section style={{...styles.panel,display:"grid",gap:12}}>
      <div><h4 style={{margin:"0 0 4px"}}>Member management</h4><p style={styles.muted}>Review requests and manage active members. Server-side role checks remain authoritative.</p></div>
      <div><b style={{fontSize:13}}>Pending requests ({pendingMembers.length})</b>
       {pendingMembers.length?pendingMembers.map(row=><div key={row.user.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"8px 0",borderBottom:"1px solid #edf0f5"}}><span style={{fontSize:13}}>{row.user.name}</span><span style={{display:"flex",gap:6}}><button type="button" disabled={busy} onClick={()=>reviewMember(row.user.id,"approve")} style={{...styles.button,background:"#e6f5eb",color:"#176b42"}}>Approve</button><button type="button" disabled={busy} onClick={()=>reviewMember(row.user.id,"reject")} style={{...styles.button,background:"#fcebea",color:"#a12b24"}}>Reject</button></span></div>):<p style={styles.muted}>No pending requests.</p>}
      </div>
      <div><b style={{fontSize:13}}>Active members ({members.length})</b>
       {members.map(row=><div key={row.user.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"8px 0",borderBottom:"1px solid #edf0f5"}}><span style={{fontSize:13}}>{row.user.name} · <span style={styles.muted}>{row.role}</span></span>{row.role!=="owner"&&(membership.role==="owner"||row.role!=="admin")&&<span style={{display:"flex",gap:6}}><button type="button" disabled={busy} onClick={()=>reviewMember(row.user.id,"remove")} style={{...styles.button,background:"#eef1f7"}}>Remove</button><button type="button" disabled={busy} onClick={()=>reviewMember(row.user.id,"ban")} style={{...styles.button,background:"#fcebea",color:"#a12b24"}}>Ban</button></span>}</div>)}
      </div>
      <div style={{borderTop:"1px solid #edf0f5",paddingTop:12}}>
       <b style={{fontSize:13}}>Secure invitation</b><p style={styles.muted}>Create a one-time token valid for 24 hours. The raw token is displayed only once.</p>
       <button type="button" disabled={busy} onClick={createInvite} style={{...styles.button,background:"#172554",color:"#fff"}}>＋ Create invitation token</button>
       {issuedInvite&&<div style={{marginTop:10,padding:10,borderRadius:10,background:"#f6f7fa"}}>
        <div style={{fontSize:12,fontWeight:750}}>Copy and share this token securely</div><code style={{display:"block",overflowWrap:"anywhere",padding:"8px 0"}}>{issuedInvite.token}</code>
        <div style={styles.muted}>Expires: {new Date(issuedInvite.expiresAt).toLocaleString()}</div>
        <div style={{display:"flex",gap:8,marginTop:8}}><button type="button" onClick={()=>{if(navigator.clipboard?.writeText)navigator.clipboard.writeText(issuedInvite.token).then(()=>setNotice("Invitation token copied")).catch(()=>setError("Copy failed; select and copy the token manually"));else setError("Clipboard unavailable; select and copy the token manually")}} style={{...styles.button,background:"#e8edf8"}}>Copy token</button><button type="button" disabled={busy} onClick={revokeInvite} style={{...styles.button,background:"#fcebea",color:"#a12b24"}}>Revoke</button></div>
       </div>}
      </div>
     </section>}
     {canPost&&<form onSubmit={publish} style={{...styles.panel,display:"grid",gap:10}}>
      <b>Share an update</b><textarea value={text} onChange={e=>setText(e.target.value)} maxLength={3000} rows={3} placeholder={"Write something for this "+label.toLowerCase()+"…"} style={styles.input}/>
      <label style={{fontSize:13,fontWeight:700}}>Add photos or videos <input id="social-space-files" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/webm,video/ogg,video/mp4,video/quicktime" multiple onChange={e=>setFiles(Array.from(e.target.files||[]).slice(0,4))} style={{display:"block",marginTop:8,fontWeight:400}}/></label>
      <div style={styles.muted}>{files.length} file(s) selected · Up to 4 attachments. Images max 15 MB each; videos max 150 MB each.</div>
      <button disabled={busy||(!text.trim()&&!files.length)} style={{...styles.button,background:"#172554",color:"#fff"}}>{busy?"Publishing…":"Publish post"}</button>
     </form>}
     {canPost&&<section style={{...styles.panel,display:"grid",gap:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><div><h3 style={{margin:"0 0 4px"}}>{label} Chat</h3><p style={styles.muted}>Only active members can read and send messages.</p></div><button type="button" onClick={()=>request(root+"/"+selected._id+"/chat/messages",auth).then(data=>setChatMessages(data.messages||[])).catch(e=>setError(e.message))} style={{...styles.button,background:"#eef1f7"}}>↻ Refresh</button></div>
      <div aria-live="polite" style={{display:"grid",gap:8,maxHeight:360,overflowY:"auto",padding:4}}>
       {chatLoading?<p style={styles.muted}>Loading chat…</p>:chatMessages.length?chatMessages.map(message=><div key={message._id} style={{padding:"10px 12px",borderRadius:12,background:String(message.senderId?._id||message.senderId)===String(auth.user?.id||auth.user?._id)?"#edf2ff":"#f5f6f8",justifySelf:String(message.senderId?._id||message.senderId)===String(auth.user?.id||auth.user?._id)?"end":"start",maxWidth:"90%"}}>
        <b style={{fontSize:12}}>{message.senderId?.name||"Member"}</b><div style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",marginTop:4}}>{message.text}</div><div style={{...styles.muted,fontSize:11,marginTop:4}}>{message.createdAt?new Date(message.createdAt).toLocaleString():""}</div>
       </div>):<p style={styles.muted}>No messages yet. Start the conversation.</p>}
      </div>
      <form onSubmit={sendChatMessage} style={{display:"flex",gap:8,alignItems:"end"}}>
       <textarea value={chatDraft} onChange={e=>setChatDraft(e.target.value)} maxLength={2000} rows={2} placeholder="Write a message to active members…" style={{...styles.input,resize:"vertical"}}/>
       <button disabled={chatSending||!chatDraft.trim()} style={{...styles.button,background:"#172554",color:"#fff"}}>{chatSending?"Sending…":"Send"}</button>
      </form>
     </section>}
     <div style={{fontWeight:850}}>Posts & discussions</div>
     {posts.length?posts.map(post=><article key={post._id} style={{...styles.panel,display:"grid",gap:10}}>
      <div style={{display:"flex",alignItems:"center",gap:9}}><div style={{width:34,height:34,borderRadius:50,background:"#e8edf8",display:"grid",placeItems:"center",fontWeight:800}}>{(post.authorId?.name||"S").slice(0,1).toUpperCase()}</div><div><b style={{fontSize:13}}>{post.authorId?.name||"Member"}</b><div style={styles.muted}>{post.createdAt?new Date(post.createdAt).toLocaleString():""}</div></div></div>
      {post.text&&<p style={{whiteSpace:"pre-wrap",margin:0,lineHeight:1.6}}>{post.text}</p>}
      {post.attachments?.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:8}}>{post.attachments.map((asset,i)=>asset.mediaType==="video"?<video key={i} src={asset.url} controls playsInline style={{width:"100%",borderRadius:10,maxHeight:260,background:"#111"}}/>:<img key={i} src={asset.url} alt="Post attachment" loading="lazy" style={{width:"100%",maxHeight:260,objectFit:"cover",borderRadius:10}}/>)}</div>}
      <div style={{display:"flex",gap:14,alignItems:"center",fontSize:13}}><button type="button" onClick={()=>toggleLike(post)} style={{border:0,background:"transparent",fontWeight:750,cursor:"pointer"}}>♡ Like · {post.likes?.length||0}</button><span>💬 {post.comments?.length||0} comments</span></div>
      {(post.comments||[]).map((comment,i)=><div key={comment._id||i} style={{padding:"8px 10px",borderRadius:9,background:"#f6f7fa"}}><b style={{fontSize:12}}>{comment.userId?.name||"Member"}</b><div style={{fontSize:13,marginTop:3}}>{comment.text}</div></div>)}
      {canPost&&<div style={{display:"flex",gap:7}}><input value={commentDrafts[post._id]||""} onChange={e=>setCommentDrafts(prev=>({...prev,[post._id]:e.target.value}))} maxLength={1000} placeholder="Write a comment…" style={styles.input}/><button type="button" onClick={()=>addComment(post)} disabled={!(commentDrafts[post._id]||"").trim()} style={{...styles.button,background:"#e8edf8"}}>Send</button></div>}
     </article>):<div style={styles.panel}><p style={styles.muted}>No posts yet. Be the first to share an update.</p></div>}
    </>}
   </div>
  </div>
 </section>;
}
