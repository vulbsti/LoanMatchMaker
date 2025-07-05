"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDatabaseUrl = exports.createDatabaseConnection = exports.DatabaseService = void 0;
const pg_1 = require("pg");
class DatabaseService {
    constructor(config) {
        this.config = config;
        this.pool = new pg_1.Pool({
            host: config.host,
            port: config.port,
            database: config.database,
            user: config.user,
            password: config.password,
            ssl: config.ssl ? {
                rejectUnauthorized: process.env.NODE_ENV === 'production' ? true : false,
                ca: process.env.DATABASE_CA_CERT,
            } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        this.pool.on('error', (err) => {
            console.error('Unexpected error on idle client', err);
            if (process.env.NODE_ENV === 'production') {
                this.handlePoolError(err);
            }
            else {
                process.exit(-1);
            }
        });
    }
    async query(text, params) {
        const start = Date.now();
        try {
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;
            console.log('Executed query', { text, duration, rows: result.rowCount });
            return {
                rows: result.rows,
                rowCount: result.rowCount ?? 0
            };
        }
        catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }
    async getClient() {
        return this.pool.connect();
    }
    async healthCheck() {
        try {
            const result = await this.query('SELECT NOW()');
            return result.rows.length > 0;
        }
        catch (error) {
            console.error('Database health check failed:', error);
            return false;
        }
    }
    async close() {
        await this.pool.end();
    }
    async handlePoolError(err) {
        console.error('Database pool error:', err);
    }
    async withTransaction(callback) {
        const client = await this.getClient();
        try {
            await client.query('BEGIN');
            const wrappedClient = {
                query: async (text, params) => {
                    const result = await client.query(text, params);
                    return {
                        rows: result.rows,
                        rowCount: result.rowCount ?? 0
                    };
                }
            };
            const result = await callback(wrappedClient);
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
}
exports.DatabaseService = DatabaseService;
const createDatabaseConnection = (config) => {
    return new DatabaseService(config);
};
exports.createDatabaseConnection = createDatabaseConnection;
const parseDatabaseUrl = (url) => {
    const parsedUrl = new URL(url);
    return {
        host: parsedUrl.hostname,
        port: parseInt(parsedUrl.port || '5432', 10),
        database: parsedUrl.pathname.substring(1),
        user: parsedUrl.username,
        password: parsedUrl.password,
        ssl: parsedUrl.searchParams.get('ssl') === 'true',
    };
};
exports.parseDatabaseUrl = parseDatabaseUrl;
//# sourceMappingURL=database.js.map