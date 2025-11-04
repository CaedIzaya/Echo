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
  const [focusedInterest, setFocusedInterest] = useState<Interest | null>(null);
  const [formData, setFormData] = useState({
    projectName: '',
    focusBranch: '',
    firstMilestone: '',
    dailyMinTime: 30,
    targetDate: '' as string | null,
  });

  // 从路由参数获取聚焦的兴趣
  // 在 /src/pages/onboarding/goal-setting.tsx 中更新参数接收
useEffect(() => {
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
        projectName: `我为${interest.name}而投资`
      }));
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
        projectName: `我为${interest.name}而投资`
      }));
    } catch (error) {
      console.error('解析兴趣数据失败:', error);
      router.push('/onboarding');
    }
  }
}, [router.query]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    if (!formData.projectName || !formData.firstMilestone) {
      alert('请填写项目名称和第一个里程碑');
      return;
    }
  
    try {
      console.log("开始提交表单...");
      
      // 创建计划数据
      const newPlan = {
        id: Date.now().toString(),
        name: formData.projectName,
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
      
      // 保存到localStorage
      localStorage.setItem('userPlans', JSON.stringify(existingPlans));
      
      console.log('计划已创建:', newPlan);
      
      // TODO: 这里后续需要调用API保存到数据库
      // const response = await fetch('/api/user/complete-onboarding', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ plan: newPlan })
      // });
      
      // 跳转到dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 500);
      
    } catch (error) {
      console.error('提交失败详情:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      alert(`提交失败: ${errorMessage}`);
    }
  };

  const handleBack = () => {
    router.back();
  };

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
                绘制你的蓝图
              </h1>
            </div>
            <p className="text-gray-600 text-sm sm:text-base">
              为你的 <span className="font-semibold text-blue-600">{focusedInterest.name}</span> 之旅设定清晰的目标
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

            {/* 第一个里程碑 */}
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
              disabled={!formData.projectName || !formData.firstMilestone}
              className={`
                px-6 py-3 sm:px-8 sm:py-3 text-sm sm:text-base rounded-full font-medium transition-all flex items-center
                ${formData.projectName && formData.firstMilestone
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg transform hover:scale-105'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              开启我的旅程
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

