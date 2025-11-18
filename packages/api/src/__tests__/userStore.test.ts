import { promises as fs } from 'fs';
import path from 'path';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { generateEncryptionKey } from '../services/encryption';
import {
  createUser,
  findUserByEmail,
  findUserById,
  authenticateUser,
  updatePassword,
  deleteUser,
  listUsers,
  hasUsers,
  createFirstAdmin,
  sanitizeUser,
  type User,
} from '../services/userStore';

describe('User Store Service', () => {
  const CONFIG_DIR = path.join(process.cwd(), 'config');
  const USERS_FILE = path.join(CONFIG_DIR, 'users.json');

  beforeEach(async () => {
    // Set encryption key
    process.env['ENCRYPTION_KEY'] = generateEncryptionKey();

    // Clean up users file before each test
    try {
      await fs.unlink(USERS_FILE);
    } catch (_e) {
      // Ignore if file doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up users file after each test
    try {
      await fs.unlink(USERS_FILE);
    } catch (_e) {
      // Ignore if file doesn't exist
    }
  });

  describe('createUser()', () => {
    it('should create a new user', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      const user = await createUser(email, password);

      expect(user.id).toBeTruthy();
      expect(user.email).toBe(email);
      expect(user.role).toBe('user');
      expect(user.createdAt).toBeTruthy();
      expect(user.updatedAt).toBeTruthy();
      expect(user).not.toHaveProperty('passwordHash');
    });

    it('should create user with admin role', async () => {
      const user = await createUser('admin@example.com', 'password123', 'admin');

      expect(user.role).toBe('admin');
    });

    it('should hash password', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      await createUser(email, password);

      // Read file directly to check password is hashed
      const raw = await fs.readFile(USERS_FILE, 'utf8');
      const users = JSON.parse(raw);
      const userId = Object.keys(users)[0];

      expect(users[userId].passwordHash).toBeTruthy();
      expect(users[userId].passwordHash).not.toBe(password);
      expect(users[userId].passwordHash).toContain(':'); // Salt:Hash format
    });

    it('should throw error for duplicate email', async () => {
      const email = 'test@example.com';

      await createUser(email, 'password123');

      await expect(createUser(email, 'password456')).rejects.toThrow(
        'Email already exists'
      );
    });

    it('should be case-insensitive for email uniqueness', async () => {
      await createUser('test@example.com', 'password123');

      await expect(createUser('TEST@EXAMPLE.COM', 'password456')).rejects.toThrow(
        'Email already exists'
      );
    });

    it('should generate unique IDs', async () => {
      const user1 = await createUser('user1@example.com', 'password123');
      const user2 = await createUser('user2@example.com', 'password123');

      expect(user1.id).not.toBe(user2.id);
    });
  });

  describe('findUserByEmail()', () => {
    it('should find user by email', async () => {
      const email = 'test@example.com';
      const created = await createUser(email, 'password123');

      const found = await findUserByEmail(email);

      expect(found).toBeTruthy();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe(email);
    });

    it('should be case-insensitive', async () => {
      await createUser('test@example.com', 'password123');

      const found = await findUserByEmail('TEST@EXAMPLE.COM');

      expect(found).toBeTruthy();
      expect(found?.email).toBe('test@example.com');
    });

    it('should return null for non-existent email', async () => {
      const found = await findUserByEmail('nonexistent@example.com');

      expect(found).toBeNull();
    });

    it('should include passwordHash in result', async () => {
      await createUser('test@example.com', 'password123');

      const found = await findUserByEmail('test@example.com');

      expect(found?.passwordHash).toBeTruthy();
    });
  });

  describe('findUserById()', () => {
    it('should find user by ID', async () => {
      const created = await createUser('test@example.com', 'password123');

      const found = await findUserById(created.id);

      expect(found).toBeTruthy();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe('test@example.com');
    });

    it('should return null for non-existent ID', async () => {
      const found = await findUserById('nonexistent-id');

      expect(found).toBeNull();
    });
  });

  describe('authenticateUser()', () => {
    it('should authenticate with correct credentials', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      await createUser(email, password);

      const user = await authenticateUser(email, password);

      expect(user.email).toBe(email);
      expect(user).not.toHaveProperty('passwordHash');
    });

    it('should throw error for incorrect password', async () => {
      const email = 'test@example.com';
      await createUser(email, 'password123');

      await expect(
        authenticateUser(email, 'wrong-password')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for non-existent email', async () => {
      await expect(
        authenticateUser('nonexistent@example.com', 'password123')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should update lastLoginAt timestamp', async () => {
      const email = 'test@example.com';
      await createUser(email, 'password123');

      await authenticateUser(email, 'password123');

      const user = await findUserByEmail(email);
      expect(user?.lastLoginAt).toBeTruthy();
    });

    it('should be case-insensitive for email', async () => {
      await createUser('test@example.com', 'password123');

      const user = await authenticateUser('TEST@EXAMPLE.COM', 'password123');

      expect(user.email).toBe('test@example.com');
    });
  });

  describe('updatePassword()', () => {
    it('should update user password', async () => {
      const email = 'test@example.com';
      const oldPassword = 'password123';
      const newPassword = 'newpassword456';

      const user = await createUser(email, oldPassword);

      await updatePassword(user.id, newPassword);

      // Should authenticate with new password
      const authenticated = await authenticateUser(email, newPassword);
      expect(authenticated).toBeTruthy();

      // Should not authenticate with old password
      await expect(
        authenticateUser(email, oldPassword)
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        updatePassword('nonexistent-id', 'newpassword')
      ).rejects.toThrow('User not found');
    });

    it('should update updatedAt timestamp', async () => {
      const user = await createUser('test@example.com', 'password123');
      const originalUpdatedAt = user.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await updatePassword(user.id, 'newpassword');

      const updated = await findUserById(user.id);
      expect(updated?.updatedAt).not.toBe(originalUpdatedAt);
    });
  });

  describe('deleteUser()', () => {
    it('should delete user', async () => {
      const user = await createUser('test@example.com', 'password123');

      await deleteUser(user.id);

      const found = await findUserById(user.id);
      expect(found).toBeNull();
    });

    it('should throw error for non-existent user', async () => {
      await expect(deleteUser('nonexistent-id')).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('listUsers()', () => {
    it('should list all users', async () => {
      await createUser('user1@example.com', 'password123');
      await createUser('user2@example.com', 'password123');
      await createUser('user3@example.com', 'password123');

      const users = await listUsers();

      expect(users.length).toBe(3);
      expect(users[0].email).toBeTruthy();
      expect(users[0]).not.toHaveProperty('passwordHash');
    });

    it('should return empty array when no users', async () => {
      const users = await listUsers();

      expect(users).toEqual([]);
    });

    it('should sanitize all users', async () => {
      await createUser('user1@example.com', 'password123', 'admin');
      await createUser('user2@example.com', 'password123', 'user');

      const users = await listUsers();

      users.forEach((user) => {
        expect(user).not.toHaveProperty('passwordHash');
        expect(user.id).toBeTruthy();
        expect(user.email).toBeTruthy();
        expect(user.role).toBeTruthy();
      });
    });
  });

  describe('hasUsers()', () => {
    it('should return false when no users exist', async () => {
      const result = await hasUsers();

      expect(result).toBe(false);
    });

    it('should return true when users exist', async () => {
      await createUser('test@example.com', 'password123');

      const result = await hasUsers();

      expect(result).toBe(true);
    });
  });

  describe('createFirstAdmin()', () => {
    it('should create first user as admin', async () => {
      const user = await createFirstAdmin('admin@example.com', 'password123');

      expect(user.role).toBe('admin');
      expect(user.email).toBe('admin@example.com');
    });

    it('should throw error if users already exist', async () => {
      await createUser('existing@example.com', 'password123');

      await expect(
        createFirstAdmin('admin@example.com', 'password123')
      ).rejects.toThrow('Users already exist');
    });
  });

  describe('sanitizeUser()', () => {
    it('should remove passwordHash from user object', () => {
      const user: User = {
        id: 'user123',
        email: 'test@example.com',
        passwordHash: 'hash:value',
        role: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const sanitized = sanitizeUser(user);

      expect(sanitized).not.toHaveProperty('passwordHash');
      expect(sanitized.id).toBe(user.id);
      expect(sanitized.email).toBe(user.email);
      expect(sanitized.role).toBe(user.role);
    });

    it('should preserve all non-sensitive fields', () => {
      const now = new Date().toISOString();
      const user: User = {
        id: 'user123',
        email: 'test@example.com',
        passwordHash: 'hash:value',
        role: 'admin',
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      };

      const sanitized = sanitizeUser(user);

      expect(sanitized.lastLoginAt).toBe(now);
      expect(sanitized.createdAt).toBe(now);
      expect(sanitized.updatedAt).toBe(now);
    });
  });
});
