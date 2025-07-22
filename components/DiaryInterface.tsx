'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp,
  Plus, 
  Copy, 
  Edit3, 
  Save, 
  Trash2,
  Undo,
  Redo,
  Grid3X3,
  X,
  List,
  ExternalLink
} from 'lucide-react';
import { Diary, Card } from '@/lib/types';
import { 
  subscribeToCards, 
  createCard, 
  updateCard, 
  deleteCard, 
  duplicateCard 
} from '@/lib/database';
import CardComponent from './CardComponent';
import { sanitizeHtml } from '@/lib/sanitize';
import toast from 'react-hot-toast';

interface DiaryInterfaceProps {
  diary: Diary;
}

export default function DiaryInterface({ diary }: DiaryInterfaceProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previousIndex, setPreviousIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [controlsOpen, setControlsOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true; // SSR default
    return window.innerWidth >= 768; // open on desktop (md breakpoint), collapsed on mobile
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showGridView, setShowGridView] = useState(false);
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null);
  const [showNavigation, setShowNavigation] = useState(false);

  // Simple body scroll lock for mobile navigation
  useEffect(() => {
    if (showNavigation) {
      // Only prevent body scroll on mobile
      if (window.innerWidth < 768) {
        document.body.style.overflow = 'hidden';
      }
    } else {
      document.body.style.overflow = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [showNavigation]);
  const [undoStack, setUndoStack] = useState<Card[][]>([]);
  const [redoStack, setRedoStack] = useState<Card[][]>([]);
  // Fine-grained text-level stacks (array snapshots for simplicity)
  const [textUndoStack, setTextUndoStack] = useState<Card[][]>([]);
  const [textRedoStack, setTextRedoStack] = useState<Card[][]>([]);
  

  // Real-time subscription to cards
  useEffect(() => {
    const unsubscribe = subscribeToCards(diary.id, (updatedCards) => {
      setCards(updatedCards);
      setIsLoading(false);
      
      // If no cards exist, create a welcome card
      if (updatedCards.length === 0) {
        handleAddCard();
      }
    });

    return unsubscribe;
  }, [diary.id]);

  // Save state for undo/redo
  const saveState = useCallback(() => {
    setUndoStack(prev => [...prev.slice(-9), cards]); // Keep last 10 states
    setRedoStack([]); // Clear redo stack when new action is performed
  }, [cards]);

  const pushTextSnapshot = useCallback((updatedCards: Card[]) => {
    setTextUndoStack((prev) => [...prev, JSON.parse(JSON.stringify(updatedCards))]);
    setTextRedoStack([]);
  }, []);

  const handleUndo = () => {
    if (textUndoStack.length > 0) {
      const prev = textUndoStack[textUndoStack.length - 1];
      setTextUndoStack((prevStack) => prevStack.slice(0, -1));
      setTextRedoStack((r) => [...r, JSON.parse(JSON.stringify(cards))]);
      setCards(prev);
      return;
    }

    if (undoStack.length > 0) {
      const previousState = undoStack[undoStack.length - 1];
      setRedoStack(prev => [cards, ...prev.slice(0, 9)]);
      setUndoStack(prev => prev.slice(0, -1));
      setCards(previousState);
    }
  };

  // Live text change from CardComponent
  const handleLiveTextChange = (cardId: string, updates: Partial<Card>) => {
    // Don't update cards array while editing to prevent cursor jumping
    // Just record the snapshot for undo/redo history
    pushTextSnapshot(cards.map(c => (c.id === cardId ? { ...c, ...updates } : c)));
  };

  const handleRedo = () => {
    if (textRedoStack.length > 0) {
      const next = textRedoStack[textRedoStack.length - 1];
      setTextRedoStack((r) => r.slice(0, -1));
      setTextUndoStack((u) => [...u, JSON.parse(JSON.stringify(cards))]);
      setCards(next);
      return;
    }

    if (redoStack.length > 0) {
      const nextState = redoStack[0];
      setUndoStack(prev => [...prev.slice(-9), cards]);
      setRedoStack(prev => prev.slice(1));
      setCards(nextState);
    }
  };

  const handleAddCard = async () => {
    try {
      saveState();
      
      // Insert new card after current card
      let newOrder;
      if (cards.length === 0) {
        // If no cards exist, use order 0
        newOrder = 0;
      } else {
        // Get the current card's order
        const currentCardOrder = cards[currentIndex].order;
        
        // Find the next card's order (if any)
        const nextCardIndex = currentIndex + 1;
        const hasNextCard = nextCardIndex < cards.length;
        const nextCardOrder = hasNextCard ? cards[nextCardIndex].order : currentCardOrder + 1;
        
        // Set new order between current and next card
        newOrder = (currentCardOrder + nextCardOrder) / 2;
      }
      
      await createCard(
        diary.id,
        'New Topic',
        'Before',
        '',
        newOrder
      );
      
      toast.success('Card added successfully');
    } catch (error) {
      console.error('Error adding card:', error);
      toast.error('Failed to add card');
    }
  };

  const handleDuplicateCard = async () => {
    if (cards.length === 0) return;
    
    try {
      saveState();
      const currentCard = cards[currentIndex];
      await duplicateCard(currentCard.id);
      toast.success('Card duplicated successfully');
    } catch (error) {
      console.error('Error duplicating card:', error);
      toast.error('Failed to duplicate card');
    }
  };

  const handleDeleteCard = () => {
    if (cards.length === 0) return;
    setShowDeleteConfirm(true);
  };

  const confirmDeleteCard = async () => {
    try {
      saveState();
      const currentCard = cards[currentIndex];
      await deleteCard(currentCard.id);
      
      // Adjust current index if necessary
      if (currentIndex >= cards.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
      
      setShowDeleteConfirm(false);
      toast.success('Card deleted successfully');
    } catch (error) {
      console.error('Error deleting card:', error);
      toast.error('Failed to delete card');
      setShowDeleteConfirm(false);
    }
  };

  const handleCardReorder = async (draggedCardId: string, targetIndex: number) => {
    try {
      saveState();
      
      const draggedCardIndex = cards.findIndex(card => card.id === draggedCardId);
      if (draggedCardIndex === -1) return;
      
      // Create new array with reordered cards
      const newCards = [...cards];
      const [draggedCard] = newCards.splice(draggedCardIndex, 1);
      newCards.splice(targetIndex, 0, draggedCard);
      
      // Update order values
      const updatedCards = newCards.map((card, index) => ({
        ...card,
        order: index + 1
      }));
      
      // Update all cards in database
      await Promise.all(
        updatedCards.map(card => 
          updateCard(card.id, { order: card.order })
        )
      );
      
      toast.success('Cards reordered successfully');
    } catch (error) {
      console.error('Error reordering cards:', error);
      toast.error('Failed to reorder cards');
    }
  };

  const handleCardUpdate = async (cardId: string, updates: Partial<Card>) => {
    try {
      // Sanitize HTML content if bodyText is being updated
      if (updates.bodyText) {
        updates.bodyText = sanitizeHtml(updates.bodyText);
      }
      await updateCard(cardId, updates);
    } catch (error) {
      console.error('Error updating card:', error);
      toast.error('Failed to update card');
    }
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'left' && currentIndex < cards.length - 1) {
      setPreviousIndex(currentIndex);
      setCurrentIndex(currentIndex + 1);
    } else if (direction === 'right' && currentIndex > 0) {
      setPreviousIndex(currentIndex);
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Dynamic exit direction based on index change
  const getExitDirection = () => {
    // If going forward (index increased), exit left
    // If going backward (index decreased), exit right
    return currentIndex > previousIndex ? -100 : 100;
  };

  // Generate prefilled Google Form URL
  const generateGoogleFormUrl = () => {
    const baseUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSfNBGTi1oPY-Uku3-uh3sFeM_lqPLnanHKK9e0rJ_jNRAqYgw/viewform';
    const currentUrl = window.location.href;
    
    const params = new URLSearchParams({
      'usp': 'pp_url',
      'entry.2125991038': diary.clientId,     // Replace 'a'
      'entry.52858992': diary.name,           // Replace 'b' 
      'entry.314293686': diary.gender,        // Replace 'Male'
      'entry.1464498011': currentUrl          // Replace 'c'
    });
    
    return `${baseUrl}?${params.toString()}`;
  };

  // Handle Google Form registration
  const handleGoogleFormRegistration = () => {
    const formUrl = generateGoogleFormUrl();
    window.open(formUrl, '_blank');
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 100;
    
    if (info.offset.x > threshold) {
      handleSwipe('right');
    } else if (info.offset.x < -threshold) {
      handleSwipe('left');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800"></div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{diary.name}'s Diary</h1>
              <p className="text-sm text-gray-600">Client ID: {diary.clientId}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-500">
                {cards.length > 0 ? `${currentIndex + 1} of ${cards.length}` : '0 cards'}
              </div>
              {cards.length > 0 && (
                <button
                  onClick={() => setShowNavigation(true)}
                  className="p-1 rounded-lg bg-teal-100 hover:bg-teal-200 text-teal-700 transition-colors"
                  title="Card Navigation"
                >
                  <List size={16} />
                </button>
              )}
              {cards.length > 0 && (
                <button
                  onClick={() => setControlsOpen(!controlsOpen)}
                  className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                  title={controlsOpen ? "Hide controls" : "Show controls"}
                >
                  {controlsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar - Only show when expanded */}
      {controlsOpen && (
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSwipe('right')}
                disabled={currentIndex === 0}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => handleSwipe('left')}
                disabled={currentIndex >= cards.length - 1}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={20} />
              </button>
              <button
                onClick={handleGoogleFormRegistration}
                className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors"
                title="Register on Google Form"
              >
                <ExternalLink size={20} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleAddCard}
                className="p-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition-colors"
                title="Add Card"
              >
                <Plus size={20} />
              </button>
              <button
                onClick={handleDuplicateCard}
                disabled={cards.length === 0}
                className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Duplicate Card"
              >
                <Copy size={20} />
              </button>
              <button
                onClick={handleDeleteCard}
                disabled={cards.length === 0}
                className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Delete Card"
              >
                <Trash2 size={20} />
              </button>
              <button
                onClick={handleUndo}
                disabled={undoStack.length === 0 && textUndoStack.length === 0}
                className="p-2 rounded-lg bg-yellow-100 hover:bg-yellow-200 text-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Undo"
              >
                <Undo size={20} />
              </button>
              <button
                onClick={handleRedo}
                disabled={redoStack.length === 0 && textRedoStack.length === 0}
                className="p-2 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Redo"
              >
                <Redo size={20} />
              </button>
              <button
                onClick={() => setShowGridView(true)}
                disabled={cards.length === 0}
                className="p-2 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors hidden md:block"
                title="Grid View"
              >
                <Grid3X3 size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card Display Area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {currentCard ? (
              <motion.div
                key={currentCard.id}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: getExitDirection() }}
                transition={{ duration: 0.3 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={handleDragEnd}
                className="card-container"
              >
                <CardComponent
                  card={currentCard}
                  onUpdate={handleCardUpdate}
                  onLiveTextChange={handleLiveTextChange}
                />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus size={24} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No cards yet</h3>
                <p className="text-gray-600 mb-4">Create your first therapy diary card to get started.</p>
                <button
                  onClick={handleAddCard}
                  className="bg-blue-800 hover:bg-blue-900 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Create First Card
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Page Indicators */}
      {cards.length > 1 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2">
          <div className="flex gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2">
            {cards.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-blue-800' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Grid View Modal */}
      <AnimatePresence>
        {showGridView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-xl p-6 max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Organize Cards</h2>
                <button
                  onClick={() => setShowGridView(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2" data-grid-container>
                  {cards.map((card, index) => (
                    <motion.div
                      key={card.id}
                      drag
                      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                      dragElastic={0.05}
                      whileDrag={{ scale: 1.02, zIndex: 1000 }}
                      onDragStart={() => {
                        setDraggedCard(card.id);
                        setInsertionIndex(null);
                      }}
                      onDrag={(event, info) => {
                        if (!draggedCard) return;
                        
                        // Calculate current drag position
                        const draggedElement = event.target as HTMLElement;
                        const rect = draggedElement.getBoundingClientRect();
                        const centerX = rect.left + rect.width / 2;
                        const centerY = rect.top + rect.height / 2;
                        
                        // Find the card element under the drag point
                        const elements = document.elementsFromPoint(centerX, centerY);
                        const targetCard = elements.find(el => 
                          el.hasAttribute('data-card-id') && 
                          el.getAttribute('data-card-id') !== card.id
                        );
                        
                        if (targetCard) {
                          const targetCardId = targetCard.getAttribute('data-card-id');
                          const targetIndex = cards.findIndex(c => c.id === targetCardId);
                          if (targetIndex !== -1) {
                            // Determine insertion position based on drag direction horizontally
                            const targetRect = targetCard.getBoundingClientRect();
                            const targetCenterX = targetRect.left + targetRect.width / 2;
                            
                            // If dragging left of center, insert before; if right, insert after
                            const insertBefore = centerX < targetCenterX;
                            const newInsertionIndex = insertBefore ? targetIndex : targetIndex + 1;
                            
                            // Don't show insertion line if it would be the same position
                            const currentIndex = cards.findIndex(c => c.id === card.id);
                            if (newInsertionIndex !== currentIndex && newInsertionIndex !== currentIndex + 1) {
                              setInsertionIndex(newInsertionIndex);
                            } else {
                              setInsertionIndex(null);
                            }
                          }
                        } else {
                          // Check if dragging in empty space at the end
                          const gridContainer = document.querySelector('[data-grid-container]');
                          if (gridContainer) {
                            const gridRect = gridContainer.getBoundingClientRect();
                            const isInGridArea = centerX >= gridRect.left && centerX <= gridRect.right && 
                                               centerY >= gridRect.top && centerY <= gridRect.bottom;
                            
                            if (isInGridArea) {
                              // If in grid area but not over a card, assume end position
                              const currentIndex = cards.findIndex(c => c.id === card.id);
                              if (cards.length !== currentIndex + 1) {
                                setInsertionIndex(cards.length);
                              } else {
                                setInsertionIndex(null);
                              }
                            } else {
                              setInsertionIndex(null);
                            }
                          } else {
                            setInsertionIndex(null);
                          }
                        }
                      }}
                      onDragEnd={(event, info) => {
                        const finalInsertionIndex = insertionIndex;
                        setDraggedCard(null);
                        setInsertionIndex(null);
                        
                        if (finalInsertionIndex !== null) {
                          const currentIndex = cards.findIndex(c => c.id === card.id);
                          const targetIndex = finalInsertionIndex > currentIndex ? finalInsertionIndex - 1 : finalInsertionIndex;
                          if (targetIndex !== currentIndex) {
                            handleCardReorder(card.id, targetIndex);
                          }
                        }
                      }}
                      className={`relative cursor-move ${
                        draggedCard === card.id ? 'opacity-50' : ''
                      }`}
                      data-card-id={card.id}
                    >
                      {/* Vertical Insertion Line - Before Card */}
                      {insertionIndex === index && draggedCard && (
                        <div className="absolute -left-2 top-0 bottom-0 w-1 bg-blue-500 rounded-full shadow-lg z-10" />
                      )}
                      
                      <div className={`rounded-xl shadow-lg overflow-hidden h-48 ${
                        card.type === 'Before' ? 'bg-before-bg' : 'bg-after-bg'
                      }`}>
                        <div className="p-4 h-full flex flex-col">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              card.type === 'Before' 
                                ? 'bg-red-200 text-red-800' 
                                : 'bg-blue-200 text-blue-800'
                            }`}>
                              {card.type}
                            </span>
                            <span className="text-xs text-gray-500 font-medium">
                              #{index + 1}
                            </span>
                          </div>
                          
                          <div className="flex-1 overflow-hidden">
                            <h3 className="font-medium text-gray-900 text-sm mb-2 line-clamp-2">
                              {card.topic || 'Untitled'}
                            </h3>
                            <div className="text-xs text-gray-600 line-clamp-4">
                              {card.bodyText ? (
                                <div dangerouslySetInnerHTML={{ 
                                  __html: card.bodyText.replace(/<[^>]*>/g, '').substring(0, 100) + '...' 
                                }} />
                              ) : (
                                <span className="italic">No content</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {/* Vertical Insertion Line - After Last Card */}
                  {insertionIndex === cards.length && draggedCard && (
                    <div className="relative">
                      <div className="absolute -right-2 top-0 w-1 h-48 bg-blue-500 rounded-full shadow-lg z-10" />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end mt-6 pt-4 border-t">
                <button
                  onClick={() => setShowGridView(false)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={24} className="text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Delete Card?
                </h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete this card?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteCard}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Sidebar (Desktop) & Bottom Sheet (Mobile) */}
      <AnimatePresence>
        {showNavigation && (
          <>
            {/* Desktop Sidebar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40 hidden md:block"
              onClick={() => setShowNavigation(false)}
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-white shadow-2xl z-50 hidden md:block"
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-800">Card Navigation</h3>
                  <button
                    onClick={() => setShowNavigation(false)}
                    className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <X size={20} className="text-gray-600" />
                  </button>
                </div>
                
                {/* Card List */}
                <div className="flex-1 overflow-y-auto">
                  {cards.map((card, index) => (
                    <button
                      key={card.id}
                      onClick={() => {
                        setCurrentIndex(index);
                        setShowNavigation(false);
                      }}
                      className={`w-full p-4 text-left border-b hover:bg-gray-50 transition-colors ${
                        index === currentIndex ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Card Number */}
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                          {index + 1}
                        </div>
                        
                        {/* Card Type Badge */}
                        <div className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-medium ${
                          card.type === 'Before' 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {card.type}
                        </div>
                        
                        {/* Card Topic */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {card.topic || 'Untitled'}
                          </div>
                          {card.bodyText && (
                            <div className="text-xs text-gray-500 truncate mt-1">
                              {card.bodyText.replace(/<[^>]*>/g, '').substring(0, 50)}...
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                
                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 text-center text-sm text-gray-600">
                  {cards.length} {cards.length === 1 ? 'card' : 'cards'} total
                </div>
              </div>
            </motion.div>

            {/* Mobile Bottom Sheet */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setShowNavigation(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 md:hidden"
              style={{ height: '80vh' }}
            >
              <div className="flex flex-col h-full">
                {/* Handle */}
                <div className="flex justify-center p-2">
                  <div className="w-12 h-1 bg-gray-300 rounded-full" />
                </div>
                
                {/* Header */}
                <div className="flex items-center justify-between px-4 pb-2">
                  <h3 className="text-lg font-semibold text-gray-800">Jump to Card</h3>
                  <button
                    onClick={() => setShowNavigation(false)}
                    className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <X size={20} className="text-gray-600" />
                  </button>
                </div>
                
                {/* Card List */}
                <div className="flex-1 overflow-y-scroll px-2 pb-4" style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
                  {cards.map((card, index) => (
                    <button
                      key={card.id}
                      onClick={() => {
                        setCurrentIndex(index);
                        setShowNavigation(false);
                      }}
                      className={`w-full p-4 text-left rounded-xl mb-2 transition-colors ${
                        index === currentIndex 
                          ? 'bg-blue-50 border-2 border-blue-200' 
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Card Number */}
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-sm font-semibold text-gray-700">
                          {index + 1}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          {/* Card Type Badge */}
                          <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-1 ${
                            card.type === 'Before' 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {card.type}
                          </div>
                          
                          {/* Card Topic */}
                          <div className="text-sm font-medium text-gray-900 line-clamp-2">
                            {card.topic || 'Untitled'}
                          </div>
                          
                          {/* Card Preview */}
                          {card.bodyText && (
                            <div className="text-xs text-gray-500 line-clamp-2 mt-1">
                              {card.bodyText.replace(/<[^>]*>/g, '').substring(0, 80)}...
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                
                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 text-center text-sm text-gray-600">
                  {cards.length} {cards.length === 1 ? 'card' : 'cards'} total
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
