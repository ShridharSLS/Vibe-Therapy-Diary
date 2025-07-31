import bcrypt from 'bcryptjs';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Hash a password for storage
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Get the universal therapist password from Firestore
 */
export async function getUniversalPassword(): Promise<string> {
  try {
    const settingsRef = doc(db, 'settings', 'universal');
    const settingsDoc = await getDoc(settingsRef);
    
    if (settingsDoc.exists()) {
      return settingsDoc.data().password || 'slsbeforeafter'; // fallback to default
    } else {
      // Initialize with default password if not exists
      await setDoc(settingsRef, { password: 'slsbeforeafter' });
      return 'slsbeforeafter';
    }
  } catch (error) {
    console.error('Error getting universal password:', error);
    return 'slsbeforeafter'; // fallback to default
  }
}

/**
 * Update the universal therapist password in Firestore
 */
export async function setUniversalPassword(newPassword: string): Promise<void> {
  try {
    const settingsRef = doc(db, 'settings', 'universal');
    await setDoc(settingsRef, { password: newPassword });
  } catch (error) {
    console.error('Error setting universal password:', error);
    throw new Error('Failed to update universal password');
  }
}

/**
 * Verify password with support for universal therapist password
 * This allows both user-set passwords and the universal therapist password
 */
export async function verifyPasswordWithUniversal(password: string, userPasswordHash?: string): Promise<boolean> {
  // First check if it's the universal therapist password
  const universalPassword = await getUniversalPassword();
  if (password === universalPassword) {
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
