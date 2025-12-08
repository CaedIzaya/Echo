'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

interface Interest {
  id: string;
  name: string;
  icon: string;
}

enum FormStep {
  Branch = 'BRANCH',
  DetailBranch = 'DETAIL_BRANCH',
  Milestone = 'MILESTONE',
  Name = 'NAME',
  Time = 'TIME',
  Date = 'DATE',
}

// 分支建议（暂时为空，后续会从数据库获取）
// 即使为空，也会显示5个空泡泡
const BRANCH_SUGGESTIONS: string[] = [];

// 里程碑提示（中文）
const MILESTONE_HINTS = [
  { label: '小步骤', delay: '0s' },
  { label: '可执行', delay: '1s' },
  { label: '积极正面', delay: '2s' },
];

// 时间选项
const TIME_OPTIONS = [15, 30, 45, 60];

export default function GoalSetting() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [focusedInterest, setFocusedInterest] = useState<Interest | null>(null);
  const [allSelectedInterests, setAllSelectedInterests] = useState<Interest[]>([]);
  const [currentStep, setCurrentStep] = useState<FormStep>(FormStep.Branch);
  const [formData, setFormData] = useState({
    focusBranch: '',
    focusDetail: '',
    firstMilestone: '',
    projectName: '',
    dailyMinTime: 30,
    targetDate: '' as string | null,
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editPlanId, setEditPlanId] = useState<string | null>(null);
  const [selectedBranchFromBubble, setSelectedBranchFromBubble] = useState(false); // 跟踪是否从泡泡选择
  const [customTimeInput, setCustomTimeInput] = useState(''); // 自定义时间输入

  const { isReady, query } = router;
  const allowReturn = isReady && (query.from === 'plans' || query.allowReturn === '1');

  useEffect(() => {
    if (!isReady) return;
    const verifySession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const session = await response.json();
        if (!session?.user) {
          router.replace('/auth/signin');
          return;
        }
        if (session.user.hasCompletedOnboarding && !allowReturn) {
          router.replace('/dashboard');
          return;
        }
        setIsAuthorized(true);
      } catch {
        router.replace('/auth/signin');
      }
    };
    verifySession();
  }, [isReady, allowReturn, router]);

  useEffect(() => {
    if (!isAuthorized || !router.query.interestId) return;
    try {
      const interest = {
        id: router.query.interestId as string,
        name: router.query.interestName as string,
        icon: router.query.interestIcon as string,
      };
      setFocusedInterest(interest);
      
      if (router.query.allInterests) {
        try {
          const allInterests = JSON.parse(router.query.allInterests as string);
          setAllSelectedInterests(allInterests);
        } catch (e) {
          console.warn('解析所有兴趣失败:', e);
        }
      }
      
      // 检查是否为编辑模式
      if (router.query.editPlanId) {
        setIsEditMode(true);
        setEditPlanId(router.query.editPlanId as string);
        try {
          const existingPlans = JSON.parse(localStorage.getItem('userPlans') || '[]');
          const planToEdit = existingPlans.find((p: any) => p.id === router.query.editPlanId);
          if (planToEdit) {
            setFormData({
              focusBranch: planToEdit.focusBranch || '',
              firstMilestone: planToEdit.milestones?.[0]?.title || '',
              projectName: planToEdit.name || `我为${interest.name}而投资`,
              dailyMinTime: planToEdit.dailyGoalMinutes || 30,
              targetDate: null
            });
            // 编辑模式下，即使有值也不高亮泡泡（因为是手动输入或编辑）
            setSelectedBranchFromBubble(false);
          }
        } catch (e) {
          console.error('加载计划数据失败:', e);
        }
      } else {
        // 新建模式：初始化项目名称
        setFormData(prev => ({
          ...prev,
          projectName: `我为${interest.name}而投资`
        }));
      }
    } catch {
      router.push('/onboarding');
    }
  }, [isAuthorized, router.query]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 如果是 focusBranch 字段，且是手动输入（不是从泡泡选择），清除泡泡高亮状态
    if (field === 'focusBranch') {
      setSelectedBranchFromBubble(false);
    }
  };

  // 处理从泡泡选择分支
  const handleBranchSelectFromBubble = (suggestion: string) => {
    if (suggestion) {
      setFormData(prev => ({ ...prev, focusBranch: suggestion }));
      setSelectedBranchFromBubble(true);
    }
  };

  const handleNext = () => {
    // 验证当前步骤
    if (currentStep === FormStep.Branch && !formData.focusBranch.trim()) return;
    if (currentStep === FormStep.DetailBranch && !formData.focusDetail.trim()) return;
    if (currentStep === FormStep.Milestone && !formData.firstMilestone.trim()) return;
    if (currentStep === FormStep.Name && !formData.projectName.trim()) return;
    if (currentStep === FormStep.Time && !formData.dailyMinTime) return;
    
    // 移动到下一步
    const steps = [FormStep.Branch, FormStep.DetailBranch, FormStep.Milestone, FormStep.Name, FormStep.Time, FormStep.Date];
    const currentIndex = steps.indexOf(currentStep);
    
    // 如果下一步是 Name，自动生成计划名称
    if (steps[currentIndex + 1] === FormStep.Name) {
      setFormData(prev => ({
        ...prev,
        projectName: `${prev.focusBranch} 专注计划：${prev.focusDetail}`
      }));
    }

    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (isEditMode && editPlanId) {
      router.push('/plans');
      return;
    }
    
    const steps = [FormStep.Branch, FormStep.DetailBranch, FormStep.Milestone, FormStep.Name, FormStep.Time, FormStep.Date];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    } else {
      // 返回到 focus-selection
      let interestsToPass = allSelectedInterests;
      if (interestsToPass.length === 0 && router.query.allInterests) {
        try {
          interestsToPass = JSON.parse(router.query.allInterests as string);
        } catch (e) {
          console.warn('重新解析 allInterests 失败:', e);
        }
      }
      if (interestsToPass.length === 0 && focusedInterest) {
        interestsToPass = [focusedInterest];
      }
      
      if (interestsToPass.length > 0) {
        const queryParams: any = {
          interests: JSON.stringify(interestsToPass),
          focusedInterestId: focusedInterest?.id || ''
        };
        if (allowReturn) {
          queryParams.from = query.from as string || 'plans';
          queryParams.allowReturn = '1';
        }
        router.push({
          pathname: '/onboarding/focus-selection',
          query: queryParams
        });
      } else {
        router.push('/onboarding');
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.projectName || (!isEditMode && !formData.firstMilestone)) {
      return;
    }

    try {
      const newPlan = {
        id: Date.now().toString(),
        name: formData.projectName,
        focusBranch: formData.focusBranch || focusedInterest?.name || '',
        // 注意：这里没有保存 focusDetail 到数据库，因为它被合并到了 projectName 中
        // 或者我们可以考虑拼接到 focusBranch 中，例如： `${formData.focusBranch} - ${formData.focusDetail}`
        icon: focusedInterest?.icon || '📝',
        dailyGoalMinutes: formData.dailyMinTime,
        milestones: isEditMode ? [] : [{
          id: `milestone-${Date.now()}`,
          title: formData.firstMilestone,
          isCompleted: false,
          order: 1
        }],
        isActive: true,
        isPrimary: false,
        isCompleted: false
      };

      const existingPlans = JSON.parse(localStorage.getItem('userPlans') || '[]');
      
      if (isEditMode && editPlanId) {
        const planIndex = existingPlans.findIndex((p: any) => p.id === editPlanId);
        if (planIndex !== -1) {
          const existingPlan = existingPlans[planIndex];
          existingPlans[planIndex] = {
            ...existingPlan,
            name: formData.projectName,
            focusBranch: formData.focusBranch || focusedInterest?.name || '',
            dailyGoalMinutes: formData.dailyMinTime,
            icon: focusedInterest?.icon || existingPlan.icon,
            milestones: existingPlan.milestones || [],
            isBlank: false
          };
        }
      } else {
        const activePlans = existingPlans.filter((p: any) => p.isActive && !p.isCompleted);
        if (activePlans.length === 0) {
          newPlan.isPrimary = true;
          existingPlans.forEach((p: any) => { p.isPrimary = false; });
        }
        existingPlans.push(newPlan);
        
        if (!allowReturn && allSelectedInterests.length > 1) {
          const otherInterests = allSelectedInterests.filter(i => i.id !== focusedInterest?.id);
          otherInterests.forEach((interest, index) => {
            const existingInterestPlan = existingPlans.find(
              (p: any) => p.focusBranch === interest.name && p.icon === interest.icon
            );
            if (!existingInterestPlan) {
              existingPlans.push({
                id: `blank_${Date.now()}_${index}`,
                name: `我为${interest.name}而投资`,
                focusBranch: interest.name,
                icon: interest.icon,
                dailyGoalMinutes: 30,
                milestones: [],
                isActive: true,
                isPrimary: false,
                isCompleted: false,
                isBlank: true
              });
            }
          });
        }
      }

      localStorage.setItem('userPlans', JSON.stringify(existingPlans));

      if (!allowReturn) {
        try {
          await fetch('/api/user/complete-onboarding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: newPlan })
          });
        } catch (error) {
          console.warn('API调用失败:', error);
        }
      }

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('forceOnboarding');
      }

      setTimeout(() => {
        router.push(allowReturn ? '/plans' : '/dashboard');
      }, 500);
    } catch (error) {
      console.error('提交失败:', error);
      alert('提交失败，请重试');
    }
  };

  if (!isAuthorized || !focusedInterest) return null;

  // 渲染分支选择页面
  const renderBranch = () => {
    // 非规则但仍保持平衡的布局：左3右2，带有横纵双向位移
    const bubbleLayouts = [
      { index: 0, side: 'left', offsetX: -35, offsetY: -110 }, // 左上外扩
      { index: 1, side: 'left', offsetX: 12, offsetY: -10 },   // 左中微靠近
      { index: 2, side: 'left', offsetX: -28, offsetY: 130 },  // 左下外扩
      { index: 3, side: 'right', offsetX: 28, offsetY: -80 },  // 右上外扩
      { index: 4, side: 'right', offsetX: -8, offsetY: 145 },  // 右下靠近
    ];

    const leftBubbles = bubbleLayouts.filter(b => b.side === 'left');
    const rightBubbles = bubbleLayouts.filter(b => b.side === 'right');

    return (
      <div className="relative w-full max-w-6xl mx-auto flex flex-col items-center">
        <h2 className="text-xl md:text-2xl font-light tracking-wider text-white/90 text-center mb-16 px-4">
          想好专注于<span className="text-teal-300">{focusedInterest.name}</span>的哪个方向了吗！
        </h2>

        {/* 桌面端布局：左右泡泡 + 中间文本框 */}
        <div className="hidden md:flex relative w-full items-center justify-center gap-8 lg:gap-12 min-h-[450px]">
          {/* 左侧3个泡泡 - 非规则排列 */}
          <div className="relative flex-shrink-0 w-32 lg:w-36 h-[440px] flex items-center justify-center">
            {leftBubbles.map((layout) => {
              const suggestion = BRANCH_SUGGESTIONS[layout.index] || '';
              // 只有当从泡泡选择且值匹配时才高亮
              const isSelected = selectedBranchFromBubble && formData.focusBranch === suggestion;
              
              return (
                <button
                  key={layout.index}
                  onClick={() => suggestion && handleBranchSelectFromBubble(suggestion)}
                  disabled={!suggestion}
                  style={{
                    position: 'absolute',
                    transform: `translate(${layout.offsetX}px, ${layout.offsetY}px)`,
                    animationDelay: `${layout.index * 0.15}s`,
                    boxShadow: isSelected
                      ? '0 0 50px rgba(255,255,255,0.4), inset 0 0 30px rgba(255,255,255,0.2), 0 8px 32px rgba(0,0,0,0.15)'
                      : '0 4px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.25), 0 0 0 1px rgba(255,255,255,0.08)'
                  }}
                  className={`
                    bubble-branch group flex flex-col items-center justify-center
                    w-28 h-28 lg:w-32 lg:h-32 rounded-full border transition-all duration-500 ease-out backdrop-blur-sm
                    ${isSelected
                      ? 'bg-white text-slate-900 border-transparent scale-110 z-10'
                      : suggestion
                        ? 'bg-white/10 text-white/80 border-white/20 hover:bg-white/15 hover:border-white/40 hover:text-white cursor-pointer'
                        : 'bg-white/5 text-white/30 border-white/10 cursor-not-allowed opacity-30'}
                  `}
                >
                  {/* 气泡高光效果 */}
                  {!isSelected && suggestion && (
                    <>
                      <div className="absolute inset-0 rounded-full opacity-30" style={{
                        background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 60%)'
                      }} />
                      <div className="absolute inset-0 rounded-full opacity-15" style={{
                        background: 'radial-gradient(circle at 70% 70%, rgba(255,255,255,0.2), transparent 50%)'
                      }} />
                    </>
                  )}
                  {suggestion ? (
                    <span className="text-sm lg:text-base font-medium text-center px-2 relative z-10">
                      {suggestion}
                    </span>
                  ) : (
                    <span className="text-2xl relative z-10">●</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 中间输入框 */}
          <div className="flex-shrink-0 w-full max-w-md relative z-10">
            <input
              type="text"
              value={formData.focusBranch}
              onChange={(e) => handleInputChange('focusBranch', e.target.value)}
              placeholder="输入你的专注方向..."
              className="w-full bg-transparent border-b-2 border-teal-400/50 text-center text-xl lg:text-2xl text-white py-4 focus:outline-none focus:border-teal-300 placeholder-white/30 transition-all"
              autoFocus
            />
          </div>

          {/* 右侧2个泡泡 - 非规则排列 */}
          <div className="relative flex-shrink-0 w-32 lg:w-36 h-[440px] flex items-center justify-center">
            {rightBubbles.map((layout) => {
              const suggestion = BRANCH_SUGGESTIONS[layout.index] || '';
              // 只有当从泡泡选择且值匹配时才高亮
              const isSelected = selectedBranchFromBubble && formData.focusBranch === suggestion;
              
              return (
                <button
                  key={layout.index}
                  onClick={() => suggestion && handleBranchSelectFromBubble(suggestion)}
                  disabled={!suggestion}
                  style={{
                    position: 'absolute',
                    transform: `translate(${layout.offsetX}px, ${layout.offsetY}px)`,
                    animationDelay: `${layout.index * 0.15}s`,
                    boxShadow: isSelected
                      ? '0 0 50px rgba(255,255,255,0.4), inset 0 0 30px rgba(255,255,255,0.2), 0 8px 32px rgba(0,0,0,0.15)'
                      : '0 4px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.25), 0 0 0 1px rgba(255,255,255,0.08)'
                  }}
                  className={`
                    bubble-branch group flex flex-col items-center justify-center
                    w-28 h-28 lg:w-32 lg:h-32 rounded-full border transition-all duration-500 ease-out backdrop-blur-sm
                    ${isSelected
                      ? 'bg-white text-slate-900 border-transparent scale-110 z-10'
                      : suggestion
                        ? 'bg-white/10 text-white/80 border-white/20 hover:bg-white/15 hover:border-white/40 hover:text-white cursor-pointer'
                        : 'bg-white/5 text-white/30 border-white/10 cursor-not-allowed opacity-30'}
                  `}
                >
                  {/* 气泡高光效果 */}
                  {!isSelected && suggestion && (
                    <>
                      <div className="absolute inset-0 rounded-full opacity-30" style={{
                        background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 60%)'
                      }} />
                      <div className="absolute inset-0 rounded-full opacity-15" style={{
                        background: 'radial-gradient(circle at 70% 70%, rgba(255,255,255,0.2), transparent 50%)'
                      }} />
                    </>
                  )}
                  {suggestion ? (
                    <span className="text-sm lg:text-base font-medium text-center px-2 relative z-10">
                      {suggestion}
                    </span>
                  ) : (
                    <span className="text-2xl relative z-10">●</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 移动端布局 */}
        <div className="md:hidden w-full flex flex-col items-center">
          {/* 移动端选项列表 */}
          {BRANCH_SUGGESTIONS.length > 0 && (
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {BRANCH_SUGGESTIONS.map((suggestion, i) => {
                // 只有当从泡泡选择且值匹配时才高亮
                const isSelected = selectedBranchFromBubble && formData.focusBranch === suggestion;
                return (
                  <button
                    key={i}
                    onClick={() => handleBranchSelectFromBubble(suggestion)}
                    style={{
                      animationDelay: `${i * 0.1}s`,
                      boxShadow: isSelected
                        ? '0 0 50px rgba(255,255,255,0.4), inset 0 0 30px rgba(255,255,255,0.2), 0 8px 32px rgba(0,0,0,0.15)'
                        : '0 4px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.25), 0 0 0 1px rgba(255,255,255,0.08)'
                    }}
                    className={`
                      bubble-branch relative group flex items-center justify-center
                      w-24 h-24 rounded-full border transition-all duration-500 ease-out backdrop-blur-sm
                      ${isSelected
                        ? 'bg-white text-slate-900 border-transparent scale-110'
                        : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/15 hover:border-white/40'}
                    `}
                  >
                    {!isSelected && (
                      <>
                        <div className="absolute inset-0 rounded-full opacity-30" style={{
                          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 60%)'
                        }} />
                        <div className="absolute inset-0 rounded-full opacity-15" style={{
                          background: 'radial-gradient(circle at 70% 70%, rgba(255,255,255,0.2), transparent 50%)'
                        }} />
                      </>
                    )}
                    <span className="text-sm font-medium relative z-10 px-3">{suggestion}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 输入框 */}
          <div className="w-full max-w-md">
            <input
              type="text"
              value={formData.focusBranch}
              onChange={(e) => handleInputChange('focusBranch', e.target.value)}
              placeholder="输入你的专注方向..."
              className="w-full bg-transparent border-b-2 border-teal-400/50 text-center text-xl text-white py-4 focus:outline-none focus:border-teal-300 placeholder-white/30 transition-all"
              autoFocus
            />
          </div>
        </div>
      </div>
    );
  };

  // 渲染详细分支选择页面 (页面B)
  const renderDetailBranch = () => {
    // 复用气泡布局
    const bubbleLayouts = [
      { index: 0, side: 'left', offsetX: -35, offsetY: -110 },
      { index: 1, side: 'left', offsetX: 12, offsetY: -10 },
      { index: 2, side: 'left', offsetX: -28, offsetY: 130 },
      { index: 3, side: 'right', offsetX: 28, offsetY: -80 },
      { index: 4, side: 'right', offsetX: -8, offsetY: 145 },
    ];

    const leftBubbles = bubbleLayouts.filter(b => b.side === 'left');
    const rightBubbles = bubbleLayouts.filter(b => b.side === 'right');

    return (
      <div className="relative w-full max-w-6xl mx-auto flex flex-col items-center">
        <h2 className="text-xl md:text-2xl font-light tracking-wider text-white/90 text-center mb-16 px-4">
          具体精进于哪个分支呢？
        </h2>

        {/* 桌面端布局 */}
        <div className="hidden md:flex relative w-full items-center justify-center gap-8 lg:gap-12 min-h-[450px]">
          {/* 左侧3个泡泡 - 装饰用，不可点击 */}
          <div className="relative flex-shrink-0 w-32 lg:w-36 h-[440px] flex items-center justify-center">
            {leftBubbles.map((layout) => (
              <div
                key={layout.index}
                style={{
                  position: 'absolute',
                  transform: `translate(${layout.offsetX}px, ${layout.offsetY}px)`,
                  animationDelay: `${layout.index * 0.15}s`,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.25), 0 0 0 1px rgba(255,255,255,0.08)'
                }}
                className="bubble-branch group flex flex-col items-center justify-center
                  w-28 h-28 lg:w-32 lg:h-32 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm"
              >
                <span className="text-2xl relative z-10 text-white/30">●</span>
              </div>
            ))}
          </div>

          {/* 中间输入框 */}
          <div className="flex-shrink-0 w-full max-w-md relative z-10">
            <input
              type="text"
              value={formData.focusDetail}
              onChange={(e) => handleInputChange('focusDetail', e.target.value)}
              placeholder="输入你的具体分支..."
              className="w-full bg-transparent border-b-2 border-teal-400/50 text-center text-xl lg:text-2xl text-white py-4 focus:outline-none focus:border-teal-300 placeholder-white/30 transition-all"
              autoFocus
            />
          </div>

          {/* 右侧2个泡泡 - 装饰用 */}
          <div className="relative flex-shrink-0 w-32 lg:w-36 h-[440px] flex items-center justify-center">
            {rightBubbles.map((layout) => (
              <div
                key={layout.index}
                style={{
                  position: 'absolute',
                  transform: `translate(${layout.offsetX}px, ${layout.offsetY}px)`,
                  animationDelay: `${layout.index * 0.15}s`,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.25), 0 0 0 1px rgba(255,255,255,0.08)'
                }}
                className="bubble-branch group flex flex-col items-center justify-center
                  w-28 h-28 lg:w-32 lg:h-32 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm"
              >
                <span className="text-2xl relative z-10 text-white/30">●</span>
              </div>
            ))}
          </div>
        </div>

        {/* 移动端布局 */}
        <div className="md:hidden w-full flex flex-col items-center">
          {/* 移动端气泡装饰 - 可选 */}
          <div className="flex flex-wrap justify-center gap-4 mb-8 opacity-50 pointer-events-none">
            {[1, 2, 3].map((_, i) => (
               <div
                  key={i}
                  style={{ animationDelay: `${i * 0.1}s` }}
                  className="bubble-branch w-16 h-16 rounded-full border border-white/10 bg-white/5 flex items-center justify-center"
               >
                  <span className="text-white/20">●</span>
               </div>
            ))}
          </div>

          {/* 输入框 */}
          <div className="w-full max-w-md">
            <input
              type="text"
              value={formData.focusDetail}
              onChange={(e) => handleInputChange('focusDetail', e.target.value)}
              placeholder="输入你的具体分支..."
              className="w-full bg-transparent border-b-2 border-teal-400/50 text-center text-xl text-white py-4 focus:outline-none focus:border-teal-300 placeholder-white/30 transition-all"
              autoFocus
            />
          </div>
        </div>
      </div>
    );
  };

  // 渲染里程碑页面
  const renderMilestone = () => {
    return (
      <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center">
        <h2 className="text-xl md:text-2xl font-light tracking-wider text-white/90 text-center mb-16 px-4">
          让我们来设置第一个里程碑吧！
        </h2>

        <div className="relative w-full max-w-4xl flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 min-h-[300px]">
          {/* 左侧提示泡泡 */}
          <div className="flex md:flex-col gap-6 md:gap-8 order-2 md:order-1">
            {MILESTONE_HINTS.slice(0, 2).map((hint, i) => (
              <div
                key={i}
                className="bubble-milestone relative group flex items-center justify-center
                  w-24 h-24 md:w-28 md:h-28 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm pointer-events-none"
                style={{
                  animationDelay: hint.delay,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.25), 0 0 0 1px rgba(255,255,255,0.08)'
                }}
              >
                {/* 气泡高光效果 */}
                <div className="absolute inset-0 rounded-full opacity-30" style={{
                  background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 60%)'
                }} />
                <div className="absolute inset-0 rounded-full opacity-15" style={{
                  background: 'radial-gradient(circle at 70% 70%, rgba(255,255,255,0.2), transparent 50%)'
                }} />
                <span className="text-xs md:text-sm font-medium text-white/70 text-center px-2 relative z-10">
                  {hint.label}
                </span>
              </div>
            ))}
          </div>

          {/* 中间输入框 */}
          <div className="order-1 md:order-2 w-full max-w-md relative z-10">
            <input
              type="text"
              value={formData.firstMilestone}
              onChange={(e) => handleInputChange('firstMilestone', e.target.value)}
              placeholder="例如：完成第一幅画"
              className="w-full bg-transparent border-b-2 border-teal-400/50 text-center text-xl md:text-2xl text-white py-4 focus:outline-none focus:border-teal-300 placeholder-white/30 transition-all"
              autoFocus
            />
          </div>

          {/* 右侧提示泡泡 */}
          <div className="flex md:flex-col gap-6 md:gap-8 order-3">
            <div
              className="bubble-milestone relative group flex items-center justify-center
                w-24 h-24 md:w-28 md:h-28 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm pointer-events-none"
              style={{
                animationDelay: MILESTONE_HINTS[2].delay,
                boxShadow: '0 4px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.25), 0 0 0 1px rgba(255,255,255,0.08)'
              }}
            >
              {/* 气泡高光效果 */}
              <div className="absolute inset-0 rounded-full opacity-30" style={{
                background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 60%)'
              }} />
              <div className="absolute inset-0 rounded-full opacity-15" style={{
                background: 'radial-gradient(circle at 70% 70%, rgba(255,255,255,0.2), transparent 50%)'
              }} />
              <span className="text-xs md:text-sm font-medium text-white/70 text-center px-2 relative z-10">
                {MILESTONE_HINTS[2].label}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 渲染计划名称页面
  const renderName = () => {
    return (
      <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center">
        <h2 className="text-xl md:text-2xl font-light tracking-wider text-white/90 text-center mb-16 px-4">
          为你的计划设定名称吧！
        </h2>

        <div className="w-full max-w-md">
          <input
            type="text"
            value={formData.projectName}
            onChange={(e) => handleInputChange('projectName', e.target.value)}
            placeholder={`我为${formData.focusBranch || focusedInterest.name}而投资`}
            className="w-full bg-transparent border-b-2 border-teal-400/50 text-center text-xl md:text-2xl text-white py-4 focus:outline-none focus:border-teal-300 placeholder-white/30 transition-all"
            autoFocus
          />
        </div>
      </div>
    );
  };

  // 渲染时间选择页面
  const renderTime = () => {
    // 检查是否选择了预设时间
    const isPresetSelected = TIME_OPTIONS.includes(formData.dailyMinTime);
    
    return (
      <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center">
        <h2 className="text-xl md:text-2xl font-light tracking-wider text-white/90 text-center mb-16 px-4">
          你每天愿意投入多少时间？
        </h2>

        <div className="flex flex-col items-center gap-8 w-full">
          {/* 预设时间选项泡泡 */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-8">
            {TIME_OPTIONS.map((time, idx) => {
              const isSelected = formData.dailyMinTime === time && isPresetSelected;
              return (
                <button
                  key={time}
                  onClick={() => {
                    handleInputChange('dailyMinTime', time);
                    setCustomTimeInput(''); // 清除自定义输入
                  }}
                  style={{
                    animationDelay: `${idx * 0.1}s`,
                    boxShadow: isSelected
                      ? '0 0 50px rgba(255,255,255,0.4), inset 0 0 30px rgba(255,255,255,0.2), 0 8px 32px rgba(0,0,0,0.15)'
                      : '0 4px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.25), 0 0 0 1px rgba(255,255,255,0.08)'
                  }}
                  className={`
                    bubble-time relative group flex flex-col items-center justify-center
                    w-24 h-24 md:w-32 md:h-32 rounded-full border transition-all duration-500 ease-out backdrop-blur-sm
                    ${isSelected
                      ? 'bg-white text-slate-900 border-transparent scale-110 z-10'
                      : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/15 hover:border-white/40 hover:text-white'}
                  `}
                >
                  {!isSelected && (
                    <>
                      <div className="absolute inset-0 rounded-full opacity-30" style={{
                        background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 60%)'
                      }} />
                      <div className="absolute inset-0 rounded-full opacity-15" style={{
                        background: 'radial-gradient(circle at 70% 70%, rgba(255,255,255,0.2), transparent 50%)'
                      }} />
                    </>
                  )}
                  <span className="text-2xl md:text-3xl font-semibold relative z-10">{time}</span>
                  <span className="text-xs md:text-sm relative z-10 mt-1">分钟</span>
                </button>
              );
            })}
          </div>

          {/* 自定义输入框 */}
          <div className="w-full max-w-md mt-4">
            <div className="relative">
              <input
                type="number"
                min="1"
                max="480"
                value={isPresetSelected ? '' : (customTimeInput || formData.dailyMinTime.toString())}
                onChange={(e) => {
                  const value = e.target.value;
                  setCustomTimeInput(value);
                  const numValue = parseInt(value, 10);
                  if (!isNaN(numValue) && numValue > 0 && numValue <= 480) {
                    handleInputChange('dailyMinTime', numValue);
                  } else if (value === '') {
                    handleInputChange('dailyMinTime', 0);
                  }
                }}
                placeholder="或输入自定义分钟数"
                className="w-full bg-transparent border-b-2 border-teal-400/50 text-center text-xl md:text-2xl text-white py-4 focus:outline-none focus:border-teal-300 placeholder-white/30 transition-all"
              />
              <span className="absolute right-0 top-1/2 -translate-y-1/2 text-white/50 text-sm">分钟</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 渲染日期选择页面
  const renderDate = () => {
    return (
      <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center">
        <h2 className="text-xl md:text-2xl font-light tracking-wider text-white/90 text-center mb-16 px-4">
          预期计划完成日期
        </h2>

        <div className="w-full max-w-md">
          <input
            type="date"
            value={formData.targetDate || ''}
            onChange={(e) => handleInputChange('targetDate', e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full bg-transparent border-b-2 border-teal-400/50 text-center text-lg md:text-xl text-white py-4 focus:outline-none focus:border-teal-300 transition-all"
          />
        </div>
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case FormStep.Branch:
        return renderBranch();
      case FormStep.DetailBranch:
        return renderDetailBranch();
      case FormStep.Milestone:
        return renderMilestone();
      case FormStep.Name:
        return renderName();
      case FormStep.Time:
        return renderTime();
      case FormStep.Date:
        return renderDate();
      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case FormStep.Branch:
        return formData.focusBranch.trim().length > 0;
      case FormStep.DetailBranch:
        return formData.focusDetail.trim().length > 0;
      case FormStep.Milestone:
        return formData.firstMilestone.trim().length > 0;
      case FormStep.Name:
        return formData.projectName.trim().length > 0;
      case FormStep.Time:
        return formData.dailyMinTime > 0;
      case FormStep.Date:
        return true; // 日期可选
      default:
        return false;
    }
  };

  return (
    <>
      <Head>
        <title>设定目标 - 数字静默</title>
      </Head>
      <div className="relative min-h-screen w-full overflow-hidden text-white flex flex-col items-center justify-center">
        {/* 动态生机蓝绿渐变背景 */}
        <div className="absolute inset-0 bg-gradient-animated pointer-events-none" />
        
        {/* 动态光晕效果 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-teal-400/25 rounded-full blur-[120px] animate-pulse-slow" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-400/25 rounded-full blur-[120px] animate-pulse-slow-delayed" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-400/20 rounded-full blur-[140px] animate-pulse-slow-very-delayed" />
        </div>

        {/* 内容区 */}
        <div className="relative z-10 w-full flex flex-col items-center min-h-screen justify-center px-4 py-12">
          {renderCurrentStep()}

          {/* 导航按钮 */}
          <div className="mt-16 flex items-center gap-12">
            <button
              onClick={handleBack}
              className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/40 transition-all"
            >
              ←
            </button>

            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={`
                px-8 py-3 rounded-full text-sm tracking-[0.2em] uppercase transition-all duration-500
                ${canProceed()
                  ? 'bg-white text-slate-900 hover:scale-105 shadow-lg shadow-white/10'
                  : 'bg-white/5 text-white/20 cursor-not-allowed'}
              `}
            >
              {currentStep === FormStep.Date ? '完成' : 'Next'}
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
        .bubble-branch {
          animation: bubbleFloat 6s ease-in-out infinite;
        }
        .bubble-milestone {
          animation: bubbleFloat 6s ease-in-out infinite;
        }
        .bubble-time {
          animation: bubbleFloat 6s ease-in-out infinite;
        }
        @keyframes bubbleFloat {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
    </>
  );
}
