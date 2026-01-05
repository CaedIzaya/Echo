// 通用兴趣数据结构定义 & 配置表
// --------------------------------------------------
// 说明：
// - 本文件定义了兴趣域 / 子类 / 具体兴趣项 / 里程碑的统一结构
// - 未来「计划创建流程」「心树兴趣分支」「成就系统」都可以共用这份表

// 单个里程碑（目前主要使用 description）
export interface InterestMilestone {
  id: string;           // 全局唯一，如 "drawing_manga_storyboard"
  description: string;  // 人类可读的里程碑描述
  notes?: string;       // 额外设计说明（可选）
}

// 最小粒度兴趣对象（具体到某个方向）
export interface InterestItem {
  id: string;              // 如 "drawing_manga_storyboard"
  key: string;             // 简短 key，便于代码使用，如 "storyboard"
  name: string;            // 展示名，例如 "分镜与镜头感"
  milestone: InterestMilestone;
  tags?: string[];         // ["漫画","分镜","叙事"] 等标签，供推荐 / 检索 / 心树分支使用
}

// 同一大类下的子类别：例如“FPS / MOBA / 漫画 / RPG”
export interface InterestCategory {
  id: string;           // 如 "drawing_manga"
  key: string;          // "manga" / "basic_sketch" / "reading_lit"
  label: string;        // 展示给用户的名字，例如 "漫画（Manga）"
  order: number;        // 排序用
  items: InterestItem[];
}

// 顶层兴趣域：游戏 / 阅读 / 音乐 / 绘画…
export interface InterestDomain {
  id: string;           // 如 "domain_drawing"
  key: string;          // "game" | "music" | "reading" | "drawing" ...
  label: string;        // 展示标题，例如 "绘画 / 插画"
  order: number;        // 展示顺序
  categories: InterestCategory[];
}

// 整个兴趣配置表
export type InterestConfig = InterestDomain[];

// --------------------------------------------------
// 绘画 / 插画 域示例（含：基础素描 + 漫画）
// --------------------------------------------------

export const interestConfig: InterestConfig = [
  {
    id: 'domain_game',
    key: 'game',
    label: '游戏',
    order: 1,
    categories: [
      {
        id: 'game_fps',
        key: 'fps',
        label: 'FPS',
        order: 1,
        items: [
          {
            id: 'game_fps_cs2',
            key: 'cs2',
            name: '反恐精英 2',
            milestone: {
              id: 'game_fps_cs2_ms',
              description: '在竞技匹配中完成至少 10 次成功急停爆头，并赢下一局比赛',
            },
            tags: ['FPS', '竞技', '高专注'],
          },
          {
            id: 'game_fps_apex',
            key: 'apex',
            name: 'Apex 英雄',
            milestone: {
              id: 'game_fps_apex_ms',
              description: '在一局游戏中成功获得 3 次击杀，并成为捍卫者',
            },
            tags: ['FPS', '大逃杀', '团队合作'],
          },
          {
            id: 'game_fps_valorant',
            key: 'valorant',
            name: '无畏契约',
            milestone: {
              id: 'game_fps_valorant_ms',
              description: '完成一次力敌千钧的关键回合，并赢得本场比赛胜利',
            },
            tags: ['战术射击', '团队', '高压'],
          },
          {
            id: 'game_fps_overwatch2',
            key: 'overwatch2',
            name: '守望先锋 2',
            milestone: {
              id: 'game_fps_overwatch2_ms',
              description: '在一局比赛中获得“全场最佳”，并赢下本场比赛',
            },
            tags: ['团队射击', '英雄', '配合'],
          },
          {
            id: 'game_fps_delta',
            key: 'delta',
            name: '三角洲行动',
            milestone: {
              id: 'game_fps_delta_ms',
              description: '单局内完成一次灭队，并成功撤离且收益超过 100 万',
            },
            tags: ['战术', '撤离', '博弈'],
          },
        ],
      },
      {
        id: 'game_moba',
        key: 'moba',
        label: 'MOBA',
        order: 2,
        items: [
          {
            id: 'game_moba_lol',
            key: 'lol',
            name: '英雄联盟',
            milestone: {
              id: 'game_moba_lol_ms',
              description: '在线上或野区练习 20 分钟补兵 ≥ 120，并赢下一局对局',
            },
            tags: ['MOBA', '补刀', '运营'],
          },
          {
            id: 'game_moba_dota2',
            key: 'dota2',
            name: 'Dota 2',
            milestone: {
              id: 'game_moba_dota2_ms',
              description: '成功执行一次“三连控图 + 团战先手”的运营，并赢下一局比赛',
            },
            tags: ['MOBA', '控图', '节奏'],
          },
          {
            id: 'game_moba_honor_of_kings',
            key: 'aov',
            name: '王者荣耀',
            milestone: {
              id: 'game_moba_honor_of_kings_ms',
              description: '累计获得 5 次金牌位置评价',
            },
            tags: ['手机 MOBA', '上分', '团队'],
          },
          {
            id: 'game_moba_onmyoji_arena',
            key: 'onmyoji_arena',
            name: '决战平安京',
            milestone: {
              id: 'game_moba_onmyoji_arena_ms',
              description: '累计获得 5 次本场 MVP 评价',
            },
            tags: ['手机 MOBA', '阴阳师', '操作'],
          },
          {
            id: 'game_moba_wild_rift',
            key: 'wild_rift',
            name: '英雄联盟：激斗峡谷',
            milestone: {
              id: 'game_moba_wild_rift_ms',
              description: '累计获得 5 次 S 级及以上评价',
            },
            tags: ['手机 MOBA', '短对局', '走位'],
          },
        ],
      },
      {
        id: 'game_rpg_arpg',
        key: 'rpg_arpg',
        label: 'RPG',
        order: 3,
        items: [
          {
            id: 'game_rpg_p5',
            key: 'persona5',
            name: '女神异闻录 5',
            milestone: {
              id: 'game_rpg_p5_ms',
              description: '推进主线并通关鸭志田殿堂',
            },
            tags: ['日式 RPG', '剧情', '校园'],
          },
          {
            id: 'game_rpg_elden_ring',
            key: 'elden_ring',
            name: '艾尔登法环',
            milestone: {
              id: 'game_rpg_elden_ring_ms',
              description: '击败任意一名主线 Boss',
            },
            tags: ['魂系', '开放世界', '高难度'],
          },
          {
            id: 'game_rpg_mhw',
            key: 'mhw',
            name: '怪物猎人：世界',
            milestone: {
              id: 'game_rpg_mhw_ms',
              description: '使用同一种武器，单刷完成 3 只不同的古龙狩猎',
            },
            tags: ['狩猎', '配装', '合作'],
          },
          {
            id: 'game_rpg_cyberpunk2077',
            key: 'cyberpunk2077',
            name: '赛博朋克 2077',
            milestone: {
              id: 'game_rpg_cyberpunk2077_ms',
              description: '推进主线并完成任意一个结局',
            },
            tags: ['开放世界', '科幻', '叙事'],
          },
          {
            id: 'game_rpg_wuthering_waves',
            key: 'wuthering_waves',
            name: '鸣潮',
            milestone: {
              id: 'game_rpg_wuthering_waves_ms',
              description: '培养一名角色至 90 级，并将全部声骸提升至 25 级',
            },
            tags: ['动作', '养成', '开放世界'],
          },
        ],
      },
      {
        id: 'game_act',
        key: 'act',
        label: '动作',
        order: 4,
        items: [
          {
            id: 'game_act_sekiro',
            key: 'sekiro',
            name: '只狼：影逝二度',
            milestone: {
              id: 'game_act_sekiro_ms',
              description: '在同一名 Boss 战中，连续弹反 5 次关键攻击',
            },
            tags: ['动作', '魂系', '弹反'],
          },
          {
            id: 'game_act_dmc5',
            key: 'dmc5',
            name: '鬼泣 5',
            milestone: {
              id: 'game_act_dmc5_ms',
              description: '完成一段连续 ≥ 20 秒的 SSS 评价连段',
            },
            tags: ['连招', '华丽', '动作'],
          },
          {
            id: 'game_act_hollow_knight',
            key: 'hollow_knight',
            name: '空洞骑士',
            milestone: {
              id: 'game_act_hollow_knight_ms',
              description: '击败任意一名梦境 Boss 的强化形态',
            },
            tags: ['类银河战士恶魔城', '探索', 'Boss 战'],
          },
          {
            id: 'game_act_nier_automata',
            key: 'nier_automata',
            name: '尼尔：机械纪元',
            milestone: {
              id: 'game_act_nier_automata_ms',
              description: '完成一次不受伤的 5 分钟连续战斗',
            },
            tags: ['动作', '叙事', '多结局'],
          },
          {
            id: 'game_act_ghost_of_tsushima',
            key: 'ghost_of_tsushima',
            name: '对马岛之魂',
            milestone: {
              id: 'game_act_ghost_of_tsushima_ms',
              description: '连续完成 3 场完美决斗并取得胜利',
            },
            tags: ['武士', '开放世界', '对决'],
          },
        ],
      },
      {
        id: 'game_strategy',
        key: 'strategy',
        label: '策略 / 战术 / 经营',
        order: 5,
        items: [
          {
            id: 'game_strategy_civ6',
            key: 'civ6',
            name: '文明 6',
            milestone: {
              id: 'game_strategy_civ6_ms',
              description: '在标准难度及以上完成一次科学胜利',
            },
            tags: ['4X', '经营', '长线策略'],
          },
          {
            id: 'game_strategy_sc2',
            key: 'sc2',
            name: '星际争霸 2',
            milestone: {
              id: 'game_strategy_sc2_ms',
              description: '稳定完成一次“三基地运营”，并赢下一局排位赛',
            },
            tags: ['RTS', '多线操作', '竞技'],
          },
          {
            id: 'game_strategy_xcom2',
            key: 'xcom2',
            name: 'XCOM 2',
            milestone: {
              id: 'game_strategy_xcom2_ms',
              description: '成功完成一次无队员伤亡的高危任务',
            },
            tags: ['战棋', '高风险', '策略'],
          },
          {
            id: 'game_strategy_cities2',
            key: 'cities2',
            name: '都市：天际线 2',
            milestone: {
              id: 'game_strategy_cities2_ms',
              description: '建立一座无赤字且交通拥堵率 ≤ 20% 的城市',
            },
            tags: ['城市经营', '模拟建造', '交通'],
          },
          {
            id: 'game_strategy_bg3',
            key: 'bg3',
            name: '博德之门 3',
            milestone: {
              id: 'game_strategy_bg3_ms',
              description: '在一次主线冲突中，通过非暴力方式解决问题（真正的“交涉胜利”方案）',
            },
            tags: ['CRPG', '多选项', '角色扮演'],
          },
        ],
      },
    ],
  },
  {
    id: 'domain_music',
    key: 'music',
    label: '音乐',
    order: 2,
    categories: [
      {
        id: 'music_modern_pop',
        key: 'modern_pop',
        label: '现代流行音乐',
        order: 1,
        items: [
          {
            id: 'music_modern_pop_fujii_kaze',
            key: 'fujii_kaze',
            name: '藤井风',
            milestone: {
              id: 'music_modern_pop_fujii_kaze_ms',
              description: '完整聆听并为 5 首藤井风作品标记情绪标签（例如：轻松、松弛、释怀）',
            },
            tags: ['日系流行', '情绪标签', '精听'],
          },
          {
            id: 'music_modern_pop_yonezu_kenshi',
            key: 'yonezu_kenshi',
            name: '米津玄师',
            milestone: {
              id: 'music_modern_pop_yonezu_kenshi_ms',
              description: '从 Bootleg 至 STRAY SHEEP 时期中选出 3 首让你强烈共鸣的歌曲，并写下简短备注',
            },
            tags: ['J-Pop', '专辑探索', '共鸣'],
          },
          {
            id: 'music_modern_pop_jpop_indie',
            key: 'jpop_indie',
            name: '日系独立音乐',
            milestone: {
              id: 'music_modern_pop_jpop_indie_ms',
              description: '连续一周，每天探索 1 位新独立歌手，并收藏至少 2 首喜欢的歌曲',
            },
            tags: ['独立音乐', '发现', '收藏'],
          },
          {
            id: 'music_modern_pop_cpop',
            key: 'cpop',
            name: '华语流行',
            milestone: {
              id: 'music_modern_pop_cpop_ms',
              description: '从不同时代选择 3 首华语歌曲，为每首创建「心情档案」（例如：怀旧、轻快、深夜）',
            },
            tags: ['华语', '情绪档案', '回忆'],
          },
          {
            id: 'music_modern_pop_kpop',
            key: 'kpop',
            name: 'K-Pop 精听',
            milestone: {
              id: 'music_modern_pop_kpop_ms',
              description: '为同一首 K-Pop 歌曲标记节奏感、Hook 亮点和主副歌结构',
            },
            tags: ['K-Pop', '结构分析', '节奏'],
          },
        ],
      },
      {
        id: 'music_instrument',
        key: 'instrument',
        label: '演奏 / 器乐',
        order: 2,
        items: [
          {
            id: 'music_instrument_piano',
            key: 'piano',
            name: '钢琴练习',
            milestone: {
              id: 'music_instrument_piano_ms',
              description: '学习并完成一段不少于 30 秒的钢琴旋律，可以是简谱或 APP 内录音',
            },
            tags: ['钢琴', '入门', '旋律'],
          },
          {
            id: 'music_instrument_guitar',
            key: 'guitar',
            name: '吉他练习',
            milestone: {
              id: 'music_instrument_guitar_ms',
              description: '学会并流畅演奏一个完整的和弦循环（例如：C–G–Am–F）',
            },
            tags: ['吉他', '和弦', '伴奏'],
          },
          {
            id: 'music_instrument_violin',
            key: 'violin',
            name: '小提琴练习',
            milestone: {
              id: 'music_instrument_violin_ms',
              description: '连续 7 天，每天完成不少于 10 分钟的小提琴练习记录',
            },
            tags: ['小提琴', '连续练习', '基础'],
          },
          {
            id: 'music_instrument_drum',
            key: 'drum',
            name: '打击乐 / 架子鼓',
            milestone: {
              id: 'music_instrument_drum_ms',
              description: '使用节拍器稳定打出一段 4/4 节奏循环，时长不少于 20 秒',
            },
            tags: ['节奏', '鼓', '基础功'],
          },
          {
            id: 'music_instrument_band',
            key: 'band',
            name: '乐队合奏练习',
            milestone: {
              id: 'music_instrument_band_ms',
              description: '完成一次「自我合奏」实验：录下两轨不同乐器，并简单混合在一起',
            },
            tags: ['合奏', '多轨录音', '尝试'],
          },
        ],
      },
      {
        id: 'music_composition',
        key: 'composition',
        label: '作曲 / 创作 / 编曲',
        order: 3,
        items: [
          {
            id: 'music_composition_lyrics',
            key: 'lyrics',
            name: '作词练习',
            milestone: {
              id: 'music_composition_lyrics_ms',
              description: '写下 4 句主题一致、节奏统一的歌词草稿',
            },
            tags: ['作词', '表达', '节奏'],
          },
          {
            id: 'music_composition_melody',
            key: 'melody',
            name: '旋律创作',
            milestone: {
              id: 'music_composition_melody_ms',
              description: '哼唱或记录一条长度不少于 15 秒的原创旋律',
            },
            tags: ['旋律', '灵感', '记录'],
          },
          {
            id: 'music_composition_harmony',
            key: 'harmony',
            name: '和声探索',
            milestone: {
              id: 'music_composition_harmony_ms',
              description: '为一首喜欢的歌曲分析其主和弦走向（例如 I–V–vi–IV）',
            },
            tags: ['和声', '分析', '乐理'],
          },
          {
            id: 'music_composition_arrangement',
            key: 'arrangement',
            name: '简单编曲',
            milestone: {
              id: 'music_composition_arrangement_ms',
              description: '完成一段包含「鼓 + 和弦 + 主旋律」的三轨 Demo',
            },
            tags: ['编曲', '结构', '实践'],
          },
          {
            id: 'music_composition_sound_experiment',
            key: 'sound_experiment',
            name: '音色实验 / 录音',
            milestone: {
              id: 'music_composition_sound_experiment_ms',
              description: '用手机或简易软件录制一段不少于 20 秒的音色尝试',
            },
            tags: ['音色', '录音', '实验'],
          },
        ],
      },
      {
        id: 'music_vocal',
        key: 'vocal',
        label: '演唱 / 翻唱 / 舞台',
        order: 4,
        items: [
          {
            id: 'music_vocal_relaxed_jpop',
            key: 'relaxed_jpop',
            name: '轻松唱法练习',
            milestone: {
              id: 'music_vocal_relaxed_jpop_ms',
              description: '录制一段「气声 + 共鸣」为主的轻松唱段',
            },
            tags: ['唱歌', '轻松', '气声'],
          },
          {
            id: 'music_vocal_cover',
            key: 'cover',
            name: '翻唱尝试',
            milestone: {
              id: 'music_vocal_cover_ms',
              description: '完成一段不少于 30 秒的翻唱，可以是私藏录音',
            },
            tags: ['翻唱', '练习', '表达'],
          },
          {
            id: 'music_vocal_warmup',
            key: 'warmup',
            name: '声带热身',
            milestone: {
              id: 'music_vocal_warmup_ms',
              description: '连续 5 天完成每日 5 分钟嗓音热身练习',
            },
            tags: ['练声', '连续', '基础'],
          },
          {
            id: 'music_vocal_stage',
            key: 'stage',
            name: '舞台表现练习',
            milestone: {
              id: 'music_vocal_stage_ms',
              description: '模仿一位喜欢的歌手或偶像的舞台动作约 30 秒，并记录一点感受',
            },
            tags: ['舞台', '模仿', '肢体'],
          },
          {
            id: 'music_vocal_song_analysis',
            key: 'song_analysis',
            name: '歌曲演唱解析',
            milestone: {
              id: 'music_vocal_song_analysis_ms',
              description: '选择一首歌，简单分析主歌与副歌在演唱技巧上的差异',
            },
            tags: ['分析', '演唱技巧', '细节'],
          },
        ],
      },
      {
        id: 'music_experience',
        key: 'experience',
        label: '音乐体验 / 收藏 / 精听',
        order: 5,
        items: [
          {
            id: 'music_experience_night_listening',
            key: 'night_listening',
            name: '夜听仪式',
            milestone: {
              id: 'music_experience_night_listening_ms',
              description: '创建一个包含 10 首歌曲的「深夜歌单」，并在夜间完整使用 3 次',
            },
            tags: ['深夜', '歌单', '仪式感'],
          },
          {
            id: 'music_experience_live',
            key: 'live',
            name: '现场体验',
            milestone: {
              id: 'music_experience_live_ms',
              description: '观看一次 Live 或演唱会片段，并写下一句话的感受',
            },
            tags: ['现场', '氛围', '共鸣'],
          },
          {
            id: 'music_experience_playlists',
            key: 'playlists',
            name: '音乐收藏清单',
            milestone: {
              id: 'music_experience_playlists_ms',
              description: '建立 3 个标签明确的播放清单（例如：放松、训练、工作）',
            },
            tags: ['歌单', '标签', '整理'],
          },
          {
            id: 'music_experience_ambient',
            key: 'ambient',
            name: '治愈 / 环境音乐',
            milestone: {
              id: 'music_experience_ambient_ms',
              description: '完整聆听 3 次白噪音或环境音乐，并简单记录心情变化',
            },
            tags: ['环境音乐', '治愈', '放松'],
          },
          {
            id: 'music_experience_deep_listening',
            key: 'deep_listening',
            name: '精听专注',
            milestone: {
              id: 'music_experience_deep_listening_ms',
              description: '选择 1 首歌曲，进行一次完全不分心的深度聆听（期间不看手机、不做其他事）',
            },
            tags: ['精听', '专注', '觉察'],
          },
        ],
      },
    ],
  },
  {
    id: 'domain_reading',
    key: 'reading',
    label: '阅读',
    order: 3,
    categories: [
      {
        id: 'reading_literature',
        key: 'literature',
        label: '文学阅读',
        order: 1,
        items: [
          {
            id: 'reading_literature_classics',
            key: 'classics',
            name: '世界名著',
            milestone: {
              id: 'reading_literature_classics_ms',
              description: '连续 7 天，每天阅读不少于 15 分钟，并写下一条对人物的理解',
            },
            tags: ['名著', '人物', '长期阅读'],
          },
          {
            id: 'reading_literature_modern_fiction',
            key: 'modern_fiction',
            name: '现代小说',
            milestone: {
              id: 'reading_literature_modern_fiction_ms',
              description: '完整阅读一个章节，并记录一段你印象最深的句子',
            },
            tags: ['小说', '现代', '摘录'],
          },
          {
            id: 'reading_literature_mystery',
            key: 'mystery',
            name: '悬疑 / 推理小说',
            milestone: {
              id: 'reading_literature_mystery_ms',
              description: '在情节发展前成功推测一次重要转折，并写下你的推断理由',
            },
            tags: ['悬疑', '推理', '情节'],
          },
          {
            id: 'reading_literature_jlit',
            key: 'jlit',
            name: '日本文学',
            milestone: {
              id: 'reading_literature_jlit_ms',
              description: '完整阅读一篇短篇小说或一个章节，并为其标记情绪标签',
            },
            tags: ['日系', '短篇', '情绪'],
          },
          {
            id: 'reading_literature_chinese',
            key: 'chinese_lit',
            name: '华语文学',
            milestone: {
              id: 'reading_literature_chinese_ms',
              description: '为一本华语作品写下 3 个主题关键词（例如：孤独、成长、宿命）',
            },
            tags: ['华语', '主题', '反思'],
          },
        ],
      },
      {
        id: 'reading_self_philosophy',
        key: 'self_philosophy',
        label: '心理 / 自我成长 / 哲学',
        order: 2,
        items: [
          {
            id: 'reading_self_psychology',
            key: 'psychology',
            name: '心理学入门',
            milestone: {
              id: 'reading_self_psychology_ms',
              description: '阅读并记录 3 个心理学概念（例如：投射、自我效能感）',
            },
            tags: ['心理学', '概念', '自我理解'],
          },
          {
            id: 'reading_self_emotion',
            key: 'emotion',
            name: '情绪管理',
            milestone: {
              id: 'reading_self_emotion_ms',
              description: '从一本书中挑选 1 个「对今天有用」的观点，并标注下来',
            },
            tags: ['情绪', '成长', '落地'],
          },
          {
            id: 'reading_self_growth',
            key: 'self_growth',
            name: '个人成长',
            milestone: {
              id: 'reading_self_growth_ms',
              description: '连续阅读 5 天，并每天记录 1 条想尝试的行为改变点子',
            },
            tags: ['习惯', '反思', '长期'],
          },
          {
            id: 'reading_self_philosophy_lite',
            key: 'philosophy_lite',
            name: '哲学启蒙',
            milestone: {
              id: 'reading_self_philosophy_lite_ms',
              description: '读完一节哲学相关内容，并写下一句你自己的解释',
            },
            tags: ['哲学', '抽象', '自我表述'],
          },
          {
            id: 'reading_self_mindfulness',
            key: 'mindfulness',
            name: '正念 / 觉察阅读',
            milestone: {
              id: 'reading_self_mindfulness_ms',
              description: '进行一次 15 分钟的不看手机、只专注阅读的沉浸式阅读',
            },
            tags: ['正念', '沉浸', '安静'],
          },
        ],
      },
      {
        id: 'reading_biz_tech',
        key: 'biz_tech',
        label: '商业 / 科技 / 战略',
        order: 3,
        items: [
          {
            id: 'reading_biz_strategy',
            key: 'biz_strategy',
            name: '商业战略',
            milestone: {
              id: 'reading_biz_strategy_ms',
              description: '为一本商业书籍写下 1 条「可以马上行动」的洞察',
            },
            tags: ['商业', '战略', '行动'],
          },
          {
            id: 'reading_biz_product_ux',
            key: 'product_ux',
            name: '产品 / 设计',
            milestone: {
              id: 'reading_biz_product_ux_ms',
              description: '从阅读中找到 1 个你认为 Echo 产品可以改进的点，并记录下来',
            },
            tags: ['产品', '设计', '洞察'],
          },
          {
            id: 'reading_biz_tech_trend',
            key: 'tech_trend',
            name: '科技趋势 / AI',
            milestone: {
              id: 'reading_biz_tech_trend_ms',
              description: '阅读一篇技术文章，并写下其中 1 个核心概念（例如：向量数据库）',
            },
            tags: ['科技', 'AI', '前沿'],
          },
          {
            id: 'reading_biz_management',
            key: 'management',
            name: '管理与领导',
            milestone: {
              id: 'reading_biz_management_ms',
              description: '记录一条你认为真正有用的「管理反直觉」观点',
            },
            tags: ['管理', '领导力', '反直觉'],
          },
          {
            id: 'reading_biz_finance',
            key: 'finance',
            name: '财经 / 市场洞察',
            milestone: {
              id: 'reading_biz_finance_ms',
              description: '用 3 句话总结一篇财经内容的核心逻辑',
            },
            tags: ['财经', '市场', '结构'],
          },
        ],
      },
      {
        id: 'reading_study',
        key: 'study',
        label: '学习型阅读',
        order: 4,
        items: [
          {
            id: 'reading_study_academic_papers',
            key: 'academic_papers',
            name: '学术论文',
            milestone: {
              id: 'reading_study_academic_papers_ms',
              description: '完整阅读一篇论文的摘要（Abstract），并写出一句提炼总结',
            },
            tags: ['学术', '论文', '提炼'],
          },
          {
            id: 'reading_study_programming_docs',
            key: 'programming_docs',
            name: '编程 / 技术文档',
            milestone: {
              id: 'reading_study_programming_docs_ms',
              description: '阅读官方技术文档不少于 20 分钟，并完成一次对应的代码尝试',
            },
            tags: ['文档', '实践', '编程'],
          },
          {
            id: 'reading_study_textbook',
            key: 'textbook',
            name: '教材内容',
            milestone: {
              id: 'reading_study_textbook_ms',
              description: '完成一个小节的学习，并为本节标记难度（容易 / 一般 / 偏难）',
            },
            tags: ['教材', '课程', '难度'],
          },
          {
            id: 'reading_study_research_notes',
            key: 'research_notes',
            name: '研究型阅读',
            milestone: {
              id: 'reading_study_research_notes_ms',
              description: '以一个问题为驱动进行阅读，并在结尾写下自己的回答或结论',
            },
            tags: ['研究', '问题驱动', '笔记'],
          },
          {
            id: 'reading_study_foreign_language',
            key: 'foreign_language',
            name: '外语阅读',
            milestone: {
              id: 'reading_study_foreign_language_ms',
              description: '标记 10 个新单词或 3 个句式，并各写出 1 个例句',
            },
            tags: ['外语', '单词', '句型'],
          },
        ],
      },
      {
        id: 'reading_light',
        key: 'light',
        label: '休闲阅读',
        order: 5,
        items: [
          {
            id: 'reading_light_comic',
            key: 'comic_reading',
            name: '漫画阅读',
            milestone: {
              id: 'reading_light_comic_ms',
              description: '连续阅读 3 话漫画，并标记你最喜欢的角色',
            },
            tags: ['漫画', '角色', '放松'],
          },
          {
            id: 'reading_light_light_novel',
            key: 'light_novel',
            name: '轻小说',
            milestone: {
              id: 'reading_light_light_novel_ms',
              description: '完整阅读一章轻小说，并写下一条对主角或情节的感受',
            },
            tags: ['轻小说', '连续阅读', '情感'],
          },
          {
            id: 'reading_light_pop_sci',
            key: 'popular_science',
            name: '科普书籍',
            milestone: {
              id: 'reading_light_pop_sci_ms',
              description: '从一篇或一章科普内容中提炼 3 个简单易懂的知识点',
            },
            tags: ['科普', '知识点', '通俗'],
          },
          {
            id: 'reading_light_magazine',
            key: 'magazine',
            name: '杂志 / 短文章',
            milestone: {
              id: 'reading_light_magazine_ms',
              description: '连续精读 3 篇短文，并写出一句自己的评论或感想',
            },
            tags: ['短文', '评论', '泛读'],
          },
          {
            id: 'reading_light_fanfic',
            key: 'fanfic',
            name: '同人作品阅读',
            milestone: {
              id: 'reading_light_fanfic_ms',
              description: '为一篇同人作品标记 1 个你喜欢的梗或设定，并写下理由',
            },
            tags: ['同人', '设定', '兴趣'],
          },
        ],
      },
    ],
  },
  {
    id: 'domain_drawing',
    key: 'drawing',
    label: '绘画 / 插画',
    order: 4,
    categories: [
      {
        id: 'drawing_basic_sketch',
        key: 'basic_sketch',
        label: '基础素描',
        order: 1,
        items: [
          {
            id: 'drawing_basic_lines',
            key: 'lines',
            name: '线条练习',
            milestone: {
              id: 'drawing_basic_lines_milestone',
              description: '完成 2 页平行线、曲线或螺旋线条练习',
            },
            tags: ['基础', '素描', '入门'],
          },
          {
            id: 'drawing_basic_shapes',
            key: 'shapes',
            name: '几何体素描',
            milestone: {
              id: 'drawing_basic_shapes_milestone',
              description: '至少绘制 3 个光影正确的几何体（球、方、圆柱）',
            },
            tags: ['光影', '形体'],
          },
          // TODO: 可以在这里继续补充 1.3 ~ 1.5 等更多基础素描方向
        ],
      },

      {
        id: 'drawing_manga',
        key: 'manga',
        label: '漫画',
        order: 2,
        items: [
          {
            id: 'drawing_manga_storyboard',
            key: 'storyboard',
            name: '分镜与镜头感',
            milestone: {
              id: 'drawing_manga_storyboard_ms',
              description: '完成一页 4–6 格的漫画分镜草稿',
            },
            tags: ['漫画', '分镜', '叙事'],
          },
          {
            id: 'drawing_manga_character_sheet',
            key: 'character_sheet',
            name: '角色设定表',
            milestone: {
              id: 'drawing_manga_character_sheet_ms',
              description: '为 1 名角色绘制定稿立绘 + 至少 2 个表情',
            },
            tags: ['人物', '设定', 'OC'],
          },
          {
            id: 'drawing_manga_4koma',
            key: 'four_panel',
            name: '四格漫画',
            milestone: {
              id: 'drawing_manga_4koma_ms',
              description: '完成一条完整情节的四格漫画',
            },
            tags: ['日常', '短篇', '节奏'],
          },
          {
            id: 'drawing_manga_webtoon',
            key: 'webtoon',
            name: '纵向长条漫画',
            milestone: {
              id: 'drawing_manga_webtoon_ms',
              description: '完成一段纵向长条漫画草稿（含至少 3 个场景切换）',
            },
            tags: ['长条', '手机阅读', '现代漫画'],
          },
          {
            id: 'drawing_manga_fancomic',
            key: 'fan_comic',
            name: '同人短篇漫画',
            milestone: {
              id: 'drawing_manga_fancomic_ms',
              description: '完成一页以上的同人短篇漫画（可为线稿）',
            },
            tags: ['同人', '表达', '创作'],
          },
        ],
      },

      {
        id: 'drawing_characters',
        key: 'characters',
        label: '人物与人体',
        order: 3,
        items: [
          {
            id: 'drawing_characters_anatomy_basics',
            key: 'anatomy_basics',
            name: '人体基本结构',
            milestone: {
              id: 'drawing_characters_anatomy_basics_ms',
              description: '绘制 3 个不同姿势的人体结构（骨架/火柴人均可）',
            },
            tags: ['人体', '基础', '结构'],
          },
          {
            id: 'drawing_characters_facial_features',
            key: 'facial_features',
            name: '五官练习',
            milestone: {
              id: 'drawing_characters_facial_features_ms',
              description: '练习 3 个角度不同的眼睛/鼻子/嘴巴',
            },
            tags: ['五官', '面部', '练习'],
          },
          {
            id: 'drawing_characters_portrait_sketch',
            key: 'portrait_sketch',
            name: '人像临摹',
            milestone: {
              id: 'drawing_characters_portrait_sketch_ms',
              description: '完成一张 ≥ 20 分钟的人像临摹并标注光源',
            },
            tags: ['人像', '临摹', '光影'],
          },
          {
            id: 'drawing_characters_gesture_drawing',
            key: 'gesture_drawing',
            name: '动态速写',
            milestone: {
              id: 'drawing_characters_gesture_drawing_ms',
              description: '完成 10 张 30 秒姿势速写',
            },
            tags: ['速写', '动态', '练习'],
          },
          {
            id: 'drawing_characters_clothing_fabric',
            key: 'clothing_fabric',
            name: '服饰与褶皱',
            milestone: {
              id: 'drawing_characters_clothing_fabric_ms',
              description: '绘制至少 1 张带褶皱的服饰练习（裙摆/袖子等）',
            },
            tags: ['服饰', '褶皱', '细节'],
          },
        ],
      },
      {
        id: 'drawing_backgrounds',
        key: 'backgrounds',
        label: '场景与构图',
        order: 4,
        items: [
          {
            id: 'drawing_backgrounds_urban_sketch',
            key: 'urban_sketch',
            name: '城市速写',
            milestone: {
              id: 'drawing_backgrounds_urban_sketch_ms',
              description: '完成一次 10–20 分钟的城市/街景速写',
            },
            tags: ['城市', '速写', '街景'],
          },
          {
            id: 'drawing_backgrounds_landscape',
            key: 'landscape',
            name: '自然风景',
            milestone: {
              id: 'drawing_backgrounds_landscape_ms',
              description: '绘制 1 张自然风景草稿（树/山/天空）',
            },
            tags: ['风景', '自然', '环境'],
          },
          {
            id: 'drawing_backgrounds_architecture_perspective',
            key: 'architecture_perspective',
            name: '建筑透视',
            milestone: {
              id: 'drawing_backgrounds_architecture_perspective_ms',
              description: '完成 1 张两点透视的建筑草图（室外或室内）',
            },
            tags: ['建筑', '透视', '结构'],
          },
          {
            id: 'drawing_backgrounds_composition',
            key: 'composition',
            name: '构图练习',
            milestone: {
              id: 'drawing_backgrounds_composition_ms',
              description: '使用三分法/S 曲线完成 1 张构图练习稿',
            },
            tags: ['构图', '布局', '技巧'],
          },
          {
            id: 'drawing_backgrounds_atmosphere_art',
            key: 'atmosphere_art',
            name: '氛围画',
            milestone: {
              id: 'drawing_backgrounds_atmosphere_art_ms',
              description: '完成一张主色调明确的氛围画（可用数字草稿）',
            },
            tags: ['氛围', '色调', '情绪'],
          },
        ],
      },
      {
        id: 'drawing_concept',
        key: 'concept',
        label: '原创与概念设计',
        order: 5,
        items: [
          {
            id: 'drawing_concept_original_character',
            key: 'original_character',
            name: '原创角色',
            milestone: {
              id: 'drawing_concept_original_character_ms',
              description: '绘制一名原创角色（含至少 2 个特色元素）',
            },
            tags: ['原创', '角色', '设计'],
          },
          {
            id: 'drawing_concept_illustration',
            key: 'illustration',
            name: '插画创作',
            milestone: {
              id: 'drawing_concept_illustration_ms',
              description: '完成一张 ≥ 60 分钟的小插画（线稿或半成稿均可）',
            },
            tags: ['插画', '创作', '完整作品'],
          },
          {
            id: 'drawing_concept_concept_art',
            key: 'concept_art',
            name: '概念设计',
            milestone: {
              id: 'drawing_concept_concept_art_ms',
              description: '为同一主题绘制 3 个不同迭代版本（如武器/场景/生物）',
            },
            tags: ['概念', '迭代', '设计'],
          },
          {
            id: 'drawing_concept_style_exploration',
            key: 'style_exploration',
            name: '风格模仿',
            milestone: {
              id: 'drawing_concept_style_exploration_ms',
              description: '临摹 1 位喜爱的画师风格并记录心得',
            },
            tags: ['风格', '学习', '临摹'],
          },
          {
            id: 'drawing_concept_themed_art',
            key: 'themed_art',
            name: '主题创作',
            milestone: {
              id: 'drawing_concept_themed_art_ms',
              description: '以"风/光/孤独/城市/治愈"任一主题完成一次创作',
            },
            tags: ['主题', '创作', '表达'],
          },
        ],
      },
    ],
  },
  {
    id: 'domain_coding',
    key: 'coding',
    label: '编程 / 代码',
    order: 5,//
    categories: [
      {
        id: 'coding_basic_lang',
        key: 'basic_lang',
        label: '编程基础与语言入门',
        order: 1,
        items: [
          {
            id: 'coding_basic_lang_python',
            key: 'python',
            name: 'Python 基础',
            milestone: {
              id: 'coding_basic_lang_python_ms',
              description: '完成一个简单的控制台小程序，例如一个四则运算计算器',
            },
            tags: ['Python', '入门', '基础语法'],
          },
          {
            id: 'coding_basic_lang_java',
            key: 'java',
            name: 'Java 入门',
            milestone: {
              id: 'coding_basic_lang_java_ms',
              description: '编写一个包含自定义 Class 的小程序，并成功在本地运行',
            },
            tags: ['Java', '面向对象', '入门'],
          },
          {
            id: 'coding_basic_lang_c_cpp',
            key: 'c_cpp',
            name: 'C / C++ 基础',
            milestone: {
              id: 'coding_basic_lang_c_cpp_ms',
              description: '用 C/C++ 实现一次循环输入与条件判断的小程序，例如猜数字游戏',
            },
            tags: ['C', 'C++', '基础语法'],
          },
          {
            id: 'coding_basic_lang_js',
            key: 'javascript',
            name: 'JavaScript 基础',
            milestone: {
              id: 'coding_basic_lang_js_ms',
              description: '在浏览器控制台中成功操作 DOM 元素，并改变页面上一处文字或样式',
            },
            tags: ['JavaScript', '前端', 'DOM'],
          },
          {
            id: 'coding_basic_lang_dsa',
            key: 'dsa_intro',
            name: '数据结构与算法入门',
            milestone: {
              id: 'coding_basic_lang_dsa_ms',
              description: '独立实现一次数组去重或简单排序（冒泡 / 选择 / 插入）并通过样例测试',
            },
            tags: ['数据结构', '算法', '基础'],
          },
        ],
      },
      {
        id: 'coding_web_frontend',
        key: 'web_frontend',
        label: 'Web 前端',
        order: 2,
        items: [
          {
            id: 'coding_web_frontend_static_page',
            key: 'static_page',
            name: 'HTML + CSS 静态页面',
            milestone: {
              id: 'coding_web_frontend_static_page_ms',
              description: '完成一个包含导航栏、主内容区和底部区域的简单单页页面',
            },
            tags: ['HTML', 'CSS', '页面结构'],
          },
          {
            id: 'coding_web_frontend_responsive',
            key: 'responsive',
            name: '响应式布局',
            milestone: {
              id: 'coding_web_frontend_responsive_ms',
              description: '使用 Flex 或 Grid 完成一个在手机与桌面端都不崩的布局',
            },
            tags: ['响应式', '布局', '适配'],
          },
          {
            id: 'coding_web_frontend_vanilla_interaction',
            key: 'vanilla_interaction',
            name: '原生 JS 交互',
            milestone: {
              id: 'coding_web_frontend_vanilla_interaction_ms',
              description: '实现一个按钮点击后弹出提示或切换主题色的小交互',
            },
            tags: ['交互', 'JavaScript', '事件'],
          },
          {
            id: 'coding_web_frontend_react_basic',
            key: 'react_basic',
            name: 'React 基础组件',
            milestone: {
              id: 'coding_web_frontend_react_basic_ms',
              description: '实现一个可复用的 React 组件（如 Todo 列表），支持新增与删除',
            },
            tags: ['React', '组件', '复用'],
          },
          {
            id: 'coding_web_frontend_tooling',
            key: 'frontend_tooling',
            name: '前端工程化基础',
            milestone: {
              id: 'coding_web_frontend_tooling_ms',
              description: '使用 Vite / Webpack / Next.js 等工具成功跑起一个前端开发环境',
            },
            tags: ['工程化', 'Vite', 'Next.js'],
          },
        ],
      },
      {
        id: 'coding_backend',
        key: 'backend_api_db',
        label: '后端 / API / 数据库',
        order: 3,
        items: [
          {
            id: 'coding_backend_node_express',
            key: 'node_express',
            name: 'Node.js / Express 简单接口',
            milestone: {
              id: 'coding_backend_node_express_ms',
              description: '实现一个返回 JSON 数据的 GET 接口，并在本地成功访问',
            },
            tags: ['Node.js', 'Express', 'API'],
          },
          {
            id: 'coding_backend_restful',
            key: 'restful',
            name: 'RESTful API 设计',
            milestone: {
              id: 'coding_backend_restful_ms',
              description: '为一个简单资源（如 /tasks）设计并实现至少 2 个 API（GET / POST）',
            },
            tags: ['REST', '接口设计'],
          },
          {
            id: 'coding_backend_database_intro',
            key: 'database_intro',
            name: '数据库入门',
            milestone: {
              id: 'coding_backend_database_intro_ms',
              description: '完成一次建表、插入数据与查询数据的完整流程',
            },
            tags: ['数据库', 'SQL', '入门'],
          },
          {
            id: 'coding_backend_orm',
            key: 'orm',
            name: 'ORM 使用',
            milestone: {
              id: 'coding_backend_orm_ms',
              description: '通过 Prisma / TypeORM / Sequelize 等 ORM 完成一次对记录的增删改查',
            },
            tags: ['ORM', 'Prisma', 'TypeORM'],
          },
          {
            id: 'coding_backend_auth_basic',
            key: 'auth_basic',
            name: '用户认证基础',
            milestone: {
              id: 'coding_backend_auth_basic_ms',
              description: '实现一次最简单的登录流程（可为伪登录），并在前端显示登录状态',
            },
            tags: ['登录', '认证', '状态'],
          },
        ],
      },
      {
        id: 'coding_data_ai',
        key: 'data_ai_script',
        label: '数据 / AI / 自动化脚本',
        order: 4,
        items: [
          {
            id: 'coding_data_ai_analysis_script',
            key: 'analysis_script',
            name: '数据分析脚本',
            milestone: {
              id: 'coding_data_ai_analysis_script_ms',
              description: '使用 Python 读取一次 CSV/JSON 数据并完成一次简单统计（如平均值）',
            },
            tags: ['数据分析', 'Python', '脚本'],
          },
          {
            id: 'coding_data_ai_crawler',
            key: 'crawler',
            name: '爬虫 / 请求脚本',
            milestone: {
              id: 'coding_data_ai_crawler_ms',
              description: '实现一个脚本，从公开 API 或网页抓取数据并保存到本地',
            },
            tags: ['爬虫', '请求', '数据抓取'],
          },
          {
            id: 'coding_data_ai_llm_api',
            key: 'llm_api',
            name: 'AI / LLM API 调用',
            milestone: {
              id: 'coding_data_ai_llm_api_ms',
              description: '调用一次任意 LLM API（如 OpenAI / Claude / Gemini）并打印返回结果',
            },
            tags: ['LLM', 'API', 'AI'],
          },
          {
            id: 'coding_data_ai_automation',
            key: 'automation',
            name: '自动化脚本',
            milestone: {
              id: 'coding_data_ai_automation_ms',
              description: '编写一个脚本自动完成一件小事，例如批量重命名文件或整理目录',
            },
            tags: ['自动化', '脚本', '效率'],
          },
          {
            id: 'coding_data_ai_visualization',
            key: 'visualization',
            name: '简单数据可视化',
            milestone: {
              id: 'coding_data_ai_visualization_ms',
              description: '使用 Matplotlib / ECharts / Chart.js 等生成一张可视化图表',
            },
            tags: ['可视化', '图表', '数据'],
          },
        ],
      },
      {
        id: 'coding_engineering',
        key: 'engineering_project_oss',
        label: '工程实践 / 项目 / 开源',
        order: 5,
        items: [
          {
            id: 'coding_engineering_side_project',
            key: 'side_project',
            name: '个人小项目',
            milestone: {
              id: 'coding_engineering_side_project_ms',
              description: '完成一个可以自己日常使用的小工具或小页面，并持续使用不少于 3 次',
            },
            tags: ['项目', '实践', '工具'],
          },
          {
            id: 'coding_engineering_git_github',
            key: 'git_github',
            name: 'Git 与 GitHub 基础',
            milestone: {
              id: 'coding_engineering_git_github_ms',
              description: '完成一次本地 Git 提交并推送到 GitHub，同时配置好 README',
            },
            tags: ['Git', 'GitHub', '版本控制'],
          },
          {
            id: 'coding_engineering_unit_test',
            key: 'unit_test',
            name: '单元测试入门',
            milestone: {
              id: 'coding_engineering_unit_test_ms',
              description: '为一个函数编写至少 2 个单元测试用例并成功通过',
            },
            tags: ['测试', '质量', '覆盖率'],
          },
          {
            id: 'coding_engineering_debug_perf',
            key: 'debug_performance',
            name: '性能与调试实践',
            milestone: {
              id: 'coding_engineering_debug_perf_ms',
              description: '使用浏览器 DevTools 或日志调试，成功定位并修复一个 Bug',
            },
            tags: ['调试', '性能', '问题定位'],
          },
          {
            id: 'coding_engineering_open_source',
            key: 'open_source',
            name: '开源参与',
            milestone: {
              id: 'coding_engineering_open_source_ms',
              description: '向一个开源项目提交一次 PR（哪怕只是修文档或修改注释）',
            },
            tags: ['开源', '贡献', '协作'],
          },
        ],
      },
    ],
  },
  {
    id: 'domain_language',
    key: 'language',
    label: '语言学习',
    order: 6,
    categories: [
      {
        id: 'language_english_practical',
        key: 'english_practical',
        label: '实战英语',
        order: 1,
        items: [
          {
            id: 'language_english_practical_ielts_vocab',
            key: 'ielts_vocab',
            name: 'IELTS 词汇',
            milestone: {
              id: 'language_english_practical_ielts_vocab_ms',
              description: '背诵并正确使用 20 个雅思高频词，例如 environment、productivity 等',
            },
            tags: ['英语', '词汇', '考试'],
          },
          {
            id: 'language_english_practical_ielts_speaking',
            key: 'ielts_speaking',
            name: 'IELTS 口语 Part 2',
            milestone: {
              id: 'language_english_practical_ielts_speaking_ms',
              description: '录制一次不少于 90 秒的英文故事或描述，可参考 SEEL 结构',
            },
            tags: ['口语', '表达', '练习'],
          },
          {
            id: 'language_english_practical_ielts_reading',
            key: 'ielts_reading',
            name: 'IELTS 阅读',
            milestone: {
              id: 'language_english_practical_ielts_reading_ms',
              description: '完成一篇雅思阅读文章，并总结 3 句核心观点',
            },
            tags: ['阅读', '理解', '雅思'],
          },
          {
            id: 'language_english_practical_det',
            key: 'det_practice',
            name: 'Duolingo English Test 实操',
            milestone: {
              id: 'language_english_practical_det_ms',
              description: '完成一次听说读写模拟题，并记录自己的薄弱项',
            },
            tags: ['Duolingo', '综合能力', '考试'],
          },
          {
            id: 'language_english_practical_daily',
            key: 'daily_english',
            name: '英语日常生活表达',
            milestone: {
              id: 'language_english_practical_daily_ms',
              description: '用英文写 3 句今天真实发生的事情，尽量贴近日常口语表达',
            },
            tags: ['日常', '口语', '输出'],
          },
        ],
      },
      {
        id: 'language_japanese_anime',
        key: 'japanese_anime',
        label: '日语 × 动漫 / 文化',
        order: 2,
        items: [
          {
            id: 'language_japanese_anime_kana_words',
            key: 'kana_words',
            name: '五十音 × 动漫单词',
            milestone: {
              id: 'language_japanese_anime_kana_words_ms',
              description: '掌握 20 个常见动漫词汇，例如 ありがとう、すごい、かわいい 等',
            },
            tags: ['日语', '词汇', '动漫'],
          },
          {
            id: 'language_japanese_anime_listening',
            key: 'anime_listening',
            name: '动漫听力',
            milestone: {
              id: 'language_japanese_anime_listening_ms',
              description: '精听动画片段不少于 1 分钟，并抓到 3 个单词或短句',
            },
            tags: ['听力', '日语', '动漫'],
          },
          {
            id: 'language_japanese_anime_shadowing',
            key: 'anime_shadowing',
            name: '动漫台词复述',
            milestone: {
              id: 'language_japanese_anime_shadowing_ms',
              description: '模仿一段动漫角色台词不少于 20 秒，尽量还原咬字、节奏与感情',
            },
            tags: ['跟读', '口语', '节奏'],
          },
          {
            id: 'language_japanese_anime_grammar',
            key: 'anime_grammar',
            name: '日语语法 × 动漫例句',
            milestone: {
              id: 'language_japanese_anime_grammar_ms',
              description: '学习 1 个语法点，例如 ～ている 或 ～ちゃう，并造出一两句动漫风例句',
            },
            tags: ['语法', '造句', '日语'],
          },
          {
            id: 'language_japanese_anime_reading',
            key: 'anime_reading',
            name: '日语阅读 × 轻小说',
            milestone: {
              id: 'language_japanese_anime_reading_ms',
              description: '阅读轻小说 1 页，并标记 5 个新词',
            },
            tags: ['阅读', '轻小说', '生词'],
          },
        ],
      },
      {
        id: 'language_french_cinema',
        key: 'french_cinema',
        label: '法语 / 欧陆电影 × 语言',
        order: 3,
        items: [
          {
            id: 'language_french_cinema_phonetics',
            key: 'phonetics',
            name: '法语基本发音',
            milestone: {
              id: 'language_french_cinema_phonetics_ms',
              description: '正确读出 10 个法语基础词汇，例如 bonjour、merci、très 等',
            },
            tags: ['法语', '发音', '基础'],
          },
          {
            id: 'language_french_cinema_phrases',
            key: 'phrases',
            name: '法语日常句式',
            milestone: {
              id: 'language_french_cinema_phrases_ms',
              description: '掌握 5 句法语日常表达，例如问候、购物或点餐用语',
            },
            tags: ['法语', '口语', '日常'],
          },
          {
            id: 'language_french_cinema_listening',
            key: 'cinema_listening',
            name: '法语电影听力',
            milestone: {
              id: 'language_french_cinema_listening_ms',
              description: '观看一段不少于 1 分钟的法语电影片段，并记录至少 2 个听懂的词或句子',
            },
            tags: ['听力', '电影', '法语'],
          },
          {
            id: 'language_french_cinema_reading',
            key: 'cinema_reading',
            name: '法语阅读',
            milestone: {
              id: 'language_french_cinema_reading_ms',
              description: '阅读一小段简单法语故事，并写出 3 句自己的理解',
            },
            tags: ['阅读', '故事', '理解'],
          },
          {
            id: 'language_french_cinema_expression',
            key: 'elegant_expression',
            name: '法式表达',
            milestone: {
              id: 'language_french_cinema_expression_ms',
              description: '模仿一句具有审美或文艺感的法语表达，并写下中文含义',
            },
            tags: ['表达', '审美', '文艺'],
          },
        ],
      },
      {
        id: 'language_chinese_advanced',
        key: 'chinese_advanced',
        label: '中文 / 语文高阶能力',
        order: 4,
        items: [
          {
            id: 'language_chinese_advanced_poetry',
            key: 'poetry',
            name: '古诗词',
            milestone: {
              id: 'language_chinese_advanced_poetry_ms',
              description: '背诵一首古诗词，并写一句现代化的理解或翻译',
            },
            tags: ['古诗词', '背诵', '理解'],
          },
          {
            id: 'language_chinese_advanced_gaokao_essay',
            key: 'gaokao_essay',
            name: '高考作文技巧',
            milestone: {
              id: 'language_chinese_advanced_gaokao_essay_ms',
              description: '完成一段不少于 200 字的议论文练习，使用总分总结构',
            },
            tags: ['作文', '结构', '议论文'],
          },
          {
            id: 'language_chinese_advanced_argument',
            key: 'argument_writing',
            name: '议论文写作',
            milestone: {
              id: 'language_chinese_advanced_argument_ms',
              description: '用 Point → Explanation → Example 写出一段有逻辑的观点文字',
            },
            tags: ['论证', '结构', '表达'],
          },
          {
            id: 'language_chinese_advanced_literature',
            key: 'literature_reading',
            name: '文学阅读',
            milestone: {
              id: 'language_chinese_advanced_literature_ms',
              description: '阅读一篇短文，并写出 3 句自己的观点与情绪标签',
            },
            tags: ['阅读', '情绪', '观点'],
          },
          {
            id: 'language_chinese_advanced_rhetoric',
            key: 'rhetoric',
            name: '语感与修辞',
            milestone: {
              id: 'language_chinese_advanced_rhetoric_ms',
              description: '模仿 3 种修辞写出 3 句话，例如比喻、排比或象征',
            },
            tags: ['修辞', '语感', '练习'],
          },
        ],
      },
      {
        id: 'language_habits_polyglot',
        key: 'language_habits',
        label: '语言习惯养成与多语能力',
        order: 5,
        items: [
          {
            id: 'language_habits_polyglot_input',
            key: 'daily_input',
            name: '外语输入习惯',
            milestone: {
              id: 'language_habits_polyglot_input_ms',
              description: '连续 5 天，每天听不少于 10 分钟外语音频',
            },
            tags: ['输入', '听力', '习惯'],
          },
          {
            id: 'language_habits_polyglot_output',
            key: 'daily_output',
            name: '外语输出习惯',
            milestone: {
              id: 'language_habits_polyglot_output_ms',
              description: '当天使用任意外语写 3 句心情日记',
            },
            tags: ['输出', '写作', '习惯'],
          },
          {
            id: 'language_habits_polyglot_switch',
            key: 'polyglot_switch',
            name: '多语切换能力',
            milestone: {
              id: 'language_habits_polyglot_switch_ms',
              description: '用两种不同语言分别写一句含义相同的表达',
            },
            tags: ['多语', '切换', '表达'],
          },
          {
            id: 'language_habits_polyglot_tools',
            key: 'language_tools',
            name: '词典与工具使用',
            milestone: {
              id: 'language_habits_polyglot_tools_ms',
              description: '使用 DeepL、词典或 GPT 理解 5 个复杂句子',
            },
            tags: ['工具', '词典', '理解'],
          },
          {
            id: 'language_habits_polyglot_immersion',
            key: 'immersion',
            name: '沉浸式观看',
            milestone: {
              id: 'language_habits_polyglot_immersion_ms',
              description: '不看字幕观看一次不少于 3 分钟的外语视频',
            },
            tags: ['沉浸', '视频', '理解'],
          },
        ],
      },
    ],
  },
  {
    id: 'domain_sports',
    key: 'sports',
    label: '运动',
    order: 7,
    categories: [
      {
        id: 'sports_home_workout',
        key: 'home_workout',
        label: '居家训练',
        order: 1,
        items: [
          {
            id: 'sports_home_workout_bodyweight',
            key: 'bodyweight',
            name: '无器械徒手训练',
            milestone: {
              id: 'sports_home_workout_bodyweight_ms',
              description: '完成一次 20 分钟的徒手训练，例如俯卧撑、深蹲或平板支撑',
            },
            tags: ['徒手', '力量', '基础'],
          },
          {
            id: 'sports_home_workout_hiit',
            key: 'hiit',
            name: 'HIIT 高强度间歇',
            milestone: {
              id: 'sports_home_workout_hiit_ms',
              description: '完成一次不少于 12 分钟的 HIIT 训练，可以是 Tabata 或自创回合',
            },
            tags: ['HIIT', '心肺', '爆发'],
          },
          {
            id: 'sports_home_workout_tabata',
            key: 'tabata',
            name: 'Tabata 训练',
            milestone: {
              id: 'sports_home_workout_tabata_ms',
              description: '完成一次 4 分钟 Tabata（20 秒动作 + 10 秒休息 × 8 轮）',
            },
            tags: ['间歇', '心率', '冲刺'],
          },
          {
            id: 'sports_home_workout_abs',
            key: 'abs_routine',
            name: '居家腹肌训练',
            milestone: {
              id: 'sports_home_workout_abs_ms',
              description: '完成一次 10 分钟核心训练，并保持平板支撑不少于 45 秒',
            },
            tags: ['核心', '腹肌', '耐力'],
          },
          {
            id: 'sports_home_workout_mobility',
            key: 'mobility',
            name: '灵活性与拉伸',
            milestone: {
              id: 'sports_home_workout_mobility_ms',
              description: '完成一次不少于 10 分钟的全身拉伸或瑜伽流动',
            },
            tags: ['拉伸', '柔韧', '恢复'],
          },
        ],
      },
      {
        id: 'sports_gym',
        key: 'gym',
        label: '健身房训练',
        order: 2,
        items: [
          {
            id: 'sports_gym_push',
            key: 'push',
            name: '推举训练',
            milestone: {
              id: 'sports_gym_push_ms',
              description: '完成一次胸部或推举训练，包含不少于 3 个动作',
            },
            tags: ['卧推', '推举', '上肢'],
          },
          {
            id: 'sports_gym_pull',
            key: 'pull',
            name: '拉力训练',
            milestone: {
              id: 'sports_gym_pull_ms',
              description: '完成一次背部训练，并记录一次重量或动作质量的突破',
            },
            tags: ['引体', '背部', '进步'],
          },
          {
            id: 'sports_gym_leg',
            key: 'leg',
            name: '腿部力量',
            milestone: {
              id: 'sports_gym_leg_ms',
              description: '完成一次深蹲、腿举或箭步蹲等腿部组合训练',
            },
            tags: ['腿部', '力量', '下肢'],
          },
          {
            id: 'sports_gym_machine_circuit',
            key: 'machine_circuit',
            name: '器械全身循环',
            milestone: {
              id: 'sports_gym_machine_circuit_ms',
              description: '完成一次包含 4–6 个器械的全身循环训练',
            },
            tags: ['器械', '循环', '全身'],
          },
          {
            id: 'sports_gym_strength_progress',
            key: 'strength_progress',
            name: '力量进阶记录',
            milestone: {
              id: 'sports_gym_strength_progress_ms',
              description: '记录一次重量提升或动作标准化的时刻，例如深蹲更稳',
            },
            tags: ['记录', '进阶', '训练日志'],
          },
        ],
      },
      {
        id: 'sports_ball',
        key: 'ball_sports',
        label: '球类运动',
        order: 3,
        items: [
          {
            id: 'sports_ball_tennis',
            key: 'tennis',
            name: '网球',
            milestone: {
              id: 'sports_ball_tennis_ms',
              description: '完成一次不少于 30 分钟的网球练习，可以是对墙、发球或底线交换',
            },
            tags: ['网球', '练习', '协调'],
          },
          {
            id: 'sports_ball_basketball',
            key: 'basketball',
            name: '篮球训练',
            milestone: {
              id: 'sports_ball_basketball_ms',
              description: '完成一次投篮训练（不少于 50 球）或 30 分钟实战',
            },
            tags: ['篮球', '投篮', '实战'],
          },
          {
            id: 'sports_ball_badminton',
            key: 'badminton',
            name: '羽毛球',
            milestone: {
              id: 'sports_ball_badminton_ms',
              description: '完成一次不少于 30 分钟的单打或对练',
            },
            tags: ['羽毛球', '耐力', '反应'],
          },
          {
            id: 'sports_ball_volleyball',
            key: 'volleyball',
            name: '排球训练',
            milestone: {
              id: 'sports_ball_volleyball_ms',
              description: '完成一次发球与垫球基础训练，时长约 20 分钟',
            },
            tags: ['排球', '基础', '配合'],
          },
          {
            id: 'sports_ball_billiards',
            key: 'billiards',
            name: '台球',
            milestone: {
              id: 'sports_ball_billiards_ms',
              description: '完成一次 30 分钟打点、走位或正式局练习',
            },
            tags: ['台球', '走位', '专注'],
          },
        ],
      },
      {
        id: 'sports_outdoor',
        key: 'outdoor',
        label: '户外运动',
        order: 4,
        items: [
          {
            id: 'sports_outdoor_running',
            key: 'running',
            name: '跑步',
            milestone: {
              id: 'sports_outdoor_running_ms',
              description: '完成一次不少于 2 公里的跑步训练，配速不限',
            },
            tags: ['跑步', '心肺', '耐力'],
          },
          {
            id: 'sports_outdoor_cycling',
            key: 'cycling',
            name: '骑行',
            milestone: {
              id: 'sports_outdoor_cycling_ms',
              description: '进行一次不少于 20 分钟的户外或动感单车骑行',
            },
            tags: ['骑行', '户外', '有氧'],
          },
          {
            id: 'sports_outdoor_hiking',
            key: 'hiking',
            name: '徒步',
            milestone: {
              id: 'sports_outdoor_hiking_ms',
              description: '完成一次不少于 3 公里的轻徒步',
            },
            tags: ['徒步', '自然', '耐力'],
          },
          {
            id: 'sports_outdoor_fast_walk',
            key: 'fast_walk',
            name: '快走 / 有氧步行',
            milestone: {
              id: 'sports_outdoor_fast_walk_ms',
              description: '完成一次不少于 20 分钟的快走训练，速度约 6km/h',
            },
            tags: ['步行', '有氧', '轻负担'],
          },
          {
            id: 'sports_outdoor_jump_rope',
            key: 'jump_rope',
            name: '跳绳',
            milestone: {
              id: 'sports_outdoor_jump_rope_ms',
              description: '完成 500 下以上或 10 分钟左右的跳绳训练',
            },
            tags: ['跳绳', '节奏', '心肺'],
          },
        ],
      },
      {
        id: 'sports_special_training',
        key: 'special_training',
        label: '专项训练',
        order: 5,
        items: [
          {
            id: 'sports_special_training_balance_core',
            key: 'balance_core',
            name: '核心平衡',
            milestone: {
              id: 'sports_special_training_balance_core_ms',
              description: '完成一次平衡训练，例如单脚站立 30 秒或使用稳定球进行核心训练',
            },
            tags: ['平衡', '核心', '控制'],
          },
          {
            id: 'sports_special_training_agility',
            key: 'agility_coordination',
            name: '身体素质',
            milestone: {
              id: 'sports_special_training_agility_ms',
              description: '完成一次灵敏度梯或左右移动练习，不少于 10 分钟',
            },
            tags: ['灵敏', '协调', '速度'],
          },
          {
            id: 'sports_special_training_sprint',
            key: 'sprint',
            name: '短跑爆发',
            milestone: {
              id: 'sports_special_training_sprint_ms',
              description: '完成 5 组 20–60 米的短跑冲刺',
            },
            tags: ['冲刺', '爆发力', '速度'],
          },
          {
            id: 'sports_special_training_bodyweight_skill',
            key: 'bodyweight_skill',
            name: '自重技能',
            milestone: {
              id: 'sports_special_training_bodyweight_skill_ms',
              description: '练习一次俯卧撑进阶、倒立或 L-sit 等技能动作',
            },
            tags: ['技能', '自重', '进阶'],
          },
          {
            id: 'sports_special_training_posture',
            key: 'posture',
            name: '体态矫正',
            milestone: {
              id: 'sports_special_training_posture_ms',
              description: '进行一次针对圆肩、骨盆前倾或久坐恢复的专项训练，不少于 10 分钟',
            },
            tags: ['体态', '纠正', '健康'],
          },
        ],
      },
    ],
  },
  {
    id: 'domain_food',
    key: 'food',
    label: '美食 / 烹饪',
    order: 8,
    categories: [
      {
        id: 'food_home_cooking',
        key: 'home_cooking',
        label: '家庭料理',
        order: 1,
        items: [
          {
            id: 'food_home_cooking_basic',
            key: 'basic_home',
            name: '简单家常菜',
            milestone: {
              id: 'food_home_cooking_basic_ms',
              description: '完成一道 15 分钟以内的家常菜，例如炒蛋、番茄炒蛋或清炒蔬菜',
            },
            tags: ['家常菜', '快速', '基础'],
          },
          {
            id: 'food_home_cooking_one_pot',
            key: 'one_pot',
            name: '一锅端料理',
            milestone: {
              id: 'food_home_cooking_one_pot_ms',
              description: '完成一次一锅料理，例如咖喱、炖菜或煲汤，并简单记录味道',
            },
            tags: ['一锅料理', '炖煮', '省事'],
          },
          {
            id: 'food_home_cooking_breakfast',
            key: 'breakfast',
            name: '早餐制作',
            milestone: {
              id: 'food_home_cooking_breakfast_ms',
              description: '制作一份完整早餐，包含蛋白质、碳水与水果',
            },
            tags: ['早餐', '营养', '开启一天'],
          },
          {
            id: 'food_home_cooking_rice_dish',
            key: 'rice_dish',
            name: '下饭菜',
            milestone: {
              id: 'food_home_cooking_rice_dish_ms',
              description: '完成一道适合配米饭的下饭菜，例如红烧菜或蒜香类',
            },
            tags: ['下饭', '米饭', '家常'],
          },
          {
            id: 'food_home_cooking_light_meal',
            key: 'light_meal',
            name: '健康轻食',
            milestone: {
              id: 'food_home_cooking_light_meal_ms',
              description: '制作一次“低油、低盐、清爽”的轻食晚餐',
            },
            tags: ['轻食', '健康', '清爽'],
          },
        ],
      },
      {
        id: 'food_asian_cuisine',
        key: 'asian_cuisine',
        label: '亚洲料理',
        order: 2,
        items: [
          {
            id: 'food_asian_cuisine_wok',
            key: 'wok_skill',
            name: '中式炒锅技巧',
            milestone: {
              id: 'food_asian_cuisine_wok_ms',
              description: '完成一次成功不糊锅的翻炒料理，并保持一定的锅气',
            },
            tags: ['中餐', '炒锅', '火候'],
          },
          {
            id: 'food_asian_cuisine_japanese',
            key: 'japanese',
            name: '日式料理',
            milestone: {
              id: 'food_asian_cuisine_japanese_ms',
              description: '制作一次日式定食或小菜，例如味噌汤、照烧鸡或玉子烧',
            },
            tags: ['日式', '定食', '家常'],
          },
          {
            id: 'food_asian_cuisine_korean',
            key: 'korean',
            name: '韩式料理',
            milestone: {
              id: 'food_asian_cuisine_korean_ms',
              description: '制作一次韩式料理，例如拌饭、辣炒鸡或泡菜锅',
            },
            tags: ['韩式', '辣味', '拌饭'],
          },
          {
            id: 'food_asian_cuisine_sea',
            key: 'sea_flavor',
            name: '东南亚风味',
            milestone: {
              id: 'food_asian_cuisine_sea_ms',
              description: '完成一次椰奶咖喱或冬阴功风味料理',
            },
            tags: ['东南亚', '咖喱', '香料'],
          },
          {
            id: 'food_asian_cuisine_noodles',
            key: 'noodles',
            name: '面食制作',
            milestone: {
              id: 'food_asian_cuisine_noodles_ms',
              description: '完成一次面料理，例如炒面、汤面或拌面任意一种',
            },
            tags: ['面食', '主食', '家常'],
          },
        ],
      },
      {
        id: 'food_dessert_drinks',
        key: 'dessert_drinks',
        label: '甜点与饮品',
        order: 3,
        items: [
          {
            id: 'food_dessert_drinks_baking_basic',
            key: 'baking_basic',
            name: '烘焙基础',
            milestone: {
              id: 'food_dessert_drinks_baking_basic_ms',
              description: '完成一次烤饼干、松饼或蛋糕的基础烘焙',
            },
            tags: ['烘焙', '甜点', '入门'],
          },
          {
            id: 'food_dessert_drinks_coffee',
            key: 'coffee',
            name: '咖啡制作',
            milestone: {
              id: 'food_dessert_drinks_coffee_ms',
              description: '完成一次手冲或意式咖啡的萃取，并记录风味感受',
            },
            tags: ['咖啡', '风味', '仪式感'],
          },
          {
            id: 'food_dessert_drinks_smoothie',
            key: 'smoothie',
            name: '奶昔与冰沙',
            milestone: {
              id: 'food_dessert_drinks_smoothie_ms',
              description: '制作一次健康饮品，例如水果加酸奶或牛奶的混合饮品',
            },
            tags: ['饮品', '健康', '水果'],
          },
          {
            id: 'food_dessert_drinks_dessert_bowl',
            key: 'dessert_bowl',
            name: '甜点碗',
            milestone: {
              id: 'food_dessert_drinks_dessert_bowl_ms',
              description: '制作一次酸奶碗或水果碗，并记录一下自己的摆盘',
            },
            tags: ['摆盘', '甜点', '记录'],
          },
          {
            id: 'food_dessert_drinks_sugar_free',
            key: 'sugar_free',
            name: '无糖饮品',
            milestone: {
              id: 'food_dessert_drinks_sugar_free_ms',
              description: '调制一杯健康低糖饮品，例如柠檬水、茶或花果茶',
            },
            tags: ['低糖', '饮品', '健康'],
          },
        ],
      },
      {
        id: 'food_ingredient_technique',
        key: 'ingredient_technique',
        label: '食材研究与料理技巧',
        order: 4,
        items: [
          {
            id: 'food_ingredient_technique_knife',
            key: 'knife',
            name: '刀工练习',
            milestone: {
              id: 'food_ingredient_technique_knife_ms',
              description: '进行 10 分钟切菜练习，可以选择洋葱、胡萝卜或土豆等食材',
            },
            tags: ['刀工', '基础', '练习'],
          },
          {
            id: 'food_ingredient_technique_seasoning',
            key: 'seasoning',
            name: '调味基础',
            milestone: {
              id: 'food_ingredient_technique_seasoning_ms',
              description: '完成一次“盐、糖、酸、辛”平衡的料理实验',
            },
            tags: ['调味', '味道', '实验'],
          },
          {
            id: 'food_ingredient_technique_low_fat',
            key: 'low_fat',
            name: '低脂烹饪',
            milestone: {
              id: 'food_ingredient_technique_low_fat_ms',
              description: '无油或低油烹饪一道菜，并记录口味上的差异与感受',
            },
            tags: ['低脂', '烹饪', '健康'],
          },
          {
            id: 'food_ingredient_technique_prep',
            key: 'prep',
            name: '食材处理',
            milestone: {
              id: 'food_ingredient_technique_prep_ms',
              description: '学习并完成一次肉类或蔬菜的正确处理，例如去腥、焯水或腌制',
            },
            tags: ['备菜', '处理', '技巧'],
          },
          {
            id: 'food_ingredient_technique_appliance',
            key: 'appliance',
            name: '电器料理',
            milestone: {
              id: 'food_ingredient_technique_appliance_ms',
              description: '使用空气炸锅或电饭煲完成一道完整料理',
            },
            tags: ['电器', '方便', '尝试'],
          },
        ],
      },
      {
        id: 'food_lifestyle',
        key: 'food_lifestyle',
        label: '美食生活方式',
        order: 5,
        items: [
          {
            id: 'food_lifestyle_log',
            key: 'food_log',
            name: '美食记录',
            milestone: {
              id: 'food_lifestyle_log_ms',
              description: '记录今天吃过的 3 样食物，并写下一点当时的情绪状态',
            },
            tags: ['记录', '饮食', '心情'],
          },
          {
            id: 'food_lifestyle_exploring',
            key: 'food_exploring',
            name: '外出探店',
            milestone: {
              id: 'food_lifestyle_exploring_ms',
              description: '去一家新店试吃，并记录一道最喜欢的菜品',
            },
            tags: ['探店', '尝试', '新鲜'],
          },
          {
            id: 'food_lifestyle_healthy_diet',
            key: 'healthy_diet',
            name: '健康餐管理',
            milestone: {
              id: 'food_lifestyle_healthy_diet_ms',
              description: '连续 2 天控制油盐糖摄入，维持轻负担饮食',
            },
            tags: ['健康', '饮食管理', '连续'],
          },
          {
            id: 'food_lifestyle_home_dinner',
            key: 'home_dinner',
            name: '家庭晚餐',
            milestone: {
              id: 'food_lifestyle_home_dinner_ms',
              description: '为自己准备一顿完整的晚餐仪式，可以包含简单布置或摆盘',
            },
            tags: ['仪式感', '晚餐', '自我照顾'],
          },
          {
            id: 'food_lifestyle_late_night',
            key: 'late_night',
            name: '深夜食堂',
            milestone: {
              id: 'food_lifestyle_late_night_ms',
              description: '制作一次“夜宵但不负担”的小料理，例如蒸蛋、水果或清淡汤品',
            },
            tags: ['夜宵', '轻负担', '安慰'],
          },
        ],
      },
    ],
  },
  {
    id: 'domain_career',
    key: 'career',
    label: '职业发展',
    order: 9,
    categories: [
      {
        id: 'career_job_search',
        key: 'job_search',
        label: '求职核心',
        order: 1,
        items: [
          {
            id: 'career_job_search_resume',
            key: 'resume_polishing',
            name: '简历打磨',
            milestone: {
              id: 'career_job_search_resume_ms',
              description: '完成一次简历修改，为其中一个经历加入可量化成果，例如增长百分比',
            },
            tags: ['简历', '打磨', '成果'],
          },
          {
            id: 'career_job_search_interview',
            key: 'interview_prep',
            name: '面试准备',
            milestone: {
              id: 'career_job_search_interview_ms',
              description: '录制一次不少于 1 分钟的自我介绍，要求清晰、完整且有亮点',
            },
            tags: ['面试', '自我介绍', '表达'],
          },
          {
            id: 'career_job_search_application_strategy',
            key: 'application_strategy',
            name: '行业内投递策略',
            milestone: {
              id: 'career_job_search_application_strategy_ms',
              description: '挑选 3 家目标公司，并完成一次有针对性的定制化投递',
            },
            tags: ['投递', '目标公司', '策略'],
          },
          {
            id: 'career_job_search_star',
            key: 'star_method',
            name: 'STAR 法则练习',
            milestone: {
              id: 'career_job_search_star_ms',
              description: '为自己的经历写出 1 条 STAR 结构的故事',
            },
            tags: ['STAR', '故事', '面试'],
          },
          {
            id: 'career_job_search_project_enhance',
            key: 'project_enhance',
            name: '简历项目补全',
            milestone: {
              id: 'career_job_search_project_enhance_ms',
              description: '为简历中一个项目补充 1 条更具体的职责或成果描述',
            },
            tags: ['项目', '描述', '完善'],
          },
        ],
      },
      {
        id: 'career_professional_communication',
        key: 'professional_communication',
        label: '专业沟通',
        order: 2,
        items: [
          {
            id: 'career_professional_communication_writing',
            key: 'professional_writing',
            name: '专业写作',
            milestone: {
              id: 'career_professional_communication_writing_ms',
              description: '写一段不少于 120 字的专业说明文，要求无废话、结构清晰',
            },
            tags: ['专业写作', '结构', '清晰'],
          },
          {
            id: 'career_professional_communication_email',
            key: 'business_email',
            name: '商务邮件',
            milestone: {
              id: 'career_professional_communication_email_ms',
              description: '完成一次格式专业、目的明确的商务邮件草稿',
            },
            tags: ['邮件', '格式', '沟通'],
          },
          {
            id: 'career_professional_communication_logic',
            key: 'logical_expression',
            name: '逻辑表达',
            milestone: {
              id: 'career_professional_communication_logic_ms',
              description: '使用 Point → Explanation → Example 结构写一段观点',
            },
            tags: ['逻辑', '结构', '表达'],
          },
          {
            id: 'career_professional_communication_meeting',
            key: 'meeting_talk',
            name: '会议表达',
            milestone: {
              id: 'career_professional_communication_meeting_ms',
              description: '模拟一次 30 秒的 Meeting Update，要求简洁、直接、不绕路',
            },
            tags: ['会议', '汇报', '简洁'],
          },
          {
            id: 'career_professional_communication_pyramid',
            key: 'pyramid_logic',
            name: '汇报结构',
            milestone: {
              id: 'career_professional_communication_pyramid_ms',
              description: '完成一次“金字塔结构”的汇报框架，先给结论，再给事实支撑',
            },
            tags: ['结构化', '金字塔', '汇报'],
          },
        ],
      },
      {
        id: 'career_core_skills',
        key: 'core_skills',
        label: '核心技能',
        order: 3,
        items: [
          {
            id: 'career_core_skills_product',
            key: 'product',
            name: '产品能力',
            milestone: {
              id: 'career_core_skills_product_ms',
              description: '为一个 App 写 1 条用户故事（User Story），包含场景、动机与预期结果',
            },
            tags: ['产品', '用户故事', '需求'],
          },
          {
            id: 'career_core_skills_data',
            key: 'data_analysis',
            name: '数据分析',
            milestone: {
              id: 'career_core_skills_data_ms',
              description: '用 Excel 或 Sheets 做一次简单数据分析，例如平均值、排序或条件筛选',
            },
            tags: ['数据', '分析', '表格'],
          },
          {
            id: 'career_core_skills_pm',
            key: 'project_management',
            name: '项目管理',
            milestone: {
              id: 'career_core_skills_pm_ms',
              description: '为一个项目创建小型 WBS，将任务拆解为 3–5 条清晰步骤',
            },
            tags: ['项目管理', '拆解', '规划'],
          },
          {
            id: 'career_core_skills_ai',
            key: 'ai_skill',
            name: 'AI 使用能力',
            milestone: {
              id: 'career_core_skills_ai_ms',
              description: '使用 GPT 或 Claude 完成一次任务自动化，例如总结文稿或生成初稿',
            },
            tags: ['AI', '自动化', '效率'],
          },
          {
            id: 'career_core_skills_tech',
            key: 'tech_literacy',
            name: '技术理解',
            milestone: {
              id: 'career_core_skills_tech_ms',
              description: '阅读一次技术文章，并写出 3 句话的通俗解释，让非程序员也能听懂',
            },
            tags: ['技术', '科普', '解释'],
          },
        ],
      },
      {
        id: 'career_workplace',
        key: 'workplace',
        label: '职场能力',
        order: 4,
        items: [
          {
            id: 'career_workplace_collaboration',
            key: 'collaboration',
            name: '协作沟通',
            milestone: {
              id: 'career_workplace_collaboration_ms',
              description: '完成一次「清晰任务分工 + 截止时间」的沟通练习',
            },
            tags: ['协作', '分工', '清晰'],
          },
          {
            id: 'career_workplace_conflict',
            key: 'conflict_handling',
            name: '冲突处理',
            milestone: {
              id: 'career_workplace_conflict_ms',
              description: '为一个假设冲突写出 2 条冷静、专业、不情绪化的回复示例',
            },
            tags: ['冲突', '情绪管理', '专业'],
          },
          {
            id: 'career_workplace_self_management',
            key: 'self_management',
            name: '自我管理',
            milestone: {
              id: 'career_workplace_self_management_ms',
              description: '记录今天 3 条影响状态的因素，例如能量、专注或压力源',
            },
            tags: ['自我觉察', '能量', '状态'],
          },
          {
            id: 'career_workplace_prioritization',
            key: 'prioritization',
            name: '优先级判断',
            milestone: {
              id: 'career_workplace_prioritization_ms',
              description: '为 5 个任务做一次 Eisenhower 四象限分类',
            },
            tags: ['优先级', '四象限', '决策'],
          },
          {
            id: 'career_workplace_networking',
            key: 'networking',
            name: '商务社交',
            milestone: {
              id: 'career_workplace_networking_ms',
              description: '写一段可以发送给前辈或同事的专业问候（非单纯求职）',
            },
            tags: ['社交', '职场', '关系'],
          },
        ],
      },
      {
        id: 'career_long_term',
        key: 'long_term',
        label: '长期战略',
        order: 5,
        items: [
          {
            id: 'career_long_term_path',
            key: 'career_path',
            name: '职业路径',
            milestone: {
              id: 'career_long_term_path_ms',
              description: '写出未来 2 年的职业方向，并列出想要重点发展的技能清单',
            },
            tags: ['规划', '路径', '目标'],
          },
          {
            id: 'career_long_term_brand',
            key: 'personal_brand',
            name: '个人品牌',
            milestone: {
              id: 'career_long_term_brand_ms',
              description: '完善一个社交媒体页面（如 LinkedIn 或微博）中的职业介绍',
            },
            tags: ['个人品牌', '主页', '展示'],
          },
          {
            id: 'career_long_term_finance',
            key: 'personal_finance',
            name: '财务基础',
            milestone: {
              id: 'career_long_term_finance_ms',
              description: '记录一次收入与支出结构，并找到一个可以优化的地方',
            },
            tags: ['财务', '预算', '优化'],
          },
          {
            id: 'career_long_term_skill_stack',
            key: 'skill_stack',
            name: '能力栈建设',
            milestone: {
              id: 'career_long_term_skill_stack_ms',
              description: '写出 3 条未来最想强化的技能，并简单说明原因',
            },
            tags: ['能力栈', '技能', '长线'],
          },
          {
            id: 'career_long_term_work_life',
            key: 'work_life_loop',
            name: '专注与休息',
            milestone: {
              id: 'career_long_term_work_life_ms',
              description: '完成一次 25–45 分钟的深度工作，加上 5 分钟恢复时间',
            },
            tags: ['深度工作', '休息', '循环'],
          },
        ],
      },
    ],
  },
  {
    id: 'domain_academic',
    key: 'academic',
    label: '学术',
    order: 10,
    categories: [
      {
        id: 'academic_course_survival',
        key: 'course_survival',
        label: '课堂生存',
        order: 1,
        items: [
          {
            id: 'academic_course_survival_notes',
            key: 'lecture_notes',
            name: '课堂笔记',
            milestone: {
              id: 'academic_course_survival_notes_ms',
              description: '完成一次 30 分钟的课堂或视频学习，并整理出 5 条清晰笔记',
            },
            tags: ['笔记', '课堂', '整理'],
          },
          {
            id: 'academic_course_survival_slide_extraction',
            key: 'slide_extraction',
            name: 'PPT 结构提取',
            milestone: {
              id: 'academic_course_survival_slide_extraction_ms',
              description: '从一节课的 PPT 中提炼出 3 个关键词和 1 个重点结论',
            },
            tags: ['PPT', '提炼', '结构'],
          },
          {
            id: 'academic_course_survival_review',
            key: 'module_review',
            name: '课程复盘',
            milestone: {
              id: 'academic_course_survival_review_ms',
              description: '完成一次不少于 15 分钟的小复盘，用一句话总结今天学了什么',
            },
            tags: ['复盘', '总结', '课堂'],
          },
          {
            id: 'academic_course_survival_prereading',
            key: 'pre_reading',
            name: '课堂预习',
            milestone: {
              id: 'academic_course_survival_prereading_ms',
              description: '阅读一小节课本内容，并写出 3 个你认为下一节课可能会被问到的问题',
            },
            tags: ['预习', '问题', '主动'],
          },
          {
            id: 'academic_course_survival_textbook',
            key: 'textbook_reading',
            name: '教材阅读',
            milestone: {
              id: 'academic_course_survival_textbook_ms',
              description: '阅读 5 页教材，并提取一个“老师常考”的重点',
            },
            tags: ['教材', '重点', '理解'],
          },
        ],
      },
      {
        id: 'academic_assignment_survival',
        key: 'assignment_survival',
        label: '赶作业生存',
        order: 2,
        items: [
          {
            id: 'academic_assignment_survival_lab',
            key: 'lab_tutorial',
            name: 'Lab / Tutorial',
            milestone: {
              id: 'academic_assignment_survival_lab_ms',
              description: '完成一次 Lab 任务，并写出一条「踩坑总结」',
            },
            tags: ['实验', '作业', '总结'],
          },
          {
            id: 'academic_assignment_survival_report',
            key: 'academic_report',
            name: 'Report 论文',
            milestone: {
              id: 'academic_assignment_survival_report_ms',
              description: '写出一个不少于 150 字的 report 大纲，包含标题、研究对象与方法',
            },
            tags: ['论文', '大纲', '结构'],
          },
          {
            id: 'academic_assignment_survival_group',
            key: 'group_project',
            name: '小组项目协调',
            milestone: {
              id: 'academic_assignment_survival_group_ms',
              description: '与组员完成一次“任务分工 + 截止时间”的对齐',
            },
            tags: ['小组', '协作', '分工'],
          },
          {
            id: 'academic_assignment_survival_coding',
            key: 'coding_assignment',
            name: '代码作业',
            milestone: {
              id: 'academic_assignment_survival_coding_ms',
              description: '完成一个函数或模块的 Debug，并写下一个关键问题点',
            },
            tags: ['代码', 'Debug', '作业'],
          },
          {
            id: 'academic_assignment_survival_deadline',
            key: 'deadline_control',
            name: '截止日期管理',
            milestone: {
              id: 'academic_assignment_survival_deadline_ms',
              description: '把本周所有 deadline 列入清单，至少包含 3 个任务',
            },
            tags: ['Deadline', '清单', '规划'],
          },
        ],
      },
      {
        id: 'academic_exam',
        key: 'exam',
        label: '考试应对',
        order: 3,
        items: [
          {
            id: 'academic_exam_topics',
            key: 'exam_topics',
            name: '考点总结',
            milestone: {
              id: 'academic_exam_topics_ms',
              description: '将一章内容的考试重点用不超过 80 字总结出来',
            },
            tags: ['考点', '总结', '精简'],
          },
          {
            id: 'academic_exam_practice',
            key: 'practice_bank',
            name: '题库练习',
            milestone: {
              id: 'academic_exam_practice_ms',
              description: '做 10 道题，并标记出一个自己的薄弱点',
            },
            tags: ['题库', '练习', '弱点'],
          },
          {
            id: 'academic_exam_difficult',
            key: 'difficult_problems',
            name: '压轴题冲刺',
            milestone: {
              id: 'academic_exam_difficult_ms',
              description: '解出一道本章最难的题，或借助 AI 解析后重新完整写出解题过程',
            },
            tags: ['难题', '冲刺', '解析'],
          },
          {
            id: 'academic_exam_memory',
            key: 'memory_boosting',
            name: '记忆强化',
            milestone: {
              id: 'academic_exam_memory_ms',
              description: '用 AI 生成 5 个小测题，自测并回答其中 3 题',
            },
            tags: ['记忆', '小测', 'AI'],
          },
          {
            id: 'academic_exam_emergency',
            key: 'emergency_mode',
            name: '临时抱佛脚',
            milestone: {
              id: 'academic_exam_emergency_ms',
              description: '把一节课浓缩成 5 行复习手卡，采用 Cheat Sheet 风格',
            },
            tags: ['突击', '手卡', '整理'],
          },
        ],
      },
      {
        id: 'academic_independent',
        key: 'independent_learning',
        label: '自由自学',
        order: 4,
        items: [
          {
            id: 'academic_independent_youtube',
            key: 'youtube_learning',
            name: 'YouTube 自学',
            milestone: {
              id: 'academic_independent_youtube_ms',
              description: '观看 10 分钟左右的学习视频，并记录 3 秒钟里闪过的灵感或想法',
            },
            tags: ['视频', '自学', '灵感'],
          },
          {
            id: 'academic_independent_paper',
            key: 'paper_reading',
            name: '论文阅读',
            milestone: {
              id: 'academic_independent_paper_ms',
              description: '阅读一篇学术文章的摘要，并写一句主张或结论',
            },
            tags: ['论文', '摘要', '主张'],
          },
          {
            id: 'academic_independent_concept_tree',
            key: 'concept_tree',
            name: '概念树',
            milestone: {
              id: 'academic_independent_concept_tree_ms',
              description: '把一个概念拆成 3 层结构：根（Root）→ 枝（Branch）→ 叶（Leaf）',
            },
            tags: ['概念', '结构化', '拆解'],
          },
          {
            id: 'academic_independent_ai_research',
            key: 'ai_research',
            name: 'AI 查资料',
            milestone: {
              id: 'academic_independent_ai_research_ms',
              description: '向 AI 提一个问题，并总结它给出的一个关键启发',
            },
            tags: ['AI', '检索', '启发'],
          },
          {
            id: 'academic_independent_roadmap',
            key: 'learning_roadmap',
            name: '学习路径规划',
            milestone: {
              id: 'academic_independent_roadmap_ms',
              description: '规划一个 3 步的自学路径：起点 → 方法 → 目标',
            },
            tags: ['路径', '规划', '自学'],
          },
        ],
      },
      {
        id: 'academic_major_direction',
        key: 'major_direction',
        label: '专业方向',
        order: 5,
        items: [
          {
            id: 'academic_major_direction_math',
            key: 'math',
            name: '数学',
            milestone: {
              id: 'academic_major_direction_math_ms',
              description: '独立推导一次课堂上的公式，可以借助 AI 验证过程',
            },
            tags: ['数学', '推导', '公式'],
          },
          {
            id: 'academic_major_direction_cs',
            key: 'computer_science',
            name: '计算机科学',
            milestone: {
              id: 'academic_major_direction_cs_ms',
              description: '手写一段不超过 10 行的小程序或伪代码，完成一个简单功能',
            },
            tags: ['计算机', '代码', '思维'],
          },
          {
            id: 'academic_major_direction_psychology',
            key: 'psychology_major',
            name: '心理学',
            milestone: {
              id: 'academic_major_direction_psychology_ms',
              description: '阅读一个经典实验，并用 3 句话总结其发现',
            },
            tags: ['心理学', '实验', '总结'],
          },
          {
            id: 'academic_major_direction_econ_finance',
            key: 'econ_finance',
            name: '经济与金融',
            milestone: {
              id: 'academic_major_direction_econ_finance_ms',
              description: '用一句话解释一个经济学概念，例如机会成本',
            },
            tags: ['经济', '金融', '概念'],
          },
          {
            id: 'academic_major_direction_engineering',
            key: 'engineering_physics',
            name: '工程与物理',
            milestone: {
              id: 'academic_major_direction_engineering_ms',
              description: '完成一次公式代入的例题，难度不限，重在走完完整步骤',
            },
            tags: ['工程', '物理', '例题'],
          },
        ],
      },
    ],
  },
  {
    id: 'domain_movie',
    key: 'movie',
    label: '观影',
    order: 11,
    categories: [
      {
        id: 'movie_healing',
        key: 'healing',
        label: '疗愈 / 治愈系',
        order: 1,
        items: [
          {
            id: 'movie_healing_feel_good',
            key: 'feel_good_movies',
            name: '轻松治愈电影',
            milestone: {
              id: 'movie_healing_feel_good_ms',
              description: '完整看完一部治愈电影，并记录一句最触动你的台词',
            },
            tags: ['电影', '治愈', '台词'],
          },
          {
            id: 'movie_healing_warm_anime',
            key: 'warm_anime',
            name: '温暖系动漫',
            milestone: {
              id: 'movie_healing_warm_anime_ms',
              description: '看一集治愈番剧，并写下一个让你心软的瞬间',
            },
            tags: ['番剧', '温暖', '瞬间'],
          },
          {
            id: 'movie_healing_slice_of_life',
            key: 'slice_of_life',
            name: '慢节奏日常剧集',
            milestone: {
              id: 'movie_healing_slice_of_life_ms',
              description: '观看 20 分钟，并总结一个让你放松的场景',
            },
            tags: ['日常', '剧集', '放松'],
          },
          {
            id: 'movie_healing_music_film',
            key: 'music_healing_film',
            name: '音乐治愈影片',
            milestone: {
              id: 'movie_healing_music_film_ms',
              description: '从影片里记录一首你最喜欢的背景音乐',
            },
            tags: ['音乐', '氛围', '记忆'],
          },
          {
            id: 'movie_healing_tearjerker',
            key: 'emotional_release',
            name: '催泪系情感电影',
            milestone: {
              id: 'movie_healing_tearjerker_ms',
              description: '看完影片后写一句「为什么它打到了你」',
            },
            tags: ['情感', '哭点', '释放'],
          },
        ],
      },
      {
        id: 'movie_anime_acg',
        key: 'anime_acg',
        label: '动漫 / 二次元',
        order: 2,
        items: [
          {
            id: 'movie_anime_acg_shonen',
            key: 'shonen_anime',
            name: '热血番',
            milestone: {
              id: 'movie_anime_acg_shonen_ms',
              description: '看一集热血番，并写下一条让你热血沸腾的瞬间',
            },
            tags: ['热血', '动漫', '情绪'],
          },
          {
            id: 'movie_anime_acg_romance',
            key: 'romance_anime',
            name: '青春恋爱番',
            milestone: {
              id: 'movie_anime_acg_romance_ms',
              description: '记录一个让你想谈恋爱的桥段',
            },
            tags: ['恋爱', '青春', '桥段'],
          },
          {
            id: 'movie_anime_acg_film',
            key: 'anime_movies',
            name: '日漫电影',
            milestone: {
              id: 'movie_anime_acg_film_ms',
              description: '看完一部长篇动画电影，并写出一句观影感受',
            },
            tags: ['动画电影', '观感', '故事'],
          },
          {
            id: 'movie_anime_acg_scifi',
            key: 'scifi_mecha',
            name: '科幻 / 机甲番',
            milestone: {
              id: 'movie_anime_acg_scifi_ms',
              description: '看一集机甲或科幻番，并总结一个有趣的世界观设定',
            },
            tags: ['科幻', '机甲', '设定'],
          },
          {
            id: 'movie_anime_acg_dark',
            key: 'dark_philosophical',
            name: '黑暗 / 哲学系动漫',
            milestone: {
              id: 'movie_anime_acg_dark_ms',
              description: '用两句话总结本集的哲学问题或核心讨论',
            },
            tags: ['哲学', '深度', '动漫'],
          },
        ],
      },
      {
        id: 'movie_art_indie',
        key: 'art_indie',
        label: '艺术电影 / 法语电影 / 文艺片',
        order: 3,
        items: [
          {
            id: 'movie_art_indie_french',
            key: 'french_art',
            name: '法语艺术电影',
            milestone: {
              id: 'movie_art_indie_french_ms',
              description: '看完约 30 分钟，并写下一句你觉得最有「法式气质」的镜头描述',
            },
            tags: ['法语', '艺术', '镜头'],
          },
          {
            id: 'movie_art_indie_indie',
            key: 'indie_films',
            name: '独立电影',
            milestone: {
              id: 'movie_art_indie_indie_ms',
              description: '观影后记录一个只在非商业片里才会出现的「真实细节」',
            },
            tags: ['独立', '真实', '细节'],
          },
          {
            id: 'movie_art_indie_arthouse',
            key: 'arthouse',
            name: '文艺片',
            milestone: {
              id: 'movie_art_indie_arthouse_ms',
              description: '写出影片中一个让你印象深刻的光影或构图美点',
            },
            tags: ['文艺', '构图', '光影'],
          },
          {
            id: 'movie_art_indie_euro',
            key: 'euro_cinema',
            name: '欧洲电影',
            milestone: {
              id: 'movie_art_indie_euro_ms',
              description: '看约 20 分钟，并写下你从文化差异中感受到的东西',
            },
            tags: ['欧洲', '文化差异', '观感'],
          },
          {
            id: 'movie_art_indie_director',
            key: 'director_study',
            name: '导演风格研究',
            milestone: {
              id: 'movie_art_indie_director_ms',
              description: '记录一位导演的固定套路或独特风格',
            },
            tags: ['导演', '风格', '观察'],
          },
        ],
      },
      {
        id: 'movie_drama_psych',
        key: 'drama_psych',
        label: '剧情 / 心理深度',
        order: 4,
        items: [
          {
            id: 'movie_drama_psych_psychological',
            key: 'psychological_drama',
            name: '心理剧情片',
            milestone: {
              id: 'movie_drama_psych_psychological_ms',
              description: '记录一个角色在剧情中的心理变化',
            },
            tags: ['心理', '角色', '剧情'],
          },
          {
            id: 'movie_drama_psych_crime',
            key: 'crime_mystery',
            name: '犯罪悬疑片',
            milestone: {
              id: 'movie_drama_psych_crime_ms',
              description: '总结一条关键线索或反转点',
            },
            tags: ['悬疑', '反转', '线索'],
          },
          {
            id: 'movie_drama_psych_social',
            key: 'social_issues',
            name: '社会议题电影',
            milestone: {
              id: 'movie_drama_psych_social_ms',
              description: '写一句你认为「影片想告诉我们什么」',
            },
            tags: ['社会议题', '反思', '观点'],
          },
          {
            id: 'movie_drama_psych_biography',
            key: 'biographies',
            name: '人物传记',
            milestone: {
              id: 'movie_drama_psych_biography_ms',
              description: '记录主人公的一个关键人生节点',
            },
            tags: ['传记', '人物', '节点'],
          },
          {
            id: 'movie_drama_psych_classics',
            key: 'drama_classics',
            name: '剧情电影经典',
            milestone: {
              id: 'movie_drama_psych_classics_ms',
              description: '看完一部经典剧情片，并写一条关于时代背景的分析',
            },
            tags: ['经典', '背景', '分析'],
          },
        ],
      },
      {
        id: 'movie_knowledge',
        key: 'knowledge_film',
        label: '知识性观影',
        order: 5,
        items: [
          {
            id: 'movie_knowledge_documentary',
            key: 'documentaries',
            name: '纪录片',
            milestone: {
              id: 'movie_knowledge_documentary_ms',
              description: '写下一个你从纪录片中学到的新事实',
            },
            tags: ['纪录片', '知识', '真实'],
          },
          {
            id: 'movie_knowledge_science',
            key: 'science_films',
            name: '科学类影片',
            milestone: {
              id: 'movie_knowledge_science_ms',
              description: '总结影片中的一个科学概念',
            },
            tags: ['科学', '概念', '解释'],
          },
          {
            id: 'movie_knowledge_history',
            key: 'history_films',
            name: '历史系列',
            milestone: {
              id: 'movie_knowledge_history_ms',
              description: '写出影片描绘的一个历史事件',
            },
            tags: ['历史', '事件', '观看'],
          },
          {
            id: 'movie_knowledge_nature',
            key: 'nature_documentary',
            name: '自然 / 动物纪录片',
            milestone: {
              id: 'movie_knowledge_nature_ms',
              description: '记录一个关于自然的「震撼瞬间」',
            },
            tags: ['自然', '动物', '震撼'],
          },
          {
            id: 'movie_knowledge_cosmos',
            key: 'cosmos_future',
            name: '宇宙与未来',
            milestone: {
              id: 'movie_knowledge_cosmos_ms',
              description: '写下影片提出的一个未来科技或宇宙相关的猜想',
            },
            tags: ['宇宙', '未来', '想象'],
          },
        ],
      },
    ],
  },
  {
    id: 'domain_writing',
    key: 'writing',
    label: '写作',
    order: 12,
    categories: [
      {
        id: 'writing_self_expression',
        key: 'self_expression',
        label: '自我表达',
        order: 1,
        items: [
          {
            id: 'writing_self_expression_daily',
            key: 'daily_journal',
            name: '每日随笔',
            milestone: {
              id: 'writing_self_expression_daily_ms',
              description: '写一段不少于 50 字的心情记录',
            },
            tags: ['日常', '情绪', '记录'],
          },
          {
            id: 'writing_self_expression_themed',
            key: 'themed_journal',
            name: '主题日记',
            milestone: {
              id: 'writing_self_expression_themed_ms',
              description: '围绕「今天的一个瞬间」写 3 句反思',
            },
            tags: ['主题', '反思', '日记'],
          },
          {
            id: 'writing_self_expression_emotion',
            key: 'emotional_writing',
            name: '情绪写作',
            milestone: {
              id: 'writing_self_expression_emotion_ms',
              description: '把一种当下情绪写成一小段文字',
            },
            tags: ['情绪', '表达', '书写'],
          },
          {
            id: 'writing_self_expression_opinion',
            key: 'opinion_writing',
            name: '观点表达',
            milestone: {
              id: 'writing_self_expression_opinion_ms',
              description: '就一个观点写 3 句理由',
            },
            tags: ['观点', '论证', '表达'],
          },
          {
            id: 'writing_self_expression_memory',
            key: 'memory_capture',
            name: '记忆写作',
            milestone: {
              id: 'writing_self_expression_memory_ms',
              description: '记录一个过去的瞬间，字数在 40–80 字之间',
            },
            tags: ['记忆', '故事', '片段'],
          },
        ],
      },
      {
        id: 'writing_techniques',
        key: 'techniques',
        label: '技法练习',
        order: 2,
        items: [
          {
            id: 'writing_techniques_concise',
            key: 'concise_writing',
            name: '语言精简训练',
            milestone: {
              id: 'writing_techniques_concise_ms',
              description: '把一段约 100 字的文字缩写成 50 字，保留核心意思',
            },
            tags: ['精简', '表达', '练习'],
          },
          {
            id: 'writing_techniques_scene',
            key: 'scene_writing',
            name: '场景描写',
            milestone: {
              id: 'writing_techniques_scene_ms',
              description: '用五感中的任意几个写一个约 50 字的场景，例如光、声、味或心境',
            },
            tags: ['场景', '细节', '感官'],
          },
          {
            id: 'writing_techniques_character',
            key: 'character_sketch',
            name: '人物刻画',
            milestone: {
              id: 'writing_techniques_character_ms',
              description: '用 3 句话刻画一个人物形象',
            },
            tags: ['人物', '描写', '刻画'],
          },
          {
            id: 'writing_techniques_metaphor',
            key: 'metaphor',
            name: '比喻 / 象征训练',
            milestone: {
              id: 'writing_techniques_metaphor_ms',
              description: '写出一个尽量不俗套的比喻',
            },
            tags: ['比喻', '象征', '创意'],
          },
          {
            id: 'writing_techniques_dialogue',
            key: 'dialogue',
            name: '对话写作',
            milestone: {
              id: 'writing_techniques_dialogue_ms',
              description: '写 3 行人物对话，要求情绪清楚可感',
            },
            tags: ['对话', '情绪', '节奏'],
          },
        ],
      },
      {
        id: 'writing_forms',
        key: 'forms_genres',
        label: '写作类型',
        order: 3,
        items: [
          {
            id: 'writing_forms_argument',
            key: 'argumentative',
            name: '议论文',
            milestone: {
              id: 'writing_forms_argument_ms',
              description: '写一个 Point → Evidence 结构的小段落',
            },
            tags: ['议论文', '结构', '论证'],
          },
          {
            id: 'writing_forms_academic',
            key: 'academic_writing',
            name: '学术型写作',
            milestone: {
              id: 'writing_forms_academic_ms',
              description: '写出一个清晰的研究问题（Research Question）',
            },
            tags: ['学术', '研究', '问题'],
          },
          {
            id: 'writing_forms_fiction',
            key: 'fiction',
            name: '小说创作',
            milestone: {
              id: 'writing_forms_fiction_ms',
              description: '写一段 20–50 字的小说开头，让读者想继续看下去',
            },
            tags: ['小说', '开头', '吸引力'],
          },
          {
            id: 'writing_forms_screenplay',
            key: 'screenplay',
            name: '剧本片段',
            milestone: {
              id: 'writing_forms_screenplay_ms',
              description: '写 5 行剧本格式的对话',
            },
            tags: ['剧本', '格式', '对话'],
          },
          {
            id: 'writing_forms_poetry',
            key: 'poetry',
            name: '诗歌',
            milestone: {
              id: 'writing_forms_poetry_ms',
              description: '写一段不少于 20 字的自由诗',
            },
            tags: ['诗歌', '意象', '节奏'],
          },
        ],
      },
      {
        id: 'writing_longform',
        key: 'longform',
        label: '深度写作',
        order: 4,
        items: [
          {
            id: 'writing_longform_outline',
            key: 'outline_building',
            name: '文章结构搭建',
            milestone: {
              id: 'writing_longform_outline_ms',
              description: '为一篇文章写一份包含 3 个要点的大纲',
            },
            tags: ['大纲', '结构', '规划'],
          },
          {
            id: 'writing_longform_theme',
            key: 'theme_exploration',
            name: '主题探索',
            milestone: {
              id: 'writing_longform_theme_ms',
              description: '写一句「这篇文章真正想说的是？」并给出自己的答案',
            },
            tags: ['主题', '核心', '提炼'],
          },
          {
            id: 'writing_longform_worldbuilding',
            key: 'worldbuilding',
            name: '世界观构建',
            milestone: {
              id: 'writing_longform_worldbuilding_ms',
              description: '写出 3 条属于同一世界观的规则或设定',
            },
            tags: ['世界观', '设定', '创作'],
          },
          {
            id: 'writing_longform_character_arc',
            key: 'character_arc',
            name: '角色弧线',
            milestone: {
              id: 'writing_longform_character_arc_ms',
              description: '用一句话写出角色的变化，例如「从……到……」',
            },
            tags: ['角色', '成长', '弧线'],
          },
          {
            id: 'writing_longform_pacing',
            key: 'pacing',
            name: '节奏控制',
            milestone: {
              id: 'writing_longform_pacing_ms',
              description: '在一段文字中刻意制造一个停顿、转折或加速点',
            },
            tags: ['节奏', '控制', '细节'],
          },
        ],
      },
      {
        id: 'writing_application',
        key: 'application',
        label: '写作实战',
        order: 5,
        items: [
          {
            id: 'writing_application_ielts',
            key: 'ielts_writing',
            name: '雅思写作',
            milestone: {
              id: 'writing_application_ielts_ms',
              description: '针对一个 IELTS Task 2 题目写出 2 句话的回应',
            },
            tags: ['雅思', '写作', '练习'],
          },
          {
            id: 'writing_application_duolingo',
            key: 'duolingo_writing',
            name: '多邻国写作',
            milestone: {
              id: 'writing_application_duolingo_ms',
              description: '完成一次不超过 50 字的英文快速回应',
            },
            tags: ['多邻国', '短文', '应试'],
          },
          {
            id: 'writing_application_personal_statement',
            key: 'personal_statement',
            name: '个人陈述',
            milestone: {
              id: 'writing_application_personal_statement_ms',
              description: '写一句「我为什么选择这个专业」',
            },
            tags: ['PS', '动机', '申请'],
          },
          {
            id: 'writing_application_copywriting',
            key: 'copywriting',
            name: '文案写作',
            milestone: {
              id: 'writing_application_copywriting_ms',
              description: '用不超过 10 字写一个 slogan',
            },
            tags: ['文案', 'slogan', '创意'],
          },
          {
            id: 'writing_application_email',
            key: 'professional_email',
            name: '工作邮件写作',
            milestone: {
              id: 'writing_application_email_ms',
              description: '写一句专业语气的邮件开头',
            },
            tags: ['邮件', '职场', '开头'],
          },
        ],
      },
    ],
  },
];

// --------------------------------------------------
// 便捷工具函数（可选使用）
// --------------------------------------------------

export function getDomainByKey(config: InterestConfig, key: string): InterestDomain | undefined {
  return config.find((d) => d.key === key);
}

export function getCategoryByKey(domain: InterestDomain, key: string): InterestCategory | undefined {
  return domain.categories.find((c) => c.key === key);
}

export function getItemsByDomainAndCategory(
  config: InterestConfig,
  domainKey: string,
  categoryKey: string,
): InterestItem[] {
  const domain = getDomainByKey(config, domainKey);
  if (!domain) return [];
  const category = getCategoryByKey(domain, categoryKey);
  return category?.items ?? [];
}


