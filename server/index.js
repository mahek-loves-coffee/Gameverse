import express from "express";
import http from "node:http";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { Server } from "socket.io";
import { isAllowedDevelopmentOrigin } from "./originPolicy.js";
import { validateRoomRequest, createWaitingRoom } from "./roomFactory.js";
import db from "./db.js";
import { GAME_META, createGameState, publicGameState, privateGameState, applyGameAction } from "../shared/gameEngine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT || 4000);
const SECRET = process.env.SESSION_SECRET || "development-only-change-this-secret-please-32chars";
if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set to a unique 32+ character value in production.");
}
const configuredOrigins = (process.env.CLIENT_ORIGIN || process.env.RENDER_EXTERNAL_URL || "http://localhost:5173").split(",").map((value) => value.trim()).filter(Boolean);
const CLIENT_ORIGINS = new Set([
  "http://localhost:5173", "http://127.0.0.1:5173", ...configuredOrigins
]);
const COOKIE_SECURE = process.env.NODE_ENV === "production";
const COOKIE_SAME_SITE = COOKIE_SECURE ? "none" : "lax";
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
const io = new Server(server, { cors: {
  origin(origin, callback) {
    if (!origin || CLIENT_ORIGINS.has(origin) || isAllowedDevelopmentOrigin(origin, process.env.NODE_ENV)) return callback(null, true);
    return callback(new Error("Gameverse client origin not allowed. Add the client URL to CLIENT_ORIGIN."), false);
  },
  credentials: true
} });

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && CLIENT_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false }));

const signToken = (user, ttlSeconds = 60 * 60 * 24 * 14) => {
  const payload = Buffer.from(JSON.stringify({ sub: user.id, username: user.username, exp: Math.floor(Date.now() / 1000) + ttlSeconds })).toString("base64url");
  const signature = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
};
function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = crypto.createHmac("sha256", SECRET).update(payload).digest();
  let received;
  try { received = Buffer.from(signature, "base64url"); } catch { return null; }
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.sub && data.username && Number(data.exp) > Math.floor(Date.now() / 1000) ? data : null;
  } catch { return null; }
}
function setSession(res, user) {
  res.cookie("gv_session", signToken(user), {
    httpOnly: true, secure: COOKIE_SECURE, sameSite: COOKIE_SAME_SITE,
    maxAge: 1000 * 60 * 60 * 24 * 14, path: "/"
  });
}
async function getUser(req) {
  const authorization = String(req.headers.authorization || "");
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
  const session = verifyToken(bearer || req.cookies?.gv_session);
  if (!session) return null;
  return await db.get("SELECT id, username, avatar_json, created_at FROM users WHERE id = ?", session.sub);
}
async function requireAuth(req, res, next) {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: "Login required." });
    req.user = user;
    next();
  } catch (error) { next(error); }
}
function publicUser(user) {
  return { userId: user.id, username: user.username, avatar: JSON.parse(user.avatar_json || "{}"), createdAt: user.created_at };
}
async function refreshSocketUser(socket) {
  const userId = socket.data.user?.id;
  if (!userId) return null;
  const latest = await db.get("SELECT id, username, avatar_json, created_at FROM users WHERE id = ?", userId);
  if (latest) socket.data.user = latest;
  return latest || null;
}
function cleanUsername(value) {
  return String(value || "").trim().toLowerCase();
}

app.post("/api/auth/signup", async (req, res) => {
  const username = cleanUsername(req.body?.username);
  const password = String(req.body?.password || "");
  const avatarType = req.body?.avatarType === "boy" ? "boy" : "girl";
  if (!/^[a-z0-9_]{3,18}$/.test(username)) return res.status(400).json({ error: "Username 3–18 characters ka hona chahiye. Letters, numbers aur underscore allowed hain." });
  if (password.length < 8 || password.length > 72) return res.status(400).json({ error: "Password 8–72 characters ka hona chahiye." });
  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 12);
  const seed = [...username].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 7);
  const palettes = [
    { skin: "#e9b99a", hair: "#34223d", shirt: "#765be8", accent: "#f1c66d", secondary: "#24243b", archetype: "street", outfit: "streetwear", accessory: "headphones", aura: "none" },
    { skin: "#c98765", hair: "#162f4d", shirt: "#d65342", accent: "#80f3ff", secondary: "#272b3a", archetype: "cyber", outfit: "racer", accessory: "visor", aura: "neon" },
    { skin: "#9b6048", hair: "#d4a044", shirt: "#8a3e69", accent: "#ffc76d", secondary: "#251d35", archetype: "royal", outfit: "longcoat", accessory: "crown", aura: "cosmic" },
    { skin: "#704532", hair: "#7b4bc4", shirt: "#426b9b", accent: "#b9eaff", secondary: "#252042", archetype: "fantasy", outfit: "robe", accessory: "horns", aura: "frost" },
    { skin: "#f6d2b8", hair: "#211a2c", shirt: "#303344", accent: "#ff805d", secondary: "#171a29", archetype: "rogue", outfit: "longcoat", accessory: "mask", aura: "ember" },
    { skin: "#e9b99a", hair: "#55352e", shirt: "#536b89", accent: "#83e4ff", secondary: "#202b43", archetype: "titan", outfit: "armour", accessory: "halo", aura: "neon" }
  ];
  const palette = palettes[seed % palettes.length];
  const masculineHairStyles = ["fade", "swept", "spiky", "mohawk", "undercut", "afro", "curly"];
  const feminineHairStyles = ["soft", "bob", "long", "afro", "curly", "braids", "ponytail"];
  const hairStyles = avatarType === "boy" ? masculineHairStyles : feminineHairStyles;
  const hairStyle = hairStyles[(seed >>> 3) % hairStyles.length];
  const avatar = { type: avatarType, ...palette, backGear: "none", companion: "none", style: hairStyle, hairStyle, eyeColor: ["#342a46", "#397b85", "#3b5da8", "#8b6338", "#9d4f74"][seed % 5] };
  try {
    await db.run("INSERT INTO users (id, username, password_hash, avatar_json, created_at) VALUES (?, ?, ?, ?, ?)", id, username, passwordHash, JSON.stringify(avatar), new Date().toISOString());
    const user = await db.get("SELECT id, username, avatar_json, created_at FROM users WHERE id = ?", id);
    setSession(res, user);
    res.status(201).json({ user: publicUser(user), token: signToken(user) });
  } catch (error) {
    if (["SQLITE_CONSTRAINT", "23505"].some(code => String(error.code).includes(code))) return res.status(409).json({ error: "Ye username already taken hai." });
    console.error(error);
    res.status(500).json({ error: "Account create nahi ho paya." });
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
  const username = cleanUsername(req.body?.username);
  const password = String(req.body?.password || "");
  const user = await db.get("SELECT * FROM users WHERE username = ? COLLATE NOCASE", username);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: "Username ya password incorrect hai." });
  setSession(res, user);
  res.json({ user: publicUser(user), token: signToken(user) });
  } catch (error) { next(error); }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("gv_session", { httpOnly: true, secure: COOKIE_SECURE, sameSite: COOKIE_SAME_SITE, path: "/" });
  res.json({ ok: true });
});
app.get("/api/me", requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));
// A short-lived handshake ticket avoids relying on mobile browsers forwarding the
// HTTP-only session cookie through the development Socket.IO proxy.
app.get("/api/socket-ticket", requireAuth, (req, res) => res.json({ ticket: signToken(req.user, 90) }));
app.get("/api/stats", requireAuth, async (req, res, next) => {
  try {
    const totals = await db.get("SELECT COUNT(*) AS played, SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) AS wins FROM game_results WHERE user_id = ?", req.user.id);
    const byGame = await db.all("SELECT game_id, COUNT(*) AS played, SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) AS wins FROM game_results WHERE user_id = ? GROUP BY game_id", req.user.id);
    res.json({ played: Number(totals?.played || 0), wins: Number(totals?.wins || 0), byGame });
  } catch (error) { next(error); }
});
// Friends and private messaging. Requests are directional; accepted friendships are stored canonically.
app.get("/api/users/search", requireAuth, async (req, res, next) => {
  try {
  const q = String(req.query.q || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 18);
  if (q.length < 2) return res.json({ users: [] });
  const users = (await db.all(`SELECT id, username, avatar_json FROM users WHERE username LIKE ? COLLATE NOCASE AND id != ? LIMIT 8`, `%${q}%`, req.user.id))
    .map(u => ({ userId: u.id, username: u.username, avatar: JSON.parse(u.avatar_json || "{}") }));
  res.json({ users });
  } catch (error) { next(error); }
});
app.get("/api/friends", requireAuth, async (req, res, next) => {
  try {
  const me = req.user.id;
  const incoming = (await db.all(`SELECT r.id, r.created_at, u.id AS user_id, u.username, u.avatar_json FROM friend_requests r JOIN users u ON u.id=r.sender_id WHERE r.receiver_id=? AND r.status='pending' ORDER BY r.created_at DESC`, me))
    .map(r => ({ requestId:r.id, createdAt:r.created_at, user:{userId:r.user_id, username:r.username, avatar:JSON.parse(r.avatar_json||"{}")}}));
  const outgoing = (await db.all(`SELECT u.username FROM friend_requests r JOIN users u ON u.id=r.receiver_id WHERE r.sender_id=? AND r.status='pending'`, me)).map(x=>x.username);
  const friends = (await db.all(`SELECT u.id, u.username, u.avatar_json FROM friendships f JOIN users u ON u.id=CASE WHEN f.user_low=? THEN f.user_high ELSE f.user_low END WHERE f.user_low=? OR f.user_high=? ORDER BY u.username COLLATE NOCASE`, me,me,me))
    .map(u=>({userId:u.id,username:u.username,avatar:JSON.parse(u.avatar_json||"{}")}));
  res.json({ incoming, outgoing, friends });
  } catch (error) { next(error); }
});
app.post("/api/friends/request", requireAuth, async (req, res, next) => {
  try {
  const username = cleanUsername(req.body?.username);
  const target = await db.get("SELECT id FROM users WHERE username=? COLLATE NOCASE", username);
  if (!target) return res.status(404).json({error:"Username nahi mila."});
  if (target.id === req.user.id) return res.status(400).json({error:"Khud ko request nahi bhej sakte."});
  const [low,high] = [req.user.id,target.id].sort();
  if (await db.get("SELECT 1 FROM friendships WHERE user_low=? AND user_high=?", low,high)) return res.status(409).json({error:"Ye user already friend hai."});
  const reverse = await db.get("SELECT id FROM friend_requests WHERE sender_id=? AND receiver_id=? AND status='pending'", target.id,req.user.id);
  if (reverse) return res.status(409).json({error:"Unki request already aayi hui hai. Incoming requests check karo."});
  const existing = await db.get("SELECT id,status FROM friend_requests WHERE sender_id=? AND receiver_id=?", req.user.id,target.id);
  if (existing?.status === "pending") return res.status(409).json({error:"Request already sent hai."});
  if (existing) await db.run("UPDATE friend_requests SET status='pending', created_at=? WHERE id=?", new Date().toISOString(),existing.id);
  else await db.run("INSERT INTO friend_requests (id,sender_id,receiver_id,status,created_at) VALUES (?,?,?,'pending',?)", crypto.randomUUID(),req.user.id,target.id,new Date().toISOString());
  res.status(201).json({ok:true});
  } catch (error) { next(error); }
});
app.post("/api/friends/respond", requireAuth, async (req, res, next) => {
  try {
    const requestId = String(req.body?.requestId || "");
    const accept = Boolean(req.body?.accept);
    const request = await db.get("SELECT * FROM friend_requests WHERE id=? AND receiver_id=? AND status='pending'", requestId, req.user.id);
    if (!request) return res.status(404).json({ error: "Pending request nahi mili." });
    await db.transaction(async tx => {
      await tx.run("UPDATE friend_requests SET status=? WHERE id=?", accept ? "accepted" : "ignored", requestId);
      if (accept) {
        const [low, high] = [request.sender_id, request.receiver_id].sort();
        await tx.run("INSERT OR IGNORE INTO friendships (user_low,user_high,created_at) VALUES (?,?,?)", low, high, new Date().toISOString());
      }
    });
    res.json({ ok: true });
  } catch (error) { next(error); }
});
async function areFriends(a, b) {
  const [low, high] = [a, b].sort();
  return Boolean(await db.get("SELECT 1 FROM friendships WHERE user_low=? AND user_high=?", low, high));
}
app.get("/api/messages/:friendId", requireAuth, async (req,res,next) => {
  try {
  if (!await areFriends(req.user.id,req.params.friendId)) return res.status(403).json({error:"Messages sirf friends ke saath available hain."});
  const rows=(await db.all(`SELECT id,sender_id,receiver_id,body,created_at FROM direct_messages WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?) ORDER BY created_at DESC LIMIT 100`,req.user.id,req.params.friendId,req.params.friendId,req.user.id)).reverse();
  res.json({messages:rows.map(m=>({id:m.id,senderId:m.sender_id,receiverId:m.receiver_id,body:m.body,createdAt:m.created_at}))});
  } catch (error) { next(error); }
});
app.post("/api/messages/:friendId", requireAuth, async (req,res,next) => {
  try {
  if (!await areFriends(req.user.id,req.params.friendId)) return res.status(403).json({error:"Messages sirf friends ke saath available hain."});
  const body=String(req.body?.body||"").trim().slice(0,1000);
  if (!body) return res.status(400).json({error:"Message empty hai."});
  const message={id:crypto.randomUUID(),senderId:req.user.id,receiverId:req.params.friendId,body,createdAt:new Date().toISOString()};
  await db.run("INSERT INTO direct_messages (id,sender_id,receiver_id,body,created_at) VALUES (?,?,?,?,?)",message.id,message.senderId,message.receiverId,message.body,message.createdAt);
  io.to(`user:${req.params.friendId}`).emit("dm:new", message);
  res.status(201).json({message});
  } catch (error) { next(error); }
});

app.patch("/api/profile", requireAuth, async (req, res, next) => {
  try {
  const incoming = req.body?.avatar;
  if (!incoming || typeof incoming !== "object") return res.status(400).json({ error: "Avatar data missing." });
  const validColor = (value, fallback) => /^#[0-9a-f]{6}$/i.test(value || "") ? value : fallback;
  const allowed = {
    type: incoming.type === "boy" ? "boy" : "girl",
    skin: validColor(incoming.skin, "#e9b99a"),
    hair: validColor(incoming.hair, "#34223d"),
    shirt: validColor(incoming.shirt, "#8a68ed"),
    secondary: validColor(incoming.secondary, "#24243b"),
    accent: validColor(incoming.accent, "#f1c66d"),
    eyeColor: validColor(incoming.eyeColor, "#342a46"),
    style: ["soft", "bob", "long", "spiky", "mohawk", "afro", "curly", "undercut", "fade", "swept", "braids", "ponytail"].includes(incoming.hairStyle || incoming.style) ? (incoming.hairStyle || incoming.style) : "soft",
    hairStyle: ["soft", "bob", "long", "spiky", "mohawk", "afro", "curly", "undercut", "fade", "swept", "braids", "ponytail"].includes(incoming.hairStyle || incoming.style) ? (incoming.hairStyle || incoming.style) : "soft",
    archetype: ["street", "cyber", "royal", "fantasy", "rogue", "titan", "celestial", "rift"].includes(incoming.archetype) ? incoming.archetype : "street",
    outfit: ["streetwear", "armour", "longcoat", "racer", "robe"].includes(incoming.outfit) ? incoming.outfit : "streetwear",
    accessory: ["none", "glasses", "visor", "mask", "horns", "antlers", "halo", "crown", "headphones"].includes(incoming.accessory) ? incoming.accessory : "none",
    backGear: ["none", "wings"].includes(incoming.backGear) ? incoming.backGear : incoming.accessory === "wings" ? "wings" : "none",
    companion: ["none", "shoulder-drone"].includes(incoming.companion) ? incoming.companion : incoming.accessory === "shoulder-drone" ? "shoulder-drone" : "none",
    aura: ["none", "neon", "ember", "frost", "cosmic", "void", "storm", "solar"].includes(incoming.aura) ? incoming.aura : "none"
  };
  const avatarJson = JSON.stringify(allowed);
  await db.run("UPDATE users SET avatar_json = ? WHERE id = ?", avatarJson, req.user.id);

  // Keep every connected session and any already-open room in sync immediately.
  // Socket authentication data is a snapshot from connection time, so it must be refreshed
  // after a profile edit or a newly created room would receive the old avatar.
  for (const connectedSocket of io.sockets.sockets.values()) {
    if (connectedSocket.data.user?.id === req.user.id) {
      connectedSocket.data.user = { ...connectedSocket.data.user, avatar_json: avatarJson };
    }
  }
  for (const room of rooms.values()) {
    const player = room.players.find((p) => p.userId === req.user.id);
    if (!player) continue;
    player.avatar = allowed;
    if (room.gameState?.playerInfo?.[req.user.id]) {
      room.gameState.playerInfo[req.user.id].avatar = allowed;
    }
    emitRoom(room);
    if (room.gameState) sendGameState(room);
  }
  res.json({ avatar: allowed });
  } catch (error) { next(error); }
});

const rooms = new Map();
const roomCode = () => crypto.randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
function roomSummary(room) {
  return {
    code: room.code, gameId: room.gameId, mode: room.mode, status: room.status,
    hostId: room.hostId, players: room.players.map(p => ({ userId: p.userId, username: p.username, avatar: p.avatar, ready: p.ready, connected: p.connected !== false })),
    maxPlayers: room.maxPlayers
  };
}
function emitRoom(room) { io.to(room.code).emit("room:update", roomSummary(room)); }

function detachUserFromRooms(userId) {
  for (const room of rooms.values()) {
    if (!room.players.some((player) => player.userId === userId)) continue;
    room.players = room.players.filter((player) => player.userId !== userId);
    if (room.status === "playing") {
      room.status = "closed";
      io.to(room.code).emit("room:closed", { message: "A player left the match. This room has been closed." });
    }
    if (!room.players.length) rooms.delete(room.code);
    else {
      if (room.hostId === userId) room.hostId = room.players.find((player) => player.connected !== false && player.socketId)?.userId || room.players[0].userId;
      emitRoom(room);
    }
  }
}

app.get("/api/health", async (_req, res) => { try { await db.get("SELECT 1 AS ok"); res.json({ ok: true, service: "gameverse", database: db.kind, now: new Date().toISOString() }); } catch (error) { console.error("[health] database unavailable", error); res.status(503).json({ ok: false, service: "gameverse", error: "Database unavailable" }); } });

// Room creation uses authenticated HTTP first. The lobby then resumes the room over
// Socket.IO, avoiding a mobile click/connection race during initial socket startup.
app.post("/api/rooms", requireAuth, (req, res) => {
  try {
    const gameId = String(req.body?.gameId || "");
    const validation = validateRoomRequest(gameId, req.body?.playerSlots);
    if (validation.error) return res.status(400).json({ error: validation.error });
    let code;
    do { code = roomCode(); } while (rooms.has(code));
    const user = publicUser(req.user);
    const room = createWaitingRoom({ code, gameId, playerSlots: validation.slots, user, socketId: null });
    // Only detach an existing room after the new room has been validated and built.
    detachUserFromRooms(req.user.id);
    rooms.set(code, room);
    return res.status(201).json({ room: roomSummary(room) });
  } catch (error) {
    console.error("[Gameverse room create]", error);
    return res.status(500).json({ error: "Room create nahi ho paya. Server terminal mein [Gameverse room create] error check karo." });
  }
});

function sendGameState(room) {
  io.to(room.code).emit("game:state", publicGameState(room.gameState));
  for (const player of room.players) {
    const target = player.socketId ? io.sockets.sockets.get(player.socketId) : null;
    if (target?.data.roomCode === room.code) target.emit("game:private", privateGameState(room.gameState, player.userId));
  }
}
function removePlayer(socket) {
  const code = socket.data.roomCode;
  if (!code) return;
  const room = rooms.get(code);
  if (!room) return;
  const player = room.players.find(p => p.userId === socket.data.user?.id);
  // An older tab must not remove or control the player's newer resumed session.
  if (player?.socketId && player.socketId !== socket.id) {
    socket.leave(code);
    socket.data.roomCode = null;
    return;
  }
  room.players = room.players.filter(p => p.userId !== socket.data.user?.id);
  socket.leave(code);
  socket.data.roomCode = null;
  if (!room.players.length) rooms.delete(code);
  else {
    if (room.hostId === socket.data.user?.id) {
      const successor = room.players.find(p => p.connected !== false && p.socketId) || room.players[0];
      room.hostId = successor.userId;
    }
    if (room.status === "playing") {
      room.status = "closed";
      io.to(room.code).emit("room:closed", { message: "A player left the match. This room has been closed." });
    }
    emitRoom(room);
  }
}

io.use(async (socket, next) => {
  try {
  const cookies = {};
  for (const part of String(socket.handshake.headers.cookie || "").split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  }
  const session = verifyToken(socket.handshake.auth?.ticket) || verifyToken(cookies.gv_session);
  if (!session) return next(new Error("Not authenticated. Please sign in again."));
  const user = await db.get("SELECT id, username, avatar_json, created_at FROM users WHERE id = ?", session.sub);
  if (!user) return next(new Error("Account not found"));
  socket.data.user = user;
  next();
  } catch (error) { next(error); }
});

io.on("connection", socket => {
  socket.join(`user:${socket.data.user.id}`);
  socket.on("room:create", async ({ gameId, mode, playerSlots } = {}, ack = () => {}) => {
    const currentUser = await refreshSocketUser(socket);
    if (!currentUser) return ack({ error: "Account session expire ho gaya. Dobara login karo." });
    const validation = validateRoomRequest(gameId, playerSlots);
    if (validation.error) return ack({ error: validation.error });
    const slots = validation.slots;
    // Only move the player out of an existing room after all create arguments are valid.
    removePlayer(socket);
    let code;
    do { code = roomCode(); } while (rooms.has(code));
    const user = publicUser(currentUser);
    const room = createWaitingRoom({ code, gameId, playerSlots: slots, user, socketId: socket.id });
    room.mode = mode || gameId;
    rooms.set(code, room);
    socket.join(code); socket.data.roomCode = code;
    emitRoom(room);
    ack({ room: roomSummary(room) });
  });

  socket.on("room:join", async ({ code } = {}, ack = () => {}) => {
    const currentUser = await refreshSocketUser(socket);
    if (!currentUser) return ack({ error: "Account session expire ho gaya. Dobara login karo." });
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room) return ack({ error: "Room code nahi mila." });
    if (room.status !== "waiting") return ack({ error: "Game already start ho chuka hai." });
    const existingPlayer = room.players.find(p => p.userId === socket.data.user.id);
    if (existingPlayer) {
      if (socket.data.roomCode && socket.data.roomCode !== room.code) removePlayer(socket);
      existingPlayer.socketId = socket.id;
      existingPlayer.username = currentUser.username;
      existingPlayer.avatar = JSON.parse(currentUser.avatar_json || "{}");
      existingPlayer.connected = true;
      socket.join(room.code); socket.data.roomCode = room.code;
      emitRoom(room);
      return ack({ room: roomSummary(room) });
    }
    if (room.players.length >= room.maxPlayers) return ack({ error: "Room full hai. Host ne jitne slots select kiye hain woh full ho chuke hain." });
    removePlayer(socket);
    const user = publicUser(currentUser);
    room.players.push({ ...user, socketId: socket.id, ready: false, connected: true });
    const currentHost = room.players.find(p => p.userId === room.hostId);
    if (!currentHost || currentHost.connected === false || !currentHost.socketId) room.hostId = user.userId;
    socket.join(room.code); socket.data.roomCode = room.code;
    emitRoom(room);
    ack({ room: roomSummary(room) });
  });

  socket.on("room:resume", async ({ code } = {}, ack = () => {}) => {
    const currentUser = await refreshSocketUser(socket);
    if (!currentUser) return ack({ error: "Account session expire ho gaya. Dobara login karo." });
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room || room.status === "closed" || !room.players.some(p => p.userId === socket.data.user.id)) return ack({ error: "Room session nahi mila ya match close ho chuka hai." });
    if (socket.data.roomCode && socket.data.roomCode !== room.code) removePlayer(socket);
    socket.join(room.code); socket.data.roomCode = room.code;
    const p = room.players.find(p => p.userId === socket.data.user.id);
    p.socketId = socket.id; p.connected = true;
    p.username = currentUser.username;
    p.avatar = JSON.parse(currentUser.avatar_json || "{}");
    if (room.gameState?.playerInfo?.[p.userId]) room.gameState.playerInfo[p.userId].avatar = p.avatar;
    ack({ room: roomSummary(room) });
    emitRoom(room);
    if (room.gameState) {
      socket.emit("game:state", publicGameState(room.gameState));
      socket.emit("game:private", privateGameState(room.gameState, socket.data.user.id));
    }
  });

  socket.on("room:ready", ({ ready } = {}, ack = () => {}) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.status !== "waiting") return ack({ error: "Waiting room nahi mila." });
    const p = room.players.find(p => p.userId === socket.data.user.id);
    if (!p || p.connected === false || p.socketId !== socket.id) return ack({ error: "Player session reconnect karo." });
    p.ready = Boolean(ready);
    emitRoom(room);
    ack({ ok: true });
  });

  socket.on("room:start", (ack = () => {}) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.status !== "waiting") return ack({ error: "Waiting room missing ya game already start ho chuka hai." });
    if (room.hostId !== socket.data.user.id) return ack({ error: "Only host can start." });
    const hostPlayer = room.players.find(p => p.userId === socket.data.user.id);
    if (!hostPlayer || hostPlayer.socketId !== socket.id || hostPlayer.connected === false) return ack({ error: "Host session reconnect karo." });
    const meta = GAME_META[room.gameId];
    if (room.players.length < meta.min) return ack({ error: `Minimum ${meta.min} players chahiye.` });
    if (room.players.length !== room.maxPlayers) return ack({ error: `Host ne ${room.maxPlayers} player slots select kiye hain. Sab slots fill hone chahiye.` });
    if (room.players.some(p => p.connected === false || !p.socketId)) return ack({ error: "Sab players online hone chahiye." });
    if (room.players.some(p => !p.ready)) return ack({ error: "Sab players ready hone chahiye." });
    try {
      room.gameState = createGameState(room.gameId, room.players);
      room.status = "playing";
      io.to(room.code).emit("game:started", { code: room.code, gameId: room.gameId });
      sendGameState(room);
      ack({ ok: true });
    } catch (error) { ack({ error: error.message }); }
  });

  socket.on("game:action", async ({ action } = {}, ack = () => {}) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room?.gameState || room.status !== "playing") return ack({ error: "Game active nahi hai ya room close ho chuka hai." });
    const activePlayer = room.players.find(p => p.userId === socket.data.user.id);
    if (!activePlayer || activePlayer.socketId !== socket.id || activePlayer.connected === false) return ack({ error: "Ye session active nahi hai. Current room tab use karo." });
    try {
      room.gameState = applyGameAction(room.gameState, socket.data.user.id, action || {});
      sendGameState(room);
      if (room.gameState.status === "finished") {
        for (const p of room.players) {
          const result = room.gameState.winner === p.userId ? "win" : "played";
          await db.run("INSERT INTO game_results (id, user_id, game_id, result, room_code, created_at) VALUES (?, ?, ?, ?, ?, ?)", crypto.randomUUID(), p.userId, room.gameId, result, room.code, new Date().toISOString());
        }
      }
      ack({ ok: true });
    } catch (error) { ack({ error: error.message }); }
  });

  socket.on("room:chat", ({ message } = {}, ack = () => {}) => {
    const room = rooms.get(socket.data.roomCode);
    const text = String(message || "").trim().slice(0, 240);
    if (!room || room.status !== "waiting") return ack({ error: "Room chat available nahi hai." });
    const sender = room.players.find(p => p.userId === socket.data.user.id);
    if (!sender || sender.socketId !== socket.id || sender.connected === false) return ack({ error: "Room session reconnect karo." });
    if (!text) return ack({ error: "Message empty hai." });
    const entry = { id: crypto.randomUUID(), username: socket.data.user.username, message: text, at: new Date().toISOString() };
    room.chat.push(entry); room.chat = room.chat.slice(-40);
    io.to(room.code).emit("room:chat", entry);
    ack({ ok: true });
  });

  socket.on("room:leave", () => removePlayer(socket));
  socket.on("disconnect", () => {
    const room = rooms.get(socket.data.roomCode);
    if (!room) return;
    const player = room.players.find(p => p.userId === socket.data.user?.id);
    if (player && player.socketId === socket.id) {
      player.connected = false;
      player.socketId = null;
      // In a waiting room, hand host controls to an online player if the host disconnects.
      if (room.status === "waiting" && room.hostId === player.userId) {
        const successor = room.players.find(p => p.userId !== player.userId && p.connected !== false && p.socketId);
        if (successor) room.hostId = successor.userId;
      }
      emitRoom(room);
    }
  });
});

app.use((error, req, res, _next) => {
  console.error("[Gameverse API error]", error);
  if (res.headersSent) return;
  res.status(500).json({ error: "Gameverse server mein temporary issue aaya. Thodi der baad retry karo." });
});

if (process.env.NODE_ENV === "production") {
  const dist = path.resolve(__dirname, "../dist");
  app.use(express.static(dist));
  app.get("*", (req, res) => res.sendFile(path.join(dist, "index.html")));
}

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`The Gameverse backend port ${PORT} is already in use. Stop the older server process, then run npm run dev again.`);
    process.exitCode = 1;
    return;
  }
  throw error;
});
server.listen(PORT, "0.0.0.0", () => console.log(`The Gameverse server listening on port ${PORT} (database: ${db.kind})`));
