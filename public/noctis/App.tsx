import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { DayRecord } from './types';
import { Star } from './components/Star';
import { Composer } from './components/Composer';
import { DetailView } from './components/DetailView';
import { generateReflection } from './services/geminiService';

const App: React.FC = () => {
  // Initial state with some dummy data for visualization purposes if empty
  const [days, setDays] = useState<DayRecord[]>([]);
  const [isComposing, setIsComposing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayRecord | null>(null);

  // Initialize with local storage data
  useEffect(() => {
    const saved = localStorage.getItem('noctis-days');
    if (saved) {
      setDays(JSON.parse(saved));
    } else {
        // Optional: Start empty as per prompt "background represents an empty, calm night sky"
        setDays([]);
    }
  }, []);

  const handleSaveDay = async (note: string) => {
    // 1. Generate ID and date
    const newRecord: DayRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      rawNote: note,
      aiReflection: 'Thinking...', // Placeholder
    };

    // 2. Optimistic update
    const updatedDays = [...days, newRecord];
    setDays(updatedDays);
    localStorage.setItem('noctis-days', JSON.stringify(updatedDays));
    setIsComposing(false);

    // 3. Fetch AI Reflection
    const reflection = await generateReflection(note);
    
    // 4. Update with reflection
    const finalDays = updatedDays.map(d => 
      d.id === newRecord.id ? { ...d, aiReflection: reflection } : d
    );
    setDays(finalDays);
    localStorage.setItem('noctis-days', JSON.stringify(finalDays));
  };

  // Logic: Show max 10 stars, slicing from the end
  const visibleDays = days.slice(-10);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-[#0B1026] via-[#050a14] to-black text-slate-200 font-sans selection:bg-blue-500/20">
      
      {/* Background Ambience: Extremely subtle noise/gradient overlay to prevent banding, but keep it minimal */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#000_100%)] opacity-40 pointer-events-none" />

      {/* Main Content Area */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        
        {/* The Sky (Star Container) */}
        {/* We use flex-row to arrange horizontally left to right */}
        <div className="w-full max-w-5xl flex items-end justify-around h-64 pb-20">
          {visibleDays.length === 0 ? (
            <div className="text-slate-800 text-sm font-light tracking-widest animate-pulse">
              The sky awaits your first moment.
            </div>
          ) : (
            visibleDays.map((record, index) => (
              <Star 
                key={record.id} 
                record={record} 
                index={index} 
                onClick={setSelectedDay}
              />
            ))
          )}
        </div>

      </main>

      {/* Persistent Call-to-Action */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-center z-20">
        <button
          onClick={() => setIsComposing(true)}
          className="group relative flex items-center justify-center w-12 h-12 rounded-full border border-slate-800 bg-black/20 backdrop-blur-sm text-slate-500 hover:text-slate-200 hover:border-slate-600 transition-all duration-500 ease-out"
          aria-label="Record a day"
        >
          <Plus size={18} strokeWidth={1} />
          {/* Subtle halo on hover */}
          <div className="absolute inset-0 rounded-full bg-white/5 scale-0 group-hover:scale-150 transition-transform duration-700 ease-out opacity-0 group-hover:opacity-100" />
        </button>
      </div>

      {/* Overlay Components */}
      {isComposing && (
        <Composer 
          onSave={handleSaveDay} 
          onCancel={() => setIsComposing(false)} 
        />
      )}

      {selectedDay && (
        <DetailView 
          record={selectedDay} 
          onClose={() => setSelectedDay(null)} 
        />
      )}

    </div>
  );
};

export default App;
