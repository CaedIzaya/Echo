/**
 * 用户计划管理 Hook
 * 
 * 目的：确保计划数据从数据库加载，localStorage 仅作为缓存
 * 优先级：数据库 > localStorage
 */

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 从本地缓存读取（快速初始化）
  const loadFromCache = useCallback((): Project[] => {
    if (typeof window === 'undefined') return [];
    
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
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
        
        // 写入缓存
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dbProjects));
        localStorage.setItem(SYNC_KEY, 'true');
        
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
  }, [session?.user?.id, loadFromCache]);

  // 初始化加载
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'authenticated') {
      // 先显示缓存数据
      const cached = loadFromCache();
      if (cached.length > 0) {
        setProjects(cached);
        setIsLoading(false);
      }
      
      // 检查是否需要同步
      const synced = localStorage.getItem(SYNC_KEY);
      
      if (!synced) {
        // 未同步：从数据库加载
        loadFromDatabase();
      } else {
        // 已同步：后台刷新
        setTimeout(() => {
          loadFromDatabase();
        }, 1000);
      }
    } else {
      // 未登录：只使用缓存
      const cached = loadFromCache();
      setProjects(cached);
      setIsLoading(false);
    }
  }, [status, loadFromCache, loadFromDatabase]);

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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allProjects));
      
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
      
      // 更新缓存
      const allProjects = projects.map(p => 
        p.id === projectId ? updatedProject : p
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allProjects));
      
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allProjects));
      
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allProjects));
      
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
      localStorage.setItem(SYNC_KEY, 'true');
      
      // 重新加载确保数据一致
      await loadFromDatabase();
      
      return true;
      
    } catch (error: any) {
      console.error('[useProjects] ❌ 同步失败', error);
      return false;
    }
  }, [session?.user?.id, loadFromCache, loadFromDatabase]);

  return {
    projects,
    primaryProject: projects.find(p => p.isPrimary) || null,
    activeProjects: projects.filter(p => p.isActive),
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
