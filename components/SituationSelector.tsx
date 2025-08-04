'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Plus, ArrowRight, CheckCircle, FileText } from 'lucide-react';
import { 
  getAllSituations, 
  getBeforeItems, 
  getAfterItems 
} from '@/lib/situationsDatabase';
import { Situation, BeforeItem, AfterItem } from '@/lib/types';

interface SituationSelectorProps {
  isOpen: boolean;
  onToggle: () => void;
  onTransfer: (data: {
    situation: string;
    beforeItems: string[];
    afterItems: { beforeItemId: string; beforeItemTitle: string; title: string }[];
  }) => void;
}

interface SelectedBeforeItem extends BeforeItem {
  afterItems: AfterItem[];
  selectedAfterItems: string[];
}

export const SituationSelector: React.FC<SituationSelectorProps> = ({
  isOpen,
  onToggle,
  onTransfer
}) => {
  // State management
  const [situations, setSituations] = useState<Situation[]>([]);
  const [selectedSituation, setSelectedSituation] = useState<Situation | null>(null);
  const [beforeItems, setBeforeItems] = useState<BeforeItem[]>([]);
  const [selectedBeforeItems, setSelectedBeforeItems] = useState<string[]>([]);
  const [beforeItemsWithAfter, setBeforeItemsWithAfter] = useState<SelectedBeforeItem[]>([]);
  const [phase, setPhase] = useState<'situation' | 'before' | 'after' | 'final'>('situation');
  const [loading, setLoading] = useState(false);

  // Load situations on component mount
  useEffect(() => {
    if (isOpen) {
      loadSituations();
    }
  }, [isOpen]);

  const loadSituations = async () => {
    try {
      setLoading(true);
      const situationsData = await getAllSituations();
      setSituations(situationsData);
    } catch (error) {
      console.error('Error loading situations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSituationSelect = async (situation: Situation) => {
    try {
      setLoading(true);
      setSelectedSituation(situation);
      const beforeItemsData = await getBeforeItems(situation.id);
      setBeforeItems(beforeItemsData);
      setPhase('before');
    } catch (error) {
      console.error('Error loading before items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBeforeItemToggle = (beforeItemId: string) => {
    setSelectedBeforeItems(prev => 
      prev.includes(beforeItemId)
        ? prev.filter(id => id !== beforeItemId)
        : [...prev, beforeItemId]
    );
  };

  const handleBeforeItemsSave = async () => {
    try {
      setLoading(true);
      const selectedItems = beforeItems.filter(item => selectedBeforeItems.includes(item.id));
      
      // Load after items for each selected before item
      const itemsWithAfter: SelectedBeforeItem[] = [];
      for (const beforeItem of selectedItems) {
        const afterItems = await getAfterItems(beforeItem.id);
        itemsWithAfter.push({
          ...beforeItem,
          afterItems,
          selectedAfterItems: []
        });
      }
      
      setBeforeItemsWithAfter(itemsWithAfter);
      setPhase('after');
    } catch (error) {
      console.error('Error loading after items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAfterItemToggle = (beforeItemId: string, afterItemId: string) => {
    setBeforeItemsWithAfter(prev => 
      prev.map(beforeItem => 
        beforeItem.id === beforeItemId
          ? {
              ...beforeItem,
              selectedAfterItems: beforeItem.selectedAfterItems.includes(afterItemId)
                ? beforeItem.selectedAfterItems.filter(id => id !== afterItemId)
                : [...beforeItem.selectedAfterItems, afterItemId]
            }
          : beforeItem
      )
    );
  };

  const handleAfterItemsSave = () => {
    setPhase('final');
  };

  const handleTransfer = () => {
    if (!selectedSituation) return;

    const beforeItemTitles = beforeItemsWithAfter.map(item => item.title);
    const afterItemsWithBeforeId = beforeItemsWithAfter.flatMap(beforeItem =>
      beforeItem.afterItems
        .filter(afterItem => beforeItem.selectedAfterItems.includes(afterItem.id))
        .map(afterItem => ({
          beforeItemId: beforeItem.id,
          beforeItemTitle: beforeItem.title,
          title: afterItem.title
        }))
    );

    onTransfer({
      situation: selectedSituation.title,
      beforeItems: beforeItemTitles,
      afterItems: afterItemsWithBeforeId
    });

    // Reset state
    resetState();
  };

  const resetState = () => {
    setSelectedSituation(null);
    setBeforeItems([]);
    setSelectedBeforeItems([]);
    setBeforeItemsWithAfter([]);
    setPhase('situation');
  };

  const handleClose = () => {
    resetState();
    onToggle();
  };

  if (!isOpen) {
    return (
      <div className="mt-4">
        <button
          onClick={onToggle}
          className="w-full bg-gray-50 hover:bg-gray-100 text-black font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <FileText size={20} />
          Situations
          <ChevronDown size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <button
        onClick={handleClose}
        className="w-full bg-gray-100 hover:bg-gray-200 text-black font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 mb-4"
      >
        <FileText size={20} />
        Situations
        <ChevronUp size={16} />
      </button>

      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="bg-gray-50 rounded-lg p-4 space-y-4"
      >
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && phase === 'situation' && (
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Select a Situation</h3>
            <div className="space-y-2">
              {situations.map((situation) => (
                <button
                  key={situation.id}
                  onClick={() => handleSituationSelect(situation)}
                  className="w-full text-left p-3 bg-white hover:bg-blue-50 rounded-lg border border-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText size={16} className="text-blue-600" />
                    <span className="font-medium">{situation.title}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && phase === 'before' && selectedSituation && (
          <div>
            <div className="mb-4">
              <h3 className="font-medium text-gray-900">Selected Situation:</h3>
              <p className="text-blue-600 font-medium">{selectedSituation.title}</p>
            </div>
            
            <h3 className="font-medium text-gray-900 mb-3">Select Before Items</h3>
            <div className="space-y-2 mb-4">
              {beforeItems.map((beforeItem) => (
                <label
                  key={beforeItem.id}
                  className="flex items-center gap-3 p-3 bg-white hover:bg-orange-50 rounded-lg border border-gray-200 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedBeforeItems.includes(beforeItem.id)}
                    onChange={() => handleBeforeItemToggle(beforeItem.id)}
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <div className="w-3 h-3 bg-orange-600 rounded"></div>
                  <span className="font-medium">{beforeItem.title}</span>
                </label>
              ))}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setPhase('situation')}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                ← Back to Situations
              </button>
              <button
                onClick={handleBeforeItemsSave}
                disabled={selectedBeforeItems.length === 0}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {!loading && phase === 'after' && (
          <div>
            <div className="mb-4">
              <h3 className="font-medium text-gray-900">Selected Situation:</h3>
              <p className="text-blue-600 font-medium">{selectedSituation?.title}</p>
            </div>

            <h3 className="font-medium text-gray-900 mb-3">Select After Items</h3>
            <div className="space-y-4">
              {beforeItemsWithAfter.map((beforeItem) => (
                <div key={beforeItem.id} className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 bg-orange-600 rounded"></div>
                    <span className="font-medium text-gray-900">{beforeItem.title}</span>
                    <button
                      className="ml-auto p-1 hover:bg-gray-100 rounded"
                      onClick={() => {
                        // Toggle visibility of after items for this before item
                      }}
                    >
                      <Plus size={16} className="text-green-600" />
                    </button>
                  </div>
                  
                  <div className="ml-5 space-y-2">
                    {beforeItem.afterItems.map((afterItem) => (
                      <label
                        key={afterItem.id}
                        className="flex items-center gap-3 p-2 hover:bg-green-50 rounded cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={beforeItem.selectedAfterItems.includes(afterItem.id)}
                          onChange={() => handleAfterItemToggle(beforeItem.id, afterItem.id)}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <CheckCircle size={14} className="text-green-600" />
                        <span className="text-sm">{afterItem.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 flex space-x-3">
              <button
                onClick={() => setPhase('before')}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                ← Back to Before Items
              </button>
              <button
                onClick={handleAfterItemsSave}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {!loading && phase === 'final' && (
          <div>
            <h3 className="font-medium text-gray-900 mb-4">Final Selection</h3>
            
            <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-3">
              {/* Situation */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={16} className="text-blue-600" />
                  <span className="font-medium text-blue-600">{selectedSituation?.title}</span>
                </div>
              </div>

              {/* Before Items */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Before:</h4>
                <div className="ml-4 space-y-1">
                  {beforeItemsWithAfter.map((beforeItem) => (
                    <div key={beforeItem.id} className="flex items-center gap-2">
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-900">{beforeItem.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* After Items */}
              {beforeItemsWithAfter.some(item => item.selectedAfterItems.length > 0) && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">After:</h4>
                  <div className="ml-8 space-y-1">
                    {beforeItemsWithAfter.map((beforeItem) =>
                      beforeItem.afterItems
                        .filter(afterItem => beforeItem.selectedAfterItems.includes(afterItem.id))
                        .map((afterItem) => (
                          <div key={afterItem.id} className="flex items-center gap-2">
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-900">{afterItem.title}</span>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex space-x-3">
              <button
                onClick={() => setPhase('after')}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                ← Back to After Items
              </button>
              <button
                onClick={handleTransfer}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <ArrowRight size={16} />
                Transfer
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
