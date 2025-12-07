'use client';

import { useEffect, useState, useRef, useImperativeHandle, forwardRef, useCallback, CSSProperties } from 'react';

// 文案数据
const spiritMessages = {
  // ① 可爱轻松款
  cute: [
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
  ],
  // ② 无厘头搞怪款
  chuunibyou: [
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
    // 🌟 光精灵自己的可爱日常（无厘头＋反差萌）
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
  ],
  // ③ 轻哲学暖心款
  philosophical: [
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
    // 🌑 来自黑暗森林时代的回忆（轻哲学＋幽默）
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
    // 🌱 关于你（树苗）的小小洞察（治愈＋轻哲学）
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
    // 🆕 新增对话（轻哲学＋暖心）
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
};

// 欢迎文案（登录跳转后显示）
const welcomeMessages = [
  '噢，你来了。\n我刚刚还在想今天会不会见不到你。',
  '早呀。你的气场……今天看起来不错。',
  '嘿，我今天比昨天亮了一点点。\n你呢？',
  '哇，你回来了。\n我已经把一句好话憋在心里很久了。',
  '别紧张，我今天也没什么大计划。\n就……陪着你。',
  '我刚刚在思考宇宙，结果你进来了。\n嗯……宇宙可以先等等。',
  '你好哇。我今天决定不卷、不催、不吵，只发光。',
  '你一来，我就亮起来了。\n不过别误会，这不是情绪，是设定。',
  '今天想做点什么？\n不想做也没关系，我可以先发呆。',
  '欢迎回来。\n我今天会尽量表现得……比昨天更可爱一点。',
];

// 专注完成后的祝贺文案
const completionMessages = [
  '刚刚那段时间……\n你比你想象得还安静、还厉害。',
  '嗯，我看到了。\n你努力的时候也会发光。',
  '这次很好，下次也不用更好。\n能回到你自己，就足够了。',
  '我喜欢你刚才的那种气场。\n像是一束稳稳的光。',
  '别看我，我只是有点骄傲。',
  '嘿——你做到了。\n虽然你可能没感觉，但你的心树有感觉。',
  '我猜你大概不需要我夸奖，\n但我还是想说一句：你挺强的。',
  '专注这件事啊，不需要全世界知道。\n你知道就够了。',
  '你刚刚那段沉默，比大多数人的吵闹都要厉害。',
  '要不要去看看心树？\n我觉得……它好像变得更茂了一点。',
  // ✨ Bonus：适合用在"专注完成"后的庆祝台词（高能＋暖）
  '哇！我亮得都要被自己闪到啦！',
  '树在笑，我也在笑，连空气都在笑！',
  '你刚才那一下，可比黑暗森林里的大爆炸还厉害！',
  '请收下我为你准备的小小欢呼——噗哧！',
  '我看到你的努力啦，它在你身上亮得很明显。',
];

// 定时触发的陪伴文案（每20分钟）
const periodicMessages = [
  '我刚刚在发呆。\n结果发现……发呆比我想象的更难。',
  '你有没有觉得空气里有点……安静过头？\n我喜欢。',
  '我在想一个问题：\n光到底算不算心情的一部分？',
  '如果你现在感觉有点乱……\n那很正常。人类的大脑本来就很忙。',
  '刚刚有一秒，我差点睡着了。\n你也是吗？',
  '你知道吗？保持沉默其实需要勇气的。',
  '我盯着你发光，你盯着屏幕发光。\n我们都挺奇怪的。',
  '说实话……\n你坐着的样子，看起来挺像个有故事的人。',
  '我突然想到一句话：\n"你已经够好了，但你还会更好。"',
  '如果你不知道要做什么，\n那就先深呼吸吧。世界不会跑。',
  '噢！\n我以为你离开了……\n差点灭掉。',
  '我有一点小小的期待……\n但我不会说是什么。嘿嘿。',
  '今天这个世界太吵了。\n在这里待一会儿也不错。',
  '你有没有觉得，有些决定只有在安静时才会出现？',
  '我刚刚帮你赶跑了一只想偷你注意力的坏念头。\n没事，它不敢回来。',
  '一整天里，这一分钟是属于你的。\n你想怎么用都可以。',
  '我猜你现在脑袋里有很多事情。\n我就在旁边亮着，不吵你。',
  '我也是第一次当光精灵。\n如果我表现得不错……记得夸我。',
  '你知道吗？\n安静也是一种很响亮的表达。',
  '嘿，小声告诉你：\n你的心树……好像又长高了一点。',
];

interface SpiritDialogProps {
  spiritState: 'idle' | 'excited' | 'focus' | 'happy';
  onStateChange?: (state: 'idle' | 'excited' | 'focus' | 'happy') => void;
  mobileContainerClassName?: string;
  mobileContainerStyle?: CSSProperties;
}

export interface SpiritDialogRef {
  showMessage: () => void;
  showWelcomeMessage: () => void; // 显示欢迎文案
  showCompletionMessage: () => void; // 显示专注完成祝贺文案
}

// 随机选择一条文案（移到组件外部，避免依赖问题）
const getRandomMessage = (type?: 'cute' | 'chuunibyou' | 'philosophical') => {
  const selectedType = type || (['cute', 'chuunibyou', 'philosophical'] as const)[
    Math.floor(Math.random() * 3)
  ];
  const messages = spiritMessages[selectedType];
  return {
    message: messages[Math.floor(Math.random() * messages.length)],
    type: selectedType,
  };
};

const SpiritDialog = forwardRef<SpiritDialogRef, SpiritDialogProps>(
  ({ spiritState, onStateChange, mobileContainerClassName, mobileContainerStyle }, ref) => {
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);
  const [messageType, setMessageType] = useState<'cute' | 'chuunibyou' | 'philosophical'>('cute');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const messageStartTimeRef = useRef<number>(0); // 记录文案开始显示的时间
  const periodicTimerRef = useRef<NodeJS.Timeout | null>(null); // 定时触发文案的定时器
  const lastPeriodicTimeRef = useRef<number>(0); // 记录上次定时触发的时间

  // 显示文案的函数（用户交互触发，5秒后自动隐藏）
  // 注意：这是用户点击小精灵后触发的对话框，保持5秒持续时间
  const showMessage = useCallback(() => {
    // 清除之前的定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // 每次调用都刷新文案（无论是首次显示还是2s后的刷新）
    const { message, type } = getRandomMessage();
    setCurrentMessage(message);
    setMessageType(type);
    setIsVisible(true);
    
    // 记录文案开始显示的时间
    messageStartTimeRef.current = Date.now();
    
    // 通知父组件状态变化
    if (onStateChange) {
      onStateChange(spiritState);
    }

    // 5秒后自动隐藏文案（交互后的对话框，保持5秒）
    timerRef.current = setTimeout(() => {
      setIsVisible(false);
      setCurrentMessage(''); // 清空消息，确保组件完全隐藏
      timerRef.current = null;
    }, 5000);
  }, [onStateChange, spiritState]);

  // 显示欢迎文案的函数（非交互触发，8秒后自动隐藏）
  const showWelcomeMessage = useCallback(() => {
    // 清除之前的定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // 随机选择一条欢迎文案
    const welcomeMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    setCurrentMessage(welcomeMessage);
    setMessageType('cute'); // 欢迎文案使用cute样式
    setIsVisible(true);
    
    // 记录文案开始显示的时间
    messageStartTimeRef.current = Date.now();
    
    // 通知父组件状态变化
    if (onStateChange) {
      onStateChange(spiritState);
    }

    // 8秒后自动隐藏文案（非交互对话框，持续时间更长）
    timerRef.current = setTimeout(() => {
      console.log('⏰ 欢迎文案8秒定时器触发，隐藏对话框');
      setIsVisible(false);
      setCurrentMessage(''); // 清空消息，确保组件完全隐藏
      timerRef.current = null;
    }, 8000);
  }, [onStateChange, spiritState]);

  // 显示专注完成祝贺文案的函数（非交互触发，8秒后自动隐藏）
  const showCompletionMessage = useCallback(() => {
    // 清除之前的定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // 随机选择一条祝贺文案
    const completionMessage = completionMessages[Math.floor(Math.random() * completionMessages.length)];
    setCurrentMessage(completionMessage);
    setMessageType('philosophical'); // 祝贺文案使用philosophical样式
    setIsVisible(true);
    
    // 记录文案开始显示的时间
    messageStartTimeRef.current = Date.now();
    
    // 通知父组件状态变化
    if (onStateChange) {
      onStateChange(spiritState);
    }

    // 8秒后自动隐藏文案（非交互对话框，持续时间更长）
    timerRef.current = setTimeout(() => {
      console.log('⏰ 完成祝贺文案8秒定时器触发，隐藏对话框');
      setIsVisible(false);
      setCurrentMessage(''); // 清空消息，确保组件完全隐藏
      timerRef.current = null;
    }, 8000);
  }, [onStateChange, spiritState]);

  // 显示定时触发的陪伴文案（非交互触发，8秒后自动隐藏）
  const showPeriodicMessage = useCallback(() => {
    // 清除之前的定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // 随机选择一条定时文案
    const periodicMessage = periodicMessages[Math.floor(Math.random() * periodicMessages.length)];
    setCurrentMessage(periodicMessage);
    setMessageType('philosophical'); // 定时文案使用philosophical样式
    setIsVisible(true);
    
    // 记录文案开始显示的时间
    messageStartTimeRef.current = Date.now();
    
    // 记录本次定时触发的时间
    lastPeriodicTimeRef.current = Date.now();
    
    // 通知父组件状态变化
    if (onStateChange) {
      onStateChange(spiritState);
    }

    // 8秒后自动隐藏文案（非交互对话框，持续时间更长）
    timerRef.current = setTimeout(() => {
      console.log('⏰ 定时陪伴文案8秒定时器触发，隐藏对话框');
      setIsVisible(false);
      setCurrentMessage(''); // 清空消息，确保组件完全隐藏
      timerRef.current = null;
    }, 8000);
  }, [onStateChange, spiritState]);

  // 通过ref暴露方法
  useImperativeHandle(ref, () => ({
    showMessage,
    showWelcomeMessage,
    showCompletionMessage,
  }), [showMessage, showWelcomeMessage, showCompletionMessage]);

  // 定时触发文案（每20分钟）
  useEffect(() => {
    // 检查页面是否可见
    const checkAndShowPeriodicMessage = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        const timeSinceLastPeriodic = now - lastPeriodicTimeRef.current;
        const twentyMinutes = 20 * 60 * 1000; // 20分钟（毫秒）

        // 如果距离上次定时触发已经超过20分钟，或者还没有触发过
        if (lastPeriodicTimeRef.current === 0 || timeSinceLastPeriodic >= twentyMinutes) {
          showPeriodicMessage();
        }
      }
    };

    // 初始检查
    checkAndShowPeriodicMessage();

    // 设置定时器，每20分钟检查一次
    periodicTimerRef.current = setInterval(() => {
      checkAndShowPeriodicMessage();
    }, 20 * 60 * 1000); // 20分钟

    // 监听页面可见性变化，当页面变为可见时检查是否需要显示
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndShowPeriodicMessage();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (periodicTimerRef.current) {
        clearInterval(periodicTimerRef.current);
        periodicTimerRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [showPeriodicMessage]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (periodicTimerRef.current) {
        clearInterval(periodicTimerRef.current);
        periodicTimerRef.current = null;
      }
      // 组件卸载时也清空消息和隐藏状态
      setIsVisible(false);
      setCurrentMessage('');
    };
  }, []);

  // 根据文案类型获取样式
  const getDialogStyle = () => {
    switch (messageType) {
      case 'cute':
        return {
          bg: 'bg-gradient-to-br from-pink-100 to-orange-100',
          border: 'border-pink-300',
          arrowBg: 'from-pink-100 to-orange-100',
        };
      case 'chuunibyou':
        return {
          bg: 'bg-gradient-to-br from-purple-100 to-indigo-100',
          border: 'border-purple-300',
          arrowBg: 'from-purple-100 to-indigo-100',
        };
      case 'philosophical':
        return {
          bg: 'bg-gradient-to-br from-teal-100 to-cyan-100',
          border: 'border-teal-300',
          arrowBg: 'from-teal-100 to-cyan-100',
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-gray-100 to-gray-200',
          border: 'border-gray-300',
          arrowBg: 'from-gray-100 to-gray-200',
        };
    }
  };

  if (!isVisible || !currentMessage) return null;

  const dialogStyle = getDialogStyle();

  return (
    <>
      {/* PC端对话框 - 位于今日节奏卡片底部下方，确保文本框顶部低于小精灵底部 */}
      <div className="hidden sm:block fixed top-[500px] left-12 md:left-16 lg:left-20 xl:left-12 z-50 pointer-events-none max-w-xs sm:max-w-sm md:max-w-md">
        <div
          className={`
            ${dialogStyle.bg}
            ${dialogStyle.border}
            rounded-2xl px-5 py-3.5 shadow-2xl border-2
            backdrop-blur-sm
            w-full
            animate-fade-in-up
            transition-all duration-300
            relative
          `}
        >
          {/* 对话框小箭头 - 指向小精灵（上方，右侧） */}
          <div className="absolute right-12 -top-3 w-0 h-0">
            <div
              className={`w-6 h-6 bg-gradient-to-br ${dialogStyle.arrowBg} border-r-2 border-t-2 ${dialogStyle.border} rotate-45`}
            />
          </div>

          {/* 文案内容 - 支持换行 */}
          <p className="text-sm md:text-base text-gray-800 font-medium leading-relaxed relative z-10 whitespace-pre-line">
            {currentMessage}
          </p>

          {/* 装饰性光点 */}
          <div className="absolute top-2 right-2 w-2 h-2 bg-white/60 rounded-full animate-pulse" />
          <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>
      </div>

      {/* 手机端对话框 - 可自定义锚点 */}
      <div
        className={mobileContainerClassName ?? 'sm:hidden fixed bottom-44 right-6 z-50 pointer-events-none max-w-[280px]'}
        style={mobileContainerStyle}
      >
        <div
          className={`
            ${dialogStyle.bg}
            ${dialogStyle.border}
            rounded-2xl px-4 py-3 shadow-2xl border-2
            backdrop-blur-sm
            w-full
            animate-fade-in-up
            transition-all duration-300
            relative
          `}
        >
          {/* 对话框小箭头 - 指向小精灵（底部中心） */}
          <div className="absolute bottom-[-12px] left-1/2 transform -translate-x-1/2 w-0 h-0">
            <div
              className={`w-6 h-6 bg-gradient-to-br ${dialogStyle.arrowBg} border-r-2 border-b-2 ${dialogStyle.border} rotate-45`}
            />
          </div>

          {/* 文案内容 - 支持换行 */}
          <p className="text-sm text-gray-800 font-medium leading-relaxed relative z-10 whitespace-pre-line">
            {currentMessage}
          </p>

          {/* 装饰性光点 */}
          <div className="absolute top-2 right-2 w-2 h-2 bg-white/60 rounded-full animate-pulse" />
          <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.4s ease-out;
        }
      `}</style>
    </>
  );
});

SpiritDialog.displayName = 'SpiritDialog';

export default SpiritDialog;

