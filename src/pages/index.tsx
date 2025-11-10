'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState('检查中...');
  const [loading, setLoading] = useState(true);

  const shouldForceOnboarding = () => {
    if (typeof window === 'undefined') {
      return false;
    }
    return sessionStorage.getItem('forceOnboarding') === 'true';
  };

  const markOnboardingCompleteSilently = async () => {
    try {
      await fetch('/api/user/complete-onboarding', {
        method: 'POST',
      });
    } catch (error) {
      console.error('首页自动更新 onboarding 状态失败:', error);
    }
  };

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    try {
      console.log("首页：开始检查认证状态...");
      const response = await fetch('/api/auth/session');
      const session = await response.json();
      
      console.log("首页：获取到的 session:", session);
      
      if (session?.user) {
        setAuthStatus(`已登录: ${session.user.email}`);
        console.log("首页：用户已登录，检查 onboarding 状态:", session.user.hasCompletedOnboarding);
        
        // 短暂延迟让用户看到状态
        setTimeout(() => {
          const forceOnboarding = shouldForceOnboarding();
          console.log('首页：是否需要强制引导流程:', forceOnboarding);

          if (forceOnboarding) {
            router.push('/onboarding');
            return;
          }

          if (session.user.hasCompletedOnboarding) {
            router.push('/dashboard');
            return;
          }

          markOnboardingCompleteSilently()
            .catch(() => {
              // 已记录日志，忽略错误
            })
            .finally(() => {
              router.push('/dashboard');
            });
        }, 1000);
      } else {
        setAuthStatus('未登录');
        console.log("首页：用户未登录，跳转到登录页");
        
        setTimeout(() => {
          router.push('/auth/signin');
        }, 1000);
      }
    } catch (error) {
      console.error("首页：检查认证状态失败:", error);
      setAuthStatus('检查失败');
      
      // 出错时默认跳转到登录页
      setTimeout(() => {
        router.push('/auth/signin');
      }, 1500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">数字静默</h1>
        <p className="text-gray-600 mb-4">正在检查登录状态...</p>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-700">状态: {authStatus}</p>
          {loading && <p className="text-xs text-gray-500 mt-1">加载中...</p>}
        </div>
        
        {/* 手动控制按钮 */}
        <div className="mt-6 space-y-2">
          <button
            onClick={() => router.push('/auth/signin')}
            className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            手动跳转到登录页
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="block w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            手动跳转到仪表盘
          </button>
          <button
            onClick={() => router.push('/onboarding')}
            className="block w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            手动跳转到引导页
          </button>
        </div>
      </div>
    </div>
  );
}