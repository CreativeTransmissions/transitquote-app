/**
 * Logout. Best-effort server revocation, then clears the session token and wipes local data
 * regardless of network result (spec: logout clears token + local DB).
 */
import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { logout } from '../services/api/auth';
import { clearLocalData } from '../database/queries';
import { useAuthStore } from '../stores/authStore';

export function useLogout(): UseMutationResult<void, Error, void> {
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      // Capture the token before clearSession wipes it — the server needs it to revoke (see auth.logout).
      const token = useAuthStore.getState().accessToken;
      try {
        if (token) await logout(token);
      } catch {
        // Best-effort — clear locally even if the server call fails (e.g. offline).
      }
      await useAuthStore.getState().clearSession();
      clearLocalData();
    },
  });
}
