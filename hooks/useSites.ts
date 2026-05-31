/**
 * Multi-site management for the Profile screen (spec §12). Lists saved site configs and switches
 * the active one. Switching clears the local DB (so the previous site's data never shows) and
 * resets the session to the new site's token — the route guard + `useAppBoot` then re-seed config
 * or send the user to login. Sites live in expo-secure-store (not reactive), so the list is loaded
 * imperatively and refreshed after a switch.
 */
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { clearLocalData } from '../database/queries';
import type { SiteConfig } from '../types/app';

export interface UseSitesResult {
  sites: SiteConfig[];
  activeSiteId: string | null;
  isLoaded: boolean;
  switchTo: (id: string) => Promise<void>;
}

export function useSites(): UseSitesResult {
  const listSites = useAuthStore((s) => s.listSites);
  const switchSite = useAuthStore((s) => s.switchSite);
  const activeSiteId = useAuthStore((s) => s.activeSiteId);

  const [sites, setSites] = useState<SiteConfig[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    listSites()
      .then((list) => {
        if (active) {
          setSites(list);
          setIsLoaded(true);
        }
      })
      .catch(() => {
        if (active) setIsLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [listSites]);

  const switchTo = useCallback(
    async (id: string) => {
      if (id === activeSiteId) return;
      clearLocalData(); // drop the previous site's cached data before switching
      await switchSite(id);
    },
    [activeSiteId, switchSite],
  );

  return { sites, activeSiteId, isLoaded, switchTo };
}
