import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./db/CockroachDB/schema.js",
    out: "./db/CockroachDB/migrations",
    dialect: "postgresql",
    dbCredentials: {
        host: process.env.COCKROACH_HOST ?? "127.0.0.1",
        port: Number(process.env.COCKROACH_PORT ?? 26257),
        user: process.env.COCKROACH_USER ?? "root",
        password: process.env.COCKROACH_PASSWORD ?? "",
        database: process.env.COCKROACH_DATABASE ?? "dev",
        ssl: false,
    },
});