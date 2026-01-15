import { useState, useEffect } from 'react';

export interface Mail {
  id: string;
  sender: string;
  title: string;
  content: string;
  date: string;
  isRead: boolean;
  type: 'system' | 'report' | 'notification';
  hasAttachment?: boolean;
  actionUrl?: string;
  actionLabel?: string;
  expiresAt?: string; // ISO
}

const MAIL_TTL_DAYS = 84; // 12 周（仅用于展示层过滤）

export class MailSystem {
  private static instance: MailSystem;
  private mails: Mail[] = [];
  private listeners: (() => void)[] = [];

  private constructor() {
    this.loadMails();
  }

  public static getInstance(): MailSystem {
    if (!MailSystem.instance) {
      MailSystem.instance = new MailSystem();
    }
    return MailSystem.instance;
  }
  
  // 🔥 手动刷新邮件列表
  public async refresh() {
    await this.loadMails();
    this.notifyListeners();
  }

  private async loadMails() {
    if (typeof window === 'undefined') {
      this.mails = [];
      return;
    }
    try {
      const response = await fetch('/api/mails');
      if (!response.ok) {
        console.warn('[MailSystem] 加载邮件失败:', response.status);
        this.mails = [];
        return;
      }

      const data = await response.json();
      const now = Date.now();
      const isExpired = (mail: Mail) => {
        if (mail.expiresAt) {
          return new Date(mail.expiresAt).getTime() <= now;
        }
        const mailDate = new Date(mail.date);
        const expires = mailDate.getTime() + MAIL_TTL_DAYS * 24 * 60 * 60 * 1000;
        return expires <= now;
      };

      const mapped: Mail[] = (data.mails || []).map((mail: any) => ({
        id: mail.id,
        sender: mail.sender ?? 'Echo 系统',
        title: mail.title,
        content: mail.content,
        date: mail.date,
        isRead: mail.isRead,
        type: (mail.type as Mail['type']) ?? 'system',
        actionUrl: mail.actionUrl ?? undefined,
        actionLabel: mail.actionLabel ?? undefined,
        expiresAt: mail.expiresAt ?? undefined,
      }));

      this.mails = mapped.filter((mail) => !isExpired(mail));
      // 邮件已经在 API 层按 createdAt desc 排序，无需再次排序
    } catch (error) {
      console.error('[MailSystem] 加载邮件异常:', error);
      this.mails = [];
    }
  }

  public getMails(): Mail[] {
    return [...this.mails];
  }

  public getUnreadCount(): number {
    return this.mails.filter(m => !m.isRead).length;
  }

  public async markAsRead(id: string) {
    const mail = this.mails.find(m => m.id === id);
    if (mail && !mail.isRead) {
      mail.isRead = true;
      
      // 🔥 保存到数据库
      try {
        await fetch('/api/mails', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mailId: id, isRead: true }),
        });
        console.log('[MailSystem] ✅ 已标记为已读:', id);
      } catch (error) {
        console.error('[MailSystem] ❌ 标记已读失败:', error);
      }

      this.notifyListeners();
    }
  }

  public async markAllAsRead() {
    const hasUnread = this.mails.some((mail) => !mail.isRead);
    if (!hasUnread) return;

    this.mails = this.mails.map((mail) => ({ ...mail, isRead: true }));

    try {
      await fetch('/api/mails', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
    } catch (error) {
      console.error('[MailSystem] 标记全部已读失败:', error);
    }

    this.notifyListeners();
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l());
  }
}

// React Hook for using MailSystem
export function useMailSystem() {
  const [mails, setMails] = useState<Mail[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const system = MailSystem.getInstance();
    
    const updateState = () => {
      setMails(system.getMails());
      setUnreadCount(system.getUnreadCount());
    };

    updateState();
    return system.subscribe(updateState);
  }, []);

  return {
    mails,
    unreadCount,
    markAsRead: (id: string) => MailSystem.getInstance().markAsRead(id),
    markAllAsRead: () => MailSystem.getInstance().markAllAsRead(),
    refresh: () => MailSystem.getInstance().refresh(),
  };
}




