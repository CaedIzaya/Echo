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
}

const MOCK_MAILS: Mail[] = [
  {
    id: 'mail_001',
    sender: 'Echo 团队',
    title: '欢迎来到 Echo Focus',
    content: `亲爱的旅人：

很高兴能在 Echo Focus 遇见你。

这是一个为你打造的专注空间，在这里，你可以：
1. 设定专注目标，进入心流状态
2. 种植你的心树，见证自我成长
3. 完成里程碑，记录每一个进步的瞬间

如果暂时还不确定怎么用 Echo，可以在仪表盘点击右上角的 🔍，打开「使用指南」查看详细说明。

愿你在这里找回内心的平静与力量。

Echo 团队
敬上`,
    date: '2025-10-24',
    isRead: false,
    type: 'system',
    hasAttachment: false
  }
];

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

  private loadMails() {
    if (typeof window === 'undefined') {
      this.mails = [...MOCK_MAILS];
      return;
    }

    // 从 localStorage 加载已读状态
    const readStatus = JSON.parse(localStorage.getItem('mailReadStatus') || '{}');
    
    // 合并 Mock 数据和已读状态
    this.mails = MOCK_MAILS.map(mail => ({
      ...mail,
      isRead: !!readStatus[mail.id]
    }));
    
    // 按日期倒序排序
    this.mails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public getMails(): Mail[] {
    return [...this.mails];
  }

  public getUnreadCount(): number {
    return this.mails.filter(m => !m.isRead).length;
  }

  public markAsRead(id: string) {
    const mail = this.mails.find(m => m.id === id);
    if (mail && !mail.isRead) {
      mail.isRead = true;
      
      if (typeof window !== 'undefined') {
        const readStatus = JSON.parse(localStorage.getItem('mailReadStatus') || '{}');
        readStatus[id] = true;
        localStorage.setItem('mailReadStatus', JSON.stringify(readStatus));
      }

      this.notifyListeners();
    }
  }

  public markAllAsRead() {
    let changed = false;
    const readStatus = typeof window !== 'undefined' 
      ? JSON.parse(localStorage.getItem('mailReadStatus') || '{}') 
      : {};

    this.mails.forEach(mail => {
      if (!mail.isRead) {
        mail.isRead = true;
        readStatus[mail.id] = true;
        changed = true;
      }
    });

    if (changed && typeof window !== 'undefined') {
      localStorage.setItem('mailReadStatus', JSON.stringify(readStatus));
      this.notifyListeners();
    }
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
    markAllAsRead: () => MailSystem.getInstance().markAllAsRead()
  };
}




