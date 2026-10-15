// Require the framework and instantiate it

// ESM
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

import path from "node:path";

import { fileURLToPath } from "node:url";

import recordsRoutes from "./routes/records.routes.js";
import documentsRoutes from "./routes/documents.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";

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
fastify.get('/', function (request, reply) {
    reply.send({ hello: 'world' });
});

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

// Run the server!
fastify.listen({ port: process.env.PORT ?? 3000 }, function (err, address) {
    if (err) {
        console.error(err);
        fastify.log.error(err);
        process.exit(1);
    }
    // Server is now listening on ${address}
    fastify.log.info(`Server is running on ${address}`);
    console.log(`Server is running on ${address}`);
});