import React from 'react';
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  href?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'emerald' | 'blue' | 'purple' | 'amber' | 'red' | 'indigo';
}

const colorVariants = {
  emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 group-hover:ring-emerald-500/50',
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 group-hover:ring-blue-500/50',
  purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 group-hover:ring-purple-500/50',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 group-hover:ring-amber-500/50',
  red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 group-hover:ring-red-500/50',
  indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 group-hover:ring-indigo-500/50',
};

export default function StatCard({ title, value, subtitle, icon: Icon, href, trend, color = 'blue' }: StatCardProps) {
  const CardContent = (
    <div className={`bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col justify-between shadow-sm transition-all group h-full ${href ? 'hover:ring-2 hover:-translate-y-0.5 cursor-pointer ' + colorVariants[color].split(' ').find(c => c.startsWith('group-hover:ring-')) : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-sm text-zinc-500 dark:text-zinc-400">{title}</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">{value}</span>
            {trend && (
              <span className={`text-xs font-medium ${trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
            )}
          </div>
        </div>
        <div className={`p-3 rounded-xl transition-transform group-hover:scale-110 ${colorVariants[color].split('group-hover')[0]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {subtitle && (
        <div className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
          {subtitle}
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href} className="block h-full">{CardContent}</Link>;
  }

  return CardContent;
}
