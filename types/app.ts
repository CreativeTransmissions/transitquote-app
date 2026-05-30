export type RoleType = 'driver' | 'dispatch' | 'administrator';
export type AssignmentMode = 'Centralized' | 'Decentralized';

export interface SiteConfig {
  id: string;
  siteUrl: string;
  clientId: string;
  clientSecret: string;
  lastUsed: string;
}
