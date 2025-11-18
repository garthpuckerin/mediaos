/**
 * Migration script to move data from file-based storage to database
 * Run this once to migrate existing data
 */

import { promises as fs } from 'fs';
import path from 'path';
import { getDatabase, initializeDatabase } from './connection';
import { getUserDao } from './dao/userDao';

const CONFIG_DIR = process.env.CONFIG_DIR || path.join(process.cwd(), 'config');

/**
 * Migrate users from users.json to database
 */
async function migrateUsers(): Promise<void> {
  console.log('Migrating users...');
  const usersFile = path.join(CONFIG_DIR, 'users.json');

  try {
    const raw = await fs.readFile(usersFile, 'utf8');
    const users = JSON.parse(raw) || {};
    const userDao = getUserDao();

    let count = 0;
    for (const [id, user] of Object.entries(users) as [string, any][]) {
      try {
        // Check if user already exists
        const existing = await userDao.findById(id);
        if (existing) {
          console.log(`  User ${user.email} already exists, skipping`);
          continue;
        }

        await userDao.create({
          id: user.id,
          email: user.email,
          passwordHash: user.passwordHash,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          lastLoginAt: user.lastLoginAt,
        });
        count++;
      } catch (error) {
        console.error(`  Error migrating user ${user.email}:`, error);
      }
    }

    console.log(`  Migrated ${count} users`);
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      console.log('  No users file found, skipping');
    } else {
      throw error;
    }
  }
}

/**
 * Migrate library items from library.json to database
 */
async function migrateLibrary(): Promise<void> {
  console.log('Migrating library...');
  const libraryFile = path.join(CONFIG_DIR, 'library.json');

  try {
    const raw = await fs.readFile(libraryFile, 'utf8');
    const data = JSON.parse(raw) || {};
    const items = data.items || [];
    const db = getDatabase();

    let count = 0;
    for (const item of items) {
      try {
        // Check if item already exists
        const existing = await db.queryOne(
          'SELECT id FROM library_items WHERE id = ?',
          [item.id || item.title]
        );

        if (existing) {
          console.log(`  Item "${item.title}" already exists, skipping`);
          continue;
        }

        const id = item.id || item.title;
        const now = new Date().toISOString();

        await db.execute(
          `INSERT INTO library_items (id, kind, title, poster_url, background_url, banner_url, season_artwork_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            item.kind || 'movie',
            item.title,
            item.posterUrl || null,
            item.backgroundUrl || null,
            item.bannerUrl || null,
            item.seasonArtwork ? JSON.stringify(item.seasonArtwork) : null,
            item.createdAt || now,
            item.updatedAt || now,
          ]
        );
        count++;
      } catch (error) {
        console.error(`  Error migrating item "${item.title}":`, error);
      }
    }

    console.log(`  Migrated ${count} library items`);
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      console.log('  No library file found, skipping');
    } else {
      throw error;
    }
  }
}

/**
 * Migrate wanted items from wanted.json to database
 */
async function migrateWanted(): Promise<void> {
  console.log('Migrating wanted items...');
  const wantedFile = path.join(CONFIG_DIR, 'wanted.json');

  try {
    const raw = await fs.readFile(wantedFile, 'utf8');
    const data = JSON.parse(raw) || {};
    const items = data.items || [];
    const db = getDatabase();

    let count = 0;
    for (const item of items) {
      try {
        // Check if item already exists
        const existing = await db.queryOne(
          'SELECT id FROM wanted_items WHERE kind = ? AND id = ?',
          [item.kind, item.id]
        );

        if (existing) {
          console.log(`  Wanted "${item.title}" already exists, skipping`);
          continue;
        }

        await db.execute(
          `INSERT INTO wanted_items (id, kind, title, added_at, last_scan_at, last_scan_found, last_scan_grabbed)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            item.kind,
            item.title,
            item.addedAt || new Date().toISOString(),
            item.lastScan?.at || null,
            item.lastScan?.found || 0,
            item.lastScan?.grabbed || 0,
          ]
        );
        count++;
      } catch (error) {
        console.error(`  Error migrating wanted "${item.title}":`, error);
      }
    }

    console.log(`  Migrated ${count} wanted items`);
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      console.log('  No wanted file found, skipping');
    } else {
      throw error;
    }
  }
}

/**
 * Main migration function
 */
export async function runMigration(): Promise<void> {
  console.log('Starting database migration...\n');

  try {
    // Initialize database schema
    console.log('Initializing database schema...');
    await initializeDatabase();
    console.log('✓ Schema initialized\n');

    // Migrate data
    await migrateUsers();
    await migrateLibrary();
    await migrateWanted();

    console.log('\n✓ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Verify the data in your database');
    console.log('2. Update your application to use database-backed DAOs');
    console.log('3. Backup and archive the old config/*.json files');
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
    .then(() => {
      console.log('\nMigration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nMigration script failed:', error);
      process.exit(1);
    });
}
