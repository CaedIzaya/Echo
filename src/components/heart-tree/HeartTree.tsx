'use client';

import React, { useMemo, useId } from 'react';
import { motion } from 'framer-motion';
import { FractalBranch } from './FractalBranch';
import { FractalRoots } from './FractalRoots';
import { createSeededRandom, randomBetween } from './random';

interface HeartTreeProps {
  seed?: number;
  windIntensity?: number;
  showRoots?: boolean;
  showFruits?: boolean;
  showParticles?: boolean;
}

const VIEWBOX = { width: 320, height: 320 };
const BASE = { x: VIEWBOX.width / 2, y: 255 };
const TRUNK_LENGTH = 105;
const MAX_DEPTH = 8;
const HEART_PARTICLE_PATH =
  'M0,-1 C-3,-7 -10,-5 -10,1 C-10,7 -5,11 0,16 C5,11 10,7 10,1 C10,-5 3,-7 0,-1 Z';

const createPalette = (seed: number) => {
  const rand = createSeededRandom(seed + 404);
  const leafHue = randomBetween(rand, 140, 165);
  const accentHue = leafHue + randomBetween(rand, -12, 12);
  const fruitHue = randomBetween(rand, 12, 28);

  return {
    backgroundTop: `hsl(${randomBetween(rand, 210, 230)}, 70%, 14%)`,
    backgroundBottom: `hsl(${randomBetween(rand, 215, 235)}, 80%, 5%)`,
    auraInner: 'rgba(120, 255, 230, 0.6)',
    auraOuter: 'rgba(40, 200, 170, 0)',
    leafPrimary: `hsl(${leafHue}, 60%, ${randomBetween(rand, 38, 50)}%)`,
    leafAccent: `hsl(${accentHue}, 55%, ${randomBetween(rand, 45, 60)}%)`,
    fruitPrimary: `hsl(${fruitHue}, 80%, 64%)`,
    fruitHighlight: `hsl(${fruitHue + 8}, 90%, 78%)`,
    trunkLight: '#5d5045',
    trunkDark: '#3e352e',
    rootColor: '#463326',
    sparkle: `hsla(${randomBetween(rand, 180, 200)}, 80%, 70%, 0.4)`,
  };
};

export const HeartTree: React.FC<HeartTreeProps> = ({
  seed = 0,
  windIntensity = 1,
  showRoots = true,
  showFruits = true,
  showParticles = true,
}) => {
  const palette = useMemo(() => createPalette(seed), [seed]);
  const uniqueId = useId().replace(/:/g, '');
  const gradientIds = useMemo(
    () => ({
      bg: `heart-bg-${uniqueId}`,
      aura: `heart-aura-${uniqueId}`,
      trunk: `heart-trunk-${uniqueId}`,
      fruit: `heart-fruit-${uniqueId}`,
    }),
    [uniqueId]
  );

  const particles = useMemo(() => {
    if (!showParticles) return [];
    const rand = createSeededRandom(seed + 777);
    return Array.from({ length: 9 }).map((_, idx) => ({
      key: `particle-${idx}`,
      x: randomBetween(rand, 40, VIEWBOX.width - 40),
      startY: randomBetween(rand, 140, 200),
      endY: randomBetween(rand, 40, 90),
      delay: rand() * 4,
      duration: randomBetween(rand, 6, 9),
      scale: randomBetween(rand, 0.4, 0.85),
      opacity: randomBetween(rand, 0.15, 0.4),
    }));
  }, [seed, showParticles]);

  const clampedWind = Math.max(0.35, Math.min(2.5, windIntensity));

  return (
    <div className="w-full h-full max-w-[460px] max-h-[460px] select-none">
      <motion.svg
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
        className="w-full h-full drop-shadow-2xl"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <radialGradient id={gradientIds.bg} cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor={palette.backgroundTop} />
            <stop offset="100%" stopColor={palette.backgroundBottom} />
          </radialGradient>
          <radialGradient id={gradientIds.aura} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={palette.auraInner} />
            <stop offset="70%" stopColor={palette.auraInner} />
            <stop offset="100%" stopColor={palette.auraOuter} />
          </radialGradient>
          <linearGradient id={gradientIds.trunk} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={palette.trunkDark} />
            <stop offset="50%" stopColor={palette.trunkLight} />
            <stop offset="100%" stopColor={palette.trunkDark} />
          </linearGradient>
          <radialGradient id={gradientIds.fruit} cx="35%" cy="25%" r="70%">
            <stop offset="0%" stopColor={palette.fruitHighlight} />
            <stop offset="60%" stopColor={palette.fruitPrimary} />
            <stop offset="100%" stopColor="#a83248" />
          </radialGradient>
          <filter id={`fruitGlow-${uniqueId}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width={VIEWBOX.width} height={VIEWBOX.height} fill={`url(#${gradientIds.bg})`} />

        <motion.circle
          cx={VIEWBOX.width / 2}
          cy={VIEWBOX.height * 0.55}
          r={110}
          fill="none"
          stroke="rgba(90, 240, 210, 0.65)"
          strokeWidth={4}
          animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.35, 0.6, 0.35] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <circle
          cx={VIEWBOX.width / 2}
          cy={VIEWBOX.height * 0.55}
          r={94}
          fill={`url(#${gradientIds.aura})`}
          opacity={0.25}
        />

        {showParticles &&
          particles.map((particle) => (
            <motion.path
              key={particle.key}
              d={HEART_PARTICLE_PATH}
              fill={palette.sparkle}
              style={{ transformOrigin: `${particle.x}px ${particle.startY}px` }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, particle.opacity, 0],
                translateY: [0, -(particle.startY - particle.endY)],
                scale: [0, particle.scale, 0],
              }}
              transition={{
                duration: particle.duration,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: particle.delay,
              }}
              transform={`translate(${particle.x}, ${particle.startY})`}
            />
          ))}

        <g>
          <ellipse
            cx={BASE.x}
            cy={BASE.y + 8}
            rx={110}
            ry={18}
            fill="rgba(0,0,0,0.45)"
            style={{ filter: 'blur(10px)' }}
          />

          <g transform={`translate(${BASE.x}, ${BASE.y})`}>
            {showRoots && (
              <FractalRoots
                seed={seed + 1000}
                length={55}
                depth={0}
                maxDepth={4}
                thickness={10}
                angle={90}
                stroke={palette.rootColor}
              />
            )}

            <g transform="rotate(-90)">
              <FractalBranch
                seed={seed || 1}
                depth={0}
                maxDepth={MAX_DEPTH}
                length={TRUNK_LENGTH}
                thickness={15}
                angle={0}
                windIntensity={clampedWind}
                palette={{
                  leafPrimary: palette.leafPrimary,
                  leafAccent: palette.leafAccent,
                  fruitPrimary: palette.fruitPrimary,
                  fruitHighlight: palette.fruitHighlight,
                }}
                showFruits={showFruits}
                trunkGradientId={gradientIds.trunk}
              />
            </g>
          </g>
        </g>
      </motion.svg>
    </div>
  );
};

