import { useState, useEffect, useCallback, useRef } from 'react';
import { trackEvent } from '~/lib/analytics';

export type NotificationPermission = 'default' | 'granted' | 'denied';

export function useNotification() {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  useEffect(() => {
    if (isSupported) {
      setPermissionStatus(Notification.permission as NotificationPermission);
    }
  }, [isSupported]);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) return 'denied';
    try {
      const result = await Notification.requestPermission();
      const status = result as NotificationPermission;
      setPermissionStatus(status);
      trackEvent({
        name: 'gentle_reminder_permission',
        feature: 'gentle_reminder',
        page: 'settings',
        action: 'request_permission',
        properties: { result: status },
      });
      return status;
    } catch {
      return 'denied';
    }
  }, [isSupported]);

  const activeNotifications = useRef<Set<Notification>>(new Set());

  const sendNotification = useCallback(
    (title: string, body: string, tag?: string): Notification | null => {
      if (!isSupported || Notification.permission !== 'granted') return null;
      try {
        const n = new Notification(title, {
          body,
          icon: '/icons/icon-192x192.png',
          tag: tag ?? 'lumi-gentle-reminder',
          silent: false,
        });
        activeNotifications.current.add(n);
        n.onclick = () => {
          window.focus();
          window.location.href = '/focus';
          trackEvent({
            name: 'gentle_reminder_clicked',
            feature: 'gentle_reminder',
            page: 'notification',
            action: 'click',
            properties: { tag: tag ?? 'unknown' },
          });
          n.close();
        };
        n.onclose = () => {
          activeNotifications.current.delete(n);
        };
        return n;
      } catch {
        return null;
      }
    },
    [isSupported],
  );

  const closeAll = useCallback(() => {
    activeNotifications.current.forEach((n) => n.close());
    activeNotifications.current.clear();
  }, []);

  return {
    isSupported,
    permissionStatus,
    requestPermission,
    sendNotification,
    closeAll,
  };
}
