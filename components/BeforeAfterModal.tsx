'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface BeforeAfterModalProps {
  isOpen: boolean;
  situationTitle: string;
  initialContent?: string;
  onSubmit: (content: string) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export const BeforeAfterModal = ({
  isOpen,
  situationTitle,
  initialContent = '',
  onSubmit,
  onClose,
  isLoading = false
}: BeforeAfterModalProps) => {
  const [content, setContent] = useState(initialContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setContent(initialContent || '1. ');
      // Focus the textarea after a short delay to ensure modal is rendered
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          // Position cursor at the end
          const length = textareaRef.current.value.length;
          textareaRef.current.setSelectionRange(length, length);
        }
      }, 100);
    }
  }, [isOpen, initialContent]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    
    if (e.key === 'Tab') {
      e.preventDefault();
      
      // Find the current line boundaries
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = value.indexOf('\n', start);
      const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;
      const currentLine = value.substring(lineStart, actualLineEnd);
      
      console.log('Tab pressed on line:', JSON.stringify(currentLine));
      
      if (e.shiftKey) {
        // Shift+Tab: Convert nested item to numbered item
        const nestedMatch = currentLine.match(/^(\s+)([a-z])\. (.*)$/);
        if (nestedMatch) {
          const textContent = nestedMatch[3];
          
          // Find next number to use
          const allLines = value.split('\n');
          let nextNumber = 1;
          for (const line of allLines) {
            const match = line.match(/^(\d+)\./); 
            if (match) {
              nextNumber = Math.max(nextNumber, parseInt(match[1]) + 1);
            }
          }
          
          const newLine = `${nextNumber}. ${textContent}`;
          const newValue = value.substring(0, lineStart) + newLine + value.substring(actualLineEnd);
          setContent(newValue);
          
          console.log('Converted nested to numbered:', newLine);
          
          setTimeout(() => {
            const newCursorPos = lineStart + newLine.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
          }, 0);
        }
      } else {
        // Tab: Convert numbered item to nested item
        const numberedMatch = currentLine.match(/^(\d+)\. (.*)$/);
        if (numberedMatch) {
          const textContent = numberedMatch[2];
          const newLine = `   a. ${textContent}`;
          const newValue = value.substring(0, lineStart) + newLine + value.substring(actualLineEnd);
          setContent(newValue);
          
          console.log('Converted numbered to nested:', newLine);
          
          setTimeout(() => {
            const newCursorPos = lineStart + newLine.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
          }, 0);
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const value = textarea.value;
      
      // Find the current line
      const lines = value.substring(0, start).split('\n');
      const currentLine = lines[lines.length - 1];
      
      // Check if we're on a numbered line (before item)
      const numberedLineRegex = /^(\d+)\.\s/;
      const alphabetLineRegex = /^\s+([a-z])\.\s/;
      
      if (numberedLineRegex.test(currentLine.trim())) {
        // Get next number
        const match = currentLine.trim().match(numberedLineRegex);
        if (match) {
          const nextNumber = parseInt(match[1]) + 1;
          const newValue = value.substring(0, start) + '\n' + nextNumber + '. ' + value.substring(start);
          setContent(newValue);
          
          setTimeout(() => {
            const newPosition = start + nextNumber.toString().length + 3; // '\n' + number + '. ' 
            textarea.setSelectionRange(newPosition, newPosition);
          }, 0);
        }
      } else if (alphabetLineRegex.test(currentLine)) {
        // Get next letter
        const match = currentLine.match(alphabetLineRegex);
        if (match) {
          const currentLetter = match[1];
          const nextLetter = String.fromCharCode(currentLetter.charCodeAt(0) + 1);
          const indent = currentLine.match(/^(\s+)/)?.[1] || '   ';
          const newValue = value.substring(0, start) + '\n' + indent + nextLetter + '. ' + value.substring(start);
          setContent(newValue);
          
          setTimeout(() => {
            const newPosition = start + indent.length + 4; // '\n' + indent + letter + '. '
            textarea.setSelectionRange(newPosition, newPosition);
          }, 0);
        }
      } else {
        // Regular enter
        const newValue = value.substring(0, start) + '\n' + value.substring(start);
        setContent(newValue);
        
        setTimeout(() => {
          textarea.setSelectionRange(start + 1, start + 1);
        }, 0);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onSubmit(content);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Before & After Items
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              For: <span className="font-medium">{situationTitle}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
          <div className="p-6 flex-1">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter before items (numbered) and after items (indented with letters):
              </label>
              <div className="text-xs text-gray-500 mb-3 space-y-1">
                <p>• Type numbered items (1. 2. 3.) for before items</p>
                <p>• Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Tab</kbd> to add indented after items (a. b. c.)</p>
                <p>• Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd> to add next item in sequence</p>
              </div>
            </div>
            
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
              placeholder="1. First before item&#10;   a. First after item&#10;   b. Second after item&#10;2. Second before item&#10;   a. Another after item"
              disabled={isLoading}
            />
          </div>

          <div className="p-6 border-t border-gray-200 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !content.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Before & After Items'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
