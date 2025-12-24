'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import Head from 'next/head';
import BottomNavigation from '../dashboard/BottomNavigation';
import { LevelManager, UserLevel } from '~/lib/LevelSystem';
import localforage from 'localforage';

// Types
interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  bio: string | null;
  level: number;
  title: string;
}

type ViewState = 'MENU' | 'EDIT_PROFILE' | 'SECURITY' | 'SESSIONS' | 'LEGAL' | 'CONTACT';

export default function Profile() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [currentView, setCurrentView] = useState<ViewState>('MENU');
  
  // Data State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Data
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated' && session?.user) {
      loadProfile();
      loadUserLevel();
      loadLocalAvatar();
    }
  }, [status, session]);

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('加载个人资料失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserLevel = () => {
    if (typeof window === 'undefined') return;
    const userExp = parseFloat(localStorage.getItem('userExp') || '0');
    const levelInfo = LevelManager.calculateLevel(userExp);
    setUserLevel(levelInfo);
  };

  const loadLocalAvatar = async () => {
    try {
      const avatar = await localforage.getItem<string>('echo-avatar-v1');
      if (avatar) setLocalAvatar(avatar);
    } catch (err) {
      console.error('Failed to load local avatar', err);
    }
  };

  // Avatar Handler
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('请上传图片文件');
        return;
    }

    try {
        const reader = new FileReader();
        reader.onload = async (event) => {
            const result = event.target?.result as string;
            if (result) {
                setLocalAvatar(result);
                await localforage.setItem('echo-avatar-v1', result);
            }
        };
        reader.readAsDataURL(file);
    } catch (err) {
        console.error('Failed to save avatar', err);
        alert('图片处理失败');
    }
  };

  // Sign Out Handler (Reused from UserMenu logic)
  const handleSignOut = async () => {
    if (!confirm('确定要退出登录吗？')) return;
    
    try {
        sessionStorage.clear();
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
        await signOut({ callbackUrl: '/?signedOut=true', redirect: false });
        window.location.href = '/?signedOut=true';
    } catch (error) {
        console.error('退出失败', error);
        window.location.href = '/?signedOut=true';
    }
  };

  if (isLoading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!session?.user) return null;

  const userInitial = session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || 'U';
  const displayName = session.user.name || session.user.email || '用户';
  const displayEmail = session.user.email || '未绑定邮箱';

  // Sub-components for Layout
  const PageLayout = ({ children, title, onBack }: { children: React.ReactNode, title: string, onBack?: () => void }) => (
    <div className="min-h-screen bg-[#F5F7F9] pb-24">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
             {onBack ? (
                <button onClick={onBack} className="p-1 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
                  <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
             ) : (
                <div className="w-4" /> // Spacer
             )}
             <h1 className="text-lg font-bold text-gray-900">{title}</h1>
          </div>
          <div className="w-8"></div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {children}
      </div>

      <BottomNavigation active="home" />
    </div>
  );

  const MenuGroup = ({ title, children }: { title?: string, children: React.ReactNode }) => (
    <div className="space-y-2">
      {title && <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-4">{title}</h3>}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 divide-y divide-gray-50">
        {children}
      </div>
    </div>
  );

  const MenuItem = ({ icon, label, onClick, value, isDestructive }: { icon: React.ReactNode, label: string, onClick: () => void, value?: string, isDestructive?: boolean }) => (
    <button onClick={onClick} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDestructive ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-600'}`}>
          {icon}
        </div>
        <span className={`text-sm font-medium ${isDestructive ? 'text-red-600' : 'text-gray-700'}`}>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-xs text-gray-400">{value}</span>}
        <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );

  // Views
  if (currentView === 'MENU') {
    return (
      <PageLayout title="个人中心" onBack={() => router.back()}>
        {/* User Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-5 relative overflow-hidden">
             <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    className="hidden" 
                />
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-md bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold">
                  {localAvatar ? (
                    <img src={localAvatar} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    userInitial
                  )}
                </div>
                <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                   </svg>
                </div>
             </div>
             
             <div className="flex-1 z-10">
                <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
                <p className="text-sm text-gray-500 mb-2">{displayEmail}</p>
                {userLevel && (
                    <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
                        LV.{userLevel.currentLevel} {userLevel.title}
                    </div>
                )}
                {profile?.bio && (
                    <p className="text-sm text-gray-600 mt-2 italic">"{profile.bio}"</p>
                )}
             </div>
             
             {/* Decor */}
             <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-bl-full -mr-8 -mt-8 z-0 opacity-50 pointer-events-none" />
        </div>

        {/* Menu Groups */}
        <MenuGroup title="账号">
           <MenuItem 
             icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
             label="编辑资料"
             onClick={() => setCurrentView('EDIT_PROFILE')}
           />
           <MenuItem 
             icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
             label="账号安全"
             value="密码、密保"
             onClick={() => setCurrentView('SECURITY')}
           />
           <MenuItem 
             icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
             label="会话管理"
             onClick={() => setCurrentView('SESSIONS')}
           />
        </MenuGroup>

        <MenuGroup title="关于">
           <MenuItem 
             icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
             label="法律条款"
             onClick={() => setCurrentView('LEGAL')}
           />
           <MenuItem 
             icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
             label="联系我们"
             onClick={() => setCurrentView('CONTACT')}
           />
        </MenuGroup>

        <div className="pt-4">
           <button 
             onClick={handleSignOut}
             className="w-full bg-white text-red-500 font-medium py-4 rounded-2xl shadow-sm border border-gray-100 hover:bg-red-50 transition-colors"
           >
             退出登录
           </button>
           <p className="text-center text-xs text-gray-400 mt-4">Echo v0.9.5 • Built with ❤️</p>
        </div>
      </PageLayout>
    );
  }

  if (currentView === 'EDIT_PROFILE') {
    return <EditProfileView 
      profile={profile}
      localAvatar={localAvatar}
      userInitial={userInitial}
      displayName={displayName}
      onBack={() => setCurrentView('MENU')}
      onAvatarClick={handleAvatarClick}
      onProfileUpdate={(updatedProfile) => {
        setProfile(updatedProfile);
        setCurrentView('MENU');
      }}
    />;
  }

  if (currentView === 'SECURITY') {
    return (
      <PageLayout title="账号安全" onBack={() => setCurrentView('MENU')}>
         <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
               <h3 className="font-semibold text-gray-900 mb-4">修改密码</h3>
               <ChangePasswordForm />
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
               <h3 className="font-semibold text-gray-900 mb-2">密保问题</h3>
               <p className="text-sm text-gray-500 mb-4">设置密保问题可用于找回密码。</p>
               <button
                  onClick={() => router.push('/profile/security-questions')}
                  className="w-full py-3 bg-gray-50 text-gray-700 font-medium rounded-xl hover:bg-gray-100 transition-colors border border-gray-200"
               >
                  {localStorage.getItem('hasSecurityQuestions') === 'true' ? '修改密保问题' : '设置密保问题'}
               </button>
            </div>
         </div>
      </PageLayout>
    );
  }

  if (currentView === 'SESSIONS') {
    return (
      <PageLayout title="会话管理" onBack={() => setCurrentView('MENU')}>
         <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-4">管理当前登录的设备。</p>
            <SessionManagement />
         </div>
      </PageLayout>
    );
  }

  if (currentView === 'LEGAL') {
     return (
       <PageLayout title="法律条款" onBack={() => setCurrentView('MENU')}>
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 divide-y divide-gray-50">
             <button onClick={() => router.push('/legal/privacy')} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 text-left">
                <span className="text-sm font-medium text-gray-700">隐私政策</span>
                <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
             </button>
             <button onClick={() => router.push('/legal/terms')} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 text-left">
                <span className="text-sm font-medium text-gray-700">用户协议</span>
                <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
             </button>
          </div>
       </PageLayout>
     );
  }

  if (currentView === 'CONTACT') {
     return (
       <PageLayout title="联系我们" onBack={() => setCurrentView('MENU')}>
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
             <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
               <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
               </svg>
             </div>
             <h3 className="text-lg font-bold text-gray-900 mb-2">需要帮助？</h3>
             <p className="text-gray-500 mb-6">如果你有任何建议或遇到问题，请随时邮件联系我们。</p>
             <a href="mailto:Caedmon_Izaya@outlook.com" className="inline-block px-6 py-3 bg-teal-500 text-white rounded-xl font-medium shadow-lg shadow-teal-500/30 hover:bg-teal-600 transition-colors">
               发送邮件
             </a>
          </div>
       </PageLayout>
     );
  }

  return null;
}

// ----------------------------------------------------------------------
// Sub-Components (ChangePasswordForm, SessionManagement) - Kept same logic, updated style slightly
// ----------------------------------------------------------------------

function ChangePasswordForm() {
  const [formData, setFormData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validatePassword = (password: string) => password.length < 8 ? '密码至少需要8位字符' : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newPwdError = validatePassword(formData.newPassword);
    const confirmPwdError = formData.newPassword !== formData.confirmPassword ? '两次输入的密码不一致' : '';
    setErrors({
      oldPassword: formData.oldPassword ? '' : '请输入旧密码',
      newPassword: newPwdError,
      confirmPassword: confirmPwdError,
    });

    if (formData.oldPassword && !newPwdError && !confirmPwdError) {
      setIsLoading(true);
      try {
        const response = await fetch('/api/user/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldPassword: formData.oldPassword, newPassword: formData.newPassword }),
        });
        const result = await response.json();
        if (response.ok) {
          setSuccess(true);
          setFormData({ oldPassword: '', newPassword: '', confirmPassword: '' });
          setTimeout(() => setSuccess(false), 3000);
        } else {
          setErrors(prev => ({ ...prev, oldPassword: result.error || '修改失败' }));
        }
      } catch (error) {
        setErrors(prev => ({ ...prev, oldPassword: '网络错误' }));
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl">密码修改成功</div>}
      <div>
        <input
          type="password"
          value={formData.oldPassword}
          onChange={(e) => setFormData({ ...formData, oldPassword: e.target.value })}
          className={`w-full px-4 py-3 rounded-xl border bg-gray-50 focus:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-teal-100 ${errors.oldPassword ? 'border-red-300' : 'border-gray-200'}`}
          placeholder="当前密码"
        />
        {errors.oldPassword && <p className="text-xs text-red-500 mt-1">{errors.oldPassword}</p>}
      </div>
      <div>
        <input
          type="password"
          value={formData.newPassword}
          onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
          className={`w-full px-4 py-3 rounded-xl border bg-gray-50 focus:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-teal-100 ${errors.newPassword ? 'border-red-300' : 'border-gray-200'}`}
          placeholder="新密码 (至少8位)"
        />
        {errors.newPassword && <p className="text-xs text-red-500 mt-1">{errors.newPassword}</p>}
      </div>
      <div>
        <input
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          className={`w-full px-4 py-3 rounded-xl border bg-gray-50 focus:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-teal-100 ${errors.confirmPassword ? 'border-red-300' : 'border-gray-200'}`}
          placeholder="确认新密码"
        />
        {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
      </div>
      <button type="submit" disabled={isLoading} className="w-full py-3 bg-teal-500 text-white rounded-xl font-semibold hover:bg-teal-600 transition-colors shadow-lg shadow-teal-500/20 disabled:opacity-50">
        {isLoading ? '提交中...' : '确认修改'}
      </button>
    </form>
  );
}

function SessionManagement() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/user/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  const handleRevoke = async (sessionId: string) => {
    try {
      await fetch('/api/user/sessions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) });
      loadSessions();
    } catch (error) { console.error(error); }
  };

  if (isLoading) return <div className="text-center py-4 text-gray-400 text-sm">加载中...</div>;

  return (
    <div className="space-y-3">
      {sessions.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">暂无其他会话</p>
      ) : (
        sessions.map((session) => (
          <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                {session.device || '未知设备'}
                {session.isCurrent && <span className="text-xs bg-teal-100 text-teal-600 px-1.5 py-0.5 rounded">当前</span>}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {session.lastActive ? new Date(session.lastActive).toLocaleString('zh-CN') : '未知时间'}
              </p>
            </div>
            {!session.isCurrent && (
              <button onClick={() => handleRevoke(session.id)} className="text-xs text-red-500 hover:text-red-600 px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                下线
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function EditProfileView({ profile, localAvatar, userInitial, displayName, onBack, onAvatarClick, onProfileUpdate }: {
  profile: UserProfile | null;
  localAvatar: string | null;
  userInitial: string;
  displayName: string;
  onBack: () => void;
  onAvatarClick: () => void;
  onProfileUpdate: (profile: UserProfile) => void;
}) {
  const [formData, setFormData] = useState({
    name: profile?.name || displayName,
    bio: profile?.bio || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          bio: formData.bio,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          onProfileUpdate(result);
        }, 500);
      } else {
        setError(result.error || '保存失败');
      }
    } catch (error) {
      setError('网络错误，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const PageLayout = ({ children, title, onBack }: { children: React.ReactNode, title: string, onBack?: () => void }) => (
    <div className="min-h-screen bg-[#F5F7F9] pb-24">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
             {onBack ? (
                <button onClick={onBack} className="p-1 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
                  <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
             ) : (
                <div className="w-4" /> // Spacer
             )}
             <h1 className="text-lg font-bold text-gray-900">{title}</h1>
          </div>
          <div className="w-8"></div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {children}
      </div>

      <BottomNavigation active="home" />
    </div>
  );

  return (
    <PageLayout title="编辑资料" onBack={onBack}>
      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
          {/* Avatar - Centered Large */}
          <div className="flex flex-col items-center">
            <div className="relative group cursor-pointer" onClick={onAvatarClick}>
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-teal-50 shadow-inner bg-gray-100">
                {localAvatar ? (
                  <img src={localAvatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-teal-100 text-teal-600 text-3xl font-bold">
                    {userInitial}
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 right-0 bg-teal-500 text-white rounded-full p-2 shadow-sm border-2 border-white">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-400 mt-3">点击头像更换</p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl text-center">
              保存成功！
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl text-center">
              {error}
            </div>
          )}

          {/* Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">昵称</label>
              <input 
                type="text" 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-300 transition-colors"
                placeholder="请输入昵称"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">个性签名</label>
              <textarea 
                value={formData.bio} 
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-300 transition-colors resize-none"
                placeholder="写下你的个性签名..."
                maxLength={100}
              />
              <p className="text-xs text-gray-400 mt-1">{formData.bio.length}/100</p>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-3 bg-teal-500 text-white rounded-xl font-semibold hover:bg-teal-600 transition-colors shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '保存中...' : '保存修改'}
          </button>
        </div>
      </form>
    </PageLayout>
  );
}
