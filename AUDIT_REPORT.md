# The Gameverse — mobile room creation, socket auth, avatar and responsive audit

Audit date: 2026-11-07

## Latest mobile / room-creation update

- Room creation now starts through authenticated `POST /api/rooms` rather than depending on Socket.IO being connected at the exact moment the player taps Create. The lobby then resumes the newly-created room over Socket.IO.
- The room endpoint now validates/builds the new room before removing a player's old room, and catches unexpected errors into a readable JSON response instead of allowing a generic HTML error page.
- Client API errors now distinguish a phone session that is not logged in (HTTP 401), a network/proxy failure, and a non-JSON response. This helps diagnose why a room was not created.
- Development HTTP cookies stay non-Secure even if a stale `COOKIE_SECURE=true` is present in a local `.env`; Secure cookies are only applied for production HTTPS deployments.
- The lobby and game screen wait for the socket connection before requesting room/game state and expose a Retry connection action after a timeout.
- Socket.IO now obtains a short-lived authenticated ticket from `/api/socket-ticket` for each connection/reconnection, instead of depending only on a mobile browser forwarding the HTTP-only session cookie through the Vite proxy. Cookie authentication remains as a fallback.
- A simple `/api/health` endpoint is available through the Vite `/api` proxy for LAN diagnostics.
- The LAN development CORS policy accepts private IPv4/local hostnames on Vite port 5173 only in development. The Vite proxy targets explicit IPv4 loopback `127.0.0.1:4000`; Vite is strict on port 5173.
- Mobile CSS adds `viewport-fit=cover`, compacts the auth card fan so it no longer keeps desktop absolute offsets on phones, raises touch target sizes, prevents iOS input zoom, and improves retry/error screens and safe-area spacing.
- Crown and headphone anchors are moved above the hairline; headphone cups are moved outside the temples. Character base silhouette and torso identity markers are more pronounced.


## User-reported issues addressed

### Avatar customisation not appearing in rooms/matches
- Profile updates are written to SQLite and now update every connected socket's cached account snapshot.
- Existing room player records and active `gameState.playerInfo[userId].avatar` snapshots are refreshed immediately after profile save, then room/game updates are emitted.
- Room create/join/resume refreshes the authenticated socket's user record from SQLite before using its avatar/username.
- `PlayerArena` prefers the avatar shipped with the authoritative game snapshot, with the local account avatar only as a fallback.
- Expanded server validation now accepts all visible hair styles, all eight aura values, and separate `backGear` / `companion` fields. This fixes the mismatch where the Studio offered `void`, `storm`, and `solar` but the server silently replaced them with `none`.

### Character differentiation and equipment
- Masculine and feminine bases now use different torso/hip/arm/head proportions, face/jaw proportions, eye/brow shapes, and hair silhouette branches.
- Head equipment, back gear and shoulder companion are separate saved slots. Wings no longer share the same `accessory` slot as a crown/headphones; the shoulder drone is separate too.
- Crown and headphones use different fitted anchors and geometry, rather than sharing a similar head-mounted shape.
- Aura visuals use full-height energy rings, particles and aura-specific crystal/ember/void/solar geometry; they are 3D scene objects, not CSS rings.
- Added two more character presets (`celestial`, `rift`) with wing/drone/aura combinations.
- These are still procedural Three.js character meshes, not externally rigged, professionally sculpted character assets. The visual result needs final browser review.

### Home interface switch
- Confirmed the bottom-right light/dark UI switch is already present on the Home screen, persists its setting in local storage, and respects mobile safe-area/reduced-motion styles. It was not newly added in this update.

## Additional issues found and fixed during the audit
- Ludo now rejects a token index outside `0..3` rather than allowing invalid state to enter token movement logic.
- Direct messages now deduplicate the API response and live socket event by message ID; switching friends clears the prior conversation while the next history is loaded.
- Vite now uses `strictPort: true`, avoiding a silent move from 5173 to 5174 while the backend still trusts a different origin.
- Socket.IO CORS accepts localhost/127.0.0.1 and explicitly configured client origins, including a LAN origin passed via `CLIENT_ORIGIN`.
- Production startup refuses to run with the development/default session secret.

## Automated and static checks actually run

| Check | Result |
|---|---|
| `node --check server/index.js`, `server/db.js`, `server/roomFactory.js`, `shared/gameEngine.js` | PASS |
| `npm run check` | PASS — server/DB/game-engine syntax + 98 tests |
| `npm test` | PASS — 98 tests, 0 failures |
| JSX parse (`tsc --allowJs --checkJs false --jsx react-jsx --noEmit --noResolve`) | PASS — App and listed component JSX files parsed |
| Targeted avatar persistence / room snapshot source tests | PASS |
| Masculine/feminine silhouette and distinct accessory-anchor source tests | PASS |
| Ludo invalid token index regression test | PASS |
| DM duplicate-delivery regression source test | PASS |
| LAN origin + Vite strict-port source test | PASS |
| Fresh Vite production build for this update | NOT RUN — this workspace has no installed project `node_modules`/Vite executable |
| Full React/WebGL browser visual inspection | NOT VERIFIED — no browser app runtime was launched in this workspace |
| Live two-account Socket.IO multiplayer | NOT VERIFIED — requires two authenticated browser sessions against the running server |

The automated suite includes game-engine tests and source-level regression tests. It does not prove every visual detail renders correctly on every GPU/browser or that live multiplayer works end to end.

## Known limits and next verification

- The avatar system is procedural geometry. It is more differentiated than the prior base, but it is not yet equivalent to a hand-sculpted, rigged character roster with authored animation clips.
- Aura and equipment geometry, composition, facial details and clipping must be visually checked in the Windows browser. Source parsing cannot detect every 3D overlap.
- The full browser/WebGL render, GPU performance, phone touch controls, and two-account multiplayer have not been validated in this environment. The mobile CSS was source-reviewed but could not be loaded in the isolated browser because local browser navigation is blocked in this workspace.
- On the Windows PC, run `npm run check`, `npm run build`, and `npm run dev` from the project folder. Then edit an avatar, save it, create a fresh room, and verify the same look appears in the lobby and match for both accounts.
- LAN access requires the Vite Network URL, a running backend on port 4000, same Wi-Fi, and Windows Firewall Private-network access. Development CORS now allows private-LAN hostnames on port 5173, so a manual `CLIENT_ORIGIN` variable is not required for the stated IP. If port 5173 is occupied, strictPort now fails visibly instead of silently selecting another port.
- Browser cookies are separate per device/browser. A phone must sign into Gameverse separately; a PC login is not shared automatically. Open `http://<PC-LAN-IP>:5173/api/health` on the phone; JSON with `ok: true` proves the frontend proxy can reach the backend. `Not secure` is expected for this local `http://` testing address and is not itself a room-creation failure.
- Live rooms remain in the server's in-memory `Map`; restarting the server closes active rooms. Multi-instance production deployment would require shared room state.
- Before a public launch, configure a strong `SESSION_SECRET`, HTTPS, secure cookies, a restrictive `CLIENT_ORIGIN`, logging/monitoring, abuse controls, and load/integration tests. This archive is not production certification or a security audit.
