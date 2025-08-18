'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit3, Trash2, FileText, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  getAllSituations, 
  createMultipleSituations, 
  updateSituation, 
  deleteSituation,
  saveBeforeAfterItemsFromContent,
  cleanupCorruptedSituations,
  getBeforeAfterContentForSituation
} from '@/lib/situationsDatabase';
import { parseBulletListContent } from '@/lib/beforeAfterParser';
import { Situation } from '@/lib/types';
import { BulkAddModal, EditModal, DeleteModal } from '@/components/SituationsModals';
import { BeforeAfterModal } from '@/components/BeforeAfterModal';
import { validateBulletListContent } from '@/lib/beforeAfterParser';
import toast from 'react-hot-toast';

interface SituationWithContent extends Situation {
  beforeAfterContent: string;
}

export default function SituationsPage() {
  const [situations, setSituations] = useState<SituationWithContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [collapsedSituations, setCollapsedSituations] = useState<Set<string>>(new Set());
  
  // Modal states
  const [bulkAddModal, setBulkAddModal] = useState<{
    type: 'situation';
    title: string;
  } | null>(null);
  const [editModal, setEditModal] = useState<{
    type: 'situation';
    id: string;
    currentTitle: string;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'situation';
    id: string;
    title: string;
  } | null>(null);
  const [beforeAfterModal, setBeforeAfterModal] = useState<{
    situationId: string;
    situationTitle: string;
    initialContent?: string;
  } | null>(null);
  

  
  // Loading states
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingBeforeAfter, setIsSavingBeforeAfter] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingSituation, setIsDeletingSituation] = useState(false);
  const [isAnyModalSubmitting, setIsAnyModalSubmitting] = useState(false);

  // Toggle situation collapse/expand
  const toggleSituationCollapse = (situationId: string) => {
    setCollapsedSituations(prev => {
      const newSet = new Set(Array.from(prev));
      if (newSet.has(situationId)) {
        newSet.delete(situationId);
      } else {
        newSet.add(situationId);
      }
      return newSet;
    });
  };

  // Load all situations and their before/after content
  const loadSituations = async () => {
    console.log('🔍 RELOAD START: loadSituations called');
    try {
      setIsLoading(true);
      const allSituations = await getAllSituations();
      console.log('🔍 RELOAD: Found situations:', allSituations.map(s => ({ id: s.id, title: s.title })));
      
      // Load before/after content for each situation
      const situationsWithContent: SituationWithContent[] = [];
      
      for (const situation of allSituations) {
        console.log('🔍 RELOAD: Loading content for situation:', situation.id, 'title:', situation.title);
        const content = await getBeforeAfterContentForSituation(situation.id);
        console.log('🔍 RELOAD: Content loaded for', situation.id, ':', content.length, 'characters');
        situationsWithContent.push({
          ...situation,
          beforeAfterContent: content
        });
      }
      
      console.log('🔍 RELOAD: Setting state with situations:', situationsWithContent.map(s => ({ id: s.id, title: s.title, contentLength: s.beforeAfterContent.length })));
      setSituations(situationsWithContent);
      console.log('🔍 RELOAD COMPLETE: State updated successfully');
    } catch (error) {
      console.error('❌ Error loading situations:', error);
      toast.error('Failed to load situations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Clean up any corrupted data first, then load situations
    const initializeData = async () => {
      await cleanupCorruptedSituations();
      await loadSituations();
    };
    initializeData();
  }, []);

  // Handle bulk add situations with database-first approach
  const handleBulkAddSubmit = async (items: string[]) => {
    if (isAnyModalSubmitting) return;

    setIsAnyModalSubmitting(true);
    setIsBulkAdding(true);

    try {
      // 1. Create situations in DB and get them back with permanent IDs
      const newSituations = await createMultipleSituations(items);
      console.log('✅ Received new situations from DB:', newSituations);

      // 2. Update UI state with the permanent data
      const situationsWithContent = newSituations.map(s => ({ ...s, beforeAfterContent: '' }));
      setSituations(prev => [...situationsWithContent, ...prev]);

      toast.success(`Created ${items.length} situation${items.length !== 1 ? 's' : ''}`);
    } catch (error) {
      console.error('❌ Error creating situations:', error);
      toast.error('Failed to create situations. Please try again.');
    } finally {
      // 3. Close modal and reset loading states
      setBulkAddModal(null);
      setIsBulkAdding(false);
      setIsAnyModalSubmitting(false);
    }
  };

  // Handle edit situation
  const handleEditSubmit = async (newTitle: string) => {
    console.log('🔄 EditModal submit started');
    console.log('🔒 Checking global modal submission lock:', isAnyModalSubmitting);
    
    // Prevent multiple modal submissions
    if (isAnyModalSubmitting) {
      console.log('⚠️ Another modal is already submitting, blocking this submission');
      return;
    }
    
    if (!editModal) return;

    try {
      setIsAnyModalSubmitting(true);
      setIsEditing(true);
      
      if (editModal.type === 'situation') {
        await updateSituation(editModal.id, { title: newTitle });
        setSituations(prev => prev.map(s => 
          s.id === editModal.id ? { ...s, title: newTitle } : s
        ));
        toast.success('Situation updated');
      }
      
      setEditModal(null);
      console.log('✅ EditModal submit completed');
    } catch (error) {
      console.error('❌ Error updating:', error);
      toast.error('Failed to update');
    } finally {
      setIsEditing(false);
      setIsAnyModalSubmitting(false);
    }
  };

  // Handle delete situation
  const handleDeleteConfirm = async () => {
    console.log('🔄 DeleteModal confirm started');
    console.log('🔒 Checking global modal submission lock:', isAnyModalSubmitting);
    
    // Prevent multiple modal submissions
    if (isAnyModalSubmitting) {
      console.log('⚠️ Another modal is already submitting, blocking this submission');
      return;
    }
    
    if (!deleteConfirm) return;
    
    const situationToDelete = deleteConfirm;
    
    try {
      setIsDeletingSituation(true);
      
      // Delete from database FIRST
      await deleteSituation(situationToDelete.id);
      
      // Only update UI after successful database operation
      setSituations(prev => prev.filter(s => s.id !== situationToDelete.id));
      setDeleteConfirm(null);
      toast.success('Situation deleted');
    } catch (error) {
      console.error('Error deleting situation:', error);
      toast.error('Failed to delete situation');
      setDeleteConfirm(null);
    } finally {
      setIsDeletingSituation(false);
    }
  };

  // Handle before/after items save
  const handleBeforeAfterSubmit = async (content: string) => {
    console.log('🔄 BeforeAfterModal submit started');
    console.log('🔒 Checking global modal submission lock:', isAnyModalSubmitting);
    
    // Prevent multiple modal submissions
    if (isAnyModalSubmitting) {
      console.log('⚠️ Another modal is already submitting, blocking this submission');
      return;
    }
    
    console.log('📝 Modal situation ID:', beforeAfterModal?.situationId);
    console.log('📄 Content to save:', content.substring(0, 100) + '...');
    
    if (!beforeAfterModal) return;

    try {
      setIsAnyModalSubmitting(true);
      setIsSavingBeforeAfter(true);
      
      // Parse the content into before and after items
      const parsedData = parseBulletListContent(content);
      console.log('📊 Parsed data:', parsedData);
      
      // Save the before/after items
      await saveBeforeAfterItemsFromContent(beforeAfterModal.situationId, parsedData);
      
      // Close modal and reload situations
      setBeforeAfterModal(null);
      console.log('🔄 Reloading situations after save...');
      console.log('🔍 RELOAD: About to call loadSituations...');
      await loadSituations();
      console.log('✅ UI refresh completed!');
    } catch (error) {
      console.error('Error saving before/after items:', error);
      toast.error('Failed to save before/after items');
    } finally {
      setIsSavingBeforeAfter(false);
      setIsAnyModalSubmitting(false);
    }
  };

  // Handle opening before/after modal for editing
  const handleEditBeforeAfter = (situationId: string, situationTitle: string, existingContent?: string) => {
    // Close all other modals first to prevent conflicts
    setBulkAddModal(null);
    setEditModal(null);
    setDeleteConfirm(null);
    
    // Use existing content if available, otherwise default to '1. '
    setBeforeAfterModal({
      situationId,
      situationTitle,
      initialContent: existingContent || '1. '
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading situations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.history.back()}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={20} />
                Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Situations Management</h1>
                <p className="text-gray-600 mt-1">Manage situations and their before/after items</p>
              </div>
            </div>
            <button
              onClick={() => setBulkAddModal({ type: 'situation', title: 'Add Multiple Situations' })}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={20} />
              Add Situations
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {situations.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No situations yet</h3>
            <p className="text-gray-600 mb-6">Get started by adding your first situation</p>
            <button
              onClick={() => setBulkAddModal({ type: 'situation', title: 'Add Multiple Situations' })}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Add Situations
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {situations.map((situation) => (
              <motion.div
                key={situation.id}
                layout
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* Situation Header - Shorter */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => toggleSituationCollapse(situation.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title={collapsedSituations.has(situation.id) ? 'Expand' : 'Collapse'}
                      >
                        {collapsedSituations.has(situation.id) ? (
                          <ChevronDown size={20} />
                        ) : (
                          <ChevronUp size={20} />
                        )}
                      </button>
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText size={16} className="text-blue-600" />
                      </div>
                      <h3 
                        className="text-lg font-semibold text-gray-900 flex-1 cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => setEditModal({
                          type: 'situation',
                          id: situation.id,
                          currentTitle: situation.title
                        })}
                        title="Click to edit situation title"
                      >
                        {situation.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditModal({
                          type: 'situation',
                          id: situation.id,
                          currentTitle: situation.title
                        })}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit situation"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({
                          type: 'situation',
                          id: situation.id,
                          title: situation.title
                        })}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete situation"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Before/After Content - Collapsible */}
                <AnimatePresence>
                  {!collapsedSituations.has(situation.id) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6">
                        {situation.beforeAfterContent ? (
                          <div
                            onClick={() => handleEditBeforeAfter(situation.id, situation.title, situation.beforeAfterContent)}
                            className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors border border-gray-200"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <h4 className="font-medium text-gray-900">Before & After Items</h4>
                              <Edit3 size={16} className="text-gray-400" />
                            </div>
                            <div className="text-sm text-gray-700 font-mono whitespace-pre-wrap">
                              {situation.beforeAfterContent}
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              // Close all other modals first to prevent conflicts
                              setBulkAddModal(null);
                              setEditModal(null);
                              setDeleteConfirm(null);
                              
                              setBeforeAfterModal({
                                situationId: situation.id,
                                situationTitle: situation.title,
                                initialContent: '1. '
                              });
                            }}
                            className="w-full bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center transition-colors"
                          >
                            <Plus size={24} className="mx-auto text-gray-400 mb-2" />
                            <p className="text-gray-600 font-medium">Add Before & After Items</p>
                            <p className="text-sm text-gray-500 mt-1">Click to add before and after items for this situation</p>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modals - Only one modal can be open at a time */}
      <AnimatePresence>
        {beforeAfterModal && (
          <BeforeAfterModal
            isOpen={true}
            situationTitle={beforeAfterModal.situationTitle}
            initialContent={beforeAfterModal.initialContent}
            onSubmit={handleBeforeAfterSubmit}
            onClose={() => setBeforeAfterModal(null)}
            isLoading={isSavingBeforeAfter}
          />
        )}

        {!beforeAfterModal && bulkAddModal && (
          <BulkAddModal
            isOpen={true}
            type={bulkAddModal.type}
            title={bulkAddModal.title}
            onSubmit={handleBulkAddSubmit}
            onClose={() => setBulkAddModal(null)}
            isLoading={isBulkAdding}
          />
        )}

        {!beforeAfterModal && !bulkAddModal && editModal && (
          <EditModal
            isOpen={true}
            type={editModal.type}
            currentTitle={editModal.currentTitle}
            onSubmit={handleEditSubmit}
            onClose={() => setEditModal(null)}
            isLoading={isEditing}
          />
        )}

        {!beforeAfterModal && !bulkAddModal && !editModal && deleteConfirm && (
          <DeleteModal
            isOpen={true}
            type={deleteConfirm.type}
            title={deleteConfirm.title}
            onConfirm={handleDeleteConfirm}
            onClose={() => setDeleteConfirm(null)}
            isLoading={isDeletingSituation}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
