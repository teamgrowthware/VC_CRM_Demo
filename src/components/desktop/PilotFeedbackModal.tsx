'use client';

import React, { useState } from 'react';
import { Star, MessageSquare, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { submitPilotFeedback } from '@/lib/api/pilot';
import { toast } from 'sonner';

interface PilotFeedbackModalProps {
  onClose: () => void;
}

export default function PilotFeedbackModal({ onClose }: PilotFeedbackModalProps) {
  const [rating, setRating] = useState(0);
  const [isIdleAccurate, setIsIdleAccurate] = useState<boolean | null>(null);
  const [hadFalsePause, setHadFalsePause] = useState<boolean | null>(null);
  const [hasPerformanceIssue, setHasPerformanceIssue] = useState<boolean | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0 || isIdleAccurate === null) {
      toast.error('Please complete the basic feedback');
      return;
    }

    try {
      setSubmitting(true);
      await submitPilotFeedback({
        isIdleAccurate: isIdleAccurate!,
        hadFalsePause: hadFalsePause || false,
        hasPerformanceIssue: hasPerformanceIssue || false,
        rating,
        comment,
        appVersion: '1.0.0-pilot'
      });
      toast.success('Thank you for your feedback!');
      localStorage.setItem('pilot_feedback_submitted', 'true');
      onClose();
    } catch (error) {
      toast.error('Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-black tracking-tighter">Pilot Feedback</h2>
              <p className="text-zinc-500 text-sm">Help us improve the Vortex Desktop Agent</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Rating */}
            <div>
              <p className="text-sm font-bold mb-3">Overall Stability</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setRating(s)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      rating >= s 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-110' 
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600'
                    }`}
                  >
                    <Star className={`w-5 h-5 ${rating >= s ? 'fill-current' : ''}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                <p className="text-sm font-bold mb-3">Is Idle detection accurate?</p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setIsIdleAccurate(true)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${isIdleAccurate === true ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700'}`}
                  >
                    Yes, Perfect
                  </button>
                  <button 
                    onClick={() => setIsIdleAccurate(false)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${isIdleAccurate === false ? 'bg-rose-500/10 border-rose-500 text-rose-600' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700'}`}
                  >
                    No, Laggy
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                <p className="text-sm font-bold mb-3">Any False Auto-Pauses?</p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setHadFalsePause(true)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${hadFalsePause === true ? 'bg-amber-500/10 border-amber-500 text-amber-600' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700'}`}
                  >
                    Yes, It paused while working
                  </button>
                  <button 
                    onClick={() => setHadFalsePause(false)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${hadFalsePause === false ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700'}`}
                  >
                    No, Worked fine
                  </button>
                </div>
              </div>
            </div>

            {/* Comment */}
            <div>
              <p className="text-sm font-bold mb-2">Additional Comments</p>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Any bugs or suggestions?"
                className="w-full h-24 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
              {!submitting && <CheckCircle2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
