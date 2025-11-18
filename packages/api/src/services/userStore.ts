import { promises as fs } from 'fs';
import path from 'path';

import { hashPassword, verifyPassword } from './encryption';

/**
 * User store for managing user accounts
 * File-based storage (will migrate to database in future)
 */

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

function getConfigDir(): string {
  return process.env.CONFIG_DIR || path.join(process.cwd(), 'config');
}

function getUsersFile(): string {
  return path.join(getConfigDir(), 'users.json');
}

/**
 * Ensures the config directory exists
 */
async function ensureDir() {
  try {
    await fs.mkdir(getConfigDir(), { recursive: true });
  } catch (_e) {
    // ignore
  }
}

/**
 * Loads all users from file
 */
async function loadUsers(): Promise<Record<string, User>> {
  try {
    const raw = await fs.readFile(getUsersFile(), 'utf8');
    return JSON.parse(raw) || {};
  } catch (_e) {
    return {};
  }
}

/**
 * Saves all users to file
 */
async function saveUsers(users: Record<string, User>): Promise<void> {
  await ensureDir();
  await fs.writeFile(getUsersFile(), JSON.stringify(users, null, 2), 'utf8');
}

/**
 * Removes sensitive data from user object
 */
export function sanitizeUser(user: User): UserResponse {
  const { passwordHash, ...rest } = user;
  return rest;
}

/**
 * Creates a new user
 * @param email - User email (unique)
 * @param password - Plain text password
 * @param role - User role (default: 'user')
 * @returns Created user (without password)
 * @throws {Error} If email already exists
 */
export async function createUser(
  email: string,
  password: string,
  role: 'admin' | 'user' = 'user'
): Promise<UserResponse> {
  const users = await loadUsers();

  // Check if email already exists
  const existing = Object.values(users).find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
  if (existing) {
    throw new Error('Email already exists');
  }

  // Generate user ID
  const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Hash password
  const passwordHash = hashPassword(password);

  const now = new Date().toISOString();
  const user: User = {
    id,
    email,
    passwordHash,
    role,
    createdAt: now,
    updatedAt: now,
  };

  users[id] = user;
  await saveUsers(users);

  return sanitizeUser(user);
}

/**
 * Finds a user by email
 * @param email - User email
 * @returns User or null if not found
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const users = await loadUsers();
  const user = Object.values(users).find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
  return user || null;
}

/**
 * Finds a user by ID
 * @param id - User ID
 * @returns User or null if not found
 */
export async function findUserById(id: string): Promise<User | null> {
  const users = await loadUsers();
  return users[id] || null;
}

/**
 * Authenticates a user
 * @param email - User email
 * @param password - Plain text password
 * @returns User (without password) if authentication succeeds
 * @throws {Error} If authentication fails
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<UserResponse> {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isValid = verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  // Update last login
  const users = await loadUsers();
  if (users[user.id]) {
    users[user.id].lastLoginAt = new Date().toISOString();
    await saveUsers(users);
  }

  return sanitizeUser(user);
}

/**
 * Updates a user's password
 * @param userId - User ID
 * @param newPassword - New plain text password
 * @throws {Error} If user not found
 */
export async function updatePassword(
  userId: string,
  newPassword: string
): Promise<void> {
  const users = await loadUsers();
  const user = users[userId];

  if (!user) {
    throw new Error('User not found');
  }

  user.passwordHash = hashPassword(newPassword);
  user.updatedAt = new Date().toISOString();

  await saveUsers(users);
}

/**
 * Deletes a user
 * @param userId - User ID
 * @throws {Error} If user not found
 */
export async function deleteUser(userId: string): Promise<void> {
  const users = await loadUsers();

  if (!users[userId]) {
    throw new Error('User not found');
  }

  delete users[userId];
  await saveUsers(users);
}

/**
 * Lists all users (without passwords)
 * @returns Array of users
 */
export async function listUsers(): Promise<UserResponse[]> {
  const users = await loadUsers();
  return Object.values(users).map(sanitizeUser);
}

/**
 * Checks if any users exist in the system
 * @returns True if at least one user exists
 */
export async function hasUsers(): Promise<boolean> {
  const users = await loadUsers();
  return Object.keys(users).length > 0;
}

/**
 * Creates the first admin user (only if no users exist)
 * @param email - Admin email
 * @param password - Admin password
 * @returns Created admin user
 * @throws {Error} If users already exist
 */
export async function createFirstAdmin(
  email: string,
  password: string
): Promise<UserResponse> {
  const usersExist = await hasUsers();
  if (usersExist) {
    throw new Error('Users already exist. Cannot create first admin.');
  }

  return await createUser(email, password, 'admin');
}
