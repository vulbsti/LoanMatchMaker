import { DatabaseConfig } from '../models/interfaces';
export declare class DatabaseService {
    private pool;
    private config;
    constructor(config: DatabaseConfig);
    query<T = any>(text: string, params?: unknown[]): Promise<{
        rows: T[];
        rowCount: number;
    }>;
    getClient(): Promise<import("pg").PoolClient>;
    healthCheck(): Promise<boolean>;
    close(): Promise<void>;
    private handlePoolError;
    withTransaction<T>(callback: (client: {
        query: (text: string, params?: unknown[]) => Promise<{
            rows: unknown[];
            rowCount: number;
        }>;
    }) => Promise<T>): Promise<T>;
}
export declare const createDatabaseConnection: (config: DatabaseConfig) => DatabaseService;
export declare const parseDatabaseUrl: (url: string) => DatabaseConfig;
//# sourceMappingURL=database.d.ts.map