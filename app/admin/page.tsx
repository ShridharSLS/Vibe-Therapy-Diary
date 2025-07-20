'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, Search, Download, Settings, ExternalLink, Trash2, Copy, Edit } from 'lucide-react';
import { getAllDiaries, deleteDiary, createDiary, getCards, createCard, updateDiary } from '@/lib/database';
import { verifyPassword, changePassword } from '@/lib/adminAuth';
import { Diary } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [filteredDiaries, setFilteredDiaries] = useState<Diary[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [deletingDiaryId, setDeletingDiaryId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showDuplicateForm, setShowDuplicateForm] = useState<string | null>(null);
  const [duplicateFormData, setDuplicateFormData] = useState({ clientId: '', name: '', gender: 'Male' as 'Male' | 'Female' | 'Other' });
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicateSuccess, setDuplicateSuccess] = useState<{ diaryId: string; url: string } | null>(null);
  const [showEditForm, setShowEditForm] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ clientId: '', name: '', gender: 'Male' as 'Male' | 'Female' | 'Other' });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadDiaries();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Filter diaries based on search term
    const filtered = diaries.filter(diary =>
      diary.clientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      diary.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      diary.gender.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredDiaries(filtered);
  }, [diaries, searchTerm]);

  const loadDiaries = async () => {
    setIsLoading(true);
    try {
      const allDiaries = await getAllDiaries();
      setDiaries(allDiaries);
    } catch (error) {
      console.error('Error loading diaries:', error);
      toast.error('Failed to load diaries');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsValidating(true);

    try {
      const ok = await verifyPassword(password);
      if (ok) {
        setIsAuthenticated(true);
        toast.success('Admin access granted');
      } else {
        toast.error('Invalid password');
      }
    } catch (error) {
      console.error(error);
      toast.error('Authentication failed');
    } finally {
      setIsValidating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      await changePassword(newPassword);
      toast.success('Password updated');
      setShowChangePassword(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update password');
    }
  };

  const handleDeleteDiary = async (diaryId: string, diaryName: string) => {
    setDeletingDiaryId(diaryId);
    try {
      await deleteDiary(diaryId);
      toast.success(`Diary "${diaryName}" deleted successfully`);
      // Remove from local state for immediate UI update
      setDiaries(prev => prev.filter(d => d.id !== diaryId));
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting diary:', error);
      toast.error('Failed to delete diary');
    } finally {
      setDeletingDiaryId(null);
    }
  };

  const handleDuplicateDiary = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!showDuplicateForm || !duplicateFormData.clientId.trim() || !duplicateFormData.name.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsDuplicating(true);
    
    try {
      // Create new diary with form data
      const newDiaryId = await createDiary(
        duplicateFormData.clientId,
        duplicateFormData.name,
        duplicateFormData.gender
      );
      
      // Get all cards from the original diary
      const originalCards = await getCards(showDuplicateForm);
      
      // Create copies of all cards in the new diary
      for (const card of originalCards) {
        await createCard(
          newDiaryId,
          card.topic,
          card.type,
          card.bodyText,
          card.order
        );
      }
      
      const newDiaryUrl = `/diary/${newDiaryId}`;
      
      setDuplicateSuccess({ diaryId: newDiaryId, url: newDiaryUrl });
      toast.success(`Diary duplicated successfully with ${originalCards.length} cards!`);
      
      // Refresh the diaries list
      loadDiaries();
      
    } catch (error) {
      console.error('Error duplicating diary:', error);
      toast.error('Failed to duplicate diary');
    } finally {
      setIsDuplicating(false);
    }
  };

  const resetDuplicateForm = () => {
    setShowDuplicateForm(null);
    setDuplicateFormData({ clientId: '', name: '', gender: 'Male' });
    setDuplicateSuccess(null);
  };

  const handleEditDiary = (diary: Diary) => {
    setEditFormData({
      clientId: diary.clientId,
      name: diary.name,
      gender: diary.gender
    });
    setShowEditForm(diary.id);
  };

  const handleUpdateDiary = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!showEditForm || !editFormData.clientId.trim() || !editFormData.name.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsUpdating(true);
    
    try {
      await updateDiary(showEditForm, {
        clientId: editFormData.clientId,
        name: editFormData.name,
        gender: editFormData.gender
      });
      
      toast.success('Diary updated successfully!');
      
      // Refresh the diaries list
      loadDiaries();
      
      // Close the modal
      resetEditForm();
      
    } catch (error) {
      console.error('Error updating diary:', error);
      toast.error('Failed to update diary');
    } finally {
      setIsUpdating(false);
    }
  };

  const resetEditForm = () => {
    setShowEditForm(null);
    setEditFormData({ clientId: '', name: '', gender: 'Male' });
  };

  const exportToCSV = () => {
    const headers = ['Client ID', 'Name', 'Gender', 'Diary URL', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...filteredDiaries.map(diary => [
        diary.clientId,
        diary.name,
        diary.gender,
        `${window.location.origin}${diary.url}`,
        formatDate(diary.createdAt)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `therapy-diaries-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('CSV exported successfully');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={24} className="text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Admin Dashboard
            </h1>
            <p className="text-gray-600">
              Enter admin password to access the dashboard
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Admin Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Enter admin password"
                required
                disabled={isValidating}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
              disabled={isValidating}
            >
              {isValidating ? 'Validating...' : 'Access Dashboard'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a
              href="/"
              className="text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              ← Back to Home
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Manage therapy diaries</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowChangePassword(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                <Settings size={18} />
                Change Password
              </button>
              <button
                onClick={() => setIsAuthenticated(false)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Client ID, Name, or Gender..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-80"
              />
            </div>
            <button
              onClick={loadDiaries}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
          
          <button
            onClick={exportToCSV}
            disabled={filteredDiaries.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Eye size={24} className="text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Diaries</p>
                <p className="text-2xl font-bold text-gray-900">{diaries.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Search size={24} className="text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Filtered Results</p>
                <p className="text-2xl font-bold text-gray-900">{filteredDiaries.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Settings size={24} className="text-blue-800" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{diaries.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Diaries Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gender
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    </td>
                  </tr>
                ) : filteredDiaries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No diaries found
                    </td>
                  </tr>
                ) : (
                  filteredDiaries.map((diary) => (
                    <tr key={diary.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {diary.clientId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {diary.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          diary.gender === 'Male' ? 'bg-blue-100 text-blue-800' :
                          diary.gender === 'Female' ? 'bg-pink-100 text-pink-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {diary.gender}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(diary.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <a
                            href={diary.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View Diary"
                            className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <ExternalLink size={16} />
                          </a>
                          <button
                            onClick={() => setShowDuplicateForm(diary.id)}
                            title="Duplicate Diary"
                            className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            onClick={() => handleEditDiary(diary)}
                            title="Edit Diary"
                            className="p-2 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded-lg transition-colors"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(diary.id)}
                            disabled={deletingDiaryId === diary.id}
                            title="Delete Diary"
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {deletingDiaryId === diary.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Change Admin Password</h2>
            
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  minLength={6}
                />
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  minLength={6}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowChangePassword(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Change Password
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Delete Diary</h2>
                <p className="text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete the diary for <strong>
              {diaries.find(d => d.id === showDeleteConfirm)?.name}</strong>? 
              All cards and data will be permanently removed.
            </p>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
                disabled={deletingDiaryId !== null}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const diary = diaries.find(d => d.id === showDeleteConfirm);
                  if (diary) {
                    handleDeleteDiary(diary.id, diary.name);
                  }
                }}
                disabled={deletingDiaryId !== null}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingDiaryId ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  'Delete Diary'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Duplicate Diary Modal */}
      {showDuplicateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full"
          >
            {duplicateSuccess ? (
              // Success State
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Copy size={24} className="text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Diary Duplicated!</h2>
                <p className="text-gray-600 mb-6">
                  The diary has been successfully duplicated with all cards copied.
                </p>
                
                {/* URL Display and Copy */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Diary URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={`${window.location.origin}${duplicateSuccess.url}`}
                      readOnly
                      className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}${duplicateSuccess.url}`);
                        toast.success('URL copied to clipboard!');
                      }}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={resetDuplicateForm}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                  <a
                    href={duplicateSuccess.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-center"
                  >
                    Go to Diary
                  </a>
                </div>
              </div>
            ) : (
              // Form State
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Copy size={24} className="text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Duplicate Diary</h2>
                    <p className="text-gray-600">Create a new diary with copied cards</p>
                  </div>
                </div>
                
                <form onSubmit={handleDuplicateDiary} className="space-y-4">
                  <div>
                    <label htmlFor="duplicateClientId" className="block text-sm font-medium text-gray-700 mb-2">
                      Client ID
                    </label>
                    <input
                      type="text"
                      id="duplicateClientId"
                      value={duplicateFormData.clientId}
                      onChange={(e) => setDuplicateFormData(prev => ({ ...prev, clientId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                      disabled={isDuplicating}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="duplicateName" className="block text-sm font-medium text-gray-700 mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      id="duplicateName"
                      value={duplicateFormData.name}
                      onChange={(e) => setDuplicateFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                      disabled={isDuplicating}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="duplicateGender" className="block text-sm font-medium text-gray-700 mb-2">
                      Gender
                    </label>
                    <select
                      id="duplicateGender"
                      value={duplicateFormData.gender}
                      onChange={(e) => setDuplicateFormData(prev => ({ ...prev, gender: e.target.value as 'Male' | 'Female' | 'Other' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      disabled={isDuplicating}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={resetDuplicateForm}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
                      disabled={isDuplicating}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isDuplicating}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isDuplicating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Duplicating...
                        </>
                      ) : (
                        'Create Duplicate'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Edit Diary Modal */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Edit size={24} className="text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Edit Diary</h2>
                <p className="text-gray-600">Update client information</p>
              </div>
            </div>
            
            <form onSubmit={handleUpdateDiary} className="space-y-4">
              <div>
                <label htmlFor="editClientId" className="block text-sm font-medium text-gray-700 mb-2">
                  Client ID
                </label>
                <input
                  type="text"
                  id="editClientId"
                  value={editFormData.clientId}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, clientId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                  disabled={isUpdating}
                />
              </div>
              
              <div>
                <label htmlFor="editName" className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  id="editName"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                  disabled={isUpdating}
                />
              </div>
              
              <div>
                <label htmlFor="editGender" className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <select
                  id="editGender"
                  value={editFormData.gender}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, gender: e.target.value as 'Male' | 'Female' | 'Other' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  disabled={isUpdating}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetEditForm}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUpdating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Updating...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
