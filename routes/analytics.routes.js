import { clickhouse } from "../db/ClickHouse/index.js";

export default async function analyticsRoutes(fastify) {
    // GET RECENT OPERATION LOGS
    fastify.get(
        "/logs",
        {
            schema: {
                querystring: {
                    type: "object",
                    properties: {
                        limit: {
                            type: "integer",
                            minimum: 1,
                            maximum: 500,
                            default: 50,
                        },
                        database: {
                            type: "string",
                            maxLength: 50,
                        },
                        status: {
                            type: "string",
                            enum: ["SUCCESS", "FAILURE"],
                        },
                    },
                },
            },
        },
        async (request) => {
            const { limit = 50, database, status } = request.query;

            const conditions = [];
            const queryParams = { limit };

            if (database) {
                conditions.push("database_name = {database:String}");
                queryParams.database = database;
            }

            if (status) {
                conditions.push("status = {status:String}");
                queryParams.status = status;
            }

            const whereClause = conditions.length
                ? `WHERE ${conditions.join(" AND ")}`
                : "";

            const result = await clickhouse.query({
                query: `
          SELECT *
          FROM operation_logs
          ${whereClause}
          ORDER BY created_at DESC
          LIMIT {limit:UInt32}
        `,
                query_params: queryParams,
                format: "JSONEachRow",
            });

            const logs = await result.json();

            return {
                success: true,
                count: logs.length,
                data: logs,
            };
        },
    );

    // GET OPERATION SUMMARY
    fastify.get("/summary", async () => {
        const result = await clickhouse.query({
            query: `
        SELECT
          database_name,
          operation_type,
          count() AS total_operations,
          countIf(success = 1) AS successful_operations,
          countIf(success = 0) AS failed_operations,
          round(avg(duration_ms), 3) AS average_duration_ms,
          max(duration_ms) AS maximum_duration_ms,
          quantile(0.95)(duration_ms) AS p95_duration_ms
        FROM operation_logs
        GROUP BY database_name, operation_type
        ORDER BY database_name, operation_type
      `,
            format: "JSONEachRow",
        });

        return {
            success: true,
            data: await result.json(),
        };
    });

    // GET SLOWEST OPERATIONS
    fastify.get("/slowest", async (request) => {
        const limit = Math.max(
            1,
            Math.min(100, Number(request.query.limit) || 20),
        );

        const result = await clickhouse.query({
            query: `
        SELECT
          request_id,
          operation_id,
          database_name,
          operation_type,
          function_name,
          duration_ms,
          status,
          created_at
        FROM operation_logs
        ORDER BY duration_ms DESC
        LIMIT {limit:UInt32}
      `,
            query_params: { limit },
            format: "JSONEachRow",
        });

        return {
            success: true,
            data: await result.json(),
        };
    });
}