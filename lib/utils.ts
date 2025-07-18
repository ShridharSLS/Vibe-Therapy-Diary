import { nanoid } from 'nanoid';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

// Generate a unique diary URL
export const generateDiaryId = (): string => {
  return nanoid(8); // 8 character random string
};

// Check if diary ID is unique
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

// Generate a unique diary ID
export const generateUniqueDiaryId = async (): Promise<string> => {
  let diaryId = generateDiaryId();
  let isUnique = await isDiaryIdUnique(diaryId);
  
  while (!isUnique) {
    diaryId = generateDiaryId();
    isUnique = await isDiaryIdUnique(diaryId);
  }
  
  return diaryId;
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
  
  // Import stripHtml function dynamically to avoid build issues
  if (typeof window !== 'undefined') {
    // Client-side
    const { stripHtml } = require('./sanitize');
    return stripHtml(html).length;
  }
  
  // Fallback for server-side
  return html.replace(/<[^>]*>/g, '').length;
};

// Truncate text with ellipsis
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};
