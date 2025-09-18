import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { migrate } from '../scripts/migrate';

describe('DB Migration Integration', () => {
  const tmpDir = path.join(process.cwd(), 'packages', 'api', 'tmp');
  const dbPath = path.join(tmpDir, `test-migration-${Date.now()}.db`);

  beforeAll(async () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    process.env['DATABASE_URL'] = dbPath;
    await migrate();
  });

  afterAll(async () => {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  it('creates media_items table', async () => {
    const db = new sqlite3.Database(dbPath);
    const row: any = await new Promise((resolve, reject) => {
      db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='media_items'",
        (err, r) => (err ? reject(err) : resolve(r))
      );
    });
    db.close();
    expect(row).toBeTruthy();
    expect(row.name).toBe('media_items');
  });
});
