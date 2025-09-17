import { Database } from 'sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

const run = promisify(Database.prototype.run.bind(new Database()));

export async function migrate(): Promise<void> {
  const db = new Database(process.env.DATABASE_URL || './config/mediaos.db');
  const runAsync = promisify(db.run.bind(db));
  
  try {
    // Read and execute migration files
    const migrationPath = join(__dirname, '../migrations/0001_init.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    await runAsync(migrationSQL);
    console.log('✅ Database migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

export async function seed(): Promise<void> {
  const db = new Database(process.env.DATABASE_URL || './config/mediaos.db');
  const runAsync = promisify(db.run.bind(db));
  
  try {
    // Read and execute seed files
    const seedPath = join(__dirname, '../seeds/001_initial_data.sql');
    const seedSQL = readFileSync(seedPath, 'utf8');
    
    await runAsync(seedSQL);
    console.log('✅ Database seeding completed successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  
  switch (command) {
    case 'migrate':
      await migrate();
      break;
    case 'seed':
      await seed();
      break;
    default:
      console.log('Usage: node migrate.js [migrate|seed]');
      process.exit(1);
  }
}
