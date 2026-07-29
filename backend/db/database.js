// database.js - conexão com PostgreSQL usando pg
// Lê variáveis do .env (PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT ou DATABASE_URL)
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized:false } : undefined
});

pool.on('error', (err)=>{
  console.error('Postgres pool error', err);
});

async function query(text, params){
  return pool.query(text, params);
}

module.exports = { pool, query };