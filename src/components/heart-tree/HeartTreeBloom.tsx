import React from 'react';

interface HeartTreeBloomProps {
  isBlooming: boolean;
  theme?: 'sakura' | 'lavender';
}

/**
 * 心树繁花组件 (V6 最终自然稳定版)
 * 1. 移除弹出动画，保持静默出现
 * 2. 移除冗余坐标，仅保留顶部 3 朵精致小花
 * 3. 彻底同步树干摇摆 (Sway) 和树冠呼吸 (Breathe)
 */
export const HeartTreeBloom: React.FC<HeartTreeBloomProps> = ({
  isBlooming,
  theme = 'sakura',
}) => {
  if (!isBlooming) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      <svg 
        width="300" 
        height="300" 
        viewBox="0 0 300 300" 
        fill="none" 
        className="w-full h-full" 
        data-theme={theme}
      >
        <style>{`
          [data-theme="sakura"] { --petal: #FFCDD2; --center: #FFF9C4; }
          [data-theme="lavender"] { --petal: #F3E5F5; --center: #FFF176; }
          
          .bloom-petal { fill: var(--petal); }
          .bloom-center { fill: var(--center); }

          /* 1. 同步树干摇摆 (6s) */
          @keyframes sync-tree-sway {
            0%, 100% { transform: rotate(-1deg); }
            50% { transform: rotate(1deg); }
          }

          /* 2. 同步树冠呼吸 (6s) */
          @keyframes sync-foliage-breathe {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.03); }
          }

          .sway-layer {
            transform-origin: 150px 260px;
            animation: sync-tree-sway 6s ease-in-out infinite;
          }

          .breathe-layer {
            transform-origin: 145px 100px;
            animation: sync-foliage-breathe 6s ease-in-out infinite;
          }

          .individual-flower {
            transform-box: fill-box;
            transform-origin: center;
          }

          /* 3. 落花瓣动画 (模仿落叶) */
          .fall-petal-1 {
            transform-box: fill-box;
            transform-origin: center;
            opacity: 0;
            animation: petal-fall-left 8s ease-in-out infinite;
            fill: var(--petal);
          }

          .fall-petal-2 {
            transform-box: fill-box;
            transform-origin: center;
            opacity: 0;
            animation: petal-fall-right 11s ease-in-out infinite;
            animation-delay: 3s;
            fill: var(--petal);
          }

          @keyframes petal-fall-left {
            0% { opacity: 0; transform: translate(120px, 90px) rotate(0deg) scale(0.4); }
            20% { opacity: 1; }
            80% { opacity: 1; }
            100% { opacity: 0; transform: translate(80px, 260px) rotate(-45deg) scale(0.4); }
          }

          @keyframes petal-fall-right {
            0% { opacity: 0; transform: translate(170px, 100px) rotate(15deg) scale(0.35); }
            20% { opacity: 1; }
            80% { opacity: 1; }
            100% { opacity: 0; transform: translate(210px, 265px) rotate(60deg) scale(0.35); }
          }
        `}</style>

        <g className="sway-layer">
          <g className="breathe-layer">
            
            {/* 1. 主树冠顶部 (向左微调) */}
            <g className="individual-flower" transform="translate(140, 90) rotate(10) scale(0.6)">
              <circle cy="-6" r="6" className="bloom-petal"/><circle cx="5.7" cy="-1.8" r="6" className="bloom-petal"/><circle cx="3.5" cy="4.9" r="6" className="bloom-petal"/><circle cx="-3.5" cy="4.9" r="6" className="bloom-petal"/><circle cx="-5.7" cy="-1.8" r="6" className="bloom-petal"/><circle r="3.5" className="bloom-center"/>
            </g>

            {/* 2. 左上侧核心区 (向左微调) */}
            <g className="individual-flower" transform="translate(105, 115) rotate(-5) scale(0.45)">
              <circle cy="-6" r="6" className="bloom-petal"/><circle cx="5.7" cy="-1.8" r="6" className="bloom-petal"/><circle cx="3.5" cy="4.9" r="6" className="bloom-petal"/><circle cx="-3.5" cy="4.9" r="6" className="bloom-petal"/><circle cx="-5.7" cy="-1.8" r="6" className="bloom-petal"/><circle r="3.5" className="bloom-center"/>
            </g>

            {/* 3. 右上侧边缘 (向左微调) */}
            <g className="individual-flower" transform="translate(175, 120) rotate(-15) scale(0.5)">
              <circle cy="-6" r="6" className="bloom-petal"/><circle cx="5.7" cy="-1.8" r="6" className="bloom-petal"/><circle cx="3.5" cy="4.9" r="6" className="bloom-petal"/><circle cx="-3.5" cy="4.9" r="6" className="bloom-petal"/><circle cx="-5.7" cy="-1.8" r="6" className="bloom-petal"/><circle r="3.5" className="bloom-center"/>
            </g>

            {/* 4. 落花瓣 (模仿落叶) */}
            <path className="fall-petal-1" d="M0,0 Q6,-6 12,0 Q6,6 0,0" />
            <path className="fall-petal-2" d="M0,0 Q5,-5 10,0 Q5,5 0,0" />

          </g>
        </g>
      </svg>
    </div>
  );
};

export default HeartTreeBloom;
