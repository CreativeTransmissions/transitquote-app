/**
 * Login + bootstrap. Runs the two-step auth, persists the token, then pulls /configuration and
 * seeds the local DB so the app is immediately usable offline. Resolves to the user's role so
 * the screen can route to the right home. Loading/error state via TanStack Query.
 */
import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { login } from '../services/api/auth';
import { getConfiguration } from '../services/api/configuration';
import { mapConfiguration } from '../database/mappers';
import { seedConfiguration } from '../database/queries';
import { useAuthStore } from '../stores/authStore';
import { resolveRole } from '../utils/roleGuards';
import type { RoleType } from '../types/app';

export interface LoginVars {
  username: string;
  password: string;
}

export function useLogin(): UseMutationResult<RoleType, Error, LoginVars> {
  return useMutation<RoleType, Error, LoginVars>({
    mutationFn: async ({ username, password }) => {
      const { siteUrl, clientId, clientSecret } = useAuthStore.getState();
      if (!siteUrl || !clientId || !clientSecret) {
        throw new Error('No site configured. Complete onboarding first.');
      }

      const { accessToken, roles } = await login({ username, password, clientId, clientSecret });
      await useAuthStore.getState().setAccessToken(accessToken);

      // Bootstrap reference data into the local DB (offline-first).
      const config = await getConfiguration();
      seedConfiguration(mapConfiguration(config));

      return resolveRole(roles);
    },
  });
}
