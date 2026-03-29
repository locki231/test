"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
// config/database.ts
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    host: process.env.PGHOST,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
});
exports.db = pool;
