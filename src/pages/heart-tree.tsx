import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import HeartTreeComponent from './dashboard/HeartTree';
import BottomNavigation from './dashboard/BottomNavigation';
import { getNamingGuideText, getFirstMeetingText } from '~/awareness/heart-tree-naming';
import { useSafeTimeout } from '~/hooks/usePerformance';

export default function HeartTreePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [hasCompletedFocusToday, setHasCompletedFocusToday] = useState(false);
  const [heartTreeName, setHeartTreeName] = useState<string | null>(null);
  const [isNaming, setIsNaming] = useState(false);
  const [namingInput, setNamingInput] = useState('');
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const welcomeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { setSafeTimeout, clearSafeTimeout } = useSafeTimeout();

  // 检查今天是否完成过专注 & 加载心树名字 / 命名状态
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkTodayAndName = () => {
      try {
        // 1）检查今天是否有完成的专注（>= 25分钟）
        const todayStats = localStorage.getItem('todayStats');
        if (todayStats) {
          const stats = JSON.parse(todayStats);
          const today = new Date().toISOString().split('T')[0];
          const todayData = stats[today];
          const hasFocus = todayData && todayData.minutes >= 25;
          setHasCompletedFocusToday(!!hasFocus);
        } else {
          setHasCompletedFocusToday(false);
        }

        // 2）加载心树名字
        const storedName = localStorage.getItem('heartTreeNameV1');
        if (storedName && storedName.trim().length > 0) {
          setHeartTreeName(storedName.trim());
          setIsNaming(false);
        } else {
          setHeartTreeName(null);
          setIsNaming(true);
        }
      } catch {
        setHasCompletedFocusToday(false);
        setHeartTreeName(null);
        setIsNaming(true);
      }
    };
    
    // 页面加载时检查一次今日专注状态和心树命名状态
    // 删除轮询，避免在用户刚命名完成时意外关闭欢迎文案弹层
    checkTodayAndName();
  }, []);

  const handleConfirmName = () => {
    const trimmed = namingInput.trim();
    if (!trimmed) return;
    if (typeof window !== 'undefined') {
      localStorage.setItem('heartTreeNameV1', trimmed);
    }
    setHeartTreeName(trimmed);
    setIsNaming(false); // 关闭起名弹窗
    setShowWelcomeDialog(true); // 打开欢迎弹窗
  };

  // 欢迎弹窗显示后，10秒自动关闭
  useEffect(() => {
    if (showWelcomeDialog) {
      const timer = setSafeTimeout(() => {
        // 10 秒后自动关闭欢迎弹窗
        setShowWelcomeDialog(false);
        setNamingInput('');
      }, 10000);
      
      return () => clearSafeTimeout();
    }
  }, [showWelcomeDialog, setSafeTimeout, clearSafeTimeout]);

  const handleFinishWelcome = () => {
    // 用户主动点击"开始"按钮时，立即关闭欢迎弹窗
    clearSafeTimeout();
    setShowWelcomeDialog(false);
    setNamingInput('');
  };

  // 未登录时重定向
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }


    // 显示心树页面（无论是否命名都显示，但未命名时显示命名弹窗）
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-cyan-50 pb-20">
          <div className="max-w-4xl mx-auto">
            {/* 如果已命名，显示心树组件；否则显示占位内容 */}
            {heartTreeName ? (
              <HeartTreeComponent
                todaySessions={hasCompletedFocusToday ? 1 : 0}
                completedMilestonesToday={0}
                newAchievementsToday={1}
              />
            ) : (
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <p className="text-sm">请先为心树起个名字</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 第一个弹窗：起名流程（未命名时显示） */}
        {isNaming && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gradient-to-br from-green-50/95 via-teal-50/95 to-cyan-50/95 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 p-6 relative">
              <div className="mb-4">
                <p className="text-xs uppercase tracking-[0.35em] text-emerald-500 font-medium mb-2">
                  心树初次见面
                </p>
                <p className="text-gray-800 text-sm leading-relaxed">
                  {getNamingGuideText()}
                </p>
              </div>
              <div className="mt-4">
                <label className="block text-xs text-gray-500 mb-1">
                  给心树起一个名字（2-6 个字）
                </label>
                <input
                  type="text"
                  value={namingInput}
                  maxLength={6}
                  onChange={(e) => setNamingInput(e.target.value)}
                  className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                  placeholder="比如：年轮、阿树、小年轮…"
                />
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleConfirmName}
                  disabled={!namingInput.trim()}
                  className={`px-6 py-2 rounded-xl text-sm font-semibold text-white transition
                    ${namingInput.trim()
                      ? 'bg-emerald-500 hover:bg-emerald-600 shadow-lg'
                      : 'bg-emerald-200 cursor-not-allowed'
                    }`}
                >
                  完成命名
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 第二个弹窗：欢迎对话（删除了树苗emoji） */}
        {showWelcomeDialog && heartTreeName && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 p-6 relative animate-fade-in">
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-xs uppercase tracking-[0.35em] text-emerald-500 font-medium mb-4">
                    {heartTreeName}
                  </p>
                  <p className="text-gray-800 text-base leading-relaxed whitespace-pre-line px-4">
                    {getFirstMeetingText(heartTreeName)}
                  </p>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={handleFinishWelcome}
                    className="w-full px-6 py-3 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition shadow-lg"
                  >
                    开始一起长年轮
                  </button>
                  <p className="text-xs text-gray-400">
                    或等待 10 秒自动继续
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 移动端底部导航：当前页面为心树（无论是否命名都显示） */}
        <BottomNavigation active="heart-tree" />
      </>
    );
  }
