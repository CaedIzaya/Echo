type SuggestionContext = {
  planName?: string | null;
  focusBranch?: string | null;
  focusDetail?: string | null;
};

type SuggestionPool = {
  id: string;
  keywords: string[];
  goals: string[];
};

const SUGGESTION_POOLS: SuggestionPool[] = [
  {
    id: "reading",
    keywords: ["阅读", "读书", "书", "读"],
    goals: ["读 2 页", "摘 1 句", "标记 1 处重点", "复述 1 段", "读 3 分钟"],
  },
  {
    id: "writing",
    keywords: ["写作", "写", "文案", "笔记", "日记"],
    goals: ["写 5 行", "列 3 个提纲", "改 1 段", "写 1 个标题", "记录 1 个想法"],
  },
  {
    id: "coding",
    keywords: ["编程", "代码", "开发", "bug", "前端", "后端"],
    goals: ["改 10 行代码", "修 1 个小 bug", "补 1 条注释", "跑 1 次测试", "整理 1 个函数"],
  },
  {
    id: "language",
    keywords: ["语言", "英语", "日语", "口语", "词汇", "听力"],
    goals: ["背 5 个词", "跟读 2 分钟", "听 1 段", "写 3 句", "复习 1 组短语"],
  },
  {
    id: "sports",
    keywords: ["运动", "健身", "跑步", "拉伸", "训练"],
    goals: ["拉伸 3 分钟", "做 10 次深蹲", "快走 5 分钟", "做 1 组平板", "活动肩颈 2 分钟"],
  },
  {
    id: "career",
    keywords: ["职业", "工作", "求职", "面试", "简历"],
    goals: ["改 1 段简历", "投 1 个岗位", "写 3 条面试答案", "整理 1 个任务", "复盘 1 次沟通"],
  },
  {
    id: "academic",
    keywords: ["学术", "学习", "课程", "论文", "研究"],
    goals: ["看 1 页资料", "记 3 个术语", "写 1 段摘要", "做 1 题", "整理 1 个知识点"],
  },
  {
    id: "music",
    keywords: ["音乐", "钢琴", "吉他", "练琴", "唱"],
    goals: ["练 1 段旋律", "慢练 3 分钟", "听 1 次节拍", "重复 5 小节", "录 1 次片段"],
  },
  {
    id: "drawing",
    keywords: ["绘画", "画", "速写", "插画", "设计"],
    goals: ["画 1 个草图", "勾线 5 分钟", "涂 1 块颜色", "画 3 个形体", "临摹 1 小段"],
  },
  {
    id: "movie",
    keywords: ["观影", "电影", "视频", "短片"],
    goals: ["看 3 分钟片段", "记 1 个镜头", "写 2 句感受", "拆 1 个结构", "暂停复盘 1 次"],
  },
  {
    id: "cooking",
    keywords: ["烹饪", "做饭", "料理", "备餐"],
    goals: ["准备 1 个食材", "切配 3 分钟", "学 1 个步骤", "清理 1 个台面", "记录 1 个口味"],
  },
  {
    id: "tidy",
    keywords: ["整理", "收纳", "清理", "打扫"],
    goals: ["收拾 1 个抽屉", "整理 10 件物品", "清理 1 个角落", "擦 1 张桌面", "归位 5 件物品"],
  },
  {
    id: "review",
    keywords: ["复盘", "总结", "回顾", "计划"],
    goals: ["写 3 条复盘", "标记 1 个收获", "删 1 个无效任务", "补 1 个下一步", "回看 1 条记录"],
  },
  {
    id: "social",
    keywords: ["社交", "沟通", "朋友", "家人", "关系"],
    goals: ["发 1 条问候", "回复 1 条消息", "准备 1 句表达", "打 1 个短电话", "记录 1 个感受"],
  },
  {
    id: "general",
    keywords: [],
    goals: ["读 2 页", "写 5 行", "拉伸 3 分钟", "整理 10 行", "完成 1 次小尝试"],
  },
];

function unique(items: string[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getTextCorpus(context?: SuggestionContext) {
  return [context?.planName, context?.focusBranch, context?.focusDetail]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function resolvePool(context?: SuggestionContext) {
  const corpus = getTextCorpus(context);
  if (!corpus) {
    return SUGGESTION_POOLS.find((pool) => pool.id === "general")!;
  }

  for (const pool of SUGGESTION_POOLS) {
    if (pool.id === "general") continue;
    if (pool.keywords.some((keyword) => corpus.includes(keyword.toLowerCase()))) {
      return pool;
    }
  }

  return SUGGESTION_POOLS.find((pool) => pool.id === "general")!;
}

export function buildMicroGoalInspirations(params: {
  historyRecent: string[];
  historyFrequent: string[];
  context?: SuggestionContext;
  count?: number;
}) {
  const count = params.count ?? 5;
  const pool = resolvePool(params.context);
  const merged = unique([
    ...params.historyRecent,
    ...params.historyFrequent,
    ...pool.goals,
    ...SUGGESTION_POOLS.find((item) => item.id === "general")!.goals,
  ]);

  return merged.slice(0, count);
}

