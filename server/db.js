import fs from "node:fs";
import path from "node:path";
import { toPostgres } from "./sqlDialect.js";

const isPostgres = Boolean(process.env.DATABASE_URL);
let sqlite;
let pool;

if (isPostgres) {
  const pgModule = await import("pg");
  const Pool = pgModule.Pool || pgModule.default.Pool;
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
    max: Number(process.env.DB_POOL_MAX || 5),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000
  });
  const schema = fs.readFileSync(new URL("./schema.postgres.sql", import.meta.url), "utf8");
  await pool.query(schema);
} else {
  const { default: Database } = await import("better-sqlite3");
  const dataDir = path.resolve("data");
  fs.mkdirSync(dataDir, { recursive: true });
  sqlite = new Database(path.join(dataDir, "gameverse.sqlite"));
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(fs.readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
}

async function query(sql, params = [], client = null) {
  if (isPostgres) return (client || pool).query(toPostgres(sql), params);
  return { rows: sqlite.prepare(sql).all(...params), rowCount: 0 };
}

const db = {
  async get(sql, ...params) {
    if (isPostgres) return (await query(sql, params)).rows[0] || null;
    return sqlite.prepare(sql).get(...params) || null;
  },
  async all(sql, ...params) {
    if (isPostgres) return (await query(sql, params)).rows;
    return sqlite.prepare(sql).all(...params);
  },
  async run(sql, ...params) {
    if (isPostgres) {
      const result = await query(sql, params);
      return { changes: result.rowCount, rows: result.rows };
    }
    const result = sqlite.prepare(sql).run(...params);
    return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
  },
  async transaction(callback) {
    if (isPostgres) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const tx = {
          get: async (sql, ...params) => (await client.query(toPostgres(sql), params)).rows[0] || null,
          all: async (sql, ...params) => (await client.query(toPostgres(sql), params)).rows,
          run: async (sql, ...params) => { const r = await client.query(toPostgres(sql), params); return { changes: r.rowCount, rows: r.rows }; }
        };
        const value = await callback(tx);
        await client.query("COMMIT");
        return value;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally { client.release(); }
    }
    sqlite.exec("BEGIN");
    try {
      const tx = {
        get: async (sql, ...params) => sqlite.prepare(sql).get(...params) || null,
        all: async (sql, ...params) => sqlite.prepare(sql).all(...params),
        run: async (sql, ...params) => { const r = sqlite.prepare(sql).run(...params); return { changes: r.changes, lastInsertRowid: r.lastInsertRowid }; }
      };
      const value = await callback(tx);
      sqlite.exec("COMMIT");
      return value;
    } catch (error) { sqlite.exec("ROLLBACK"); throw error; }
  },
  async close() { if (pool) await pool.end(); else sqlite?.close(); },
  kind: isPostgres ? "postgres" : "sqlite"
};

export default db;
