import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'arcanum_db',
});

pool.on('error', (err: Error) => {
  console.error('Error inesperado en el pool', err);
  process.exit(-1);
});

export default pool;
