/**
 * Tracks online/offline via expo-network and mirrors it into the connectivity store.
 * Mount once in the authenticated layout; components read `isOnline` from the store/this hook.
 */
import { useEffect } from 'react';
import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network';
import { useConnectivityStore } from '../stores/connectivityStore';

export function useConnectivity(): boolean {
  const isOnline = useConnectivityStore((s) => s.isOnline);
  const setOnline = useConnectivityStore((s) => s.setOnline);

  useEffect(() => {
    let active = true;
    getNetworkStateAsync()
      .then((state) => {
        if (active) setOnline(Boolean(state.isConnected));
      })
      .catch(() => {
        /* leave default; listener will correct it */
      });

    const subscription = addNetworkStateListener((state) => {
      setOnline(Boolean(state.isConnected));
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [setOnline]);

  return isOnline;
}
