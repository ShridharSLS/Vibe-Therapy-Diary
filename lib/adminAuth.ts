import bcrypt from 'bcryptjs';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const SETTINGS_DOC = doc(db, 'settings', 'admin');

/**
 * Returns the stored password hash (creates default if missing).
 */
export async function getPasswordHash(): Promise<string> {
  const snap = await getDoc(SETTINGS_DOC);
  if (snap.exists()) {
    // @ts-ignore
    const { passwordHash } = snap.data();
    if (passwordHash) return passwordHash as string;
  }
  // seed default password "Password"
  const defaultHash = bcrypt.hashSync('Password', 10);
  await setDoc(SETTINGS_DOC, { passwordHash: defaultHash });
  return defaultHash;
}

export async function verifyPassword(plain: string): Promise<boolean> {
  const hash = await getPasswordHash();
  return bcrypt.compareSync(plain, hash);
}

export async function changePassword(newPlain: string): Promise<void> {
  const newHash = bcrypt.hashSync(newPlain, 10);
  await updateDoc(SETTINGS_DOC, { passwordHash: newHash });
}
