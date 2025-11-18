import { getDatabase } from '../connection';
import { User, UserResponse } from '../../services/userStore';

/**
 * Data Access Object for Users
 * Replaces file-based storage with database operations
 */

export class UserDao {
  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const db = getDatabase();
    const user = await db.queryOne<User>(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    return user;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const db = getDatabase();
    const user = await db.queryOne<User>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return user;
  }

  /**
   * Get all users
   */
  async findAll(): Promise<User[]> {
    const db = getDatabase();
    return await db.query<User>('SELECT * FROM users ORDER BY created_at DESC');
  }

  /**
   * Check if any users exist
   */
  async hasUsers(): Promise<boolean> {
    const db = getDatabase();
    const result = await db.queryOne<{ count: number}>(
      'SELECT COUNT(*) as count FROM users'
    );
    return (result?.count || 0) > 0;
  }

  /**
   * Create a new user
   */
  async create(user: User): Promise<User> {
    const db = getDatabase();
    await db.execute(
      `INSERT INTO users (id, email, password_hash, role, created_at, updated_at, last_login_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.email,
        user.passwordHash,
        user.role,
        user.createdAt,
        user.updatedAt,
        user.lastLoginAt || null,
      ]
    );
    return user;
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();
    await db.execute(
      'UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?',
      [now, now, id]
    );
  }

  /**
   * Update user password
   */
  async updatePassword(id: string, passwordHash: string): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();
    await db.execute(
      'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
      [passwordHash, now, id]
    );
  }

  /**
   * Delete a user
   */
  async delete(id: string): Promise<void> {
    const db = getDatabase();
    await db.execute('DELETE FROM users WHERE id = ?', [id]);
  }

  /**
   * Sanitize user object (remove sensitive fields)
   */
  sanitize(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}

// Singleton instance
let userDaoInstance: UserDao | null = null;

export function getUserDao(): UserDao {
  if (!userDaoInstance) {
    userDaoInstance = new UserDao();
  }
  return userDaoInstance;
}
