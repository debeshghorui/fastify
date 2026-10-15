import {
    createDocument as insertDocument,
    getDocument,
    updateDocument as saveDocument,
    deleteDocument as removeDocument,
} from "../db/CouchDB/index.js";

import { trackOperation } from "../utils/operation-logger.js";

const DATABASE = "CouchDB";

export async function createDocument(data, context = {}) {
    return trackOperation(
        {
            requestId: context.requestId,
            database: DATABASE,
            operation: "CREATE",
            functionName: "createDocument",
            method: context.method ?? "POST",
            route: context.route ?? "/api/documents",
        },
        async () => {
            return insertDocument({
                ...data,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
        },
    );
}

export async function getDocumentById(id, context = {}) {
    return trackOperation(
        {
            requestId: context.requestId,
            database: DATABASE,
            operation: "READ",
            functionName: "getDocumentById",
            method: context.method ?? "GET",
            route: context.route ?? "/api/documents/:id",
            metadata: { documentId: id },
        },
        async () => {
            try {
                return await getDocument(id);
            } catch (error) {
                if (error.statusCode === 404) {
                    return null;
                }

                throw error;
            }
        },
    );
}

export async function updateDocument(id, data, context = {}) {
    return trackOperation(
        {
            requestId: context.requestId,
            database: DATABASE,
            operation: "UPDATE",
            functionName: "updateDocument",
            method: context.method ?? "PATCH",
            route: context.route ?? "/api/documents/:id",
            metadata: { documentId: id },
        },
        async () => {
            let existingDocument;

            try {
                existingDocument = await getDocument(id);
            } catch (error) {
                if (error.statusCode === 404) {
                    return null;
                }

                throw error;
            }

            const updatedDocument = {
                ...existingDocument,
                ...data,
                _id: existingDocument._id,
                _rev: existingDocument._rev,
                createdAt: existingDocument.createdAt,
                updatedAt: new Date().toISOString(),
            };

            return saveDocument(updatedDocument);
        },
    );
}

export async function getAllDocuments(context = {}) {
    return trackOperation(
        {
            requestId: context.requestId,
            database: "CouchDB",
            operation: "READ",
            functionName: "getAllDocuments",
            method: "GET",
            route: "/api/documents",
        },
        async () => {
            const { couchdb } = await import("../db/CouchDB/index.js");

            const database = couchdb.db.use(
                process.env.COUCHDB_DATABASE ?? "documents",
            );

            const result = await database.list({
                include_docs: true,
            });

            return result.rows
                .filter((row) => !row.id.startsWith("_design/"))
                .map((row) => row.doc);
        },
    );
}

export async function deleteDocument(id, context = {}) {
    return trackOperation(
        {
            requestId: context.requestId,
            database: DATABASE,
            operation: "DELETE",
            functionName: "deleteDocument",
            method: context.method ?? "DELETE",
            route: context.route ?? "/api/documents/:id",
            metadata: { documentId: id },
        },
        async () => {
            let existingDocument;

            try {
                existingDocument = await getDocument(id);
            } catch (error) {
                if (error.statusCode === 404) {
                    return null;
                }

                throw error;
            }

            return removeDocument(id, existingDocument._rev);
        },
    );
}