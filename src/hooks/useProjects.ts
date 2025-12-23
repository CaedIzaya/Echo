/**
 * 用户计划管理 Hook
 * 
 * 功能：
 * - 从数据库加载计划（替代 localStorage）
 * - 创建、更新、删除计划
 * - 管理里程碑
 * - 自动同步
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
  description?: string;
  icon: string;
  color?: string;
  dailyGoalMinutes: number;
  targetDate?: string;
  isActive: boolean;
  isPrimary?: boolean;
  milestones: Milestone[];
  createdAt?: string;
  updatedAt?: string;
}

interface UseProjectsResult {
  projects: Project[];
  primaryProject: Project | null;
  isLoading: boolean;
  isSaving: boolean;
  createProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Project | null>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<boolean>;
  deleteProject: (id: string) => Promise<boolean>;
  addMilestone: (projectId: string, title: string) => Promise<boolean>;
  updateMilestone: (projectId: string, milestoneId: string, updates: Partial<Milestone>) => Promise<boolean>;
  deleteMilestone: (projectId: string, milestoneId: string) => Promise<boolean>;
  reload: () => Promise<void>;
}

export function useProjects(): UseProjectsResult {
  const { data: session, status } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 从数据库加载计划
  const loadProjects = useCallback(async () => {
    if (!session?.user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      console.log('[useProjects] 加载计划...');
      
      const response = await fetch('/api/projects');
      
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
        console.log('[useProjects] 加载成功:', data.projects?.length, '个计划');
      } else {
        console.warn('[useProjects] 加载失败:', response.status);
        // 失败时尝试从 localStorage 读取（兼容旧数据）
        const localPlans = localStorage.getItem('userPlans');
        if (localPlans) {
          setProjects(JSON.parse(localPlans));
        }
      }
    } catch (error) {
      console.error('[useProjects] 加载失败:', error);
      // 失败时尝试从 localStorage 读取
      const localPlans = localStorage.getItem('userPlans');
      if (localPlans) {
        setProjects(JSON.parse(localPlans));
      }
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  // 初始化加载
  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'authenticated') {
      loadProjects();
    } else {
      // 未登录：使用 localStorage
      const localPlans = localStorage.getItem('userPlans');
      if (localPlans) {
        setProjects(JSON.parse(localPlans));
      }
      setIsLoading(false);
    }
  }, [status, loadProjects]);

  // 创建计划
  const createProject = useCallback(async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project | null> => {
    setIsSaving(true);

    try {
      console.log('[useProjects] 创建计划:', projectData.name);

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[useProjects] 创建失败:', error);
        return null;
      }

      const data = await response.json();
      
      // 刷新列表
      await loadProjects();
      
      console.log('[useProjects] 创建成功:', data.project.id);
      return data.project;

    } catch (error) {
      console.error('[useProjects] 创建失败:', error);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [loadProjects]);

  // 更新计划
  const updateProject = useCallback(async (id: string, updates: Partial<Project>): Promise<boolean> => {
    setIsSaving(true);

    try {
      console.log('[useProjects] 更新计划:', id);

      const response = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        console.error('[useProjects] 更新失败');
        return false;
      }

      // 刷新列表
      await loadProjects();
      
      console.log('[useProjects] 更新成功');
      return true;

    } catch (error) {
      console.error('[useProjects] 更新失败:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [loadProjects]);

  // 删除计划
  const deleteProject = useCallback(async (id: string): Promise<boolean> => {
    setIsSaving(true);

    try {
      console.log('[useProjects] 删除计划:', id);

      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        console.error('[useProjects] 删除失败');
        return false;
      }

      // 刷新列表
      await loadProjects();
      
      console.log('[useProjects] 删除成功');
      return true;

    } catch (error) {
      console.error('[useProjects] 删除失败:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [loadProjects]);

  // 添加里程碑
  const addMilestone = useCallback(async (projectId: string, title: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/projects/${projectId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) return false;

      await loadProjects();
      return true;

    } catch (error) {
      console.error('[useProjects] 添加里程碑失败:', error);
      return false;
    }
  }, [loadProjects]);

  // 更新里程碑
  const updateMilestone = useCallback(async (
    projectId: string, 
    milestoneId: string, 
    updates: Partial<Milestone>
  ): Promise<boolean> => {
    try {
      const response = await fetch(`/api/projects/${projectId}/milestones/${milestoneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) return false;

      await loadProjects();
      return true;

    } catch (error) {
      console.error('[useProjects] 更新里程碑失败:', error);
      return false;
    }
  }, [loadProjects]);

  // 删除里程碑
  const deleteMilestone = useCallback(async (projectId: string, milestoneId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/projects/${projectId}/milestones/${milestoneId}`, {
        method: 'DELETE',
      });

      if (!response.ok) return false;

      await loadProjects();
      return true;

    } catch (error) {
      console.error('[useProjects] 删除里程碑失败:', error);
      return false;
    }
  }, [loadProjects]);

  // 获取主要计划
  const primaryProject = projects.find(p => p.isPrimary) || null;

  return {
    projects,
    primaryProject,
    isLoading,
    isSaving,
    createProject,
    updateProject,
    deleteProject,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    reload: loadProjects,
  };
}








