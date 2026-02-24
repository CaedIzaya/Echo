import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  interestConfig,
  getDomainByKey,
  InterestDomain,
  InterestCategory,
  InterestItem,
} from '~/lib/interestConfig';
import LoadingOverlay from '~/components/LoadingOverlay';
import { userStorageJSON } from '~/lib/userStorage';

interface Interest {
  id: string;
  name: string;
  icon: string;
}

// 顶层兴趣名称 -> interestConfig 域 key 的映射
const INTEREST_NAME_TO_DOMAIN_KEY: Record<string, string> = {
  游戏: 'game',
  阅读: 'reading',
  绘画: 'drawing',
  音乐: 'music',
  编程: 'coding',
  语言: 'language',
  运动: 'sports',
  美食: 'food',
  职业: 'career',
  学术: 'academic',
  观影: 'movie',
  写作: 'writing',
  学习: 'academic',
  工作: 'career',
  烹饪: 'food',
};

enum FormStep {
  Branch = 'BRANCH',
  DetailBranch = 'DETAIL_BRANCH',
  Milestone = 'MILESTONE',
  Name = 'NAME',
  Time = 'TIME',
  Date = 'DATE',
}

// 里程碑提示（中文）
const MILESTONE_HINTS = [
  { label: '小步骤', delay: '0s' },
  { label: '可执行', delay: '1s' },
  { label: '积极正面', delay: '2s' },
];

// 时间选项
const TIME_OPTIONS = [15, 30, 45, 60];

// 兜底兴趣方向与分支（可直接作为计划使用）
const FALLBACK_INTEREST_POOLS = [
  {
    key: 'fitness',
    label: '健身训练',
    details: ['力量训练', '跑步耐力', '减脂计划', '拉伸体态', '居家自重'],
  },
  {
    key: 'english',
    label: '英语提升',
    details: ['日常口语', '听力精听', '词汇积累', '阅读理解', '写作表达'],
  },
  {
    key: 'photo',
    label: '摄影修图',
    details: ['手机摄影', '人像构图', '风景拍摄', 'Lightroom 调色', '短片剪辑'],
  },
  {
    key: 'video',
    label: '短视频创作',
    details: ['选题策划', '脚本撰写', '拍摄运镜', '剪辑节奏', '封面标题优化'],
  },
  {
    key: 'cooking',
    label: '烹饪轻食',
    details: ['家常快手菜', '低脂轻食', '烘焙入门', '汤品炖煮', '一周备餐'],
  },
] as const;

const normalizeText = (text: string) =>
  text
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');

const pickRandomItems = <T,>(items: readonly T[], count: number): T[] => {
  const cloned = [...items];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned.slice(0, Math.min(count, cloned.length));
};

const matchFallbackPoolFromInput = (input: string) => {
  const normalizedInput = normalizeText(input);
  if (!normalizedInput) return undefined;

  return FALLBACK_INTEREST_POOLS.find((pool) => {
    const candidates = [pool.label, pool.key, ...pool.details].map(normalizeText);
    return candidates.some(
      (candidate) =>
        candidate === normalizedInput ||
        candidate.includes(normalizedInput) ||
        normalizedInput.includes(candidate)
    );
  });
};

const matchCategoryFromInput = (
  domain: InterestDomain | undefined,
  input: string
): InterestCategory | undefined => {
  if (!domain || !input.trim()) return undefined;
  const normalizedInput = normalizeText(input);
  if (!normalizedInput) return undefined;

  return domain.categories.find((category) => {
    const candidates = [
      category.label,
      category.key,
      category.id,
      ...category.items.map((item) => item.name),
      ...category.items.flatMap((item) => item.tags ?? []),
    ].map(normalizeText);

    return candidates.some(
      (candidate) =>
        candidate === normalizedInput ||
        candidate.includes(normalizedInput) ||
        normalizedInput.includes(candidate)
    );
  });
};

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
  const [selectedBranchCategoryKey, setSelectedBranchCategoryKey] = useState<string | null>(null);
  const [selectedDetailItemId, setSelectedDetailItemId] = useState<string | null>(null);
  const [selectedDetailFromBubble, setSelectedDetailFromBubble] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isReady, query } = router;
  const allowReturn = isReady && (query.from === 'plans' || query.allowReturn === '1');

  // 根据当前聚焦兴趣，解析对应的兴趣域（如「游戏」「音乐」等）
  const interestDomain: InterestDomain | undefined = useMemo(() => {
    if (!focusedInterest) return undefined;
    const domainKey = INTEREST_NAME_TO_DOMAIN_KEY[focusedInterest.name];
    if (!domainKey) return undefined;
    return getDomainByKey(interestConfig, domainKey);
  }, [focusedInterest]);

  // 当前选择的一级方向（Category）
  const selectedCategory: InterestCategory | undefined = useMemo(() => {
    if (!interestDomain || !selectedBranchCategoryKey) return undefined;
    return interestDomain.categories.find((c) => c.key === selectedBranchCategoryKey);
  }, [interestDomain, selectedBranchCategoryKey]);

  // 当前选择的具体分支（Item）
  const selectedDetailItem: InterestItem | undefined = useMemo(() => {
    if (!selectedCategory || !selectedDetailItemId) return undefined;
    return selectedCategory.items.find((i) => i.id === selectedDetailItemId);
  }, [selectedCategory, selectedDetailItemId]);

  // 当用户手动输入一级方向时，尝试匹配预设 category（例如：输入 FPS）
  const matchedCategoryFromInput: InterestCategory | undefined = useMemo(() => {
    if (selectedCategory) return selectedCategory;
    return matchCategoryFromInput(interestDomain, formData.focusBranch);
  }, [selectedCategory, interestDomain, formData.focusBranch]);

  const selectedFallbackPool = useMemo(() => {
    if (!selectedBranchCategoryKey?.startsWith('fallback_')) return undefined;
    const poolKey = selectedBranchCategoryKey.replace('fallback_', '');
    return FALLBACK_INTEREST_POOLS.find((pool) => pool.key === poolKey);
  }, [selectedBranchCategoryKey]);

  const matchedFallbackPoolFromInput = useMemo(
    () => matchFallbackPoolFromInput(formData.focusBranch),
    [formData.focusBranch]
  );

  // 分支页展示的 5 个方向泡泡
  const branchSuggestions: InterestCategory[] = useMemo(() => {
    const categories = interestDomain?.categories ?? [];
    if (categories.length > 0) {
      return categories.slice(0, 5);
    }

    return FALLBACK_INTEREST_POOLS.map((pool, index) => ({
      id: `fallback_direction_${pool.key}`,
      key: `fallback_${pool.key}`,
      label: pool.label,
      order: index + 1,
      items: [],
    }));
  }, [interestDomain]);

  // 详细分支页展示的 5 个分支泡泡
  const detailBubbleSuggestions = useMemo(() => {
    const matchedItems = matchedCategoryFromInput?.items ?? [];
    if (matchedItems.length > 0) {
      return {
        suggestions: pickRandomItems(matchedItems, 5).map((item) => ({
          label: item.name,
          itemId: item.id,
        })),
      };
    }

    const fallbackPool =
      selectedFallbackPool ||
      matchedFallbackPoolFromInput ||
      pickRandomItems(FALLBACK_INTEREST_POOLS as unknown as Array<(typeof FALLBACK_INTEREST_POOLS)[number]>, 1)[0];

    return {
      suggestions: pickRandomItems(fallbackPool?.details ?? [], 5).map((label) => ({
        label,
        itemId: null as string | null,
      })),
    };
  }, [matchedCategoryFromInput, selectedFallbackPool, matchedFallbackPoolFromInput]);

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
            setFormData((prev) => ({
              ...prev,
              focusBranch: planToEdit.focusBranch || '',
              focusDetail: planToEdit.focusDetail || '',
              firstMilestone: planToEdit.milestones?.[0]?.title || '',
              projectName: planToEdit.name || `我为${interest.name}而投资`,
              dailyMinTime: planToEdit.dailyGoalMinutes || 30,
              targetDate: null,
            }));
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
    // 如果是 focusBranch 字段，且是手动输入（不是从泡泡选择），清除泡泡高亮状态和已选方向
    if (field === 'focusBranch') {
      setSelectedBranchFromBubble(false);
      setSelectedBranchCategoryKey(null);
    }
    // 如果是 focusDetail 字段，且是手动输入（不是从泡泡选择），清除分支高亮和已选分支
    if (field === 'focusDetail') {
      setSelectedDetailFromBubble(false);
      setSelectedDetailItemId(null);
    }
  };

  // 处理从泡泡选择一级方向（Category）
  const handleBranchSelectFromBubble = (category: InterestCategory) => {
    if (!category) return;
    setFormData(prev => ({ ...prev, focusBranch: category.label }));
    setSelectedBranchFromBubble(true);
    setSelectedBranchCategoryKey(category.key);
    // 切换一级方向时，重置详细分支与里程碑占位
    setSelectedDetailFromBubble(false);
    setSelectedDetailItemId(null);
  };

  const handleNext = () => {
    // 验证当前步骤
    if (currentStep === FormStep.Branch && !formData.focusBranch.trim()) return;
    // DetailBranch 标注为“可跳过”，允许空值直接下一步
    if (currentStep === FormStep.Name && !formData.projectName.trim()) return;
    if (currentStep === FormStep.Time && !formData.dailyMinTime) return;
    
    // 移动到下一步
    const steps = [FormStep.Branch, FormStep.DetailBranch, FormStep.Milestone, FormStep.Name, FormStep.Time, FormStep.Date];
    const currentIndex = steps.indexOf(currentStep);
    
    // 如果下一步是 Name，自动生成计划名称
    if (steps[currentIndex + 1] === FormStep.Name) {
      setFormData(prev => ({
        ...prev,
        projectName: prev.focusDetail.trim()
          ? `${prev.focusBranch} 专注计划：${prev.focusDetail}`
          : `${prev.focusBranch} 专注计划`
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
    if (!formData.projectName.trim()) {
      return;
    }

    // 防止重复提交
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const newPlan = {
        id: Date.now().toString(),
        name: formData.projectName,
        focusBranch: formData.focusBranch || focusedInterest?.name || '',
        focusDetail: formData.focusDetail.trim(),
        icon: focusedInterest?.icon || '📝',
        dailyGoalMinutes: formData.dailyMinTime,
        milestones: !isEditMode && formData.firstMilestone.trim()
          ? [{
              id: `milestone-${Date.now()}`,
              title: formData.firstMilestone.trim(),
              isCompleted: false,
              order: 1
            }]
          : [],
        isActive: true,
        isPrimary: false,
        isCompleted: false
      };

      const existingPlans = JSON.parse(localStorage.getItem('userPlans') || '[]');
      let isFirstPlanEver = false;
      
      if (isEditMode) {
        if (!editPlanId) {
          alert('编辑失败：缺少计划ID');
          setIsSubmitting(false);
          return;
        }

        const planIndex = existingPlans.findIndex((p: any) => p.id === editPlanId);
        const existingPlan = planIndex !== -1 ? existingPlans[planIndex] : null;

        // 编辑模式：本地先就地更新，避免新增条目
        if (existingPlan && planIndex !== -1) {
          existingPlans[planIndex] = {
            ...existingPlan,
            name: formData.projectName,
            focusBranch: formData.focusBranch || focusedInterest?.name || '',
            focusDetail: formData.focusDetail.trim(),
            dailyGoalMinutes: formData.dailyMinTime,
            icon: focusedInterest?.icon || existingPlan.icon,
            milestones: existingPlan.milestones || [],
            isBlank: false
          };
        }
      } else {
        const activePlans = existingPlans.filter((p: any) => p.isActive && !p.isCompleted);
        isFirstPlanEver = activePlans.length === 0;
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
                focusDetail: '',
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

      // 保存到数据库
      if (isEditMode && editPlanId) {
        console.log('✏️ 更新计划到数据库', { id: editPlanId, name: formData.projectName });

        const response = await fetch(`/api/projects/${editPlanId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.projectName,
            description: formData.focusBranch || focusedInterest?.name || '',
            focusDetail: formData.focusDetail.trim(),
            icon: focusedInterest?.icon || '📝',
            dailyGoalMinutes: formData.dailyMinTime,
            targetDate: formData.targetDate || null,
            isActive: true,
          }),
        });

        if (!response.ok) {
          throw new Error(`更新计划失败: ${response.status}`);
        }

        const data = await response.json();
        const planIndex = existingPlans.findIndex((p: any) => p.id === editPlanId);
        const normalizedUpdatedPlan = {
          ...(planIndex !== -1 ? existingPlans[planIndex] : {}),
          id: data.project.id,
          name: data.project.name,
          focusBranch: data.project.description || formData.focusBranch,
          focusDetail: data.project.focusDetail || formData.focusDetail.trim(),
          icon: data.project.icon || focusedInterest?.icon || '📝',
          dailyGoalMinutes: data.project.dailyGoalMinutes || formData.dailyMinTime,
          milestones: data.project.milestones || [],
          isBlank: false
        };
        if (planIndex !== -1) {
          existingPlans[planIndex] = normalizedUpdatedPlan;
        } else {
          existingPlans.push(normalizedUpdatedPlan);
        }
      } else {
        console.log('💾 保存计划到数据库', {
          name: newPlan.name,
          isPrimary: newPlan.isPrimary,
          milestones: newPlan.milestones?.length || 0,
        });

        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: newPlan.id, // 保留本地生成的ID
            name: newPlan.name,
            description: newPlan.focusBranch,
            focusDetail: newPlan.focusDetail,
            icon: newPlan.icon,
            dailyGoalMinutes: newPlan.dailyGoalMinutes,
            targetDate: formData.targetDate || null,
            isActive: true,
            isPrimary: newPlan.isPrimary || false,
            isCompleted: false,
            milestones: (newPlan.milestones || []).map((m: any) => ({
              id: m.id,
              title: m.title,
              isCompleted: false,
              order: m.order || 1,
            })),
          }),
        });

        if (!response.ok) {
          throw new Error(`创建计划失败: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ 计划已保存到数据库', data.project.id);

        // 更新本地数据为数据库返回的数据（包含数据库生成的ID）
        newPlan.id = data.project.id;
        newPlan.focusDetail = data.project.focusDetail || newPlan.focusDetail;
        if (newPlan.milestones) {
          newPlan.milestones = data.project.milestones;
        }
      }
      
      // 保存到用户隔离的localStorage（缓存）
      userStorageJSON.set('userPlans', existingPlans);

      // ✅ 关键修复：只有在新用户首次创建计划时，才标记onboarding完成
      if (!allowReturn && !isEditMode) {
        try {
          console.log('📝 标记 onboarding 完成...');
          const onboardingResponse = await fetch('/api/user/complete-onboarding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          
          if (onboardingResponse.ok) {
            console.log('✅ Onboarding 已标记为完成');
          } else {
            console.error('❌ 标记 onboarding 完成失败');
          }
        } catch (error) {
          console.error('❌ 完成引导API调用失败:', error);
          // 不阻塞用户流程，继续跳转
        }
      }

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('forceOnboarding');

        // 🌟 首次创建计划当天：自动选中第一个小目标 + 触发启动节奏流程
        if (isFirstPlanEver && !isEditMode) {
          const today = new Date().toISOString().split('T')[0];
          const existingFirstPlanDate = localStorage.getItem('firstPlanCreatedDate');
          if (!existingFirstPlanDate) {
            localStorage.setItem('firstPlanCreatedDate', today);
          }
          // 记录为“首次创建计划当天”，用于 Dashboard 当天自动弹出节奏设定
          localStorage.setItem('isNewUserFirstEntry', today);

          const milestones = newPlan.milestones || [];
          const firstMilestone = [...milestones].sort((a: any, b: any) => {
            const orderA = typeof a.order === 'number' ? a.order : 0;
            const orderB = typeof b.order === 'number' ? b.order : 0;
            return orderA - orderB;
          })[0];

          if (firstMilestone?.id) {
            localStorage.setItem('todaySelectedGoalId', firstMilestone.id);
            localStorage.setItem('todaySelectedGoalDate', today);
          }
        }
      }

      setTimeout(() => {
        router.push(allowReturn ? '/plans' : '/dashboard');
      }, 500);
    } catch (error) {
      console.error('提交失败:', error);
      alert('提交失败，请重试');
      setIsSubmitting(false);
    }
  };

  if (!isAuthorized || !focusedInterest) return null;
  
  // 显示loading遮罩
  if (isSubmitting) {
    return <LoadingOverlay message="正在创建计划..." />;
  }

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
              const category = branchSuggestions[layout.index];
              const suggestion = category?.label || '';
              // 只有当从泡泡选择且值匹配时才高亮
              const isSelected =
                !!category && selectedBranchFromBubble && selectedBranchCategoryKey === category.key;
              
              return (
                <button
                  key={layout.index}
                  onClick={() => category && handleBranchSelectFromBubble(category)}
                  disabled={!category}
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
                      : category
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
              const category = branchSuggestions[layout.index];
              const suggestion = category?.label || '';
              // 只有当从泡泡选择且值匹配时才高亮
              const isSelected =
                !!category && selectedBranchFromBubble && selectedBranchCategoryKey === category.key;
              
              return (
                <button
                  key={layout.index}
                  onClick={() => category && handleBranchSelectFromBubble(category)}
                  disabled={!category}
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
                      : category
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
          {branchSuggestions.length > 0 && (
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {branchSuggestions.map((category, i) => {
                const suggestion = category.label;
                // 只有当从泡泡选择且值匹配时才高亮
                const isSelected =
                  selectedBranchFromBubble && selectedBranchCategoryKey === category.key;
                return (
                  <button
                    key={i}
                    onClick={() => handleBranchSelectFromBubble(category)}
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
    const displaySuggestions = detailBubbleSuggestions.suggestions;

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
          具体专注于哪个方向（可跳过）
        </h2>

        {/* 桌面端布局 */}
        <div className="hidden md:flex relative w-full items-center justify-center gap-8 lg:gap-12 min-h-[450px]">
          {/* 左侧3个泡泡 - 使用配置的具体分支或通用建议 */}
          <div className="relative flex-shrink-0 w-32 lg:w-36 h-[440px] flex items-center justify-center">
            {leftBubbles.map((layout) => {
              const suggestion = displaySuggestions[layout.index];
              const label = suggestion?.label || '';
              const isSelected =
                selectedDetailFromBubble &&
                (suggestion?.itemId
                  ? selectedDetailItemId === suggestion.itemId
                  : formData.focusDetail === label);

              return (
                <button
                  key={layout.index}
                  onClick={() => {
                    if (!suggestion?.label) return;
                    setFormData(prev => ({ ...prev, focusDetail: suggestion.label }));
                    setSelectedDetailFromBubble(true);
                    setSelectedDetailItemId(suggestion.itemId);
                  }}
                  disabled={!label}
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
                      : label
                        ? 'bg-white/10 text-white/80 border-white/20 hover:bg-white/15 hover:border-white/40 hover:text-white cursor-pointer'
                        : 'bg-white/5 text-white/30 border-white/10 cursor-not-allowed opacity-30'}
                  `}
                >
                  {label ? (
                    <span className="text-sm lg:text-base font-medium text-center px-2 relative z-10">
                      {label}
                    </span>
                  ) : (
                    <span className="text-2xl relative z-10 text-white/30">●</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 中间输入框 */}
          <div className="flex-shrink-0 w-full max-w-md relative z-10">
            <input
              type="text"
              value={formData.focusDetail}
              onChange={(e) => handleInputChange('focusDetail', e.target.value)}
              placeholder="例如：漫画、CS2、四六级听力"
              className="w-full bg-transparent border-b-2 border-teal-400/50 text-center text-xl lg:text-2xl text-white py-4 focus:outline-none focus:border-teal-300 placeholder-white/30 transition-all"
              autoFocus
            />
          </div>

          {/* 右侧2个泡泡 - 使用配置的具体分支或通用建议 */}
          <div className="relative flex-shrink-0 w-32 lg:w-36 h-[440px] flex items-center justify-center">
            {rightBubbles.map((layout) => {
              const suggestion = displaySuggestions[layout.index];
              const label = suggestion?.label || '';
              const isSelected =
                selectedDetailFromBubble &&
                (suggestion?.itemId
                  ? selectedDetailItemId === suggestion.itemId
                  : formData.focusDetail === label);

              return (
                <button
                  key={layout.index}
                  onClick={() => {
                    if (!suggestion?.label) return;
                    setFormData(prev => ({ ...prev, focusDetail: suggestion.label }));
                    setSelectedDetailFromBubble(true);
                    setSelectedDetailItemId(suggestion.itemId);
                  }}
                  disabled={!label}
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
                      : label
                        ? 'bg-white/10 text-white/80 border-white/20 hover:bg-white/15 hover:border-white/40 hover:text-white cursor-pointer'
                        : 'bg-white/5 text-white/30 border-white/10 cursor-not-allowed opacity-30'}
                  `}
                >
                  {label ? (
                    <span className="text-sm lg:text-base font-medium text-center px-2 relative z-10">
                      {label}
                    </span>
                  ) : (
                    <span className="text-2xl relative z-10 text-white/30">●</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 移动端布局 */}
        <div className="md:hidden w-full flex flex-col items-center">
          {/* 移动端：显示泡泡建议（配置的或通用的） */}
          {displaySuggestions.length > 0 && (
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {displaySuggestions.map((suggestion, i) => {
                const suggestionText = suggestion.label;
                const isSelected =
                  selectedDetailFromBubble &&
                  (suggestion.itemId
                    ? selectedDetailItemId === suggestion.itemId
                    : formData.focusDetail === suggestionText);
                return (
                  <button
                    key={`detail-${i}-${suggestionText}`}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, focusDetail: suggestionText }));
                      setSelectedDetailFromBubble(true);
                      setSelectedDetailItemId(suggestion.itemId);
                    }}
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
                    <span className="text-sm font-medium relative z-10 px-3">
                      {suggestionText}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 输入框 */}
          <div className="w-full max-w-md">
            <input
              type="text"
              value={formData.focusDetail}
              onChange={(e) => handleInputChange('focusDetail', e.target.value)}
              placeholder="例如：漫画、CS2、四六级听力"
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
    const milestonePlaceholder =
      selectedDetailItem?.milestone.description || '例如：完成第一幅画';

    return (
      <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center">
        <h2 className="text-xl md:text-2xl font-light tracking-wider text-white/90 text-center mb-16 px-4">
          让我们来设置第一个小目标吧！（可跳过）
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
              placeholder={milestonePlaceholder}
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
        return true; // 该步骤可跳过
      case FormStep.Milestone:
        return true; // 该步骤可跳过
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

        {/* 提交加载遮罩 */}
        {isSubmitting && (
          <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center">
            <svg className="animate-spin h-12 w-12 text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-white text-lg font-light tracking-wider">正在创建计划...</p>
            <p className="text-white/50 text-sm mt-2">请稍候，不要关闭页面</p>
          </div>
        )}

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
              disabled={!canProceed() || isSubmitting}
              className={`
                px-8 py-3 rounded-full text-sm tracking-[0.2em] uppercase transition-all duration-500 relative
                ${canProceed() && !isSubmitting
                  ? 'bg-white text-slate-900 hover:scale-105 shadow-lg shadow-white/10'
                  : 'bg-white/5 text-white/20 cursor-not-allowed'}
              `}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  提交中...
                </span>
              ) : (
                currentStep === FormStep.Date ? '完成' : '下一步'
              )}
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
