import { Pool, QueryResult, QueryResultRow } from 'pg';
import { config } from './config.js';

export const pool = new Pool({ connectionString: config.DATABASE_URL });

export async function query<T extends QueryResultRow>(sql: string, params: unknown[] = []) {
  return pool.query<T>(sql, params);
}

export type QueryFn = <T extends QueryResultRow>(
  sql: string,
  params?: unknown[],
) => Promise<QueryResult<T>>;

export async function withTransaction<T>(callback: (query: QueryFn) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(<Row extends QueryResultRow>(sql: string, params: unknown[] = []) =>
      client.query<Row>(sql, params),
    );
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
