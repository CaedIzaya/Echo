'use client';

import React from 'react';

interface HeartTreeProps {
  seed?: number;
  windIntensity?: number;
  showRoots?: boolean;
  showFruits?: boolean;
  showParticles?: boolean;
}

export const HeartTree: React.FC<HeartTreeProps> = () => {
  return (
    <div className="w-full h-full max-w-[460px] max-h-[460px] select-none flex items-center justify-center">
      <svg width="300" height="300" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl">
        <defs>
          {/* Existing Foliage Gradient */}
          <linearGradient id="leafGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{stopColor:'#90d38d',stopOpacity:1}} />
            <stop offset="100%" style={{stopColor:'#6dbb6b',stopOpacity:1}} />
          </linearGradient>
          
          {/* Existing Trunk Gradient */}
          <linearGradient id="trunkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{stopColor:'#b48a59',stopOpacity:1}} />
            <stop offset="80%" style={{stopColor:'#9c7548',stopOpacity:1}} />
          </linearGradient>

          {/* CSS Animation Logic */}
          <style>
            {`
              /* --- Existing Animations --- */
              
              .tree-sway {
                transform-origin: 150px 260px;
                animation: sway 6s ease-in-out infinite;
              }

              .foliage-breathe {
                transform-origin: 145px 100px;
                animation: breathe 6s ease-in-out infinite;
              }

              /* --- New Animations --- */

              /* Grass breathes very subtly in sync with the tree */
              .grass-breathe {
                transform-origin: 150px 300px;
                animation: grassPulse 6s ease-in-out infinite;
              }

              /* Leaf 1: Falls from left side */
              .fallLeaf1 {
                transform-box: fill-box;
                transform-origin: center;
                opacity: 0;
                animation: fallLeft 8s ease-in-out infinite;
              }

              /* Leaf 2: Falls from right side, delayed start */
              .fallLeaf2 {
                transform-box: fill-box;
                transform-origin: center;
                opacity: 0;
                animation: fallRight 11s ease-in-out infinite; /* Slower different timing for variety */
                animation-delay: 2s;
              }

              /* Keyframes */
              
              @keyframes sway {
                0%   { transform: rotate(0deg); }
                25%  { transform: rotate(1.5deg); }
                50%  { transform: rotate(0deg); }
                75%  { transform: rotate(-1.5deg); }
                100% { transform: rotate(0deg); }
              }

              @keyframes breathe {
                0%   { transform: scale(1); }
                50%  { transform: scale(1.03); }
                100% { transform: scale(1); }
              }

              @keyframes grassPulse {
                0%   { transform: scaleY(1) scaleX(1); }
                50%  { transform: scaleY(1.02) scaleX(1.01); } /* Very subtle rise */
                100% { transform: scaleY(1) scaleX(1); }
              }

              /* Fall Path 1: Starts at canopy left, drifts left & down */
              @keyframes fallLeft {
                0% { opacity: 0; transform: translate(120px, 110px) rotate(0deg); }
                20% { opacity: 1; }
                80% { opacity: 1; }
                100% { opacity: 0; transform: translate(90px, 280px) rotate(-45deg); }
              }

              /* Fall Path 2: Starts at canopy right, drifts right & down */
              @keyframes fallRight {
                0% { opacity: 0; transform: translate(180px, 120px) rotate(15deg); }
                20% { opacity: 1; }
                80% { opacity: 1; }
                100% { opacity: 0; transform: translate(220px, 285px) rotate(60deg); }
              }
            `}
          </style>
        </defs>

        {/* 1. Main Tree Group (Existing logic) - Foliage first (bottom layer) */}
        <g className="tree-sway">
          {/* Foliage */}
          <g className="foliage-breathe">
            <g id="FoliageCluster">
              <circle cx="115" cy="130" r="35" fill="url(#leafGradient)" />
              <circle cx="185" cy="125" r="32" fill="url(#leafGradient)" />
              <circle cx="100" cy="95" r="38" fill="url(#leafGradient)" />
              <circle cx="190" cy="85" r="36" fill="url(#leafGradient)" />
              <circle cx="145" cy="70" r="45" fill="url(#leafGradient)" />
              <circle cx="145" cy="100" r="40" fill="url(#leafGradient)" />
            </g>
          </g>
          
          {/* Trunk */}
          <g id="TreeTrunk">
            <path d="M142,260 C142,260 135,200 145,160 C148,145 155,130 165,120 M145,160 C145,160 125,145 115,135" 
                  stroke="url(#trunkGradient)" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M150,260 C150,260 145,190 150,130" 
                  stroke="url(#trunkGradient)" strokeWidth="16" strokeLinecap="round" fill="none" />
          </g>
        </g>

        {/* 2. Ground Grass Layer (Above trunk, below falling leaves) */}
        <g id="GrassLayer" className="grass-breathe">
          {/* A gentle hill curve filling the bottom, starting from trunk base (y=260) */}
          <path d="M0,300 L0,260 C50,255 150,258 300,260 L300,300 Z" fill="#5a9c59" />
        </g>

        {/* 3. Falling Leaves (Front Layer - Top layer) */}
        <g id="FallingLeaves">
          {/* Defined at 0,0, moved via CSS animation */}
          {/* Leaf 1 */}
          <path className="fallLeaf1" d="M0,0 Q6,-6 12,0 Q6,6 0,0" fill="url(#leafGradient)" />
          
          {/* Leaf 2 */}
          <path className="fallLeaf2" d="M0,0 Q5,-5 10,0 Q5,5 0,0" fill="url(#leafGradient)" />
        </g>
      </svg>
    </div>
  );
};

