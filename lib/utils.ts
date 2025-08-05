import { nanoid } from 'nanoid';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

// Generate a unique diary URL
export const generateDiaryId = (): string => {
  return nanoid(8); // 8 character random string
};

// Generate a unique diary ID using timestamp + nanoid (no database queries needed)
export const generateUniqueDiaryId = (): string => {
  // Timestamp ensures uniqueness across time, nanoid ensures uniqueness within same millisecond
  return `diary_${Date.now()}_${nanoid(6)}`;
};

// Legacy function kept for backward compatibility (now unused)
export const isDiaryIdUnique = async (diaryId: string): Promise<boolean> => {
  try {
    const diariesRef = collection(db, 'diaries');
    const q = query(diariesRef, where('id', '==', diaryId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
  } catch (error) {
    console.error('Error checking diary ID uniqueness:', error);
    return false;
  }
};

// Format date for display
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

// Validate client ID format
export const isValidClientId = (clientId: string): boolean => {
  return clientId.trim().length >= 3 && clientId.trim().length <= 50;
};

// Validate name format
export const isValidName = (name: string): boolean => {
  return name.trim().length >= 2 && name.trim().length <= 100;
};

// Copy text to clipboard
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

// Character count for rich text (strip HTML tags)
export const getTextLength = (html: string): number => {
  if (!html) return 0;
  
  // Simple HTML tag stripping for character counting
  return html.replace(/<[^>]*>/g, '').length;
};

// Truncate text with ellipsis
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};
