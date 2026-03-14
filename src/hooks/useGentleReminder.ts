import { useEffect, useRef, useCallback } from 'react';
import { getUserStorage } from '~/lib/userStorage';
import { useNotification } from './useNotification';
import {
  GOAL_REACHED_MESSAGES,
  AWAY_TOO_LONG_MESSAGES,
  pickRandomMessage,
} from '~/constants/gentleReminderCopy';
import { trackEvent } from '~/lib/analytics';

type FocusState =
  | 'preparing'
  | 'starting'
  | 'running'
  | 'paused'
  | 'completed'
  | 'interrupted';

interface UseGentleReminderParams {
  sessionId: string | null;
  sessionStatus: FocusState;
  elapsedSeconds: number;
  goalMinutes: number;
  isFocusPageVisible: boolean;
}

const GOAL_BUFFER_MS = 45_000; // 45s buffer after goal reached before sending
const AWAY_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

function isEnabled(): boolean {
  return getUserStorage('gentleReminder_enabled') === 'true';
}

function isGoalEnabled(): boolean {
  const val = getUserStorage('gentleReminder_goalEnabled');
  return val === null || val === 'true'; // default true when master is on
}

function isAwayEnabled(): boolean {
  const val = getUserStorage('gentleReminder_awayEnabled');
  return val === null || val === 'true'; // default true when master is on
}

export function useGentleReminder({
  sessionId,
  sessionStatus,
  elapsedSeconds,
  goalMinutes,
  isFocusPageVisible,
}: UseGentleReminderParams) {
  const { sendNotification, closeAll, isSupported, permissionStatus } = useNotification();

  const goalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const awayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasSentGoalRef = useRef<string | null>(null);
  const hasSentAwayRef = useRef<string | null>(null);

  const goalReachedRef = useRef(false);
  const leftAtRef = useRef<number | null>(null);

  const prevSessionIdRef = useRef<string | null>(null);

  const clearGoalTimer = useCallback(() => {
    if (goalTimerRef.current) {
      clearTimeout(goalTimerRef.current);
      goalTimerRef.current = null;
    }
  }, []);

  const clearAwayTimer = useCallback(() => {
    if (awayTimerRef.current) {
      clearTimeout(awayTimerRef.current);
      awayTimerRef.current = null;
    }
  }, []);

  const clearAll = useCallback(() => {
    clearGoalTimer();
    clearAwayTimer();
  }, [clearGoalTimer, clearAwayTimer]);

  // Reset when session changes
  useEffect(() => {
    if (sessionId !== prevSessionIdRef.current) {
      clearAll();
      goalReachedRef.current = false;
      leftAtRef.current = null;
      prevSessionIdRef.current = sessionId;
    }
  }, [sessionId, clearAll]);

  // Clear timers when session is no longer running
  useEffect(() => {
    if (sessionStatus !== 'running') {
      clearAll();
      leftAtRef.current = null;
    }
  }, [sessionStatus, clearAll]);

  // When user returns to focus page, cancel pending notifications & close any existing ones
  useEffect(() => {
    if (isFocusPageVisible) {
      clearAll();
      leftAtRef.current = null;
      closeAll();
    }
  }, [isFocusPageVisible, clearAll, closeAll]);

  // --- Goal reached reminder ---
  useEffect(() => {
    if (sessionStatus !== 'running' || !sessionId) return;
    if (!isSupported || permissionStatus !== 'granted') return;
    if (!isEnabled() || !isGoalEnabled()) return;
    if (hasSentGoalRef.current === sessionId) return;
    if (goalMinutes <= 0) return;

    const goalReached = elapsedSeconds >= goalMinutes * 60;

    if (goalReached && !goalReachedRef.current) {
      goalReachedRef.current = true;
    }

    if (!goalReachedRef.current) return;

    if (!isFocusPageVisible && !goalTimerRef.current) {
      goalTimerRef.current = setTimeout(() => {
        goalTimerRef.current = null;
        if (hasSentGoalRef.current === sessionId) return;

        const msg = pickRandomMessage(GOAL_REACHED_MESSAGES);
        sendNotification(msg.title, msg.body, 'lumi-goal-reached');
        hasSentGoalRef.current = sessionId;

        trackEvent({
          name: 'gentle_reminder_triggered',
          feature: 'gentle_reminder',
          page: 'focus',
          action: 'goal_reached',
          properties: { sessionId, goalMinutes, elapsedSeconds },
        });
      }, GOAL_BUFFER_MS);
    }

    if (isFocusPageVisible) {
      clearGoalTimer();
    }
  }, [
    sessionId, sessionStatus, elapsedSeconds, goalMinutes,
    isFocusPageVisible, isSupported, permissionStatus,
    sendNotification, clearGoalTimer,
  ]);

  // --- Away too long reminder ---
  useEffect(() => {
    if (sessionStatus !== 'running' || !sessionId) return;
    if (!isSupported || permissionStatus !== 'granted') return;
    if (!isEnabled() || !isAwayEnabled()) return;
    if (hasSentAwayRef.current === sessionId) return;

    if (!isFocusPageVisible) {
      if (leftAtRef.current === null) {
        leftAtRef.current = Date.now();
      }

      if (!awayTimerRef.current) {
        const elapsed = Date.now() - leftAtRef.current;
        const remaining = Math.max(0, AWAY_THRESHOLD_MS - elapsed);

        awayTimerRef.current = setTimeout(() => {
          awayTimerRef.current = null;
          if (hasSentAwayRef.current === sessionId) return;

          const msg = pickRandomMessage(AWAY_TOO_LONG_MESSAGES);
          sendNotification(msg.title, msg.body, 'lumi-away-too-long');
          hasSentAwayRef.current = sessionId;

          trackEvent({
            name: 'gentle_reminder_triggered',
            feature: 'gentle_reminder',
            page: 'focus',
            action: 'away_too_long',
            properties: { sessionId, awayMinutes: 10 },
          });
        }, remaining);
      }
    } else {
      clearAwayTimer();
      leftAtRef.current = null;
    }
  }, [
    sessionId, sessionStatus, isFocusPageVisible,
    isSupported, permissionStatus,
    sendNotification, clearAwayTimer,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAll();
    };
  }, [clearAll]);
}
