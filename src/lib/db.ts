import "server-only";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { getDatabaseUrl } from "./env";

// Hot reload in development re-evaluates this module; keeping the pool on globalThis
// stops every reload from opening a fresh set of connections.
const globalForDb = globalThis as unknown as { pgPool?: Pool };

function getPool(): Pool {
  if (!globalForDb.pgPool) {
    globalForDb.pgPool = new Pool({ connectionString: getDatabaseUrl(), max: 5 });
  }
  return globalForDb.pgPool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

export async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
