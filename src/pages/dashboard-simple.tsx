'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { signOut } from 'next-auth/react';

export default function DashboardSimple() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    // 防止重复跳转
    if (hasRedirected) {
      console.log("已经跳转过，跳过检查");
      return;
    }

    try {
      const response = await fetch('/api/auth/session');
      const session = await response.json();
      
      if (session?.user) {
        setUser(session.user);
        console.log("用户已登录:", session.user);
      } else {
        console.log("用户未登录，重定向到登录页");
        setHasRedirected(true);
        router.push('/auth/signin');
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      setHasRedirected(true);
      router.push('/auth/signin');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // 使用NextAuth的signOut函数，这会正确清除session
      await signOut({ 
        redirect: false,
        callbackUrl: '/auth/signin'
      });
      
      // 手动跳转到登录页
      window.location.href = '/auth/signin';
    } catch (error) {
      console.error('退出登录失败:', error);
      // 即使失败也跳转到登录页
      window.location.href = '/auth/signin';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">未检测到用户，正在跳转...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">数字静默仪表盘</h1>
            <p className="text-gray-600 mt-1">
              欢迎回来，{user.name || user.email}！
            </p>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => router.push('/onboarding')}
              className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 text-sm"
            >
              + 新建项目
            </button>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-500 text-white rounded-full hover:bg-gray-600 text-sm"
            >
              退出登录
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">登录成功！</h2>
          <p className="text-gray-600 mb-6">
            您已成功登录数字静默。SessionProvider 问题已通过临时方案解决。
          </p>
          <div className="flex justify-center space-x-4">
            <button 
              onClick={() => router.push('/onboarding')}
              className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 font-medium"
            >
              创建项目
            </button>
            <button 
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-green-600 text-white rounded-full hover:bg-green-700 font-medium"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}