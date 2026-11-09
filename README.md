# The Gameverse

Multiplayer party games with account profiles, avatar customization, friends, rooms, chat, UNO modes, Ludo, Chor Ko Dhundo, and Sola Parchi.

## Local development

- Node.js 22+
- `npm install`
- `npm run check`
- `npm run build`
- `npm run dev`

Local development uses SQLite unless `DATABASE_URL` is set.

## Public deployment

Follow [DEPLOYMENT_GUIDE_HINGLISH.md](./DEPLOYMENT_GUIDE_HINGLISH.md). Vercel hosts the frontend; Render hosts the persistent Express + Socket.IO backend; Supabase Free provides PostgreSQL. Vercel alone cannot host this project's multiplayer Socket.IO backend.
