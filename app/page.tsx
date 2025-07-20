'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Copy, ArrowRight } from 'lucide-react';
import { createDiary } from '@/lib/database';
import { isValidClientId, isValidName, copyToClipboard } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function HomePage() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    clientId: '',
    name: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [createdDiary, setCreatedDiary] = useState<{
    id: string;
    url: string;
    name: string;
  } | null>(null);

  const handleCreateDiary = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidClientId(formData.clientId)) {
      toast.error('Client ID must be between 3-50 characters');
      return;
    }
    
    if (!isValidName(formData.name)) {
      toast.error('Name must be between 2-100 characters');
      return;
    }

    setIsLoading(true);
    
    try {
      const diaryId = await createDiary(
        formData.clientId,
        formData.name,
        formData.gender
      );
      
      const diaryUrl = `${window.location.origin}/diary/${diaryId}`;
      
      setCreatedDiary({
        id: diaryId,
        url: diaryUrl,
        name: formData.name,
      });
      
      toast.success('Therapy diary created successfully!');
    } catch (error) {
      toast.error('Failed to create diary. Please try again.');
      console.error('Error creating diary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    if (createdDiary) {
      const success = await copyToClipboard(createdDiary.url);
      if (success) {
        toast.success('URL copied to clipboard!');
      } else {
        toast.error('Failed to copy URL');
      }
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setCreatedDiary(null);
    setFormData({
      clientId: '',
      name: '',
      gender: 'Male',
    });
  };

  if (createdDiary) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="text-green-600 text-2xl"
              >
                ✓
              </motion.div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Your diary is ready!
            </h2>
            <p className="text-gray-600">
              Hello {createdDiary.name}, your therapy diary has been created.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">Your diary URL:</p>
            <p className="text-sm font-mono bg-white p-2 rounded border break-all">
              {createdDiary.url}
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleCopyUrl}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Copy size={18} />
              Copy URL
            </button>
            
            <a
              href={`/diary/${createdDiary.id}`}
              className="w-full bg-blue-800 hover:bg-blue-900 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <ArrowRight size={18} />
              Go to Therapy Diary
            </a>
            
            <button
              onClick={resetForm}
              className="w-full text-gray-600 hover:text-gray-800 font-medium py-2 transition-colors"
            >
              Create Another Diary
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Before After
          </h1>
          <p className="text-gray-600">
            Your collaborative therapy diary
          </p>
        </div>

        {!showForm ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="mb-8">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen size={32} className="text-blue-800" />
              </div>
            </div>
            
            <button
              onClick={() => setShowForm(true)}
              className="w-full bg-blue-800 hover:bg-blue-900 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Create New Therapy Diary
            </button>
          </motion.div>
        ) : (
          <motion.form
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={handleCreateDiary}
            className="space-y-6"
          >
            <div>
              <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-2">
                Client ID
              </label>
              <input
                type="text"
                id="clientId"
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent"
                placeholder="Enter your client ID"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent"
                placeholder="Enter your name"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <select
                id="gender"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'Male' | 'Female' | 'Other' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent"
                disabled={isLoading}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
                disabled={isLoading}
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-800 hover:bg-blue-900 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Create Diary'}
              </button>
            </div>
          </motion.form>
        )}
      </motion.div>
    </div>
  );
}
