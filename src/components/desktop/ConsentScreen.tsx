'use client';

import { useState, useEffect } from 'react';
import { Shield, Check, Monitor, Lock, AlertCircle } from 'lucide-react';

export default function ConsentScreen({ onAccept }: { onAccept: () => void }) {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-900/90 backdrop-blur-md p-4">
      <div className="max-w-xl w-full bg-white dark:bg-zinc-950 rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-500">
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight uppercase">Privacy & Safety</h2>
              <p className="text-zinc-500 text-sm">Desktop Agent Activation Required</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              To provide professional time tracking and productivity analysis, the Vortex Cubes Desktop Agent requires your consent to monitor system activity.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-600">
                  <Check className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">What we track</span>
                </div>
                <ul className="text-[11px] space-y-1.5 font-medium">
                  <li className="flex items-center gap-2"><Monitor className="w-3 h-3" /> System Active/Idle status</li>
                  <li className="flex items-center gap-2"><Lock className="w-3 h-3" /> Sleep/Wake/Lock events</li>
                </ul>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">What we DON'T track</span>
                </div>
                <ul className="text-[11px] space-y-1.5 font-medium">
                  <li className="flex items-center gap-2">No Keystroke Content</li>
                  <li className="flex items-center gap-2">No Clipboard Data</li>
                  <li className="flex items-center gap-2">No Private Files</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3 mb-6">
              <input 
                type="checkbox" 
                id="consent-check"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="w-5 h-5 accent-blue-600"
              />
              <label htmlFor="consent-check" className="text-xs font-medium cursor-pointer">
                I understand and consent to the activity tracking for workplace productivity.
              </label>
            </div>

            <button
              onClick={onAccept}
              disabled={!accepted}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
            >
              Activate Desktop Agent
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
