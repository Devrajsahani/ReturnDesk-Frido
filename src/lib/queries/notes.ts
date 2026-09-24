import "server-only";
import { type PoolClient } from "pg";
import { query } from "../db";

export interface NoteRow {
  id: number | string;
  request_id: number | string;
  author: string;
  body: string;
  created_at: Date;
}

export interface NoteSummary {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export async function findNotesByRequestId(
  requestId: number | string,
  client?: PoolClient
): Promise<NoteSummary[]> {
  const sql = `
    SELECT id, author, body, created_at
    FROM request_notes
    WHERE request_id = $1
    ORDER BY created_at ASC, id ASC
  `;
  const rows = client
    ? (await client.query<NoteRow>(sql, [requestId])).rows
    : await query<NoteRow>(sql, [requestId]);

  return rows.map((r) => ({
    id: String(r.id),
    author: r.author,
    body: r.body,
    createdAt: r.created_at.toISOString(),
  }));
}
