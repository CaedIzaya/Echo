'use client';

import { useEffect, useRef, useState } from 'react';

interface EchoSpiritProps {
  state?: 'idle' | 'excited' | 'focus' | 'happy' | 'nod';
  className?: string;
  onStateChange?: (state: string) => void;
  onClick?: () => void;
}

export default function EchoSpirit({ 
  state = 'idle', 
  className = '', 
  onStateChange, 
  onClick 
}: EchoSpiritProps) {
  const [currentState, setCurrentState] = useState(state);
  const [isAnimating, setIsAnimating] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync external state
  useEffect(() => {
    if (!isAnimating) {
      setCurrentState(state);
    }
  }, [state, isAnimating]);

  // Interaction: Trigger animations based on state
  const handleInteract = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    if (onClick) onClick();
    
    // Randomly choose happy or excited
    const nextState = Math.random() > 0.5 ? 'happy' : 'excited';
    setCurrentState(nextState);
    if (onStateChange) onStateChange(nextState);
    
    // Reset after animation
    timerRef.current = setTimeout(() => {
      setIsAnimating(false);
      setCurrentState('idle');
      if (onStateChange) onStateChange('idle');
    }, 2000);
  };

  return (
      <div 
        className={`echo-spirit-container ${className}`}
        onClick={handleInteract}
        role="button"
        tabIndex={0}
        data-state={currentState}
        data-animating={isAnimating}
      >
      <svg className="echo-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* --- NEW COLOR PALETTE: Soft, Magical, Ethereal --- */}
          
          {/* Body: Pastel Yellow -> Soft Peach -> Golden Edge */}
          <radialGradient id="gradBodySoft" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFFBF0" />     {/* Highlight: Milky White */}
            <stop offset="40%" stopColor="#FFE0B2" />    {/* Core: Soft Peach */}
            <stop offset="100%" stopColor="#FFB74D" />   {/* Edge: Golden Orange */}
          </radialGradient>
          {/* Eyes: Softer brown, less harsh than black */}
          <linearGradient id="gradEye" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#5D4037" />
            <stop offset="100%" stopColor="#3E2723" />
          </linearGradient>
          {/* Glow Filter: Creates the "Spirit" atmosphere */}
          <filter id="spiritGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feComposite in="coloredBlur" in2="SourceGraphic" operator="in" result="softGlow" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* --- GROUP: MAIN ROTATOR (Handles Body Tilt) --- */}
        <g className="main-rotator" transform="translate(100, 100)">
          {/* --- LAYER 2: BODY (The Spirit) --- */}
          <g className="body-physics-group">
            {/* 3.1 Shape: Teardrop/Tadpole - Tapered bottom for aerodynamics (Smaller size) */}
            <path 
              className="body-shape"
              d="M0,-40 C21,-40 40,-21 40,4 C40,33 17,46 0,46 C-17,46 -40,33 -40,4 C-40,-21 -21,-40 0,-40 Z" 
              fill="url(#gradBodySoft)"
              filter="url(#spiritGlow)"
            />
            {/* 3.2 Hands: Little energy nubs (Integrated, smaller) */}
            <circle cx="-32" cy="12" r="6" fill="#FFCC80" className="hand left-hand" opacity="0.8" />
            <circle cx="32" cy="12" r="6" fill="#FFCC80" className="hand right-hand" opacity="0.8" />
            {/* 3.3 Face Container (Independent from body stretch) */}
            <g className="face-container" transform="translate(0, -5)">
              {/* Blush */}
              <circle cx="-28" cy="12" r="9" fill="#FFAB91" opacity="0.4" />
              <circle cx="28" cy="12" r="9" fill="#FFAB91" opacity="0.4" />
              {/* EXPRESSIVE EYES GROUP */}
              {/* The entire group moves for "looking around" */}
              <g className="eyes-look-controller">
                {/* Left Eye */}
                <g className="eye-left" transform="translate(-18, 0)">
                  <ellipse cx="0" cy="0" rx="7.5" ry="11" fill="url(#gradEye)" />
                  <circle cx="2" cy="-4" r="3" fill="white" opacity="0.95" /> {/* Highlight */}
                  <path d="M-6,-8 Q0,-12 6,-8" stroke="#5D4037" strokeWidth="1.5" opacity="0.3" fill="none" /> {/* Lid crease */}
                </g>
                {/* Right Eye */}
                <g className="eye-right" transform="translate(18, 0)">
                  <ellipse cx="0" cy="0" rx="7.5" ry="11" fill="url(#gradEye)" />
                  <circle cx="2" cy="-4" r="3" fill="white" opacity="0.95" /> {/* Highlight */}
                  <path d="M-6,-8 Q0,-12 6,-8" stroke="#5D4037" strokeWidth="1.5" opacity="0.3" fill="none" />
                </g>
              </g>
            </g>
          </g>
        </g>
        
        {/* --- LAYER 4: MAGICAL PARTICLES --- */}
        <g className="particles">
           <circle className="p1" cx="140" cy="70" r="2" fill="#FFF" opacity="0.6" />
           <circle className="p2" cx="60" cy="160" r="1.5" fill="#FFF" opacity="0.4" />
           <circle className="p3" cx="150" cy="140" r="1" fill="#FFF" opacity="0.5" />
        </g>
      </svg>
      <style jsx>{`
        .echo-spirit-container {
          width: 180px;
          height: 180px;
          display: inline-block;
          cursor: pointer;
          position: relative;
          -webkit-tap-highlight-color: transparent;
        }
        
        .echo-svg {
          width: 100%;
          height: 100%;
          overflow: visible;
        }
        /* =========================================
           1. IDLE ANIMATIONS (Always Active)
           ========================================= */
        
        /* Body: Gentle floating sine wave */
        @keyframes floatIdle {
          0%, 100% { transform: translateY(0px) rotate(-5deg); }
          50% { transform: translateY(-8px) rotate(-3deg); }
        }
        /* Eyes: Randomly looking around (Simulated randomness via long keyframe) */
        @keyframes eyeLookAround {
          0%, 35% { transform: translate(0, 0); } /* Center */
          40%, 45% { transform: translate(-6px, 2px); } /* Look Left */
          50%, 75% { transform: translate(0, 0); } /* Center */
          80%, 85% { transform: translate(6px, -2px); } /* Look Right Up */
          90%, 100% { transform: translate(0, 0); } /* Center */
        }
        
        /* Blink: Natural eye closing - only scale Y axis at center */
        @keyframes blink {
          0%, 48%, 52%, 100% { 
            transform: scaleY(1);
            opacity: 1;
          }
          50% { 
            transform: scaleY(0.05);
            opacity: 0.9;
          }
        }
        /* Particle Sparkle */
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: translateY(0); }
          50% { opacity: 0.8; transform: translateY(-10px); }
        }
        /* --- APPLY IDLE --- */
        .echo-spirit-container[data-state="idle"] .main-rotator {
          animation: floatIdle 4s ease-in-out infinite;
          transform-origin: center center;
        }
        
        .echo-spirit-container[data-state="idle"] .eyes-look-controller {
          animation: eyeLookAround 8s ease-in-out infinite;
        }
        
        /* Apply blink animation to both eyes independently with proper origin */
        .echo-spirit-container[data-state="idle"] .eye-left ellipse {
          transform-origin: 0px 0px; /* Center of the eye at translate(-18, 0) */
          animation: blink 4s infinite;
        }
        .echo-spirit-container[data-state="idle"] .eye-right ellipse {
          transform-origin: 0px 0px; /* Center of the eye at translate(18, 0) */
          animation: blink 4.2s infinite; /* Slight delay for more natural look */
        }
        .echo-spirit-container .p1 { animation: sparkle 3s infinite; }
        .echo-spirit-container .p2 { animation: sparkle 4s infinite 1s; }
        .echo-spirit-container .p3 { animation: sparkle 5s infinite 2s; }
        /* =========================================
           2. HAPPY ANIMATION (Wiggle & Bounce)
           ========================================= */
        @keyframes happyWiggle {
          0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
          25% { transform: translateY(-5px) rotate(-3deg) scale(1.05); }
          50% { transform: translateY(-8px) rotate(0deg) scale(1.08); }
          75% { transform: translateY(-5px) rotate(3deg) scale(1.05); }
        }
        
        .echo-spirit-container[data-state="happy"] .main-rotator {
          animation: happyWiggle 0.6s ease-in-out infinite;
          transform-origin: center center;
        }
        
        .echo-spirit-container[data-state="happy"] .eyes-look-controller {
          animation: none;
        }
        
        /* =========================================
           3. EXCITED ANIMATION (Bounce & Dart)
           ========================================= */
        @keyframes excitedBounce {
          0%, 100% { transform: translateY(0) scale(1); }
          20% { transform: translateY(8px) scale(1.1, 0.9); } /* Squash down */
          40% { transform: translateY(-15px) scale(0.9, 1.1) rotate(5deg); } /* Jump up */
          60% { transform: translateY(-12px) scale(0.95, 1.05) rotate(-3deg); }
          80% { transform: translateY(5px) scale(1.05, 0.95); } /* Land */
        }
        
        .echo-spirit-container[data-state="excited"] .main-rotator {
          animation: excitedBounce 0.8s ease-in-out infinite;
          transform-origin: center center;
        }
        
        .echo-spirit-container[data-state="excited"] .eyes-look-controller {
          animation: none;
        }
      `}</style>
    </div>
  );
}
