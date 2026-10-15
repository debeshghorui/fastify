import { randomUUID } from "node:crypto";
import { insertOperationLog } from "../db/ClickHouse/index.js";

export async function trackOperation(
    {
        requestId,
        database,
        operation,
        functionName,
        method = "",
        route = "",
        metadata = {},
    },
    callback,
) {
    const operationId = randomUUID();
    const startTime = performance.now();

    let success = false;
    let result;
    let operationError;

    try {
        result = await callback();
        success = true;

        return result;
    } catch (error) {
        operationError = error;
        throw error;
    } finally {
        const durationMs = Number(
            (performance.now() - startTime).toFixed(3),
        );

        const log = {
            request_id: requestId ?? "",
            operation_id: operationId,
            database_name: database,
            operation_type: operation,
            function_name: functionName,
            method,
            route,
            status: success ? "SUCCESS" : "FAILURE",
            duration_ms: durationMs,
            success: success ? 1 : 0,
            error_type: operationError?.name ?? "",
            error_message: operationError
                ? String(operationError.message).slice(0, 1000)
                : "",
            metadata: JSON.stringify(metadata),
        };

        // Logging failure must not replace the CRUD result or error.
        try {
            await insertOperationLog(log);
        } catch (loggingError) {
            console.error("Failed to write operation log:", {
                operationId,
                message: loggingError.message,
            });
        }
    }
}