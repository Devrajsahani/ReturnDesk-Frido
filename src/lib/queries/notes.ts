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
  client?: PoolClient,
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

export async function insertNote(
  requestId: number | string,
  author: string,
  body: string,
  client?: PoolClient,
): Promise<NoteSummary> {
  const sql = `
    INSERT INTO request_notes (request_id, author, body)
    VALUES ($1, $2, $3)
    RETURNING id, author, body, created_at
  `;
  const rows = client
    ? (await client.query<NoteRow>(sql, [requestId, author, body])).rows
    : await query<NoteRow>(sql, [requestId, author, body]);

  const r = rows[0];
  return {
    id: String(r.id),
    author: r.author,
    body: r.body,
    createdAt: r.created_at.toISOString(),
  };
}
