import sqlite3 from 'sqlite3';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface DatabaseConfig {
  url: string;
  createTables: boolean;
  seedData: boolean;
}

export class DatabaseMigrator {
  private db: sqlite3.Database;

  constructor(config: DatabaseConfig) {
    this.db = new sqlite3.Database(config.url);
  }

  async migrate(): Promise<void> {
    try {
      // Create basic media_items table for Sprint 1
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS media_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          kind TEXT NOT NULL CHECK (kind IN ('movie', 'series', 'music', 'book')),
          year INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await this.runAsync(createTableSQL);
      console.log('Database migration completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  private runAsync(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

export async function migrate(): Promise<void> {
  const config: DatabaseConfig = {
    url: process.env.DATABASE_URL || './config/mediaos.db',
    createTables: true,
    seedData: false
  };

  const migrator = new DatabaseMigrator(config);
  await migrator.migrate();
  await migrator.close();
}