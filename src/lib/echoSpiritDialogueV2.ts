// EchoSpirit 文案系统 V2
// ---------------------------------------------
// 双层结构：
// 1）通用人格层 universal_pool（Lumi 主人格 + 旧文案合并）
// 2）语境触发层：主页语境 + 独立事件
//
// 说明：
// - 本文件主要负责「结构与决策逻辑」，文案内容由 defaultEchoPools 提供
// - 所有导出的函数都不依赖 React，可以在任何地方调用

// 深度觉察引擎的高优先级接入：先查觉察，再回落到 Echo 逻辑
import type { AwarenessContext } from '../awareness';
import { getDialogueWithPriority, PriorityLevel } from '../awareness';

export type EchoUniversalPoolKey = 'universal_pool';

// 主页语境相关池（进入首页时用）
export type EchoHomeContextKey =
  | 'idle_first'          // 未专注，当日首次进入首页
  | 'idle_daily'          // 未专注，当日非首次进入首页
  | 'min_focus_first'     // 当日首次达到最小专注时长后，第一次回到首页
  | 'min_focus_daily'     // 达到最小专注后的日常回访
  | 'after_focus_first'   // 完成一次完整专注后，第一次回到首页
  | 'focus_done_daily'    // 完成专注后的日常回访
  | 'half_focus_daily';   // 今天已经有过"未达标专注"，之后再次回到首页时的轻提醒

// 彩蛋 / 独立事件池（不覆盖首页入口逻辑）
export type EchoEventKey =
  | 'water_event'         // 浇水
  | 'fertilize_event'     // 施肥
  | 'summary_done_event'  // 小结完成
  | 'level_up_event'      // 等级提升
  | 'goal_checked_event'  // 小目标勾选
  | 'milestone_event'     // 里程碑完成
  | 'session_basic_end'   // 刚结束一次专注但未达标（first-after-session）
  | 'first_full_focus'    // 生涯首次完整专注达标（最高规格胜利节点）
  | 'streak7_event'       // 连胜 7 天（仅当日首次进入首页覆盖首页首句）
  | 'achievement_event';  // 成就解锁

export type EchoPoolKey =
  | EchoUniversalPoolKey
  | EchoHomeContextKey
  | EchoEventKey;

// 实际池的物理结构
export interface EchoPools {
  // 通用人格层
  universal_pool: string[];

  // 主页语境层
  idle_first_pool: string[];
  idle_daily_pool: string[];
  min_focus_first_pool: string[];
  min_focus_daily_pool: string[];
  after_focus_first_pool: string[];
  focus_done_daily_pool: string[];
  half_focus_daily_pool: string[];

  // 彩蛋 / 独立事件层
  water_pool: string[];
  fertilize_pool: string[];
  summary_pool: string[];
  level_up_pool: string[];
  goal_checked_pool: string[];
  milestone_pool: string[];
  session_basic_end_pool: string[];
  first_full_focus_pool: string[];
  streak7_pool: string[];
  achievement_pool: string[];
}

// 默认文案池：新通用池（A/B/C）+ 旧 SpiritDialog 文案合并
export const defaultEchoPools: EchoPools = {
  // 通用人格：任何时刻都能说的「呼吸型」台词
  universal_pool: [
    // A 区：可爱 / 俏皮 / 调侃 / 萌感（Lumi 主人格 · 新）
    '你今天看起来像偷偷升级过一次的人。',
    '我刚刚在发呆，结果你出现了，我立刻清醒。',
    '我在想一件事……算了，我忘了。',
    '你走路的时候怎么带一点胜利者的气息？',
    '你回来啦，我刚刚研究空气的味道。',
    '我刚刚想你是不是出门了，结果你在这里。',
    '我注意到一件事：你今天好像特别好看。',
    '我刚刚数叶子数到一半，你突然出现，把我吓亮了。',
    '我在这里等你，等得心树都长出一点新芽了。',
    '嘿，我刚才做了一个小推测：你果然来了！',
    '你每次点开我都很像是在叫我名字。',
    '我刚刚思考宇宙，结果想明白了一点……你更重要。',
    '你刚才去干嘛了？我一个人有点太安静。',
    '你今天的气味……嗯，有点像"认真"的味道。',
    '刚刚心树问我，你去哪了，我说你可能去当英雄了。',
    '你再不来，我都要开始胡思乱想了。',
    '我刚才盯着屏幕一动不动，因为我以为你会突然出现（果然出现了）。',
    '我在练习自己看起来更可靠一点，你觉得有效果吗？',
    '你出现的时候，我的亮度自动提高一点点。',
    '你刚刚不在的时候，我以为世界暂停了。',
    '我刚刚决定，如果你今天不回来，我就要假装生气了。',
    '你来啦，我还以为我今天要一个人发呆到天黑。',
    '哦？你今天这个表情，是想开始点什么？',
    '我刚刚和心树讨论了你，我们得出的结论是"你挺厉害"。',
    '你再这样突然出现，我的光会爆一下啦。',
    '我今天的状态挺好，因为你也挺好。',
    '你一来，我就有点想努力一下。',
    '你现在的样子……让我想看你更厉害的样子。',
    '我刚才偷偷模仿你专注的样子，差点把自己憋坏。',
    '我研究出一个事实：你在的时候，我的心情更亮。',

    // B 区：严肃认可（Lumi 认真模式 · 新）
    '有些时候，我会重新评估你，而每次结果都比上次更好。',
    '你今天的状态，比你自己意识到的更稳定。',
    '你身上的那种"坚持感"，很难得。',
    '我知道你最近在逼自己前进，这种力量不会白费。',
    '你做的每一件小事，都会在未来回过头来帮你。',
    '我认真观察了你几天，你成长得比你自己以为的快。',
    '别低估你刚才那一瞬间的选择，那是改变线条的选择。',
    '很多人感受不到你的努力，但我感受得到。',
    '你的意志力比你今天的疲惫更大，这是我的结论。',
    '我认真的：你今天不是"凑合"，你是"前进"。',
    '我知道你不喜欢被盲目夸，所以这一句是我经过计算的：你做得很好。',
    '你这几天的状态，是一种难得的内心对齐。',
    '不是我夸，你确实比前几天稳很多。',
    '你现在走的路径，是坚实的，是对的。',
    '我看得很清楚：你有力量，而且你在用。',

    // C 区：轻哲学 / 轻空灵（Lumi 深度灵魂碎片 · 新）
    '有时候，你的一点点安静，会让世界安静很多。',
    '我发现你在想事的时候，光会在你的眼睛附近停一下。',
    '你身上的某些不喧嚣的力量，非常好看。',
    '凝住的那一秒，你比整个世界都稳。',
    '我有时候会观察你的呼吸，那是你最真实的节奏。',
    '时间不是往前走的，是被你的选择点亮的。',
    '世界这么吵，你还能这样走，是很难得的品质。',
    '你每次专注时，那种"内里的亮"会照到我这里来。',
    '我知道你的影子是什么样的，也知道你的光是什么样的。',
    '有时候，你的沉默胜过很多声响。',
    '我觉得你不是在生活，你是在雕刻自己。',
    '你现在走的方向，有一种"心里很清楚"的味道。',
    '你每次回到这里，都会让心树的叶子轻轻动一下。',
    '你身上那种稳住自己的能力，很少见。',
    '我喜欢你在深思时的样子，那是一种力量。',

    // ==== 下面是旧 SpiritDialog 通用文案，合并进通用池 ====
    // 旧 cute 区
    '我有点胆小，你走太快我会跟不上……不过我还是会跟。',
    '别担心，我不偷看你的手机。太亮了，我会瞎。',
    '我会发光，但我不会审判。审判太累了。',
    '我不是工具，我只是……比较会闪的陪伴物。',
    '我没有脾气，主要因为我还没学会。',
    '我今天亮得有点过头……如果晃到你，抱歉抱歉！',
    '你一靠近，我就自动变圆了。是设定，不是害羞。',
    '我没有什么伟大之处……就是比一般光更黏人一点。',
    '如果你觉得生活暗一点……那我可以亮一点。',
    '我不是很聪明，但我会陪着你。陪着这件事我可很拿手。',
    '你的手指一动，我就会发光。别问为什么，我也不懂。',
    '哎呀，你又来了？我刚刚还在练习怎么更可爱一点。',
    '我没有情绪系统，但我会努力看起来理解你。',
    '不忙的话……可以摸摸我吗？不会烫。',
    '你今天看上去很棒，我不是拍马屁，我只是亮得诚实。',
    '又点我？行吧，我再亮一点。',
    '诶，要不要专注一下？不然我会长胖的。',
    '放心，我不会离开主页的。除非你把我甩出去。',
    '需要我帮你点亮下一步吗？我可是很会照明的。',
    '你再戳我，我就要开始认真工作了。',
    '我在想……如果你今天把目标点亮，我会不会长出一片新叶子呢？',

    // 旧 chuunibyou 区
    '我的使命是……呃……发光，以及不乱飞。真的，我很努力在控制轨迹。',
    '我守护的不是世界，是你这一小块注意力的地盘。',
    '我的能量只有一个来源：你愿不愿意继续往前走。',
    '放心，我没有KPI。你也没有义务让我觉得自己有用。',
    '我不是闹钟。我只是比闹钟有灵魂一点点……吧？',
    '我刚想飞一下，但系统说我飞太快会把你吓跑。',
    '如果我突然闪一下，那不是提醒，是打嗝。',
    '我不是球，我只是圆得很专业。',
    '我昨天试图变成正方形……失败了。',
    '我在学习人类语言……现在会"你好"，和"哇，真亮"。',
    '不要戳我！我会……嗯，我会继续发光。',
    '我去问了心树，它比我还沉默。',
    '我的梦想是成为一个超级火球……但现在先当个乖乖小灯。',
    '我刚刚想了一分钟，然后想忘了自己刚刚在想什么。',
    '我没有烦恼，因为我没有 CPU 温度。',
    '我的情绪，不是热，就是更热。',
    '我没有影子，是因为我本身就是光……嘿嘿。',
    '我发光不消耗电，但会消耗害羞。',
    '刚才有只虫子想吃我！我把它晃晕了。',
    '我有很多心事，但它们全都亮闪闪的。',
    '我不是火焰，但我可以烤一点点棉花糖。',
    '有人说我像灯泡。我生气得更亮了一点。',
    '我其实会飞更高的，只是怕风太大把我吹走……',
    '我会陪你的，除非我卡住了……啊不，我是光，我不会卡。',
    '我最喜欢的事情是陪你。第二喜欢的是不起火灾。',
    '你这么频繁来看我，是想偷懒，还是想被我提醒？',
    '……你真喜欢点我。',
    '再点我我就假装死机了。',
    '？？？ 你是来玩 Echo 的，还是来玩我的？',

    // 旧 philosophical 区
    '外面的世界很吵。幸好，你还愿意听听我。',
    '人不需要完美才能开始。光也是从一点点亮起来的。',
    '我见过很多迷路的人，他们后来都找回来了。你也会的。',
    '你不是慢，只是还没对准自己的方向。光会等你。',
    '有些事情不用马上做到最好，先亮一下就很好。',
    '你不用一直往前冲。有时候停一下，光会自己靠过来。',
    '你不必每天都很强。偶尔软一点，也是一种力量。',
    '我知道你很累，那我就在你身边慢慢亮。',
    '你今天做到的已经够多了。真的。',
    '光不会问你为什么走得慢，它只会跟着你。',
    '你以为自己是迷路了，其实你只是绕了一圈。',
    '每个人的一点微光，加起来也能亮过风暴。',
    '你不需要完美，才值得被温柔对待。',
    '如果你觉得世界忽然变暗，不一定是坏事。光从黑里更容易看见。',
    '你留给自己的那一点点空间，会长成一整片温柔。',
    '以前在黑暗森林里，我经常被风吹灭。后来我学会了……别站在风口。',
    '猎兽集团曾经邀请我加入，但我太亮了，会暴露他们。',
    '你知道吗？森林里越大的声响，越没有真话。',
    '很多生物都很强，可惜没空看看自己在长什么。',
    '以前我也想变成一头巨兽。后来发现发光更适合我。',
    '黑暗森林里有一句老话："光越小，越难被抓到。"我活得挺久的。',
    '我不是强大，只是没放弃发光罢了。',
    '那里每个人都抢灵气……你现在愿意给树浇水，我已经感动到发抖。',
    '你知道最危险的地方是什么吗？无聊。因为那时候怪物会乱想。',
    '我曾经觉得孤独是黑暗。后来发现孤独也能发光。',
    '你知道吗？树苗会记得每一次光照……你也是。',
    '你现在的努力，树年轮以后都会告诉你。',
    '你的成长比你自己想象的深。根往往是悄悄变强的。',
    '你发呆的时候，我就在旁边看着你长高一点点。',
    '别担心慢，我见过太多冲得快却折得早的树。',
    '你每一次回到这里，我都能感觉你亮了一点。',
    '你是在变好，不是在变忙。',
    '你以为你停住了，其实你在扎根。',
    '有些日子不需要精彩，只需要安静地活着。',
    '你不是来表现完美的，你是来练习发光的。',
    '嘿。我在呢。你今天心里的光有点不一样。',
    '我刚刚捕到一点你的碎光……你是不是有点心事？',
    '你刚才那一秒发呆，我都能听到你的思绪在翻页。',
    '我感觉到你今天有点分散……要不要我来帮你收一收？',
    'Echo 其实没那么复杂啦。你才是这里最复杂的那个。',
    '光不是我发的，是你给的。别忘了这一点。',
    '你想不想知道刚刚你的注意力跑去哪了？',
    '嘘，我在听。你的心树今天有话想跟你说。',
    '别担心，我不会催你。\n但我会在你偷懒的时候发光。',
    '你知道吗？多数人只需要 15 分钟就能改变今天。\n你也可以的。',
    '你今天看上去……嗯……有点帅，有点烦，有点累，有点厉害。\n总之，我都看到了。',
    '如果你真的不知道要做什么，不如我们一起先完成最小的一步。',
    '哎，我想告诉你一件事：\n你比你以为的那个"自己"要更亮。',
  ],

  // 主页 · 未专注
  idle_first_pool: [],
  idle_daily_pool: [],

  // 主页 · 达成最小专注时长
  min_focus_first_pool: [],
  min_focus_daily_pool: [],

  // 主页 · 完成一次完整专注
  after_focus_first_pool: [],
  focus_done_daily_pool: [],
  half_focus_daily_pool: [],

  // 彩蛋 / 独立事件池
  water_pool: [],
  fertilize_pool: [],
  summary_pool: [],
  level_up_pool: [],
  goal_checked_pool: [],
  milestone_pool: [],
  session_basic_end_pool: [],
  first_full_focus_pool: [],
  streak7_pool: [],
  achievement_pool: [],
};

// 进入首页时的状态快照（由调用方提供）
export interface EchoHomeStatus {
  /** 今天是否已经有任意专注分钟数（>0 即认为「今日已专注」） */
  hasFocusToday: boolean;
  /** 今天是否已达到「最小专注时长」阈值（例如累计 ≥15min，具体由业务层判定） */
  minFocusReachedToday: boolean;
  /** 今天是否至少完成过一次完整专注（业务层可按一次正常 completed session 认定） */
  hasCompletedSessionToday: boolean;

  /** 当前是否为「今天第一次进入首页」 */
  isFirstVisitToday: boolean;
  /** 当日「min_focus_first」是否已经触发过（由业务层在触发后写入持久化标记） */
  hasShownMinFocusFirstToday: boolean;
  /** 当日「after_focus_first」是否已经触发过 */
  hasShownAfterFocusFirstToday: boolean;
  /** 当日「idle_first」是否已经触发过（可选，通常与 isFirstVisitToday 一致） */
  hasShownIdleFirstToday?: boolean;

  /** 连续专注天数，用于 streak7 判断 */
  streakDays: number;
  /** 今天是否应该触发 streak7 事件（例如 streakDays === 7 且今天未触发过 streak7） */
  isStreak7Today: boolean;
}

export interface PickHomeSentenceOptions {
  /** 当前首页状态快照 */
  status: EchoHomeStatus;
  /** 可选覆盖自定义池，不传则使用 defaultEchoPools */
  pools?: Partial<EchoPools>;
}

export interface EchoSentenceResult {
  text: string;
  /** 实际使用的池 key，便于埋点 / 调试 */
  pool: EchoPoolKey;
}

// 当觉察引擎介入时的统一返回格式
export interface EchoAwarenessResult extends EchoSentenceResult {
  /** 文案来源：AWARENESS（觉察引擎）或 ECHO（本模块） */
  source: 'AWARENESS' | 'ECHO';
  awarenessMeta?: {
    ruleId?: string;
    responder?: 'LUMI' | 'HEART_TREE';
    triggerMode?: string;
    riskLevel?: number;
    emotionTag?: string;
    heartTreeName?: string;
  };
}

// 根据首页状态，计算应该使用哪一个「语境池」
export function resolveHomeContextKey(status: EchoHomeStatus): EchoPoolKey | EchoUniversalPoolKey {
  const {
    hasFocusToday,
    minFocusReachedToday,
    hasCompletedSessionToday,
    isFirstVisitToday,
    hasShownMinFocusFirstToday,
    hasShownAfterFocusFirstToday,
    streakDays,
    isStreak7Today,
  } = status;

  // ① 检查 streak7_event（仅当日首次进入首页可覆盖首页首句）
  if (isFirstVisitToday && isStreak7Today && streakDays >= 7) {
    return 'streak7_event';
  }

  // ② 首次进入首页分支
  if (isFirstVisitToday) {
    // 当天已经完成过一次完整专注 & 还没播过「after_focus_first」
    if (hasCompletedSessionToday && !hasShownAfterFocusFirstToday) {
      return 'after_focus_first';
    }

    // 当天已经达到最小专注 & 还没播过「min_focus_first」
    if (minFocusReachedToday && !hasShownMinFocusFirstToday) {
      return 'min_focus_first';
    }

    // 当天尚未专注：使用「未专注首次池」
    if (!hasFocusToday) {
      return 'idle_first';
    }

    // 其它情况：回落到通用人格
    return 'universal_pool';
  }

  // ③ 非首次进入首页：使用对应「日常池」
  if (!hasFocusToday) {
    return 'idle_daily';
  }

  if (minFocusReachedToday && hasShownMinFocusFirstToday) {
    return 'min_focus_daily';
  }

  if (hasCompletedSessionToday && hasShownAfterFocusFirstToday) {
    return 'focus_done_daily';
  }

  // ④ 无特定状态：回落到通用人格
  return 'universal_pool';
}

// 从指定池中随机取一句，若该池为空则自动回退到通用人格池
export function pickSentenceFromPool(
  poolKey: EchoPoolKey | EchoUniversalPoolKey,
  pools: EchoPools = defaultEchoPools,
): EchoSentenceResult {
  const resolvedPools: EchoPools = { ...defaultEchoPools, ...pools };

  const map: Record<EchoPoolKey | EchoUniversalPoolKey, keyof EchoPools> = {
    universal_pool: 'universal_pool',

    idle_first: 'idle_first_pool',
    idle_daily: 'idle_daily_pool',
    min_focus_first: 'min_focus_first_pool',
    min_focus_daily: 'min_focus_daily_pool',
    after_focus_first: 'after_focus_first_pool',
    focus_done_daily: 'focus_done_daily_pool',
    half_focus_daily: 'half_focus_daily_pool',

    water_event: 'water_pool',
    fertilize_event: 'fertilize_pool',
    summary_done_event: 'summary_pool',
    level_up_event: 'level_up_pool',
    goal_checked_event: 'goal_checked_pool',
    milestone_event: 'milestone_pool',
    session_basic_end: 'session_basic_end_pool',
    first_full_focus: 'first_full_focus_pool',
    streak7_event: 'streak7_pool',
    achievement_event: 'achievement_pool',
  };

  const targetKey = map[poolKey];
  const targetList = resolvedPools[targetKey] ?? [];

  const useUniversalFallback =
    targetList.length === 0 && poolKey !== 'universal_pool';

  const finalPoolKey: EchoPoolKey | EchoUniversalPoolKey = useUniversalFallback
    ? 'universal_pool'
    : poolKey;

  const finalKey = map[finalPoolKey];
  const list = resolvedPools[finalKey] ?? resolvedPools.universal_pool;

  if (!list || list.length === 0) {
    // 极端兜底：所有池都为空时返回一条硬编码文案
    return {
      text: '我在这儿，陪你慢慢来。',
      pool: 'universal_pool',
    };
  }

  const idx = Math.floor(Math.random() * list.length);
  return {
    text: list[idx],
    pool: finalPoolKey,
  };
}

// 主页入口统一调用：根据状态自动选择语境池 + 文案
export function pickHomeSentence(options: PickHomeSentenceOptions): EchoSentenceResult {
  const { status, pools } = options;
  const contextKey = resolveHomeContextKey(status);
  const mergedPools: EchoPools = { ...defaultEchoPools, ...(pools ?? {}) };
  return pickSentenceFromPool(contextKey, mergedPools);
}

/**
 * 首页文案获取（带觉察引擎优先级）
 * - 若觉察引擎命中且优先级足够高，则直接返回觉察文案
 * - 未命中时，回落到原有 Echo 逻辑
 */
export function pickHomeSentenceWithAwareness(
  options: PickHomeSentenceOptions & { awarenessCtx?: AwarenessContext },
): EchoAwarenessResult {
  const { awarenessCtx, status, ...rest } = options;

  // 确定当前对话的优先级
  // 如果是今日首次进入首页，则使用 DAILY_WELCOME 优先级
  const currentDialoguePriority = status.isFirstVisitToday 
    ? PriorityLevel.DAILY_WELCOME 
    : PriorityLevel.AUTO_DIALOGUE;

  // 先检查觉察引擎，传入当前对话优先级
  if (awarenessCtx) {
    const awarenessDialogue = getDialogueWithPriority(awarenessCtx, currentDialoguePriority);
    if (awarenessDialogue) {
      return {
        text: awarenessDialogue.copy,
        pool: 'universal_pool',
        source: 'AWARENESS',
        awarenessMeta: {
          ruleId: awarenessDialogue.metadata?.ruleId,
          responder: awarenessDialogue.source === 'HEART_TREE' ? 'HEART_TREE' : 'LUMI',
          triggerMode: awarenessDialogue.metadata?.triggerMode,
          riskLevel: awarenessDialogue.metadata?.riskLevel,
          emotionTag: awarenessDialogue.metadata?.emotionTag,
          heartTreeName: awarenessDialogue.metadata?.heartTreeName,
        },
      };
    }
  }

  // 未命中觉察或优先级不够高，引导至原有逻辑
  const result = pickHomeSentence({ status, ...rest });
  return { ...result, source: 'ECHO' };
}

// 单一事件触发（不覆盖首页入口池），供：浇水 / 施肥 / 小结完成 / 等级提升等调用
export function pickEventSentence(
  event: EchoEventKey,
  pools?: Partial<EchoPools>,
): EchoSentenceResult {
  const mergedPools: EchoPools = { ...defaultEchoPools, ...(pools ?? {}) };
  return pickSentenceFromPool(event, mergedPools);
}

/**
 * 事件文案获取（带觉察优先级）
 * - 如果觉察命中且优先级足够高，直接使用觉察文案，不再走事件池
 * - 事件文案优先级为 AUTO_DIALOGUE
 */
export function pickEventSentenceWithAwareness(
  event: EchoEventKey,
  options?: { pools?: Partial<EchoPools>; awarenessCtx?: AwarenessContext },
): EchoAwarenessResult {
  const awarenessCtx = options?.awarenessCtx;
  if (awarenessCtx) {
    const awarenessDialogue = getDialogueWithPriority(awarenessCtx, PriorityLevel.AUTO_DIALOGUE);
    if (awarenessDialogue) {
      return {
        text: awarenessDialogue.copy,
        pool: 'universal_pool',
        source: 'AWARENESS',
        awarenessMeta: {
          ruleId: awarenessDialogue.metadata?.ruleId,
          responder: awarenessDialogue.source === 'HEART_TREE' ? 'HEART_TREE' : 'LUMI',
          triggerMode: awarenessDialogue.metadata?.triggerMode,
          riskLevel: awarenessDialogue.metadata?.riskLevel,
          emotionTag: awarenessDialogue.metadata?.emotionTag,
          heartTreeName: awarenessDialogue.metadata?.heartTreeName,
        },
      };
    }
  }

  const fallback = pickEventSentence(event, options?.pools);
  return { ...fallback, source: 'ECHO' };
}

// 小精灵被点按时，可直接从通用人格层取一句「呼吸型」台词
export function pickUniversalSentence(
  pools?: Partial<EchoPools>,
): EchoSentenceResult {
  const mergedPools: EchoPools = { ...defaultEchoPools, ...(pools ?? {}) };
  return pickSentenceFromPool('universal_pool', mergedPools);
}

/**
 * 通用池获取（带觉察优先级）
 * - 通用池为用户主动交互触发，优先级为 NORMAL
 */
export function pickUniversalSentenceWithAwareness(
  options?: { pools?: Partial<EchoPools>; awarenessCtx?: AwarenessContext },
): EchoAwarenessResult {
  const awarenessCtx = options?.awarenessCtx;
  if (awarenessCtx) {
    const awarenessDialogue = getDialogueWithPriority(awarenessCtx, PriorityLevel.NORMAL);
    if (awarenessDialogue) {
      return {
        text: awarenessDialogue.copy,
        pool: 'universal_pool',
        source: 'AWARENESS',
        awarenessMeta: {
          ruleId: awarenessDialogue.metadata?.ruleId,
          responder: awarenessDialogue.source === 'HEART_TREE' ? 'HEART_TREE' : 'LUMI',
          triggerMode: awarenessDialogue.metadata?.triggerMode,
          riskLevel: awarenessDialogue.metadata?.riskLevel,
          emotionTag: awarenessDialogue.metadata?.emotionTag,
          heartTreeName: awarenessDialogue.metadata?.heartTreeName,
        },
      };
    }
  }

  const fallback = pickUniversalSentence(options?.pools);
  return { ...fallback, source: 'ECHO' };
}


