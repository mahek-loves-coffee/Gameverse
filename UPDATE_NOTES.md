# The Gameverse — mobile room creation, avatar and responsive update

This is a source-only update to the existing Windows project. It does not replace the local database or environment file. Run `npm install` after copying the update so the Windows installation remains in sync.

## Apply the update

1. Stop the running development servers with `Ctrl+C` in the VS Code terminal.
2. Extract this ZIP and open its `The Gameverse` folder.
3. Copy the folder contents over the existing `C:\Users\ADMIN\Downloads\The Gameverse` folder and choose **Replace**.
4. Do **not** delete or replace the existing `node_modules`, `package-lock.json`, `.env`, or `data` folder/database. No dependency changes were made.
5. Open a fresh VS Code PowerShell terminal in the project folder. Run:

   ```powershell
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
   ```

6. Run each command separately, waiting for it to finish before the next:

   ```powershell
   npm install
   npm run check
   npm run build
   npm run dev
   ```

7. Keep the terminal open. For PC use `http://localhost:5173`. For same-Wi-Fi phone testing use the Vite `Network` URL shown by the terminal; the backend must also start successfully on port 4000.

`npm install` is included deliberately after each ZIP replacement. It does not require deleting the existing `node_modules` or lockfile.

## What's fixed

### Avatar identity in rooms and matches
- Server-side profile save now accepts all eight visible aura values and persists the separate head accessory, back gear and shoulder companion slots.
- Connected sockets, existing room records, and current game player-info snapshots refresh immediately after saving the avatar.
- Room create/join/resume reads the latest account profile from SQLite rather than relying on a stale socket snapshot.
- Match seats prefer the authoritative server game snapshot for the avatar, with the local account avatar as fallback.

### More differentiated characters and equipment
- Masculine/feminine base proportions, face/jaw shapes, eyes/brows and hairstyle branches are more distinct.
- Head accessories, energy wings and shoulder drone are independent customisation slots; the crown and headphones use separate anchors and geometry.
- Aura visuals use 3D rings and particles around the character silhouette, with different geometry for frost, ember, void, storm, solar and other effects.
- Avatar Studio includes eight archetypes, five outfit silhouettes, twelve hair styles, face/eye/skin/hair controls, eight aura choices including none, and equipment slots.

### Other bugs found in the wider source audit
- Ludo rejects invalid token indexes.
- Private chat deduplicates socket/API deliveries by message ID.
- Vite no longer silently changes to another port when 5173 is occupied; LAN CORS accepts localhost plus configured client origins.
- Production server startup requires a non-default session secret.


### Mobile room creation and live connection
- Home now creates rooms through authenticated `POST /api/rooms`, so a user tap is not lost while the first Socket.IO connection is still starting. The lobby then attaches the host socket by resuming that room.
- Room creation now validates and builds the requested room before detaching the player from any older room, and returns JSON errors for unexpected server failures.
- The client shows a specific message for a phone that is not logged in, backend/network failures, and unexpected proxy responses.
- In local development, cookies remain non-Secure even if an old `.env` contains `COOKIE_SECURE=true`; production still uses Secure cookies when configured.
- Socket.IO uses a fresh short-lived auth ticket fetched through the same-origin API on every connect/reconnect; the normal HTTP-only session cookie remains a fallback.
- Lobby and match screens wait for a successful live connection before emitting resume/state requests and show a Retry connection control if that fails.
- `/api/health` can be opened on the phone through the same Vite network address with `/api/health` appended. A JSON `ok: true` response means the phone reached the backend proxy.
- Development LAN CORS permits private local hosts on port 5173; Vite proxies `/api` and `/socket.io` to `127.0.0.1:4000`. Port 5173 is strict.

### Mobile CSS and avatar refinements
- Auth card fan uses mobile-relative offsets instead of desktop pixel offsets, avoiding clipped cards on narrow phones.
- Mobile inputs use 16px text to avoid iOS automatic zoom; touch targets, safe-area padding and connection/error layouts are improved.
- Crown and headphone anchors now sit above/around the hair silhouette, with ear cups outside the temples. Body base differences and outfit identity markers are stronger.

### Existing home UI switch
The bottom-right Light/Dark interface switch was already in the Home screen. It remains persistent and mobile safe-area aware; it is not a new feature in this update.

## Verification boundaries

- `node --check` for server/DB/game engine: pass.
- `node --test tests/*.test.js`: 98 automated tests pass in the working source copy.
- JSX syntax parse with `tsc --noEmit`: passed for the app and listed components.
- A fresh Vite production build and full browser/WebGL inspection were not run in this workspace because its project `node_modules` are not installed. Run `npm run build` on the existing Windows installation. The CSS source was patched, but a full mobile browser visual inspection remains pending.
- A live two-account multiplayer test and phone touch/3D performance test still require browser sessions on the local network.
- Each device has its own browser session. Sign in separately on the phone; a login cookie from the PC is not shared with the phone. The `Not secure` label is expected on the local HTTP LAN address and is separate from room-creation errors.

See `AUDIT_REPORT.md` for exact status and known limits.

## GitHub + Vercel deployment update (2026-11-07)
- Added Vercel static build configuration (`vercel.json`).
- Frontend now reads `VITE_API_URL` for the Render API and Socket.IO endpoint.
- Added bearer-session support for cross-origin Vercel-to-Render requests, retaining HTTP-only cookie fallback.
- Added credentialed CORS handling and production `SameSite=None; Secure` cookie settings.
- PostgreSQL schema now enables RLS and revokes direct anon/authenticated table access; backend connects directly using the private database URL.
- Added deployment source tests. 104 automated tests pass in this packaging environment.
- Browser-based production deployment and visual/live multiplayer smoke tests are not performed by this archive build.
