import React, { useState } from 'react';
import { DayRecord, StarProps } from '../types';

export const Star: React.FC<StarProps> = ({ record, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  const dateObj = new Date(record.date);
  const day = dateObj.getDate();
  const month = dateObj.toLocaleString('default', { month: 'short' });

  return (
    <div 
      className="flex flex-col items-center gap-6 group cursor-pointer transition-all duration-700 ease-in-out relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick(record)}
      style={{
        // Add staggered fade-in logic if needed, or rely on parent
      }}
    >
      {/* Interaction Zone - Larger than the star for easier hovering */}
      <div className="relative w-16 h-16 flex items-center justify-center">
        
        {/* The Ripple - Only visible on hover */}
        <div 
          className={`absolute inset-0 rounded-full bg-blue-100/10 blur-xl transition-all duration-1000 ease-out
            ${isHovered ? 'opacity-100 scale-150' : 'opacity-0 scale-50'}`}
        ></div>

        {/* The Core Star */}
        <div className={`w-1.5 h-1.5 rounded-full bg-blue-50 shadow-[0_0_8px_rgba(200,220,255,0.4)] transition-all duration-500
          ${isHovered ? 'bg-white shadow-[0_0_15px_rgba(255,255,255,0.6)]' : 'bg-blue-50/80'}`} 
        />
        
        {/* Subtle connector line (optional, kept invisible for now based on 'negative space' requirement) */}
      </div>

      {/* Date Label */}
      <div className={`text-[10px] tracking-widest font-light text-slate-500 transition-opacity duration-500
        ${isHovered ? 'opacity-100 text-slate-300' : 'opacity-60'}`}>
        {day} {month.toUpperCase()}
      </div>
    </div>
  );
};
