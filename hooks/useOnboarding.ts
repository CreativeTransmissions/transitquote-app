/** Saves a site config (URL + OAuth client credentials) to secure storage and makes it active. */
import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { normaliseSiteUrl } from '../utils/url';
import type { SiteConfig } from '../types/app';

export interface OnboardingVars {
  siteUrl: string;
  clientId: string;
  clientSecret: string;
}

export function useOnboarding(): UseMutationResult<SiteConfig, Error, OnboardingVars> {
  return useMutation<SiteConfig, Error, OnboardingVars>({
    mutationFn: async ({ siteUrl, clientId, clientSecret }) => {
      const url = normaliseSiteUrl(siteUrl);
      if (!url) throw new Error('Enter your site URL.');
      if (!clientId.trim() || !clientSecret.trim()) {
        throw new Error('Enter your client ID and secret.');
      }
      return useAuthStore.getState().saveSiteConfig({
        siteUrl: url,
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
      });
    },
  });
}
