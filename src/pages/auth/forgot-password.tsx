'use client';

import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function ForgotPassword() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('请输入邮箱或用户名');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });

      const result = await response.json();

      if (response.ok) {
        // 跳转到密保问题页面
        router.push({
          pathname: '/auth/forgot-verify',
          query: {
            identifier,
            questions: JSON.stringify(result.questions),
          },
        });
      } else {
        setError(result.error || '未找到该账户');
      }
    } catch (error) {
      setError('网络错误，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>找回密码 - Echo</title>
      </Head>

      <div className="flex min-h-screen items-center justify-center relative overflow-hidden bg-gradient-to-br from-teal-50/40 via-cyan-50/30 to-blue-50/40 px-4 py-8">
        {/* 波浪流线背景 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <svg className="absolute bottom-0 left-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="forgotWaveGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#5eead4" stopOpacity="0.15" />
                <stop offset="50%" stopColor="#2dd4bf" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.15" />
              </linearGradient>
              <linearGradient id="forgotWaveGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.12" />
                <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.12" />
              </linearGradient>
            </defs>
            
            <g className="animate-forgot-wave-1">
              <path
                d="M-200,450 Q100,400 400,450 T1000,450 T1600,450 L1600,800 L-200,800 Z"
                fill="url(#forgotWaveGradient1)"
              />
            </g>
            
            <g className="animate-forgot-wave-2">
              <path
                d="M-200,550 Q100,500 400,550 T1000,550 T1600,550 L1600,800 L-200,800 Z"
                fill="url(#forgotWaveGradient2)"
              />
            </g>
          </svg>
        </div>

        <div className="relative z-10 w-full max-w-md">
          {/* Logo 和品牌区域 */}
          <div className="text-center mb-10 animate-fade-in-up">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-6 relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity"></div>
              <div className="relative bg-gradient-to-br from-teal-500 via-teal-400 to-cyan-500 rounded-2xl p-3 shadow-xl shadow-teal-500/30 transform group-hover:scale-105 transition-transform">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2 tracking-tight">Echo</h1>
          </div>

          <div className="bg-white/70 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl shadow-black/5 border border-white/60 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            {/* 标题 */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                记忆有时沉睡，但你并未遗忘。
              </h2>
              <p className="text-gray-600 text-base">
                让我们一同唤醒它。请输入你曾留给自己的答案。
              </p>
            </div>

            {/* 表单 */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  邮箱或用户名
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setError('');
                  }}
                  disabled={isLoading}
                  className="w-full rounded-xl border border-gray-200 bg-white/50 backdrop-blur-sm px-4 py-3 transition-all duration-200 focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-gray-400"
                  placeholder="输入你的邮箱或用户名"
                  required
                />
                {error && (
                  <p className="mt-2 text-sm text-red-500">{error}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full rounded-xl bg-gradient-to-r from-teal-500 via-teal-500 to-cyan-500 px-4 py-3.5 text-white font-semibold hover:from-teal-600 hover:via-teal-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all duration-300 shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.01] overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center">
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                      处理中...
                    </>
                  ) : (
                    <>
                      开始找回之旅
                      <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </button>
            </form>

            {/* 返回登录 */}
            <div className="mt-6 text-center">
              <button
                onClick={() => router.push('/auth/signin')}
                className="text-sm text-gray-600 hover:text-teal-600 transition-colors"
              >
                ← 返回登录
              </button>
            </div>
          </div>
        </div>

        {/* CSS动画 */}
        <style jsx>{`
          @keyframes fade-in-up {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-in-up {
            animation: fade-in-up 0.6s ease-out forwards;
          }
          
          @keyframes forgot-wave-flow {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(200px);
            }
          }
          
          .animate-forgot-wave-1 {
            animation: forgot-wave-flow 15s linear infinite;
          }
          
          .animate-forgot-wave-2 {
            animation: forgot-wave-flow 20s linear infinite;
            animation-direction: reverse;
          }
        `}</style>
      </div>
    </>
  );
}



