'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, FileText, CheckCircle, ArrowRight } from 'lucide-react';

interface BulkAddModalProps {
  isOpen: boolean;
  type: 'situation' | 'before' | 'after';
  title: string;
  onSubmit: (items: string[]) => void;
  onClose: () => void;
  isLoading?: boolean;
}

interface EditModalProps {
  isOpen: boolean;
  type: 'situation' | 'before' | 'after';
  currentTitle: string;
  onSubmit: (title: string) => void;
  onClose: () => void;
  isLoading?: boolean;
}

interface DeleteModalProps {
  isOpen: boolean;
  type: 'situation' | 'before' | 'after';
  title: string;
  onConfirm: () => void;
  onClose: () => void;
}

const BulkAddModalComponent: React.FC<BulkAddModalProps> = ({
  isOpen,
  type,
  title,
  onSubmit,
  onClose,
  isLoading = false
}) => {
  const [textValue, setTextValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTextValue('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = textValue
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '');
    
    if (lines.length === 0) return;
    
    onSubmit(lines);
  };

  const getTypeColor = () => {
    switch (type) {
      case 'situation': return 'text-blue-600';
      case 'before': return 'text-orange-600';
      case 'after': return 'text-green-600';
      default: return 'text-blue-600';
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'situation': return <FileText size={20} />;
      case 'before': return <ArrowRight size={20} />;
      case 'after': return <CheckCircle size={20} />;
      default: return <FileText size={20} />;
    }
  };

  const getItemCount = () => {
    const lines = textValue
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '');
    return lines.length;
  };

  const getPlaceholderText = () => {
    switch (type) {
      case 'situation': return 'Enter situation titles, one per line:\n\nMeeting with boss\nPublic speaking\nJob interview';
      case 'before': return 'Enter before item titles, one per line:\n\nFeeling anxious\nSweaty palms\nRacing thoughts';
      case 'after': return 'Enter after item titles, one per line:\n\nFeeling confident\nCalm and relaxed\nClear thinking';
      default: return 'Enter titles, one per line';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-md"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={getTypeColor()}>
              {getTypeIcon()}
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter one {type} per line:
              </label>
              <textarea
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                placeholder={getPlaceholderText()}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                autoFocus
              />
              {getItemCount() > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  {getItemCount()} item{getItemCount() !== 1 ? 's' : ''} will be created
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
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
                disabled={isLoading || getItemCount() === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  `Create ${getItemCount()} Item${getItemCount() !== 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

function EditModalComponent({ isOpen, type, currentTitle, onSubmit, onClose, isLoading = false }: EditModalProps) {
  const [title, setTitle] = useState(currentTitle);

  useEffect(() => {
    if (isOpen) {
      setTitle(currentTitle);
    }
  }, [isOpen, currentTitle]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSubmit(title.trim());
    }
  };

  const getColor = () => {
    switch (type) {
      case 'situation': return 'blue';
      case 'before': return 'orange';
      case 'after': return 'green';
    }
  };

  const color = getColor();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full"
      >
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Edit {type === 'situation' ? 'Situation' : type === 'before' ? 'Before Item' : 'After Item'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-${color}-500 focus:border-transparent`}
              placeholder={`Enter ${type} title`}
              required
              disabled={isLoading}
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !title.trim()}
              className={`flex-1 bg-${color}-600 hover:bg-${color}-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Updating...
                </>
              ) : (
                'Update'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}



function DeleteModalComponent({ isOpen, type, title, onConfirm, onClose }: DeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full"
      >
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Delete {type}
        </h2>
        
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete "{title}"? 
          {type === 'situation' && ' This will also delete all related before and after items.'}
          {type === 'before' && ' This will also delete all related after items.'}
          {' '}This action cannot be undone.
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}
