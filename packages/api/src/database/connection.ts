import { promises as fs } from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import pg from 'pg';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type DatabaseType = 'sqlite' | 'postgres';

export interface DatabaseConfig {
  type: DatabaseType;
  // SQLite options
  filename?: string;
  // PostgreSQL options
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
}

/**
 * Unified database interface for SQLite and PostgreSQL
 */
export class DatabaseConnection {
  private type: DatabaseType;
  private sqlite?: Database.Database;
  private pg?: pg.Pool;

  constructor(config: DatabaseConfig) {
    this.type = config.type;

    if (config.type === 'sqlite') {
      const filename = config.filename || path.join(process.cwd(), 'data', 'mediaos.db');
      // Ensure directory exists
      const dir = path.dirname(filename);
      try {
        require('fs').mkdirSync(dir, { recursive: true });
      } catch (_e) {
        // ignore
      }
      this.sqlite = new Database(filename);
      this.sqlite.pragma('journal_mode = WAL');
      this.sqlite.pragma('foreign_keys = ON');
    } else {
      this.pg = new pg.Pool({
        host: config.host || 'localhost',
        port: config.port || 5432,
        database: config.database || 'mediaos',
        user: config.user,
        password: config.password,
      });
    }
  }

  /**
   * Initialize database schema
   */
  async initialize(): Promise<void> {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');

    if (this.type === 'sqlite' && this.sqlite) {
      this.sqlite.exec(schema);
    } else if (this.type === 'postgres' && this.pg) {
      await this.pg.query(schema);
    }
  }

  /**
   * Execute a query and return all rows
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (this.type === 'sqlite' && this.sqlite) {
      const stmt = this.sqlite.prepare(sql);
      return stmt.all(params) as T[];
    } else if (this.type === 'postgres' && this.pg) {
      const result = await this.pg.query(sql, params);
      return result.rows as T[];
    }
    throw new Error('Database not initialized');
  }

  /**
   * Execute a query and return the first row
   */
  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows[0] || null;
  }

  /**
   * Execute an insert/update/delete and return affected rows count
   */
  async execute(sql: string, params: any[] = []): Promise<number> {
    if (this.type === 'sqlite' && this.sqlite) {
      const stmt = this.sqlite.prepare(sql);
      const result = stmt.run(params);
      return result.changes;
    } else if (this.type === 'postgres' && this.pg) {
      const result = await this.pg.query(sql, params);
      return result.rowCount || 0;
    }
    throw new Error('Database not initialized');
  }

  /**
   * Begin a transaction
   */
  async beginTransaction(): Promise<void> {
    if (this.type === 'sqlite' && this.sqlite) {
      this.sqlite.exec('BEGIN');
    } else if (this.type === 'postgres' && this.pg) {
      await this.pg.query('BEGIN');
    }
  }

  /**
   * Commit a transaction
   */
  async commit(): Promise<void> {
    if (this.type === 'sqlite' && this.sqlite) {
      this.sqlite.exec('COMMIT');
    } else if (this.type === 'postgres' && this.pg) {
      await this.pg.query('COMMIT');
    }
  }

  /**
   * Rollback a transaction
   */
  async rollback(): Promise<void> {
    if (this.type === 'sqlite' && this.sqlite) {
      this.sqlite.exec('ROLLBACK');
    } else if (this.type === 'postgres' && this.pg) {
      await this.pg.query('ROLLBACK');
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.type === 'sqlite' && this.sqlite) {
      this.sqlite.close();
    } else if (this.type === 'postgres' && this.pg) {
      await this.pg.end();
    }
  }
}

// Singleton instance
let dbInstance: DatabaseConnection | null = null;

/**
 * Get or create the database connection
 */
export function getDatabase(): DatabaseConnection {
  if (!dbInstance) {
    const dbType = (process.env.DB_TYPE as DatabaseType) || 'sqlite';
    const config: DatabaseConfig = {
      type: dbType,
    };

    if (dbType === 'postgres') {
      config.host = process.env.DB_HOST;
      config.port = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined;
      config.database = process.env.DB_NAME;
      config.user = process.env.DB_USER;
      config.password = process.env.DB_PASSWORD;
    } else {
      config.filename = process.env.DB_FILENAME || path.join(process.cwd(), 'data', 'mediaos.db');
    }

    dbInstance = new DatabaseConnection(config);
  }

  return dbInstance;
}

/**
 * Initialize the database (create tables if they don't exist)
 */
export async function initializeDatabase(): Promise<void> {
  const db = getDatabase();
  await db.initialize();
}
