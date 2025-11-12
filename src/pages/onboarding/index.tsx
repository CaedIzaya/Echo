'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  { id: '1', name: '游戏', icon: '🎮', color: 'bg-purple-100 border-purple-300 text-purple-700' },
  { id: '2', name: '阅读', icon: '📚', color: 'bg-blue-100 border-blue-300 text-blue-700' },
  { id: '3', name: '绘画', icon: '🎨', color: 'bg-pink-100 border-pink-300 text-pink-700' },
  { id: '4', name: '音乐', icon: '🎵', color: 'bg-yellow-100 border-yellow-300 text-yellow-700' },
  
  // 第二行 - 技能成长  
  { id: '5', name: '编程', icon: '💻', color: 'bg-indigo-100 border-indigo-300 text-indigo-700' },
  { id: '6', name: '语言', icon: '🗣️', color: 'bg-green-100 border-green-300 text-green-700' },
  { id: '7', name: '健身', icon: '💪', color: 'bg-red-100 border-red-300 text-red-700' },
  { id: '8', name: '厨艺', icon: '🍳', color: 'bg-orange-100 border-orange-300 text-orange-700' },
  
  // 第三行 - 生活探索
  { id: '9', name: '手工', icon: '🧵', color: 'bg-teal-100 border-teal-300 text-teal-700' },
  { id: '10', name: '学科', icon: '🎓', color: 'bg-blue-100 border-blue-300 text-blue-700' },
  { id: '11', name: '观影', icon: '🎬', color: 'bg-rose-100 border-rose-300 text-rose-700' },
  { id: '12', name: '写作', icon: '✍️', color: 'bg-cyan-100 border-cyan-300 text-cyan-700' }
];

export default function OnboardingPage() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // 在 /src/pages/onboarding/index.tsx 中更新
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
      
      console.log('传递到第二步的兴趣:', interestsToPass);
      
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
    // 跳过引导，进入主界面
    router.push('/dashboard');
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在验证登录状态...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-4xl">
        {/* 头部 */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            发现你的热爱
          </h1>
          <p className="text-gray-600 text-lg max-w-md mx-auto">
            选择让你心动的领域，我们将帮你开启一段专注的旅程
          </p>
        </div>

        {/* 兴趣网格 */}
        <InterestGrid onSelectionChange={handleInterestsSelected} />

        {/* 底部操作 */}
        <div className="flex justify-between items-center mt-12">
          <button
            onClick={handleSkip}
            className="text-gray-500 hover:text-gray-700 font-medium transition-colors"
          >
            稍后再说
          </button>
          
          <button
            onClick={handleContinue}
            disabled={selectedInterests.length === 0}
            className={`
              px-4 py-2 sm:px-8 sm:py-3 text-sm sm:text-base rounded-full font-medium transition-all
              ${selectedInterests.length > 0
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg transform hover:scale-105'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            继续探索 ({selectedInterests.length}/3)
          </button>
        </div>
      </div>
    </div>
  );
}