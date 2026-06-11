/**
 * Forgot-password mutation (issue #14). Submits the username with the active site's stored
 * client credentials; resolves to the server's user-facing confirmation message. No token
 * handling — the reset completes in the browser via the emailed link.
 */
import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { resetPassword } from '../services/api/auth';
import { useAuthStore } from '../stores/authStore';

export interface ResetPasswordVars {
  username: string;
}

export function useResetPassword(): UseMutationResult<string, Error, ResetPasswordVars> {
  return useMutation<string, Error, ResetPasswordVars>({
    mutationFn: async ({ username }) => {
      const { clientId, clientSecret } = useAuthStore.getState();
      if (!clientId || !clientSecret) {
        throw new Error('No site configured. Complete onboarding first.');
      }
      return resetPassword({ username: username.trim(), clientId, clientSecret });
    },
  });
}
