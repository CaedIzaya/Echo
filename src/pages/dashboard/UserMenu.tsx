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
  const [isSigningOut, setIsSigningOut] = useState(false);
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
    if (isSigningOut) return;
    setIsSigningOut(true);
    setIsOpen(false);

    try {
      sessionStorage.clear();

      // 标记正在登出，防止 dashboard 的 unauthenticated useEffect 抢先 router.push('/')
      // 造成与 window.location.href 的竞争（闪回根因）
      localStorage.setItem('echo_signing_out', '1');

      const cookiesToDelete = [
        'next-auth.session-token',
        'next-auth.csrf-token',
        '__Secure-next-auth.session-token',
        '__Secure-next-auth.csrf-token',
      ];

      cookiesToDelete.forEach(cookieName => {
        document.cookie = `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
        document.cookie = `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`;
      });

      await signOut({
        callbackUrl: '/?signedOut=true',
        redirect: false
      });

      localStorage.removeItem('echo_signing_out');
      window.location.href = '/?signedOut=true';
    } catch (error) {
      console.error('退出登录失败:', error);
      localStorage.removeItem('echo_signing_out');
      window.location.href = '/?signedOut=true';
    }
  };

  const handleProfileClick = () => {
    setIsOpen(false);
    router.push('/profile');
  };

  return (
    <div className="relative" ref={menuRef}>
      {isSigningOut ? (
        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-200 border border-white/20">
          <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
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
      )}

      {isOpen && !isSigningOut && (
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










