'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit3, Trash2, FileText, ArrowLeft } from 'lucide-react';
import { 
  getAllSituations, updateSituation, deleteSituation,
  saveBeforeAfterItemsFromContent, getBeforeAfterContentForSituation
} from '@/lib/situationsDatabase';
import { Situation } from '@/lib/types';
import { BulkAddModal, EditModal, DeleteModal } from '@/components/SituationsModals';
import { BeforeAfterModal } from '@/components/BeforeAfterModal';
import { parseBulletListContent, validateBulletListContent } from '@/lib/beforeAfterParser';
import toast from 'react-hot-toast';

interface SituationWithItems extends Situation {
  beforeItems: (BeforeItem & { afterItems: AfterItem[] })[];
}

export default function SituationsPage() {
  const [situations, setSituations] = useState<SituationWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSituations, setExpandedSituations] = useState<Set<string>>(new Set());
  const [expandedBeforeItems, setExpandedBeforeItems] = useState<Set<string>>(new Set());
  
  // Modal states
  const [bulkAddModal, setBulkAddModal] = useState<{
    type: 'situation' | 'before' | 'after';
    title: string;
    situationId?: string;
    beforeItemId?: string;
  } | null>(null);
  const [editModal, setEditModal] = useState<{
    type: 'situation' | 'before' | 'after';
    id: string;
    currentTitle: string;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'situation' | 'before' | 'after';
    id: string;
    title: string;
  } | null>(null);
  
  // Track deletion in progress
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set());
  
  // Loading states
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadSituations();
  }, []);

  const loadSituations = async () => {
    try {
      setIsLoading(true);
      const situationsData = await getAllSituations();
      
      const situationsWithItems: SituationWithItems[] = [];
      
      for (const situation of situationsData) {
        const beforeItems = await getBeforeItems(situation.id);
        const beforeItemsWithAfter = [];
        
        for (const beforeItem of beforeItems) {
          const afterItems = await getAfterItems(beforeItem.id);
          beforeItemsWithAfter.push({ ...beforeItem, afterItems });
        }
        
        situationsWithItems.push({ ...situation, beforeItems: beforeItemsWithAfter });
      }
      
      setSituations(situationsWithItems);
    } catch (error) {
      console.error('Error loading situations:', error);
      toast.error('Failed to load situations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkAdd = async (items: string[]) => {
    if (!bulkAddModal) return;
    
    setIsBulkAdding(true);
    try {
      switch (bulkAddModal.type) {
        case 'situation':
          await createMultipleSituations(items);
          toast.success(`Created ${items.length} situation${items.length !== 1 ? 's' : ''} successfully`);
          break;
        case 'before':
          if (bulkAddModal.situationId) {
            await createMultipleBeforeItems(bulkAddModal.situationId, items);
            toast.success(`Created ${items.length} before item${items.length !== 1 ? 's' : ''} successfully`);
          }
          break;
        case 'after':
          if (bulkAddModal.beforeItemId) {
            await createMultipleAfterItems(bulkAddModal.beforeItemId, items);
            toast.success(`Created ${items.length} after item${items.length !== 1 ? 's' : ''} successfully`);
          }
          break;
      }
      setBulkAddModal(null);
      loadSituations();
    } catch (error) {
      toast.error(`Failed to create ${bulkAddModal.type} items`);
    } finally {
      setIsBulkAdding(false);
    }
  };

  const handleEdit = async (title: string) => {
    if (!editModal) return;
    
    setIsEditing(true);
    try {
      switch (editModal.type) {
        case 'situation':
          await updateSituation(editModal.id, { title });
          break;
        case 'before':
          await updateBeforeItem(editModal.id, { title });
          break;
        case 'after':
          await updateAfterItem(editModal.id, { title });
          break;
      }
      setEditModal(null);
      toast.success(`${editModal.type} updated successfully`);
      loadSituations();
    } catch (error) {
      toast.error(`Failed to update ${editModal.type}`);
    } finally {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    
    // Mark item as being deleted
    setDeletingItems(prev => new Set(prev).add(deleteConfirm.id));
    
    // For optimistic UI updates
    const itemType = deleteConfirm.type;
    const itemId = deleteConfirm.id;
    
    // Apply optimistic UI update
    if (itemType === 'situation') {
      setSituations(prev => prev.filter(s => s.id !== itemId));
    } else if (itemType === 'before') {
      setSituations(prev => prev.map(situation => ({
        ...situation,
        beforeItems: situation.beforeItems.filter(item => item.id !== itemId)
      })));
    } else if (itemType === 'after') {
      setSituations(prev => prev.map(situation => ({
        ...situation,
        beforeItems: situation.beforeItems.map(beforeItem => ({
          ...beforeItem,
          afterItems: beforeItem.afterItems.filter(item => item.id !== itemId)
        }))
      })));
    }
    
    // Close the confirmation modal immediately
    setDeleteConfirm(null);
    
    try {
      // Perform actual deletion in the background
      switch (itemType) {
        case 'situation':
          await deleteSituation(itemId);
          break;
        case 'before':
          await deleteBeforeItem(itemId);
          break;
        case 'after':
          await deleteAfterItem(itemId);
          break;
      }
      
      toast.success(`${itemType} deleted successfully`);
      
      // Remove from deleting set
      setDeletingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
      
      // No need to reload everything - we've already updated the UI
      // The next time the user refreshes, they'll get fresh data
    } catch (error) {
      toast.error(`Failed to delete ${itemType}`);
      // Reload to restore accurate state on error
      loadSituations();
      
      // Remove from deleting set
      setDeletingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const toggleSituationExpanded = (situationId: string) => {
    const newExpanded = new Set(expandedSituations);
    if (newExpanded.has(situationId)) {
      newExpanded.delete(situationId);
    } else {
      newExpanded.add(situationId);
    }
    setExpandedSituations(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.history.back()}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Situations Management</h1>
              <p className="text-gray-600">Manage situations, before items, and after items</p>
            </div>
          </div>
          
          <button
            onClick={() => setBulkAddModal({ type: 'situation', title: 'Add Situations' })}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            Add Situations
          </button>
        </div>

        {/* Situations List */}
        <div className="space-y-4">
          {situations.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <FileText size={48} className="text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No situations yet</h3>
              <p className="text-gray-600 mb-4">Create your first situation to get started</p>
              <button
                onClick={() => setBulkAddModal({ type: 'situation', title: 'Add Situations' })}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Add Situations
              </button>
            </div>
          ) : (
            situations.map((situation) => (
              <div key={situation.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Situation Header */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => toggleSituationExpanded(situation.id)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        {expandedSituations.has(situation.id) ? (
                          <ChevronDown size={20} className="text-gray-600" />
                        ) : (
                          <ChevronRight size={20} className="text-gray-600" />
                        )}
                      </button>
                      
                      <FileText size={20} className="text-blue-600" />
                      
                      <div 
                        className="flex-1 cursor-pointer hover:bg-gray-50 rounded p-2 -m-2"
                        onClick={() => setEditModal({ type: 'situation', id: situation.id, currentTitle: situation.title })}
                      >
                        <h3 className="font-medium text-gray-900">{situation.title}</h3>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditModal({ type: 'situation', id: situation.id, currentTitle: situation.title })}
                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                      >
                        <Edit3 size={16} className="text-gray-600" />
                      </button>
                      
                      <button
                        onClick={() => setDeleteConfirm({
                          type: 'situation',
                          id: situation.id,
                          title: situation.title
                        })}
                        disabled={deletingItems.has(situation.id)}
                        className="p-2 hover:bg-red-100 rounded transition-colors relative"
                      >
                        {deletingItems.has(situation.id) ? (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        ) : (
                          <Trash2 size={16} className="text-red-600" />
                        )}
                      </button>
                      
                      <button
                        onClick={() => setBulkAddModal({ 
                          type: 'before', 
                          title: 'Add Before Items', 
                          situationId: situation.id 
                        })}
                        className="p-2 hover:bg-green-100 rounded transition-colors"
                        title="Add Before Items"
                      >
                        <Plus size={16} className="text-green-600" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Before Items */}
                <AnimatePresence>
                  {expandedSituations.has(situation.id) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 bg-gray-50">
                        {situation.beforeItems.length === 0 ? (
                          <div className="text-center py-4">
                            <p className="text-gray-500 mb-2">No before items yet</p>
                            <button
                              onClick={() => setBulkAddModal({ 
                                type: 'before', 
                                title: 'Add Before Items', 
                                situationId: situation.id 
                              })}
                              className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Add before items
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {situation.beforeItems.map((beforeItem) => (
                              <div key={beforeItem.id} className="bg-white rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className="w-4 h-4 bg-orange-100 rounded flex items-center justify-center">
                                      <div className="w-2 h-2 bg-orange-600 rounded"></div>
                                    </div>
                                    <div 
                                      className="flex-1 cursor-pointer hover:bg-gray-50 rounded p-2 -m-2"
                                      onClick={() => setEditModal({ 
                                        type: 'before', 
                                        id: beforeItem.id, 
                                        currentTitle: beforeItem.title 
                                      })}
                                    >
                                      <h4 className="font-medium text-gray-900">{beforeItem.title}</h4>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setEditModal({ 
                                        type: 'before', 
                                        id: beforeItem.id, 
                                        currentTitle: beforeItem.title 
                                      })}
                                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                                    >
                                      <Edit3 size={14} className="text-gray-600" />
                                    </button>
                                    
                                    <button
                                      onClick={() => setDeleteConfirm({
                                        type: 'before',
                                        id: beforeItem.id,
                                        title: beforeItem.title
                                      })}
                                      disabled={deletingItems.has(beforeItem.id)}
                                      className="p-1 hover:bg-red-100 rounded transition-colors relative"
                                    >
                                      {deletingItems.has(beforeItem.id) ? (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <div className="w-2 h-2 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                      ) : (
                                        <Trash2 size={14} className="text-red-600" />
                                      )}
                                    </button>
                                    
                                    <button
                                      onClick={() => setBulkAddModal({ 
                                        type: 'after', 
                                        title: 'Add After Items', 
                                        beforeItemId: beforeItem.id 
                                      })}
                                      className="p-1 hover:bg-green-100 rounded transition-colors"
                                      title="Add After Items"
                                    >
                                      <Plus size={14} className="text-green-600" />
                                    </button>
                                  </div>
                                </div>

                                {/* After Items */}
                                {beforeItem.afterItems.length > 0 ? (
                                  <div className="ml-6 mt-2 space-y-2">
                                    {beforeItem.afterItems.map((afterItem) => (
                                      <div key={afterItem.id} className="bg-green-50 rounded-lg p-2">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2 flex-1">
                                            <CheckCircle size={16} className="text-green-600" />
                                            <div 
                                              className="flex-1 cursor-pointer hover:bg-gray-50 rounded p-2 -m-2"
                                              onClick={() => setEditModal({ 
                                                type: 'after', 
                                                id: afterItem.id, 
                                                currentTitle: afterItem.title 
                                              })}
                                            >
                                              <h5 className="font-medium text-gray-900 text-sm">{afterItem.title}</h5>
                                            </div>
                                          </div>
                                          
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={() => setEditModal({ 
                                                type: 'after', 
                                                id: afterItem.id, 
                                                currentTitle: afterItem.title 
                                              })}
                                              className="p-1 hover:bg-green-100 rounded transition-colors"
                                            >
                                              <Edit3 size={12} className="text-gray-600" />
                                            </button>
                                            
                                            <button
                                              onClick={() => setDeleteConfirm({
                                                type: 'after',
                                                id: afterItem.id,
                                                title: afterItem.title
                                              })}
                                              disabled={deletingItems.has(afterItem.id)}
                                              className="p-1 hover:bg-red-100 rounded transition-colors relative"
                                            >
                                              {deletingItems.has(afterItem.id) ? (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                  <div className="w-2 h-2 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                                </div>
                                              ) : (
                                                <Trash2 size={12} className="text-red-600" />
                                              )}
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="ml-6 mt-2">
                                    <div className="text-center py-2">
                                      <p className="text-gray-500 text-sm mb-2">No after items yet</p>
                                      <button
                                        onClick={() => setBulkAddModal({ 
                                          type: 'after', 
                                          title: 'Add After Items', 
                                          beforeItemId: beforeItem.id 
                                        })}
                                        className="text-green-600 hover:text-green-700 font-medium text-sm"
                                      >
                                        Add first after item
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      <BulkAddModal
        isOpen={bulkAddModal !== null}
        type={bulkAddModal?.type || 'situation'}
        title={bulkAddModal?.title || ''}
        onSubmit={handleBulkAdd}
        onClose={() => setBulkAddModal(null)}
        isLoading={isBulkAdding}
      />

      <EditModal
        isOpen={editModal !== null}
        type={editModal?.type || 'situation'}
        currentTitle={editModal?.currentTitle || ''}
        onSubmit={handleEdit}
        onClose={() => setEditModal(null)}
        isLoading={isEditing}
      />

      <DeleteModal
        isOpen={deleteConfirm !== null}
        type={deleteConfirm?.type || 'situation'}
        title={deleteConfirm?.title || ''}
        onConfirm={handleDelete}
        onClose={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
