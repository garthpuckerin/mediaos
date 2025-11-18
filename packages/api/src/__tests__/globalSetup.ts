import path from 'path';

// Set CONFIG_DIR BEFORE any modules load
const CONFIG_DIR = path.join(process.cwd(), 'test-config-global');
process.env.CONFIG_DIR = CONFIG_DIR;
process.env.JWT_SECRET = 'test-jwt-secret-32-characters-long-for-testing';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long-test';

export default async function setup() {
  // This runs once before all tests
  console.log('Global test setup complete');
}
