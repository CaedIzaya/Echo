type TrackEventPayload = {
  name: string;
  feature?: string;
  page?: string;
  action?: string;
  properties?: Record<string, any>;
};

type SessionPingPayload = {
  sessionId: string;
  entryPage?: string;
  startedAt?: string;
};

const SESSION_ID_KEY = 'analytics_session_id';
const SESSION_START_KEY = 'analytics_session_start';
const SESSION_LAST_KEY = 'analytics_last_activity';
const SESSION_ENTRY_KEY = 'analytics_entry_page';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function getNowIso() {
  return new Date().toISOString();
}

export function getDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function getSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(SESSION_ID_KEY);
}

function setSessionId(sessionId: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SESSION_ID_KEY, sessionId);
}

function setSessionStart(startIso: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SESSION_START_KEY, startIso);
}

function setSessionLastActivity(timeMs: number) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SESSION_LAST_KEY, String(timeMs));
}

function setSessionEntryPage(page?: string) {
  if (typeof window === 'undefined' || !page) return;
  sessionStorage.setItem(SESSION_ENTRY_KEY, page);
}

function getSessionEntryPage(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(SESSION_ENTRY_KEY);
}

function isSessionExpired(): boolean {
  if (typeof window === 'undefined') return true;
  const last = sessionStorage.getItem(SESSION_LAST_KEY);
  if (!last) return true;
  const lastMs = Number(last);
  if (!Number.isFinite(lastMs)) return true;
  return Date.now() - lastMs > SESSION_TIMEOUT_MS;
}

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function postEvent(payload: TrackEventPayload, sessionId?: string) {
  if (typeof window === 'undefined') return;
  const body = {
    ...payload,
    sessionId,
    clientTime: getNowIso(),
    timezone: getTimezone(),
    dateKey: getDateKey(),
  };
  try {
    await fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.warn('[analytics] event failed', error);
  }
}

async function pingSession(payload: SessionPingPayload) {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/analytics/session/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        clientTime: getNowIso(),
        timezone: getTimezone(),
        dateKey: getDateKey(),
      }),
    });
  } catch (error) {
    console.warn('[analytics] session ping failed', error);
  }
}

function ensureSession(page?: string): string | null {
  if (typeof window === 'undefined') return null;
  const expired = isSessionExpired();
  let sessionId = getSessionId();
  if (!sessionId || expired) {
    sessionId = generateSessionId();
    setSessionId(sessionId);
    setSessionStart(getNowIso());
    setSessionEntryPage(page);
    setSessionLastActivity(Date.now());
    void postEvent({
      name: 'session_start',
      feature: inferFeatureFromPath(page || ''),
      page,
      action: 'start',
    }, sessionId);
    void pingSession({
      sessionId,
      entryPage: page,
      startedAt: getNowIso(),
    });
    return sessionId;
  }
  setSessionLastActivity(Date.now());
  return sessionId;
}

export function trackEvent(payload: TrackEventPayload) {
  const sessionId = ensureSession(payload.page);
  void postEvent(payload, sessionId || undefined);
}

export function startSessionHeartbeat() {
  if (typeof window === 'undefined') return () => {};
  const interval = setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    const sessionId = ensureSession(window.location.pathname);
    if (!sessionId) return;
    void pingSession({
      sessionId,
      entryPage: getSessionEntryPage() || window.location.pathname,
      startedAt: sessionStorage.getItem(SESSION_START_KEY) || getNowIso(),
    });
  }, 60 * 1000);

  return () => clearInterval(interval);
}

export function inferFeatureFromPath(pathname: string): string | undefined {
  if (!pathname) return undefined;
  if (pathname.startsWith('/focus')) return 'focus';
  if (pathname.startsWith('/plans')) return 'plans';
  if (pathname.startsWith('/daily-summary')) return 'daily_summary';
  if (pathname.startsWith('/journal')) return 'journal';
  if (pathname.startsWith('/heart-tree')) return 'heart_tree';
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/profile')) return 'profile';
  if (pathname.startsWith('/auth')) return 'auth';
  if (pathname.startsWith('/onboarding')) return 'onboarding';
  if (pathname.startsWith('/s/')) return 'share';
  if (pathname.startsWith('/comments')) return 'comments';
  if (pathname.startsWith('/legal')) return 'legal';
  if (pathname === '/') return 'landing';
  return undefined;
}
