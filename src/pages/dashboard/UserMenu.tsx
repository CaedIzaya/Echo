'use client';

import { useState, useRef, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import localforage from 'localforage';

interface UserMenuProps {
  userInitial: string;
}

export default function UserMenu({ userInitial }: UserMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load local avatar
    const loadAvatar = async () => {
      try {
        const avatar = await localforage.getItem<string>('echo-avatar-v1');
        if (avatar) {
          setLocalAvatar(avatar);
        }
      } catch (error) {
        console.error('Failed to load local avatar:', error);
      }
    };
    
    loadAvatar();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    try {
      // 只清除 sessionStorage（认证相关）
      sessionStorage.clear();
      
      // 保留 localStorage 中的所有核心数据，只清除认证相关的临时数据
      // 核心数据包括：
      // - totalFocusMinutes: 总专注时长（累计）
      // - todayStats: 今日数据（历史记录）
      // - weeklyStats: 本周数据
      // - dashboardStats: 统计数据（昨日时长、连续天数、完成目标数）
      // - flowMetrics: 心流指标数据
      // - userPlans: 用户计划
      // - userExp: 用户经验值
      // - achievedAchievements: 已解锁成就
      // - unviewedAchievements: 未查看成就
      // - dataRecovered: 数据恢复标记
      // - lastFocusDate: 最后专注日期
      // - lastWelcomeDate: 最后欢迎日期
      // - focusCompleted: 专注完成标记
      // - hasSecurityQuestions: 安全提示相关
      // - securityGuideDismissed: 安全指南相关
      // - loginCount: 登录计数
      // - nextSecurityReminder: 下次安全提醒
      // - forceOnboarding: 强制引导流程标记
      
      // 如果需要清除某些临时UI状态，可以单独清除：
      // localStorage.removeItem('focusCompleted'); // 可选：清除专注完成标记
      
      // 手动清除所有可能的 NextAuth Cookie（包括生产环境的 __Secure- 前缀）
      const cookiesToDelete = [
        'next-auth.session-token',
        'next-auth.csrf-token',
        '__Secure-next-auth.session-token',
        '__Secure-next-auth.csrf-token',
      ];
      
      cookiesToDelete.forEach(cookieName => {
        // 清除当前域名的 Cookie
        document.cookie = `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
        // 如果设置了 Secure，也需要清除
        document.cookie = `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`;
      });
      
      // 调用 NextAuth 的 signOut 清除服务器端 session
      // 使用 redirect: false 避免自动跳转，我们手动控制跳转
      await signOut({ 
        callbackUrl: '/?signedOut=true',
        redirect: false 
      });
      
      // 手动跳转，确保 URL 参数被传递
      window.location.href = '/?signedOut=true';
    } catch (error) {
      console.error('退出登录失败:', error);
      // 即使出错也跳转到首页
      window.location.href = '/?signedOut=true';
    }
  };

  const handleProfileClick = () => {
    setIsOpen(false);
    router.push('/profile');
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden bg-teal-500 text-white font-medium text-sm hover:bg-teal-600 transition shadow-sm hover:shadow-md border border-white/20"
      >
        {localAvatar ? (
          <img src={localAvatar} alt="User Avatar" className="w-full h-full object-cover" />
        ) : (
          userInitial
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in z-50">
          <div className="py-1">
            <button
              onClick={handleProfileClick}
              className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-600 transition-colors flex items-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              个人中心
            </button>
            <div className="border-t border-gray-100 my-1"></div>
            <button
              onClick={handleSignOut}
              className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}










