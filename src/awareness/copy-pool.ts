/**
 * 深度觉察引擎 - 文案池
 * 按 ruleId + responder 组织，每条文案对应一个场景
 */

type CopyPool = Record<string, string[]>;

export const COPY_POOL: CopyPool = {
  // 🜂 场景 1：一天内挂机太久，却迟迟无法进入专注（心树）
  SCENE1_IDLE_HESITATE_HEART_TREE: [
    '你今天在门口走了好几圈。',
    '你像是在找合适的入口。',
    '心浮的时候，我会更稳。',
    '你停顿得挺久，是在等心跟上吗？',
    '有些时候，开始比过程难。',
    '不急，你的节奏我会等。',
    '你想动，但心还没准备好。',
    '你今天来这儿的次数，比你想象的多。',
    '你不是不想开始，只是累了。',
    '你在犹豫，我在等你。',
  ],

  // 🜁 场景 2：连续几天未上线（Lumi）
  SCENE2_STREAK_STAY_1_LUMI: [
    '你回来了，隔了几天，我一直在。',
    '像这样回来，就已经很好了。',
    '这几天你应该挺累的吧。',
    '你离开的时间里，我一直长着。',
    '不论多久，你回来，我就亮了。',
    '你这段时间心里装了很多东西吧。',
    '看到你上线，我就放心了。',
    '你今天能来，我挺欣慰的。',
    '你这几天不太容易，对吧？',
    '你不在的时候，我在等你。',
  ],

  // 🜂 场景 3：连续几天未完成最小专注目标（心树）
  SCENE3_MIN_GOAL_FAIL_DAYS_HEART_TREE: [
    '连最小目标有时候也很重，我懂。',
    '别因为几天没做到，就否定自己。',
    '你这几天心有点乱。',
    '你不是不行，只是现在不稳。',
    '目标不动，你也不必着急。',
    '先照顾好你自己。',
    '你最近的步伐轻了很多。',
    '你这几天，像是在喘气。',
    '哪怕没做到，我也在你这边。',
    '没关系，我们慢一点也行。',
  ],

  // 🜃 场景 4：多次尝试专注，却每次都失败（Lumi）
  SCENE4_MULTI_SHORT_SESSIONS_LUMI: [
    '你刚才试了好几次，我看见了。',
    '不是你不行，是心没稳住。',
    '你今天真的很努力。',
    '你不是在拖延，你在挣扎。',
    '你的尝试，不会被算成失败。',
    '你再努力一点就会崩溃，我知道。',
    '你这样坚持着，其实挺不容易。',
    '今天的你，太累了。',
    '你在用力，但身体没跟上。',
    '再休息一口气也可以的。',
  ],

  // 🜄 场景 5：深夜上线（Lumi）
  SCENE5_LATE_NIGHT_ONLINE_LUMI: [
    '全世界都睡了。这个秘密基地现在只属于我们。',
    '夜晚很安静，但你并不孤独',
    '星光不够亮？我会让自己亮一点',
    '这个点还在，是有什么心事吗？',
    '月亮很安静，你也一样。',
  ],

  // 🜅 场景 6：点击 Lumi 太多次（Lumi）
  SCENE6_LUMI_CLICK_MANY_LUMI: [
    '你今天有点不安，对吗？',
    '你是在确认我在吗？',
    '你刚刚的节奏有点乱。',
    '你现在心跳比平时快一点吧。',
    '你是不是有点慌？',
    '你今天想依靠一下。',
    '你现在不太稳，我看出来了。',
    '戳我好多次，是在找安全感？',
    '没事，我在。',
    '你现在不用强撑。',
  ],
};

/**
 * 根据规则 ID 和响应者获取文案池
 */
export function getCopyPool(ruleId: string, responder: 'LUMI' | 'HEART_TREE'): string[] {
  const key = `${ruleId}_${responder}`;
  return COPY_POOL[key] || [];
}

/**
 * 从文案池中随机选择一条文案
 */
export function selectCopy(ruleId: string, responder: 'LUMI' | 'HEART_TREE'): string | null {
  const pool = getCopyPool(ruleId, responder);
  if (pool.length === 0) return null;
  
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}



















