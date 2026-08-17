'use client';

import Link from 'next/link';
import { ArrowRight, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc] dark:bg-[#000000] relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none" />

      <main className="w-full max-w-md p-8 relative z-10 text-center">
        <div className="bg-white/70 dark:bg-zinc-900/50 backdrop-blur-xl border border-white/20 dark:border-zinc-800/50 rounded-3xl p-10 shadow-2xl">
          <div className="w-20 h-20 bg-black dark:bg-white rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
            <span className="text-white dark:text-black font-bold text-3xl tracking-tighter">404</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-4">
            Page Not Found
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed">
            The page you are looking for doesn't exist or has been moved. Let's get you back on track.
          </p>
          
          <Link 
            href="/"
            className="w-full py-3.5 bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
