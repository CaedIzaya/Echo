import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Head from 'next/head';

interface Project {
  id: string;
  name: string;
  description?: string;
  icon: string;
  dailyGoalMinutes: number;
  totalFocusMinutes: number;
  streakDays: number;
  completedMilestones: number;
  startDate?: string;
  createdAt: string;
  targetDate?: string;
  avgFlowScore?: number;
  milestones: Array<{
    id: string;
    title: string;
    isCompleted: boolean;
  }>;
}

export default function PlanReview() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status } = useSession();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/signin');
      return;
    }

    if (status === 'authenticated' && id) {
      loadProject();
    }
  }, [status, id]);

  const loadProject = async () => {
    try {
      const response = await fetch(`/api/projects/${id}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data.project);
      } else {
        alert('加载计划失败');
        router.back();
      }
    } catch (error) {
      console.error('加载计划失败:', error);
      alert('加载计划失败');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-teal-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const totalDays = project.startDate 
    ? Math.ceil((new Date().getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24))
    : Math.ceil((new Date().getTime() - new Date(project.createdAt).getTime()) / (1000 * 60 * 60 * 24));

  const totalHours = Math.floor(project.totalFocusMinutes / 60);
  const remainingMinutes = project.totalFocusMinutes % 60;

  const completionRate = project.milestones.length > 0
    ? Math.round((project.completedMilestones / project.milestones.length) * 100)
    : 0;

  return (
    <>
      <Head>
        <title>{project.name} - 回顾 | 数字静默</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 pb-20">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-6 shadow-lg">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <span>←</span>
            <span>返回</span>
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-4xl">
              {project.icon}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              {project.description && (
                <p className="text-white/80 text-sm mt-1">{project.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="p-6 space-y-4">
          {/* 时间统计 */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-teal-100">
            <h2 className="text-lg font-bold text-teal-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">⏱️</span>
              <span>时间投入</span>
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl">
                <div className="text-3xl font-bold text-teal-600">
                  {totalHours}
                  <span className="text-lg">小时</span>
                  {remainingMinutes > 0 && (
                    <span className="text-lg ml-1">{remainingMinutes}分</span>
                  )}
                </div>
                <div className="text-sm text-teal-600/70 mt-1">专注总时长</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl">
                <div className="text-3xl font-bold text-cyan-600">{totalDays}</div>
                <div className="text-sm text-cyan-600/70 mt-1">总天数</div>
              </div>
            </div>
          </div>

          {/* 连续性统计 */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-teal-100">
            <h2 className="text-lg font-bold text-teal-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">🔥</span>
              <span>坚持记录</span>
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl">
                <div className="text-3xl font-bold text-orange-600">{project.streakDays}</div>
                <div className="text-sm text-orange-600/70 mt-1">Echo陪伴</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
                <div className="text-3xl font-bold text-purple-600">
                  {project.avgFlowScore ? project.avgFlowScore.toFixed(1) : '--'}
                </div>
                <div className="text-sm text-purple-600/70 mt-1">平均心流指数</div>
              </div>
            </div>
          </div>

          {/* 里程碑统计 */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-teal-100">
            <h2 className="text-lg font-bold text-teal-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              <span>目标达成</span>
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-teal-700">完成进度</span>
                <span className="text-2xl font-bold text-teal-600">{completionRate}%</span>
              </div>
              <div className="w-full bg-teal-100 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-teal-500 to-cyan-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm text-teal-600/70">
                <span>已完成 {project.completedMilestones} 个</span>
                <span>共 {project.milestones.length} 个小目标</span>
              </div>
            </div>
          </div>

          {/* 日期信息 */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-teal-100">
            <h2 className="text-lg font-bold text-teal-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">📅</span>
              <span>时间线</span>
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-teal-700">创建日期</span>
                <span className="text-teal-600 font-medium">
                  {new Date(project.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
              {project.startDate && (
                <div className="flex justify-between items-center">
                  <span className="text-teal-700">起始日期</span>
                  <span className="text-teal-600 font-medium">
                    {new Date(project.startDate).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              )}
              {project.targetDate && (
                <div className="flex justify-between items-center">
                  <span className="text-teal-700">目标日期</span>
                  <span className="text-teal-600 font-medium">
                    {new Date(project.targetDate).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-teal-700">每日目标</span>
                <span className="text-teal-600 font-medium">{project.dailyGoalMinutes} 分钟</span>
              </div>
            </div>
          </div>

          {/* 里程碑列表 */}
          {project.milestones.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-teal-100">
              <h2 className="text-lg font-bold text-teal-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">📝</span>
                <span>小目标清单</span>
              </h2>
              <div className="space-y-2">
                {project.milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className={`flex items-center gap-3 p-3 rounded-xl ${
                      milestone.isCompleted
                        ? 'bg-emerald-50 border border-emerald-200'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="text-xl">
                      {milestone.isCompleted ? '✅' : '⭕'}
                    </div>
                    <span
                      className={`flex-1 ${
                        milestone.isCompleted
                          ? 'text-emerald-700 line-through'
                          : 'text-gray-700'
                      }`}
                    >
                      {milestone.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 返回按钮 */}
          <button
            onClick={() => router.push('/plans')}
            className="w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            返回计划列表
          </button>
        </div>
      </div>
    </>
  );
}







