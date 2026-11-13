import React, { Suspense, lazy, useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { Gamepad2, LogOut, Users, Trophy, ArrowRight, Sparkles, Info, Copy, Check, Crown, Play, RefreshCw, Dice5, Layers, Moon, Sun } from "lucide-react";
const Avatar3D = lazy(() => import("./components/Avatar3D"));
const AvatarStudio = lazy(() => import("./components/AvatarStudio"));
import AvatarPortrait from "./components/AvatarPortrait";
const GameBoard = lazy(() => import("./components/GameBoard"));
import GameCardVisual from "./components/GameCardVisual";
import { waitForSocketConnection } from "./socketConnection.js";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const SOCKET_BASE = API_BASE || undefined;
const apiUrl = (url) => `${API_BASE}${url}`;

const GAMES = [
  {id:"uno",title:"UNO",sub:"One card can change everything.",players:"2–8 players",symbol:"UNO",className:"uno",modes:[["uno","UNO Normal"],["uno-flip","UNO Flip"],["uno-no-mercy","UNO No Mercy"]]},
  {id:"ludo",title:"Ludo",sub:"Race home. Block your friends.",players:"2–4 players",symbol:"🎲",className:"ludo",modes:[["ludo","Classic Ludo"]]},
  {id:"raja-mantri",title:"Chor Ko Dhundo",sub:"Four roles. One sharp guess.",players:"Exactly 4 players",symbol:"♛",className:"raja",modes:[["raja-mantri","Classic round"]]},
  {id:"sola-parchi",title:"Sola Parchi",sub:"Collect your set before anyone else.",players:"4–8 players",symbol:"✦",className:"sola",modes:[["sola-parchi","Passing version"]]}
];

async function api(url, options={}) {
  let response;
  let savedToken = "";
  try { savedToken = localStorage.getItem("gv_session_token") || ""; } catch { /* storage can be unavailable */ }
  try {
    response = await fetch(apiUrl(url),{credentials:"include",headers:{"Content-Type":"application/json",...(savedToken ? { Authorization: `Bearer ${savedToken}` } : {}),...(options.headers||{})},...options});
  } catch (error) {
    throw new Error("Gameverse server tak request nahi pahunchi. PC par npm run dev chalu hai aur dono devices same Wi-Fi par hain, ye check karo.");
  }
  const contentType = response.headers.get("content-type") || "";
  let data = {};
  if (contentType.includes("application/json")) data = await response.json().catch(()=>({}));
  if(!response.ok) {
    if(response.status === 401) throw new Error("Is phone/browser par Gameverse login nahi mila. Phone par apne account se sign in karo; PC ka login phone par share nahi hota.");
    throw new Error(data.error || `Gameverse request failed (HTTP ${response.status}).`);
  }
  if (!contentType.includes("application/json")) throw new Error(`Gameverse API ne JSON ki jagah unexpected response diya (HTTP ${response.status}). Server/proxy check karo.`);
  if (data.token) { try { localStorage.setItem("gv_session_token", data.token); } catch { /* cookie remains as fallback */ } }
  return data;
}

function App() {
  const [user,setUser]=useState(null);
  const [checking,setChecking]=useState(true);
  const [socket,setSocket]=useState(null);
  const [socketStatus,setSocketStatus]=useState("connecting");
  const [socketError,setSocketError]=useState("");
  const [uiTheme,setUiTheme]=useState(()=>{
    try { return localStorage.getItem("gameverse-ui-theme") === "dark" ? "dark" : "light"; }
    catch { return "light"; }
  });
  const navigate=useNavigate();

  useEffect(()=>{
    document.documentElement.dataset.gvTheme = uiTheme;
    try { localStorage.setItem("gameverse-ui-theme", uiTheme); } catch { /* storage may be unavailable in private mode */ }
  },[uiTheme]);
  useEffect(()=>{api("/api/me").then(d=>setUser(d.user)).catch(()=>setUser(null)).finally(()=>setChecking(false));},[]);
  useEffect(()=>{
    if(!user) { socket?.disconnect(); setSocket(null); setSocketStatus("offline"); setSocketError(""); return; }
    setSocketStatus("connecting");
    setSocketError("");
    // Start with HTTP long-polling and upgrade to WebSocket. This is more tolerant
    // of mobile browsers and Vite's LAN development proxy than forcing WebSocket first.
    const s=io(SOCKET_BASE,{
      withCredentials:true,
      reconnection:true,
      timeout:10000,
      path:"/socket.io",
      transports:["polling","websocket"],
      // Fetch a fresh short-lived ticket on every connect/reconnect. This keeps
      // mobile Socket.IO auth reliable even when proxy cookie forwarding differs.
      auth:(callback)=>{
        api("/api/socket-ticket").then(({ticket})=>callback({ticket})).catch((error)=>{
          setSocketError(`Socket authentication: ${error.message}`);
          callback({});
        });
      }
    });
    const onConnect=()=>{setSocketStatus("connected");setSocketError("");};
    const onDisconnect=(reason)=>{setSocketStatus("disconnected");if(reason)setSocketError(reason);};
    const onConnectError=(error)=>{setSocketStatus("error");setSocketError(error?.message||"Connection failed");};
    s.on("connect",onConnect);
    s.on("disconnect",onDisconnect);
    s.on("connect_error",onConnectError);
    setSocket(s);
    return ()=>{s.off("connect",onConnect);s.off("disconnect",onDisconnect);s.off("connect_error",onConnectError);s.disconnect();};
  },[user?.userId]);

  async function logout(){try{await api("/api/auth/logout",{method:"POST"});}finally{try{localStorage.removeItem("gv_session_token");}catch{}socket?.disconnect();setSocket(null);setUser(null);navigate("/login");}}
  async function saveAvatar(avatar){const d=await api("/api/profile",{method:"PATCH",body:JSON.stringify({avatar})});setUser(u=>({...u,avatar:d.avatar}));navigate("/");}
  if(checking) return <div className="loading-screen"><div className="loading-logo"><Gamepad2/></div><span>Loading your Gameverse...</span></div>;

  return <Routes>
    <Route path="/login" element={user?<Navigate to="/" replace/>:<AuthPage onAuth={setUser}/>}/>
    <Route path="/signup" element={user?<Navigate to="/" replace/>:<AuthPage signup onAuth={setUser}/>}/>
    <Route path="/" element={user?(socket?<Home user={user} socket={socket} socketStatus={socketStatus} socketError={socketError} onLogout={logout} uiTheme={uiTheme} onToggleTheme={()=>setUiTheme(t=>t==="dark"?"light":"dark")}/>:<div className="loading-screen"><RefreshCw className="spin"/> Preparing your Gameverse connection...</div>):<Navigate to="/login" replace/>}/>
    <Route path="/avatar" element={user?<Suspense fallback={<div className="loading-screen">Loading Avatar Studio...</div>}><AvatarStudio initialAvatar={user.avatar} onSave={saveAvatar} onBack={()=>navigate("/")}/></Suspense>:<Navigate to="/login" replace/>}/>
    <Route path="/profile" element={user?<Profile user={user} onBack={()=>navigate("/")} onLogout={logout}/>:<Navigate to="/login" replace/>}/>
    <Route path="/room/:code" element={user&&socket?<Lobby user={user} socket={socket}/>:<Navigate to="/" replace/>}/>
    <Route path="/play/:code" element={user&&socket?<PlayRoute user={user} socket={socket}/>:<Navigate to="/" replace/>}/>
    <Route path="*" element={<Navigate to={user?"/":"/login"} replace/>}/>
  </Routes>;
}

function AuthPage({signup=false,onAuth}) {
  const [mode,setMode]=useState(signup?"signup":"login");
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [avatarType,setAvatarType]=useState("girl");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const navigate=useNavigate();
  async function submit(e){
    e.preventDefault();setError("");
    if(mode==="signup"&&password!==confirm)return setError("Dono passwords match hone chahiye.");
    setBusy(true);
    try{
      const d=await api(`/api/auth/${mode}`,{method:"POST",body:JSON.stringify({username,password,avatarType})});
      onAuth(d.user);navigate(mode==="signup"?"/avatar":"/");
    }catch(err){setError(err.message);}finally{setBusy(false);}
  }
  return <main className="auth-shell">
    <div className="auth-left"><div className="brand-lockup"><div className="brand-icon"><Gamepad2 size={26}/></div><span>THE GAMEVERSE</span></div><span className="eyebrow">YOUR CREW. YOUR GAMES. YOUR WORLD.</span><h1>Game night<br/><em>starts here.</em></h1><p>Paper chits ko bye bolo. Apne favourite party games online khelo.</p><div className="auth-card-fan" aria-label="Featured Gameverse games"><div className="fan-card fan-red"><span>01 · CARD GAME</span><strong>UNO</strong><small>NORMAL · FLIP · NO MERCY</small></div><div className="fan-card fan-gold"><span>02 · RACE</span><strong>LUDO</strong><small>ROLL · RACE · WIN</small></div><div className="fan-card fan-blue"><span>03 · MYSTERY</span><strong>CHOR?</strong><small>FIND THE THIEF</small></div><div className="fan-card fan-green"><span>04 · MATCH</span><strong>SOLA</strong><small>COLLECT FOUR</small></div></div><div className="auth-feature"><span><Users size={15}/> Play with your crew</span><span><Sparkles size={15}/> Make your own avatar</span></div></div>
    <section className="auth-card-panel"><div className="auth-panel-top"><span className="eyebrow">{mode==="signup"?"CREATE YOUR PLAYER ID":"PLAYER LOGIN"}</span><span className="secure-tag">● SECURE ACCOUNT</span></div><h2>{mode==="signup"?"Join the Gameverse.":"Welcome back."}</h2><p className="muted">{mode==="signup"?"Username banao, password set karo, avatar choose karo.":"Apne username se login karo. Email ki zarurat nahi."}</p>
      <form onSubmit={submit}><label htmlFor="auth-username">Username</label><input id="auth-username" value={username} onChange={e=>setUsername(e.target.value)} placeholder="3–18 characters" minLength={3} maxLength={18} pattern="[A-Za-z0-9_]+" required autoComplete="username"/><label htmlFor="auth-password">Password</label><input id="auth-password" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} required autoComplete={mode==="signup"?"new-password":"current-password"}/>
      {mode==="signup"&&<><label htmlFor="auth-confirm-password">Confirm password</label><input id="auth-confirm-password" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Password dobara enter karo" minLength={8} required autoComplete="new-password"/><label>Avatar style</label><div className="avatar-type-row"><button type="button" className={avatarType==="girl"?"chosen":""} onClick={()=>setAvatarType("girl")}><span className="avatar-type girl-type">♀</span> Girl</button><button type="button" className={avatarType==="boy"?"chosen":""} onClick={()=>setAvatarType("boy")}><span className="avatar-type boy-type">♂</span> Boy</button></div></>}
      {error&&<div className="form-error">{error}</div>}<button type="submit" className="primary-btn auth-submit" disabled={busy}>{busy?"Please wait...":mode==="signup"?"Create account":"Sign in"} <ArrowRight size={17}/></button></form>
      <div className="auth-toggle">{mode==="signup"?"Already have an account?":"New to The Gameverse?"}<button type="button" onClick={()=>{setMode(mode==="signup"?"login":"signup");setError("");navigate(mode==="signup"?"/login":"/signup");}}>{mode==="signup"?"Sign in":"Create account"}</button></div>
      <div className="auth-foot"><Info size={13}/> Username + password only. No email required.</div>
    </section>
  </main>;
}

function Header({user,onLogout}) {
  const navigate=useNavigate();
  return <header className="topbar"><button type="button" className="brand-small" onClick={()=>navigate("/")}><span className="brand-icon small"><Gamepad2 size={18}/></span><b>THE GAME<span>VERSE</span></b></button><div className="topbar-actions"><button type="button" className="nav-profile" onClick={()=>navigate("/profile")}><span className="nav-avatar"><AvatarPortrait avatar={user.avatar} size={29}/></span><span>{user.username}</span></button><button type="button" className="logout-btn" onClick={onLogout} title="Sign out"><LogOut size={17}/></button></div></header>;
}

function Home({user,socket,socketStatus,socketError,onLogout,uiTheme,onToggleTheme}) {
  const [joinCode,setJoinCode]=useState("");
  const [slotChoices,setSlotChoices]=useState({uno:4,ludo:4,"raja-mantri":4,"sola-parchi":4});
  const [error,setError]=useState("");
  const [creating,setCreating]=useState("");
  const navigate=useNavigate();
  async function createRoom(gameId){
    const family = gameId.startsWith("uno") ? "uno" : gameId;
    const playerSlots = gameId === "raja-mantri" ? 4 : slotChoices[family];
    setCreating(gameId);setError("");
    try {
      // Create via the authenticated API so mobile users don't lose the room
      // request while Socket.IO is still establishing its first connection.
      const response = await api("/api/rooms", { method: "POST", body: JSON.stringify({ gameId, playerSlots }) });
      if (!response?.room?.code) throw new Error("Server ne room code return nahi kiya. Backend log check karo.");
      navigate(`/room/${response.room.code}`);
    } catch (err) {
      setError(err.message || "Room create nahi ho paya. Login session aur server check karo.");
    } finally { setCreating(""); }
  }
  function joinRoom(e){e.preventDefault();if(!joinCode.trim())return;setError("");navigate(`/room/${joinCode.trim().toUpperCase()}`);}
  return <div className="app-shell" data-ui-theme={uiTheme}><Header user={user} onLogout={onLogout}/><main className="home-content">
    <section className="hero-banner"><div className="hero-copy"><span className="eyebrow">THE CREW IS WAITING</span><h1>Let's play,<br/><em>{user.username}.</em></h1><p>Pick a game, create a room, invite your people. Bas game shuru.</p><button type="button" className="hero-cta" onClick={()=>document.getElementById("game-library")?.scrollIntoView({behavior:"smooth"})}>Explore games <ArrowRight size={16}/></button></div><div className="hero-avatar"><Suspense fallback={<div className="avatar-loading"/>}><Avatar3D avatar={user.avatar} compact/></Suspense><span className="avatar-status">PLAYER ONLINE</span></div><div className="hero-deco hero-dice"><Dice5 size={54}/></div><div className="hero-deco hero-star">✦</div></section>
    {socketStatus!=="connected"&&<div className={`connection-banner ${socketStatus}`} role="status"><span className="connection-pulse"/><div><b>{socketStatus==="connecting"?"Connecting to Gameverse server":socketStatus==="error"?"Server connection issue":"Reconnecting to Gameverse"}</b><small>{socketError||"Room create ho sakta hai; lobby aur live match ke liye connection reconnect hona zaroori hai."}</small></div><button type="button" onClick={()=>socket?.connect()}>Retry</button></div>}
    <section className="quick-actions"><div className="quick-title"><span className="eyebrow">JUMP IN</span><h2>Play with your crew</h2></div><form className="join-form" onSubmit={joinRoom}><label className="sr-only" htmlFor="join-room-code">Room code</label><input id="join-room-code" aria-label="Room code" value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase().slice(0,6))} placeholder="ENTER ROOM CODE" maxLength={6}/><button type="submit" className="primary-btn" disabled={joinCode.length!==6}>Join room <ArrowRight size={15}/></button></form></section>
    {error&&<div className="inline-error">{error}</div>}
    <FriendsHub socket={socket} />
    <div className="section-heading" id="game-library"><div><span className="eyebrow">PICK YOUR PLAY</span><h2>Game library</h2></div><span className="library-count">04 GAME WORLDS</span></div>
    <section className="game-grid">{GAMES.map((g,i)=><article className={`game-card ${g.className}`} key={g.id}><div className="game-card-top"><span className="game-index">WORLD 0{i+1} · {g.id==="uno"?"CARD ARENA":g.id==="ludo"?"RACE ARENA":g.id==="raja-mantri"?"MYSTERY ARENA":"COLLECT ARENA"}</span><GameCardVisual kind={g.id}/></div><div className="game-card-body"><span className="game-players"><Users size={13}/>{g.players}</span><h3>{g.title}</h3><p>{g.sub}</p>{g.id!=="raja-mantri"&&<div className="slot-picker"><label htmlFor={`slots-${g.id}`}>PLAYER SLOTS</label><select id={`slots-${g.id}`} value={slotChoices[g.id]} onChange={e=>setSlotChoices(v=>({...v,[g.id]:Number(e.target.value)}))}>{Array.from({length:(g.id==="uno"?7:g.id==="ludo"?3:g.id==="sola-parchi"?5:0)},(_,i)=>i+(g.id==="uno"?2:g.id==="ludo"?2:4)).map(n=><option key={n} value={n}>{n} players</option>)}</select></div>}{g.id==="uno"?<div className="uno-mode-grid" aria-label="Choose UNO mode">{g.modes.map(([id,name],modeIndex)=><button type="button" key={id} className={`uno-mode-option ${id==="uno-no-mercy"?"no-mercy-option":""}`} onClick={()=>createRoom(id)} disabled={creating===id}><span className="mode-option-kicker">{id==="uno-no-mercy"?"HIGH PENALTY MODE":id==="uno-flip"?"TWO-SIDED DECK":"CLASSIC RULES"}</span><strong>{name}</strong><small>{creating===id?"Creating room...":modeIndex===0?"Play the original rules":modeIndex===1?"Switch sides mid-game":"Stack penalties · 25-card knockout"}</small><ArrowRight size={16}/></button>)}</div>:<button type="button" className="game-open" onClick={()=>createRoom(g.modes[0][0])} disabled={creating===g.modes[0][0]}>{creating===g.modes[0][0]?"Creating...":"Create room"} <ArrowRight size={15}/></button>}</div></article>)}</section>
    <section className="home-bottom"><div className="home-bottom-icon"><Trophy/></div><div><b>Every game night gets a scoreboard.</b><p>Play rounds, collect wins, and build your Gameverse stats.</p></div><button type="button" onClick={()=>navigate("/profile")}>My profile <ArrowRight size={15}/></button></section>
  </main><footer className="site-footer">THE GAMEVERSE <span>✦</span> MADE FOR GAME NIGHTS</footer><button type="button" className="home-theme-switch" onClick={onToggleTheme} aria-label={`Switch to ${uiTheme === "dark" ? "light" : "dark"} interface`} aria-pressed={uiTheme === "dark"}><span className="theme-switch-icon">{uiTheme === "dark"?<Sun size={18}/>:<Moon size={18}/>}</span><span>{uiTheme === "dark"?"LIGHT UI":"DARK UI"}</span></button></div>;
}

function FriendsHub({socket}) {
  const [data,setData]=useState({incoming:[],outgoing:[],friends:[]});
  const [query,setQuery]=useState("");
  const [results,setResults]=useState([]);
  const [active,setActive]=useState(null);
  const [messages,setMessages]=useState([]);
  const [draft,setDraft]=useState("");
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false);
  async function refresh(){try{setData(await api("/api/friends"));}catch(e){setNotice(e.message);}}
  useEffect(()=>{refresh();},[]);
  useEffect(()=>{if(!active){setMessages([]);return;}let live=true;setMessages([]);api(`/api/messages/${active.userId}`).then(d=>{if(live)setMessages(d.messages||[]);}).catch(e=>setNotice(e.message));const onDm=m=>{if(m.senderId===active.userId||m.receiverId===active.userId)setMessages(list=>list.some(x=>x.id===m.id)?list:[...list,m]);};socket?.on("dm:new",onDm);return()=>{live=false;socket?.off("dm:new",onDm);};},[active?.userId,socket]);
  async function search(e){e?.preventDefault();setNotice("");try{const d=await api(`/api/users/search?q=${encodeURIComponent(query)}`);setResults(d.users||[]);}catch(e){setNotice(e.message);}}
  async function request(username){try{await api("/api/friends/request",{method:"POST",body:JSON.stringify({username})});setNotice(`Request sent to @${username}.`);setResults([]);setQuery("");refresh();}catch(e){setNotice(e.message);}}
  async function respond(requestId,accept){try{await api("/api/friends/respond",{method:"POST",body:JSON.stringify({requestId,accept})});refresh();setNotice(accept?"Friend request accepted.":"Request ignored.");}catch(e){setNotice(e.message);}}
  async function send(e){e.preventDefault();if(!active||!draft.trim())return;setBusy(true);try{const d=await api(`/api/messages/${active.userId}`,{method:"POST",body:JSON.stringify({body:draft})});setMessages(m=>m.some(x=>x.id===d.message.id)?m:[...m,d.message]);setDraft("");}catch(e){setNotice(e.message);}finally{setBusy(false);}}
  return <section className="friends-hub" id="friends"><div className="friends-head"><div><span className="eyebrow">YOUR PEOPLE</span><h2>Friends & messages</h2><p>Username search karo, request bhejo, aur private chat karo.</p></div><button type="button" className="outline-btn" onClick={refresh}>Refresh</button></div>
    <div className="friends-grid"><div className="friends-main"><form className="friend-search" onSubmit={search}><label className="sr-only" htmlFor="friend-search-input">Search usernames</label><input id="friend-search-input" aria-label="Search usernames" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search exact or partial username" maxLength={18}/><button type="submit" className="primary-btn" disabled={query.trim().length<2}>Search</button></form>
      {!!results.length&&<div className="friend-results">{results.map(u=><div className="friend-row" key={u.userId}><span className="friend-avatar"><AvatarPortrait avatar={u.avatar} size={32}/></span><b>@{u.username}</b><button type="button" className="outline-btn" onClick={()=>request(u.username)}>Add friend</button></div>)}</div>}
      {!!data.incoming.length&&<div className="friend-section"><h3>Incoming requests <span>{data.incoming.length}</span></h3>{data.incoming.map(r=><div className="friend-row" key={r.requestId}><span className="friend-avatar"><AvatarPortrait avatar={r.user.avatar} size={32}/></span><b>@{r.user.username}</b><div className="friend-row-actions"><button type="button" className="primary-btn" onClick={()=>respond(r.requestId,true)}>Accept</button><button type="button" className="outline-btn" onClick={()=>respond(r.requestId,false)}>Ignore</button></div></div>)}</div>}
      <div className="friend-section"><h3>Your friends <span>{data.friends.length}</span></h3>{data.friends.map(f=><button type="button" className={`friend-row friend-select ${active?.userId===f.userId?"active":""}`} key={f.userId} onClick={()=>setActive(f)}><span className="friend-avatar"><AvatarPortrait avatar={f.avatar} size={32}/></span><b>@{f.username}</b><span className="friend-open">Open chat →</span></button>)}{!data.friends.length&&<p className="friends-empty">Abhi friends nahi hain. Username search karke invite bhejo.</p>}</div>
      {!!data.outgoing.length&&<div className="outgoing-note">Pending sent: {data.outgoing.map(x=>`@${x}`).join(", ")}</div>}
    </div><div className="dm-panel"><div className="dm-title"><b>{active?`Chat with @${active.username}`:"Private messages"}</b><span>{active?"FRIENDS ONLY":"Select a friend"}</span></div>{active?<><div className="dm-messages">{messages.map(m=><div key={m.id} className={`dm-bubble ${m.senderId===active.userId?"received":"sent"}`}><p>{m.body}</p><small>{new Date(m.createdAt).toLocaleString()}</small></div>)}{!messages.length&&<p className="friends-empty">Conversation start karo 👋</p>}</div><form className="dm-form" onSubmit={send}><label className="sr-only" htmlFor="direct-message-input">Write a private message</label><input id="direct-message-input" aria-label="Write a private message" value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Write a message..." maxLength={1000}/><button type="submit" className="primary-btn" disabled={busy||!draft.trim()}>Send</button></form></>:<div className="dm-placeholder">Choose a friend from your list to open a private chat.</div>}</div></div>{notice&&<p className="friends-notice" role="status" aria-live="polite">{notice}</p>}</section>;
}

function Lobby({user,socket}) {
  const {code}=useParams();
  const [room,setRoom]=useState(null);
  const [chat,setChat]=useState([]);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [retryCount,setRetryCount]=useState(0);
  const navigate=useNavigate();
  useEffect(()=>{
    if(!socket)return;
    let cancelled=false;
    const onUpdate=r=>setRoom(r);
    const onChat=m=>setChat(c=>[...c,m].slice(-40));
    const onStart=()=>navigate(`/play/${code}`);
    const onClosed=info=>{setError(info?.message||"Room close ho gaya.");setRoom(null);};
    socket.on("room:update",onUpdate);socket.on("room:chat",onChat);socket.on("game:started",onStart);socket.on("room:closed",onClosed);
    const resumeRoom=async()=>{
      try {
        await waitForSocketConnection(socket,15000);
        if(cancelled)return;
        socket.timeout(9000).emit("room:resume",{code},(timeoutError,res)=>{
          if(cancelled)return;
          if(timeoutError){setError("Room server response timeout. Retry connection karo.");return;}
          if(res?.error){
            socket.timeout(9000).emit("room:join",{code},(joinTimeout,joined)=>{
              if(cancelled)return;
              if(joinTimeout){setError("Room join timeout. Dobara try karo.");return;}
              if(joined?.error){setError(joined.error);return;}
              setRoom(joined.room);
            });
            return;
          }
          setRoom(res.room);
          if(res.room.status==="playing")navigate(`/play/${code}`);
        });
      } catch (connectionError) {
        if(!cancelled)setError(connectionError.message || "Gameverse server se connect nahi ho paaya.");
      }
    };
    resumeRoom();
    return()=>{cancelled=true;socket.off("room:update",onUpdate);socket.off("room:chat",onChat);socket.off("game:started",onStart);socket.off("room:closed",onClosed);};
  },[socket,code,retryCount]);
  const isHost=room?.hostId===user.userId;
  function ready(){
    if(!socket?.connected){setError("Server disconnected. Reconnect karke ready dabao.");return;}
    socket.timeout(7000).emit("room:ready",{ready:!room.players.find(p=>p.userId===user.userId)?.ready},(timeoutError,res)=>{
      if(timeoutError)setError("Ready update timeout. Connection check karo.");
      else if(res?.error)setError(res.error);
    });
  }
  function start(){
    if(!socket?.connected){setError("Server disconnected. Reconnect karke start karo.");return;}
    setBusy(true);
    socket.timeout(10000).emit("room:start",(timeoutError,res)=>{
      setBusy(false);
      if(timeoutError)setError("Game start timeout. Connection check karo.");
      else if(res?.error)setError(res.error);
      else navigate(`/play/${code}`);
    });
  }
  function sendChat(e){
    e.preventDefault();
    if(!message.trim())return;
    if(!socket?.connected){setError("Chat send nahi hua: server disconnected.");return;}
    socket.timeout(7000).emit("room:chat",{message},(timeoutError,res)=>{
      if(timeoutError)setError("Chat send timeout.");
      else if(res?.error)setError(res.error);
      else setMessage("");
    });
  }
  function leave(){if(socket?.connected)socket.emit("room:leave");navigate("/");}
  if(error&&!room)return <div className="center-message"><h2>Room connection issue</h2><p>{error}</p><button type="button" className="primary-btn" onClick={()=>{setError("");setRetryCount(value=>value+1);}}>Retry connection</button><button type="button" className="outline-btn" onClick={()=>navigate("/")}>Go home</button></div>;
  if(!room)return <div className="loading-screen">Connecting to room...</div>;
  const game=GAMES.find(g=>g.modes.some(m=>m[0]===room.gameId))||GAMES.find(g=>g.id===room.gameId);
  const selectedModeTitle=game?.modes.find(([id])=>id===room.gameId)?.[1]||game?.title||room.gameId;
  return <main className="lobby-page"><div className="lobby-top"><button type="button" className="back-link" onClick={leave}>← Leave room</button><span className="eyebrow">MULTIPLAYER LOBBY</span></div><div className="lobby-layout"><section className="lobby-main"><div className={`lobby-game-banner ${game?.className||""} ${room.gameId==="uno-no-mercy"?"no-mercy-lobby":""}`}><span className="eyebrow">ROOM READY · {room.gameId==="uno-no-mercy"?"NO MERCY RULESET":room.gameId==="uno-flip"?"FLIP RULESET":"SELECTED MODE"}</span><h1>{selectedModeTitle}</h1><p>{room.gameId==="uno-no-mercy"?"168-card deck · stacking · 7 swap · 0 pass · 25-card knockout":"Friends ko room code share karo aur sabko ready karao."}</p><div className="room-code-box"><span>ROOM CODE</span><b>{room.code}</b><button type="button" onClick={()=>navigator.clipboard?.writeText(room.code)} title="Copy room code"><Copy size={17}/></button></div></div><div className="lobby-players"><div className="lobby-heading"><h2>Players</h2><span>{room.players.length}/{room.maxPlayers} joined</span></div><div className="player-grid">{room.players.map((p,i)=><div className="player-tile" key={p.userId}><div className="player-avatar"><Suspense fallback={<div className="avatar-loading"/>}><Avatar3D avatar={p.avatar} compact/></Suspense></div><div><b>{p.username}{p.userId===user.userId?" (You)":""}</b><small>{p.userId===room.hostId?"HOST":p.connected===false?"OFFLINE":p.ready?"READY":"NOT READY"}</small></div>{p.userId===room.hostId&&<Crown className="host-crown"/>}<span className={`ready-dot ${p.ready?"ready":""}`}/></div>)}{Array.from({length:Math.max(0,room.maxPlayers-room.players.length)}).map((_,i)=><div className="player-tile empty" key={i}><div className="player-avatar">+</div><div><b>Waiting for player</b><small>SHARE ROOM CODE</small></div></div>)}</div></div><div className="lobby-actions"><button type="button" className="outline-btn" onClick={ready}><Check size={16}/>{room.players.find(p=>p.userId===user.userId)?.ready?"Not ready":"I'm ready"}</button>{isHost&&<button type="button" className="primary-btn" onClick={start} disabled={busy||room.players.length!==room.maxPlayers||room.players.some(p=>!p.ready||p.connected===false)}><Play size={16}/>{busy?"Starting...":"Start game"}</button>}</div>{error&&<div className="inline-error">{error}</div>}</section><aside className="lobby-chat"><div className="chat-head"><b>Room chat</b><span>LIVE</span></div><div className="chat-messages">{chat.map(m=><div className="chat-message" key={m.id}><b>{m.username}</b><p>{m.message}</p></div>)}{!chat.length&&<div className="chat-empty">Say hi to your crew 👋</div>}</div><form className="chat-form" onSubmit={sendChat}><label className="sr-only" htmlFor="room-chat-input">Message your crew</label><input id="room-chat-input" aria-label="Message your crew" value={message} onChange={e=>setMessage(e.target.value)} placeholder="Message your crew..." maxLength={240}/><button type="submit" disabled={!message.trim()}><ArrowRight size={17}/></button></form></aside></div></main>;
}

function PlayRoute({user,socket}) {
  const {code}=useParams();
  const [game,setGame]=useState(null);
  const [privateState,setPrivateState]=useState({});
  const [error,setError]=useState("");
  const [retryCount,setRetryCount]=useState(0);
  const navigate=useNavigate();
  useEffect(()=>{
    if(!socket)return;
    let cancelled=false;
    const onState=s=>setGame(s);
    const onPrivate=s=>setPrivateState(s||{});
    const onClosed=info=>setError(info?.message||"Room close ho gaya.");
    socket.on("game:state",onState);socket.on("game:private",onPrivate);socket.on("room:closed",onClosed);
    const resumeGame=async()=>{
      try {
        await waitForSocketConnection(socket,15000);
        if(cancelled)return;
        socket.timeout(9000).emit("room:resume",{code},(timeoutError,res)=>{
          if(cancelled)return;
          if(timeoutError)setError("Game reconnect timeout. Retry connection karo.");
          else if(res?.error)setError(res.error);
        });
      } catch (connectionError) {
        if(!cancelled)setError(connectionError.message || "Gameverse server se connect nahi ho paaya.");
      }
    };
    resumeGame();
    return()=>{cancelled=true;socket.off("game:state",onState);socket.off("game:private",onPrivate);socket.off("room:closed",onClosed);};
  },[socket,code,retryCount]);
  function action(action){
    return new Promise((resolve,reject)=>{
      if(!socket?.connected)return reject(new Error("Server disconnected. Reconnect karke move try karo."));
      socket.timeout(8000).emit("game:action",{action},(timeoutError,res)=>{
        if(timeoutError)reject(new Error("Game action timeout. Connection check karo."));
        else if(res?.error)reject(new Error(res.error));
        else resolve(res);
      });
    });
  }
  function exit(){if(socket?.connected)socket.emit("room:leave");navigate("/");}
  if(error)return <div className="center-message"><h2>Game session unavailable</h2><p>{error}</p><button type="button" className="primary-btn" onClick={()=>{setError("");setRetryCount(value=>value+1);}}>Retry connection</button><button type="button" className="outline-btn" onClick={()=>navigate("/")}>Go home</button></div>;
  if(!game)return <div className="loading-screen"><RefreshCw className="spin"/> Loading game table...</div>;
  return <Suspense fallback={<div className="loading-screen">Loading game board...</div>}><GameBoard game={game} me={user} privateState={privateState} onAction={action} onExit={exit}/></Suspense>;
}

function Profile({user,onBack,onLogout}) {
  const navigate=useNavigate();
  const [stats,setStats]=useState({played:0,wins:0,byGame:[]});
  useEffect(()=>{api("/api/stats").then(setStats).catch(()=>{});},[]);
  return <main className="profile-page"><button type="button" className="back-link" onClick={onBack}>← Back to home</button><section className="profile-hero"><div className="profile-3d"><Avatar3D avatar={user.avatar} compact/></div><div><span className="eyebrow">PLAYER ACCOUNT</span><h1>{user.username}</h1><span className="profile-rank">GAMEVERSE PLAYER</span><div className="profile-buttons"><button type="button" className="primary-btn" onClick={()=>navigate("/avatar")}>Customise avatar <ArrowRight size={16}/></button><button type="button" className="outline-btn" onClick={onLogout}><LogOut size={16}/> Sign out</button></div></div></section><section className="profile-stats"><div><Trophy/><b>{stats.wins}</b><span>WINS</span></div><div><Gamepad2/><b>{stats.played}</b><span>GAMES PLAYED</span></div><div><Sparkles/><b>{stats.played?Math.round(stats.wins/stats.played*100):0}%</b><span>WIN RATE</span></div></section><section className="profile-info"><div className="profile-info-title"><Info size={18}/><h2>INFO</h2></div><div className="info-line"><span>Username</span><b>{user.username}</b></div><div className="info-line"><span>Account ID</span><b>{user.userId.slice(0,8).toUpperCase()}</b></div><div className="info-line"><span>Avatar</span><b>{user.avatar?.type==="boy"?"Boy character":"Girl character"}</b></div><div className="info-line"><span>Joined</span><b>{user.createdAt?new Date(user.createdAt).toLocaleDateString("en-IN"):"Gameverse member"}</b></div></section></main>;
}

export default App;
