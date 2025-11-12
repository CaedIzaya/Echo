'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import BottomNavigation from '../dashboard/BottomNavigation';
import { LevelManager, UserLevel } from '~/lib/LevelSystem';

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

export default function Profile() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'security'>('overview');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated' && session?.user) {
      loadProfile();
      loadUserLevel();
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
    
    // 从localStorage读取用户经验值
    const userExp = parseFloat(localStorage.getItem('userExp') || '0');
    const levelInfo = LevelManager.calculateLevel(userExp);
    setUserLevel(levelInfo);
  };

  // 监听localStorage变化，实时更新等级
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userExp') {
        loadUserLevel();
      }
    };

    // 监听storage事件（跨标签页）
    window.addEventListener('storage', handleStorageChange);

    // 定期检查（同标签页内的变化）
    const interval = setInterval(() => {
      loadUserLevel();
    }, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  if (isLoading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50/40 via-cyan-50/30 to-blue-50/40 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const userInitial = session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || 'U';
  const displayName = session.user.name || session.user.email || '用户';
  const displayEmail = session.user.email || '未绑定邮箱';

  return (
    <>
      <Head>
        <title>个人中心 - Echo</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-teal-50/40 via-cyan-50/30 to-blue-50/40 pb-20">
        {/* 顶部头部区域 */}
        <div className="bg-white/60 backdrop-blur-2xl border-b border-white/60 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.back()}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100/50 transition-colors"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900">个人中心</h1>
              <div className="w-10"></div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* 顶部用户信息卡片 */}
          <div className="bg-white/70 backdrop-blur-2xl rounded-3xl p-8 shadow-lg border border-white/60 mb-6">
            <div className="flex items-start gap-6">
              {/* 头像 */}
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  {userInitial}
                </div>
                <button className="absolute -bottom-1 -right-1 w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white shadow-md hover:bg-teal-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>

              {/* 用户信息 */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-gray-900">{displayName}</h2>
                  {userLevel && (
                    <span className="px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold rounded-full">
                      LV.{userLevel.currentLevel}
                    </span>
                  )}
                </div>
                {userLevel && (
                  <p className="text-gray-600 mb-3 font-medium">{userLevel.title}</p>
                )}
                <p className="text-sm text-gray-500">{displayEmail}</p>
              </div>
            </div>

            {/* 个人签名 */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-gray-600 italic text-sm">
                {profile?.bio || '这是你的界面。它只为你安静地生长。'}
              </p>
            </div>
          </div>

          {/* 标签切换 */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-3 px-4 rounded-2xl font-semibold transition-all ${
                activeTab === 'overview'
                  ? 'bg-white/70 backdrop-blur-sm text-gray-900 shadow-md'
                  : 'bg-white/40 backdrop-blur-sm text-gray-600 hover:bg-white/50'
              }`}
            >
              概览
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex-1 py-3 px-4 rounded-2xl font-semibold transition-all ${
                activeTab === 'security'
                  ? 'bg-white/70 backdrop-blur-sm text-gray-900 shadow-md'
                  : 'bg-white/40 backdrop-blur-sm text-gray-600 hover:bg-white/50'
              }`}
            >
              账号安全
            </button>
          </div>

          {/* 概览内容 */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 个人资料卡片 */}
              <div className="bg-white/70 backdrop-blur-2xl rounded-3xl p-6 shadow-lg border border-white/60">
                <h3 className="text-lg font-bold text-gray-900 mb-4">个人资料</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <span className="text-sm text-gray-600">昵称</span>
                    <span className="text-sm font-medium text-gray-900">{displayName}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <span className="text-sm text-gray-600">注册日期</span>
                    <span className="text-sm font-medium text-gray-900">
                      {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('zh-CN') : '未知'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm text-gray-600">绑定邮箱</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{displayEmail}</span>
                      {profile?.emailVerified ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">已验证</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">未验证</span>
                      )}
                    </div>
                  </div>
                </div>
                <button className="mt-4 w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-teal-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg">
                  编辑资料
                </button>
              </div>

              {/* 最近一次小结预览 */}
              <div className="bg-white/70 backdrop-blur-2xl rounded-3xl p-6 shadow-lg border border-white/60">
                <h3 className="text-lg font-bold text-gray-900 mb-4">最近一次小结</h3>
                <p className="text-gray-500 text-sm mb-4">暂无小结记录</p>
                <button className="w-full py-3 border-2 border-teal-500 text-teal-600 rounded-xl font-semibold hover:bg-teal-50 transition-all">
                  去写小结
                </button>
              </div>
            </div>
          )}

          {/* 账号安全内容 */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* 账号安全卡片 */}
              <div className="bg-white/70 backdrop-blur-2xl rounded-3xl p-6 shadow-lg border border-white/60">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">账号安全</h3>
                  <p className="text-sm text-gray-500">这片净土需要钥匙。设置好它，安心入梦。</p>
                </div>

                {/* 修改密码 */}
                <div className="mt-6">
                  <h4 className="text-base font-semibold text-gray-900 mb-3">修改密码</h4>
                  <ChangePasswordForm />
                </div>

                {/* 密保问题设置 */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-base font-semibold text-gray-900 mb-3">密保问题</h4>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-600 mb-3">
                      设置密保问题可以帮助你在忘记密码时找回账户。
                    </p>
                    <button
                      onClick={() => router.push('/profile/security-questions')}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-semibold text-sm hover:from-teal-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg"
                    >
                      {localStorage.getItem('hasSecurityQuestions') === 'true' ? '修改密保问题' : '设置密保问题'}
                    </button>
                  </div>
                </div>

                {/* 会话管理 */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-base font-semibold text-gray-900 mb-3">会话管理</h4>
                  <SessionManagement />
                </div>
              </div>

              {/* 法律条款 */}
              <div className="bg-white/70 backdrop-blur-2xl rounded-3xl p-6 shadow-lg border border-white/60">
                <h3 className="text-lg font-bold text-gray-900 mb-4">法律条款</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/legal/privacy')}
                    className="w-full text-left p-3 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">隐私政策</p>
                      <p className="text-xs text-gray-500 mt-0.5">了解我们如何保护您的隐私</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-teal-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => router.push('/legal/terms')}
                    className="w-full text-left p-3 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">用户协议</p>
                      <p className="text-xs text-gray-500 mt-0.5">查看使用条款和服务说明</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-teal-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 联系我们 */}
              <div className="bg-white/70 backdrop-blur-2xl rounded-3xl p-6 shadow-lg border border-white/60">
                <h3 className="text-lg font-bold text-gray-900 mb-2">联系我们</h3>
                <p className="text-gray-600 text-sm mb-4">如有问题或建议，欢迎随时联系我们。</p>
                <button className="text-teal-600 text-sm font-medium hover:text-teal-700">
                  发送邮件 →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <BottomNavigation active="home" />

      {/* CSS动画 */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

// 修改密码表单组件
function ChangePasswordForm() {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validatePassword = (password: string): string => {
    if (password.length < 8) {
      return '密码至少需要8位字符';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证
    const newPwdError = validatePassword(formData.newPassword);
    const confirmPwdError = formData.newPassword !== formData.confirmPassword 
      ? '两次输入的密码不一致' 
      : '';
    
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
          body: JSON.stringify({
            oldPassword: formData.oldPassword,
            newPassword: formData.newPassword,
          }),
        });

        const result = await response.json();
        
        if (response.ok) {
          setSuccess(true);
          setFormData({ oldPassword: '', newPassword: '', confirmPassword: '' });
          setTimeout(() => setSuccess(false), 3000);
        } else {
          setErrors({ ...errors, oldPassword: result.error || '修改失败，请检查旧密码是否正确' });
        }
      } catch (error) {
        setErrors({ ...errors, oldPassword: '网络错误，请重试' });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          钥匙已经重铸，你又可继续前行。
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">旧密码</label>
        <input
          type="password"
          value={formData.oldPassword}
          onChange={(e) => {
            setFormData({ ...formData, oldPassword: e.target.value });
            setErrors({ ...errors, oldPassword: '' });
          }}
          className={`w-full px-4 py-3 rounded-xl border bg-white/50 backdrop-blur-sm transition-all ${
            errors.oldPassword ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-teal-400'
          } focus:outline-none focus:ring-2 focus:ring-teal-500/20`}
          placeholder="请输入当前密码"
        />
        {errors.oldPassword && (
          <p className="mt-1.5 text-sm text-red-500">{errors.oldPassword}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">新密码</label>
        <input
          type="password"
          value={formData.newPassword}
          onChange={(e) => {
            setFormData({ ...formData, newPassword: e.target.value });
            const error = validatePassword(e.target.value);
            setErrors({ ...errors, newPassword: error });
            if (formData.confirmPassword) {
              setErrors({
                ...errors,
                newPassword: error,
                confirmPassword: e.target.value !== formData.confirmPassword ? '两次输入的密码不一致' : '',
              });
            }
          }}
          className={`w-full px-4 py-3 rounded-xl border bg-white/50 backdrop-blur-sm transition-all ${
            errors.newPassword ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-teal-400'
          } focus:outline-none focus:ring-2 focus:ring-teal-500/20`}
          placeholder="至少8位字符"
        />
        {errors.newPassword && (
          <p className="mt-1.5 text-sm text-red-500">{errors.newPassword}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">确认新密码</label>
        <input
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => {
            setFormData({ ...formData, confirmPassword: e.target.value });
            const error = formData.newPassword !== e.target.value ? '两次输入的密码不一致' : '';
            setErrors({ ...errors, confirmPassword: error });
          }}
          className={`w-full px-4 py-3 rounded-xl border bg-white/50 backdrop-blur-sm transition-all ${
            errors.confirmPassword ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-teal-400'
          } focus:outline-none focus:ring-2 focus:ring-teal-500/20`}
          placeholder="请再次输入新密码"
        />
        {errors.confirmPassword && (
          <p className="mt-1.5 text-sm text-red-500">{errors.confirmPassword}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-teal-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? '处理中...' : '修改密码'}
      </button>
    </form>
  );
}

// 会话管理组件
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
    } catch (error) {
      console.error('加载会话失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async (sessionId: string) => {
    try {
      const response = await fetch('/api/user/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (response.ok) {
        loadSessions();
      }
    } catch (error) {
      console.error('撤销会话失败:', error);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-gray-500">加载中...</p>;
  }

  return (
    <div className="space-y-3">
      {sessions.length === 0 ? (
        <p className="text-sm text-gray-500">暂无会话记录</p>
      ) : (
        sessions.map((session) => (
          <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-900">{session.device || '未知设备'}</p>
              <p className="text-xs text-gray-500">
                {session.lastActive ? new Date(session.lastActive).toLocaleString('zh-CN') : '未知时间'}
              </p>
            </div>
            {!session.isCurrent && (
              <button
                onClick={() => handleRevoke(session.id)}
                className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                登出
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}

