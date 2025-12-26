'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import InterestGrid from '../../components/onboarding/InterestGrid';

// 定义兴趣标签类型
interface Interest {
  id: string;
  name: string;
  icon: string;
  color: string;
}

// 精选的3x4兴趣网格
const INTERESTS: Interest[] = [
  // 第一行 - 创造表达
  { id: '1', name: '游戏', icon: '🎮', color: 'bg-gradient-to-br from-emerald-50 to-cyan-50 border-emerald-200 text-teal-700' },
  { id: '2', name: '阅读', icon: '📚', color: 'bg-gradient-to-br from-teal-50 to-sky-50 border-teal-200 text-teal-700' },
  { id: '3', name: '绘画', icon: '🎨', color: 'bg-gradient-to-br from-emerald-50 via-white to-teal-100 border-teal-200 text-teal-700' },
  { id: '4', name: '音乐', icon: '🎵', color: 'bg-gradient-to-br from-cyan-50 to-emerald-50 border-cyan-200 text-teal-700' },
  
  // 第二行 - 技能成长  
  { id: '5', name: '编程', icon: '💻', color: 'bg-gradient-to-br from-teal-50 to-emerald-100 border-teal-200 text-teal-700' },
  { id: '6', name: '语言', icon: '🗣️', color: 'bg-gradient-to-br from-emerald-50 to-cyan-100 border-emerald-200 text-teal-700' },
  { id: '7', name: '运动', icon: '🏃', color: 'bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200 text-teal-700' },
  { id: '8', name: '美食', icon: '🍳', color: 'bg-gradient-to-br from-sky-50 to-emerald-100 border-sky-200 text-teal-700' },
  
  // 第三行 - 生活探索
  { id: '9', name: '职业', icon: '💼', color: 'bg-gradient-to-br from-emerald-50 to-cyan-100 border-emerald-200 text-teal-700' },
  { id: '10', name: '学术', icon: '🎓', color: 'bg-gradient-to-br from-teal-50 to-sky-100 border-teal-200 text-teal-700' },
  { id: '11', name: '观影', icon: '🎬', color: 'bg-gradient-to-br from-cyan-50 to-emerald-100 border-cyan-200 text-teal-700' },
  { id: '12', name: '写作', icon: '✍️', color: 'bg-gradient-to-br from-emerald-50 via-white to-cyan-100 border-emerald-200 text-teal-700' }
];

export default function OnboardingPage() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // 更新状态定义
  const [selectedInterestObjects, setSelectedInterestObjects] = useState<Interest[]>([]);

  const { isReady, query, replace } = router;

  const allowReturn = useMemo(() => {
    if (!isReady) return false;
    const fromParam = Array.isArray(query.from) ? query.from[0] : query.from;
    const allowParam = Array.isArray(query.allowReturn) ? query.allowReturn[0] : query.allowReturn;
    return fromParam === 'plans' || allowParam === '1';
  }, [isReady, query.from, query.allowReturn]);

  useEffect(() => {
    if (!isReady) return;

    const verifySession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const session = await response.json();

        if (!session?.user) {
          replace('/auth/signin');
          return;
        }

        if (session.user.hasCompletedOnboarding && !allowReturn) {
          replace('/dashboard');
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error('验证登录状态失败:', error);
        replace('/auth/signin');
      } finally {
        setIsCheckingSession(false);
      }
    };

    verifySession();
  }, [isReady, allowReturn, replace]);

  // 更新处理函数
  const handleInterestsSelected = (interestIds: string[], interestObjects?: Interest[]) => {
    setSelectedInterests(interestIds);
    if (interestObjects) {
      setSelectedInterestObjects(interestObjects);
    } else {
      // 如果没有传递对象数组，从INTERESTS重建
      const objects = INTERESTS.filter(interest => interestIds.includes(interest.id));
      setSelectedInterestObjects(objects);
    }
  };

  // 更新导航函数
  const handleContinue = () => {
    if (selectedInterests.length > 0) {
      // 确保使用完整的兴趣对象数组
      const interestsToPass = selectedInterestObjects.length > 0 
        ? selectedInterestObjects 
        : INTERESTS.filter(interest => selectedInterests.includes(interest.id));
      
      // 传递from参数，以便后续页面识别来源
      const queryParams: any = { interests: JSON.stringify(interestsToPass) };
      if (allowReturn) {
        queryParams.from = query.from || 'plans';
        queryParams.allowReturn = '1';
      }
      
      router.push({
        pathname: '/onboarding/focus-selection',
        query: queryParams
      });
    }
  };

  const handleSkip = () => {
    // 🌟 用户选择"稍后再说"，标记为新用户首次进入，以便 Dashboard 显示启动激励
    if (typeof window !== 'undefined') {
      localStorage.setItem('isNewUserFirstEntry', 'true');
    }
    router.push('/dashboard');
  };

  if (isCheckingSession) {
    return null; // 极简加载，或者保持空白
  }

  if (!isAuthorized) {
    return null;
  }

  // 极简背景气泡
  const seaBubbles = [
    { size: 300, top: '-10%', left: '-10%', delay: '0s', duration: '20s' },
    { size: 400, bottom: '-10%', right: '-10%', delay: '5s', duration: '25s' },
    { size: 200, top: '40%', left: '50%', delay: '2s', duration: '18s', opacity: 0.1 },
  ];

  return (
    <>
      <Head>
        <title>选择兴趣</title>
      </Head>
      <div className="relative min-h-screen w-full overflow-hidden text-white flex flex-col items-center justify-center">
        {/* 动态生机蓝绿渐变背景 */}
        <div className="absolute inset-0 bg-gradient-animated pointer-events-none" />
        
        {/* 动态光晕效果 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-400/20 rounded-full blur-[120px] animate-pulse-slow" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-400/20 rounded-full blur-[120px] animate-pulse-slow-delayed" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-400/15 rounded-full blur-[140px] animate-pulse-slow-very-delayed" />
        </div>

        {/* 主体内容：极简，只有泡泡和底部按钮 */}
        <div className="relative z-10 w-full max-w-5xl px-4 flex flex-col items-center h-full justify-center min-h-[80vh]">
          
          {/* 上方文案 */}
          <div className="mb-8 text-center">
            <p className="text-lg sm:text-xl font-light tracking-wider text-white/80 animate-fade-in">
              还记得自己的热爱吗？
            </p>
          </div>
          
          {/* 中间是散落的泡泡 */}
          <div className="flex-1 flex items-center w-full">
             <InterestGrid onSelectionChange={handleInterestsSelected} />
          </div>

          {/* 底部极简操作栏 */}
          <div className="mt-8 mb-12 flex items-center gap-8 text-sm font-light tracking-widest">
            <button 
              onClick={handleSkip}
              className="text-white/40 hover:text-white transition-colors uppercase"
            >
              稍后再说
            </button>

            <div className="h-4 w-[1px] bg-white/20"></div>

            <button 
              onClick={handleContinue}
              disabled={selectedInterests.length === 0}
              className={`
                uppercase transition-all duration-500
                ${selectedInterests.length > 0 ? 'text-teal-300 hover:text-teal-200 scale-110 font-normal' : 'text-white/20 cursor-not-allowed'}
              `}
            >
              下一步
            </button>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .bg-gradient-animated {
          background: linear-gradient(135deg, #0a4d3a 0%, #0d7377 25%, #14b8a6 50%, #06b6d4 75%, #0891b2 100%);
          background-size: 400% 400%;
          animation: gradientShift 15s ease infinite;
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes pulseSlow {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.1); }
        }
        .animate-pulse-slow {
          animation: pulseSlow 8s ease-in-out infinite;
        }
        .animate-pulse-slow-delayed {
          animation: pulseSlow 8s ease-in-out infinite;
          animation-delay: 2s;
        }
        .animate-pulse-slow-very-delayed {
          animation: pulseSlow 8s ease-in-out infinite;
          animation-delay: 4s;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 1s ease-out;
        }
      `}</style>
    </>
  );
}