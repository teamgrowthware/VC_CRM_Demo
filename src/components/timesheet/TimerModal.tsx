'use client';

import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle2, AlertCircle, Star } from 'lucide-react';
import { stopTimer } from '@/lib/api/timesheet';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

interface TimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  activeTimer: any;
}

const WORK_CATEGORIES = [
  'DEVELOPMENT',
  'DESIGN',
  'MEETING',
  'RESEARCH',
  'QA',
  'DOCUMENTATION',
  'OTHER'
];

export default function TimerModal({ isOpen, onClose, onSuccess, activeTimer }: TimerModalProps) {
  const [description, setDescription] = useState('');
  const [workCategory, setWorkCategory] = useState('DEVELOPMENT');
  const [isBillable, setIsBillable] = useState(true);
  const [rating, setRating] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (activeTimer?.description) setDescription(activeTimer.description);
    if (activeTimer?.workCategory) setWorkCategory(activeTimer.workCategory);
  }, [activeTimer]);

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Please provide a work description');
      return;
    }

    setIsSubmitting(true);
    try {
      await stopTimer({
        description,
        workCategory,
        productivityRating: rating,
        isBillable
      });
      toast.success('Work log saved successfully');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Failed to save work log');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-[#0d0d0d] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[95vh] flex flex-col"
        >
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">Stop Session</h3>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Complete your work log</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-8 space-y-6 overflow-y-auto flex-1">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Work Description</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What did you accomplish?"
                className="w-full min-h-[120px] p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none text-sm font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Category</label>
                <select 
                  value={workCategory}
                  onChange={(e) => setWorkCategory(e.target.value)}
                  className="w-full p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                >
                  {WORK_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Billable</label>
                <div 
                  onClick={() => setIsBillable(!isBillable)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    isBillable 
                    ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600' 
                    : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400'
                  }`}
                >
                  <span className="text-sm font-bold uppercase tracking-tight">{isBillable ? 'Yes' : 'No'}</span>
                  <CheckCircle2 className={`w-4 h-4 ${isBillable ? 'opacity-100' : 'opacity-0'}`} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Productivity Rating</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button 
                    key={star}
                    onClick={() => setRating(star)}
                    className={`p-1 transition-transform active:scale-95 ${rating >= star ? 'text-amber-500' : 'text-zinc-200 dark:text-zinc-800'}`}
                  >
                    <Star className={`w-6 h-6 ${rating >= star ? 'fill-current' : ''}`} />
                  </button>
                ))}
                <span className="ml-2 text-xs font-black text-zinc-500">
                  {rating === 1 && 'Low'}
                  {rating === 2 && 'Average'}
                  {rating === 3 && 'Good'}
                  {rating === 4 && 'High'}
                  {rating === 5 && 'Outstanding'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-900 flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-sm font-bold hover:bg-white dark:hover:bg-black transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 px-6 rounded-2xl shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Submit Work Log</>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
