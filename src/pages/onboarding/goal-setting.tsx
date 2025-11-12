import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

interface Interest {
  id: string;
  name: string;
  icon: string;
}

export default function GoalSetting() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [focusedInterest, setFocusedInterest] = useState<Interest | null>(null);
  const [formData, setFormData] = useState({
    projectName: '',
    focusBranch: '',
    firstMilestone: '',
    dailyMinTime: 30,
    targetDate: '' as string | null,
  });
  const [allSelectedInterests, setAllSelectedInterests] = useState<Interest[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editPlanId, setEditPlanId] = useState<string | null>(null);

  const { isReady, query } = router;

  // 检查是否允许老用户返回（从plans页面来的）
  const allowReturn = isReady && (
    query.from === 'plans' || 
    query.allowReturn === '1'
  );

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

        // 如果已完成onboarding且不是从plans页面来的，才跳转
        if (session.user.hasCompletedOnboarding && !allowReturn) {
          router.replace('/dashboard');
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error('验证登录状态失败:', error);
        router.replace('/auth/signin');
      } finally {
        setIsCheckingSession(false);
      }
    };

    verifySession();
  }, [router, isReady, allowReturn]);

  // 从路由参数获取聚焦的兴趣
  // 在 /src/pages/onboarding/goal-setting.tsx 中更新参数接收
  useEffect(() => {
    if (!isAuthorized) {
      return;
    }

    if (router.query.interestId) {
      try {
        // 从查询参数重建兴趣对象
        const interest = {
          id: router.query.interestId as string,
          name: router.query.interestName as string,
          icon: router.query.interestIcon as string,
        };
        
        setFocusedInterest(interest);
        // 自动生成项目名称
        setFormData(prev => ({
          ...prev,
          projectName: `我为${interest.name}而投资`,
          focusBranch: '' // 保持空白，让占位符显示
        }));
        
        // 解析所有选择的兴趣
        if (router.query.allInterests) {
          try {
            const allInterests = JSON.parse(router.query.allInterests as string);
            setAllSelectedInterests(allInterests);
            console.log('所有选择的兴趣:', allInterests);
          } catch (e) {
            console.warn('解析所有兴趣失败:', e);
          }
        }
        
        // 检查是否为编辑模式
        if (router.query.editPlanId) {
          setIsEditMode(true);
          setEditPlanId(router.query.editPlanId as string);
          
          // 加载现有计划数据
          try {
            const existingPlans = JSON.parse(localStorage.getItem('userPlans') || '[]');
            const planToEdit = existingPlans.find((p: any) => p.id === router.query.editPlanId);
            
            if (planToEdit) {
              setFormData({
                projectName: planToEdit.name || `我为${interest.name}而投资`,
                focusBranch: planToEdit.focusBranch || '', // 如果有值则使用，否则保持空白
                firstMilestone: planToEdit.milestones && planToEdit.milestones.length > 0 
                  ? planToEdit.milestones[0].title 
                  : '',
                dailyMinTime: planToEdit.dailyGoalMinutes || 30,
                targetDate: null
              });
              console.log('加载编辑计划数据:', planToEdit);
            }
          } catch (e) {
            console.error('加载计划数据失败:', e);
          }
        }
      } catch (error) {
        console.error('解析兴趣数据失败:', error);
        // 如果解析失败，退回第一步
        router.push('/onboarding');
      }
    } else if (router.query.focusedInterest) {
      // 保持对旧格式的兼容
      try {
        const interest = JSON.parse(router.query.focusedInterest as string);
        setFocusedInterest(interest);
        setFormData(prev => ({
          ...prev,
          projectName: `我为${interest.name}而投资`,
          focusBranch: '' // 保持空白，让占位符显示
        }));
      } catch (error) {
        console.error('解析兴趣数据失败:', error);
        router.push('/onboarding');
      }
    }
  }, [isAuthorized, router.query]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    // 编辑模式下不需要第一个里程碑
    if (!formData.projectName) {
      alert('请填写项目名称');
      return;
    }
    if (!isEditMode && !formData.firstMilestone) {
      alert('请填写项目名称和第一个里程碑');
      return;
    }
  
    try {
      console.log("开始提交表单...");
      
      // 创建计划数据
      const newPlan = {
        id: Date.now().toString(),
        name: formData.projectName,
        focusBranch: formData.focusBranch || focusedInterest?.name || '', // 添加focusBranch字段
        icon: focusedInterest?.icon || '📝',
        dailyGoalMinutes: formData.dailyMinTime,
        milestones: [
          {
            id: `milestone-${Date.now()}`,
            title: formData.firstMilestone,
            isCompleted: false,
            order: 1
          }
        ],
        isActive: true,
        isPrimary: false,
        isCompleted: false
      };
      
      // 从localStorage获取现有计划
      const existingPlans = JSON.parse(localStorage.getItem('userPlans') || '[]');
      
      if (isEditMode && editPlanId) {
        // 编辑模式：更新现有计划
        const planIndex = existingPlans.findIndex((p: any) => p.id === editPlanId);
        if (planIndex !== -1) {
          const existingPlan = existingPlans[planIndex];
            // 更新计划数据，保留原有的一些属性
            // 编辑模式下不修改小目标，小目标通过专门的管理通道管理
            existingPlans[planIndex] = {
              ...existingPlan,
              name: formData.projectName,
              focusBranch: formData.focusBranch || focusedInterest?.name || '',
              dailyGoalMinutes: formData.dailyMinTime,
              icon: focusedInterest?.icon || existingPlan.icon,
              // 编辑模式下保留原有的小目标，不修改
              milestones: existingPlan.milestones || [],
              isBlank: false // 编辑后不再是空白计划
            };
          console.log('更新计划:', existingPlans[planIndex]);
        }
      } else {
        // 创建模式：添加新计划
        const activePlans = existingPlans.filter((p: any) => p.isActive && !p.isCompleted);
        
        // 如果是第一个计划，设为主要
        if (activePlans.length === 0) {
          newPlan.isPrimary = true;
          // 清除其他计划的主要标志
          existingPlans.forEach((p: any) => {
            p.isPrimary = false;
          });
        }
        
        // 添加新计划
        existingPlans.push(newPlan);
      }
      
      // 为新用户首次创建时，为其他选择的兴趣创建空白计划卡片
      if (!allowReturn && allSelectedInterests.length > 1) {
        const otherInterests = allSelectedInterests.filter(
          interest => interest.id !== focusedInterest?.id
        );
        
        otherInterests.forEach((interest, index) => {
          // 检查是否已存在该兴趣的计划（避免重复创建）
          const existingInterestPlan = existingPlans.find(
            (p: any) => p.focusBranch === interest.name && p.icon === interest.icon
          );
          
          if (!existingInterestPlan) {
            const blankPlan = {
              id: `blank_${Date.now()}_${index}`,
              name: `我为${interest.name}而投资`, // 默认项目名称
              focusBranch: interest.name, // 使用兴趣名称作为focusBranch
              icon: interest.icon,
              dailyGoalMinutes: 30, // 默认值
              milestones: [], // 空白计划没有小目标
              isActive: true,
              isPrimary: false,
              isCompleted: false,
              isBlank: true // 标记为空白计划
            };
            existingPlans.push(blankPlan);
            console.log('创建空白计划卡片:', blankPlan);
          }
        });
      }
      
      // 保存到localStorage
      localStorage.setItem('userPlans', JSON.stringify(existingPlans));
      
      console.log('计划已创建:', newPlan);
      
      // 只有新用户首次创建计划时才标记onboarding完成
      // 老用户从plans页面创建新计划时不需要再次标记
      if (!allowReturn) {
        try {
          // 尝试调用API标记onboarding完成
          const response = await fetch('/api/user/complete-onboarding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: newPlan })
          });
          
          if (response.ok) {
            console.log('✅ Onboarding已标记为完成');
          } else {
            console.warn('⚠️ 标记onboarding完成失败，但计划已创建');
          }
        } catch (error) {
          console.warn('⚠️ 调用API失败，但计划已创建:', error);
          // 即使API调用失败，也继续流程，因为计划已经保存到localStorage
        }
      } else {
        console.log('ℹ️ 老用户创建新计划，跳过onboarding标记');
      }
      
      // 清除强制onboarding标记（如果存在）
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('forceOnboarding');
      }
      
      // 根据来源决定跳转目标
      // 如果是从plans页面来的老用户，跳转回plans页面
      // 否则跳转到dashboard（新用户首次创建）
      setTimeout(() => {
        if (allowReturn) {
          router.push('/plans');
        } else {
          router.push('/dashboard');
        }
      }, 500);
      
    } catch (error) {
      console.error('提交失败详情:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      alert(`提交失败: ${errorMessage}`);
    }
  };

  const handleBack = () => {
    // 如果是从plans页面来的，返回到focus-selection页面
    // 否则使用浏览器返回
    if (allowReturn && focusedInterest) {
      router.push({
        pathname: '/onboarding/focus-selection',
        query: {
          interests: JSON.stringify([focusedInterest]),
          from: query.from as string || 'plans',
          allowReturn: '1'
        }
      });
    } else {
      router.back();
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
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

  if (!focusedInterest) {
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
        <title>设定目标 - 数字静默</title>
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 sm:p-8">
        <div className="bg-white rounded-3xl shadow-xl p-4 sm:p-8 w-full max-w-2xl mx-2 sm:mx-auto">
          {/* 头部 */}
          <div className="text-center mb-8">
            <div className="flex justify-center items-center mb-4">
              <span className="text-4xl mr-3">{focusedInterest.icon}</span>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {isEditMode ? '编辑计划' : '绘制你的蓝图'}
              </h1>
            </div>
            <p className="text-gray-600 text-sm sm:text-base">
              {isEditMode 
                ? '修改你的计划设置和目标'
                : (
                    <>
                      为你的 <span className="font-semibold text-blue-600">{focusedInterest.name}</span> 之旅设定清晰的目标
                    </>
                  )}
            </p>
          </div>

          {/* 表单 */}
          <div className="space-y-6 mb-8">
            {/* 项目名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                项目名称
              </label>
              <input
                type="text"
                value={formData.projectName}
                onChange={(e) => handleInputChange('projectName', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="为你的项目起个名字"
              />
            </div>

            {/* 专注分支 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                专注分支
                <span className="text-gray-500 text-xs ml-2">（你希望专注的具体方向）</span>
              </label>
              <input
                type="text"
                value={formData.focusBranch}
                onChange={(e) => handleInputChange('focusBranch', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="例如：水彩风景画、React前端开发、吉他弹唱"
              />
              <button className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors">
                🔍 寻找灵感？
              </button>
            </div>

            {/* 第一个里程碑 - 只在新建模式下显示 */}
            {!isEditMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  第一个里程碑
                  <span className="text-gray-500 text-xs">（可达成的小目标）</span>
                  {/* 提示图标 */}
                  <div className="group relative">
                    <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center cursor-help">
                      <span className="text-blue-600 text-xs font-bold">!</span>
                    </div>
                    {/* Tooltip */}
                    <div className="absolute left-0 bottom-full mb-2 w-48 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      作为计划中第一个最小可实现的小目标
                      <div className="absolute left-2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                    </div>
                  </div>
                </label>
                <input
                  type="text"
                  value={formData.firstMilestone}
                  onChange={(e) => handleInputChange('firstMilestone', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="例如：完成第一幅画、搭建个人博客首页、学会弹奏《小星星》"
                  required
                />
                <button className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors">
                  🔍 寻找灵感？
                </button>
              </div>
            )}

            {/* 每日最小剂量 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                每日专注时间
                <span className="text-gray-500 text-xs ml-2">（建议从小的开始）</span>
              </label>
              <div className="flex space-x-4">
                {[15, 30, 45, 60].map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => handleInputChange('dailyMinTime', time)}
                    className={`flex-1 py-3 rounded-lg border-2 transition ${
                      formData.dailyMinTime === time
                        ? 'bg-blue-100 border-blue-500 text-blue-700 font-medium'
                        : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {time}分钟
                  </button>
                ))}
              </div>
            </div>

            {/* 期望达成日 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                期望达成日 <span className="text-gray-500 text-xs">（可选）</span>
              </label>
              <input
                type="date"
                value={formData.targetDate || ''}
                onChange={(e) => handleInputChange('targetDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
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
              返回
            </button>
            
            <button
              onClick={handleSubmit}
              disabled={!formData.projectName || (!isEditMode && !formData.firstMilestone)}
              className={`
                px-6 py-3 sm:px-8 sm:py-3 text-sm sm:text-base rounded-full font-medium transition-all flex items-center
                ${formData.projectName && (isEditMode || formData.firstMilestone)
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg transform hover:scale-105'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {isEditMode ? '保存修改' : '开启我的旅程'}
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>

          {/* 进度指示器 */}
          <div className="mt-8 flex justify-center">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
              <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

