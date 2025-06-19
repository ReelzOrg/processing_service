require('dotenv').config();
import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgre',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: parseInt(process.env.POSTGRES_PORT || "5432"), // Default PostgreSQL port
});

export async function query(queryStr, params) {
  try {
    const start = Date.now();
    const result = await pool.query(queryStr, params);
    const duration = Date.now() - start;
    console.log(`Query executed in ${duration}ms`);
    return result.rows;
  } catch(err) {
    console.error("Database query error:", err);
    throw err;
  }
}

export async function closePool() {
  try {
    await pool.end();
    console.log("PostgreSQL connection pool closed.");
  } catch (error) {
    console.error("Error closing pool:", error);
  }
};