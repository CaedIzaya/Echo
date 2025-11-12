'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function SecurityGuideCard() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 检查是否已经设置过密保问题
    const hasSecurityQuestions = localStorage.getItem('hasSecurityQuestions') === 'true';
    
    // 检查是否已经关闭过引导
    const dismissed = localStorage.getItem('securityGuideDismissed') === 'true';
    
    // 检查登录次数
    const loginCount = parseInt(localStorage.getItem('loginCount') || '0');
    
    // 检查下次提醒时间
    const nextReminder = parseInt(localStorage.getItem('nextSecurityReminder') || '0');
    
    if (!hasSecurityQuestions && !dismissed) {
      // 首次登录或达到提醒时间
      if (loginCount === 1 || (nextReminder > 0 && loginCount >= nextReminder)) {
        setIsVisible(true);
      }
    }
  }, []);

  const handleSetNow = () => {
    setIsVisible(false);
    router.push('/profile/security-questions');
  };

  const handleLater = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('securityGuideDismissed', 'true');
    
    // 设置下次提醒时间（3次登录后）
    const loginCount = parseInt(localStorage.getItem('loginCount') || '0');
    localStorage.setItem('nextSecurityReminder', (loginCount + 3).toString());
  };

  if (!isVisible || isDismissed) {
    return null;
  }

  return (
    <div className="mb-6 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-3xl p-6 shadow-lg border border-teal-100/50 animate-fade-in">
      <div className="flex items-start gap-4">
        <div className="text-3xl">🪞</div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            记忆也需要备份
          </h3>
          <p className="text-gray-700 text-sm mb-4">
            为了防止未来的你被遗忘，建议现在设置一份「自我契约」。
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleSetNow}
              className="flex-1 py-2.5 px-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-semibold text-sm hover:from-teal-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg"
            >
              去设置
            </button>
            <button
              onClick={handleLater}
              className="flex-1 py-2.5 px-4 bg-white/80 text-gray-700 rounded-xl font-medium text-sm hover:bg-white transition-all border border-gray-200"
            >
              以后提醒我
            </button>
          </div>
        </div>
        <button
          onClick={handleLater}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/50 transition-colors text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}

