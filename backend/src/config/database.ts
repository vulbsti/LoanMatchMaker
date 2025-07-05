import { Pool } from 'pg';
import { DatabaseConfig } from '../models/interfaces';

export class DatabaseService {
  private pool: Pool;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.pool = new Pool({
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

    // Handle pool errors gracefully
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      // In production, implement proper error handling instead of process.exit
      if (process.env.NODE_ENV === 'production') {
        // Log error and attempt reconnection
        this.handlePoolError(err);
      } else {
        process.exit(-1);
      }
    });
  }

  async query<T = any>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: result.rowCount });
      return {
        rows: result.rows as T[],
        rowCount: result.rowCount ?? 0
      };
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async getClient() {
    return this.pool.connect();
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW()');
      return result.rows.length > 0;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private async handlePoolError(err: Error): Promise<void> {
    console.error('Database pool error:', err);
    // Implement exponential backoff retry logic
    // In a real production environment, you might want to:
    // 1. Send alerts to monitoring system
    // 2. Attempt to recreate the pool
    // 3. Implement circuit breaker pattern
    // For now, we'll just log the error
  }

  // Transaction helper
  async withTransaction<T>(callback: (client: { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number }> }) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const wrappedClient = {
        query: async (text: string, params?: unknown[]) => {
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
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

// Database connection factory
export const createDatabaseConnection = (config: DatabaseConfig): DatabaseService => {
  return new DatabaseService(config);
};

// Parse database URL helper
export const parseDatabaseUrl = (url: string): DatabaseConfig => {
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