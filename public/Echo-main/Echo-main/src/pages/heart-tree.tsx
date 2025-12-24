import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import HeartTreeComponent from './dashboard/HeartTree';
import BottomNavigation from './dashboard/BottomNavigation';
import { getNamingGuideText, getFirstMeetingText } from '~/awareness/heart-tree-naming';
import { useSafeTimeout } from '~/hooks/usePerformance';
import { useHeartTreeName } from '~/hooks/useHeartTreeName';

export default function HeartTreePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [hasCompletedFocusToday, setHasCompletedFocusToday] = useState(false);
  const { treeName, isLoading: isLoadingName, updateTreeName, isSaving } = useHeartTreeName();
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

        // 2）检查是否需要命名（从Hook获取）
        if (!isLoadingName) {
          if (treeName && treeName !== '心树') {
            setIsNaming(false);
          } else {
            setIsNaming(true);
          }
        }
      } catch {
        setHasCompletedFocusToday(false);
      }
    };
    
    // 页面加载时检查一次今日专注状态和心树命名状态
    // 删除轮询，避免在用户刚命名完成时意外关闭欢迎文案弹层
    checkTodayAndName();
  }, [treeName, isLoadingName]);

  const handleConfirmName = async () => {
    const trimmed = namingInput.trim();
    if (!trimmed) return;
    
    // 使用新的Hook保存到数据库和localStorage
    const success = await updateTreeName(trimmed);
    
    if (success) {
      setIsNaming(false); // 关闭起名弹窗
      setShowWelcomeDialog(true); // 打开欢迎弹窗
    } else {
      // 保存失败时显示提示
      alert('保存失败，请重试');
    }
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
        <div className="min-h-screen bg-gradient-to-b from-sky-300 via-sky-100 to-white pb-20 relative overflow-hidden">
          {/* 云朵背景装饰 */}
          <div className="absolute top-[10%] left-[15%] w-24 h-8 bg-white/60 rounded-full blur-xl animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute top-[15%] right-[20%] w-32 h-10 bg-white/70 rounded-full blur-xl animate-pulse" style={{ animationDuration: '12s' }} />
          <div className="absolute top-[25%] left-[40%] w-20 h-6 bg-white/50 rounded-full blur-lg animate-pulse" style={{ animationDuration: '10s' }} />
          
          <div className="max-w-4xl mx-auto relative z-10">
            {/* 如果已命名，显示心树组件；否则显示占位内容 */}
            {!isLoadingName && treeName && treeName !== '心树' ? (
              <HeartTreeComponent
                todaySessions={hasCompletedFocusToday ? 1 : 0}
                completedMilestonesToday={0}
                newAchievementsToday={1}
              />
            ) : (
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <p className="text-sm">{isLoadingName ? '加载中...' : '请先为心树起个名字'}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 第一个弹窗：起名流程（未命名时显示） */}
        {isNaming && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-sky-400/20 backdrop-blur-md">
            <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl max-w-md w-full mx-4 p-8 relative border border-white/50">
              <div className="mb-6">
                <p className="text-[10px] uppercase tracking-[0.4em] text-sky-500 font-bold mb-3">
                  心树初次见面
                </p>
                <p className="text-gray-700 text-sm leading-relaxed font-medium">
                  {getNamingGuideText()}
                </p>
              </div>
              <div className="mt-6">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  给心树起一个名字（2-6 个字）
                </label>
                <input
                  type="text"
                  value={namingInput}
                  maxLength={6}
                  onChange={(e) => setNamingInput(e.target.value)}
                  className="w-full rounded-2xl border-2 border-sky-100 bg-sky-50/30 px-4 py-3 text-base focus:outline-none focus:ring-4 focus:ring-sky-400/20 focus:border-sky-400 transition-all placeholder:text-gray-300"
                  placeholder="比如：年轮、阿树..."
                />
              </div>
              <div className="mt-8">
                <button
                  type="button"
                  onClick={handleConfirmName}
                  disabled={!namingInput.trim() || isSaving}
                  className={`w-full py-4 rounded-2xl text-sm font-bold text-white transition-all shadow-xl
                    ${namingInput.trim() && !isSaving
                      ? 'bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600 shadow-sky-200'
                      : 'bg-gray-200 cursor-not-allowed'
                    }`}
                >
                  {isSaving ? '保存中...' : '完成命名'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 第二个弹窗：欢迎对话（删除了树苗emoji） */}
        {showWelcomeDialog && treeName && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 p-6 relative animate-fade-in">
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-xs uppercase tracking-[0.35em] text-emerald-500 font-medium mb-4">
                    {treeName}
                  </p>
                  <p className="text-gray-800 text-base leading-relaxed whitespace-pre-line px-4">
                    {getFirstMeetingText(treeName)}
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
