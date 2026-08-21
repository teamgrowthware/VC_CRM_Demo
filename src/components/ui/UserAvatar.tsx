'use client';

import { useState } from 'react';

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  xs: { container: 'w-6 h-6', text: 'text-[10px]' },
  sm: { container: 'w-8 h-8', text: 'text-xs' },
  md: { container: 'w-10 h-10', text: 'text-sm' },
  lg: { container: 'w-12 h-12', text: 'text-base' },
  xl: { container: 'w-24 h-24 lg:w-32 lg:h-32', text: 'text-3xl lg:text-5xl' },
};

export default function UserAvatar({ name, avatarUrl, size = 'md', className = '' }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const s = sizeMap[size];
  const initials = name ? name.substring(0, 2).toUpperCase() : '?';

  if (avatarUrl && !imgError) {
    return (
      <div className={`${s.container} rounded-full overflow-hidden flex-shrink-0 bg-zinc-100 dark:bg-zinc-800 ${className}`}>
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div className={`${s.container} rounded-full flex items-center justify-center flex-shrink-0 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold ${s.text} ${className}`}>
      {initials}
    </div>
  );
}
