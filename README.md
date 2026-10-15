# fastify

```txt
fastify/
├── db/
│   ├── CockroachDB/
│   │   ├── index.js
│   │   ├── schema.js
│   │   └── migrations/
│   │
│   ├── CouchDB/
│   │   └── index.js
│   │
│   └── ClickHouse/
│       └── index.js
│
├── services/
│   ├── record.service.js
│   └── document.service.js
│
├── routes/
│   ├── records.routes.js
│   ├── documents.routes.js
│   └── analytics.routes.js
│
├── utils/
│   └── operation-logger.js
│
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
│
├── server.js
├── compose.yaml
├── drizzle.config.js
├── .env
└── package.json
```