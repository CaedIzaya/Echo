'use client';

import { useState, useRef, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/router';

interface UserMenuProps {
  userInitial: string;
}

export default function UserMenu({ userInitial }: UserMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
      // 清除所有本地存储
      sessionStorage.clear();
      localStorage.clear();
      
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
        className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-medium text-sm hover:bg-teal-600 transition shadow-sm hover:shadow-md"
      >
        {userInitial}
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










