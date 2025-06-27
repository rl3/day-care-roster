import React, { useState, useEffect } from 'react';
import { usePWA, useOfflineStatus } from '../hooks/usePWA';

interface PWAPromptProps {
  className?: string;
}

export const PWAPrompt: React.FC<PWAPromptProps> = ({ className = '' }) => {
  const [state, actions] = usePWA();
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  useEffect(() => {
    // Zeige Update-Prompt wenn Update verfügbar
    if (state.updateAvailable) {
      setShowUpdatePrompt(true);
    }

    // Zeige Install-Prompt nach kurzer Verzögerung
    if (state.canInstall && !state.isInstalled) {
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
      }, 10000); // 10 Sekunden warten

      return () => clearTimeout(timer);
    }

    // Zeige Notification-Prompt wenn möglich
    if (state.notificationPermission === 'default' && state.isInstalled) {
      const timer = setTimeout(() => {
        setShowNotificationPrompt(true);
      }, 5000); // 5 Sekunden warten

      return () => clearTimeout(timer);
    }
  }, [state]);

  const handleInstallApp = async () => {
    const success = await actions.installApp();
    if (success) {
      setShowInstallPrompt(false);
    }
  };

  const handleEnableNotifications = async () => {
    const success = await actions.enableNotifications();
    setShowNotificationPrompt(false);
    if (success) {
      alert('Benachrichtigungen aktiviert! Sie erhalten jetzt Push-Benachrichtigungen.');
    }
  };

  const handleApplyUpdate = async () => {
    await actions.applyUpdate();
    setShowUpdatePrompt(false);
  };

  return (
    <div className={`pwa-prompts ${className}`}>
      {/* Offline Status */}
      {state.isOffline && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 z-50">
          <span className="font-medium">📡 Offline-Modus</span>
          <span className="ml-2 text-sm">Einige Funktionen sind eingeschränkt</span>
        </div>
      )}

      {/* Update Prompt */}
      {showUpdatePrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="text-4xl mb-4">🔄</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Update verfügbar
              </h3>
              <p className="text-gray-600 mb-6">
                Eine neue Version der App ist verfügbar. Möchten Sie jetzt aktualisieren?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleApplyUpdate}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Jetzt aktualisieren
                </button>
                <button
                  onClick={() => setShowUpdatePrompt(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Später
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Install Prompt */}
      {showInstallPrompt && (
        <div className="fixed bottom-4 left-4 right-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg shadow-xl p-4 z-40">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">📱</span>
                <h3 className="font-semibold">App installieren</h3>
              </div>
              <p className="text-sm opacity-90">
                Installieren Sie Kita Dienstplan für den schnellen Zugriff und bessere Performance.
              </p>
            </div>
            <div className="flex flex-col gap-2 ml-4">
              <button
                onClick={handleInstallApp}
                className="bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Installieren
              </button>
              <button
                onClick={() => setShowInstallPrompt(false)}
                className="text-white text-sm opacity-75 hover:opacity-100 transition-opacity"
              >
                Nicht jetzt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Prompt */}
      {showNotificationPrompt && (
        <div className="fixed bottom-4 left-4 right-4 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg shadow-xl p-4 z-40">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">🔔</span>
                <h3 className="font-semibold">Benachrichtigungen aktivieren</h3>
              </div>
              <p className="text-sm opacity-90">
                Erhalten Sie wichtige Updates zu Monatsabschlüssen und Erinnerungen.
              </p>
            </div>
            <div className="flex flex-col gap-2 ml-4">
              <button
                onClick={handleEnableNotifications}
                className="bg-white text-green-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Aktivieren
              </button>
              <button
                onClick={() => setShowNotificationPrompt(false)}
                className="text-white text-sm opacity-75 hover:opacity-100 transition-opacity"
              >
                Nicht jetzt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOffline = useOfflineStatus();
  
  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white text-center py-1 text-sm z-50">
      📡 Offline - Änderungen werden automatisch synchronisiert
    </div>
  );
};

export const PWAStatus: React.FC = () => {
  const [state, actions] = usePWA();
  const [showDetails, setShowDetails] = useState(false);

  if (!showDetails) {
    return (
      <button
        onClick={() => setShowDetails(true)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-colors z-30"
        title="PWA Status"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl p-4 max-w-xs border z-30">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-gray-900">App Status</h3>
        <button
          onClick={() => setShowDetails(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Installiert:</span>
          <span className={state.isInstalled ? 'text-green-600' : 'text-gray-500'}>
            {state.isInstalled ? '✓' : '✗'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Offline-bereit:</span>
          <span className={state.offlineReady ? 'text-green-600' : 'text-gray-500'}>
            {state.offlineReady ? '✓' : '✗'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Benachrichtigungen:</span>
          <span className={state.notificationPermission === 'granted' ? 'text-green-600' : 'text-gray-500'}>
            {state.notificationPermission === 'granted' ? '✓' : '✗'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Online:</span>
          <span className={!state.isOffline ? 'text-green-600' : 'text-red-600'}>
            {!state.isOffline ? '✓' : '✗'}
          </span>
        </div>
      </div>

      {state.updateAvailable && (
        <button
          onClick={actions.applyUpdate}
          className="w-full mt-3 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 transition-colors"
        >
          Update anwenden
        </button>
      )}

      {state.canInstall && !state.isInstalled && (
        <button
          onClick={actions.installApp}
          className="w-full mt-2 bg-green-600 text-white py-2 px-3 rounded text-sm hover:bg-green-700 transition-colors"
        >
          App installieren
        </button>
      )}

      {state.notificationPermission === 'default' && (
        <button
          onClick={actions.enableNotifications}
          className="w-full mt-2 bg-purple-600 text-white py-2 px-3 rounded text-sm hover:bg-purple-700 transition-colors"
        >
          Benachrichtigungen
        </button>
      )}
    </div>
  );
};

export default PWAPrompt;