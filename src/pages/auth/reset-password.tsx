'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';
import Head from 'next/head';

export default function ResetPassword() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (router.query.token) {
      setToken(router.query.token as string);
    }
  }, [router.query]);

  const validatePassword = (password: string): string => {
    if (password.length < 8) {
      return '密码至少需要8位字符';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newPwdError = validatePassword(formData.newPassword);
    const confirmPwdError = formData.newPassword !== formData.confirmPassword 
      ? '两次输入的密码不一致' 
      : '';

    setErrors({
      newPassword: newPwdError,
      confirmPassword: confirmPwdError,
    });

    if (!newPwdError && !confirmPwdError) {
      setIsLoading(true);
      try {
        const response = await fetch('/api/auth/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            newPassword: formData.newPassword,
            confirmPassword: formData.confirmPassword,
          }),
        });

        const result = await response.json();

        if (response.ok) {
          setSuccess(true);
          // 自动登录
          setTimeout(async () => {
            await signIn('credentials', {
              email: result.email,
              password: formData.newPassword,
              redirect: false,
            });
            router.push('/dashboard');
          }, 2000);
        } else {
          setErrors({ ...errors, newPassword: result.error || '重置失败' });
        }
      } catch (error) {
        setErrors({ ...errors, newPassword: '网络错误，请重试' });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <>
      <Head>
        <title>设置新密码 - Echo</title>
      </Head>

      <div className="flex min-h-screen items-center justify-center relative overflow-hidden bg-gradient-to-br from-teal-50/40 via-cyan-50/30 to-blue-50/40 px-4 py-8">
        {/* 波浪流线背景 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <svg className="absolute bottom-0 left-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="resetWaveGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#5eead4" stopOpacity="0.15" />
                <stop offset="50%" stopColor="#2dd4bf" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.15" />
              </linearGradient>
            </defs>
            
            <g className="animate-reset-wave-1">
              <path
                d="M-200,450 Q100,400 400,450 T1000,450 T1600,450 L1600,800 L-200,800 Z"
                fill="url(#resetWaveGradient1)"
              />
            </g>
          </svg>
        </div>

        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white/70 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl shadow-black/5 border border-white/60">
            {success ? (
              <div className="text-center">
                <div className="text-5xl mb-4">✦</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  记忆与专注重新归位。
                </h2>
                <p className="text-gray-600 mb-6">
                  欢迎回到你的心流绿洲。
                </p>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
                <p className="mt-4 text-sm text-gray-500">正在登录...</p>
              </div>
            ) : (
              <>
                {/* 标题 */}
                <div className="text-center mb-8">
                  <div className="text-4xl mb-4">🌿</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    重生，不必推倒重来。
                  </h2>
                  <p className="text-gray-600 text-base">
                    为你的旅途重新赋予钥匙。
                    <br />
                    <span className="text-sm text-gray-500">如果你愿意，也可以沿用旧的。</span>
                  </p>
                </div>

                {/* 表单 */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      新密码
                    </label>
                    <input
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) => {
                        setFormData({ ...formData, newPassword: e.target.value });
                        const error = validatePassword(e.target.value);
                        setErrors({ ...errors, newPassword: error });
                        if (formData.confirmPassword) {
                          setErrors({
                            ...errors,
                            newPassword: error,
                            confirmPassword: e.target.value !== formData.confirmPassword ? '两次输入的密码不一致' : '',
                          });
                        }
                      }}
                      className={`w-full rounded-xl border bg-white/50 backdrop-blur-sm px-4 py-3 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 ${
                        errors.newPassword ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-teal-400'
                      }`}
                      placeholder="至少8位字符"
                      required
                    />
                    {errors.newPassword && (
                      <p className="mt-1.5 text-sm text-red-500">{errors.newPassword}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      再次确认密码
                    </label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => {
                        setFormData({ ...formData, confirmPassword: e.target.value });
                        const error = formData.newPassword !== e.target.value ? '两次输入的密码不一致' : '';
                        setErrors({ ...errors, confirmPassword: error });
                      }}
                      className={`w-full rounded-xl border bg-white/50 backdrop-blur-sm px-4 py-3 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 ${
                        errors.confirmPassword ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-teal-400'
                      }`}
                      placeholder="请再次输入新密码"
                      required
                    />
                    {errors.confirmPassword && (
                      <p className="mt-1.5 text-sm text-red-500">{errors.confirmPassword}</p>
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
                        '完成重生'
                      )}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        <style jsx>{`
          @keyframes reset-wave-flow {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(200px);
            }
          }
          
          .animate-reset-wave-1 {
            animation: reset-wave-flow 15s linear infinite;
          }
        `}</style>
      </div>
    </>
  );
}










