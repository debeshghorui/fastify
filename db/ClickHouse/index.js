import "dotenv/config";
import { createClient } from "@clickhouse/client";

export const clickhouse = createClient({
    url: process.env.CLICKHOUSE_URL ?? "http://127.0.0.1:8123",
    username: process.env.CLICKHOUSE_USER ?? "app",
    password: process.env.CLICKHOUSE_PASSWORD,
    database: process.env.CLICKHOUSE_DATABASE ?? "analytics",
});

export async function checkConnection() {
    return clickhouse.ping();
}

export async function initializeDatabase() {
    await clickhouse.exec({
        query: `
            CREATE TABLE IF NOT EXISTS operation_logs (
                event_id UUID DEFAULT generateUUIDv4(),
                request_id String,
                operation_id String,
                database_name LowCardinality(String),
                operation_type LowCardinality(String),
                function_name String,
                method LowCardinality(String),
                route String,
                status LowCardinality(String),
                duration_ms Float64,
                success UInt8,
                error_type String,
                error_message String,
                created_at DateTime64(3, 'UTC') DEFAULT now64(3),
                metadata String DEFAULT '{}'
            )
            ENGINE = MergeTree
            PARTITION BY toYYYYMM(created_at)
            ORDER BY (database_name, created_at, operation_id)
    `,
    });

    console.log("ClickHouse operation_logs table is ready.");
}

export async function insertOperationLog(log) {
    return clickhouse.insert({
        table: "operation_logs",
        values: [log],
        format: "JSONEachRow",
    });
}

export async function getRecentOperationLogs(limit = 50) {
    const safeLimit = Math.max(
        1,
        Math.min(500, Math.floor(Number(limit) || 50)),
    );

    const result = await clickhouse.query({
        query: `
      SELECT *
      FROM operation_logs
      ORDER BY created_at DESC
      LIMIT {limit:UInt32}
    `,
        query_params: {
            limit: safeLimit,
        },
        format: "JSONEachRow",
    });

    return result.json();
}

export async function closeClickHouse() {
    await clickhouse.close();
}