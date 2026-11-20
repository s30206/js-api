import pg from 'pg';
import { config } from '../config/index.js';

export function createPool() {
  const pool = new pg.Pool({ connectionString: config.databaseUrl });
  // An idle client that loses its connection emits 'error' on the pool; unhandled, it crashes the process.
  pool.on('error', (err) => console.error('Unexpected PostgreSQL pool error', err));
  return pool;
}
