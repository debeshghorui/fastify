import "dotenv/config";

const COUCHDB_URL = process.env.COUCHDB_URL ?? "http://127.0.0.1:5984";
const COUCHDB_USER = process.env.COUCHDB_USER ?? "admin";
const COUCHDB_PASSWORD = process.env.COUCHDB_PASSWORD;
const COUCHDB_DATABASE = process.env.COUCHDB_DATABASE ?? "documents";

if (!COUCHDB_PASSWORD) {
    throw new Error("Missing COUCHDB_PASSWORD in environment variables");
}

const credentials = Buffer.from(
    `${COUCHDB_USER}:${COUCHDB_PASSWORD}`,
).toString("base64");

const headers = {
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/json",
};

async function request(path, options = {}) {
    const response = await fetch(`${COUCHDB_URL}${path}`, {
        ...options,
        headers: {
            ...headers,
            ...options.headers,
        },
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
        throw new Error(
            `CouchDB error (${response.status}): ${data?.reason ?? data?.error ?? response.statusText
            }`,
        );
    }

    return data;
}

// Check whether CouchDB is reachable and credentials are valid.
export async function checkConnection() {
    return request("/");
}

// Create the database if it doesn't already exist.
export async function initializeDatabase() {
    try {
        await request(`/${encodeURIComponent(COUCHDB_DATABASE)}`, {
            method: "PUT",
        });

        console.log(`CouchDB database "${COUCHDB_DATABASE}" created.`);
    } catch (error) {
        if (error.message.includes("412")) {
            console.log(`CouchDB database "${COUCHDB_DATABASE}" already exists.`);
            return;
        }

        throw error;
    }
}

// Create a document with a generated ID.
export async function createDocument(document) {
    return request(`/${encodeURIComponent(COUCHDB_DATABASE)}`, {
        method: "POST",
        body: JSON.stringify(document),
    });
}

// Retrieve a document by ID.
export async function getDocument(id) {
    return request(
        `/${encodeURIComponent(COUCHDB_DATABASE)}/${encodeURIComponent(id)}`,
    );
}

// Update an existing document.
export async function updateDocument(id, document) {
    return request(
        `/${encodeURIComponent(COUCHDB_DATABASE)}/${encodeURIComponent(id)}`,
        {
            method: "PUT",
            body: JSON.stringify(document),
        },
    );
}

// Delete a document using its current revision.
export async function deleteDocument(id, revision) {
    const query = new URLSearchParams({ rev: revision });

    return request(
        `/${encodeURIComponent(COUCHDB_DATABASE)}/${encodeURIComponent(id)}?${query}`,
        {
            method: "DELETE",
        },
    );
}