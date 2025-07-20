'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getDiary } from '@/lib/database';
import { Diary } from '@/lib/types';
import DiaryInterface from '@/components/DiaryInterface';
import toast from 'react-hot-toast';

export default function DiaryPage() {
  const params = useParams();
  const router = useRouter();
  const diaryId = params.id as string;
  
  const [diary, setDiary] = useState<Diary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDiary = async () => {
      try {
        const diaryData = await getDiary(diaryId);
        if (!diaryData) {
          toast.error('Diary not found');
          router.push('/');
          return;
        }
        setDiary(diaryData);
      } catch (error) {
        console.error('Error loading diary:', error);
        toast.error('Failed to load diary');
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    if (diaryId) {
      loadDiary();
    }
  }, [diaryId, router]);



  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800"></div>
      </div>
    );
  }

  if (!diary) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Diary Not Found</h1>
          <p className="text-gray-600 mb-6">The diary you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-800 hover:bg-blue-900 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen">
      <DiaryInterface diary={diary} />
    </div>
  );
}
