'use client';

import { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Edit3, Check, X, Bold, Italic, List } from 'lucide-react';
import { Card } from '@/lib/types';
import { getTextLength } from '@/lib/utils';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

// Import ReactQuill dynamically to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

interface CardComponentProps {
  card: Card;
  onUpdate: (cardId: string, updates: Partial<Card>) => void;
  onLiveTextChange?: (cardId: string, updates: Partial<Card>) => void;
  onEditingStateChange?: (isEditing: boolean) => void;
}

// Define the methods that will be exposed via ref
export interface CardRef {
  getLatestContent: () => string;
  saveContent: () => void;
}

const CHARACTER_LIMIT = 2000;

const CardComponent = forwardRef<CardRef, CardComponentProps>((
  { card, onUpdate, onLiveTextChange, onEditingStateChange }, 
  ref
) => {
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [isEditingBody, setIsEditingBody] = useState(false);
  const [topicValue, setTopicValue] = useState(card.topic);
  const [bodyValue, setBodyValue] = useState(card.bodyText);
  
  // History stacks for undo/redo functionality
  const [bodyHistory, setBodyHistory] = useState<string[]>([card.bodyText]);
  const [bodyHistoryIndex, setBodyHistoryIndex] = useState(0); // Current position in history
  const [topicHistory, setTopicHistory] = useState<string[]>([card.topic]);
  const [topicHistoryIndex, setTopicHistoryIndex] = useState(0);
  
  const topicRef = useRef<HTMLTextAreaElement>(null);
  // Use forwardRef with ReactQuill
  // Track the ReactQuill editor instance directly
  const editorInstanceRef = useRef<any>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const queueSnapshot = () => {
    if (!onLiveTextChange) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onLiveTextChange(card.id, { topic: topicValue, bodyText: bodyValue });
    }, 400);
  };

  // Get the most up-to-date content directly from the editor
  const getLatestContent = () => {
    if (isEditingBody && editorInstanceRef.current) {
      return editorInstanceRef.current.getHTML();
    }
    return bodyValue;
  };

  // Save content directly from the editor
  const saveContent = () => {
    if (isEditingBody) {
      const latestContent = getLatestContent();
      if (latestContent !== card.bodyText) {
        onUpdate(card.id, { bodyText: latestContent });
      }
    }
  };
  
  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getLatestContent,
    saveContent
  }));

  // Immediately flush any pending updates (for when editing stops)
  const flushPendingUpdates = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (onLiveTextChange) {
      // Get the most up-to-date content directly from the editor
      const currentBodyText = getLatestContent();
      
      // Force immediate update to prevent losing last character
      setTimeout(() => {
        onLiveTextChange(card.id, { topic: topicValue, bodyText: currentBodyText });
      }, 0);
    }
  };

  // Function to add item to history stack
  const addToHistory = useCallback((value: string, isTopicField: boolean) => {
    if (isTopicField) {
      // Only add to history if value is different from current
      if (topicHistory[topicHistoryIndex] !== value) {
        // Cut off any forward history when a new change is made
        const newHistory = topicHistory.slice(0, topicHistoryIndex + 1).concat(value);
        setTopicHistory(newHistory);
        setTopicHistoryIndex(newHistory.length - 1);
      }
    } else { // Body field
      // Only add to history if value is different from current
      if (bodyHistory[bodyHistoryIndex] !== value) {
        // Cut off any forward history when a new change is made
        const newHistory = bodyHistory.slice(0, bodyHistoryIndex + 1).concat(value);
        setBodyHistory(newHistory);
        setBodyHistoryIndex(newHistory.length - 1);
      }
    }
  }, [topicHistory, topicHistoryIndex, bodyHistory, bodyHistoryIndex]);

  // Handle undo/redo keyboard shortcuts
  const handleKeyboardShortcut = useCallback((e: KeyboardEvent) => {
    // Check if we're in a text input or contentEditable element
    const target = e.target as HTMLElement;
    const isTextInput = (
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.getAttribute('contenteditable') === 'true'
    );

    // If in edit mode, let the editor handle its own undo/redo
    if (isTextInput && (isEditingTopic || isEditingBody)) {
      return;
    }

    // Handle Undo: Cmd+Z or Ctrl+Z
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      
      // Determine if we should undo topic or body based on which was most recently changed
      // For simplicity, always undoing body text first, then topic
      if (bodyHistoryIndex > 0) {
        const newIndex = bodyHistoryIndex - 1;
        setBodyHistoryIndex(newIndex);
        setBodyValue(bodyHistory[newIndex]);
        // Update in database
        onUpdate(card.id, { bodyText: bodyHistory[newIndex] });
      } else if (topicHistoryIndex > 0) {
        const newIndex = topicHistoryIndex - 1;
        setTopicHistoryIndex(newIndex);
        setTopicValue(topicHistory[newIndex]);
        // Update in database
        onUpdate(card.id, { topic: topicHistory[newIndex] });
      }
    }
    
    // Handle Redo: Cmd+Shift+Z or Ctrl+Shift+Z or Ctrl+Y
    if ((e.metaKey || e.ctrlKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
      e.preventDefault();
      
      // For simplicity, always redoing topic first, then body
      if (topicHistoryIndex < topicHistory.length - 1) {
        const newIndex = topicHistoryIndex + 1;
        setTopicHistoryIndex(newIndex);
        setTopicValue(topicHistory[newIndex]);
        // Update in database
        onUpdate(card.id, { topic: topicHistory[newIndex] });
      } else if (bodyHistoryIndex < bodyHistory.length - 1) {
        const newIndex = bodyHistoryIndex + 1;
        setBodyHistoryIndex(newIndex);
        setBodyValue(bodyHistory[newIndex]);
        // Update in database
        onUpdate(card.id, { bodyText: bodyHistory[newIndex] });
      }
    }
  }, [topicHistory, topicHistoryIndex, bodyHistory, bodyHistoryIndex, isEditingTopic, isEditingBody, onUpdate, card.id]);

  // Add global keyboard listener for undo/redo
  useEffect(() => {
    window.addEventListener('keydown', handleKeyboardShortcut);
    return () => {
      window.removeEventListener('keydown', handleKeyboardShortcut);
    };
  }, [handleKeyboardShortcut]);
  
  useEffect(() => {
    // Only update from props if we're not actively editing
    // This prevents cursor jumping when typing
    if (!isEditingTopic) {
      setTopicValue(card.topic);
    }
    if (!isEditingBody) {
      setBodyValue(card.bodyText);
    }
  }, [card.topic, card.bodyText, isEditingTopic, isEditingBody]);

  // Track editing state changes and notify parent
  useEffect(() => {
    const isEditing = isEditingTopic || isEditingBody;
    onEditingStateChange?.(isEditing);
    
    // If we just stopped editing, flush any pending updates immediately
    if (!isEditing) {
      flushPendingUpdates();
    }
  }, [isEditingTopic, isEditingBody, onEditingStateChange]);

  // Cleanup: flush pending updates on unmount
  useEffect(() => {
    return () => {
      flushPendingUpdates();
    };
  }, []);

  const handleTopicEdit = () => {
    setIsEditingTopic(true);
    setTimeout(() => topicRef.current?.focus(), 0);
  };

  const handleBodyEdit = () => {
    setIsEditingBody(true);
  };

  const handleTopicSave = () => {
    // Only update if content actually changed
    if (topicValue !== card.topic) {
      onUpdate(card.id, { topic: topicValue });
      // Add to history when saved
      addToHistory(topicValue, true);
    }
    setIsEditingTopic(false);
  };

  const handleTopicCancel = () => {
    // Immediately flush any pending updates before canceling
    flushPendingUpdates();
    setTopicValue(card.topic);
    setIsEditingTopic(false);
  };

  const handleBodySave = () => {
    if (isOverLimit) {
      toast.error(`Please keep text under ${CHARACTER_LIMIT} characters`);
      return;
    }
    
    // Get the most up-to-date content directly from the editor
    let contentToSave = bodyValue;
    if (editorInstanceRef.current) {
      contentToSave = editorInstanceRef.current.getHTML();
    }
    
    // Only update if content actually changed
    if (contentToSave !== card.bodyText) {
      onUpdate(card.id, { bodyText: contentToSave });
      // Add to history when saved
      addToHistory(contentToSave, false);
    }
    setIsEditingBody(false);
  };

  const handleBodyCancel = () => {
    // Get the latest editor content before canceling
    // This ensures we're not losing the last character
    if (editorInstanceRef.current) {
      const editorContent = editorInstanceRef.current.getHTML();
      // Only update if the content actually changed and is valid
      if (editorContent && editorContent !== '<p><br></p>' && editorContent !== card.bodyText) {
        onUpdate(card.id, { bodyText: editorContent });
      }
    }
    setBodyValue(card.bodyText);
    setIsEditingBody(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent, saveHandler: () => void) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      saveHandler();
    }
    // Escape key no longer needed as we removed cancel functionality
  };



  const currentBodyLength = getTextLength(bodyValue);
  const isOverLimit = currentBodyLength > CHARACTER_LIMIT;

  return (
    <div className="w-full max-w-lg mx-auto rounded-2xl shadow-xl bg-after-bg overflow-hidden">
      {/* Removed motion.div layout animation to prevent card stretch/bounce */}
      {/* Card Header */}
      <div className="p-6 pb-4">
        

        {/* Topic Section */}
        <div className="mb-4">
          {isEditingTopic ? (
            <div className="space-y-2">
              <textarea
                ref={topicRef}
                value={topicValue}
                onChange={(e) => {
                  setTopicValue(e.target.value);
                  queueSnapshot();
                }}
                onBlur={handleTopicSave}
                onKeyDown={(e) => handleKeyDown(e, handleTopicSave)}
                className="w-full text-xl font-bold bg-transparent border-2 border-gray-300 rounded-lg p-3 resize-none focus:outline-none focus:border-blue-800"
                rows={2}
                placeholder="Enter topic..."
              />
              <div className="ml-auto">
                <button
                  onClick={handleTopicSave}
                  className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                  title="Save"
                >
                  <Check size={16} className="text-green-600" />
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={handleTopicEdit}
              className="group cursor-pointer p-2 rounded-lg hover:bg-white/50 transition-colors"
            >
              <h2 className="text-xl font-bold text-gray-900 leading-tight">
                  {card.topic || 'Click to add topic...'}
                </h2>
            </div>
          )}
        </div>


      </div>

      {/* Card Body */}
      <div className="px-6 pb-6">
        {isEditingBody ? (
          <div className="space-y-2">
            <div className="rich-text-editor-container">
              <ReactQuill
                theme="snow"
                value={bodyValue}
                onChange={(content, delta, source, editor) => {
                  setBodyValue(content);
                  queueSnapshot();
                  // Store the editor instance for direct access
                  editorInstanceRef.current = editor;
                }}
                onBlur={() => {
                  // Need to use setTimeout to ensure ReactQuill's internal handlers run first
                  setTimeout(() => {
                    handleBodySave();
                    setIsEditingBody(false); // Explicitly exit edit mode
                  }, 100);
                }}
                className={`bg-white/80 ${isOverLimit ? 'quill-error' : ''}`}
                placeholder="Enter your thoughts..."
                modules={{
                  toolbar: [
                    ['bold', 'italic'],
                    [{ 'list': 'bullet' }],
                    [{ 'indent': '-1' }, { 'indent': '+1' }]
                  ]
                }}
                formats={['bold', 'italic', 'list', 'bullet', 'indent']}
              />
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={handleBodySave}
                disabled={isOverLimit}
                className="p-1 rounded bg-green-100 hover:bg-green-200 text-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check size={16} />
              </button>
              <div className={`text-sm ${isOverLimit ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                {currentBodyLength}/{CHARACTER_LIMIT}
              </div>
            </div>
            {isOverLimit && (
              <p className="text-sm text-red-600">
                Please shorten text for best view
              </p>
            )}
          </div>
        ) : (
          <div
            onClick={handleBodyEdit}
            className="group cursor-pointer p-4 rounded-lg hover:bg-white/50 transition-colors min-h-[200px]"
          >
            <div className="flex-1">
                {card.bodyText ? (
                  <div 
                    className="text-gray-800 leading-relaxed rich-text-content"
                    dangerouslySetInnerHTML={{ __html: card.bodyText }}
                  />
                ) : (
                  <div className="text-gray-500 italic">
                    Click to add your thoughts...
                  </div>
                )}
              </div>
          </div>
        )}
      </div>

      {/* Character count only shown when editing */}
    </div>
  );
});

export default CardComponent;
