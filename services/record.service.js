import { eq } from "drizzle-orm";

import { db } from "../db/CockroachDB/index.js";
import { records } from "../db/CockroachDB/schema.js";
import { trackOperation } from "../utils/operation-logger.js";

const DATABASE = "CockroachDB";

export async function createRecord(data, context = {}) {
    return trackOperation(
        {
            requestId: context.requestId,
            database: DATABASE,
            operation: "CREATE",
            functionName: "createRecord",
            method: context.method ?? "POST",
            route: context.route ?? "/api/records",
            metadata: {},
        },
        async () => {
            const [record] = await db
                .insert(records)
                .values({
                    name: data.name,
                    email: data.email,
                    description: data.description ?? null,
                })
                .returning();

            return record;
        },
    );
}

export async function getAllRecords(context = {}) {
    return trackOperation(
        {
            requestId: context.requestId,
            database: DATABASE,
            operation: "READ",
            functionName: "getAllRecords",
            method: context.method ?? "GET",
            route: context.route ?? "/api/records",
        },
        async () => {
            return db.select().from(records);
        },
    );
}

export async function getRecordById(id, context = {}) {
    return trackOperation(
        {
            requestId: context.requestId,
            database: DATABASE,
            operation: "READ",
            functionName: "getRecordById",
            method: context.method ?? "GET",
            route: context.route ?? "/api/records/:id",
            metadata: { recordId: id },
        },
        async () => {
            const [record] = await db
                .select()
                .from(records)
                .where(eq(records.id, id))
                .limit(1);

            return record ?? null;
        },
    );
}

export async function updateRecord(id, data, context = {}) {
    return trackOperation(
        {
            requestId: context.requestId,
            database: DATABASE,
            operation: "UPDATE",
            functionName: "updateRecord",
            method: context.method ?? "PATCH",
            route: context.route ?? "/api/records/:id",
            metadata: { recordId: id },
        },
        async () => {
            const updates = {};

            if (data.name !== undefined) {
                updates.name = data.name;
            }

            if (data.email !== undefined) {
                updates.email = data.email;
            }

            if (data.description !== undefined) {
                updates.description = data.description;
            }

            if (Object.keys(updates).length === 0) {
                throw new Error("At least one field must be provided for update.");
            }

            updates.updatedAt = new Date();

            const [record] = await db
                .update(records)
                .set(updates)
                .where(eq(records.id, id))
                .returning();

            return record ?? null;
        },
    );
}

export async function deleteRecord(id, context = {}) {
    return trackOperation(
        {
            requestId: context.requestId,
            database: DATABASE,
            operation: "DELETE",
            functionName: "deleteRecord",
            method: context.method ?? "DELETE",
            route: context.route ?? "/api/records/:id",
            metadata: { recordId: id },
        },
        async () => {
            const [record] = await db
                .delete(records)
                .where(eq(records.id, id))
                .returning();

            return record ?? null;
        },
    );
}