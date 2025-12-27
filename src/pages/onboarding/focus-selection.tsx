import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

interface Interest {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export default function FocusSelection() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>([]);
  const [focusedInterest, setFocusedInterest] = useState<Interest | null>(null);

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
    if (!isAuthorized || !router.query.interests) return;
    try {
      const interests = JSON.parse(router.query.interests as string);
      const validated = interests.map((i: any) => ({
        id: i.id || 'unknown',
        name: i.name || '未知',
        icon: i.icon || '●',
        color: i.color || ''
      }));
      setSelectedInterests(validated);
      
      // 如果从 goal-setting 返回，恢复之前选择的聚焦兴趣
      if (router.query.focusedInterestId && validated.length > 0) {
        const previousFocused = validated.find((i: Interest) => i.id === router.query.focusedInterestId);
        if (previousFocused) {
          setFocusedInterest(previousFocused);
        }
      }
    } catch {
      router.push('/onboarding');
    }
  }, [isAuthorized, router.query]);

  // 默认不选中任何一个，强迫用户做出选择？或者默认第一个？
  // 极简模式下，让用户点击一个才算选中
  const handleSelect = (interest: Interest) => {
    setFocusedInterest(interest);
  };

  const handleNext = () => {
    if (!focusedInterest) return;
    
    // 导航到下一步
    const queryParams: any = {
        interestId: focusedInterest.id,
        interestName: focusedInterest.name,
        interestIcon: focusedInterest.icon,
        allInterests: JSON.stringify(selectedInterests)
    };
    if (allowReturn) {
        queryParams.from = query.from || 'plans';
        queryParams.allowReturn = '1';
    }
    router.push({
        pathname: '/onboarding/goal-setting',
        query: queryParams
    });
  };

  const handleBack = () => {
    // 明确返回到第一步 InterestGrid 页面
    const queryParams: any = {};
    if (allowReturn) {
      queryParams.from = query.from || 'plans';
      queryParams.allowReturn = '1';
    }
    router.push({
      pathname: '/onboarding',
      query: queryParams
    });
  };

  if (!isAuthorized) return null;

  return (
    <>
      <Head>
        <title>锁定焦点</title>
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

        {/* 极简内容区 */}
        <div className="relative z-10 flex flex-col items-center gap-16 animate-fade-in">
          
          {/* 只有一句话 */}
          <h2 className="text-xl md:text-2xl font-light tracking-wider text-white/90 text-center px-4">
            哪一个是你此刻最想开始的？
          </h2>

          {/* 三个大泡泡 */}
          <div className="flex flex-wrap justify-center gap-8 px-4">
            {selectedInterests.map((interest, idx) => {
              const isFocused = focusedInterest?.id === interest.id;
              return (
                <button
                  key={interest.id}
                  onClick={() => handleSelect(interest)}
                  style={{
                    animationDelay: `${idx * 0.2}s`,
                    boxShadow: isFocused
                      ? '0 0 50px rgba(255,255,255,0.4), inset 0 0 30px rgba(255,255,255,0.2), 0 8px 32px rgba(0,0,0,0.15)'
                      : '0 4px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.25), 0 0 0 1px rgba(255,255,255,0.08)'
                  }}
                  className={`
                    bubble-appear relative group flex flex-col items-center justify-center
                    w-32 h-32 sm:w-40 sm:h-40 rounded-full border transition-all duration-500 ease-out backdrop-blur-sm
                    ${isFocused 
                      ? 'bg-white text-slate-900 border-transparent scale-110 z-10' 
                      : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/15 hover:border-white/40 hover:text-white'}
                  `}
                >
                  {/* 气泡高光效果 */}
                  {!isFocused && (
                    <>
                      <div className="absolute inset-0 rounded-full opacity-30" style={{
                        background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 60%)'
                      }} />
                      <div className="absolute inset-0 rounded-full opacity-15" style={{
                        background: 'radial-gradient(circle at 70% 70%, rgba(255,255,255,0.2), transparent 50%)'
                      }} />
                    </>
                  )}
                  <span className="text-5xl sm:text-6xl mb-2 transition-transform duration-500 group-hover:scale-110 relative z-10">{interest.icon}</span>
                  <span className={`text-sm font-medium tracking-widest transition-opacity duration-300 ${isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    {interest.name}
                  </span>
                  
                  {isFocused && (
                    <div className="absolute -bottom-8 text-teal-400 text-xs tracking-[0.2em] uppercase animate-pulse">
                      Selected
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* 极简导航 */}
          <div className="mt-8 flex items-center gap-12">
            <button 
              onClick={handleBack}
              className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/40 transition-all"
            >
              ←
            </button>

            <button 
              onClick={handleNext}
              disabled={!focusedInterest}
              className={`
                px-8 py-3 rounded-full text-sm tracking-[0.2em] uppercase transition-all duration-500
                ${focusedInterest 
                  ? 'bg-white text-slate-900 hover:scale-105 shadow-lg shadow-white/10' 
                  : 'bg-white/5 text-white/20 cursor-not-allowed'}
              `}
            >
              Next
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
        @keyframes appear {
          from { opacity: 0; transform: translateY(20px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .bubble-appear {
          animation: appear 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          opacity: 0; 
        }
      `}</style>
    </>
  );
}