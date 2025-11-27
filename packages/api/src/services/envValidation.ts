/**
 * Environment variable validation and startup checks
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate required environment variables on startup
 */
export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Critical: JWT_SECRET must be set and strong
  const jwtSecret = process.env['JWT_SECRET'];
  if (!jwtSecret) {
    errors.push('JWT_SECRET environment variable is required');
  } else if (jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  } else if (jwtSecret.length < 64) {
    warnings.push('JWT_SECRET is less than 64 characters (64+ recommended)');
  }

  // Critical: ENCRYPTION_KEY must be set and strong
  const encryptionKey = process.env['ENCRYPTION_KEY'];
  if (!encryptionKey) {
    errors.push('ENCRYPTION_KEY environment variable is required');
  } else if (encryptionKey.length < 32) {
    errors.push('ENCRYPTION_KEY must be at least 32 characters long');
  } else if (encryptionKey.length < 64) {
    warnings.push(
      'ENCRYPTION_KEY is less than 64 characters (64+ recommended)'
    );
  }

  // Warning: NODE_ENV should be set in production
  const nodeEnv = process.env['NODE_ENV'];
  if (!nodeEnv) {
    warnings.push('NODE_ENV is not set (defaults to development)');
  } else if (
    nodeEnv === 'production' &&
    (!jwtSecret || !encryptionKey || jwtSecret.length < 64)
  ) {
    warnings.push(
      'Production environment detected but security keys may be weak'
    );
  }

  // Warning: Rate limiting configuration
  const rateLimitMax = process.env['RATE_LIMIT_MAX'];
  if (rateLimitMax && Number.isNaN(Number(rateLimitMax))) {
    warnings.push('RATE_LIMIT_MAX is not a valid number (defaults to 100)');
  }

  const rateLimitWindow = process.env['RATE_LIMIT_WINDOW'];
  if (rateLimitWindow && Number.isNaN(Number(rateLimitWindow))) {
    warnings.push(
      'RATE_LIMIT_WINDOW is not a valid number (defaults to 60000)'
    );
  }

  // Warning: CORS configuration in production
  if (nodeEnv === 'production') {
    const allowedOrigins = process.env['ALLOWED_ORIGINS'];
    if (!allowedOrigins) {
      warnings.push(
        'ALLOWED_ORIGINS not set in production (CORS will be disabled)'
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Print validation results to console with color
 */
export function printValidationResults(result: ValidationResult): void {
  if (result.errors.length > 0) {
    console.error('\n🚨 Environment Validation FAILED:\n');
    result.errors.forEach((error) => {
      console.error(`   ❌ ${error}`);
    });
    console.error('');
  }

  if (result.warnings.length > 0) {
    console.warn('\n⚠️  Environment Warnings:\n');
    result.warnings.forEach((warning) => {
      console.warn(`   ⚠️  ${warning}`);
    });
    console.warn('');
  }

  if (result.valid && result.warnings.length === 0) {
    console.log('✅ Environment validation passed\n');
  }
}

/**
 * Validate environment and exit if critical errors are found
 */
export function validateOrExit(): void {
  const result = validateEnvironment();
  printValidationResults(result);

  if (!result.valid) {
    console.error('❌ Cannot start server with invalid environment\n');
    console.error('To fix:');
    console.error('1. Create a .env file in the project root');
    console.error('2. Generate secure keys:');
    console.error(
      "   node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
    console.error('3. Add to .env:');
    console.error('   JWT_SECRET=your-generated-secret');
    console.error('   ENCRYPTION_KEY=your-generated-key\n');
    process.exit(1);
  }
}
