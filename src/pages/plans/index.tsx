import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import PlanCard from './PlanCard';
import PlanManagement from './PlanManagement';
import CompletionDialog from './CompletionDialog';
import AddMilestoneModal from './AddMilestoneModal';
import BottomNavigation from '../dashboard/BottomNavigation';

interface Project {
  id: string;
  name: string;
  icon: string;
  dailyGoalMinutes: number;
  milestones: Milestone[];
  isActive: boolean;
  isPrimary?: boolean;
  isCompleted?: boolean;
}

interface Milestone {
  id: string;
  title: string;
  isCompleted: boolean;
  order: number;
}

type PageState = 'browsing' | 'managing';

export default function PlansPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>('browsing');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [completionPlan, setCompletionPlan] = useState<Project | null>(null);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [milestoneTargetPlanId, setMilestoneTargetPlanId] = useState<string | null>(null);

  // 从localStorage加载计划数据
  const [plans, setPlans] = useState<Project[]>(() => {
    if (typeof window !== 'undefined') {
      const savedPlans = localStorage.getItem('userPlans');
      if (savedPlans) {
        const parsed = JSON.parse(savedPlans);
        // Ensure all plans have milestones array
        return parsed.map((plan: Project) => ({
          ...plan,
          milestones: plan.milestones || []
        }));
      }
    }
    return [];
  });

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  const activePlans = useMemo(() => {
    const actives = plans
      .filter(p => p.isActive && !p.isCompleted);

    actives.sort((a, b) => {
      if (a.isPrimary === b.isPrimary) return 0;
      return a.isPrimary ? -1 : 1;
    });

    return actives;
  }, [plans]);

  const completedPlans = useMemo(() => {
    return plans.filter(p => p.isCompleted);
  }, [plans]);

  // 进入管理状态
  const handleEnterManagement = () => {
    setPageState('managing');
    setSelectedPlanId(null);
  };

  // 退出管理状态
  const handleExitManagement = () => {
    setPageState('browsing');
    setSelectedPlanId(null);
  };

  // 选择计划（管理状态）
  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
  };

  // 切换为主要计划
  const handleSetPrimary = () => {
    if (!selectedPlanId) return;
    
    const updatedPlans = plans.map(plan => ({
      ...plan,
      isPrimary: plan.id === selectedPlanId
    }));
    
    setPlans(updatedPlans);
    // 同步到localStorage
    localStorage.setItem('userPlans', JSON.stringify(updatedPlans));
    
    setPageState('browsing');
    setSelectedPlanId(null);
  };

  // 删除计划
  const handleDeletePlan = () => {
    if (!selectedPlanId) return;
    
    if (confirm(`确定要删除计划"${selectedPlan?.name}"吗？此操作不可恢复。`)) {
      const updatedPlans = plans.filter(p => p.id !== selectedPlanId);
      setPlans(updatedPlans);
      // 同步到localStorage
      localStorage.setItem('userPlans', JSON.stringify(updatedPlans));
      setSelectedPlanId(null);
      setPageState('browsing');
    }
  };

  // 完成计划
  const handleCompletePlan = () => {
    if (!selectedPlanId || !selectedPlan) return;
    
    const updatedPlans = plans.map(plan => 
      plan.id === selectedPlanId 
        ? { ...plan, isCompleted: true, isPrimary: false }
        : plan
    );
    
    // 如果主要计划完成，需要切换主要计划
    if (selectedPlan.isPrimary && updatedPlans.length > 1) {
      const nextPrimary = updatedPlans.find(p => !p.isCompleted);
      if (nextPrimary) {
        nextPrimary.isPrimary = true;
      }
    }
    
    setPlans(updatedPlans);
    // 同步到localStorage
    localStorage.setItem('userPlans', JSON.stringify(updatedPlans));
    
    setCompletionPlan(selectedPlan);
    setShowCompletionDialog(true);
    setSelectedPlanId(null);
    setPageState('browsing');
  };

  // 庆祝弹窗处理
  const handleReviewJourney = () => {
    setShowCompletionDialog(false);
    setCompletionPlan(null);
    // 跳转到回顾页面
    // router.push(`/plans/${completionPlan?.id}/review`);
    alert('回顾功能待实现');
  };

  const handleSkipReview = () => {
    setShowCompletionDialog(false);
    setCompletionPlan(null);
  };

  // 创建新计划 - 带上限检查
  const handleCreatePlan = () => {
    // 检查计划数量上限（3个）
    const activePlans = plans.filter(p => p.isActive && !p.isCompleted);
    if (activePlans.length >= 3) {
      alert('最多只能创建3个计划，请先完成或删除现有计划');
      return;
    }
    
    router.push('/onboarding');
  };

  // 添加新计划（从onboarding或其他地方调用）
  const handleAddPlan = (newPlan: Project) => {
    const activePlans = plans.filter(p => p.isActive && !p.isCompleted);
    
    // 判断是否自动设为主要计划
    const shouldSetPrimary = activePlans.length === 0; // 如果是最新且唯一的计划，自动设为主要
    
    const planWithPrimary = {
      ...newPlan,
      isPrimary: shouldSetPrimary,
      isActive: true,
      isCompleted: false
    };
    
    setPlans(prev => {
      // 如果新计划是主要计划，清除其他计划的主要标志
      let updated;
      if (shouldSetPrimary) {
        updated = prev.map(p => ({
          ...p,
          isPrimary: p.id === planWithPrimary.id
        }));
      } else {
        updated = [...prev, planWithPrimary];
      }
      
      // 同步到localStorage
      localStorage.setItem('userPlans', JSON.stringify(updated));
      
      return updated;
    });
  };

  // 打开添加小目标模态框
  const handleOpenAddMilestone = (planId: string) => {
    setMilestoneTargetPlanId(planId);
    setShowAddMilestone(true);
  };

  // 添加小目标
  const handleAddMilestone = (title: string) => {
    if (!milestoneTargetPlanId) return;

    const targetPlan = plans.find(p => p.id === milestoneTargetPlanId);
    if (!targetPlan) return;

    // 获取下一个order
    const maxOrder = targetPlan.milestones.length > 0 
      ? Math.max(...targetPlan.milestones.map(m => m.order))
      : 0;

    const newMilestone = {
      id: Date.now().toString(),
      title,
      isCompleted: false,
      order: maxOrder + 1
    };

    const updatedPlans = plans.map(plan => 
      plan.id === milestoneTargetPlanId
        ? { ...plan, milestones: [...plan.milestones, newMilestone] }
        : plan
    );

    setPlans(updatedPlans);
    // 同步到localStorage
    localStorage.setItem('userPlans', JSON.stringify(updatedPlans));

    setShowAddMilestone(false);
    setMilestoneTargetPlanId(null);
  };

  // 认证检查
  useEffect(() => {
    if (sessionStatus === 'loading') {
      return;
    }

    if (sessionStatus === 'unauthenticated') {
      window.location.href = '/auth/signin';
      return;
    }

    if (sessionStatus === 'authenticated') {
      setIsLoading(false);
    }
  }, [sessionStatus]);

  // 加载状态
  if (sessionStatus === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // 未认证状态
  if (sessionStatus === 'unauthenticated' || !session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 pb-24">
      <div className="w-full max-w-5xl mx-auto px-5 sm:px-10 pt-20">
        {/* 头部 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {pageState === 'browsing' ? '我的计划' : '选择要操作的计划'}
            </h1>
            <p className="text-gray-500 mt-1">
              {pageState === 'browsing' 
                ? '管理您的专注目标' 
                : '选择一个计划进行操作'}
            </p>
          </div>

          {pageState === 'browsing' ? (
            <div className="flex gap-3">
              <button
                onClick={handleCreatePlan}
                className="bg-teal-500 text-white px-4 py-2 rounded-xl font-medium hover:bg-teal-600 transition shadow-sm"
              >
                ➕ 新建
              </button>
              <button
                onClick={handleEnterManagement}
                className="bg-white text-gray-700 px-4 py-2 rounded-xl font-medium hover:bg-gray-50 transition shadow-sm border border-gray-200"
              >
                ⚙️ 管理
              </button>
            </div>
          ) : (
            <button
              onClick={handleExitManagement}
              className="text-gray-600 hover:text-gray-900 transition"
            >
              取消
            </button>
          )}
        </div>

        {/* 计划列表 */}
        {activePlans.length > 0 ? (
          <div className="space-y-5 mb-12">
            {activePlans.map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isPrimary={plan.isPrimary}
                selectable={pageState === 'managing'}
                selected={selectedPlanId === plan.id}
                onSelect={handleSelectPlan}
                onAddMilestone={handleOpenAddMilestone}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white/50 backdrop-blur-sm rounded-3xl shadow-sm">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              准备好一次全新的投资了吗？
            </h3>
            <p className="text-gray-600 mb-6">
              创建一个新计划，开始专注之旅
            </p>
            <button
              onClick={handleCreatePlan}
              className="bg-teal-500 text-white px-8 py-3 rounded-full font-medium hover:bg-teal-600 transition shadow-lg"
            >
              创建新计划
            </button>
          </div>
        )}

        {/* 已完成计划区域 */}
        {completedPlans.length > 0 && (
          <div className="mb-6">
            <button className="text-gray-600 text-sm font-medium mb-3">
              ▼ 已完成计划 ({completedPlans.length})
            </button>
            <div className="space-y-4">
              {completedPlans.map(plan => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isCompleted={true}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 管理底部栏 */}
      {pageState === 'managing' && (
        <PlanManagement
          selectedPlan={selectedPlan}
          onSetPrimary={handleSetPrimary}
          onDelete={handleDeletePlan}
          onComplete={handleCompletePlan}
        />
      )}

      {/* 计划完成庆祝弹窗 */}
      <CompletionDialog
        visible={showCompletionDialog}
        plan={completionPlan}
        onReview={handleReviewJourney}
        onSkip={handleSkipReview}
      />

      {/* 添加小目标弹窗 */}
      <AddMilestoneModal
        visible={showAddMilestone}
        onClose={() => {
          setShowAddMilestone(false);
          setMilestoneTargetPlanId(null);
        }}
        onSave={handleAddMilestone}
      />

      <BottomNavigation active="plans" />

      {/* CSS 动画样式 */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes pulse-border {
          0%, 100% {
            border-color: rgb(20 184 166);
          }
          50% {
            border-color: rgb(6 182 212);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }

        .animate-pulse-border {
          animation: pulse-border 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

