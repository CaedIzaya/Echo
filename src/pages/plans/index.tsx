import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import { useCachedProjects } from '~/hooks/useCachedProjects';
import PlanCard from './PlanCard';
import PlanManagement from './PlanManagement';
import CompletionDialog from './CompletionDialog';
import GoalInputModal from '~/components/goals/GoalInputModal';
import EditPlanModal from './EditPlanModal';
import ManageMilestonesModal from '~/components/plans/ManageMilestonesModal';
import MilestoneManager, { FinalGoal } from '~/components/milestone/MilestoneManager';
import BottomNavigation from '../dashboard/BottomNavigation';
import SplashLoader from '~/components/SplashLoader';

interface Project {
  id: string;
  name: string;
  focusBranch?: string;
  icon: string;
  dailyGoalMinutes: number;
  milestones: Milestone[];
  finalGoal?: FinalGoal;
  isActive: boolean;
  isPrimary?: boolean;
  isCompleted?: boolean;
  isBlank?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
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
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [completionPlan, setCompletionPlan] = useState<Project | null>(null);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [milestoneTargetPlanId, setMilestoneTargetPlanId] = useState<string | null>(null);
  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [showMilestoneManager, setShowMilestoneManager] = useState(false);
  const [managingMilestonePlanId, setManagingMilestonePlanId] = useState<string | null>(null);
  const [showManageMilestonesModal, setShowManageMilestonesModal] = useState(false);
  const [managingMilestonesPlanId, setManagingMilestonesPlanId] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<Project | null>(null);

  // 使用缓存 hook
  const {
    projects: plans,
    setProjects: setPlans,
    isLoading,
    isSyncing,
    updateProject,
    deleteProject: deleteCachedProject,
    addProject,
    refresh,
  } = useCachedProjects(sessionStatus);

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
    // 最多显示5个已完成计划，按完成时间倒序
    return plans
      .filter(p => p.isCompleted)
      .sort((a, b) => {
        const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bTime - aTime; // 最新的在前
      })
      .slice(0, 5);
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
  const handleSetPrimary = async () => {
    if (!selectedPlanId) return;
    
    if (!confirm(`确定要将"${selectedPlan?.name}"设为主要计划吗？\n\n设为主要计划后，只有在专注这个计划时，统计数据才会增长。`)) {
      return;
    }
    
    // 更新所有计划的 isPrimary 状态
    const updatedPlans = plans.map(plan => ({
      ...plan,
      isPrimary: plan.id === selectedPlanId
    }));
    setPlans(updatedPlans);
    
    // 调用 API 更新数据库
    await updateProject(selectedPlanId, { isPrimary: true }, async () => {
      const response = await fetch(`/api/projects/${selectedPlanId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrimary: true }),
      });
      
      if (response.ok) {
        // 清除缓存，强制Dashboard重新加载
        if (typeof window !== 'undefined') {
          localStorage.removeItem('userPlansSynced');
          localStorage.removeItem('projectsSyncedAt');
          localStorage.setItem('primaryPlanChanged', Date.now().toString());
          // 强制触发storage事件（同一标签页也能监听到）
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'primaryPlanChanged',
            newValue: Date.now().toString(),
          }));
        }
        return true;
      }
      return false;
    });
    
    setPageState('browsing');
    setSelectedPlanId(null);
  };

  // 删除计划
  const handleDeletePlan = async () => {
    if (!selectedPlanId) return;
    
    if (confirm(`确定要删除计划"${selectedPlan?.name}"吗？此操作不可恢复。`)) {
      await deleteCachedProject(selectedPlanId);
      
      // 清除缓存，强制Dashboard重新加载
      if (typeof window !== 'undefined') {
        localStorage.removeItem('userPlans');
        localStorage.removeItem('userPlansSynced');
        localStorage.removeItem('projectsSyncedAt');
        localStorage.setItem('primaryPlanChanged', Date.now().toString());
      }
      
      setSelectedPlanId(null);
      setPageState('browsing');
    }
  };

  // 完成计划
  const handleCompletePlan = async () => {
    if (!selectedPlanId || !selectedPlan) return;
    
    if (!confirm(`确定要完成计划"${selectedPlan.name}"吗？\n\n完成后该计划将移至已完成列表，不再显示在活跃计划中。`)) {
      return;
    }
    
    try {
      // 检查已完成计划数量，如果达到5个，删除最旧的
      const currentCompleted = plans.filter(p => p.isCompleted);
      if (currentCompleted.length >= 5) {
        // 找到最旧的已完成计划
        const oldestCompleted = currentCompleted.sort((a, b) => {
          const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return aTime - bTime;
        })[0];
        
        if (oldestCompleted) {
          // 删除最旧的已完成计划
          await deleteCachedProject(oldestCompleted.id);
        }
      }
      
      // 更新当前计划为已完成
      const response = await fetch(`/api/projects/${selectedPlanId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: true, isPrimary: false }),
      });

      if (!response.ok) {
        alert('完成计划失败，请重试');
        return;
      }

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
          // 也需要在数据库中更新
          await fetch(`/api/projects/${nextPrimary.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isPrimary: true }),
          });
        }
      }
      
      setPlans(updatedPlans);
      
      // 检查是否是第一次完成计划（首次成就）
      // 通过检查用户的totalCompletedProjects字段，如果为1则触发首次完成成就
      // 这个逻辑会在后端API中处理，这里只需要更新前端状态
      
      setCompletionPlan(selectedPlan);
      setShowCompletionDialog(true);
      setSelectedPlanId(null);
      setPageState('browsing');
    } catch (error) {
      console.error('完成计划失败:', error);
      alert('完成计划失败，请重试');
    }
  };

  // 庆祝弹窗处理
  const handleReviewJourney = () => {
    if (completionPlan) {
      router.push(`/plans/${completionPlan.id}/review`);
    }
    setShowCompletionDialog(false);
    setCompletionPlan(null);
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
    
    router.push({
      pathname: '/onboarding/goal-setting',
      query: { from: 'plans' },
    });
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
      
      return updated;
    });
  };

  // 打开添加小目标模态框
  const handleOpenAddMilestone = (planId: string) => {
    setMilestoneTargetPlanId(planId);
    setShowAddMilestone(true);
  };

  // 编辑计划 - 打开弹窗
  const handleEditPlan = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    setEditingPlan(plan);
    setShowEditPlanModal(true);
  };

  // 保存编辑的计划
  const handleSavePlan = async (planId: string, updates: { name: string; focusBranch: string; dailyGoalMinutes: number }) => {
    await updateProject(planId, {
      name: updates.name,
      focusBranch: updates.focusBranch,
      dailyGoalMinutes: updates.dailyGoalMinutes,
    }, async () => {
      await fetch(`/api/projects/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: updates.name,
          description: updates.focusBranch,
          dailyGoalMinutes: updates.dailyGoalMinutes,
        }),
      });
    });
    
    setShowEditPlanModal(false);
    setEditingPlan(null);
  };

  // 管理里程碑（最终目标）
  const handleManageMilestone = (planId: string) => {
    setManagingMilestonePlanId(planId);
    setShowMilestoneManager(true);
  };

  // 管理小目标
  const handleManageMilestones = (planId: string) => {
    setManagingMilestonesPlanId(planId);
    setShowManageMilestonesModal(true);
  };

  // 保存小目标管理（更新顺序和优先级）
  const handleSaveMilestones = async (reorderedMilestones: Milestone[], priorityIds: string[]) => {
    if (!managingMilestonesPlanId) return;

    const targetPlan = plans.find(p => p.id === managingMilestonesPlanId);
    if (!targetPlan) return;

    try {
      // 更新到数据库
      const response = await fetch(`/api/projects/${managingMilestonesPlanId}/milestones`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestones: reorderedMilestones.map(m => ({
            id: m.id,
            title: m.title,
            isCompleted: m.isCompleted,
            order: m.order,
          })),
        }),
      });

      if (response.ok) {
        // 更新本地状态
        const updatedPlans = plans.map(plan =>
          plan.id === managingMilestonesPlanId
            ? { ...plan, milestones: reorderedMilestones }
            : plan
        );
        setPlans(updatedPlans);
        console.log('✅ 小目标管理已保存');
      } else {
        alert('保存失败，请重试');
      }
    } catch (error) {
      console.error('保存小目标管理失败:', error);
      alert('保存失败，请重试');
    }
  };

  // 删除小目标
  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!managingMilestonesPlanId) return;

    const targetPlan = plans.find(p => p.id === managingMilestonesPlanId);
    if (!targetPlan) return;

    try {
      const response = await fetch(`/api/projects/${managingMilestonesPlanId}/milestones/${milestoneId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const updatedPlans = plans.map(plan =>
          plan.id === managingMilestonesPlanId
            ? {
                ...plan,
                milestones: plan.milestones.filter(m => m.id !== milestoneId),
              }
            : plan
        );
        setPlans(updatedPlans);
        console.log('✅ 小目标已删除');
      } else {
        alert('删除失败，请重试');
      }
    } catch (error) {
      console.error('删除小目标失败:', error);
      alert('删除失败，请重试');
    }
  };

  // 保存里程碑
  const handleSaveMilestone = async (goal: FinalGoal | undefined) => {
    if (!managingMilestonePlanId) return;

    await updateProject(
      managingMilestonePlanId,
      { finalGoal: goal },
      async () => {
        const response = await fetch(`/api/projects/${managingMilestonePlanId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            finalGoal: goal ?? null,
          }),
        });

        if (!response.ok) {
          throw new Error('保存终极目标失败');
        }
      }
    );
  };

  // 添加小目标
  const handleAddMilestone = async (title: string, targetPlanId?: string) => {
    const planId = targetPlanId || milestoneTargetPlanId;
    if (!planId) return false;

    const targetPlan = plans.find(p => p.id === planId);
    if (!targetPlan) return false;

    // 获取下一个order
    const maxOrder = targetPlan.milestones.length > 0 
      ? Math.max(...targetPlan.milestones.map(m => m.order))
      : 0;

    // 检查是否是第一次创建小目标（首次成就）- 在添加之前检查
    const allMilestonesBefore = plans.flatMap((p: Project) => p.milestones || []);
    const isFirstMilestone = allMilestonesBefore.length === 0;

    try {
        const response = await fetch(`/api/projects/${planId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          order: maxOrder + 1,
        }),
      });

      if (response.ok) {
        const { milestone } = await response.json();
        
        const updatedPlans = plans.map(plan => 
          plan.id === planId
            ? { ...plan, milestones: [...plan.milestones, milestone] }
            : plan
        );

        setPlans(updatedPlans);

        // 如果是第一次创建小目标，成就逻辑在后端API处理
        // 前端只需要更新UI状态

        return true;
      } else {
        alert('添加小目标失败，请重试');
      }
    } catch (error) {
      console.error('添加小目标失败:', error);
      alert('添加小目标失败，请重试');
    }
    return false;
  };

  // 认证检查
  useEffect(() => {
    if (sessionStatus === 'loading') {
      return;
    }

    if (sessionStatus === 'unauthenticated') {
      router.push('/');
      return;
    }

  }, [sessionStatus]);

  // 加载状态
  if (sessionStatus === 'loading' || isLoading) {
    return <SplashLoader />;
  }

  // 未认证状态
  if (sessionStatus === 'unauthenticated' || !session) {
    return null;
  }

  return (
    <>
      <Head>
        <title>计划管理 | Echo</title>
      </Head>
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
                onEdit={handleEditPlan}
                onManageMilestone={handleManageMilestone}
                onManageMilestones={handleManageMilestones}
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
                  onDeleteCompleted={async (planId) => {
                    await deleteCachedProject(planId);
                  }}
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
          onCancel={handleExitManagement}
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
      <GoalInputModal
        visible={showAddMilestone}
        userId={session?.user?.id}
        title="添加小目标"
        placeholder="输入小目标"
        onClose={() => {
          setShowAddMilestone(false);
          setMilestoneTargetPlanId(null);
        }}
        onConfirm={async (goalTitle) => {
          const success = await handleAddMilestone(goalTitle);
          if (success) {
            setShowAddMilestone(false);
            setMilestoneTargetPlanId(null);
          }
        }}
      />

      {/* 编辑计划弹窗 */}
      <EditPlanModal
        plan={editingPlan}
        isOpen={showEditPlanModal}
        onClose={() => {
          setShowEditPlanModal(false);
          setEditingPlan(null);
        }}
        onSave={handleSavePlan}
      />

      {/* 里程碑管理弹窗 */}
      <MilestoneManager
        isOpen={showMilestoneManager}
        onClose={() => {
          setShowMilestoneManager(false);
          setManagingMilestonePlanId(null);
        }}
        onSave={handleSaveMilestone}
        initialGoal={plans.find(p => p.id === managingMilestonePlanId)?.finalGoal}
        planName={plans.find(p => p.id === managingMilestonePlanId)?.name}
      />

      {/* 管理小目标弹窗 */}
      {managingMilestonesPlanId && (
        <ManageMilestonesModal
          visible={showManageMilestonesModal}
          planId={managingMilestonesPlanId}
          planName={plans.find(p => p.id === managingMilestonesPlanId)?.name || ''}
          milestones={plans.find(p => p.id === managingMilestonesPlanId)?.milestones || []}
          onClose={() => {
            setShowManageMilestonesModal(false);
            setManagingMilestonesPlanId(null);
          }}
          onSave={handleSaveMilestones}
          onDelete={handleDeleteMilestone}
          onRequestAdd={handleOpenAddMilestone}
        />
      )}

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
    </>
  );
}

