import { useState } from 'react';

export const useAuth = () => {
  const [user] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          return JSON.parse(userStr);
        } catch (e) {
           console.error('Failed to parse user', e);
        }
      }
    }
    return null;
  });

  return { user };
};
