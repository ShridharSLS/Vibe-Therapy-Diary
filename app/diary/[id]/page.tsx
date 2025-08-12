import { Metadata } from 'next';
import { getDiary } from '@/lib/database';
import { generateDiaryMetadata } from '@/lib/metadata';
import DiaryPageClient from '@/components/DiaryPageClient';

interface DiaryPageProps {
  params: {
    id: string;
  };
}

/**
 * Generates dynamic metadata for diary pages to improve Chrome history searchability
 * This function runs on the server side and enables proper SEO and browser indexing
 */
export async function generateMetadata({ params }: DiaryPageProps): Promise<Metadata> {
  try {
    const diary = await getDiary(params.id);
    return generateDiaryMetadata(diary);
  } catch (error) {
    console.error('Error generating metadata for diary:', params.id, error);
    // Return fallback metadata to maintain functionality
    return generateDiaryMetadata(null);
  }
}

/**
 * Server-side diary page component that handles metadata generation
 * Delegates client-side functionality to DiaryPageClient component
 * Maintains backward compatibility with existing URLs and functionality
 */
export default async function DiaryPage({ params }: DiaryPageProps) {
  const diaryId = params.id;
  
  // Pre-fetch diary data on server side for better performance and SEO
  // This also ensures metadata generation has access to diary data
  let initialDiary = null;
  try {
    initialDiary = await getDiary(diaryId);
  } catch (error) {
    console.error('Error pre-fetching diary data:', error);
    // Don't throw error here - let client component handle it for better UX
  }

  return (
    <DiaryPageClient 
      diaryId={diaryId} 
      initialDiary={initialDiary}
    />
  );
}
