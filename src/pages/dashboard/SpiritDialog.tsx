'use client';

import { useEffect, useState, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';

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
  ],
};

interface SpiritDialogProps {
  spiritState: 'idle' | 'excited' | 'focus' | 'happy';
  onStateChange?: (state: 'idle' | 'excited' | 'focus' | 'happy') => void;
}

export interface SpiritDialogRef {
  showMessage: () => void;
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
  ({ spiritState, onStateChange }, ref) => {
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);
  const [messageType, setMessageType] = useState<'cute' | 'chuunibyou' | 'philosophical'>('cute');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const messageStartTimeRef = useRef<number>(0); // 记录文案开始显示的时间

  // 显示文案的函数
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

    // 5秒后自动隐藏文案
    timerRef.current = setTimeout(() => {
      setIsVisible(false);
      timerRef.current = null;
    }, 5000);
  }, [onStateChange, spiritState]);

  // 通过ref暴露showMessage方法
  useImperativeHandle(ref, () => ({
    showMessage,
  }), [showMessage]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
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
    <div className="fixed top-44 left-52 sm:left-56 md:left-60 lg:left-64 xl:left-72 z-50 pointer-events-none max-w-xs sm:max-w-sm md:max-w-md">
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
        {/* 对话框小箭头 - 指向小精灵（左上角） */}
        <div className="absolute -left-3 top-2 w-0 h-0">
          <div
            className={`w-6 h-6 bg-gradient-to-br ${dialogStyle.arrowBg} border-l-2 border-t-2 ${dialogStyle.border} rotate-45`}
          />
        </div>

        {/* 文案内容 */}
        <p className="text-sm md:text-base text-gray-800 font-medium leading-relaxed relative z-10">
          {currentMessage}
        </p>

        {/* 装饰性光点 */}
        <div className="absolute top-2 right-2 w-2 h-2 bg-white/60 rounded-full animate-pulse" />
        <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
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
    </div>
  );
});

SpiritDialog.displayName = 'SpiritDialog';

export default SpiritDialog;

