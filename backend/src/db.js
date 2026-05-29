import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://babymonk@localhost:5432/financemanager',
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}

export async function getClient() {
  const client = await pool.connect();
  return client;
}

export default pool;
