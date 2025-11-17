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
        console.log("首页：用户未登录，显示欢迎界面");
        // 不再自动跳转，显示欢迎界面
        setLoading(false);
      }
    } catch (error) {
      console.error("首页：检查认证状态失败:", error);
      setAuthStatus('检查失败');
      
      // 出错时显示欢迎界面
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">数字静默</h1>
          <p className="text-gray-600 mb-4">正在检查登录状态...</p>
        </div>
      </div>
    );
  }

  // 如果已登录，显示加载状态（即将跳转）
  if (authStatus.startsWith('已登录')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">数字静默</h1>
          <p className="text-gray-600 mb-4">正在跳转...</p>
        </div>
      </div>
    );
  }

  // 未登录时显示欢迎界面
  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-teal-50/40 via-cyan-50/30 to-blue-50/40 px-4">
      {/* 波浪流线背景 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 多层波浪SVG - 使用重复模式创建流动感 */}
        <svg className="absolute bottom-0 left-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="waveGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#5eead4" stopOpacity="0.18" />
              <stop offset="50%" stopColor="#2dd4bf" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.18" />
            </linearGradient>
            <linearGradient id="waveGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.15" />
              <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="waveGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.12" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.12" />
            </linearGradient>
          </defs>
          
          {/* 第一层波浪 - 流动动画 */}
          <g className="animate-wave-1">
            <path
              d="M-200,450 Q100,400 400,450 T1000,450 T1600,450 L1600,800 L-200,800 Z"
              fill="url(#waveGradient1)"
            />
          </g>
          
          {/* 第二层波浪 - 不同速度 */}
          <g className="animate-wave-2">
            <path
              d="M-200,550 Q100,500 400,550 T1000,550 T1600,550 L1600,800 L-200,800 Z"
              fill="url(#waveGradient2)"
            />
          </g>
          
          {/* 第三层波浪 - 最慢 */}
          <g className="animate-wave-3">
            <path
              d="M-200,650 Q100,600 400,650 T1000,650 T1600,650 L1600,800 L-200,800 Z"
              fill="url(#waveGradient3)"
            />
          </g>
        </svg>
        
        {/* 顶部流动光效 */}
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-teal-100/25 via-cyan-100/18 to-transparent"></div>
      </div>

      {/* 网格背景 - 更淡 */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] opacity-30"></div>

      <div className="relative z-10 text-center max-w-5xl w-full">
        {/* Logo 和品牌区域 - 更精致的设计 */}
        <div className="mb-20 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-24 h-24 mb-10 relative group">
            {/* 多层光晕效果 - 创造深度 */}
            <div className="absolute inset-0 bg-gradient-to-br from-teal-400/40 to-cyan-500/40 rounded-3xl blur-2xl opacity-70 group-hover:opacity-90 transition-opacity duration-500"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-teal-300/30 to-cyan-400/30 rounded-3xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-500"></div>
            {/* Logo容器 - 更精致的渐变和阴影 */}
            <div className="relative bg-gradient-to-br from-teal-500 via-teal-400 to-cyan-500 rounded-3xl p-3 shadow-[0_20px_60px_-15px_rgba(20,184,166,0.4)] transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 overflow-hidden">
              <img src="/Echo Icon.png" alt="Echo" className="w-full h-full object-cover scale-150 drop-shadow-lg" />
            </div>
          </div>
          {/* 标题 - 更大更精致 */}
          <h1 className="text-8xl md:text-9xl font-extrabold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-6 tracking-[-0.02em] leading-none">
            Echo
          </h1>
          {/* 副标题装饰 */}
          <div className="inline-flex items-center gap-3 text-gray-400 text-sm font-medium">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-gray-300"></div>
            <span>数字静默</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-gray-300"></div>
          </div>
        </div>

        {/* 主内容卡片 - 更精致的玻璃态效果 */}
        <div className="relative bg-white/50 backdrop-blur-3xl rounded-[2rem] p-12 md:p-16 shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] border border-white/60 mb-10 animate-fade-in-up overflow-hidden" style={{ animationDelay: '0.1s' }}>
          {/* 卡片内部光效 - 顶部高光 */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent"></div>
          {/* 卡片内部光效 - 底部阴影 */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200/30 to-transparent"></div>
          {/* 装饰性光点 */}
          <div className="absolute top-8 right-8 w-2 h-2 bg-teal-400/30 rounded-full blur-sm"></div>
          <div className="absolute bottom-12 left-12 w-1.5 h-1.5 bg-cyan-400/30 rounded-full blur-sm"></div>
          
          <div className="mb-16 space-y-8 max-w-3xl mx-auto">
            {/* 文案 - 更有层次感 */}
            <div className="space-y-6">
              <p className="text-gray-800 leading-relaxed text-xl md:text-2xl font-light tracking-wide">
                我们不为你的待办清单增加又一个任务。
              </p>
              <p className="text-gray-800 leading-relaxed text-xl md:text-2xl font-light tracking-wide">
                我们为你被算法切碎的时间，提供一个完整的意义。
              </p>
              <p className="text-gray-800 leading-relaxed text-xl md:text-2xl font-light tracking-wide">
                这里没有截止日期的焦虑，只有对热爱的纯粹投资。
              </p>
            </div>
            
            {/* 欢迎语 - 更精致的设计 */}
            <div className="pt-8 border-t border-gray-200/50">
              <p className="text-teal-600 font-semibold text-2xl md:text-3xl tracking-tight">
                欢迎来到，<span className="font-bold">Echo</span>
              </p>
            </div>
          </div>
          
          {/* 功能特点 - 更精致的卡片设计 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <div className="group relative p-8 bg-gradient-to-br from-teal-50/60 via-white/40 to-teal-50/40 rounded-2xl border border-teal-100/60 hover:border-teal-200/80 transition-all duration-500 hover:shadow-xl hover:shadow-teal-500/10 hover:-translate-y-2 overflow-hidden">
              {/* 卡片内部光效 */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative">
                <div className="text-5xl mb-4 transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">🎯</div>
                <h3 className="font-bold text-gray-900 mb-3 text-xl tracking-tight">目标管理</h3>
                <p className="text-sm text-gray-600 leading-relaxed">设定清晰的目标和里程碑，让每一步都有方向</p>
              </div>
            </div>
            <div className="group relative p-8 bg-gradient-to-br from-cyan-50/60 via-white/40 to-cyan-50/40 rounded-2xl border border-cyan-100/60 hover:border-cyan-200/80 transition-all duration-500 hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-2 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative">
                <div className="text-5xl mb-4 transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">⏱️</div>
                <h3 className="font-bold text-gray-900 mb-3 text-xl tracking-tight">专注计时</h3>
                <p className="text-sm text-gray-600 leading-relaxed">记录每一次专注时光，见证时间的价值</p>
              </div>
            </div>
            <div className="group relative p-8 bg-gradient-to-br from-blue-50/60 via-white/40 to-blue-50/40 rounded-2xl border border-blue-100/60 hover:border-blue-200/80 transition-all duration-500 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-2 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative">
                <div className="text-5xl mb-4 transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">📊</div>
                <h3 className="font-bold text-gray-900 mb-3 text-xl tracking-tight">数据追踪</h3>
                <p className="text-sm text-gray-600 leading-relaxed">可视化你的成长轨迹，发现专注的力量</p>
              </div>
            </div>
          </div>

          {/* CTA按钮 - 更精致的设计 */}
          <div className="space-y-5">
            <button
              onClick={() => router.push('/auth/signin')}
              className="group relative w-full px-10 py-6 bg-gradient-to-r from-teal-500 via-teal-500 to-cyan-500 text-white font-bold text-lg rounded-2xl hover:from-teal-600 hover:via-teal-600 hover:to-cyan-600 transition-all duration-500 shadow-[0_10px_40px_-10px_rgba(20,184,166,0.4)] hover:shadow-[0_20px_60px_-15px_rgba(20,184,166,0.5)] transform hover:scale-[1.02] overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                开始使用
                <svg className="w-6 h-6 transform group-hover:translate-x-2 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
              {/* 多层按钮光效 */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </button>
            <p className="text-sm text-gray-500 font-medium">
              免费注册，立即开始你的专注之旅
            </p>
          </div>
        </div>
      </div>

      {/* CSS动画 */}
      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
        
        @keyframes wave-flow {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(200px);
          }
        }
        
        .animate-wave-1 {
          animation: wave-flow 15s linear infinite;
        }
        
        .animate-wave-2 {
          animation: wave-flow 20s linear infinite;
          animation-direction: reverse;
        }
        
        .animate-wave-3 {
          animation: wave-flow 25s linear infinite;
        }
      `}</style>
    </div>
  );
}