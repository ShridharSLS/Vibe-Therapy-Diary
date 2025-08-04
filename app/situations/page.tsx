'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit3, Trash2, ChevronDown, ChevronRight, FileText, CheckCircle, ArrowLeft } from 'lucide-react';
import { 
  getAllSituations, createSituation, updateSituation, deleteSituation,
  getBeforeItems, createBeforeItem, updateBeforeItem, deleteBeforeItem,
  getAfterItems, createAfterItem, updateAfterItem, deleteAfterItem
} from '@/lib/situationsDatabase';
import { Situation, BeforeItem, AfterItem } from '@/lib/types';
import { SituationModal, BeforeModal, AfterModal, DeleteModal } from '@/components/SituationsModals';
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
  const [showAddSituation, setShowAddSituation] = useState(false);
  const [editingSituation, setEditingSituation] = useState<string | null>(null);
  const [editingBefore, setEditingBefore] = useState<string | null>(null);
  const [editingAfter, setEditingAfter] = useState<string | null>(null);
  
  // Form states
  const [situationForm, setSituationForm] = useState({ title: '', description: '' });
  const [beforeForm, setBeforeForm] = useState({ title: '', description: '', situationId: '' });
  const [afterForm, setAfterForm] = useState({ title: '', description: '', beforeItemId: '' });
  
  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'situation' | 'before' | 'after';
    id: string;
    title: string;
  } | null>(null);

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

  const handleCreateSituation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!situationForm.title.trim()) return;

    try {
      await createSituation(situationForm.title, situationForm.description);
      setSituationForm({ title: '', description: '' });
      setShowAddSituation(false);
      toast.success('Situation created successfully');
      loadSituations();
    } catch (error) {
      toast.error('Failed to create situation');
    }
  };

  const handleUpdateSituation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSituation || !situationForm.title.trim()) return;

    try {
      await updateSituation(editingSituation, {
        title: situationForm.title,
        description: situationForm.description
      });
      setSituationForm({ title: '', description: '' });
      setEditingSituation(null);
      toast.success('Situation updated successfully');
      loadSituations();
    } catch (error) {
      toast.error('Failed to update situation');
    }
  };

  const handleCreateBeforeItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!beforeForm.title.trim() || !beforeForm.situationId) return;

    try {
      await createBeforeItem(beforeForm.situationId, beforeForm.title, beforeForm.description);
      setBeforeForm({ title: '', description: '', situationId: '' });
      toast.success('Before item created successfully');
      loadSituations();
    } catch (error) {
      toast.error('Failed to create before item');
    }
  };

  const handleUpdateBeforeItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBefore || !beforeForm.title.trim()) return;

    try {
      await updateBeforeItem(editingBefore, {
        title: beforeForm.title,
        description: beforeForm.description
      });
      setBeforeForm({ title: '', description: '', situationId: '' });
      setEditingBefore(null);
      toast.success('Before item updated successfully');
      loadSituations();
    } catch (error) {
      toast.error('Failed to update before item');
    }
  };

  const handleCreateAfterItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!afterForm.title.trim() || !afterForm.beforeItemId) return;

    try {
      await createAfterItem(afterForm.beforeItemId, afterForm.title, afterForm.description);
      setAfterForm({ title: '', description: '', beforeItemId: '' });
      toast.success('After item created successfully');
      loadSituations();
    } catch (error) {
      toast.error('Failed to create after item');
    }
  };

  const handleUpdateAfterItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAfter || !afterForm.title.trim()) return;

    try {
      await updateAfterItem(editingAfter, {
        title: afterForm.title,
        description: afterForm.description
      });
      setAfterForm({ title: '', description: '', beforeItemId: '' });
      setEditingAfter(null);
      toast.success('After item updated successfully');
      loadSituations();
    } catch (error) {
      toast.error('Failed to update after item');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      switch (deleteConfirm.type) {
        case 'situation':
          await deleteSituation(deleteConfirm.id);
          break;
        case 'before':
          await deleteBeforeItem(deleteConfirm.id);
          break;
        case 'after':
          await deleteAfterItem(deleteConfirm.id);
          break;
      }
      
      setDeleteConfirm(null);
      toast.success(`${deleteConfirm.type} deleted successfully`);
      loadSituations();
    } catch (error) {
      toast.error(`Failed to delete ${deleteConfirm.type}`);
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
            onClick={() => setShowAddSituation(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            New Situation
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
                onClick={() => setShowAddSituation(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Create Situation
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
                      
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{situation.title}</h3>
                        {situation.description && (
                          <p className="text-sm text-gray-600">{situation.description}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSituationForm({ title: situation.title, description: situation.description || '' });
                          setEditingSituation(situation.id);
                        }}
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
                        className="p-2 hover:bg-red-100 rounded transition-colors"
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                      
                      <button
                        onClick={() => {
                          setBeforeForm({ title: '', description: '', situationId: situation.id });
                        }}
                        className="p-2 hover:bg-green-100 rounded transition-colors"
                        title="Add Before Item"
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
                              onClick={() => {
                                setBeforeForm({ title: '', description: '', situationId: situation.id });
                              }}
                              className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Add first before item
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
                                    <div className="flex-1">
                                      <h4 className="font-medium text-gray-900">{beforeItem.title}</h4>
                                      {beforeItem.description && (
                                        <p className="text-sm text-gray-600">{beforeItem.description}</p>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => {
                                        setBeforeForm({ 
                                          title: beforeItem.title, 
                                          description: beforeItem.description || '', 
                                          situationId: beforeItem.situationId 
                                        });
                                        setEditingBefore(beforeItem.id);
                                      }}
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
                                      className="p-1 hover:bg-red-100 rounded transition-colors"
                                    >
                                      <Trash2 size={14} className="text-red-600" />
                                    </button>
                                    
                                    <button
                                      onClick={() => {
                                        setAfterForm({ title: '', description: '', beforeItemId: beforeItem.id });
                                      }}
                                      className="p-1 hover:bg-green-100 rounded transition-colors"
                                      title="Add After Item"
                                    >
                                      <Plus size={14} className="text-green-600" />
                                    </button>
                                  </div>
                                </div>

                                {/* After Items */}
                                {beforeItem.afterItems.length > 0 && (
                                  <div className="ml-6 mt-2 space-y-2">
                                    {beforeItem.afterItems.map((afterItem) => (
                                      <div key={afterItem.id} className="bg-green-50 rounded-lg p-2">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2 flex-1">
                                            <CheckCircle size={16} className="text-green-600" />
                                            <div className="flex-1">
                                              <h5 className="font-medium text-gray-900 text-sm">{afterItem.title}</h5>
                                              {afterItem.description && (
                                                <p className="text-xs text-gray-600">{afterItem.description}</p>
                                              )}
                                            </div>
                                          </div>
                                          
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={() => {
                                                setAfterForm({ 
                                                  title: afterItem.title, 
                                                  description: afterItem.description || '', 
                                                  beforeItemId: afterItem.beforeItemId 
                                                });
                                                setEditingAfter(afterItem.id);
                                              }}
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
                                              className="p-1 hover:bg-red-100 rounded transition-colors"
                                            >
                                              <Trash2 size={12} className="text-red-600" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
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
      <SituationModal
        isOpen={showAddSituation || editingSituation !== null}
        isEditing={editingSituation !== null}
        form={situationForm}
        setForm={setSituationForm}
        onSubmit={editingSituation ? handleUpdateSituation : handleCreateSituation}
        onClose={() => {
          setShowAddSituation(false);
          setEditingSituation(null);
          setSituationForm({ title: '', description: '' });
        }}
      />

      <BeforeModal
        isOpen={beforeForm.situationId !== '' || editingBefore !== null}
        isEditing={editingBefore !== null}
        form={beforeForm}
        setForm={setBeforeForm}
        onSubmit={editingBefore ? handleUpdateBeforeItem : handleCreateBeforeItem}
        onClose={() => {
          setBeforeForm({ title: '', description: '', situationId: '' });
          setEditingBefore(null);
        }}
      />

      <AfterModal
        isOpen={afterForm.beforeItemId !== '' || editingAfter !== null}
        isEditing={editingAfter !== null}
        form={afterForm}
        setForm={setAfterForm}
        onSubmit={editingAfter ? handleUpdateAfterItem : handleCreateAfterItem}
        onClose={() => {
          setAfterForm({ title: '', description: '', beforeItemId: '' });
          setEditingAfter(null);
        }}
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
