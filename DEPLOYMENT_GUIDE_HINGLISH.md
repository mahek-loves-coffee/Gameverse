# The Gameverse — GitHub + Vercel + Render + Supabase (₹0 setup target)

## Hosting layout

- **Vercel Free:** React/Vite frontend.
- **Render Free:** Express API + Socket.IO multiplayer backend.
- **Supabase Free:** PostgreSQL database.
- Vercel does not host this project's persistent Socket.IO server. The frontend connects to Render using `VITE_API_URL`.

> ₹0 target: use Free plans only. Do not add a paid instance, custom domain, add-on, or paid Supabase compute. Free tiers have limits: Render may sleep after inactivity, Supabase Free may pause after a period of inactivity, and in-memory rooms/matches are lost if the Render service restarts. This is suitable for testing and small-scale trials, not always-on production. Provider policies can change; verify the selected plan before confirming.

## Before deployment

This repository already exists at `mahek-loves-coffee/Gameverse`. **Do not create another repository or upload a ZIP.** Connect the existing repository to both Vercel and Render.

Never commit `.env`, `data/`, `node_modules/`, passwords, database connection strings, or secret keys.

## 1) Deploy the frontend on Vercel first

1. In Vercel, choose **Add New → Project** and import `mahek-loves-coffee/Gameverse`.
2. Framework: **Vite**. Root directory: repository root.
3. Build command: `npm run build`. Output directory: `dist`. Install command: `npm install`.
4. Deploy once. Copy the exact production origin, e.g. `https://your-project.vercel.app`. Do not include a trailing slash.
5. The first deployment may show an API connection error until Render is configured. That is expected at this stage.

## 2) Deploy the backend on Render using the Blueprint

1. In Render, choose **New → Blueprint** and connect the same GitHub repository. Render should detect `render.yaml`.
2. Confirm the service plan is **Free**. Do not select a paid instance or disk.
3. Add `DATABASE_URL` in Render's secret environment settings using the Supabase PostgreSQL **Session Pooler** connection string. Never put this value in GitHub or chat.
4. Add `CLIENT_ORIGIN` = the exact Vercel production origin copied in Step 1, with no trailing slash.
5. Confirm Render generated `SESSION_SECRET` and that `NODE_ENV=production`.
6. Deploy and copy the Render service URL, e.g. `https://your-service.onrender.com`.
7. Open `https://YOUR-RENDER-URL.onrender.com/api/health`. Expected JSON includes `ok: true` and `database: postgres`.

## 3) Connect Vercel to the Render backend

1. Open the Vercel project → **Settings → Environment Variables**.
2. Add `VITE_API_URL` = the Render service URL, with no trailing slash.
3. Apply it to **Production** (and Preview only if you have configured a matching Render origin).
4. Redeploy the Vercel project so the Vite build receives the variable.

## 4) Verify the launch

- Open the Vercel production URL and create an account.
- Open a second browser/device and create a separate account.
- Test login/logout, create room, join room, ready/start, one UNO turn, one Ludo turn, friends, and direct messages.
- Check Render's `/api/health` endpoint. It must return `ok: true` and `database: postgres`.
- If login works but multiplayer does not, confirm Render's `CLIENT_ORIGIN` exactly matches the Vercel origin and Vercel's `VITE_API_URL` exactly matches the Render origin.
- Render Free can sleep; the first request after inactivity may take a while. Active rooms are held in process memory and are not durable across restarts.

## 5) Database and existing local data

- The backend creates the PostgreSQL schema at startup.
- The Supabase project URL and project reference are already recorded in the project's private setup notes. Use the existing project; do not create a replacement unless explicitly requested.
- Keep the existing Supabase database password unchanged. Do not rotate it as part of deployment.
- If old local SQLite accounts/data must be preserved, run `npm run migrate:sqlite` from the PC with a private `DATABASE_URL` environment variable. Do not commit that value. If old test accounts are not needed, create new accounts on the hosted app.

## Local development

Run `npm install`, then `npm run check`, `npm run build`, and `npm run dev`. Without `DATABASE_URL`, local SQLite is used and Vite proxies API/Socket.IO to `127.0.0.1:4000`.

## Known limitations before public launch

- Room and live-match state currently lives in an in-memory `Map`. A Render restart or deploy ends active rooms. Durable/shared room state is required before multi-instance scaling.
- The current CI validates syntax, automated tests, and the production frontend build. It does not replace two-account live multiplayer testing, browser/WebGL visual review, or a production security review.
- The latest CI run reported 9 dependency vulnerabilities (2 moderate, 7 high) and a large JavaScript chunk. Review and remediate these before treating the app as production-ready.
