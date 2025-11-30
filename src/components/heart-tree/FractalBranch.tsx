'use client';

import React, { useMemo } from 'react';
import { motion, Variants } from 'framer-motion';
import { createSeededRandom, randomBetween } from './random';

interface FractalBranchProps {
  seed: number;
  depth: number;
  maxDepth: number;
  length: number;
  thickness: number;
  angle: number;
  windIntensity: number;
  palette: Palette;
  showFruits: boolean;
  trunkGradientId: string;
}

const drawVariant: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (depth: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 1.1, ease: 'easeOut', delay: depth * 0.08 },
      opacity: { duration: 0.4, delay: depth * 0.05 },
    },
  }),
};

const HEART_LEAF_PATH =
  'M0,-3 C-4,-12 -16,-6 -16,4 C-16,12 -8,18 0,24 C8,18 16,12 16,4 C16,-6 4,-12 0,-3 Z';

interface Palette {
  leafPrimary: string;
  leafAccent: string;
  fruitPrimary: string;
  fruitHighlight: string;
}

export const FractalBranch: React.FC<FractalBranchProps> = ({
  seed,
  depth,
  maxDepth,
  length,
  thickness,
  angle,
  windIntensity,
  palette,
  showFruits,
  trunkGradientId,
}) => {
  const rand = useMemo(
    () => createSeededRandom(seed * 31 + depth * 131 + 7),
    [seed, depth]
  );

  const splitCount = useMemo(() => {
    if (depth < 2) return 3;
    return rand() > 0.82 ? 3 : 2;
  }, [rand, depth]);

  const children = useMemo(
    () =>
      Array.from({ length: splitCount }).map((_, idx) => {
        const spread = 18 + depth * 3 + randomBetween(rand, -5, 5);
        const childAngle = randomBetween(rand, -spread, spread);
        const lengthScale = randomBetween(rand, 0.7, 0.85);
        const seedOffset = seed * 73 + depth * 17 + idx * 997 + 19;
        return {
          angle: childAngle,
          lengthScale,
          seed: seedOffset,
        };
      }),
    [splitCount, rand, depth, seed]
  );

  const showLeafCluster = depth === maxDepth;
  const swayAngle = (6 + depth * 0.8) * windIntensity;
  const swayDuration = randomBetween(rand, 4, 7) / Math.max(0.4, windIntensity);
  const swayDelay = randomBetween(rand, 0, 2);

  const hasFruit = showLeafCluster && showFruits && rand() > 0.82;

  return (
    <motion.g
      initial={{ rotate: angle }}
      animate={{
        rotate: [angle - swayAngle, angle + swayAngle, angle - swayAngle],
      }}
      transition={{
        duration: swayDuration,
        ease: 'easeInOut',
        repeat: Infinity,
        delay: swayDelay,
      }}
    >
      <motion.path
        d={`M0 0 Q ${length * 0.45} ${randomBetween(rand, -6, 6)} ${length} 0`}
        stroke={`url(#${trunkGradientId})`}
        strokeWidth={thickness}
        strokeLinecap="round"
        fill="none"
        custom={depth}
        variants={drawVariant}
        initial="hidden"
        animate="visible"
      />

      <g transform={`translate(${length}, 0)`}>
        {showLeafCluster ? (
          <g>
            <motion.path
              d={HEART_LEAF_PATH}
              fill={palette.leafPrimary}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 0.6, opacity: 0.9 }}
              transition={{ delay: 0.8, duration: 0.6, type: 'spring' }}
              transform="scale(0.4)"
            />
            <motion.path
              d={HEART_LEAF_PATH}
              fill={palette.leafAccent}
              opacity={0.7}
              transform="rotate(-35) translate(-6,-4) scale(0.25)"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.7 }}
              transition={{ delay: 1, duration: 0.5 }}
            />
            {hasFruit && (
              <motion.circle
                cx={randomBetween(rand, -6, 6)}
                cy={randomBetween(rand, -4, 4)}
                r={3.8}
                fill={palette.fruitPrimary}
                stroke={palette.fruitHighlight}
                strokeWidth={0.8}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.3, type: 'spring' }}
              />
            )}
          </g>
        ) : (
          children.map((child, idx) => (
            <FractalBranch
              key={`${depth}-${idx}`}
              seed={child.seed}
              depth={depth + 1}
              maxDepth={maxDepth}
              length={length * child.lengthScale}
              thickness={Math.max(1, thickness * 0.72)}
              angle={child.angle}
              windIntensity={windIntensity}
              palette={palette}
              showFruits={showFruits}
            />
          ))
        )}
      </g>
    </motion.g>
  );
};

