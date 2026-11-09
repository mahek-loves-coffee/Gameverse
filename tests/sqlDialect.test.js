import test from "node:test";
import assert from "node:assert/strict";
import { toPostgres } from "../server/sqlDialect.js";

test("PostgreSQL adapter converts SQLite positional placeholders", () => {
  assert.equal(toPostgres("SELECT * FROM users WHERE id = ? AND username = ?"), "SELECT * FROM users WHERE id = $1 AND username = $2");
});

test("PostgreSQL adapter converts case-insensitive username lookup and search", () => {
  assert.equal(toPostgres("SELECT * FROM users WHERE username = ? COLLATE NOCASE"), "SELECT * FROM users WHERE LOWER(username) = LOWER($1)");
  assert.equal(toPostgres("SELECT id FROM users WHERE username LIKE ? COLLATE NOCASE AND id != ? LIMIT 8"), "SELECT id FROM users WHERE username ILIKE $1 AND id != $2 LIMIT 8");
});

test("PostgreSQL adapter converts SQLite insert-ignore and case-insensitive ordering", () => {
  assert.equal(toPostgres("INSERT OR IGNORE INTO friendships (user_low,user_high) VALUES (?,?)"), "INSERT INTO friendships (user_low,user_high) VALUES ($1,$2) ON CONFLICT DO NOTHING");
  assert.equal(toPostgres("SELECT u.username FROM users u ORDER BY u.username COLLATE NOCASE"), "SELECT u.username FROM users u ORDER BY LOWER(u.username)");
});
