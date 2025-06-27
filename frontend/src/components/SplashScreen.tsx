import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onComplete, 
  duration = 2000 
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Progress Animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + (100 / (duration / 50)); // Update every 50ms
      });
    }, 50);

    // Hide splash screen after duration
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300); // Wait for fade out animation
    }, duration);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [duration, onComplete]);

  if (!isVisible) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center z-50 opacity-0 transition-opacity duration-300" />
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center z-50 transition-opacity duration-300">
      <div className="text-center">
        {/* App Icon */}
        <div className="mb-8 animate-pulse">
          <div className="w-32 h-32 mx-auto bg-white bg-opacity-20 rounded-3xl flex items-center justify-center shadow-2xl">
            <svg 
              width="80" 
              height="80" 
              viewBox="0 0 512 512" 
              className="text-white"
              fill="currentColor"
            >
              {/* Simplified version of the main icon */}
              <rect width="512" height="512" rx="64" fill="currentColor" opacity="0.1" />
              
              {/* House shape */}
              <g transform="translate(80, 100)">
                <rect x="0" y="100" width="352" height="200" rx="20" fill="currentColor" opacity="0.9"/>
                <polygon points="176,50 50,120 302,120" fill="currentColor" opacity="0.9"/>
                <rect x="140" y="180" width="72" height="120" rx="36" fill="currentColor" opacity="0.7"/>
                <circle cx="190" cy="230" r="6" fill="currentColor"/>
                <rect x="60" y="150" width="60" height="60" rx="10" fill="currentColor" opacity="0.7"/>
                <rect x="232" y="150" width="60" height="60" rx="10" fill="currentColor" opacity="0.7"/>
              </g>
              
              {/* Children silhouettes */}
              <g transform="translate(200, 350)" fill="currentColor" opacity="0.8">
                <circle cx="-40" cy="-10" r="15"/>
                <rect x="-50" y="5" width="20" height="25" rx="10"/>
                <circle cx="0" cy="-10" r="15"/>
                <rect x="-10" y="5" width="20" height="25" rx="10"/>
                <circle cx="40" cy="-10" r="15"/>
                <rect x="30" y="5" width="20" height="25" rx="10"/>
              </g>
            </svg>
          </div>
        </div>

        {/* App Title */}
        <h1 className="text-4xl font-bold text-white mb-2 animate-fade-in">
          Kita Dienstplan
        </h1>
        
        <p className="text-xl text-white text-opacity-90 mb-8 animate-fade-in-delay">
          Zeiterfassung & Verwaltung
        </p>

        {/* Loading Progress */}
        <div className="w-64 mx-auto">
          <div className="bg-white bg-opacity-20 rounded-full h-2 mb-4">
            <div 
              className="bg-white rounded-full h-2 transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-white text-opacity-75 text-sm">
            Wird geladen... {Math.round(progress)}%
          </p>
        </div>

        {/* Feature highlights */}
        <div className="mt-12 grid grid-cols-3 gap-6 text-white text-opacity-80">
          <div className="text-center animate-slide-up-1">
            <div className="text-2xl mb-2">⏰</div>
            <p className="text-sm">Zeiterfassung</p>
          </div>
          <div className="text-center animate-slide-up-2">
            <div className="text-2xl mb-2">📊</div>
            <p className="text-sm">Statistiken</p>
          </div>
          <div className="text-center animate-slide-up-3">
            <div className="text-2xl mb-2">👶</div>
            <p className="text-sm">Kinderanzahl</p>
          </div>
        </div>

        {/* Bottom branding */}
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <p className="text-white text-opacity-60 text-sm">
            Powered by Claude Code
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fade-in-delay {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-up-1 {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-up-2 {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-up-3 {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
        
        .animate-fade-in-delay {
          animation: fade-in-delay 0.8s ease-out 0.3s both;
        }
        
        .animate-slide-up-1 {
          animation: slide-up-1 0.6s ease-out 1s both;
        }
        
        .animate-slide-up-2 {
          animation: slide-up-2 0.6s ease-out 1.2s both;
        }
        
        .animate-slide-up-3 {
          animation: slide-up-3 0.6s ease-out 1.4s both;
        }
      `}</style>
    </div>
  );
};

// PWA Splash Screen für iOS/Android (CSS-basiert)
export const PWASplashStyles = () => (
  <style jsx global>{`
    /* iOS Splash Screens */
    @media (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) {
      .splash-screen {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        background-size: cover;
      }
    }
    
    /* Android Splash Screens */
    @media (orientation: portrait) {
      .splash-screen {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }
    }
    
    /* PWA Standalone Mode Detection */
    @media (display-mode: standalone) {
      body {
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
        -webkit-tap-highlight-color: transparent;
      }
    }
    
    /* Safe Area für Notch-Geräte */
    @supports (padding: max(0px)) {
      .safe-area-inset-top {
        padding-top: max(20px, env(safe-area-inset-top));
      }
      
      .safe-area-inset-bottom {
        padding-bottom: max(20px, env(safe-area-inset-bottom));
      }
    }
    
    /* PWA App Icon im Dock/Homescreen */
    .pwa-icon {
      width: 180px;
      height: 180px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.2);
    }
  `}</style>
);

export default SplashScreen;