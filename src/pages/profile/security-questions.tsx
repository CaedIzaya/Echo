import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import BottomNavigation from '../dashboard/BottomNavigation';

interface QuestionTemplate {
  id: string;
  question: string;
  type: 'memory' | 'symbolic';
  category: string;
}

const QUESTION_TEMPLATES: QuestionTemplate[] = [
  // 回忆型
  {
    id: 'memory_1',
    question: '你第一次认真思考"自己是谁"是在什么地方？',
    type: 'memory',
    category: '回忆型',
  },
  {
    id: 'memory_2',
    question: '哪一首歌陪你走过最难的时光？',
    type: 'memory',
    category: '回忆型',
  },
  {
    id: 'memory_3',
    question: '你最早开始改变自己的契机是什么？',
    type: 'memory',
    category: '回忆型',
  },
  {
    id: 'memory_4',
    question: '那个让你决定不再逃避的瞬间是什么？',
    type: 'memory',
    category: '回忆型',
  },
  {
    id: 'memory_5',
    question: '你曾最信任的事物是什么？',
    type: 'memory',
    category: '回忆型',
  },
  // 象征型
  {
    id: 'symbolic_1',
    question: '如果你是一种自然力量，你会是什么？',
    type: 'symbolic',
    category: '象征型',
  },
  {
    id: 'symbolic_2',
    question: '如果心灵是一棵树，它现在结的果实是什么颜色？',
    type: 'symbolic',
    category: '象征型',
  },
  {
    id: 'symbolic_3',
    question: '哪个词最能代表你的精神？',
    type: 'symbolic',
    category: '象征型',
  },
  {
    id: 'symbolic_4',
    question: '如果「混沌」有形状，对你来说是什么样的？',
    type: 'symbolic',
    category: '象征型',
  },
  {
    id: 'symbolic_5',
    question: '你最愿意守护的光是什么？',
    type: 'symbolic',
    category: '象征型',
  },
];

export default function SecurityQuestions() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [selectedType, setSelectedType] = useState<'template' | 'custom'>('template');
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionTemplate | null>(null);
  const [customQuestion, setCustomQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [confirmAnswer, setConfirmAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const question = selectedType === 'template' 
      ? selectedQuestion?.question 
      : customQuestion.trim();
    
    if (!question) {
      setError('请选择或输入一个问题');
      return;
    }

    if (!answer.trim()) {
      setError('请输入答案');
      return;
    }

    if (answer !== confirmAnswer) {
      setError('两次输入的答案不一致，请确保拼写一致');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/user/security/set-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: [{
            question,
            answer: answer.trim(),
          }],
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // 标记已设置密保问题
        if (typeof window !== 'undefined') {
          localStorage.setItem('hasSecurityQuestions', 'true');
          localStorage.removeItem('securityGuideDismissed');
        }
        setSuccess(true);
        setTimeout(() => {
          router.push('/profile');
        }, 2000);
      } else {
        setError(result.error || '设置失败');
      }
    } catch (error) {
      setError('网络错误，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50/40 via-cyan-50/30 to-blue-50/40 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>设置密保问题 - Echo</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-teal-50/40 via-cyan-50/30 to-blue-50/40 pb-20">
        {/* 顶部头部 */}
        <div className="bg-white/60 backdrop-blur-2xl border-b border-white/60 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.back()}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100/50 transition-colors"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900">设置密保问题</h1>
              <div className="w-10"></div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-6 py-8">
          <div className="bg-white/70 backdrop-blur-2xl rounded-3xl p-8 shadow-lg border border-white/60">
            {success ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">✨</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  我会替你记住它，但真正的答案，永远属于你。
                </h2>
                <p className="text-gray-600">密保问题设置成功</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    这是你与自己的约定
                  </h2>
                  <p className="text-gray-600">
                    写下只有你才能回答的问题。
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* 问题类型选择 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      选择问题类型
                    </label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedType('template');
                          setSelectedQuestion(null);
                          setCustomQuestion('');
                        }}
                        className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                          selectedType === 'template'
                            ? 'bg-teal-100 text-teal-700 border-2 border-teal-500'
                            : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                        }`}
                      >
                        选择模板问题
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedType('custom');
                          setSelectedQuestion(null);
                        }}
                        className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                          selectedType === 'custom'
                            ? 'bg-teal-100 text-teal-700 border-2 border-teal-500'
                            : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                        }`}
                      >
                        自定义问题
                      </button>
                    </div>
                  </div>

                  {/* 模板问题选择 */}
                  {selectedType === 'template' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        选择一个问题
                      </label>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {QUESTION_TEMPLATES.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => setSelectedQuestion(template)}
                            className={`w-full text-left p-3 rounded-xl transition-all ${
                              selectedQuestion?.id === template.id
                                ? 'bg-teal-50 border-2 border-teal-500'
                                : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-teal-600 mt-0.5">✦</span>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{template.question}</p>
                                <p className="text-xs text-gray-500 mt-1">{template.category}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 自定义问题输入 */}
                  {selectedType === 'custom' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        自定义问题
                      </label>
                      <input
                        type="text"
                        value={customQuestion}
                        onChange={(e) => setCustomQuestion(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white/50 backdrop-blur-sm px-4 py-3 transition-all duration-200 focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        placeholder="你可以设置一个只有自己理解的问题，它将成为你与自己之间的契约。"
                      />
                    </div>
                  )}

                  {/* 答案输入 */}
                  {(selectedQuestion || customQuestion) && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          答案
                        </label>
                        <input
                          type="text"
                          value={answer}
                          onChange={(e) => {
                            setAnswer(e.target.value);
                            setError('');
                          }}
                          className="w-full rounded-xl border border-gray-200 bg-white/50 backdrop-blur-sm px-4 py-3 transition-all duration-200 focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                          placeholder="像对自己轻声说出那句真诚的话。"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          再次确认答案
                        </label>
                        <input
                          type="text"
                          value={confirmAnswer}
                          onChange={(e) => {
                            setConfirmAnswer(e.target.value);
                            setError('');
                          }}
                          className={`w-full rounded-xl border bg-white/50 backdrop-blur-sm px-4 py-3 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 ${
                            error && answer !== confirmAnswer ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-teal-400'
                          }`}
                          placeholder="请确保拼写一致"
                          required
                        />
                        <p className="mt-1.5 text-xs text-gray-500">请确保拼写一致</p>
                      </div>
                    </>
                  )}

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || !answer || !confirmAnswer}
                    className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-teal-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? '设置中...' : '完成设置'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      <BottomNavigation active="home" />
    </>
  );
}

