/**
 * Tracks whether the first-run hint card has been dismissed for the active site.
 * Uses AsyncStorage (same mechanism as useJobFilters — not sensitive data; tokens/creds
 * live in expo-secure-store). Keyed per active site id so switching sites shows the hint
 * again on that site's first visit.
 *
 * showHint is false while the persisted flag is still loading, preventing a flash.
 */
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../stores/authStore';

const storageKey = (siteId: string) => `tq.hintDismissed.${siteId}`;

export interface UseFirstRunHintResult {
  showHint: boolean;
  dismissHint: () => void;
}

export function useFirstRunHint(): UseFirstRunHintResult {
  const activeSiteId = useAuthStore((s) => s.activeSiteId);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (!activeSiteId) return;
    let active = true;
    AsyncStorage.getItem(storageKey(activeSiteId))
      .then((raw) => {
        if (!active) return;
        // Only show if never dismissed — keep showHint false until load completes (no flash).
        setShowHint(raw !== 'true');
      })
      .catch(() => {
        if (active) setShowHint(false);
      });
    return () => {
      active = false;
    };
  }, [activeSiteId]);

  const dismissHint = useCallback(() => {
    setShowHint(false);
    if (!activeSiteId) return;
    AsyncStorage.setItem(storageKey(activeSiteId), 'true').catch(() => {
      /* best-effort persistence; in-memory state already hides the hint */
    });
  }, [activeSiteId]);

  return { showHint, dismissHint };
}
