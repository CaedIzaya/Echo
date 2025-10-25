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
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>([]);
  const [focusedInterest, setFocusedInterest] = useState<Interest | null>(null);

 // 在useEffect中添加更健壮的解析逻辑
useEffect(() => {
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
}, [router.query]);

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

  // 如果还没有加载兴趣数据，显示加载状态
  if (selectedInterests.length === 0) {
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
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 sm:p-8">
        <div className="bg-white rounded-3xl shadow-xl p-4 sm:p-8 w-full max-w-4xl mx-2 sm:mx-auto">
          {/* 头部 */}
          <div className="text-center mb-12">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              聚焦你的热爱
            </h1>
            <p className="text-gray-600 text-base sm:text-lg max-w-md mx-auto">
              先选择一个你最想开始的，其他的我们帮你记着
            </p>
          </div>

          {/* 三个兴趣卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {selectedInterests.map((interest) => (
              <button
                key={interest.id}
                onClick={() => handleSelectFocus(interest)}
                className={`
                  flex flex-col items-center justify-center p-6 rounded-2xl 
                  border-2 transition-all duration-300 transform
                  hover:scale-105 active:scale-95
                  ${focusedInterest?.id === interest.id 
                    ? `${interest.color} border-current scale-105 shadow-lg ring-2 ring-offset-2 ring-current` 
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:shadow-md'
                  }
                `}
              >
                <span className="text-4xl mb-4">{interest.icon}</span>
                <span className="text-lg font-medium mb-2">{interest.name}</span>
                <span className="text-sm text-gray-500 text-center">
                  {focusedInterest?.id === interest.id ? '已选择' : '点击选择'}
                </span>
                
                {/* 选中状态指示器 */}
                {focusedInterest?.id === interest.id && (
                  <div className="mt-4 w-3 h-3 bg-current rounded-full"></div>
                )}
              </button>
            ))}
          </div>

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