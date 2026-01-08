/**
 * 主题系统
 * 管理用户的主题偏好设置
 */

export type ThemeType = 'default' | 'echo' | 'salt_blue' | 'fresh_green';

export interface ThemeConfig {
  id: ThemeType;
  name: string;
  bgColor: string; // 背景色
  bgStyle?: React.CSSProperties; // 自定义样式（用于渐变）
}

export const THEMES: Record<ThemeType, ThemeConfig> = {
  default: {
    id: 'default',
    name: '默认主题',
    bgColor: '#fafafa', // gray-50
  },
  echo: {
    id: 'echo',
    name: 'Echo基调',
    bgColor: '#b2dfdb', // 基础色（略深）
    bgStyle: {
      background: 'linear-gradient(to bottom right, rgba(153, 246, 228, 0.75), rgba(165, 243, 252, 0.7), rgba(186, 230, 253, 0.75))',
    },
  },
  salt_blue: {
    id: 'salt_blue',
    name: '海盐淡蓝',
    bgColor: '#e1f5fe', // 基础色
    bgStyle: {
      background: 'linear-gradient(to bottom right, rgba(224, 242, 254, 0.5), rgba(232, 245, 253, 0.45), rgba(240, 249, 255, 0.5))',
    },
  },
  fresh_green: {
    id: 'fresh_green',
    name: '生机嫩绿',
    bgColor: '#e8f5e9', // 基础色
    bgStyle: {
      background: 'linear-gradient(to bottom right, rgba(220, 252, 231, 0.6), rgba(236, 253, 245, 0.55), rgba(240, 253, 244, 0.6))',
    },
  },
};

const STORAGE_KEY = 'selectedTheme';

/**
 * 获取当前主题
 */
export function getCurrentTheme(): ThemeType {
  if (typeof window === 'undefined') return 'default';
  
  const stored = localStorage.getItem(STORAGE_KEY);
  console.log('[ThemeSystem] localStorage读取:', stored);
  
  // 兼容旧的 'blue' 主题名
  if (stored === 'blue') {
    console.log('[ThemeSystem] 检测到旧主题名 blue，转换为 echo');
    return 'echo';
  }
  
  if (stored === 'echo' || stored === 'salt_blue' || stored === 'fresh_green' || stored === 'default') {
    return stored as ThemeType;
  }
  
  return 'default';
}

/**
 * 设置主题（同时保存到localStorage和数据库）
 */
export function setTheme(theme: ThemeType): void {
  if (typeof window === 'undefined') return;
  
  // 保存到localStorage（立即生效）
  localStorage.setItem(STORAGE_KEY, theme);
  console.log('[ThemeSystem] 已设置主题:', theme);
  
  // 异步保存到数据库（跨设备同步）
  fetch('/api/user/theme', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme }),
  }).catch(err => {
    console.warn('[ThemeSystem] 同步主题到数据库失败:', err);
  });
}

/**
 * 获取主题配置
 */
export function getThemeConfig(theme?: ThemeType): ThemeConfig {
  const currentTheme = theme || getCurrentTheme();
  return THEMES[currentTheme] || THEMES.default;
}

