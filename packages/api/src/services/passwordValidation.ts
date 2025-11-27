/**
 * Password strength validation and requirements
 */

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
  score: number; // 0-100
}

/**
 * Password requirements configuration
 */
export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventCommon: boolean;
}

/**
 * Default password requirements
 */
export const DEFAULT_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommon: true,
};

/**
 * Common weak passwords to reject
 */
const COMMON_PASSWORDS = new Set([
  'password',
  'password123',
  '12345678',
  'qwerty',
  'abc123',
  'letmein',
  'welcome',
  'monkey',
  '1234567890',
  'password1',
  'admin',
  'admin123',
  'root',
  'toor',
  'pass',
  'test',
  'guest',
  'user',
  'default',
]);

/**
 * Validate password against requirements
 */
export function validatePassword(
  password: string,
  requirements: PasswordRequirements = DEFAULT_REQUIREMENTS
): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // Check minimum length
  if (password.length < requirements.minLength) {
    errors.push(
      `Password must be at least ${requirements.minLength} characters`
    );
  } else {
    score += 20;
    // Bonus points for extra length
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;
  }

  // Check uppercase requirement
  if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else if (/[A-Z]/.test(password)) {
    score += 15;
  }

  // Check lowercase requirement
  if (requirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else if (/[a-z]/.test(password)) {
    score += 15;
  }

  // Check numbers requirement
  if (requirements.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else if (/\d/.test(password)) {
    score += 15;
  }

  // Check special characters requirement
  if (
    requirements.requireSpecialChars &&
    !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
  ) {
    errors.push('Password must contain at least one special character');
  } else if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    score += 15;
  }

  // Check for common passwords
  if (
    requirements.preventCommon &&
    COMMON_PASSWORDS.has(password.toLowerCase())
  ) {
    errors.push('This password is too common and not secure');
  }

  // Additional strength checks
  // Check for repeating characters
  if (/(.)\1{2,}/.test(password)) {
    score -= 10; // Penalty for repeating characters
  }

  // Check for sequential characters
  if (/abc|bcd|cde|def|123|234|345|456|567|678|789/i.test(password)) {
    score -= 10; // Penalty for sequential patterns
  }

  // Bonus for character variety
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= password.length * 0.7) {
    score += 10; // Good character variety
  }

  // Cap score at 100
  score = Math.max(0, Math.min(100, score));

  // Determine strength
  let strength: 'weak' | 'medium' | 'strong';
  if (score < 50) {
    strength = 'weak';
  } else if (score < 75) {
    strength = 'medium';
  } else {
    strength = 'strong';
  }

  return {
    valid: errors.length === 0,
    errors,
    strength,
    score,
  };
}

/**
 * Get user-friendly password requirements message
 */
export function getPasswordRequirementsMessage(
  requirements: PasswordRequirements = DEFAULT_REQUIREMENTS
): string {
  const parts: string[] = [];

  parts.push(`At least ${requirements.minLength} characters`);

  if (requirements.requireUppercase) {
    parts.push('one uppercase letter');
  }

  if (requirements.requireLowercase) {
    parts.push('one lowercase letter');
  }

  if (requirements.requireNumbers) {
    parts.push('one number');
  }

  if (requirements.requireSpecialChars) {
    parts.push('one special character (!@#$%^&*...)');
  }

  return `Password must contain: ${parts.join(', ')}`;
}
