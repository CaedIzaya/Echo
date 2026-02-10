/**
 * 用户计划管理 Hook
 * 
 * 目的：确保计划数据从数据库加载，localStorage 仅作为缓存
 * 优先级：数据库 > localStorage
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { getUserStorage, setUserStorage } from '~/lib/userStorage';
import { trackEffect } from '~/lib/debugTools';

export interface Milestone {
  id: string;
  title: string;
  isCompleted: boolean;
  order: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  icon: string;
  color?: string | null;
  dailyGoalMinutes: number;
  targetDate?: string | null;
  isActive: boolean;
  isPrimary?: boolean;
  isCompleted?: boolean;
  milestones: Milestone[];
  finalGoal?: {
    content: string;
    createdAt: string;
    isCompleted: boolean;
    completedAt?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

const STORAGE_KEY = 'userPlans';
const SYNC_KEY = 'userPlansSynced';

/**
 * 用户计划管理 Hook
 * - 优先从数据库读取
 * - 缓存到 localStorage
 * - 修改时同时更新数据库和 localStorage
 */
export function useProjects() {
  const { data: session, status } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsVersion, setProjectsVersion] = useState(0); // 🔥 添加版本号追踪变化
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 从本地缓存读取（快速初始化）
  const loadFromCache = useCallback((): Project[] => {
    if (typeof window === 'undefined') return [];
    
    try {
      // ✅ 使用用户隔离的 localStorage
    const cached = getUserStorage(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('[useProjects] 缓存读取失败', error);
    }
    
    return [];
  }, []);

  // 从数据库加载计划
  const loadFromDatabase = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      console.log('[useProjects] 🔄 从数据库加载计划...');
      
      const response = await fetch('/api/projects');
      
      if (response.ok) {
        const data = await response.json();
        const dbProjects: Project[] = data.projects || [];
        
        console.log('[useProjects] ✅ 加载成功', {
          计划数量: dbProjects.length,
          主计划: dbProjects.find(p => p.isPrimary)?.name,
        });
        
        // 更新状态
        setProjects(dbProjects);
        setProjectsVersion(prev => prev + 1); // 🔥 更新版本号
        
        // 🌟 优化：写入缓存并记录时间戳
        // ✅ 使用用户隔离的 localStorage
        setUserStorage(STORAGE_KEY, JSON.stringify(dbProjects));
        setUserStorage(SYNC_KEY, 'true');
        setUserStorage('projectsSyncedAt', new Date().toISOString());
        
        console.log('[useProjects] 💾 计划数据已缓存（1小时有效期）');
        
      } else {
        console.error('[useProjects] 加载失败', response.status);
        // 失败时使用缓存
        const cached = loadFromCache();
        setProjects(cached);
      }
    } catch (error) {
      console.error('[useProjects] 加载异常', error);
      // 失败时使用缓存
      const cached = loadFromCache();
      setProjects(cached);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]); // 🔥 移除 loadFromCache 依赖，直接在函数内部调用

  // 初始化加载 - 完全依赖数据库
  useEffect(() => {
    trackEffect('useProjects', 'init');
    
    if (status === 'loading') return;

    if (status === 'authenticated') {
      console.log('[useProjects] 🔥 开始从数据库加载计划（不使用缓存）');
      loadFromDatabase();
    } else {
      setProjects([]);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]); // 🔥 只依赖 status，loadFromDatabase 在函数内部调用

  // 创建计划
  const createProject = useCallback(async (projectData: Partial<Project>) => {
    if (!session?.user?.id) {
      console.warn('[useProjects] 未登录，无法创建计划');
      return null;
    }

    setIsSaving(true);

    try {
      console.log('[useProjects] 💾 创建计划', projectData.name);
      
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        throw new Error(`创建失败: ${response.status}`);
      }

      const data = await response.json();
      const newProject: Project = data.project;
      
      console.log('[useProjects] ✅ 计划创建成功', newProject.id);
      
      // 更新状态
      setProjects(prev => [...prev, newProject]);
      
      // 更新缓存
      const allProjects = [...projects, newProject];
      // ✅ 使用用户隔离的 localStorage
      setUserStorage(STORAGE_KEY, JSON.stringify(allProjects));
      
      return newProject;
      
    } catch (error: any) {
      console.error('[useProjects] ❌ 创建失败', error);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [session?.user?.id, projects]);

  // 更新计划
  const updateProject = useCallback(async (projectId: string, updates: Partial<Project>) => {
    if (!session?.user?.id) {
      console.warn('[useProjects] 未登录，无法更新计划');
      return false;
    }

    setIsSaving(true);

    try {
      console.log('[useProjects] 💾 更新计划', projectId);
      
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`更新失败: ${response.status}`);
      }

      const data = await response.json();
      const updatedProject: Project = data.project;
      
      console.log('[useProjects] ✅ 计划更新成功');
      
      // 更新状态
      setProjects(prev => prev.map(p => 
        p.id === projectId ? updatedProject : p
      ));
      
      // 🌟 优化：立即更新缓存，延迟标记同步时间
      const allProjects = projects.map(p => 
        p.id === projectId ? updatedProject : p
      );
      // ✅ 使用用户隔离的 localStorage
      setUserStorage(STORAGE_KEY, JSON.stringify(allProjects));
      setUserStorage('projectsSyncedAt', new Date().toISOString());
      
      return true;
      
    } catch (error: any) {
      console.error('[useProjects] ❌ 更新失败', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [session?.user?.id, projects]);

  // 删除计划
  const deleteProject = useCallback(async (projectId: string) => {
    if (!session?.user?.id) {
      console.warn('[useProjects] 未登录，无法删除计划');
      return false;
    }

    setIsSaving(true);

    try {
      console.log('[useProjects] 💾 删除计划', projectId);
      
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`删除失败: ${response.status}`);
      }
      
      console.log('[useProjects] ✅ 计划删除成功');
      
      // 更新状态
      setProjects(prev => prev.filter(p => p.id !== projectId));
      
      // 更新缓存
      const allProjects = projects.filter(p => p.id !== projectId);
      // ✅ 使用用户隔离的 localStorage
      setUserStorage(STORAGE_KEY, JSON.stringify(allProjects));
      
      return true;
      
    } catch (error: any) {
      console.error('[useProjects] ❌ 删除失败', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [session?.user?.id, projects]);

  // 更新小目标
  const updateMilestones = useCallback(async (
    projectId: string, 
    milestones: Milestone[]
  ) => {
    if (!session?.user?.id) {
      console.warn('[useProjects] 未登录，无法更新小目标');
      return false;
    }

    try {
      console.log('[useProjects] 💾 更新小目标', { projectId, count: milestones.length });
      
      const response = await fetch(`/api/projects/${projectId}/milestones`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestones }),
      });

      if (!response.ok) {
        throw new Error(`更新失败: ${response.status}`);
      }

      const data = await response.json();
      const updatedMilestones: Milestone[] = data.milestones;
      
      console.log('[useProjects] ✅ 小目标更新成功');
      
      // 更新状态
      setProjects(prev => prev.map(p => 
        p.id === projectId ? { ...p, milestones: updatedMilestones } : p
      ));
      
      // 更新缓存
      const allProjects = projects.map(p => 
        p.id === projectId ? { ...p, milestones: updatedMilestones } : p
      );
      // ✅ 使用用户隔离的 localStorage
      setUserStorage(STORAGE_KEY, JSON.stringify(allProjects));
      
      return true;
      
    } catch (error: any) {
      console.error('[useProjects] ❌ 小目标更新失败', error);
      return false;
    }
  }, [session?.user?.id, projects]);

  // 手动同步（用于迁移）
  const syncToDatabase = useCallback(async () => {
    if (!session?.user?.id) return false;

    const cached = loadFromCache();
    if (cached.length === 0) {
      console.log('[useProjects] 无本地数据需要同步');
      return true;
    }

    console.log('[useProjects] 🔄 同步本地计划到数据库', cached.length);

    try {
      // 批量创建
      const promises = cached.map(project =>
        fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: project.id, // 保留原ID
            name: project.name,
            description: project.description,
            icon: project.icon,
            color: project.color,
            dailyGoalMinutes: project.dailyGoalMinutes,
            targetDate: project.targetDate,
            isActive: project.isActive,
            isPrimary: project.isPrimary,
            isCompleted: project.isCompleted,
            milestones: project.milestones,
          }),
        })
      );

      await Promise.all(promises);
      
      console.log('[useProjects] ✅ 同步完成');
      setUserStorage(SYNC_KEY, 'true');
      
      // 重新加载确保数据一致
      await loadFromDatabase();
      
      return true;
      
    } catch (error: any) {
      console.error('[useProjects] ❌ 同步失败', error);
      return false;
    }
  }, [session?.user?.id, loadFromCache, loadFromDatabase]);

  // 🔥 使用 useMemo 稳定派生值，避免每次都创建新引用
  const primaryProject = useMemo(
    () => projects.find(p => p.isPrimary) || null,
    [projectsVersion] // 🔥 依赖版本号而不是数组本身
  );
  
  const activeProjects = useMemo(
    () => projects.filter(p => p.isActive),
    [projectsVersion] // 🔥 依赖版本号而不是数组本身
  );

  return {
    projects,
    primaryProject,
    activeProjects,
    projectsVersion, // 🔥 导出版本号供外部使用
    isLoading,
    isSaving,
    createProject,
    updateProject,
    deleteProject,
    updateMilestones,
    syncToDatabase,
    reload: loadFromDatabase,
  };
}

// 检查计划数据是否过期（5分钟）
function isProjectDataStale(lastSyncAt: string): boolean {
  try {
    const lastSync = new Date(lastSyncAt);
    const now = new Date();
    const minutesSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60);
    
    // 🔥 计划数据超过5分钟视为过期（提高实时性）
    return minutesSinceSync > 5;
  } catch {
    return true;
  }
}
