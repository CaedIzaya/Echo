import { useCallback, useEffect, useRef, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __pwaInstallEvent?: BeforeInstallPromptEvent | null;
  }
}

/**
 * - idle        : 未检测到安装条件
 * - available   : Chrome/Edge 已触发 beforeinstallprompt，可弹出系统安装对话框
 * - ios         : iOS Safari，需手动操作
 * - installed   : 已以 standalone 模式运行
 */
export type InstallState = 'idle' | 'available' | 'ios' | 'installed';

const DISMISS_KEY = 'pwa_install_dismissed_at';
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 天

function isDismissedRecently(): boolean {
  if (typeof window === 'undefined') return false;
  const ts = localStorage.getItem(DISMISS_KEY);
  if (!ts) return false;
  return Date.now() - Number(ts) < COOLDOWN_MS;
}

export function useInstallPrompt() {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [state, setState] = useState<InstallState>('idle');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setState('installed');
      return;
    }

    if (isDismissedRecently()) {
      setDismissed(true);
    }

    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isIPadOS =
      typeof navigator.platform === 'string' &&
      navigator.platform === 'MacIntel' &&
      navigator.maxTouchPoints > 1;

    if (isIOS || isIPadOS) {
      setState('ios');
      return;
    }

    if (window.__pwaInstallEvent) {
      deferredPrompt.current = window.__pwaInstallEvent;
      window.__pwaInstallEvent = null;
      setState('available');
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      window.__pwaInstallEvent = null;
      setState('available');
    };

    const onAppInstalled = () => {
      deferredPrompt.current = null;
      setState('installed');
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    const prompt = deferredPrompt.current || window.__pwaInstallEvent;
    if (!prompt) return 'unavailable';

    deferredPrompt.current = prompt;
    window.__pwaInstallEvent = null;

    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    deferredPrompt.current = null;

    if (outcome === 'accepted') {
      setState('installed');
    } else {
      setState('idle');
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
      setDismissed(true);
    }
    return outcome;
  }, []);

  /** Mark install card as dismissed (user clicked "暂不需要") without invoking prompt */
  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  }, []);

  /**
   * Whether the proactive install card should be shown:
   * - prompt is available (or iOS)
   * - user hasn't dismissed within 7 days
   * - not already installed
   */
  const shouldPrompt = (state === 'available' || state === 'ios') && !dismissed;

  return { state, install, dismiss, dismissed, shouldPrompt };
}
