import "dotenv/config";
import Nano from "nano";

const username = process.env.COUCHDB_USER ?? "admin";
const password = process.env.COUCHDB_PASSWORD;

const couchdb = Nano({
    url: process.env.COUCHDB_URL ?? "http://127.0.0.1:5984",
});

const DATABASE_NAME = process.env.COUCHDB_DATABASE ?? "documents";

let database;

export async function checkConnection() {
    await authenticate();
    return couchdb.db.list();
}

async function authenticate() {
    if (!password) {
        throw new Error("COUCHDB_PASSWORD must be set to authenticate with CouchDB.");
    }

    await couchdb.auth(username, password);
}

export async function initializeDatabase() {
    // Nano 11 no longer supports requestDefaults. Authenticate through CouchDB's
    // session endpoint so the client sends a valid AuthSession cookie.
    await authenticate();

    const databases = await couchdb.db.list();

    if (!databases.includes(DATABASE_NAME)) {
        await couchdb.db.create(DATABASE_NAME);
        console.log(`CouchDB database "${DATABASE_NAME}" created.`);
    } else {
        console.log(`CouchDB database "${DATABASE_NAME}" already exists.`);
    }

    database = couchdb.db.use(DATABASE_NAME);

    return database;
}

function getDatabase() {
    if (!database) {
        throw new Error(
            "CouchDB is not initialized. Call initializeDatabase() first.",
        );
    }

    return database;
}

export async function createDocument(document) {
    return getDatabase().insert(document);
}

export async function getDocument(id) {
    return getDatabase().get(id);
}

export async function updateDocument(document) {
    if (!document._id || !document._rev) {
        throw new Error("Updating a document requires _id and _rev.");
    }

    return getDatabase().insert(document);
}

export async function deleteDocument(id, revision) {
    return getDatabase().destroy(id, revision);
}

export { couchdb };
