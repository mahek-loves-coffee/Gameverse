import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const app = read("../src/App.jsx");
const board = read("../src/components/GameBoard.jsx");
const avatar3d = read("../src/components/Avatar3D.jsx");
const portrait = read("../src/components/AvatarPortrait.jsx");
const studio = read("../src/components/AvatarStudio.jsx");
const css = read("../src/styles.css");
const html = read("../index.html");
const server = read("../server/index.js");
const roomFactory = read("../server/roomFactory.js");

test("all app, game-board and avatar-studio buttons declare an explicit type", () => {
  for (const [name, source] of [["App", app], ["GameBoard", board], ["AvatarStudio", studio]]) {
    const buttons = source.match(/<button\b[^>]*>/g) || [];
    const missing = buttons.filter((button) => !/\btype=/.test(button));
    assert.deepEqual(missing, [], `${name} has buttons without type`);
  }
});

test("all interactive forms have explicit submit buttons", () => {
  const forms = [...app.matchAll(/<form\b[\s\S]*?<\/form>/g)].map((m) => m[0]);
  assert.ok(forms.length >= 5, "expected auth, room join, friend search, DM and room chat forms");
  for (const form of forms) {
    assert.match(form, /<button\b[^>]*\btype="submit"/, "form is missing an explicit submit button");
  }
});

test("text inputs have accessible names or associated labels", () => {
  const inputTags = app.match(/<input\b[^>]*>/g) || [];
  assert.ok(inputTags.length >= 6);
  for (const input of inputTags) {
    assert.ok(/\baria-label=/.test(input) || /\bid=/.test(input), `input has no accessible name: ${input}`);
  }
  assert.match(app, /htmlFor="auth-username"/);
  assert.match(app, /htmlFor="auth-password"/);
});

test("avatar scene has idle motion and a graceful WebGL fallback", () => {
  assert.match(avatar3d, /useFrame\(/);
  assert.match(avatar3d, /<Canvas fallback=/);
  assert.match(avatar3d, /OrbitControls/);
});

test("portrait SVG gradient IDs are unique for repeated avatars", () => {
  assert.match(portrait, /useId\(\)/);
  assert.match(portrait, /id=\{`\$\{id\}-bg`\}/);
  assert.match(portrait, /url\(#\$\{id\}-bg\)/);
});

test("game actions are guarded against rapid duplicate submission", () => {
  assert.match(board, /actionLock\.current/);
  assert.match(board, /setPending\(true\)/);
  assert.match(board, /finally\s*\{\s*actionLock\.current=false;\s*setPending\(false\);/);
});

test("Ludo player quadrants follow red, blue, yellow, green track order", () => {
  assert.match(board, /const colours=\["#ed5268","#4e8fe9","#f3bd42","#3dbb8a"\]/);
  assert.match(board, /\[\[\[1,1\],\[2,1\],\[1,2\],\[2,2\]\],\[\[1,12\],\[2,12\],\[1,13\],\[2,13\]\]/);
});

test("server targets private game state at the current player socket and blocks disconnected starts", () => {
  assert.match(server, /io\.sockets\.sockets\.get\(player\.socketId\)/);
  assert.match(server, /Sab players online hone chahiye/);
  assert.match(server, /existingPlayer = room\.players\.find/);
  assert.match(server, /room\.players\.length >= room\.maxPlayers/);
});

test("server closes an active room when a player leaves and rejects further actions", () => {
  assert.match(server, /emit\("room:closed"/);
  assert.match(server, /room\.status !== "playing"\) return ack/);
});

test("CSS includes responsive breakpoints, focus indicators and reduced-motion support", () => {
  assert.match(css, /@media\(max-width:1000px\)/);
  assert.match(css, /@media\(max-width:720px\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});


test("reconnecting members are checked before room-capacity rejection", () => {
  const existing = server.indexOf("const existingPlayer = room.players.find");
  const full = server.indexOf("room.players.length >= room.maxPlayers");
  assert.ok(existing >= 0 && full > existing, "a full room must still let an existing member resume");
});

test("stale tabs cannot remove or issue actions for a newer socket session", () => {
  assert.match(server, /player\?\.socketId && player\.socketId !== socket\.id/);
  assert.match(server, /activePlayer\.socketId !== socket\.id/);
  assert.match(server, /sender\.socketId !== socket\.id/);
});

test("room start can only happen once from the current connected host", () => {
  assert.match(server, /room\.status !== "waiting"/);
  assert.match(server, /hostPlayer\.socketId !== socket\.id/);
  assert.match(server, /hostPlayer\.connected === false/);
});

test("HTML entry point sets viewport and page title", () => {
  assert.match(html, /name="viewport"/);
  assert.match(html, /<title>The Gameverse<\/title>/);
});

test("UNO mode selection creates explicit Normal, Flip and No Mercy rooms", () => {
  assert.match(app, /Choose UNO mode/);
  assert.match(app, /createRoom\(id\)/);
  assert.match(app, /uno-no-mercy/);
  assert.match(app, /selectedModeTitle/);
});

test("UNO card faces use prominent deck symbols while keeping effects accessible outside the artwork", () => {
  assert.match(board, /function UnoCardFace/);
  for (const symbol of ["⊘", "⇄", "+2", "+4", "+6", "+10", "✂", "◎"]) assert.ok(board.includes(symbol), `missing card symbol: ${symbol}`);
  assert.match(board, /aria-label=\{titleText\}/);
  assert.doesNotMatch(board, /<span>\{title\}<\/span>/, "action names must not be printed in place of card artwork");
});

test("Ludo dice animation remounts from an authoritative roll counter, including repeated faces", () => {
  const engine = read("../shared/gameEngine.js");
  assert.match(engine, /rollCount: 0/);
  assert.match(engine, /state\.rollCount = \(state\.rollCount \|\| 0\) \+ 1/);
  assert.match(board, /key=\{game\.rollCount \?\? `/);
});

test("auth game cards have distinct game labels and hoverable card targets", () => {
  assert.match(app, /FEATURED Gameverse games|Featured Gameverse games/);
  assert.match(app, /CHOR\?/);
  assert.match(css, /\.auth-card-fan \.fan-card:hover/);
});

test("avatar model includes detailed facial features and hair variants", () => {
  assert.match(avatar3d, /Eye whites, irises, highlights and eyebrows/);
  assert.match(avatar3d, /mood === "victory"/);
  assert.match(avatar3d, /leftArmRef/);
  assert.match(avatar3d, /archetype === "cyber"/);
  assert.match(avatar3d, /archetype === "royal"/);
  assert.match(avatar3d, /style === "long"/);
  assert.match(avatar3d, /headAccessory === "headphones"/);
  assert.match(portrait, /portrait-\$\{useId/);
});


test("No Mercy shows live penalty count and blocks 7 until a swap target is selected", () => {
  const board = readFileSync(new URL("../src/components/GameBoard.jsx", import.meta.url), "utf8");
  assert.match(board, /needsSwapTarget/);
  assert.match(board, /Draw \$\{game\.drawPending\} cards/);
  assert.match(board, /stack an equal \/ higher penalty card/);
});


test("Ludo token animation remounts on every movement and Sola cards animate on arrival", () => {
  const board = readFileSync(new URL("../src/components/GameBoard.jsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  assert.match(board, /tokenAnimationKey/);
  assert.match(board, /key=\{`\$\{pi\}-\$\{ti\}-/);
  assert.match(css, /@keyframes solaCardDeal/);
});


test("No Mercy match has a distinct board treatment and explains an eliminated player state", () => {
  const board = readFileSync(new URL("../src/components/GameBoard.jsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  assert.match(board, /isEliminated/);
  assert.match(board, /MERCY RULE/);
  assert.match(css, /uno-board\.no-mercy-board/);
});

test("all four live games mount the shared 3D player arena with game-specific indicators", () => {
  const board = readFileSync(new URL("../src/components/GameBoard.jsx", import.meta.url), "utf8");
  const arena = readFileSync(new URL("../src/components/PlayerArena.jsx", import.meta.url), "utf8");
  for (const context of ["uno", "ludo", "raja", "sola"]) assert.match(board, new RegExp(`PlayerArena game=\\{game\\} me=\\{me\\} context="${context}"`));
  assert.match(arena, /Avatar3D avatar=\{player\.avatar\} compact/);
  assert.match(arena, /player\.isTurn/);
  assert.match(arena, /mood=\{player\.isFinished/);
  assert.match(arena, /player\.isWinner/);
  assert.match(arena, /CardBacks count=\{player\.count\}/);
  assert.match(arena, /TokenMarkers count=\{player\.count\}/);
});

test("avatar studio exposes distinct archetypes, outfits, hair, face equipment and auras", () => {
  const studio = readFileSync(new URL("../src/components/AvatarStudio.jsx", import.meta.url), "utf8");
  for (const value of ["cyber", "royal", "fantasy", "rogue", "armour", "longcoat", "racer", "robe", "mohawk", "afro", "visor", "horns", "cosmic"]) assert.ok(studio.includes(value), `Missing avatar option: ${value}`);
});

test("avatar model has archetype outfit silhouettes, facial color and aura effects", () => {
  const avatar = readFileSync(new URL("../src/components/Avatar3D.jsx", import.meta.url), "utf8");
  for (const value of ["armour", "longcoat", "racer", "robe", "visor", "horns", "halo", "aura !== \"none\"", "eyeColor"]) assert.ok(avatar.includes(value), `Missing 3D avatar feature: ${value}`);
});

test("server persists safe avatar archetype, outfit and effect fields and varies new-account defaults", () => {
  const server = readFileSync(new URL("../server/index.js", import.meta.url), "utf8");
  for (const value of ["archetype:", "outfit:", "aura:", "eyeColor:", "hairStyle:", "backGear:", "companion:", "const seed = [...username]"]) assert.ok(server.includes(value), `Missing avatar persistence/default: ${value}`);
});

test("game library uses custom cover art instead of placeholder-only game glyphs", () => {
  const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  const art = readFileSync(new URL("../src/components/GameCardVisual.jsx", import.meta.url), "utf8");
  assert.match(app, /GameCardVisual kind=\{g\.id\}/);
  for (const value of ["cover-uno", "cover-ludo", "cover-raja", "cover-sola"]) assert.ok(art.includes(value));
});

test("avatar profile edits refresh cached socket identity and already-open room/game snapshots", () => {
  assert.match(server, /async function refreshSocketUser\(socket\)/);
  assert.match(server, /avatar_json: avatarJson/);
  assert.match(server, /player\.avatar = allowed/);
  assert.match(server, /room\.gameState\.playerInfo\[req\.user\.id\]\.avatar = allowed/);
  assert.match(server, /const currentUser = await refreshSocketUser\(socket\)/);
  assert.match(server, /publicUser\(currentUser\)/);
});

test("avatar room resume refreshes saved username and avatar instead of using a stale socket snapshot", () => {
  assert.match(server, /p\.username = currentUser\.username/);
  assert.match(server, /p\.avatar = JSON\.parse\(currentUser\.avatar_json \|\| "\{\}"\)/);
});

test("masculine and feminine bases have different body, face and short-hair silhouettes", () => {
  assert.match(avatar3d, /const torsoScale = isBoy \?/);
  assert.match(avatar3d, /const hipScale = isBoy \?/);
  assert.match(avatar3d, /const headScale = isBoy \?/);
  assert.match(avatar3d, /masculineShortCut/);
  assert.match(avatar3d, /style === "ponytail"/);
  assert.match(avatar3d, /style === "braids"/);
});

test("avatar auras surround the full silhouette and use distinct 3D particle geometry", () => {
  assert.match(avatar3d, /position=\{\[0, 1\.22, -0\.48\]\}/);
  assert.match(avatar3d, /<octahedronGeometry/);
  assert.match(avatar3d, /<tetrahedronGeometry/);
  assert.match(avatar3d, /<dodecahedronGeometry/);
  assert.match(avatar3d, /auraRef\.current\.rotation/);
  assert.match(avatar3d, /backGear === "wings"/);
  assert.match(avatar3d, /companion === "shoulder-drone"/);
});

test("crown and headphones use separate fitted head anchors", () => {
  assert.match(avatar3d, /headAccessory === "crown" && <group position=\{\[0, 0\.64, -0\.035\]\}/);
  assert.match(avatar3d, /headAccessory === "headphones" && <group position=\{\[0, 0\.17, -0\.09\]\}/);
});

test("Avatar Studio exposes expanded hair and aura customization and persists those safe fields", () => {
  assert.match(studio, /"fade", "swept", "braids", "ponytail"/);
  assert.match(studio, /"void", "storm", "solar"/);
  assert.match(server, /"fade", "swept", "braids", "ponytail"/);
  assert.match(server, /"none", "neon", "ember", "frost", "cosmic", "void", "storm", "solar"/);
});

test("home has a persistent bottom-right light/dark interface switch", () => {
  assert.match(app, /gameverse-ui-theme/);
  assert.match(app, /home-theme-switch/);
  assert.match(app, /onToggleTheme/);
  assert.match(css, /\.home-theme-switch\{position:fixed;right:24px;bottom:22px/);
  assert.match(css, /data-ui-theme="dark"/);
  assert.match(css, /data-ui-theme="light"/);
});

test("mobile UI switch respects safe-area and motion preferences", () => {
  assert.match(css, /bottom:calc\(14px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /\.home-theme-switch\{transition:none\}/);
});


test("profile allowlist accepts every visible aura and the expanded 3D accessories", () => {
  assert.match(server, /"none", "neon", "ember", "frost", "cosmic", "void", "storm", "solar"/);
  assert.match(server, /"antlers", "halo", "crown", "headphones"/);
  assert.match(server, /backGear: \["none", "wings"\]/);
  assert.match(server, /companion: \["none", "shoulder-drone"\]/);
});

test("match seats prefer current server avatar snapshots so profile changes appear in-room", () => {
  const arena = readFileSync(new URL("../src/components/PlayerArena.jsx", import.meta.url), "utf8");
  assert.match(arena, /avatar: info\.avatar \|\| \(isMe \? me\.avatar : \{\}\)/);
});

test("DM send response and live socket delivery are deduplicated by message ID", () => {
  assert.match(app, /m\.some\(x=>x\.id===d\.message\.id\)\?m:\[\.\.\.m,d\.message\]/);
  assert.match(app, /list\.some\(x=>x\.id===m\.id\)\?list:\[\.\.\.list,m\]/);
});

test("Avatar Studio offers actual silhouette gear instead of only head accessories", () => {
  for (const value of ["wings", "antlers", "shoulder-drone"]) assert.ok(studio.includes(value));
  assert.match(avatar3d, /backGear === "wings"/);
  assert.match(avatar3d, /headAccessory === "antlers"/);
  assert.match(avatar3d, /companion === "shoulder-drone"/);
});


test("LAN development allows localhost and configured phone origins while keeping Vite on one stable port", () => {
  assert.match(server, /configuredOrigins = \(process\.env\.CLIENT_ORIGIN/);
  assert.match(server, /CLIENT_ORIGINS\.has\(origin\)/);
  assert.match(server, /http:\/\/localhost:5173/);
  const vite = readFileSync(new URL("../vite.config.js", import.meta.url), "utf8");
  assert.match(vite, /strictPort: true/);
});

test("production requires a non-default session secret", () => {
  assert.match(server, /NODE_ENV === "production" && !process\.env\.SESSION_SECRET/);
});


test("room creation uses authenticated HTTP to avoid the initial mobile socket race, then lobby resumes Socket.IO", () => {
  assert.match(app, /api\("\/api\/rooms", \{ method: "POST"/);
  assert.match(server, /app\.post\("\/api\/rooms", requireAuth/);
  assert.match(roomFactory, /socketId, ready: true, connected: Boolean\(socketId\)/);
  assert.match(app, /await waitForSocketConnection\(socket,15000\)/);
  assert.match(app, /Retry connection/);
  assert.match(app, /socketStatus/);
  assert.match(app, /connect_error/);
  assert.match(app, /api\("\/api\/socket-ticket"\)/);
  assert.match(app, /auth:\(callback\)=>/);
  assert.match(server, /app\.get\("\/api\/socket-ticket", requireAuth/);
  assert.match(server, /verifyToken\(socket\.handshake\.auth\?\.ticket\)/);
  assert.match(readFileSync(new URL("../src/socketConnection.js", import.meta.url), "utf8"), /timeoutMs = 12000/);
});

test("mobile LAN origins are allowed in development without weakening production origin checks", () => {
  const policy = readFileSync(new URL("../server/originPolicy.js", import.meta.url), "utf8");
  assert.match(policy, /function isPrivateLanHost\(hostname\)/);
  assert.match(policy, /function isAllowedDevelopmentOrigin\(origin, nodeEnv/);
  assert.match(policy, /nodeEnv === "production"/);
  assert.match(server, /isAllowedDevelopmentOrigin\(origin, process\.env\.NODE_ENV\)/);
  assert.match(server, /server\.listen\(PORT, "0\.0\.0\.0"/);
});

test("LAN Vite API and Socket.IO proxy uses explicit IPv4 loopback backend", () => {
  const vite = readFileSync(new URL("../vite.config.js", import.meta.url), "utf8");
  assert.match(vite, /"\/api": "http:\/\/127\.0\.0\.1:4000"/);
  assert.match(vite, /target: "http:\/\/127\.0\.0\.1:4000", ws: true/);
  assert.match(vite, /strictPort: true/);
});

test("mobile layouts handle compact phones, horizontal card hands, lobby and studio stacks", () => {
  assert.match(css, /@media\(max-width:720px\)[\s\S]*?\.lobby-layout\{display:grid;grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css, /\.uno-hand\{max-width:100%;overflow-x:auto/);
  assert.match(css, /@media\(max-width:390px\)/);
  assert.match(css, /html,body,#root\{width:100%;max-width:100%;min-width:320px;overflow-x:clip\}/);
});

test("head accessories have redesigned, separate crown and headphone geometry anchors", () => {
  assert.match(avatar3d, /headAccessory === "crown" && <group position=\{\[0, 0\.64, -0\.035\]\}/);
  assert.match(avatar3d, /headAccessory === "headphones" && <group position=\{\[0, 0\.17, -0\.09\]\}/);
  assert.match(avatar3d, /Headband clears the top hair silhouette/);
  assert.match(avatar3d, /Pronounced base proportions: these are separate silhouettes/);
});

test("authenticated room creation is available through the proxied API and includes a host to resume", () => {
  assert.match(server, /app\.post\("\/api\/rooms", requireAuth/);
  assert.match(roomFactory, /function validateRoomRequest\(gameId, playerSlots\)/);
  assert.match(roomFactory, /function createWaitingRoom\(/);
  assert.match(roomFactory, /socketId, ready: true, connected: Boolean\(socketId\)/);
  assert.match(server, /app\.get\("\/api\/health"/);
  assert.match(app, /api\("\/api\/rooms", \{ method: "POST"/);
});

test("socket auth uses a short-lived ticket and refreshes it on reconnect", () => {
  assert.match(server, /signToken\(req\.user, 90\)/);
  assert.match(server, /verifyToken\(socket\.handshake\.auth\?\.ticket\)/);
  assert.match(app, /auth:\(callback\)=>/);
  assert.match(app, /api\("\/api\/socket-ticket"\)/);
});

test("narrow phone login fan no longer uses desktop absolute card offsets", () => {
  assert.match(css, /\.auth-card-fan \.fan-green\{left:68%;top:2px\}/);
  assert.match(css, /input,\.join-form input,\.chat-form input,\.friend-search input,\.dm-form input\{font-size:16px/);
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /viewport-fit=cover/);
});


test("mobile HTTP development does not accidentally set Secure cookies from a stale deployment env value", () => {
  assert.match(server, /COOKIE_SECURE = process\.env\.NODE_ENV === "production"/);
});

test("room creation reports network, phone-session and proxy errors in plain language", () => {
  assert.match(app, /Gameverse server tak request nahi pahunchi/);
  assert.match(app, /Is phone\/browser par Gameverse login nahi mila/);
  assert.match(app, /unexpected response diya \(HTTP/);
});

test("HTTP room creation validates and constructs the new room before detaching the previous one", () => {
  assert.match(server, /app\.post\("\/api\/rooms", requireAuth, \(req, res\) => \{\s*try \{/);
  assert.match(server, /createWaitingRoom\(\{ code, gameId, playerSlots: validation\.slots, user, socketId: null \}\)/);
  assert.match(server, /detachUserFromRooms\(req\.user\.id\);\s*rooms\.set\(code, room\)/);
  assert.match(server, /\[Gameverse room create\]/);
});
