'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Edit3, Check, X } from 'lucide-react';
import { Card, CardType } from '@/lib/types';
import { getTextLength } from '@/lib/utils';
import toast from 'react-hot-toast';

interface CardComponentProps {
  card: Card;
  onUpdate: (cardId: string, updates: Partial<Card>) => void;
  onLiveTextChange?: (cardId: string, updates: Partial<Card>) => void;
}

const CHARACTER_LIMIT = 300;

export default function CardComponent({ card, onUpdate, onLiveTextChange }: CardComponentProps) {
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [isEditingBody, setIsEditingBody] = useState(false);
  const [topicValue, setTopicValue] = useState(card.topic);
  const [bodyValue, setBodyValue] = useState(card.bodyText);
  const [typeValue, setTypeValue] = useState<CardType>(card.type);
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);
  
  const topicRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const queueSnapshot = () => {
    if (!onLiveTextChange) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onLiveTextChange(card.id, { topic: topicValue, bodyText: bodyValue });
    }, 400);
  };

  useEffect(() => {
    setTopicValue(card.topic);
    setBodyValue(card.bodyText);
    setTypeValue(card.type);
  }, [card]);

  const handleTopicEdit = () => {
    setIsEditingTopic(true);
    setTimeout(() => topicRef.current?.focus(), 0);
  };

  const handleBodyEdit = () => {
    setIsEditingBody(true);
    setTimeout(() => bodyRef.current?.focus(), 0);
  };

  const handleTopicSave = () => {
    if (topicValue.trim() !== card.topic) {
      onUpdate(card.id, { topic: topicValue.trim() });
    }
    setIsEditingTopic(false);
  };

  const handleTopicCancel = () => {
    setTopicValue(card.topic);
    setIsEditingTopic(false);
  };

  const handleBodySave = () => {
    const textLength = getTextLength(bodyValue);
    
    if (textLength > CHARACTER_LIMIT) {
      toast.error(`Please shorten text to ${CHARACTER_LIMIT} characters or less`);
      return;
    }
    
    if (bodyValue.trim() !== card.bodyText) {
      onUpdate(card.id, { bodyText: bodyValue.trim() });
    }
    setIsEditingBody(false);
  };

  const handleBodyCancel = () => {
    setBodyValue(card.bodyText);
    setIsEditingBody(false);
  };

  const handleTypeChange = (newType: CardType) => {
    setIsTypeMenuOpen(false);
    setTypeValue(newType);
    onUpdate(card.id, { type: newType });
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

  const getBackgroundClass = () => {
    return typeValue === 'Before' ? 'bg-before-bg border-before-border' : 'bg-after-bg border-after-border';
  };

  const getTypeButtonClass = (type: CardType) => {
    const isSelected = typeValue === type;
    const baseClass = 'px-3 py-1 rounded-full text-sm font-medium transition-colors';
    
    if (type === 'Before') {
      return `${baseClass} ${isSelected ? 'bg-red-200 text-red-800' : 'bg-gray-100 text-gray-600 hover:bg-red-100'}`;
    } else {
      return `${baseClass} ${isSelected ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-600 hover:bg-blue-100'}`;
    }
  };

  const currentBodyLength = getTextLength(bodyValue);
  const isOverLimit = currentBodyLength > CHARACTER_LIMIT;

  return (
    <motion.div
      layout
      className={`w-full max-w-lg mx-auto rounded-2xl shadow-xl border-2 ${getBackgroundClass()} overflow-hidden`}
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
                onChange={(e) => { setTopicValue(e.target.value); queueSnapshot(); }}
                onKeyDown={(e) => handleKeyDown(e, handleTopicSave, handleTopicCancel)}
                className="w-full text-xl font-bold bg-transparent border-2 border-gray-300 rounded-lg p-3 resize-none focus:outline-none focus:border-purple-500"
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
              <div className="flex items-start justify-between">
                <h2 className="text-xl font-bold text-gray-900 leading-tight">
                  {card.topic || 'Click to add topic...'}
                </h2>
                <Edit3 size={16} className="text-gray-400 group-hover:text-gray-600 mt-1 ml-2 flex-shrink-0" />
              </div>
            </div>
          )}
        </div>

        {/* Type Indicator / Menu */}
        <div className="mb-4">
          {isTypeMenuOpen ? (
            <div className="flex gap-2">
              <button
                onClick={() => handleTypeChange('Before')}
                className={getTypeButtonClass('Before')}
              >
                Before
              </button>
              <button
                onClick={() => handleTypeChange('After')}
                className={getTypeButtonClass('After')}
              >
                After
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsTypeMenuOpen(true)}
              className={`${getTypeButtonClass(typeValue)} shadow`}
            >
              {typeValue}
            </button>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="px-6 pb-6">
        {isEditingBody ? (
          <div className="space-y-2">
            <textarea
              ref={bodyRef}
              value={bodyValue}
              onChange={(e) => { setBodyValue(e.target.value); queueSnapshot(); }}
              onKeyDown={(e) => handleKeyDown(e, handleBodySave, handleBodyCancel)}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              className={`w-full bg-white/80 border-2 rounded-lg p-4 resize-none focus:outline-none h-64 max-h-[60vh] overflow-y-auto ${
                isOverLimit ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-purple-500'
              }`}
              placeholder="Enter your thoughts..."
            />
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
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {card.bodyText ? (
                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {card.bodyText}
                  </div>
                ) : (
                  <div className="text-gray-500 italic">
                    Click to add your thoughts...
                  </div>
                )}
              </div>
              <Edit3 size={16} className="text-gray-400 group-hover:text-gray-600 ml-2 flex-shrink-0" />
            </div>
          </div>
        )}
      </div>

      {/* Character Count (when not editing) */}
      {!isEditingBody && card.bodyText && (
        <div className="px-6 pb-4">
          <div className="text-xs text-gray-500 text-right">
            {getTextLength(card.bodyText)}/{CHARACTER_LIMIT} characters
          </div>
        </div>
      )}
    </motion.div>
  );
}
