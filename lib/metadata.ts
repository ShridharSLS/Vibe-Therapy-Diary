import { Metadata } from 'next';
import { Diary } from './types';

/**
 * Generates dynamic metadata for diary pages to improve Chrome history searchability
 * Follows SOLID principles with single responsibility for metadata generation
 */
export function generateDiaryMetadata(diary: Diary | null): Metadata {
  // Fallback metadata for loading states or missing diaries
  const fallbackMetadata: Metadata = {
    title: 'Therapy Diary - Before After',
    description: 'A collaborative therapy diary web app',
  };

  if (!diary) {
    return fallbackMetadata;
  }

  // Generate searchable title format: "Client Name (ID: clientId) - Therapy Diary"
  // The template in layout.tsx will append "| Before After" automatically
  const title = `${diary.name} (ID: ${diary.clientId}) - Therapy Diary`;
  
  // Generate descriptive meta description
  const description = `Therapy diary for ${diary.name} (${diary.gender}, ID: ${diary.clientId}). Track progress and insights in this collaborative therapy journal.`;

  return {
    title,
    description,
    // Enhanced meta tags for better indexing
    keywords: [
      'therapy diary',
      'client journal',
      diary.name,
      diary.clientId,
      'before after therapy',
      'therapy progress'
    ].join(', '),
    
    // Open Graph tags for better social sharing and indexing
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'Before After - Therapy Diary',
    },
    
    // Twitter Card tags
    twitter: {
      card: 'summary',
      title,
      description,
    },
    
    // Additional meta tags
    other: {
      'color-scheme': 'light',
      'client-id': diary.clientId,
      'client-name': diary.name,
    },
  };
}

/**
 * Formats diary title for consistent display across the application
 * Follows DRY principle by centralizing title formatting logic
 */
export function formatDiaryTitle(diary: Diary): string {
  return `${diary.name} (ID: ${diary.clientId}) - Therapy Diary`;
}

/**
 * Formats diary description for consistent display across the application
 */
export function formatDiaryDescription(diary: Diary): string {
  return `Therapy diary for ${diary.name} (${diary.gender}, ID: ${diary.clientId}). Track progress and insights in this collaborative therapy journal.`;
}
