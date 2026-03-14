const PROJECT_META_PREFIX = '__ECHO_PROJECT_META__';

export type ProjectFinalGoalMeta = {
  content: string;
  createdAt: string;
  isCompleted: boolean;
  completedAt?: string;
};

type ProjectMeta = {
  focusBranch: string;
  focusDetail: string;
  finalGoal?: ProjectFinalGoalMeta | null;
};

export function decodeProjectDescription(description?: string | null): ProjectMeta {
  if (!description) {
    return { focusBranch: '', focusDetail: '', finalGoal: null };
  }

  if (!description.startsWith(PROJECT_META_PREFIX)) {
    return { focusBranch: description, focusDetail: '', finalGoal: null };
  }

  try {
    const raw = description.slice(PROJECT_META_PREFIX.length);
    const parsed = JSON.parse(raw) as Partial<ProjectMeta>;
    const parsedFinalGoal = parsed.finalGoal;
    const finalGoal =
      parsedFinalGoal &&
      typeof parsedFinalGoal === 'object' &&
      typeof parsedFinalGoal.content === 'string' &&
      typeof parsedFinalGoal.createdAt === 'string' &&
      typeof parsedFinalGoal.isCompleted === 'boolean'
        ? {
            content: parsedFinalGoal.content.trim(),
            createdAt: parsedFinalGoal.createdAt,
            isCompleted: parsedFinalGoal.isCompleted,
            completedAt:
              typeof parsedFinalGoal.completedAt === 'string'
                ? parsedFinalGoal.completedAt
                : undefined,
          }
        : null;
    return {
      focusBranch: (parsed.focusBranch || '').trim(),
      focusDetail: (parsed.focusDetail || '').trim(),
      finalGoal: finalGoal?.content ? finalGoal : null,
    };
  } catch {
    // 格式损坏时回退到纯文本模式，避免影响现有数据
    return { focusBranch: description, focusDetail: '', finalGoal: null };
  }
}

export function encodeProjectDescription(
  focusBranch?: string | null,
  focusDetail?: string | null
): string {
  const branch = (focusBranch || '').trim();
  const detail = (focusDetail || '').trim();

  if (!detail) {
    return branch;
  }

  return `${PROJECT_META_PREFIX}${JSON.stringify({
    focusBranch: branch,
    focusDetail: detail,
  })}`;
}

export function enrichProjectForClient<
  T extends { description?: string | null; finalGoal?: unknown | null }
>(project: T) {
  const { focusBranch, focusDetail, finalGoal: legacyFinalGoal } = decodeProjectDescription(project.description);
  const dbFinalGoal =
    project.finalGoal &&
    typeof project.finalGoal === 'object' &&
    typeof (project.finalGoal as Record<string, unknown>).content === 'string' &&
    typeof (project.finalGoal as Record<string, unknown>).createdAt === 'string' &&
    typeof (project.finalGoal as Record<string, unknown>).isCompleted === 'boolean'
      ? (project.finalGoal as ProjectFinalGoalMeta)
      : null;
  return {
    ...project,
    description: focusBranch,
    focusDetail: focusDetail || null,
    finalGoal: dbFinalGoal || legacyFinalGoal || undefined,
  };
}

