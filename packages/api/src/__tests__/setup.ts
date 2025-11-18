import path from 'path';

// Set environment variables BEFORE any other modules are loaded
const CONFIG_DIR = path.join(process.cwd(), 'test-config-auth-integration');
process.env.CONFIG_DIR = CONFIG_DIR;
process.env.JWT_SECRET = 'test-jwt-secret-32-characters-long-for-testing';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long-test';
