'use client';

import { useState } from 'react';

interface HeartTreeControlsProps {
  onWatering?: () => void;
  onFertilizing?: () => void;
}

export default function HeartTreeControls({ onWatering, onFertilizing }: HeartTreeControlsProps) {
  const [animState, setAnimState] = useState<'idle' | 'watering' | 'fertilizing'>('idle');

  const triggerWatering = () => {
    if (animState !== 'idle') return;
    setAnimState('watering');
    if (onWatering) onWatering();
    setTimeout(() => setAnimState('idle'), 2000);
  };

  const triggerFertilizing = () => {
    if (animState !== 'idle') return;
    setAnimState('fertilizing');
    if (onFertilizing) onFertilizing();
    setTimeout(() => setAnimState('idle'), 2000);
  };

  return (
    <>
      <div className="heart-tree-controls">
        <button 
          onClick={triggerWatering} 
          disabled={animState !== 'idle'}
          className="water-btn"
        >
          💧 浇水
        </button>
        <button 
          onClick={triggerFertilizing} 
          disabled={animState !== 'idle'}
          className="fertilize-btn"
        >
          ✨ 施肥
        </button>
      </div>

      <style jsx>{`
        .heart-tree-controls {
          display: flex;
          gap: 16px;
          margin-top: 20px;
          justify-content: center;
        }

        .water-btn,
        .fertilize-btn {
          padding: 12px 24px;
          border: none;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          color: #333;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .water-btn:hover:not(:disabled) {
          background: rgba(41, 182, 246, 0.2);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(41, 182, 246, 0.3);
        }

        .fertilize-btn:hover:not(:disabled) {
          background: rgba(255, 179, 0, 0.2);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 179, 0, 0.3);
        }

        .water-btn:active:not(:disabled),
        .fertilize-btn:active:not(:disabled) {
          transform: scale(0.95);
        }

        .water-btn:disabled,
        .fertilize-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
}

