import {
    createRecord,
    getAllRecords,
    getRecordById,
    updateRecord,
    deleteRecord,
} from "../services/record.service.js";

export default async function recordsRoutes(fastify) {
    // CREATE
    fastify.post(
        "/",
        {
            schema: {
                body: {
                    type: "object",
                    required: ["name", "email"],
                    additionalProperties: false,
                    properties: {
                        name: { type: "string", minLength: 1, maxLength: 100 },
                        email: { type: "string", minLength: 1, maxLength: 255 },
                        description: {
                            type: ["string", "null"],
                        },
                    },
                },
            },
        },
        async (request, reply) => {
            const record = await createRecord(request.body, {
                requestId: request.id,
            });

            return reply.code(201).send({
                success: true,
                data: record,
            });
        },
    );

    // READ ALL
    fastify.get("/", async (request) => {
        const records = await getAllRecords({
            requestId: request.id,
        });

        return {
            success: true,
            count: records.length,
            data: records,
        };
    });

    // READ ONE
    fastify.get("/:id", async (request, reply) => {
        const id = Number(request.params.id);

        if (!Number.isSafeInteger(id) || id < 1) {
            return reply.code(400).send({
                success: false,
                error: "Invalid record ID",
            });
        }

        const record = await getRecordById(id, {
            requestId: request.id,
        });

        if (!record) {
            return reply.code(404).send({
                success: false,
                error: "Record not found",
            });
        }

        return {
            success: true,
            data: record,
        };
    });

    // UPDATE
    fastify.patch(
        "/:id",
        {
            schema: {
                body: {
                    type: "object",
                    minProperties: 1,
                    additionalProperties: false,
                    properties: {
                        name: { type: "string", minLength: 1, maxLength: 100 },
                        email: { type: "string", minLength: 1, maxLength: 255 },
                        description: { type: ["string", "null"] },
                    },
                },
            },
        },
        async (request, reply) => {
            const id = Number(request.params.id);

            if (!Number.isSafeInteger(id) || id < 1) {
                return reply.code(400).send({
                    success: false,
                    error: "Invalid record ID",
                });
            }

            const record = await updateRecord(id, request.body, {
                requestId: request.id,
            });

            if (!record) {
                return reply.code(404).send({
                    success: false,
                    error: "Record not found",
                });
            }

            return {
                success: true,
                data: record,
            };
        },
    );

    // DELETE
    fastify.delete("/:id", async (request, reply) => {
        const id = Number(request.params.id);

        if (!Number.isSafeInteger(id) || id < 1) {
            return reply.code(400).send({
                success: false,
                error: "Invalid record ID",
            });
        }

        const record = await deleteRecord(id, {
            requestId: request.id,
        });

        if (!record) {
            return reply.code(404).send({
                success: false,
                error: "Record not found",
            });
        }

        return {
            success: true,
            message: "Record deleted successfully",
            data: record,
        };
    });
}