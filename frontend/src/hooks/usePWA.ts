import { useState, useEffect } from 'react';
import serviceWorkerManager from '../utils/serviceWorker';

interface PWAState {
  isOffline: boolean;
  updateAvailable: boolean;
  offlineReady: boolean;
  canInstall: boolean;
  isInstalled: boolean;
  notificationPermission: NotificationPermission;
}

interface PWAActions {
  installApp: () => Promise<boolean>;
  applyUpdate: () => Promise<void>;
  enableNotifications: () => Promise<boolean>;
  clearCache: () => Promise<void>;
  refreshApp: () => void;
}

export function usePWA(): [PWAState, PWAActions] {
  const [state, setState] = useState<PWAState>({
    isOffline: !navigator.onLine,
    updateAvailable: false,
    offlineReady: false,
    canInstall: false,
    isInstalled: false,
    notificationPermission: 'default'
  });

  useEffect(() => {
    // Service Worker registrieren
    const initServiceWorker = async () => {
      try {
        await serviceWorkerManager.register({
          onUpdate: (registration) => {
            console.log('Update available');
            setState(prev => ({ ...prev, updateAvailable: true }));
          },
          onOfflineReady: () => {
            console.log('App ready for offline use');
            setState(prev => ({ ...prev, offlineReady: true }));
          },
          onNeedRefresh: () => {
            console.log('New content available, refresh needed');
            setState(prev => ({ ...prev, updateAvailable: true }));
          }
        });
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    };

    initServiceWorker();

    // Online/Offline Status überwachen
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOffline: false }));
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOffline: true }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Installierbarkeit prüfen
    const checkInstallability = () => {
      setState(prev => ({
        ...prev,
        canInstall: serviceWorkerManager.canInstall(),
        isInstalled: window.matchMedia('(display-mode: standalone)').matches ||
                    window.matchMedia('(display-mode: fullscreen)').matches ||
                    (window.navigator as any).standalone === true
      }));
    };

    // Notification Permission prüfen
    const checkNotificationPermission = () => {
      if ('Notification' in window) {
        setState(prev => ({
          ...prev,
          notificationPermission: Notification.permission
        }));
      }
    };

    // Periodische Checks
    const interval = setInterval(() => {
      checkInstallability();
      checkNotificationPermission();
    }, 1000);

    // Initial checks
    checkInstallability();
    checkNotificationPermission();

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // Actions
  const installApp = async (): Promise<boolean> => {
    try {
      const result = await serviceWorkerManager.installApp();
      if (result) {
        setState(prev => ({ 
          ...prev, 
          canInstall: false, 
          isInstalled: true 
        }));
      }
      return result;
    } catch (error) {
      console.error('App installation failed:', error);
      return false;
    }
  };

  const applyUpdate = async (): Promise<void> => {
    try {
      await serviceWorkerManager.applyUpdate();
    } catch (error) {
      console.error('Update application failed:', error);
    }
  };

  const enableNotifications = async (): Promise<boolean> => {
    try {
      const permission = await serviceWorkerManager.requestNotificationPermission();
      setState(prev => ({ ...prev, notificationPermission: permission }));
      
      if (permission === 'granted') {
        const subscription = await serviceWorkerManager.subscribeToPushNotifications();
        
        if (subscription) {
          // Subscription an Backend senden
          await sendSubscriptionToBackend(subscription);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Enable notifications failed:', error);
      return false;
    }
  };

  const clearCache = async (): Promise<void> => {
    try {
      await serviceWorkerManager.clearCache();
      setState(prev => ({ 
        ...prev, 
        updateAvailable: false, 
        offlineReady: false 
      }));
    } catch (error) {
      console.error('Clear cache failed:', error);
    }
  };

  const refreshApp = (): void => {
    window.location.reload();
  };

  return [
    state,
    {
      installApp,
      applyUpdate,
      enableNotifications,
      clearCache,
      refreshApp
    }
  ];
}

// Helper function to send push subscription to backend
async function sendSubscriptionToBackend(subscription: PushSubscription): Promise<void> {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token available');
    }

    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        subscription: subscription.toJSON()
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send subscription to backend');
    }

    console.log('Push subscription sent to backend successfully');
  } catch (error) {
    console.error('Failed to send subscription to backend:', error);
  }
}

// Hook für Offline-Funktionalität
export function useOfflineStatus() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOffline;
}

// Hook für Update-Benachrichtigungen
export function useUpdateAvailable() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    serviceWorkerManager.register({
      onUpdate: (reg) => {
        setUpdateAvailable(true);
        setRegistration(reg);
      }
    });
  }, []);

  const applyUpdate = async () => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  return { updateAvailable, applyUpdate };
}