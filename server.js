// Require the framework and instantiate it

// ESM
import "dotenv/config";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

import path from "node:path";

import { fileURLToPath } from "node:url";

import recordsRoutes from "./routes/records.routes.js";
import documentsRoutes from "./routes/documents.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import { initializeDatabase as initializeCouchDB } from "./db/CouchDB/index.js";
import { initializeDatabase as initializeClickHouse } from "./db/ClickHouse/index.js";

// Get the directory name of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Instantiate Fastify
const fastify = Fastify({
    logger: true
});

// Register static files
fastify.register(fastifyStatic, {
    root: path.join(__dirname, "public"),
    prefix: "/",

});

// Declare a route
// fastify.get('/', function (request, reply) {
//     reply.send({ hello: 'world' });
// });

// Register routes
fastify.register(recordsRoutes, {
    prefix: "/api/records",
});

// Register documents routes
fastify.register(documentsRoutes, {
    prefix: "/api/documents",
});

// Register analytics routes
fastify.register(analyticsRoutes, {
    prefix: "/api/analytics",
});

// Prepare the databases used by the document API and operation logger before
// accepting requests. CockroachDB schema migrations remain a separate step.
async function startServer() {
    try {
        await initializeCouchDB();
        await initializeClickHouse();

        const address = await fastify.listen({
            port: Number(process.env.PORT ?? 3000),
            host: process.env.HOST ?? "0.0.0.0",
        });

        fastify.log.info(`Server is running on ${address}`);
    } catch (error) {
        fastify.log.error(error, "Failed to initialize databases or start server");
        await fastify.close().catch(() => {});
        process.exitCode = 1;
    }
}

await startServer();
