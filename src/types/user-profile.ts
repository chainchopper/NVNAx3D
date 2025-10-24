/**
 * User Profile types and interfaces
 */

export interface UserProfile {
  name: string;
  pronouns?: string;
  timezone?: string;
  customContext?: string;
  preferences?: {
    preferredPersoni?: string;
    theme?: 'dark' | 'light';
  };
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'User',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
