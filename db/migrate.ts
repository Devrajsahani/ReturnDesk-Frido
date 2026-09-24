import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";
import { getDatabaseUrl } from "../src/lib/env";

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

async function migrate() {
  const client = new Client({ connectionString: getDatabaseUrl() });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await client.query<{ filename: string }>(
      "SELECT filename FROM schema_migrations",
    );
    const applied = new Set(rows.map((row) => row.filename));
    const pending = (await readdir(MIGRATIONS_DIR))
      .filter((file) => file.endsWith(".sql") && !applied.has(file))
      .sort();

    if (pending.length === 0) {
      console.log("Database is up to date.");
      return;
    }

    for (const file of pending) {
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      // Each file runs in its own transaction so a failure leaves no half-applied schema.
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`Applied ${file}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
      }
    }
  } finally {
    await client.end();
  }
}

migrate().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
