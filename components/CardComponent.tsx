'use client';

import { useState, useEffect, useRef } from 'react';
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

const CHARACTER_LIMIT = 1000;

export default function CardComponent({ card, onUpdate, onLiveTextChange, onEditingStateChange }: CardComponentProps) {
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [isEditingBody, setIsEditingBody] = useState(false);
  const [topicValue, setTopicValue] = useState(card.topic);
  const [bodyValue, setBodyValue] = useState(card.bodyText);
  
  const topicRef = useRef<HTMLTextAreaElement>(null);
  // Use forwardRef with ReactQuill
  const bodyRef = useRef<any>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const queueSnapshot = () => {
    if (!onLiveTextChange) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onLiveTextChange(card.id, { topic: topicValue, bodyText: bodyValue });
    }, 400);
  };

  // Immediately flush any pending updates (for when editing stops)
  const flushPendingUpdates = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (onLiveTextChange) {
      onLiveTextChange(card.id, { topic: topicValue, bodyText: bodyValue });
    }
  };

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
    setTimeout(() => bodyRef.current?.focus(), 0);
  };

  const handleTopicSave = () => {
    // Only update if content actually changed
    if (topicValue !== card.topic) {
      onUpdate(card.id, { topic: topicValue });
    }
    setIsEditingTopic(false);
  };

  const handleTopicCancel = () => {
    setTopicValue(card.topic);
    setIsEditingTopic(false);
  };

  const handleBodySave = () => {
    if (isOverLimit) {
      toast.error(`Please keep text under ${CHARACTER_LIMIT} characters`);
      return;
    }
    // Only update if content actually changed
    if (bodyValue !== card.bodyText) {
      onUpdate(card.id, { bodyText: bodyValue });
    }
    setIsEditingBody(false);
  };

  const handleBodyCancel = () => {
    setBodyValue(card.bodyText);
    setIsEditingBody(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent, saveHandler: () => void, cancelHandler: () => void) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      saveHandler();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelHandler();
    }
  };



  const currentBodyLength = getTextLength(bodyValue);
  const isOverLimit = currentBodyLength > CHARACTER_LIMIT;

  return (
    <motion.div
      layout
      className="w-full max-w-lg mx-auto rounded-2xl shadow-xl bg-after-bg overflow-hidden"
    >
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
                onKeyDown={(e) => handleKeyDown(e, handleTopicSave, handleTopicCancel)}
                className="w-full text-xl font-bold bg-transparent border-2 border-gray-300 rounded-lg p-3 resize-none focus:outline-none focus:border-blue-800"
                rows={2}
                placeholder="Enter topic..."
                maxLength={100}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleTopicSave}
                  className="p-1 rounded bg-green-100 hover:bg-green-200 text-green-700 transition-colors"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={handleTopicCancel}
                  className="p-1 rounded bg-red-100 hover:bg-red-200 text-red-700 transition-colors"
                >
                  <X size={16} />
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
                onChange={(content) => { setBodyValue(content); queueSnapshot(); }}
                className={`bg-white/80 ${isOverLimit ? 'quill-error' : ''}`}
                placeholder="Enter your thoughts..."
                modules={{
                  toolbar: [
                    ['bold', 'italic'],
                    [{ 'list': 'bullet' }]
                  ]
                }}
                formats={['bold', 'italic', 'list', 'bullet']}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={handleBodySave}
                  disabled={isOverLimit}
                  className="p-1 rounded bg-green-100 hover:bg-green-200 text-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={handleBodyCancel}
                  className="p-1 rounded bg-red-100 hover:bg-red-200 text-red-700 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
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
    </motion.div>
  );
}
