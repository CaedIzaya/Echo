import React, { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import BottomNavigation from './dashboard/BottomNavigation';
import { HeartTree } from '@/components/heart-tree/HeartTree';

export default function HeartTreePage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-teal-100 flex flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm tracking-wide text-teal-700">心树加载中...</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#87CEEB] to-[#E0F7FA] flex flex-col items-center justify-center pb-28 px-4 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.4),rgba(255,255,255,0))]" />

      {/* 飘动的云朵背景效果 - 可选 */}
      <div className="absolute top-20 left-10 w-32 h-12 bg-white/40 rounded-full blur-xl animate-pulse" style={{ animationDuration: '8s' }}></div>
      <div className="absolute top-40 right-20 w-40 h-16 bg-white/30 rounded-full blur-xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }}></div>

      <div className="relative w-full max-w-[480px] flex flex-col items-center justify-center h-[60vh]">
        <div className="w-full h-full flex items-center justify-center transform scale-110">
          <HeartTree />
        </div>
      </div>
      <BottomNavigation active="heart-tree" />
    </div>
  );
}

