import dynamic from 'next/dynamic';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import { getServerSession } from 'next-auth/next';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { authOptions } from './api/auth/[...nextauth]';
import type { LumiHistoryMessage, LumiResponse } from '~/server/lumi/schema';
import { trackEvent } from '~/lib/analytics';

interface ProjectInfo {
  id: string;
  name: string;
  icon: string;
  milestoneCount: number;
}

interface ConfirmPlanData {
  name: string;
  dailyGoalMinutes: number;
  milestones: string[];
}

interface AddMilestoneData {
  projectId: string;
  projectName: string;
  milestones: string[];
}

type MessageSender = 'user' | 'lumi';
type LumiModePreference = 'chat' | 'plan';
type SpiritAnimation = 'happy' | 'nod' | 'excited';

type SpiritAutoAnimation = {
  token: number;
  type: SpiritAnimation;
  durationMs?: number;
};

interface ChatMessage {
  id: string;
  sender: MessageSender;
  text: string;
  response?: LumiResponse;
}

const GREETING_POOL = [
  '我在这里。今天想随便聊聊，还是一起理一理思绪？',
  '要不要我陪你说会儿话？或者，我们也可以把脑袋里的线头整理一下。',
  '今天想轻松一点，还是想把事情理清楚一点？',
];

const QUICK_PROMPTS = [
  { label: '想随便聊聊', text: '今天想随便聊聊。', mode: 'chat' as const },
  { label: '帮我理一理', text: '我想把现在的想法理一理。', mode: 'plan' as const },
  { label: '今天有点乱', text: '今天整个人有点乱，不太想做事。', mode: 'chat' as const },
];

const SPIRIT_ANIMATIONS: SpiritAnimation[] = ['happy', 'nod', 'excited'];

const pickRandom = <T,>(pool: T[]): T => {
  return pool[Math.floor(Math.random() * pool.length)] as T;
};

function DraftStatusRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-[5.5rem] shrink-0 text-[11px] text-zinc-400">{label}</span>
      {value ? (
        <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] text-teal-700">
          {value} ✓
        </span>
      ) : (
        <span className="text-[11px] text-zinc-300">待补充</span>
      )}
    </div>
  );
}

function LumiDraftCard({ response }: { response: LumiResponse }) {
  const { draft } = response;
  const microGoal = draft.micro_goals[0] ?? null;
  const planName = draft.goal;
  const duration = response.future_create_payload?.dailyGoalMinutes ?? null;

  const hasAnyProgress = !!planName || !!microGoal || duration !== null || !!draft.summary;

  if (!hasAnyProgress) {
    return null;
  }

  return (
    <div className="mt-3 rounded-[1.2rem] border border-teal-100/90 bg-white/75 p-3 text-xs text-zinc-600 shadow-sm shadow-teal-100/40">
      {draft.summary && (
        <p className="mb-2 leading-6 text-zinc-700">{draft.summary}</p>
      )}
      <div className="space-y-1.5">
        <DraftStatusRow label="第一个小目标" value={microGoal} />
        <DraftStatusRow label="计划名称" value={planName} />
        <DraftStatusRow
          label="每日专注时长"
          value={duration !== null ? `${duration} 分钟` : null}
        />
      </div>
      {draft.missing_info.length > 0 && (
        <p className="mt-2 text-[11px] text-zinc-400">
          下一步：{draft.missing_info[0]}
        </p>
      )}
    </div>
  );
}

function SpiritPlaceholder({ mobile = false }: { mobile?: boolean }) {
  const sizeClass = mobile ? 'h-[132px] w-[132px]' : 'h-[150px] w-[150px]';

  return (
    <div
      className={`${sizeClass} animate-pulse rounded-full bg-gradient-to-br from-[#fff8d6] via-[#fff2ba] to-[#ffe08f] shadow-[0_0_40px_rgba(255,214,133,0.5)]`}
    />
  );
}

const LumiSpiritDesktop = dynamic(() => import('./dashboard/EchoSpirit'), {
  ssr: false,
  loading: () => <SpiritPlaceholder />,
});

// LumiSpiritMobile removed: mobile layout no longer renders spirit animation

export default function LumiPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [modePreference, setModePreference] = useState<LumiModePreference>('chat');
  const [autoAnimation, setAutoAnimation] = useState<SpiritAutoAnimation | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [confirmPlanData, setConfirmPlanData] = useState<ConfirmPlanData | null>(null);
  const [addMilestoneData, setAddMilestoneData] = useState<AddMilestoneData | null>(null);
  const [pendingPlanPayload, setPendingPlanPayload] = useState<{
    payload: NonNullable<LumiResponse['future_create_payload']>;
    draft: LumiResponse['draft'];
  } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showDisclaimerBanner, setShowDisclaimerBanner] = useState(false);
  const hasBootedRef = useRef(false);
  const hasAppliedEntryQueryRef = useRef(false);
  const animationTokenRef = useRef(0);
  const hasTrackedSessionStartRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const latestStructuredReply = useMemo(() => {
    return [...messages]
      .reverse()
      .find((message) => message.sender === 'lumi' && message.response)?.response ?? null;
  }, [messages]);

  const headerHint = useMemo(() => {
    if (isReplying) return 'Lumi 正在轻轻整理话语...';
    if (latestStructuredReply?.draft.ready_to_confirm) {
      return '信息已齐全，可以创建计划了。';
    }
    if (modePreference === 'plan') {
      return '一步一步来，我们把想法变成一个小计划。';
    }
    return '你可以随便聊，也可以慢慢把线头理成计划。';
  }, [isReplying, latestStructuredReply, modePreference]);

  const returnPath = useMemo(() => {
    const raw = router.query.returnTo;
    return typeof raw === 'string' && raw.startsWith('/') ? raw : '/dashboard';
  }, [router.query.returnTo]);

  const triggerAnimation = () => {
    animationTokenRef.current += 1;
    setAutoAnimation({
      token: animationTokenRef.current,
      type: pickRandom(SPIRIT_ANIMATIONS),
      durationMs: 1800,
    });
  };

  const pushLumiMessage = (text: string, response?: LumiResponse) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `lumi-${Date.now()}-${prev.length}`,
        sender: 'lumi',
        text,
        response,
      },
    ]);
    triggerAnimation();
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(max-width: 639px)');
    const applyViewport = () => setIsMobileViewport(mediaQuery.matches);
    applyViewport();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', applyViewport);
      return () => mediaQuery.removeEventListener('change', applyViewport);
    }

    mediaQuery.addListener(applyViewport);
    return () => mediaQuery.removeListener(applyViewport);
  }, []);

  useEffect(() => {
    if (hasBootedRef.current) return;
    hasBootedRef.current = true;

    const disclaimerKey = 'lumi-disclaimer-seen';
    if (typeof window !== 'undefined' && !localStorage.getItem(disclaimerKey)) {
      setShowDisclaimerBanner(true);
      localStorage.setItem(disclaimerKey, '1');
    }

    setMessages([
      {
        id: 'lumi-greeting',
        sender: 'lumi',
        text: pickRandom(GREETING_POOL),
      },
    ]);
    triggerAnimation();
  }, []);

  useEffect(() => {
    if (!router.isReady || hasAppliedEntryQueryRef.current) return;

    const queryMode = router.query.mode;
    const queryPrompt = router.query.prompt;

    if (queryMode === 'plan') {
      setModePreference('plan');
    }

    if (typeof queryPrompt === 'string' && queryPrompt.trim()) {
      setInputValue(queryPrompt.trim());
    }

    hasAppliedEntryQueryRef.current = true;
  }, [router.isReady, router.query.mode, router.query.prompt]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isReplying]);

  const sendMessage = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || isReplying) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}-${messages.length}`,
      sender: 'user',
      text,
    };
    const history: LumiHistoryMessage[] = messages
      .slice(-6)
      .map((message) => ({
        sender: message.sender,
        text: message.text,
      }));

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setRequestError(null);
    setIsReplying(true);

    if (!hasTrackedSessionStartRef.current) {
      hasTrackedSessionStartRef.current = true;
      const queryMode = router.query.mode;
      const queryPrompt = router.query.prompt;
      const entry = queryMode === 'plan' || queryPrompt
        ? 'query_plan'
        : router.query.returnTo
          ? 'dashboard_button'
          : 'url_direct';
      trackEvent({ name: 'lumi_session_start', feature: 'lumi', page: '/lumi', action: 'start', properties: { entry } });
    }

    let hasPushedReply = false;

    try {
      const response = await fetch('/api/lumi/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          modePreference,
          history,
        }),
      });

      if (response.status === 401) {
        await router.replace('/auth/signin?callbackUrl=%2Flumi');
        return;
      }

      const data = (await response.json()) as {
        error?: string;
        message?: string;
        reply?: LumiResponse;
      };

      if (data.reply) {
        pushLumiMessage(data.reply.lumi_reply, data.reply);
        hasPushedReply = true;

        if (data.reply.mode === 'plan' || data.reply.mode === 'mixed') {
          setModePreference('plan');
        } else if (data.reply.mode === 'chat') {
          setModePreference('chat');
        }

        if (
          data.reply.ui_action === 'confirm_generation' &&
          data.reply.future_create_payload?.ready
        ) {
          const payload = data.reply.future_create_payload;
          if (payload.action === 'create_project') {
            setPendingPlanPayload({ payload, draft: data.reply.draft });
          } else if (payload.action === 'add_milestones' && payload.projectId) {
            setAddMilestoneData({
              projectId: payload.projectId,
              projectName: payload.name || '',
              milestones: payload.milestones.map((m) => m.title),
            });
          }
        }
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || '发送失败');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '发送失败';
      if (!hasPushedReply) {
        pushLumiMessage('我刚刚有一点没接稳。你可以再发一次，我会继续在这里。');
      }
      setRequestError(message === 'Lumi 暂时没有接稳这句话' ? 'Lumi 的结构化输出刚刚没接稳，我已经在收紧格式。你可以再试一次。' : message);
    } finally {
      setIsReplying(false);
    }
  };

  const openConfirmPlanModal = useCallback(() => {
    if (!pendingPlanPayload) return;
    const { payload, draft } = pendingPlanPayload;

    const milestones = payload.milestones.length > 0
      ? payload.milestones.map((m) => m.title)
      : draft.micro_goals.length > 0
        ? [...draft.micro_goals]
        : [];

    setConfirmPlanData({
      name: payload.name || draft.goal || '',
      dailyGoalMinutes: payload.dailyGoalMinutes || 25,
      milestones,
    });
  }, [pendingPlanPayload]);

  const handleProjectSelect = useCallback((project: ProjectInfo) => {
    void sendMessage(`我选择「${project.name}」`);
  }, []);

  const handleConfirmPlan = useCallback(async (data: ConfirmPlanData) => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          icon: '🎯',
          dailyGoalMinutes: data.dailyGoalMinutes,
          milestones: data.milestones
            .filter((title) => title.trim())
            .map((title, index) => ({
              title: title.trim(),
              order: index,
            })),
        }),
      });

      if (!response.ok) throw new Error('创建失败');

      trackEvent({
        name: 'lumi_plan_created',
        feature: 'lumi',
        page: '/lumi',
        action: 'create',
        properties: {
          milestoneCount: data.milestones.filter((t) => t.trim()).length,
          dailyGoalMinutes: data.dailyGoalMinutes,
        },
      });

      setConfirmPlanData(null);
      setPendingPlanPayload(null);
      pushLumiMessage(
        `「${data.name}」已经创建好了！每天 ${data.dailyGoalMinutes} 分钟，慢慢来，我陪着你。`,
      );
    } catch {
      pushLumiMessage('创建计划时遇到了一点问题，你可以稍后再试。');
    } finally {
      setIsCreating(false);
    }
  }, []);

  const handleAddMilestones = useCallback(async (data: AddMilestoneData) => {
    setIsCreating(true);
    try {
      await Promise.all(
        data.milestones.map((title, index) =>
          fetch(`/api/projects/${data.projectId}/milestones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, order: index }),
          }).then((res) => {
            if (!res.ok) throw new Error('添加失败');
          }),
        ),
      );

      setAddMilestoneData(null);
      const count = data.milestones.length;
      pushLumiMessage(
        `已经往「${data.projectName}」里加了 ${count} 个小目标。一步一步来就好。`,
      );
    } catch {
      pushLumiMessage('添加小目标时遇到了一点问题，你可以稍后再试。');
    } finally {
      setIsCreating(false);
    }
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(inputValue);
  };

  return (
    <>
      <Head>
        <title>Lumi 对话室</title>
      </Head>

      {/* ===== MOBILE LAYOUT ===== */}
      {isMobileViewport ? (
        <div className="flex flex-col h-[100dvh] bg-white text-zinc-800">
          <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 shrink-0">
            <button
              onClick={() => router.push(returnPath)}
              className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 transition"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${isReplying ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
              <span className="text-[15px] font-semibold text-zinc-900">Lumi</span>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setModePreference('chat')}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                  modePreference === 'chat'
                    ? 'bg-zinc-800 text-white'
                    : 'bg-zinc-100 text-zinc-500'
                }`}
              >
                聊聊
              </button>
              <button
                type="button"
                onClick={() => setModePreference('plan')}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                  modePreference === 'plan'
                    ? 'bg-teal-500 text-white'
                    : 'bg-zinc-100 text-zinc-500'
                }`}
              >
                整理
              </button>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {showDisclaimerBanner && (
              <div className="animate-[messageRise_320ms_ease-out] rounded-xl bg-amber-50/80 px-3 py-2 text-[11px] leading-5 text-zinc-400">
                Lumi 由 AI 生成回复，仅供参考，不替代专业建议。
              </div>
            )}

            {messages.map((message, messageIndex) => (
              <div key={message.id}>
                <div
                  className={`flex animate-[messageRise_320ms_ease-out] ${
                    message.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.sender === 'lumi' && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-cyan-400 flex items-center justify-center mr-2 mt-0.5 shrink-0">
                      <span className="text-[10px] text-white font-bold">L</span>
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-6 ${
                      message.sender === 'user'
                        ? 'rounded-br-sm bg-gradient-to-r from-teal-500 to-cyan-500 text-white'
                        : 'rounded-bl-sm bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    {message.text}
                    {message.sender === 'lumi' && message.response && (
                      <LumiDraftCard response={message.response} />
                    )}
                  </div>
                </div>

                {message.sender === 'lumi' &&
                  messageIndex === messages.length - 1 &&
                  !isReplying && (
                    <div className="mt-2 flex flex-wrap gap-1.5 pl-9 animate-[messageRise_320ms_ease-out]">
                      {pendingPlanPayload &&
                        message.response?.ui_action === 'confirm_generation' && (
                          <button
                            type="button"
                            onClick={openConfirmPlanModal}
                            className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-600 transition hover:bg-teal-100"
                          >
                            ✏️ 查看并编辑
                          </button>
                        )}
                      {message.response?.suggestions
                        ?.filter(Boolean)
                        .map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => void sendMessage(suggestion)}
                            className="rounded-full border border-teal-100 bg-teal-50/80 px-3 py-1 text-xs text-teal-600 transition hover:bg-teal-100"
                          >
                            {suggestion}
                          </button>
                        ))}
                    </div>
                  )}

                {message.sender === 'lumi' &&
                  message.response?.future_create_payload?.action === 'add_milestones' &&
                  !message.response.future_create_payload.projectId &&
                  messageIndex === messages.length - 1 &&
                  !isReplying && (
                    <ProjectSelector onSelect={handleProjectSelect} />
                  )}
              </div>
            ))}

            {isReplying && (
              <div className="flex animate-[messageRise_320ms_ease-out] justify-start">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-cyan-400 flex items-center justify-center mr-2 mt-0.5 shrink-0">
                  <span className="text-[10px] text-white font-bold">L</span>
                </div>
                <div className="rounded-2xl rounded-bl-sm bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-400">
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-[typingDot_1s_ease-in-out_infinite]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-[typingDot_1s_ease-in-out_0.2s_infinite]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-[typingDot_1s_ease-in-out_0.4s_infinite]" />
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-zinc-100 bg-white px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
            {messages.length <= 1 && !isReplying && (
              <div className="mb-2.5 flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt.label}
                    type="button"
                    onClick={() => {
                      setModePreference(prompt.mode);
                      void sendMessage(prompt.text);
                    }}
                    className="shrink-0 rounded-full border border-teal-100 bg-teal-50/80 px-3 py-1.5 text-xs text-teal-600 transition hover:bg-teal-100"
                  >
                    {prompt.label}
                  </button>
                ))}
              </div>
            )}

            {requestError && (
              <p className="mb-2 rounded-xl bg-rose-50 px-3 py-1.5 text-[11px] leading-5 text-rose-600">
                {requestError}
              </p>
            )}

            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <label className="sr-only" htmlFor="lumi-message-mobile">
                输入消息
              </label>
              <textarea
                id="lumi-message-mobile"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    if (inputValue.trim() && !isReplying) void sendMessage(inputValue);
                  }
                }}
                placeholder={modePreference === 'chat' ? '想说点什么...' : '想整理哪一块...'}
                rows={1}
                className="flex-1 resize-none rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-700 outline-none placeholder:text-zinc-400 focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100/70"
                style={{ maxHeight: '120px' }}
                onInput={(e) => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 120) + 'px';
                }}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isReplying}
                className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white flex items-center justify-center shadow-sm transition disabled:opacity-35"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </form>
            <p className="mt-2 mb-1 text-center text-[10px] leading-4 text-zinc-400">
              AI 回复仅供参考 · <Link href="/legal/terms" className="underline underline-offset-2">条款</Link>
            </p>
          </div>
        </div>
      ) : (
        /* ===== DESKTOP LAYOUT ===== */
        <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(153,232,214,0.35),_transparent_38%),linear-gradient(180deg,_#f7fffc_0%,_#fefcf6_45%,_#f6fbff_100%)] text-zinc-800">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-[-8rem] top-[-4rem] h-64 w-64 rounded-full bg-teal-200/30 blur-3xl animate-[floatCloud_14s_ease-in-out_infinite]" />
            <div className="absolute right-[-6rem] top-24 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl animate-[floatCloud_18s_ease-in-out_infinite_reverse]" />
            <div className="absolute bottom-[-4rem] left-1/3 h-56 w-56 rounded-full bg-cyan-100/40 blur-3xl animate-[floatCloud_16s_ease-in-out_infinite]" />
          </div>

          <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6 lg:px-8">
            <div className="mb-6 flex items-center justify-between">
              <button
                onClick={() => router.push(returnPath)}
                className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm shadow-teal-100/60 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                返回主页
              </button>
              <div className="rounded-full border border-teal-100/80 bg-white/70 px-3 py-1 text-xs tracking-[0.24em] text-teal-500 shadow-sm">
                LUMI ROOM
              </div>
            </div>

            <section className="grid flex-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
              <aside className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(152,211,197,0.18)] backdrop-blur-xl">
                <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
                <div className="mb-4 inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-600">
                  EchoSpirit · Lumi
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Lumi 对话室</h1>
                <p className="mt-3 text-sm leading-7 text-zinc-500">{headerHint}</p>

                <div className="mt-8 flex justify-center">
                  <LumiSpiritDesktop
                    className="scale-[1.18]"
                    onClick={() => undefined}
                    autoAnimation={autoAnimation ?? undefined}
                  />
                </div>

                <div className="mt-8 rounded-[1.5rem] bg-gradient-to-br from-[#f5fffb] via-white to-[#fffaf0] p-4 shadow-inner shadow-teal-100/40">
                  <p className="text-xs uppercase tracking-[0.28em] text-teal-500">当前状态</p>
                  <div className="mt-3 flex items-center gap-3">
                    <span className={`inline-flex h-2.5 w-2.5 rounded-full ${isReplying ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                    <span className="text-sm text-zinc-600">
                      {isReplying ? 'Lumi 正在准备下一句回应' : 'Lumi 正轻轻陪着你'}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-zinc-500">

                  </p>
                </div>
              </aside>

              <section className="flex min-h-[560px] flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white/82 shadow-[0_24px_80px_rgba(168,198,218,0.18)] backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-teal-50 px-6 py-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-teal-500">Chat</p>
                    <h2 className="mt-1 text-lg font-semibold text-zinc-900">和 Lumi 说说话</h2>
                  </div>
                  <div className="rounded-full bg-zinc-50 px-3 py-1 text-xs text-zinc-500">
                    当前偏好：{modePreference === 'chat' ? 'Chat' : 'Plan'}
                  </div>
                </div>

                <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                  {showDisclaimerBanner && (
                    <div className="animate-[messageRise_320ms_ease-out] rounded-[1.2rem] border border-amber-100/80 bg-amber-50/60 px-4 py-3 text-xs leading-6 text-zinc-500">
                      Lumi 是你的 AI 陪伴精灵，帮你轻聊或整理计划。所有回复由 AI 生成，仅供参考，不替代专业心理、医学或法律建议。如果你正在经历紧急危机，请联系当地紧急服务或拨打心理援助热线。
                    </div>
                  )}

                  {messages.map((message, messageIndex) => (
                    <div key={message.id}>
                      <div
                        className={`flex animate-[messageRise_320ms_ease-out] ${
                          message.sender === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-[1.6rem] px-4 py-3 text-sm leading-7 shadow-sm ${
                            message.sender === 'user'
                              ? 'rounded-br-md bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-teal-200/70'
                              : 'rounded-bl-md border border-white/80 bg-[#fffdf7] text-zinc-700 shadow-amber-100/60'
                          }`}
                        >
                          {message.text}
                          {message.sender === 'lumi' && message.response && (
                            <LumiDraftCard response={message.response} />
                          )}
                        </div>
                      </div>

                      {message.sender === 'lumi' &&
                        messageIndex === messages.length - 1 &&
                        !isReplying && (
                          <div className="mt-2 flex flex-wrap gap-2 pl-1 animate-[messageRise_320ms_ease-out]">
                            {pendingPlanPayload &&
                              message.response?.ui_action === 'confirm_generation' && (
                                <button
                                  type="button"
                                  onClick={openConfirmPlanModal}
                                  className="rounded-full border border-teal-200 bg-gradient-to-r from-teal-50 to-cyan-50 px-4 py-1.5 text-sm font-medium text-teal-600 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                                >
                                  ✏️ 查看并编辑计划
                                </button>
                              )}
                            {message.response?.suggestions
                              ?.filter(Boolean)
                              .map((suggestion) => (
                                <button
                                  key={suggestion}
                                  type="button"
                                  onClick={() => void sendMessage(suggestion)}
                                  className="rounded-full border border-teal-100 bg-teal-50/70 px-3 py-1.5 text-sm text-teal-600 transition-all duration-300 hover:-translate-y-0.5 hover:bg-teal-100/80"
                                >
                                  {suggestion}
                                </button>
                              ))}
                          </div>
                        )}

                      {message.sender === 'lumi' &&
                        message.response?.future_create_payload?.action === 'add_milestones' &&
                        !message.response.future_create_payload.projectId &&
                        messageIndex === messages.length - 1 &&
                        !isReplying && (
                          <ProjectSelector onSelect={handleProjectSelect} />
                        )}
                    </div>
                  ))}

                  {isReplying && (
                    <div className="flex animate-[messageRise_320ms_ease-out] justify-start">
                      <div className="rounded-[1.6rem] rounded-bl-md border border-white/80 bg-[#fffdf7] px-4 py-3 text-sm text-zinc-500 shadow-sm shadow-amber-100/60">
                        <div className="flex items-center gap-2">
                          <span>Lumi 正在想一想</span>
                          <span className="flex gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-teal-300 animate-[typingDot_1s_ease-in-out_infinite]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-teal-300 animate-[typingDot_1s_ease-in-out_0.2s_infinite]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-teal-300 animate-[typingDot_1s_ease-in-out_0.4s_infinite]" />
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-teal-50 px-6 py-4">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setModePreference('chat')}
                      className={`rounded-full px-3 py-1.5 text-sm transition-all duration-300 ${
                        modePreference === 'chat'
                          ? 'bg-zinc-900 text-white shadow-sm'
                          : 'border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50'
                      }`}
                    >
                      聊聊模式
                    </button>
                    <button
                      type="button"
                      onClick={() => setModePreference('plan')}
                      className={`rounded-full px-3 py-1.5 text-sm transition-all duration-300 ${
                        modePreference === 'plan'
                          ? 'bg-teal-500 text-white shadow-sm shadow-teal-200/70'
                          : 'border border-teal-100 bg-teal-50/70 text-teal-700 hover:bg-teal-100/80'
                      }`}
                    >
                      整理模式
                    </button>
                  </div>

                  <div className="mb-3 flex flex-wrap gap-2">
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt.label}
                        type="button"
                        onClick={() => {
                          setModePreference(prompt.mode);
                          setInputValue(prompt.text);
                        }}
                        className="rounded-full border border-teal-100 bg-teal-50/70 px-3 py-1.5 text-sm text-teal-600 transition-all duration-300 hover:-translate-y-0.5 hover:bg-teal-100/80"
                      >
                        {prompt.label}
                      </button>
                    ))}
                  </div>

                  {requestError && (
                    <p className="mb-3 rounded-2xl bg-rose-50 px-3 py-2 text-xs leading-6 text-rose-600">
                      刚刚有一点波动：{requestError}
                    </p>
                  )}

                  <form onSubmit={handleSubmit} className="flex gap-3">
                    <label className="sr-only" htmlFor="lumi-message">
                      输入你想对 Lumi 说的话
                    </label>
                    <textarea
                      id="lumi-message"
                      value={inputValue}
                      onChange={(event) => setInputValue(event.target.value)}
                      placeholder={modePreference === 'chat' ? '想和 Lumi 说点什么？' : '想整理哪一块？今天 / 这周 / 某个计划都可以。'}
                      rows={2}
                      className="min-h-[64px] flex-1 resize-none rounded-[1.5rem] border border-teal-100/90 bg-[#fcfffe] px-4 py-3 text-sm text-zinc-700 shadow-inner shadow-teal-50 outline-none transition-all duration-300 placeholder:text-zinc-400 focus:border-teal-300 focus:ring-4 focus:ring-teal-100/70"
                    />
                    <button
                      type="submit"
                      disabled={!inputValue.trim() || isReplying}
                      className="inline-flex items-center justify-center gap-2 rounded-[1.5rem] bg-gradient-to-r from-teal-500 to-cyan-500 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-teal-200/70 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 min-w-[132px]"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-9.193-5.106A1 1 0 004 6.94v10.12a1 1 0 001.559.832l9.193-5.106a1 1 0 000-1.664z" />
                      </svg>
                      发送给 Lumi
                    </button>
                  </form>
                  <p className="mt-2 text-center text-[11px] leading-5 text-zinc-400">
                    Lumi 由 AI 驱动，回复仅供参考，不构成专业建议。
                    <Link href="/legal/terms" className="ml-1 underline underline-offset-2 hover:text-zinc-500">使用条款</Link>
                  </p>
                </div>
              </section>
            </section>
          </main>
        </div>
      )}

      {confirmPlanData && (
        <ConfirmPlanModal
          data={confirmPlanData}
          isCreating={isCreating}
          onChange={setConfirmPlanData}
          onConfirm={() => void handleConfirmPlan(confirmPlanData)}
          onClose={() => setConfirmPlanData(null)}
        />
      )}

      {addMilestoneData && (
        <AddMilestoneModal
          data={addMilestoneData}
          isCreating={isCreating}
          onConfirm={() => void handleAddMilestones(addMilestoneData)}
          onClose={() => setAddMilestoneData(null)}
        />
      )}

      <style jsx>{`
        @keyframes floatCloud {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(0, 14px, 0);
          }
        }

        @keyframes messageRise {
          0% {
            opacity: 0;
            transform: translate3d(0, 10px, 0);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes typingDot {
          0%,
          80%,
          100% {
            transform: translateY(0);
            opacity: 0.35;
          }
          40% {
            transform: translateY(-3px);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}

function ProjectSelector({ onSelect }: { onSelect: (project: ProjectInfo) => void }) {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then((data: { projects?: Array<{ id: string; name: string; icon: string; milestones?: unknown[] }> }) => {
        const list = Array.isArray(data) ? data : (data.projects ?? []);
        setProjects(
          list.map((p: any) => ({
            id: p.id,
            name: p.name,
            icon: p.icon,
            milestoneCount: Array.isArray(p.milestones) ? p.milestones.length : 0,
          })),
        );
      })
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mt-2 pl-1 text-xs text-zinc-400 animate-pulse">
        正在加载你的计划...
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="mt-2 pl-1 text-xs text-zinc-400">
        还没有计划，要不要先创建一个？
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2 pl-1 animate-[messageRise_320ms_ease-out]">
      {projects.map((project) => (
        <button
          key={project.id}
          type="button"
          onClick={() => onSelect(project)}
          className="inline-flex items-center gap-1.5 rounded-full border border-teal-100 bg-white/80 px-3 py-1.5 text-sm text-zinc-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-teal-50"
        >
          <span>{project.icon}</span>
          <span>{project.name}</span>
          <span className="text-[11px] text-zinc-400">({project.milestoneCount})</span>
        </button>
      ))}
    </div>
  );
}

function ConfirmPlanModal({
  data,
  isCreating,
  onChange,
  onConfirm,
  onClose,
}: {
  data: ConfirmPlanData;
  isCreating: boolean;
  onChange: (data: ConfirmPlanData) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const addMilestone = () => {
    onChange({ ...data, milestones: [...data.milestones, ''] });
  };

  const removeMilestone = (index: number) => {
    onChange({ ...data, milestones: data.milestones.filter((_, i) => i !== index) });
  };

  const updateMilestone = (index: number, value: string) => {
    const updated = [...data.milestones];
    updated[index] = value;
    onChange({ ...data, milestones: updated });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-[2rem] border border-white/70 bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-zinc-900">确认创建计划</h3>
        <p className="mt-1 text-sm text-zinc-500">检查一下信息，有什么要改的随时调整。</p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-500">计划名称</label>
            <input
              type="text"
              value={data.name}
              onChange={(e) => onChange({ ...data, name: e.target.value })}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700 outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500">每日目标（分钟）</label>
            <input
              type="number"
              min={1}
              max={720}
              value={data.dailyGoalMinutes}
              onChange={(e) => onChange({ ...data, dailyGoalMinutes: Math.max(1, Math.min(720, Number(e.target.value) || 25)) })}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700 outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-500">小目标</label>
              {data.milestones.length < 5 && (
                <button
                  type="button"
                  onClick={addMilestone}
                  className="text-xs text-teal-500 hover:text-teal-600"
                >
                  + 添加
                </button>
              )}
            </div>
            <div className="mt-1 space-y-2">
              {data.milestones.map((milestone, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={milestone}
                    onChange={(e) => updateMilestone(index, e.target.value)}
                    placeholder={`小目标 ${index + 1}`}
                    className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700 outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
                  />
                  <button
                    type="button"
                    onClick={() => removeMilestone(index)}
                    className="text-xs text-zinc-400 hover:text-rose-500"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
          >
            继续调整
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isCreating || !data.name.trim()}
            className="flex-1 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-teal-200/70 transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
          >
            {isCreating ? '创建中...' : '确认创建'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddMilestoneModal({
  data,
  isCreating,
  onConfirm,
  onClose,
}: {
  data: AddMilestoneData;
  isCreating: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-[2rem] border border-white/70 bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-zinc-900">添加小目标</h3>
        <p className="mt-1 text-sm text-zinc-500">
          向「{data.projectName}」添加以下小目标：
        </p>

        <div className="mt-4 space-y-2">
          {data.milestones.map((milestone, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-xl bg-teal-50/60 px-3 py-2 text-sm text-zinc-700"
            >
              <span className="text-teal-500">•</span>
              {milestone}
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isCreating}
            className="flex-1 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-teal-200/70 transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
          >
            {isCreating ? '添加中...' : '确认添加'}
          </button>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session?.user?.id) {
    return {
      redirect: {
        destination: '/auth/signin?callbackUrl=%2Flumi',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};
