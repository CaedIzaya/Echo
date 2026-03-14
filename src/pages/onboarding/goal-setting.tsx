import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import LoadingOverlay from '~/components/LoadingOverlay';
import { userStorageJSON } from '~/lib/userStorage';
import { trackEvent } from '~/lib/analytics';

enum FormStep {
  Name = 'NAME',
  Time = 'TIME',
  Milestone = 'MILESTONE',
}

const PLAN_TEMPLATES = [
  { name: '英语学习', icon: '🗣️' },
  { name: '编程练习', icon: '💻' },
  { name: '阅读计划', icon: '📚' },
  { name: '运动健身', icon: '🏃' },
  { name: '绘画创作', icon: '🎨' },
  { name: '音乐练习', icon: '🎵' },
  { name: '考试复习', icon: '🎓' },
  { name: '写作计划', icon: '✍️' },
  { name: '短视频创作', icon: '🎬' },
  { name: '烹饪美食', icon: '🍳' },
];

const TIME_OPTIONS = [15, 30, 45, 60];

const MILESTONE_HINTS = [
  { label: '小步骤', delay: '0s' },
  { label: '可执行', delay: '1s' },
  { label: '积极正面', delay: '2s' },
];

export default function GoalSetting() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentStep, setCurrentStep] = useState<FormStep>(FormStep.Name);
  const [formData, setFormData] = useState({
    projectName: '',
    projectIcon: '📝',
    dailyMinTime: 30,
    firstMilestone: '',
  });
  const [customTimeInput, setCustomTimeInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isReady, query } = router;
  const fromPlans = isReady && query.from === 'plans';
  const onboardingReturnPath = fromPlans ? '/onboarding/goal-setting?from=plans' : '/onboarding/goal-setting';

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
        setIsAuthorized(true);
      } catch {
        router.replace('/auth/signin');
      }
    };
    verifySession();
  }, [isReady, router]);

  const handleTemplateSelect = (template: typeof PLAN_TEMPLATES[number]) => {
    setFormData(prev => ({
      ...prev,
      projectName: template.name,
      projectIcon: template.icon,
    }));
  };

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'projectName' && typeof value === 'string') {
      const matched = PLAN_TEMPLATES.find(t => t.name === value);
      if (!matched) {
        setFormData(prev => ({ ...prev, projectIcon: '📝', projectName: value }));
      }
    }
  };

  const handleNext = () => {
    if (currentStep === FormStep.Name && !formData.projectName.trim()) return;
    if (currentStep === FormStep.Time && !formData.dailyMinTime) return;

    const steps = [FormStep.Name, FormStep.Time, FormStep.Milestone];
    const currentIndex = steps.indexOf(currentStep);

    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]!);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    const steps = [FormStep.Name, FormStep.Time, FormStep.Milestone];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]!);
    } else {
      router.push(fromPlans ? '/plans' : '/dashboard');
    }
  };

  const handleOpenLumi = () => {
    void router.push({
      pathname: '/lumi',
      query: {
        mode: 'plan',
        source: 'goal-setting',
        prompt: '帮我一起创建一个计划。',
        returnTo: onboardingReturnPath,
      },
    });
  };

  const handleSubmit = async () => {
    if (!formData.projectName.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const existingPlans = JSON.parse(localStorage.getItem('userPlans') || '[]');
      const activePlans = existingPlans.filter((p: any) => p.isActive && !p.isCompleted);
      const isFirstPlanEver = activePlans.length === 0;

      const newPlan = {
        id: Date.now().toString(),
        name: formData.projectName,
        icon: formData.projectIcon,
        dailyGoalMinutes: formData.dailyMinTime,
        milestones: formData.firstMilestone.trim()
          ? [{
              id: `milestone-${Date.now()}`,
              title: formData.firstMilestone.trim(),
              isCompleted: false,
              order: 1,
            }]
          : [],
        isActive: true,
        isPrimary: isFirstPlanEver,
        isCompleted: false,
      };

      if (isFirstPlanEver) {
        existingPlans.forEach((p: any) => { p.isPrimary = false; });
      }
      existingPlans.push(newPlan);

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newPlan.id,
          name: newPlan.name,
          description: '',
          icon: newPlan.icon,
          dailyGoalMinutes: newPlan.dailyGoalMinutes,
          targetDate: null,
          isActive: true,
          isPrimary: newPlan.isPrimary,
          isCompleted: false,
          milestones: newPlan.milestones.map((m: any) => ({
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
      newPlan.id = data.project.id;
      if (newPlan.milestones.length > 0) {
        newPlan.milestones = data.project.milestones;
      }

      trackEvent({
        name: 'plan_created',
        feature: 'plans',
        page: '/onboarding/goal-setting',
        action: 'create',
        properties: {
          source: fromPlans ? 'plans_page' : 'onboarding',
          milestoneCount: newPlan.milestones.length,
          dailyGoalMinutes: newPlan.dailyGoalMinutes,
        },
      });

      userStorageJSON.set('userPlans', existingPlans);

      if (!fromPlans) {
        try {
          await fetch('/api/user/complete-onboarding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
        } catch {}
      }

      if (isFirstPlanEver) {
        const today = new Date().toISOString().split('T')[0]!;
        if (!localStorage.getItem('firstPlanCreatedDate')) {
          localStorage.setItem('firstPlanCreatedDate', today);
        }
        localStorage.setItem('isNewUserFirstEntry', today);

        const firstMilestone = newPlan.milestones[0];
        if (firstMilestone?.id) {
          localStorage.setItem('todaySelectedGoalId', firstMilestone.id);
          localStorage.setItem('todaySelectedGoalDate', today);
        }
      }

      setTimeout(() => {
        router.push(fromPlans ? '/plans' : '/dashboard');
      }, 500);
    } catch (error) {
      console.error('提交失败:', error);
      alert('提交失败，请重试');
      setIsSubmitting(false);
    }
  };

  if (!isAuthorized) return null;

  if (isSubmitting) {
    return <LoadingOverlay message="正在创建计划..." />;
  }

  const renderName = () => {
    const selectedTemplate = PLAN_TEMPLATES.find(t => t.name === formData.projectName);

    return (
      <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center">
        <h2 className="text-xl md:text-2xl font-light tracking-wider text-white/90 text-center mb-4 px-4">
          你想专注于什么？
        </h2>
        <p className="text-sm text-white/50 text-center mb-12 px-4">
          选一个模板，或者直接输入你的计划名称
        </p>

        <button
          onClick={handleOpenLumi}
          className="mb-10 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/12 px-5 py-3 text-sm text-white/90 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/18 hover:border-white/35"
          style={{
            boxShadow: '0 8px 28px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.2)',
          }}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-lg">✨</span>
          <span className="text-left">
            和 Lumi 一起创建计划
          </span>
        </button>

        {/* 模板气泡 */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-5 mb-10 max-w-2xl">
          {PLAN_TEMPLATES.map((template, i) => {
            const isSelected = selectedTemplate?.name === template.name;
            return (
              <button
                key={template.name}
                onClick={() => handleTemplateSelect(template)}
                style={{
                  animationDelay: `${i * 0.08}s`,
                  boxShadow: isSelected
                    ? '0 0 50px rgba(255,255,255,0.4), inset 0 0 30px rgba(255,255,255,0.2), 0 8px 32px rgba(0,0,0,0.15)'
                    : '0 4px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.25), 0 0 0 1px rgba(255,255,255,0.08)',
                }}
                className={`
                  bubble-branch relative group flex flex-col items-center justify-center
                  w-20 h-20 md:w-24 md:h-24 rounded-full border transition-all duration-500 ease-out backdrop-blur-sm
                  ${isSelected
                    ? 'bg-white text-slate-900 border-transparent scale-110 z-10'
                    : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/15 hover:border-white/40 hover:text-white cursor-pointer'}
                `}
              >
                {!isSelected && (
                  <>
                    <div className="absolute inset-0 rounded-full opacity-30" style={{
                      background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 60%)',
                    }} />
                    <div className="absolute inset-0 rounded-full opacity-15" style={{
                      background: 'radial-gradient(circle at 70% 70%, rgba(255,255,255,0.2), transparent 50%)',
                    }} />
                  </>
                )}
                <span className="text-xl md:text-2xl relative z-10">{template.icon}</span>
                <span className="text-[10px] md:text-xs font-medium relative z-10 mt-1 px-1 text-center leading-tight">
                  {template.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* 名称输入框 */}
        <div className="w-full max-w-md">
          <input
            type="text"
            value={formData.projectName}
            onChange={(e) => handleInputChange('projectName', e.target.value)}
            placeholder="输入计划名称..."
            className="w-full bg-transparent border-b-2 border-teal-400/50 text-center text-xl md:text-2xl text-white py-4 focus:outline-none focus:border-teal-300 placeholder-white/30 transition-all"
            autoFocus
          />
        </div>
      </div>
    );
  };

  const renderTime = () => {
    const isPresetSelected = TIME_OPTIONS.includes(formData.dailyMinTime);

    return (
      <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center">
        <h2 className="text-xl md:text-2xl font-light tracking-wider text-white/90 text-center mb-16 px-4">
          你每天愿意投入多少时间？
        </h2>

        <div className="flex flex-col items-center gap-8 w-full">
          <div className="flex flex-wrap justify-center gap-6 md:gap-8">
            {TIME_OPTIONS.map((time, idx) => {
              const isSelected = formData.dailyMinTime === time && isPresetSelected;
              return (
                <button
                  key={time}
                  onClick={() => {
                    handleInputChange('dailyMinTime', time);
                    setCustomTimeInput('');
                  }}
                  style={{
                    animationDelay: `${idx * 0.1}s`,
                    boxShadow: isSelected
                      ? '0 0 50px rgba(255,255,255,0.4), inset 0 0 30px rgba(255,255,255,0.2), 0 8px 32px rgba(0,0,0,0.15)'
                      : '0 4px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.25), 0 0 0 1px rgba(255,255,255,0.08)',
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
                        background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 60%)',
                      }} />
                      <div className="absolute inset-0 rounded-full opacity-15" style={{
                        background: 'radial-gradient(circle at 70% 70%, rgba(255,255,255,0.2), transparent 50%)',
                      }} />
                    </>
                  )}
                  <span className="text-2xl md:text-3xl font-semibold relative z-10">{time}</span>
                  <span className="text-xs md:text-sm relative z-10 mt-1">分钟</span>
                </button>
              );
            })}
          </div>

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

  const renderMilestone = () => (
    <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center">
      <h2 className="text-xl md:text-2xl font-light tracking-wider text-white/90 text-center mb-16 px-4">
        设置第一个小目标吧！（可跳过）
      </h2>
      <p className="text-sm text-white/70 text-center -mt-10 mb-10 px-4">
        先放一个能立刻开始的最小动作，计划就会长出腿。
      </p>

      <div className="relative w-full max-w-4xl flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 min-h-[300px]">
        <div className="flex md:flex-col gap-6 md:gap-8 order-2 md:order-1">
          {MILESTONE_HINTS.slice(0, 2).map((hint, i) => (
            <div
              key={i}
              className="bubble-milestone relative group flex items-center justify-center
                w-24 h-24 md:w-28 md:h-28 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm pointer-events-none"
              style={{
                animationDelay: hint.delay,
                boxShadow: '0 4px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.25), 0 0 0 1px rgba(255,255,255,0.08)',
              }}
            >
              <div className="absolute inset-0 rounded-full opacity-30" style={{
                background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 60%)',
              }} />
              <div className="absolute inset-0 rounded-full opacity-15" style={{
                background: 'radial-gradient(circle at 70% 70%, rgba(255,255,255,0.2), transparent 50%)',
              }} />
              <span className="text-xs md:text-sm font-medium text-white/70 text-center px-2 relative z-10">
                {hint.label}
              </span>
            </div>
          ))}
        </div>

        <div className="order-1 md:order-2 w-full max-w-md relative z-10">
          <input
            type="text"
            value={formData.firstMilestone}
            onChange={(e) => handleInputChange('firstMilestone', e.target.value)}
            placeholder="例如：完成第一章阅读"
            className="w-full bg-transparent border-b-2 border-teal-400/50 text-center text-xl md:text-2xl text-white py-4 focus:outline-none focus:border-teal-300 placeholder-white/30 transition-all"
            autoFocus
          />
        </div>

        <div className="flex md:flex-col gap-6 md:gap-8 order-3">
          <div
            className="bubble-milestone relative group flex items-center justify-center
              w-24 h-24 md:w-28 md:h-28 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm pointer-events-none"
            style={{
              animationDelay: MILESTONE_HINTS[2]!.delay,
              boxShadow: '0 4px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.25), 0 0 0 1px rgba(255,255,255,0.08)',
            }}
          >
            <div className="absolute inset-0 rounded-full opacity-30" style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 60%)',
            }} />
            <div className="absolute inset-0 rounded-full opacity-15" style={{
              background: 'radial-gradient(circle at 70% 70%, rgba(255,255,255,0.2), transparent 50%)',
            }} />
            <span className="text-xs md:text-sm font-medium text-white/70 text-center px-2 relative z-10">
              {MILESTONE_HINTS[2]!.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case FormStep.Name:
        return renderName();
      case FormStep.Time:
        return renderTime();
      case FormStep.Milestone:
        return renderMilestone();
      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case FormStep.Name:
        return formData.projectName.trim().length > 0;
      case FormStep.Time:
        return formData.dailyMinTime > 0;
      case FormStep.Milestone:
        return true;
      default:
        return false;
    }
  };

  return (
    <>
      <Head>
        <title>创建计划 - Echo</title>
      </Head>
      <div className="relative min-h-screen w-full overflow-hidden text-white flex flex-col items-center justify-center">
        <div className="absolute inset-0 bg-gradient-animated pointer-events-none" />

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-teal-400/25 rounded-full blur-[120px] animate-pulse-slow" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-400/25 rounded-full blur-[120px] animate-pulse-slow-delayed" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-400/20 rounded-full blur-[140px] animate-pulse-slow-very-delayed" />
        </div>

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

        <div className="relative z-10 w-full flex flex-col items-center min-h-screen justify-center px-4 py-12">
          {renderCurrentStep()}

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
                currentStep === FormStep.Milestone ? '完成' : '下一步'
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
