'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

interface Question {
  id: string;
  question: string;
  type: string;
}

export default function ForgotVerify() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 3;

  useEffect(() => {
    if (router.query.identifier && router.query.questions) {
      setIdentifier(router.query.identifier as string);
      try {
        const parsedQuestions = JSON.parse(router.query.questions as string);
        setQuestions(parsedQuestions);
      } catch (e) {
        setError('问题数据解析失败');
      }
    }
  }, [router.query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 检查是否所有问题都已回答
    if (questions.length === 0 || questions.some(q => !answers[q.id]?.trim())) {
      setError('请回答所有问题');
      return;
    }

    if (attempts >= maxAttempts) {
      setError('尝试次数过多，请稍后再试');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/forgot/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          answers: questions.map(q => ({
            questionId: q.id,
            answer: answers[q.id],
          })),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // 跳转到设置新密码页面
        router.push({
          pathname: '/auth/reset-password',
          query: {
            token: result.token,
          },
        });
      } else {
        setAttempts(prev => prev + 1);
        setError('回答似乎不太对，别急，再想想看。');
      }
    } catch (error) {
      setError('网络错误，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>验证身份 - Echo</title>
      </Head>

      <div className="flex min-h-screen items-center justify-center relative overflow-hidden bg-gradient-to-br from-teal-50/40 via-cyan-50/30 to-blue-50/40 px-4 py-8">
        {/* 波浪流线背景 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <svg className="absolute bottom-0 left-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="verifyWaveGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#5eead4" stopOpacity="0.15" />
                <stop offset="50%" stopColor="#2dd4bf" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.15" />
              </linearGradient>
            </defs>
            
            <g className="animate-verify-wave-1">
              <path
                d="M-200,450 Q100,400 400,450 T1000,450 T1600,450 L1600,800 L-200,800 Z"
                fill="url(#verifyWaveGradient1)"
              />
            </g>
          </svg>
        </div>

        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white/70 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl shadow-black/5 border border-white/60">
            {/* 标题 */}
            <div className="text-center mb-8">
              <div className="text-4xl mb-4">🧩</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                回答你的密保问题
              </h2>
            </div>

            {/* 表单 */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {questions.map((question, index) => (
                <div key={question.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-teal-600 mr-2">✦</span>
                    {question.question}
                  </label>
                  <input
                    type="text"
                    value={answers[question.id] || ''}
                    onChange={(e) => {
                      setAnswers({
                        ...answers,
                        [question.id]: e.target.value,
                      });
                      setError('');
                    }}
                    disabled={isLoading}
                    className="w-full rounded-xl border border-gray-200 bg-white/50 backdrop-blur-sm px-4 py-3 transition-all duration-200 focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-gray-400"
                    placeholder="轻声回答它，就像和自己对话。"
                    required
                  />
                </div>
              ))}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600">{error}</p>
                  {attempts > 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      剩余尝试次数：{maxAttempts - attempts}
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || attempts >= maxAttempts}
                className="group relative w-full rounded-xl bg-gradient-to-r from-teal-500 via-teal-500 to-cyan-500 px-4 py-3.5 text-white font-semibold hover:from-teal-600 hover:via-teal-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all duration-300 shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.01] overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center">
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                      验证中...
                    </>
                  ) : (
                    '提交答案'
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </button>
            </form>

            {/* 返回 */}
            <div className="mt-6 text-center">
              <button
                onClick={() => router.back()}
                className="text-sm text-gray-600 hover:text-teal-600 transition-colors"
              >
                ← 返回上一步
              </button>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes verify-wave-flow {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(200px);
            }
          }
          
          .animate-verify-wave-1 {
            animation: verify-wave-flow 15s linear infinite;
          }
        `}</style>
      </div>
    </>
  );
}






