import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface ComposerProps {
  onSave: (note: string) => Promise<void>;
  onCancel: () => void;
}

export const Composer: React.FC<ComposerProps> = ({ onSave, onCancel }) => {
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;

    setIsSaving(true);
    await onSave(note);
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-500">
      <div className="w-full max-w-lg p-8 mx-4 animate-[fadeIn_0.5s_ease-out]">
        <h2 className="text-xl font-light text-slate-300 mb-6 text-center tracking-wide">
          How was your day?
        </h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <textarea
            autoFocus
            className="w-full h-32 bg-transparent border-b border-slate-800 text-slate-200 text-lg font-light focus:outline-none focus:border-slate-600 resize-none placeholder-slate-800 transition-colors duration-300 text-center"
            placeholder="Just a few words..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isSaving}
          />
          
          <div className="flex justify-center gap-8">
            <button 
              type="button" 
              onClick={onCancel}
              className="text-sm text-slate-600 hover:text-slate-400 transition-colors"
              disabled={isSaving}
            >
              Discard
            </button>
            <button 
              type="submit" 
              disabled={!note.trim() || isSaving}
              className="text-sm text-blue-300/80 hover:text-blue-200 transition-colors disabled:opacity-30 flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Record Star'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
