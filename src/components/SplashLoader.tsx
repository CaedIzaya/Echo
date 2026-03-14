/**
 * Unified loading screen used across all pages.
 * `variant="full"` (default) — full-screen gradient splash with bouncing dots.
 * `variant="inline"` — compact loader for sections / modals.
 */
export default function SplashLoader({
  message = '专注准备中',
  variant = 'full',
}: {
  message?: string;
  variant?: 'full' | 'inline';
}) {
  const dots = (count: number, size: string, gap: string, bounce: string) => (
    <span className={`inline-flex ${gap}`}>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={`splash-dot ${size} rounded-full bg-current`}
          style={{ animationDelay: `${i * 0.18}s`, animation: `${bounce} 1.2s ease-in-out infinite` }}
        />
      ))}
    </span>
  );

  if (variant === 'inline') {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <p className="text-sm text-teal-600 font-medium">{message}</p>
        {dots(3, 'w-[6px] h-[6px]', 'gap-[5px]', 'splash-bounce-sm')}
        <style jsx>{`
          @keyframes splash-bounce-sm {
            0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
            40% { transform: translateY(-5px); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-500 text-white flex flex-col items-center justify-center select-none">
      <p className="text-2xl md:text-3xl font-semibold tracking-widest mb-6">
        {message}
      </p>

      <div className="flex gap-[10px]">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="splash-dot w-[10px] h-[10px] rounded-full bg-white/90"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>

      <style jsx>{`
        .splash-dot {
          animation: splash-bounce 1.4s ease-in-out infinite;
        }
        @keyframes splash-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.3; }
          30% { transform: translateY(-14px); opacity: 1; }
          50% { transform: translateY(0); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
