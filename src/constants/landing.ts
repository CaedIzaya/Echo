// Landing page constants
export const FOCUS_QUOTES = [
  { text: 'Attention is the rarest and purest form of generosity.', author: 'Simone Weil' },
  { text: 'Silence is not the absence of something but the presence of everything.', author: 'Gordon Hempton' },
  { text: 'The art of being wise is the art of knowing what to overlook.', author: 'William James' },
  { text: 'You become what you give your attention to.', author: 'Epictetus' },
  { text: 'Distraction is the destroyer of depth.', author: 'Digital Minimalism' },
] as const;

// 优化后的加载步骤 - 大幅缩短时间（总计 800ms）
export const LOADING_STEPS = [
  { id: 1, message: '正在连接 Echo...', duration: 300 },
  { id: 2, message: '准备就绪', duration: 500 },
] as const;

export const LANDING_FEATURES = [
  {
    title: '轻量规划',
    description: '热爱无需多虑，随时随地设置完成小目标',
    icon: '🎯',
    accent: 'from-emerald-50 via-white to-teal-50/60 border-emerald-100/70',
  },
  {
    title: '专注计时',
    description: '我们欢迎你划水，但是专注的时候，全力以赴',
    icon: '⏱️',
    accent: 'from-cyan-50 via-white to-sky-50/60 border-cyan-100/70',
  },
  {
    title: '陪伴守护',
    description: '与光精灵和心树一起，见证每一刻成长的确幸',
    icon: '😃',
    accent: 'from-teal-50 via-white to-emerald-50/60 border-teal-100/70',
  },
] as const;

export const HERO_PLAN_TASKS = [
  { title: '晨间写作', detail: '完成 500 字手稿', done: true },
  { title: '章节复盘', detail: '记录 3 条灵感', done: false },
  { title: '夜读沉浸', detail: '专注 25 分钟', done: false },
] as const;

export const ECHO_PRINCIPLES = [
  {
    emoji: '1️⃣',
    title: '排名与比较',
    description: '只关注自己的成长，为自己而专注。',
    accent: 'from-emerald-50 via-white to-teal-50/60 border-emerald-100/70',
  },
  {
    emoji: '2️⃣',
    title: '惩罚与情绪绑架',
    description: '心树不会枯萎，Lumi 不会失望，连胜不会中断。',
    accent: 'from-cyan-50 via-white to-sky-50/60 border-cyan-100/70',
  },
  {
    emoji: '3️⃣',
    title: '替你定义何为"正确"',
    description: '没有"应该坚持多久"，只有你自己的步伐。',
    accent: 'from-teal-50 via-white to-emerald-50/60 border-teal-100/70',
  },
] as const;

export const RANDOM_SPIRIT_MESSAGES = [
  "……你真喜欢点我。",
  "再点我我就假装死机了。",
  "？？？ 你是来玩 Echo 的，还是来玩我的？"
] as const;

