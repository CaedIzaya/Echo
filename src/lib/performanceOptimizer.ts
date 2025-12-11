/**
 * 性能与内存优化工具
 * 用于管理动画、定时器、后台任务等资源
 */

// ==================== 1. 定时器管理器 ====================
class TimerManager {
  private timers: Set<NodeJS.Timeout> = new Set();
  private intervals: Set<NodeJS.Timeout> = new Set();

  setTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    const timer = setTimeout(() => {
      callback();
      this.timers.delete(timer);
    }, delay);
    this.timers.add(timer);
    return timer;
  }

  setInterval(callback: () => void, delay: number): NodeJS.Timeout {
    const interval = setInterval(callback, delay);
    this.intervals.add(interval);
    return interval;
  }

  clearTimeout(timer: NodeJS.Timeout) {
    clearTimeout(timer);
    this.timers.delete(timer);
  }

  clearInterval(interval: NodeJS.Timeout) {
    clearInterval(interval);
    this.intervals.delete(interval);
  }

  clearAll() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.intervals.forEach(interval => clearInterval(interval));
    this.timers.clear();
    this.intervals.clear();
  }

  getActiveCount() {
    return {
      timers: this.timers.size,
      intervals: this.intervals.size,
    };
  }
}

export const globalTimerManager = new TimerManager();

// ==================== 2. 动画节流器 ====================
export class AnimationThrottler {
  private rafId: number | null = null;
  private lastTime = 0;
  private minInterval: number;

  constructor(fps = 30) {
    this.minInterval = 1000 / fps; // 默认限制到30fps
  }

  throttle(callback: () => void) {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }

    this.rafId = requestAnimationFrame((currentTime) => {
      if (currentTime - this.lastTime >= this.minInterval) {
        this.lastTime = currentTime;
        callback();
      }
      this.rafId = null;
    });
  }

  cancel() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

// ==================== 3. 页面可见性检测 ====================
export class VisibilityManager {
  private callbacks: Set<(visible: boolean) => void> = new Set();
  private isVisible = typeof document !== 'undefined' ? !document.hidden : true;

  constructor() {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  private handleVisibilityChange = () => {
    this.isVisible = !document.hidden;
    this.callbacks.forEach(cb => cb(this.isVisible));
  };

  onVisibilityChange(callback: (visible: boolean) => void) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  isPageVisible() {
    return this.isVisible;
  }

  destroy() {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    this.callbacks.clear();
  }
}

// 延迟初始化，避免 SSR 时访问 document
let _globalVisibilityManager: VisibilityManager | null = null;
export const globalVisibilityManager = (() => {
  if (typeof window === 'undefined') {
    // 服务端渲染时返回一个安全的 mock 对象
    return {
      onVisibilityChange: () => () => {},
      isPageVisible: () => true,
      destroy: () => {},
    } as VisibilityManager;
  }
  if (!_globalVisibilityManager) {
    _globalVisibilityManager = new VisibilityManager();
  }
  return _globalVisibilityManager;
})();

// ==================== 4. 内存监控 ====================
export function getMemoryUsage() {
  if (typeof window === 'undefined' || !(performance as any).memory) {
    return null;
  }

  const memory = (performance as any).memory;
  return {
    usedJSHeapSize: (memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
    totalJSHeapSize: (memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
    jsHeapSizeLimit: (memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB',
    usage: ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(2) + '%',
  };
}

// ==================== 5. 资源清理工具 ====================
export class ResourceCleaner {
  private resources: Array<() => void> = [];

  register(cleanup: () => void) {
    this.resources.push(cleanup);
  }

  cleanup() {
    this.resources.forEach(fn => {
      try {
        fn();
      } catch (e) {
        console.error('清理资源时出错:', e);
      }
    });
    this.resources = [];
  }
}

// ==================== 6. LocalStorage 批量操作优化 ====================
export class OptimizedStorage {
  private batchQueue: Map<string, any> = new Map();
  private flushTimer: NodeJS.Timeout | null = null;

  // 批量写入，减少 localStorage 操作次数
  setItem(key: string, value: any, immediate = false) {
    this.batchQueue.set(key, value);

    if (immediate) {
      this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  private scheduleFlush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    this.flushTimer = globalTimerManager.setTimeout(() => {
      this.flush();
    }, 100); // 100ms 后批量写入
  }

  private flush() {
    if (this.batchQueue.size === 0) return;

    this.batchQueue.forEach((value, key) => {
      try {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, serialized);
      } catch (e) {
        console.error(`Failed to save ${key} to localStorage:`, e);
      }
    });

    this.batchQueue.clear();
    if (this.flushTimer) {
      globalTimerManager.clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  getItem<T = any>(key: string, defaultValue?: T): T | null {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue ?? null;
      try {
        return JSON.parse(item);
      } catch {
        return item as T;
      }
    } catch (e) {
      console.error(`Failed to read ${key} from localStorage:`, e);
      return defaultValue ?? null;
    }
  }
}

export const optimizedStorage = new OptimizedStorage();

// ==================== 7. 懒加载图片/组件 ====================
export function lazyLoadImage(src: string, placeholder?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = reject;
    img.src = src;
  });
}

// ==================== 8. 防抖与节流 ====================
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      if (timeout) globalTimerManager.clearTimeout(timeout);
      timeout = null;
      func(...args);
    };

    if (timeout) globalTimerManager.clearTimeout(timeout);
    timeout = globalTimerManager.setTimeout(later, wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      globalTimerManager.setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// ==================== 9. 智能轮询（页面不可见时停止） ====================
export class SmartPoller {
  private callback: () => void;
  private interval: number;
  private timerId: NodeJS.Timeout | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(callback: () => void, interval: number) {
    this.callback = callback;
    this.interval = interval;
  }

  start() {
    if (this.timerId) return;

    // 立即执行一次
    this.callback();

    // 设置定时器
    const poll = () => {
      if (globalVisibilityManager.isPageVisible()) {
        this.callback();
      }
      this.timerId = globalTimerManager.setTimeout(poll, this.interval);
    };

    this.timerId = globalTimerManager.setTimeout(poll, this.interval);

    // 监听页面可见性，不可见时停止，可见时恢复
    this.unsubscribe = globalVisibilityManager.onVisibilityChange((visible) => {
      if (visible && !this.timerId) {
        this.start();
      }
    });
  }

  stop() {
    if (this.timerId) {
      globalTimerManager.clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

// ==================== 10. 动画池管理（限制同时运行的动画数量） ====================
export class AnimationPool {
  private maxConcurrent: number;
  private running = 0;
  private queue: Array<() => Promise<void>> = [];

  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
  }

  async run(animationFn: () => Promise<void>) {
    if (this.running >= this.maxConcurrent) {
      // 等待队列
      await new Promise<void>((resolve) => {
        this.queue.push(async () => {
          await animationFn();
          resolve();
        });
      });
    } else {
      this.running++;
      try {
        await animationFn();
      } finally {
        this.running--;
        this.processQueue();
      }
    }
  }

  private processQueue() {
    if (this.queue.length > 0 && this.running < this.maxConcurrent) {
      const next = this.queue.shift();
      if (next) {
        this.running++;
        next().finally(() => {
          this.running--;
          this.processQueue();
        });
      }
    }
  }

  clear() {
    this.queue = [];
  }
}

export const globalAnimationPool = new AnimationPool(3);

// ==================== 使用示例 ====================
/*
// 1. 使用统一的定时器管理
const timer = globalTimerManager.setTimeout(() => {
  console.log('延迟执行');
}, 1000);

// 2. 使用智能轮询（页面不可见时自动停止）
const poller = new SmartPoller(() => {
  console.log('每5秒执行一次，但页面不可见时会暂停');
}, 5000);
poller.start();

// 在组件卸载时停止
useEffect(() => {
  return () => poller.stop();
}, []);

// 3. 使用动画节流器
const throttler = new AnimationThrottler(30); // 限制30fps
function handleScroll() {
  throttler.throttle(() => {
    // 执行滚动动画逻辑
  });
}

// 4. 使用优化的 localStorage
optimizedStorage.setItem('userExp', 100);
optimizedStorage.setItem('level', 5);
// 100ms 后会批量写入，减少 I/O

// 5. 在 React 中使用资源清理
const cleaner = new ResourceCleaner();
useEffect(() => {
  const interval = setInterval(() => {}, 1000);
  cleaner.register(() => clearInterval(interval));
  
  return () => cleaner.cleanup();
}, []);
*/

