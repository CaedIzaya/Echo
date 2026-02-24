const PROJECT_META_PREFIX = '__ECHO_PROJECT_META__';

type ProjectMeta = {
  focusBranch: string;
  focusDetail: string;
};

export function decodeProjectDescription(description?: string | null): ProjectMeta {
  if (!description) {
    return { focusBranch: '', focusDetail: '' };
  }

  if (!description.startsWith(PROJECT_META_PREFIX)) {
    return { focusBranch: description, focusDetail: '' };
  }

  try {
    const raw = description.slice(PROJECT_META_PREFIX.length);
    const parsed = JSON.parse(raw) as Partial<ProjectMeta>;
    return {
      focusBranch: (parsed.focusBranch || '').trim(),
      focusDetail: (parsed.focusDetail || '').trim(),
    };
  } catch {
    // 格式损坏时回退到纯文本模式，避免影响现有数据
    return { focusBranch: description, focusDetail: '' };
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

export function enrichProjectForClient<T extends { description?: string | null }>(project: T) {
  const { focusBranch, focusDetail } = decodeProjectDescription(project.description);
  return {
    ...project,
    description: focusBranch,
    focusDetail: focusDetail || null,
  };
}

