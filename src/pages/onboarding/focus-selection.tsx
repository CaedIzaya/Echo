'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

// 从第一步接收的兴趣数据接口
interface Interest {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export default function FocusSelection() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>([]);
  const [focusedInterest, setFocusedInterest] = useState<Interest | null>(null);
  const primaryInterest = focusedInterest ?? selectedInterests[0] ?? null;
  const secondaryInterests = primaryInterest
    ? selectedInterests.filter((interest) => interest.id !== primaryInterest.id)
    : selectedInterests;

  useEffect(() => {
    const verifySession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const session = await response.json();

        if (!session?.user) {
          router.replace('/auth/signin');
          return;
        }

        if (session.user.hasCompletedOnboarding) {
          router.replace('/dashboard');
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error('验证登录状态失败:', error);
        router.replace('/auth/signin');
      } finally {
        setIsCheckingSession(false);
      }
    };

    verifySession();
  }, [router]);

  // 在useEffect中添加更健壮的解析逻辑
  useEffect(() => {
    if (!isAuthorized) {
      return;
    }

    if (router.query.interests) {
      try {
        const interests = JSON.parse(router.query.interests as string);
        console.log('第二步接收到的兴趣:', interests);
        
        // 确保每个兴趣都有必要的属性
        const validatedInterests = interests.map((interest: any) => ({
          id: interest.id || 'unknown',
          name: interest.name || '未知兴趣',
          icon: interest.icon || '😊', // 自定义兴趣的默认图标
          color: interest.color || 'bg-gray-100 border-gray-300 text-gray-700',
        }));
        
        setSelectedInterests(validatedInterests);
      } catch (error) {
        console.error('解析兴趣数据失败:', error);
        router.push('/onboarding');
      }
    }
  }, [isAuthorized, router.query]);

  useEffect(() => {
    if (!focusedInterest && selectedInterests.length > 0) {
      setFocusedInterest(selectedInterests[0]);
    }
  }, [focusedInterest, selectedInterests]);

  const handleSelectFocus = (interest: Interest) => {
    setFocusedInterest(interest);
  };

  // 在 /src/pages/onboarding/focus-selection.tsx 中更新导航函数
  const handleContinue = () => {
    if (focusedInterest) {
      console.log('导航到第三步，聚焦兴趣:', focusedInterest);
      
      // 直接导航，不传递复杂参数
      router.push({
        pathname: '/onboarding/goal-setting',
        query: {
          interestId: focusedInterest.id,
          interestName: focusedInterest.name,
          interestIcon: focusedInterest.icon
        }
      });
    }
  };

  const handleBack = () => {
    // 返回第一步并携带当前选择的兴趣
    router.push({
      pathname: '/onboarding',
      query: { preselected: JSON.stringify(selectedInterests.map(i => i.id)) }
    });
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在验证登录状态...</p>
        </div>
      </div>
    );
  }

  // 如果还没有加载兴趣数据，显示加载状态
  if (!isAuthorized || selectedInterests.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>选择首要兴趣 - 数字静默</title>
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-5 sm:px-12 lg:px-20 py-6 sm:py-16">
        <div className="bg-white/95 rounded-[28px] shadow-[0_35px_85px_-45px_rgba(15,23,42,0.45)] p-6 sm:p-9 w-full max-w-2xl mx-auto border border-slate-200">
          {/* 头部 */}
          <div className="text-center mb-12">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              聚焦你的热爱
            </h1>
            <p className="text-gray-600 text-base sm:text-lg max-w-md mx-auto">
              先选择一个你最想开始的，其他的我们帮你记着
            </p>
          </div>

          {/* 悬浮主计划卡片 */}
          {primaryInterest && (
            <div className="relative mb-12 px-2">
              <div className="relative w-full max-w-xl mx-auto">
                <div className="absolute -inset-4 sm:-inset-5 -z-10 rounded-[32px] bg-gradient-to-r from-emerald-200 via-teal-200 to-blue-200 opacity-55 blur-lg pointer-events-none"></div>
                <div className="absolute -inset-[2px] -z-[5] rounded-[28px] bg-gradient-to-br from-white via-slate-50 to-slate-100 shadow-[0_30px_70px_-45px_rgba(15,23,42,0.5)] pointer-events-none"></div>
                <button
                  onClick={() => handleSelectFocus(primaryInterest)}
                  className={`
                    relative w-full flex flex-col sm:flex-row items-start sm:items-center gap-6 
                    p-7 sm:p-9 rounded-[24px] border-2 border-emerald-300/90 outline outline-1 outline-white/80 bg-white text-left
                    shadow-[0_28px_90px_-50px_rgba(15,23,42,0.55)] transition-transform duration-300 transform -translate-y-1 hover:-translate-y-3
                  `}
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white text-4xl shadow-lg">
                    {primaryInterest.icon}
                  </div>
                  <div className="flex-1">
                    <div className="inline-flex items-center rounded-full bg-blue-100 px-4 py-1 text-sm font-medium text-blue-700 mb-4">
                      当前首要计划
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-3">
                      {primaryInterest.name}
                    </h2>
                    <p className="text-gray-600 text-base sm:text-lg leading-relaxed">
                      这是你目前聚焦的核心方向，我们会围绕它为你定制更深度的目标与引导。
                    </p>
                  </div>
                  <div className="hidden sm:block text-sm font-medium text-blue-600">
                    点击切换其他计划
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* 其他计划卡片 */}
          {secondaryInterests.length > 0 && (
            <div className="px-2">
              <div className="max-w-xl mx-auto grid grid-cols-1 gap-5 mb-12">
              {secondaryInterests.map((interest) => (
                <button
                  key={interest.id}
                  onClick={() => handleSelectFocus(interest)}
                  className={`
                    flex flex-col items-center justify-center p-6 rounded-2xl 
                    border-2 transition-all duration-300 transform bg-white/98
                    hover:-translate-y-1.5 hover:shadow-lg hover:border-slate-300 active:scale-95
                    ${focusedInterest?.id === interest.id 
                      ? `${interest.color} border-current ring-2 ring-offset-2 ring-current scale-100`
                      : 'border-slate-200 text-gray-600 shadow-[0_16px_38px_-32px_rgba(15,23,42,0.32)]'
                    }
                  `}
                >
                  <span className="text-3xl mb-3">{interest.icon}</span>
                  <span className="text-lg font-medium mb-2">{interest.name}</span>
                  <span className="text-sm text-gray-500 text-center">
                    {focusedInterest?.id === interest.id ? '点击回到主计划' : '点击设为主计划'}
                  </span>
                </button>
              ))}
              </div>
            </div>
          )}

          {/* 底部操作 */}
          <div className="flex justify-between items-center">
            <button
              onClick={handleBack}
              className="flex items-center text-gray-500 hover:text-gray-700 font-medium transition-colors text-sm sm:text-base"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              返回重新选择
            </button>
            
            <button
              onClick={handleContinue}
              disabled={!focusedInterest}
              className={`
                px-4 py-2 sm:px-8 sm:py-3 text-sm sm:text-base rounded-full font-medium transition-all flex items-center
                ${focusedInterest
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg transform hover:scale-105'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              继续探索
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* 进度指示器 */}
          <div className="mt-8 flex justify-center">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}