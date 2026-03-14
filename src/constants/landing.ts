export const FOCUS_QUOTES = [
  { text: 'Attention is the rarest and purest form of generosity.', author: 'Simone Weil' },
  { text: 'Silence is not the absence of something but the presence of everything.', author: 'Gordon Hempton' },
  { text: 'The art of being wise is the art of knowing what to overlook.', author: 'William James' },
  { text: 'You become what you give your attention to.', author: 'Epictetus' },
  { text: 'Distraction is the destroyer of depth.', author: 'Digital Minimalism' },
] as const;

export const LOADING_STEPS = [
  { id: 1, message: '正在连接 Echo...', duration: 300 },
  { id: 2, message: '准备就绪', duration: 500 },
] as const;

export const PAIN_POINTS = [
  '明明很想做点什么，却总是迟迟开始不了？',
  '注意力被不停打断，一天下来却没留下些什么？',
  '不缺计划，总是容易断掉？',
  '想找回自己的节奏，却不知从哪开始？',
] as const;

export const LANDING_FEATURES = [
  {
    title: '轻量规划',
    description: '和AI小精灵一起，把模糊的念头变成第一步可执行的小目标',
    icon: '🎯',
    accent: 'from-emerald-50 via-white to-teal-50/60 border-emerald-100/70',
    iconBg: 'from-emerald-400 to-teal-500',
  },
  {
    title: '专注计时',
    description: '设定时长，深呼吸倒计时后进入专注，每一分钟都被记录',
    icon: '⏱️',
    accent: 'from-cyan-50 via-white to-sky-50/60 border-cyan-100/70',
    iconBg: 'from-cyan-400 to-sky-500',
  },
  {
    title: '陪伴守护',
    description: '可爱的AI光精灵 Lumi 全程陪伴，心树随你的节奏一起成长',
    icon: '✨',
    accent: 'from-teal-50 via-white to-emerald-50/60 border-teal-100/70',
    iconBg: 'from-teal-400 to-emerald-500',
  },
] as const;

export const HERO_PLAN_TASKS = [
  { title: '晨间写作', detail: '完成 500 字', done: true },
  { title: '章节复盘', detail: '记录 3 条灵感', done: false },
  { title: '夜读沉浸', detail: '专注 25 分钟', done: false },
] as const;

export const ECHO_PRINCIPLES = [
  {
    emoji: '🚫',
    title: '绝不排名与比较',
    description: '只关注自己的成长，为自己而专注。',
    color: 'border-emerald-400 bg-emerald-50/40',
  },
  {
    emoji: '🛡️',
    title: '绝不惩罚与情绪绑架',
    description: '心树不会枯萎，Lumi 不会失望，连胜不会中断。',
    color: 'border-cyan-400 bg-cyan-50/40',
  },
  {
    emoji: '🧭',
    title: '绝不替你定义正确',
    description: '没有"应该坚持多久"，只有你自己的步伐。',
    color: 'border-teal-400 bg-teal-50/40',
  },
] as const;

export const HOW_IT_WORKS = [
  {
    step: 1,
    title: '注册账号',
    description: '30 秒完成，开始你的旅途',
    color: 'from-teal-500 to-emerald-500',
  },
  {
    step: 2,
    title: '制定小计划',
    description: 'Lumi 帮你把念头变成行动',
    color: 'from-cyan-500 to-teal-500',
  },
  {
    step: 3,
    title: '开始专注',
    description: '深呼吸，进入属于你的时间',
    color: 'from-emerald-500 to-cyan-500',
  },
] as const;

export const RANDOM_SPIRIT_MESSAGES = [
  "……你真喜欢点我。",
  "再点我我就假装死机了。",
  "？？？ 你是来玩 Echo 的，还是来玩我的？",
] as const;
