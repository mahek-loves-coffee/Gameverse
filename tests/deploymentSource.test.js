import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const server = fs.readFileSync(new URL("../server/index.js", import.meta.url), "utf8");
const schema = fs.readFileSync(new URL("../server/schema.postgres.sql", import.meta.url), "utf8");
const vercel = JSON.parse(fs.readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));

test("Vercel frontend can target the separately hosted API and Socket.IO server", () => {
  assert.match(app, /VITE_API_URL/);
  assert.match(app, /io\(SOCKET_BASE/);
  assert.match(app, /Authorization: `Bearer \$\{savedToken\}`/);
  assert.equal(vercel.outputDirectory, "dist");
});

test("backend supports bearer sessions and credentialed cross-origin frontend requests", () => {
  assert.match(server, /req\.headers\.authorization/);
  assert.match(server, /Access-Control-Allow-Credentials/);
  assert.match(server, /sameSite: COOKIE_SAME_SITE/);
});

test("PostgreSQL tables keep RLS enabled and client roles revoked", () => {
  for (const table of ["users", "game_results", "friend_requests", "friendships", "direct_messages"]) {
    assert.match(schema, new RegExp(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`, "i"));
  }
  assert.match(schema, /REVOKE ALL ON TABLE[\s\S]*FROM anon, authenticated/i);
});
