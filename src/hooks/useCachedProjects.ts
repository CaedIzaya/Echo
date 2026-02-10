import { useState, useEffect, useCallback } from 'react';

interface FinalGoal {
  content: string;
  createdAt: string;
  isCompleted: boolean;
  completedAt?: string;
}

interface Project {
  id: string;
  name: string;
  focusBranch?: string;
  description?: string;
  icon: string;
  dailyGoalMinutes: number;
  milestones: Milestone[];
  finalGoal?: FinalGoal;
  isActive: boolean;
  isPrimary?: boolean;
  isCompleted?: boolean;
  isBlank?: boolean;
  totalFocusMinutes?: number;
  streakDays?: number;
  completedMilestones?: number;
  startDate?: string;
  avgFlowScore?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface Milestone {
  id: string;
  title: string;
  isCompleted: boolean;
  order: number;
}

const CACHE_KEY = 'userPlans';
const CACHE_TIMESTAMP_KEY = 'userPlans_timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

export function useCachedProjects(sessionStatus: string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // 从 localStorage 加载缓存
  const loadFromCache = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (cached && timestamp) {
        const age = Date.now() - parseInt(timestamp);
        if (age < CACHE_DURATION) {
          return JSON.parse(cached).map((p: any) => ({
            ...p,
            focusBranch: p.description || p.focusBranch,
            milestones: p.milestones || []
          }));
        }
      }
    } catch (error) {
      console.error('加载缓存失败:', error);
    }
    
    return null;
  }, []);

  // 保存到 localStorage
  const saveToCache = useCallback((data: Project[]) => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.error('保存缓存失败:', error);
    }
  }, []);

  // 从数据库加载
  const loadFromDatabase = useCallback(async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        const mappedProjects = data.projects.map((p: any) => ({
          ...p,
          focusBranch: p.description,
          milestones: p.milestones || []
        }));
        
        setProjects(mappedProjects);
        saveToCache(mappedProjects);
        return mappedProjects;
      }
    } catch (error) {
      console.error('从数据库加载失败:', error);
    }
    return null;
  }, [saveToCache]);

  // 初始化：优先使用缓存，后台同步数据库
  useEffect(() => {
    if (sessionStatus !== 'authenticated') {
      setIsLoading(false);
      return;
    }

    // 立即加载缓存
    const cached = loadFromCache();
    if (cached) {
      setProjects(cached);
      setIsLoading(false);
      
      // 后台同步数据库
      setIsSyncing(true);
      loadFromDatabase().finally(() => setIsSyncing(false));
    } else {
      // 没有缓存，直接从数据库加载
      loadFromDatabase().finally(() => setIsLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus]); // 🔥 只依赖 sessionStatus，loadFromCache 和 loadFromDatabase 在函数内部调用

  // 更新项目（同时更新缓存和数据库）
  const updateProject = useCallback(async (
    projectId: string,
    updates: Partial<Project>,
    apiCall?: () => Promise<any>
  ) => {
    // 乐观更新本地状态和缓存
    setProjects(prev => {
      const updated = prev.map(p => 
        p.id === projectId ? { ...p, ...updates } : p
      );
      saveToCache(updated);
      return updated;
    });

    // 如果提供了 API 调用，执行它
    if (apiCall) {
      try {
        await apiCall();
      } catch (error) {
        console.error('更新数据库失败:', error);
        // 失败时重新加载数据库数据
        loadFromDatabase();
      }
    }
  }, [saveToCache, loadFromDatabase]);

  // 删除项目
  const deleteProject = useCallback(async (projectId: string) => {
    // 乐观删除
    setProjects(prev => {
      const updated = prev.filter(p => p.id !== projectId);
      saveToCache(updated);
      return updated;
    });

    // 调用 API
    try {
      await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
    } catch (error) {
      console.error('删除失败:', error);
      loadFromDatabase();
    }
  }, [saveToCache, loadFromDatabase]);

  // 添加项目
  const addProject = useCallback((newProject: Project) => {
    setProjects(prev => {
      const updated = [...prev, newProject];
      saveToCache(updated);
      return updated;
    });
  }, [saveToCache]);

  // 强制刷新（从数据库重新加载）
  const refresh = useCallback(async () => {
    setIsSyncing(true);
    await loadFromDatabase();
    setIsSyncing(false);
  }, [loadFromDatabase]);

  return {
    projects,
    setProjects,
    isLoading,
    isSyncing,
    updateProject,
    deleteProject,
    addProject,
    refresh,
  };
}


