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

const MAIL_TTL_DAYS = 84; // 12 周

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getMonday(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  return d;
}

function formatYmd(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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

重要提醒（建议尽快完成）：
请前往「个人中心 → 账号安全 → 设置密保问题」完成密保设置。
这会帮助你在忘记密码时，随时回到 Echo。

如果暂时还不确定怎么用 Echo，可以在仪表盘点击右上角的 🔍，打开「使用指南」查看详细说明。

愿你在这里找回内心的平静与力量。

Echo 团队
敬上`,
    date: '2025-10-24',
    isRead: false,
    type: 'system',
    actionUrl: '/profile/security-questions',
    actionLabel: '去设置密保'
  },
  {
    id: 'mail_weekly_report_demo',
    sender: 'Echo 周报',
    title: '本周专注周报 · 12/08 - 12/14',
    content: `您的本周专注周报已生成~ 点击下方按钮查看。`,
    date: '2025-12-15',
    isRead: false,
    type: 'report',
    hasAttachment: false,
    actionUrl: `/reports/weekly?weekStart=${formatYmd(addDays(getMonday(new Date()), -7))}`,
    actionLabel: '查看周报',
    expiresAt: addDays(new Date('2025-12-15T00:00:00.000Z'), MAIL_TTL_DAYS).toISOString(),
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

    // 从 localStorage 加载已读状态和自定义邮件
    const readStatus = JSON.parse(localStorage.getItem('mailReadStatus') || '{}');
    const customMails = JSON.parse(localStorage.getItem('customMails') || '[]');
    
    const now = Date.now();
    const isExpired = (mail: Mail) => {
      if (mail.expiresAt) {
        return new Date(mail.expiresAt).getTime() <= now;
      }
      // 默认 TTL：按 date 计算（兼容旧邮件）
      const mailDate = new Date(mail.date);
      const expires = addDays(mailDate, MAIL_TTL_DAYS).getTime();
      return expires <= now;
    };

    // 合并 Mock 数据、自定义邮件和已读状态 + 过滤过期邮件
    const mockWithStatus = MOCK_MAILS.map(mail => ({
      ...mail,
      isRead: !!readStatus[mail.id]
    }));
    
    const customWithStatus = customMails.map((mail: Mail) => ({
      ...mail,
      isRead: !!readStatus[mail.id]
    }));
    
    // 合并并过滤过期邮件
    const allMails = [...mockWithStatus, ...customWithStatus];
    this.mails = allMails.filter(mail => !isExpired(mail));
    
    // 按日期倒序排序
    this.mails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // 清理过期的自定义邮件
    const validCustomMails = customWithStatus.filter(mail => !isExpired(mail));
    if (validCustomMails.length !== customMails.length) {
      localStorage.setItem('customMails', JSON.stringify(validCustomMails));
      console.log('[MailSystem] 清理过期邮件:', customMails.length - validCustomMails.length);
    }
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

  // 🆕 添加新邮件到信箱
  public addMail(mail: Mail) {
    if (typeof window === 'undefined') return;

    // 检查是否已存在（避免重复）
    if (this.mails.some(m => m.id === mail.id)) {
      console.log('[MailSystem] 邮件已存在，跳过添加:', mail.id);
      return;
    }

    // 添加到列表
    this.mails.unshift(mail); // 添加到开头（最新的）
    
    // 持久化到 localStorage
    const customMails = JSON.parse(localStorage.getItem('customMails') || '[]');
    customMails.unshift(mail);
    localStorage.setItem('customMails', JSON.stringify(customMails));

    console.log('[MailSystem] ✅ 新邮件已添加:', mail.title);
    
    // 通知监听者
    this.notifyListeners();
  }

  // 🆕 创建周报邮件
  public static createWeeklyReportMail(weekStart: string, weekEnd: string, weekLabel: string): Mail {
    const mailId = `weekly_report_${weekStart}`;
    const monday = new Date(weekStart);
    const mailDate = formatYmd(monday);
    
    return {
      id: mailId,
      sender: 'Echo 周报',
      title: `本周专注周报 · ${weekLabel}`,
      content: `您的本周专注周报已生成~ 点击下方按钮查看详情。\n\n回顾这一周的专注时光，看看自己的成长与变化。`,
      date: mailDate,
      isRead: false,
      type: 'report',
      hasAttachment: false,
      actionUrl: `/reports/weekly?weekStart=${weekStart}`,
      actionLabel: '查看周报',
      expiresAt: addDays(monday, MAIL_TTL_DAYS).toISOString(),
    };
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




