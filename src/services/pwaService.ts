import { useState, useEffect, useCallback } from 'react';

// Интерфейс для события beforeinstallprompt
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

/**
 * Регистрация Service Worker
 */
export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker успешно зарегистрирован с областью:', reg.scope);

          // Проверка обновлений
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] Доступна новая версия приложения.');
                }
              };
            }
          };
        })
        .catch((err) => {
          console.warn('[PWA] Ошибка регистрации Service Worker:', err);
        });
    });
  }
}

/**
 * Хук для управления установкой PWA (beforeinstallprompt и подсказка для iOS)
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator &&
        (navigator as unknown as { standalone: boolean }).standalone === true)
    );
  });

  const [isIOS] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  });

  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    // 1. Слушаем событие beforeinstallprompt (Chrome, Edge, Android, Desktop)
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // 2. Слушаем успешную установку
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.log('[PWA] Приложение «Тихие Стены PRO» успешно установлено.');
    };

    // 3. Слушаем изменение display-mode (если пользователь установил или запустил в standalone)
    const matchMediaStandalone = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };

    matchMediaStandalone.addEventListener('change', handleDisplayModeChange);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      matchMediaStandalone.removeEventListener('change', handleDisplayModeChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
        return true;
      }
      return false;
    }

    // Если это iOS устройство и нативный prompt недоступен
    if (isIOS && !isInstalled) {
      setShowIOSPrompt(true);
      return false;
    }

    return false;
  }, [deferredPrompt, isIOS, isInstalled]);

  // Доступна ли установка (либо есть prompt, либо это iOS и еще не установлено)
  const canInstall = !isInstalled && (Boolean(deferredPrompt) || (isIOS && !isInstalled));

  return {
    canInstall,
    isInstalled,
    isIOS,
    showIOSPrompt,
    setShowIOSPrompt,
    promptInstall,
  };
}
