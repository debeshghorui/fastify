import "dotenv/config";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

const { Pool } = pg;

export const pool = new Pool({
    host: process.env.COCKROACH_HOST,
    port: Number(process.env.COCKROACH_PORT),
    user: process.env.COCKROACH_USER,
    password: process.env.COCKROACH_PASSWORD ?? "",
    database: process.env.COCKROACH_DATABASE,
    ssl: false,
    max: 10,
});

export const db = drizzle(pool);

export async function checkConnection() {
    const result = await pool.query("SELECT version()");
    return result.rows[0];
}

export async function closeConnection() {
    await pool.end();
}