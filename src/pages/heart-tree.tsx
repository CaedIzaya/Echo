import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import BottomNavigation from './dashboard/BottomNavigation';
import { HeartTree } from '@/components/heart-tree/HeartTree';
import { HeartTreeSeedling } from '@/components/heart-tree/HeartTreeSeedling';
import HeartTreeControls from '@/components/heart-tree/HeartTreeControls';

export default function HeartTreePage() {
  const { status } = useSession();
  const router = useRouter();
  const [animState, setAnimState] = useState<'idle' | 'watering' | 'fertilizing'>('idle');
  const [treeStage, setTreeStage] = useState<'seedling' | 'growing'>('seedling');

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
        {/* 阶段切换按钮 */}
        <div className="mb-4 flex gap-3 z-20 relative">
          <button
            onClick={() => {
              setTreeStage('seedling');
              setAnimState('idle'); // 切换时重置动画状态
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              treeStage === 'seedling'
                ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
                : 'bg-white/80 text-gray-600 hover:bg-white/90'
            }`}
          >
            🌱 幼苗
          </button>
          <button
            onClick={() => {
              setTreeStage('growing');
              setAnimState('idle'); // 切换时重置动画状态
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              treeStage === 'growing'
                ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
                : 'bg-white/80 text-gray-600 hover:bg-white/90'
            }`}
          >
            🌳 成长期
          </button>
        </div>
        
        <div className="w-full h-full flex flex-col items-center justify-center transform scale-150 relative">
          <div className="relative">
            {/* 根据阶段显示不同的树 */}
            {treeStage === 'seedling' ? (
              <HeartTreeSeedling animState={animState} />
            ) : (
              <HeartTree animState={animState} />
            )}
            {/* 动画效果层 - 通过data属性控制 */}
            <div className="heart-tree-animations" data-state={animState}>
              {/* 浇水效果：水滴 */}
              <div className="water-drop"></div>
              <div className="water-ripple"></div>
              
              {/* 施肥效果：粒子 */}
              <div className="fert-particle fert-p1"></div>
              <div className="fert-particle fert-p2"></div>
              <div className="fert-particle fert-p3"></div>
            </div>
          </div>
          <HeartTreeControls 
            onWatering={() => setAnimState('watering')}
            onFertilizing={() => setAnimState('fertilizing')}
          />
        </div>
      </div>
      
      <style jsx>{`
        /* 动画容器 */
        .heart-tree-animations {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 10;
        }

        /* ==============================
           WATERING ANIMATION
           ============================== */
        
        /* 水滴 - 适配幼苗阶段 */
        .water-drop {
          position: absolute;
          top: 15%;
          left: 50%;
          width: 12px;
          height: 20px;
          background: radial-gradient(circle, #E0F7FA 0%, #29B6F6 100%);
          border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
          opacity: 0;
          transform: translateX(-50%);
        }

        .heart-tree-animations[data-state="watering"] .water-drop {
          animation: dropFall 0.6s cubic-bezier(0.5, 0, 1, 1) forwards;
        }

        @keyframes dropFall {
          0% { 
            opacity: 1; 
            transform: translateX(-50%) translateY(0) scaleY(1); 
          }
          80% { 
            opacity: 1; 
            transform: translateX(-50%) translateY(60px) scaleY(1.2); 
          }
          90% { 
            opacity: 0; 
            transform: translateX(-50%) translateY(70px) scaleY(0.5); 
          }
          100% { 
            opacity: 0; 
            transform: translateX(-50%) translateY(70px); 
          }
        }

        /* 涟漪 - 适配幼苗阶段 */
        .water-ripple {
          position: absolute;
          top: 35%;
          left: 50%;
          width: 20px;
          height: 10px;
          border: 3px solid #29B6F6;
          border-radius: 50%;
          opacity: 0;
          transform: translateX(-50%) translateY(-50%);
        }

        .heart-tree-animations[data-state="watering"] .water-ripple {
          animation: rippleExpand 0.6s ease-out forwards;
          animation-delay: 0.5s;
        }

        @keyframes rippleExpand {
          0% { 
            opacity: 0.8; 
            transform: translateX(-50%) translateY(-50%) scale(0);
            border-width: 4px;
          }
          100% { 
            opacity: 0; 
            transform: translateX(-50%) translateY(-50%) scale(3);
            border-width: 0;
          }
        }

        /* ==============================
           FERTILIZING ANIMATION - 适配幼苗阶段
           ============================== */
        
        .fert-particle {
          position: absolute;
          width: 8px;
          height: 8px;
          background: radial-gradient(circle, #FFF8E1 0%, #FFB300 100%);
          border-radius: 50%;
          opacity: 0;
        }

        .fert-p1 {
          bottom: 25%;
          left: 43%;
        }

        .fert-p2 {
          bottom: 27%;
          left: 57%;
        }

        .fert-p3 {
          bottom: 23%;
          left: 50%;
        }

        .heart-tree-animations[data-state="fertilizing"] .fert-p1 {
          animation: sinkIn 0.6s ease-in forwards;
        }

        .heart-tree-animations[data-state="fertilizing"] .fert-p2 {
          animation: sinkIn 0.6s ease-in forwards 0.1s;
        }

        .heart-tree-animations[data-state="fertilizing"] .fert-p3 {
          animation: sinkIn 0.6s ease-in forwards 0.05s;
        }

        @keyframes sinkIn {
          0% { 
            opacity: 0; 
            transform: translateY(-20px) scale(0.5); 
          }
          30% { 
            opacity: 1; 
            transform: translateY(0px) scale(1); 
          }
          100% { 
            opacity: 0; 
            transform: translateY(15px) scale(0.2); 
          }
        }
      `}</style>
      <BottomNavigation active="heart-tree" />
    </div>
  );
}

