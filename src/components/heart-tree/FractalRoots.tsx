'use client';

import React, { useMemo } from 'react';
import { motion, Variants } from 'framer-motion';
import { createSeededRandom, randomBetween } from './random';

interface FractalRootsProps {
  seed: number;
  length: number;
  depth: number;
  maxDepth: number;
  thickness: number;
  angle: number;
  stroke: string;
}

const drawVariant: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (depth: number) => ({
    pathLength: 1,
    opacity: 0.8,
    transition: {
      pathLength: { duration: 1.2, ease: 'easeOut', delay: depth * 0.12 },
      opacity: { duration: 0.3, delay: depth * 0.08 },
    },
  }),
};

export const FractalRoots: React.FC<FractalRootsProps> = ({
  seed,
  length,
  depth,
  maxDepth,
  thickness,
  angle,
  stroke,
}) => {
  const rand = useMemo(
    () => createSeededRandom(seed * 19 + depth * 71 + 3),
    [seed, depth]
  );

  const isTerminal = depth >= maxDepth;

  const children = useMemo(() => {
    if (isTerminal) return [];
    const splitCount = rand() > 0.65 ? 2 : 1;
    return Array.from({ length: splitCount }).map((_, idx) => ({
      angle: randomBetween(rand, -18, 18),
      lengthScale: randomBetween(rand, 0.78, 0.9),
      seed: seed * 57 + depth * 29 + idx * 331 + 5,
    }));
  }, [isTerminal, rand, seed, depth]);

  return (
    <motion.g initial={{ rotate: angle }}>
      <motion.path
        d={`M0,0 Q${length * 0.45},${randomBetween(rand, -10, 10)} ${length},${randomBetween(rand, -2, 6)}`}
        stroke={stroke}
        strokeWidth={thickness}
        strokeLinecap="round"
        fill="none"
        custom={depth}
        variants={drawVariant}
        initial="hidden"
        animate="visible"
        style={{ opacity: 0.65 }}
      />
      {!isTerminal && (
        <g transform={`translate(${length}, 0)`}>
          {children.map((child, idx) => (
            <FractalRoots
              key={`root-${depth}-${idx}`}
              seed={child.seed}
              length={length * child.lengthScale}
              depth={depth + 1}
              maxDepth={maxDepth}
              thickness={Math.max(1, thickness * 0.65)}
              angle={child.angle}
              stroke={stroke}
            />
          ))}
        </g>
      )}
    </motion.g>
  );
};




