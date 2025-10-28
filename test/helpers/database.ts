import { promisify } from 'util';

import { Database } from 'sqlite3';

export async function setupTestDatabase(): Promise<void> {
  const db = new Database(':memory:');
  const run = promisify(db.run.bind(db));

  // Create test tables
  await run(`
    CREATE TABLE IF NOT EXISTS media_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      year INTEGER,
      type TEXT NOT NULL,
      path TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      year INTEGER,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS indexers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      api_key TEXT,
      enabled BOOLEAN DEFAULT true,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Store database instance for cleanup
  (global as any).testDatabase = db;
}

export async function cleanupTestDatabase(): Promise<void> {
  const db = (global as any).testDatabase;
  if (db) {
    await new Promise<void>((resolve, reject) => {
      db.close((err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
