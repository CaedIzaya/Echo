import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

interface InterestOption {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface IdeaPack {
  id: string;
  emoji: string;
  title: string;
  description: string;
  interests: InterestOption[];
}

const IDEA_PACKS: IdeaPack[] = [
  {
    id: 'gentle',
    emoji: '🌱',
    title: '温和型',
    description: '轻轻找回一点节奏',
    interests: [
      { id: 'idea-reading', name: '阅读', icon: '📚', color: 'bg-gradient-to-br from-teal-50 to-sky-50 border-teal-200 text-teal-700' },
      { id: 'idea-movie', name: '观影', icon: '🎬', color: 'bg-gradient-to-br from-cyan-50 to-emerald-100 border-cyan-200 text-teal-700' },
      { id: 'idea-sports', name: '运动', icon: '🏃', color: 'bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200 text-teal-700' },
    ],
  },
  {
    id: 'focus',
    emoji: '🔥',
    title: '集中型',
    description: '想尽快进入状态',
    interests: [
      { id: 'idea-study', name: '学习', icon: '📖', color: 'bg-gradient-to-br from-teal-50 to-sky-100 border-teal-200 text-teal-700' },
      { id: 'idea-work', name: '工作', icon: '💼', color: 'bg-gradient-to-br from-emerald-50 to-cyan-100 border-emerald-200 text-teal-700' },
      { id: 'idea-coding', name: '编程', icon: '💻', color: 'bg-gradient-to-br from-teal-50 to-emerald-100 border-teal-200 text-teal-700' },
    ],
  },
  {
    id: 'relax',
    emoji: '🌊',
    title: '放松型',
    description: '脑子有点乱？来喘口气',
    interests: [
      { id: 'idea-cook', name: '烹饪', icon: '🍳', color: 'bg-gradient-to-br from-sky-50 to-emerald-100 border-sky-200 text-teal-700' },
      { id: 'idea-music', name: '音乐', icon: '🎵', color: 'bg-gradient-to-br from-cyan-50 to-emerald-50 border-cyan-200 text-teal-700' },
      { id: 'idea-sports-2', name: '运动', icon: '🏃', color: 'bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200 text-teal-700' },
    ],
  },
];

export default function IdeaPage() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);

  const { isReady, query, replace } = router;

  const allowReturn = useMemo(() => {
    if (!isReady) return false;
    const fromParam = Array.isArray(query.from) ? query.from[0] : query.from;
    const allowParam = Array.isArray(query.allowReturn) ? query.allowReturn[0] : query.allowReturn;
    return fromParam === 'plans' || allowParam === '1';
  }, [isReady, query.from, query.allowReturn]);

  useEffect(() => {
    if (!isReady) return;
    const verifySession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const session = await response.json();
        if (!session?.user) {
          replace('/auth/signin');
          return;
        }
        if (session.user.hasCompletedOnboarding && !allowReturn) {
          replace('/dashboard');
          return;
        }
        setIsAuthorized(true);
      } catch {
        replace('/auth/signin');
      } finally {
        setIsCheckingSession(false);
      }
    };
    verifySession();
  }, [isReady, allowReturn, replace]);

  const handleBack = () => {
    const queryParams: Record<string, string> = {};
    if (allowReturn) {
      queryParams.from = String(query.from || 'plans');
      queryParams.allowReturn = '1';
    }
    router.push({
      pathname: '/onboarding',
      query: queryParams,
    });
  };

  const handleNext = () => {
    const selectedPack = IDEA_PACKS.find((pack) => pack.id === selectedPackId);
    if (!selectedPack) return;

    const queryParams: Record<string, string> = {
      interests: JSON.stringify(selectedPack.interests),
      ideaPackId: selectedPack.id,
    };
    if (allowReturn) {
      queryParams.from = String(query.from || 'plans');
      queryParams.allowReturn = '1';
    }

    router.push({
      pathname: '/onboarding/focus-selection',
      query: queryParams,
    });
  };

  if (isCheckingSession || !isAuthorized) return null;

  return (
    <>
      <Head>
        <title>需要灵感</title>
      </Head>
      <div className="relative min-h-screen w-full overflow-hidden text-white flex flex-col items-center justify-center">
        <div className="absolute inset-0 bg-gradient-animated pointer-events-none" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-teal-400/25 rounded-full blur-[120px] animate-pulse-slow" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-400/25 rounded-full blur-[120px] animate-pulse-slow-delayed" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-400/20 rounded-full blur-[140px] animate-pulse-slow-very-delayed" />
        </div>

        <div className="relative z-10 w-full max-w-5xl px-4 flex flex-col items-center min-h-[80vh] justify-center">
          <h2 className="text-xl md:text-2xl font-light tracking-wider text-white/90 text-center mb-12">
            你现在更需要哪种节奏？
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
            {IDEA_PACKS.map((pack) => {
              const isSelected = selectedPackId === pack.id;
              return (
                <button
                  key={pack.id}
                  onClick={() => setSelectedPackId(pack.id)}
                  className={`
                    rounded-3xl border px-6 py-8 text-left transition-all duration-300 backdrop-blur-sm
                    ${isSelected
                      ? 'bg-white text-slate-900 border-transparent scale-[1.02] shadow-2xl shadow-white/20'
                      : 'bg-white/10 text-white border-white/20 hover:bg-white/15 hover:border-white/40'}
                  `}
                >
                  <div className="text-3xl mb-3">{pack.emoji}</div>
                  <div className="text-xl font-semibold mb-2">{pack.title}</div>
                  <div className={isSelected ? 'text-slate-600' : 'text-white/80'}>
                    {pack.description}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-12 flex items-center gap-12">
            <button
              onClick={handleBack}
              className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/40 transition-all"
            >
              ←
            </button>
            <button
              onClick={handleNext}
              disabled={!selectedPackId}
              className={`
                px-8 py-3 rounded-full text-sm tracking-[0.2em] uppercase transition-all duration-500
                ${selectedPackId
                  ? 'bg-white text-slate-900 hover:scale-105 shadow-lg shadow-white/10'
                  : 'bg-white/5 text-white/20 cursor-not-allowed'}
              `}
            >
              下一页
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
      `}</style>
    </>
  );
}
