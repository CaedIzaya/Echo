import { useState } from 'react';
import { useInstallPrompt, type InstallState } from '~/hooks/useInstallPrompt';

interface InstallCardProps {
  onClose: () => void;
}

export default function InstallCard({ onClose }: InstallCardProps) {
  const { state, install, dismiss } = useInstallPrompt();
  const [installing, setInstalling] = useState(false);

  const handleInstall = async () => {
    setInstalling(true);
    const outcome = await install();
    setInstalling(false);
    if (outcome === 'accepted') {
      onClose();
    }
  };

  const handleDismiss = () => {
    dismiss();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleDismiss} />

      <div
        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
        style={{ animation: 'installCardEnter 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 pt-8 pb-6 text-center overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/15 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-500/15 rounded-full blur-2xl" />
          <div className="relative z-10">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/40 mb-4 overflow-hidden">
              <img src="/Echo Icon.png" alt="Echo" className="w-full h-full object-cover scale-150" />
            </div>
            <h3 className="text-lg font-bold text-white">安装 Echo 桌面 App</h3>
            <p className="text-sm text-slate-400 mt-1">不到 1 MB · 独立窗口 · 零干扰</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {state === 'available' && (
            <>
              <p className="text-sm text-gray-600 text-center leading-relaxed">
                安装后 Echo 以独立窗口打开，没有地址栏和标签页干扰，打开即专注。
              </p>
              <button
                onClick={handleInstall}
                disabled={installing}
                className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold rounded-2xl shadow-lg shadow-teal-500/30 active:scale-95 transition-transform disabled:opacity-60"
              >
                {installing ? '安装中...' : '一键安装'}
              </button>
            </>
          )}

          {state === 'ios' && (
            <>
              <p className="text-sm text-gray-600 text-center leading-relaxed">
                在 Safari 中点击底部
                <span className="inline-flex items-center mx-1 px-1.5 py-0.5 bg-gray-100 rounded text-xs font-medium">
                  分享
                </span>
                按钮，选择「添加到主屏幕」即可。
              </p>
            </>
          )}

          {state === 'idle' && (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 text-center leading-relaxed">
                当前浏览器暂不支持一键安装，请使用 <span className="font-medium text-gray-700">Chrome</span> 或 <span className="font-medium text-gray-700">Edge</span> 打开后再试。
              </p>
            </div>
          )}

          <div className="flex items-center justify-center gap-4 pt-1">
            <button onClick={handleDismiss} className="text-sm text-gray-400 hover:text-gray-600 transition">
              暂时不用
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center">
            Echo 本身就是 Web App，不安装也能正常使用
          </p>
        </div>

        <style jsx>{`
          @keyframes installCardEnter {
            from { opacity: 0; transform: translateY(40px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
      </div>
    </div>
  );
}

/**
 * Lightweight install hint — a small floating badge shown after the user
 * dismissed the full install card (7-day cooldown active).
 */
export function InstallHint({ onClick }: { onClick: () => void }) {
  const { state, dismissed } = useInstallPrompt();

  if (state === 'installed' || !dismissed) return null;
  if (state !== 'available' && state !== 'ios') return null;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 border border-teal-200/60 shadow-sm text-xs text-teal-600 font-medium hover:bg-teal-50 transition-all"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      安装 App
    </button>
  );
}
