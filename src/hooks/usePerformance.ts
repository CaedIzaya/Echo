/**
 * 性能优化相关 React Hooks
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  globalTimerManager,
  AnimationThrottler,
  SmartPoller,
  ResourceCleaner,
  globalVisibilityManager,
  optimizedStorage,
  debounce,
  throttle,
} from '~/lib/performanceOptimizer';

// ==================== 1. 安全的定时器 Hook ====================
export function useSafeTimeout() {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const setSafeTimeout = useCallback((callback: () => void, delay: number) => {
    if (timerRef.current) {
      globalTimerManager.clearTimeout(timerRef.current);
    }
    timerRef.current = globalTimerManager.setTimeout(callback, delay);
    return timerRef.current;
  }, []);

  const clearSafeTimeout = useCallback(() => {
    if (timerRef.current) {
      globalTimerManager.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        globalTimerManager.clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { setSafeTimeout, clearSafeTimeout };
}

// ==================== 2. 智能轮询 Hook ====================
export function useSmartPoller(
  callback: () => void,
  interval: number,
  enabled = true
) {
  const pollerRef = useRef<SmartPoller | null>(null);
  const callbackRef = useRef(callback);

  // 保持 callback 引用最新
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) {
      pollerRef.current?.stop();
      return;
    }

    pollerRef.current = new SmartPoller(() => callbackRef.current(), interval);
    pollerRef.current.start();

    return () => {
      pollerRef.current?.stop();
    };
  }, [interval, enabled]);
}

// ==================== 3. 节流动画 Hook ====================
export function useThrottledAnimation(fps = 30) {
  const throttlerRef = useRef<AnimationThrottler | null>(null);

  if (!throttlerRef.current) {
    throttlerRef.current = new AnimationThrottler(fps);
  }

  const animate = useCallback((callback: () => void) => {
    throttlerRef.current?.throttle(callback);
  }, []);

  useEffect(() => {
    return () => {
      throttlerRef.current?.cancel();
    };
  }, []);

  return animate;
}

// ==================== 4. 页面可见性 Hook ====================
export function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(
    () => globalVisibilityManager.isPageVisible()
  );

  useEffect(() => {
    return globalVisibilityManager.onVisibilityChange(setIsVisible);
  }, []);

  return isVisible;
}

// ==================== 5. 优化的 LocalStorage Hook ====================
export function useOptimizedStorage<T = any>(
  key: string,
  defaultValue: T
): [T, (value: T, immediate?: boolean) => void] {
  const [value, setValue] = useState<T>(() => {
    return optimizedStorage.getItem<T>(key, defaultValue) ?? defaultValue;
  });

  const setOptimizedValue = useCallback(
    (newValue: T, immediate = false) => {
      setValue(newValue);
      optimizedStorage.setItem(key, newValue, immediate);
    },
    [key]
  );

  return [value, setOptimizedValue];
}

// ==================== 6. 防抖 Hook ====================
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
) {
  const debouncedFn = useRef(debounce(callback, delay));

  useEffect(() => {
    debouncedFn.current = debounce(callback, delay);
  }, [callback, delay]);

  return debouncedFn.current;
}

// ==================== 7. 节流 Hook ====================
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  limit: number
) {
  const throttledFn = useRef(throttle(callback, limit));

  useEffect(() => {
    throttledFn.current = throttle(callback, limit);
  }, [callback, limit]);

  return throttledFn.current;
}

// ==================== 8. 资源自动清理 Hook ====================
export function useResourceCleaner() {
  const cleanerRef = useRef(new ResourceCleaner());

  useEffect(() => {
    return () => {
      cleanerRef.current.cleanup();
    };
  }, []);

  return cleanerRef.current;
}

// ==================== 9. 懒加载组件 Hook ====================
export function useLazyLoad(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

// ==================== 10. 动画状态管理（避免过多同时动画） ====================
export function useAnimationQueue(maxConcurrent = 3) {
  const [queue, setQueue] = useState<Array<() => Promise<void>>>([]);
  const [running, setRunning] = useState(0);

  const addAnimation = useCallback(
    async (animationFn: () => Promise<void>) => {
      if (running >= maxConcurrent) {
        setQueue((prev) => [...prev, animationFn]);
      } else {
        setRunning((prev) => prev + 1);
        try {
          await animationFn();
        } finally {
          setRunning((prev) => prev - 1);
        }
      }
    },
    [running, maxConcurrent]
  );

  // 处理队列
  useEffect(() => {
    if (queue.length > 0 && running < maxConcurrent) {
      const next = queue[0];
      setQueue((prev) => prev.slice(1));
      setRunning((prev) => prev + 1);
      next().finally(() => {
        setRunning((prev) => prev - 1);
      });
    }
  }, [queue, running, maxConcurrent]);

  return addAnimation;
}

// ==================== 使用示例 ====================
/*
// 1. 使用安全的定时器（组件卸载时自动清理）
function MyComponent() {
  const { setSafeTimeout, clearSafeTimeout } = useSafeTimeout();
  
  const handleClick = () => {
    setSafeTimeout(() => {
      console.log('3秒后执行');
    }, 3000);
  };
  
  return <button onClick={handleClick}>点击</button>;
}

// 2. 使用智能轮询（页面不可见时自动暂停）
function PollingComponent() {
  useSmartPoller(() => {
    console.log('每5秒执行，但页面切到后台时会暂停');
  }, 5000);
  
  return <div>轮询中...</div>;
}

// 3. 使用节流动画
function AnimatedComponent() {
  const animate = useThrottledAnimation(30); // 限制30fps
  
  const handleScroll = () => {
    animate(() => {
      // 执行动画逻辑
    });
  };
  
  return <div onScroll={handleScroll}>滚动我</div>;
}

// 4. 使用页面可见性
function VisibilityAwareComponent() {
  const isVisible = usePageVisibility();
  
  useEffect(() => {
    if (isVisible) {
      console.log('页面可见，恢复操作');
    } else {
      console.log('页面隐藏，暂停操作');
    }
  }, [isVisible]);
  
  return <div>{isVisible ? '页面可见' : '页面隐藏'}</div>;
}

// 5. 使用优化的 LocalStorage
function StorageComponent() {
  const [userExp, setUserExp] = useOptimizedStorage('userExp', 0);
  
  return (
    <button onClick={() => setUserExp(userExp + 10)}>
      经验值: {userExp}
    </button>
  );
}

// 6. 使用防抖
function SearchComponent() {
  const debouncedSearch = useDebounce((query: string) => {
    console.log('搜索:', query);
  }, 500);
  
  return (
    <input
      type="text"
      onChange={(e) => debouncedSearch(e.target.value)}
      placeholder="输入搜索..."
    />
  );
}

// 7. 使用懒加载
function LazyComponent() {
  const { ref, isVisible } = useLazyLoad();
  
  return (
    <div ref={ref}>
      {isVisible ? <ExpensiveComponent /> : <div>加载中...</div>}
    </div>
  );
}
*/

