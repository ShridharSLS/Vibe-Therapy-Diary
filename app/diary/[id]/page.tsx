'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Lock } from 'lucide-react';
import { getDiary, validateDiaryAccess } from '@/lib/database';
import { Diary } from '@/lib/types';
import DiaryInterface from '@/components/DiaryInterface';
import toast from 'react-hot-toast';

export default function DiaryPage() {
  const params = useParams();
  const router = useRouter();
  const diaryId = params.id as string;
  
  const [diary, setDiary] = useState<Diary | null>(null);
  const [clientId, setClientId] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);

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

  const handleAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientId.trim()) {
      toast.error('Please enter your Client ID');
      return;
    }

    setIsValidating(true);
    
    try {
      const isValid = await validateDiaryAccess(diaryId, clientId);
      
      if (isValid) {
        setIsAuthenticated(true);
        toast.success(`Welcome back, ${diary?.name}!`);
      } else {
        toast.error('Invalid Client ID. Please check and try again.');
      }
    } catch (error) {
      console.error('Error validating access:', error);
      toast.error('Failed to validate access. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={24} className="text-blue-800" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Access Therapy Diary
            </h1>
            <p className="text-gray-600">
              Enter your Client ID to access this diary
            </p>
          </div>

          <form onSubmit={handleAccessSubmit} className="space-y-6">
            <div>
              <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-2">
                Client ID
              </label>
              <input
                type="text"
                id="clientId"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent"
                placeholder="Enter your client ID"
                required
                disabled={isValidating}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-800 hover:bg-blue-900 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              disabled={isValidating}
            >
              {isValidating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Validating...
                </>
              ) : (
                <>
                  <ArrowRight size={18} />
                  Access Diary
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              ← Back to Home
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <DiaryInterface diary={diary} />
    </div>
  );
}
