/**
 * Crea la base de datos arcanum_db si no existe.
 * Ejecutar: node scripts/create-db.mjs
 * Requiere: PostgreSQL en marcha y credenciales por defecto (postgres/postgres) o .env
 */
import pg from 'pg';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Cargar .env manualmente si existe
const envPath = join(__dirname, '..', '.env');
if (existsSync(envPath)) {
  const env = readFileSync(envPath, 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const dbName = process.env.DB_NAME || 'arcanum_db';
const client = new pg.Client({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'postgres', // conectar a la BD por defecto para crear la nueva
});

async function main() {
  try {
    await client.connect();
    const res = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );
    if (res.rows.length > 0) {
      console.log(`La base de datos "${dbName}" ya existe.`);
      return;
    }
    const safeName = dbName.replace(/[^a-zA-Z0-9_]/g, '');
    if (!safeName) throw new Error('Nombre de BD inválido');
    await client.query(`CREATE DATABASE "${safeName}"`);
    console.log(`Base de datos "${dbName}" creada correctamente.`);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
