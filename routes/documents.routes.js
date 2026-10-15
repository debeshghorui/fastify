import {
    createDocument,
    getAllDocuments,
    getDocumentById,
    updateDocument,
    deleteDocument,
} from "../services/document.service.js";

export default async function documentsRoutes(fastify) {
    // READ ALL
    fastify.get("/", async (request) => {
        const documents = await getAllDocuments({
            requestId: request.id,
        });

        return {
            success: true,
            count: documents.length,
            data: documents,
        };
    });
    
    // CREATE
    fastify.post(
        "/",
        {
            schema: {
                body: {
                    type: "object",
                    required: ["title"],
                    additionalProperties: false,
                    properties: {
                        title: { type: "string", minLength: 1, maxLength: 200 },
                        content: { type: "string" },
                        category: { type: "string", maxLength: 100 },
                        tags: {
                            type: "array",
                            items: { type: "string", maxLength: 100 },
                            maxItems: 50,
                        },
                    },
                },
            },
        },
        async (request, reply) => {
            const document = await createDocument(request.body, {
                requestId: request.id,
            });

            return reply.code(201).send({
                success: true,
                data: document,
            });
        },
    );

    // READ
    fastify.get("/:id", async (request, reply) => {
        const document = await getDocumentById(request.params.id, {
            requestId: request.id,
        });

        if (!document) {
            return reply.code(404).send({
                success: false,
                error: "Document not found",
            });
        }

        return {
            success: true,
            data: document,
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
                        title: { type: "string", minLength: 1, maxLength: 200 },
                        content: { type: "string" },
                        category: { type: "string", maxLength: 100 },
                        tags: {
                            type: "array",
                            items: { type: "string", maxLength: 100 },
                            maxItems: 50,
                        },
                    },
                },
            },
        },
        async (request, reply) => {
            const document = await updateDocument(
                request.params.id,
                request.body,
                { requestId: request.id },
            );

            if (!document) {
                return reply.code(404).send({
                    success: false,
                    error: "Document not found",
                });
            }

            return {
                success: true,
                data: document,
            };
        },
    );

    // DELETE
    fastify.delete("/:id", async (request, reply) => {
        const result = await deleteDocument(request.params.id, {
            requestId: request.id,
        });

        if (!result) {
            return reply.code(404).send({
                success: false,
                error: "Document not found",
            });
        }

        return {
            success: true,
            message: "Document deleted successfully",
            data: result,
        };
    });
}