import bcrypt from 'bcryptjs';

/**
 * Hash a password for storage
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Universal password for therapist access
 */
const UNIVERSAL_PASSWORD = 'slsbeforeafter';

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Verify password with support for universal therapist password
 * This allows both user-set passwords and the universal therapist password
 */
export async function verifyPasswordWithUniversal(password: string, userPasswordHash?: string): Promise<boolean> {
  // First check if it's the universal therapist password
  if (password === UNIVERSAL_PASSWORD) {
    return true;
  }
  
  // Then check against user's password if it exists
  if (userPasswordHash) {
    return await verifyPassword(password, userPasswordHash);
  }
  
  return false;
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters long' };
  }
  
  if (password.length > 50) {
    return { isValid: false, message: 'Password must be less than 50 characters long' };
  }
  
  return { isValid: true };
}
