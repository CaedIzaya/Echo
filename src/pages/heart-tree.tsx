import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import HeartTreeComponent from './dashboard/HeartTree';
import BottomNavigation from './dashboard/BottomNavigation';
import { getNamingGuideText, getFirstMeetingText } from '~/awareness/heart-tree-naming';

export default function HeartTreePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [hasCompletedFocusToday, setHasCompletedFocusToday] = useState(false);
  const [heartTreeName, setHeartTreeName] = useState<string | null>(null);
  const [isNaming, setIsNaming] = useState(false);
  const [namingInput, setNamingInput] = useState('');
  const [hasJustNamed, setHasJustNamed] = useState(false);

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
    setHasJustNamed(true);
  };

  const handleFinishWelcome = () => {
    setIsNaming(false);
    setHasJustNamed(false);
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

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-cyan-50 pb-20">
        <div className="max-w-4xl mx-auto">
          <HeartTreeComponent
            todaySessions={hasCompletedFocusToday ? 1 : 0}
            completedMilestonesToday={0}
            newAchievementsToday={1}
          />
        </div>

        {/* 新用户：心树命名流程 */}
        {isNaming && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 p-6">
              {!heartTreeName && !hasJustNamed && (
                <>
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
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      className="text-xs text-gray-400 hover:text-gray-600"
                      onClick={() => setIsNaming(false)}
                    >
                      稍后再说
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmName}
                      disabled={!namingInput.trim()}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition
                        ${namingInput.trim()
                          ? 'bg-emerald-500 hover:bg-emerald-600'
                          : 'bg-emerald-200 cursor-not-allowed'
                        }`}
                    >
                      完成命名
                    </button>
                  </div>
                </>
              )}

              {/* 命名完成后的首次见面文案 */}
              {heartTreeName && hasJustNamed && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-emerald-500 font-medium mb-2">
                      初次相遇
                    </p>
                    <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-line">
                      {getFirstMeetingText(heartTreeName)}
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleFinishWelcome}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition"
                    >
                      开始一起长年轮
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* 移动端底部导航：当前页面为心树 */}
      <BottomNavigation active="heart-tree" />
    </>
  );
}
