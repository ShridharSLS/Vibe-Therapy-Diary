'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit3, Trash2, FileText, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  getAllSituations, updateSituation, deleteSituation,
  saveBeforeAfterItemsFromContent, getBeforeAfterContentForSituation,
  createMultipleSituations
} from '@/lib/situationsDatabase';
import { Situation } from '@/lib/types';
import { BulkAddModal, EditModal, DeleteModal } from '@/components/SituationsModals';
import { BeforeAfterModal } from '@/components/BeforeAfterModal';
import { parseBulletListContent, validateBulletListContent } from '@/lib/beforeAfterParser';
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
    try {
      setIsLoading(true);
      const allSituations = await getAllSituations();
      
      // Load before/after content for each situation
      const situationsWithContent: SituationWithContent[] = [];
      
      for (const situation of allSituations) {
        const content = await getBeforeAfterContentForSituation(situation.id);
        situationsWithContent.push({
          ...situation,
          beforeAfterContent: content
        });
      }
      
      setSituations(situationsWithContent);
    } catch (error) {
      console.error('Error loading situations:', error);
      toast.error('Failed to load situations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSituations();
  }, []);

  // Handle bulk add situations with optimistic UI
  const handleBulkAddSubmit = async (items: string[]) => {
    try {
      setIsBulkAdding(true);
      
      // Optimistic UI: Add situations to state immediately
      const baseTimestamp = Date.now();
      const newSituations = items
        .filter(title => title.trim())
        .map((title, i) => ({
          id: `situation_${baseTimestamp}_${i}_${Math.random().toString(36).substr(2, 6)}`,
          title: title.trim(),
          order: baseTimestamp + i,
          createdAt: new Date(),
          updatedAt: new Date(),
          beforeAfterContent: ''
        }));
      
      // Update UI immediately
      setSituations(prev => [...newSituations, ...prev]);
      setBulkAddModal(null);
      setIsBulkAdding(false);
      toast.success(`Created ${items.length} situation${items.length !== 1 ? 's' : ''}`);
      
      // Create in database in background
      createMultipleSituations(items).catch((error) => {
        // Revert optimistic update on error
        console.error('Error creating situations:', error);
        toast.error('Failed to create situations - reverting changes');
        // Reload to get correct state
        loadSituations();
      });
    } catch (error) {
      console.error('Error creating situations:', error);
      toast.error('Failed to create situations');
      setIsBulkAdding(false);
    }
  };

  // Handle edit situation
  const handleEditSubmit = async (title: string) => {
    if (!editModal) return;
    
    try {
      setIsEditing(true);
      await updateSituation(editModal.id, { title });
      toast.success('Situation updated');
      setEditModal(null);
      await loadSituations();
    } catch (error) {
      console.error('Error updating situation:', error);
      toast.error('Failed to update situation');
    } finally {
      setIsEditing(false);
    }
  };

  // Handle delete situation
  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    
    const situationToDelete = deleteConfirm;
    
    try {
      // Optimistic UI: Remove from state immediately
      setSituations(prev => prev.filter(s => s.id !== situationToDelete.id));
      setDeleteConfirm(null);
      
      // Show success immediately
      toast.success('Situation deleted');
      
      // Delete from database in background
      await deleteSituation(situationToDelete.id);
    } catch (error) {
      console.error('Error deleting situation:', error);
      toast.error('Failed to delete situation');
      
      // Revert optimistic update on error by reloading
      await loadSituations();
    }
  };

  // Handle before/after items save
  const handleBeforeAfterSubmit = async (content: string) => {
    if (!beforeAfterModal) return;
    
    try {
      setIsSavingBeforeAfter(true);
      
      // Validate content
      const validation = validateBulletListContent(content);
      if (!validation.isValid) {
        toast.error(`Invalid format: ${validation.errors[0]}`);
        return;
      }
      
      // Parse content
      const parsedData = parseBulletListContent(content);
      
      // Save to database
      await saveBeforeAfterItemsFromContent(beforeAfterModal.situationId, parsedData);
      
      toast.success('Before & After items saved');
      setBeforeAfterModal(null);
      await loadSituations();
    } catch (error) {
      console.error('Error saving before/after items:', error);
      toast.error('Failed to save before/after items');
    } finally {
      setIsSavingBeforeAfter(false);
    }
  };

  // Handle opening before/after modal for editing
  const handleEditBeforeAfter = (situationId: string, situationTitle: string, existingContent?: string) => {
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
                            onClick={() => setBeforeAfterModal({
                              situationId: situation.id,
                              situationTitle: situation.title,
                              initialContent: '1. '
                            })}
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

      {/* Modals */}
      <AnimatePresence>
        {bulkAddModal && (
          <BulkAddModal
            isOpen={true}
            type={bulkAddModal.type}
            title={bulkAddModal.title}
            onSubmit={handleBulkAddSubmit}
            onClose={() => setBulkAddModal(null)}
            isLoading={isBulkAdding}
          />
        )}

        {editModal && (
          <EditModal
            isOpen={true}
            type={editModal.type}
            currentTitle={editModal.currentTitle}
            onSubmit={handleEditSubmit}
            onClose={() => setEditModal(null)}
            isLoading={isEditing}
          />
        )}

        {deleteConfirm && (
          <DeleteModal
            isOpen={true}
            type={deleteConfirm.type}
            title={deleteConfirm.title}
            onConfirm={handleDeleteConfirm}
            onClose={() => setDeleteConfirm(null)}
          />
        )}

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
      </AnimatePresence>
    </div>
  );
}
