// Service Worker Manager für Kita Dienstplan PWA

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(
    /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
  )
);

type Config = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOfflineReady?: () => void;
  onNeedRefresh?: () => void;
};

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private updateAvailable = false;
  private offlineReady = false;
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  
  // Event Callbacks
  private onUpdate?: (registration: ServiceWorkerRegistration) => void;
  private onOfflineReady?: () => void;
  private onNeedRefresh?: () => void;
  
  constructor() {
    this.setupInstallPrompt();
    this.setupConnectionHandlers();
  }
  
  // Service Worker registrieren
  async register(config: Config = {}): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        this.onUpdate = config.onUpdate;
        this.onOfflineReady = config.onOfflineReady;
        this.onNeedRefresh = config.onNeedRefresh;
        
        const swUrl = `${process.env.PUBLIC_URL}/sw.js`;
        
        if (isLocalhost) {
          await this.registerValidSW(swUrl, config);
          await this.checkValidServiceWorker(swUrl, config);
        } else {
          await this.registerValidSW(swUrl, config);
        }
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }
  
  // Service Worker deregistrieren
  async unregister(): Promise<boolean> {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      return registration.unregister();
    }
    return false;
  }
  
  // Update verfügbar prüfen
  isUpdateAvailable(): boolean {
    return this.updateAvailable;
  }
  
  // Offline bereit prüfen
  isOfflineReady(): boolean {
    return this.offlineReady;
  }
  
  // Update anwenden
  async applyUpdate(): Promise<void> {
    if (this.registration && this.registration.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }
  
  // App installieren
  async installApp(): Promise<boolean> {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      this.deferredPrompt = null;
      return outcome === 'accepted';
    }
    return false;
  }
  
  // Kann App installiert werden?
  canInstall(): boolean {
    return this.deferredPrompt !== null;
  }
  
  // Private Methoden
  private async registerValidSW(swUrl: string, config: Config): Promise<void> {
    try {
      this.registration = await navigator.serviceWorker.register(swUrl);
      
      this.registration.addEventListener('updatefound', () => {
        const installingWorker = this.registration!.installing;
        if (installingWorker == null) return;
        
        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // Update verfügbar
              console.log('New content is available and will be used when all tabs for this page are closed.');
              this.updateAvailable = true;
              
              if (config.onUpdate) {
                config.onUpdate(this.registration!);
              }
              if (this.onNeedRefresh) {
                this.onNeedRefresh();
              }
            } else {
              // Content cached für Offline-Nutzung
              console.log('Content is cached for offline use.');
              this.offlineReady = true;
              
              if (config.onOfflineReady) {
                config.onOfflineReady();
              }
            }
          }
        });
      });
      
      // Erfolgreiche Registrierung
      if (config.onSuccess) {
        config.onSuccess(this.registration);
      }
      
      console.log('Service Worker registered successfully');
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }
  
  private async checkValidServiceWorker(swUrl: string, config: Config): Promise<void> {
    try {
      const response = await fetch(swUrl, {
        headers: { 'Service-Worker': 'script' },
      });
      
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // Service Worker nicht gefunden oder ungültig
        const registration = await navigator.serviceWorker.ready;
        await registration.unregister();
        window.location.reload();
      } else {
        // Service Worker gefunden, registriere
        await this.registerValidSW(swUrl, config);
      }
    } catch (error) {
      console.log('No internet connection found. App is running in offline mode.');
      this.offlineReady = true;
      if (config.onOfflineReady) {
        config.onOfflineReady();
      }
    }
  }
  
  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      console.log('Install prompt can be shown');
    });
    
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      this.deferredPrompt = null;
    });
  }
  
  private setupConnectionHandlers(): void {
    window.addEventListener('online', () => {
      console.log('Connection restored');
      this.syncOfflineActions();
    });
    
    window.addEventListener('offline', () => {
      console.log('Connection lost');
    });
  }
  
  // Offline-Aktionen synchronisieren
  private async syncOfflineActions(): Promise<void> {
    if (this.registration && 'sync' in this.registration) {
      try {
        await this.registration.sync.register('sync-offline-actions');
        console.log('Background sync registered');
      } catch (error) {
        console.error('Background sync registration failed:', error);
      }
    }
  }
  
  // Push-Benachrichtigungen verwalten
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }
    
    if (Notification.permission === 'granted') {
      return 'granted';
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }
    
    return Notification.permission;
  }
  
  async subscribeToPushNotifications(): Promise<PushSubscription | null> {
    if (!this.registration) {
      console.error('No service worker registration available');
      return null;
    }
    
    try {
      const permission = await this.requestNotificationPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission not granted');
        return null;
      }
      
      // VAPID Public Key (wird vom Backend bereitgestellt)
      const vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY || 
        'BEl62iUYgUivxIkv69yViEuiBIa40HI0DLb_BHJE78bZpP-2GUGpgKjKMX-L8L1EgZxmq9j5gg7s_8L_ePu3UQM';
      
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
      });
      
      console.log('Push subscription successful:', subscription);
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }
  
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
  
  // Cache-Status abrufen
  async getCacheStatus(): Promise<{
    version: string;
    caches: string[];
    size: number;
  }> {
    try {
      const cacheNames = await caches.keys();
      let totalSize = 0;
      
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        totalSize += keys.length;
      }
      
      return {
        version: 'v1.0.0',
        caches: cacheNames,
        size: totalSize
      };
    } catch (error) {
      console.error('Failed to get cache status:', error);
      return {
        version: 'unknown',
        caches: [],
        size: 0
      };
    }
  }
  
  // Cache leeren
  async clearCache(): Promise<void> {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('All caches cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }
}

// Singleton Instance
export const serviceWorkerManager = new ServiceWorkerManager();

// Export für direkte Verwendung
export default serviceWorkerManager;