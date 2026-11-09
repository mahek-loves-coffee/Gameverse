import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import pg from "pg";

const { Pool } = pg;
const sqlitePath = path.resolve(process.env.SQLITE_FILE || "data/gameverse.sqlite");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL set karo (Supabase PostgreSQL connection string). ");
if (!fs.existsSync(sqlitePath)) throw new Error(`SQLite file nahi mili: ${sqlitePath}`);

const source = new Database(sqlitePath, { readonly: true, fileMustExist: true });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 2 });
const schema = fs.readFileSync(new URL("../server/schema.postgres.sql", import.meta.url), "utf8");

try {
  await pool.query(schema);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const tables = [
      ["users", ["id", "username", "password_hash", "avatar_json", "created_at"]],
      ["game_results", ["id", "user_id", "game_id", "result", "room_code", "created_at"]],
      ["friend_requests", ["id", "sender_id", "receiver_id", "status", "created_at"]],
      ["friendships", ["user_low", "user_high", "created_at"]],
      ["direct_messages", ["id", "sender_id", "receiver_id", "body", "created_at"]]
    ];
    let total = 0;
    for (const [table, columns] of tables) {
      const rows = source.prepare(`SELECT ${columns.join(", ")} FROM ${table}`).all();
      for (const row of rows) {
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
        const values = columns.map(column => row[column]);
        await client.query(`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`, values);
      }
      total += rows.length;
      console.log(`${table}: ${rows.length} rows checked`);
    }
    await client.query("COMMIT");
    console.log(`Migration complete. ${total} source rows checked; existing destination rows were preserved.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
} finally {
  source.close();
  await pool.end();
}
