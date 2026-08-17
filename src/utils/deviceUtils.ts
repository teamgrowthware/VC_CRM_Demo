import fpPromise from '@fingerprintjs/fingerprintjs';

export const getClientDeviceMetadata = async () => {
  try {
    const fp = await fpPromise.load();
    const result = await fp.get();

    // Determine login source
    let loginSource = 'WEB_DESKTOP';
    if (typeof window !== 'undefined') {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isPWA = window.matchMedia('(display-mode: standalone)').matches;
      
      if (isPWA) loginSource = 'PWA';
      else if (isMobile) loginSource = 'WEB_MOBILE';
    }

    return {
      deviceFingerprint: result.visitorId,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language || 'en-US',
      loginSource
    };
  } catch (error) {
    console.warn('Failed to get device fingerprint, falling back to anonymous data', error);
    return {
      deviceFingerprint: 'unknown',
      screenResolution: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'unknown',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: typeof navigator !== 'undefined' ? navigator.language : 'en-US',
      loginSource: 'UNKNOWN'
    };
  }
};
