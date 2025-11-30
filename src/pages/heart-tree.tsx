import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import BottomNavigation from './dashboard/BottomNavigation';
import { HeartTree } from '@/components/heart-tree/HeartTree';

export default function HeartTreePage() {
  const { status } = useSession();
  const router = useRouter();
  const [seed, setSeed] = useState(0);
  const [windIntensity, setWindIntensity] = useState(1.1);
  const [showRoots, setShowRoots] = useState(true);
  const [showFruits, setShowFruits] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#050811] text-white flex flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 border-2 border-teal-300 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm tracking-wide text-gray-300">心树加载中...</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const cycleWind = () => {
    setWindIntensity((prev) => {
      if (prev < 0.6) return 1;
      if (prev < 1.2) return 1.6;
      return 0.4;
    });
  };

  const toggleRoots = () => setShowRoots((prev) => !prev);
  const toggleFruits = () => setShowFruits((prev) => !prev);

  const moodLabel =
    windIntensity < 0.6 ? '静默' : windIntensity < 1.2 ? '舒展' : '热烈';

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#040711] to-[#010308] flex flex-col items-center justify-center pb-28 px-4">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(9,36,61,0.35),rgba(2,5,10,0))]" />

      <div className="relative w-full max-w-[480px] flex flex-col gap-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">
              心树心情
            </p>
            <p className="text-2xl font-semibold text-white mt-1">{moodLabel}</p>
            <p className="text-sm text-white/60 mt-2">
              根据你的节奏调整风力与枝叶状态，感受心树的灵动呼吸。
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-4 backdrop-blur flex items-center gap-4">
            <div>
              <p className="text-xs text-white/60">当前种子</p>
              <p className="text-lg text-white font-semibold">{seed}</p>
            </div>
            <button
              onClick={() => setSeed((prev) => prev + 1)}
              className="px-4 py-2 rounded-2xl bg-white/90 text-[#0a1b30] text-sm font-semibold hover:bg-white transition"
            >
              再生长一次
            </button>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-4 flex flex-wrap gap-3 backdrop-blur">
          <button
            onClick={cycleWind}
            className="px-4 py-2 rounded-2xl bg-white/10 text-white text-sm hover:bg-white/20 transition"
          >
            风力：{windIntensity.toFixed(1)}
          </button>
          <button
            onClick={toggleRoots}
            className={`px-4 py-2 rounded-2xl text-sm transition ${
              showRoots ? 'bg-emerald-400/20 text-emerald-100' : 'bg-white/10 text-white'
            }`}
          >
            {showRoots ? '隐藏根系' : '显示根系'}
          </button>
          <button
            onClick={toggleFruits}
            className={`px-4 py-2 rounded-2xl text-sm transition ${
              showFruits ? 'bg-rose-400/20 text-rose-100' : 'bg-white/10 text-white'
            }`}
          >
            {showFruits ? '隐藏果实' : '显示果实'}
          </button>
        </div>

        <div className="w-full py-10">
          <HeartTree
            seed={seed}
            windIntensity={windIntensity}
            showRoots={showRoots}
            showFruits={showFruits}
            showParticles
          />
        </div>
      </div>
      <BottomNavigation active="home" />
    </div>
  );
}

