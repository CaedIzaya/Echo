import React from 'react';
import { DayRecord } from '../types';
import { X } from 'lucide-react';

interface DetailViewProps {
  record: DayRecord;
  onClose: () => void;
}

export const DetailView: React.FC<DetailViewProps> = ({ record, onClose }) => {
  const dateObj = new Date(record.date);
  
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-md">
      <div className="max-w-md w-full p-8 relative animate-[floatUp_0.6s_ease-out]">
        <button 
          onClick={onClose}
          className="absolute top-0 right-0 p-4 text-slate-600 hover:text-slate-400 transition-colors"
        >
          <X size={20} strokeWidth={1} />
        </button>

        <div className="text-center space-y-6">
          <div className="text-xs tracking-[0.2em] text-slate-500 uppercase">
            {dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          
          <h3 className="text-2xl font-light text-slate-100 leading-relaxed italic opacity-90">
            "{record.aiReflection}"
          </h3>

          <div className="w-8 h-[1px] bg-slate-800 mx-auto"></div>

          <p className="text-sm text-slate-400 font-light leading-7">
            {record.rawNote}
          </p>
        </div>
      </div>
    </div>
  );
};
