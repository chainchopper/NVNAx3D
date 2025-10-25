/**
 * User Profile Manager Service
 * Handles CRUD operations for user profile data
 */

import { UserProfile, DEFAULT_USER_PROFILE } from '../types/user-profile';

const USER_PROFILE_KEY = 'user-profile';

class UserProfileManager extends EventTarget {
  private profile: UserProfile | null = null;

  constructor() {
    super();
    this.loadProfile();
  }

  loadProfile(): UserProfile {
    const saved = localStorage.getItem(USER_PROFILE_KEY);
    if (saved) {
      try {
        this.profile = JSON.parse(saved);
      } catch (error) {
        console.error('Failed to parse user profile:', error);
        this.profile = { ...DEFAULT_USER_PROFILE };
      }
    } else {
      this.profile = { ...DEFAULT_USER_PROFILE };
    }
    return this.profile;
  }

  getProfile(): UserProfile {
    if (!this.profile) {
      return this.loadProfile();
    }
    return this.profile;
  }

  updateProfile(updates: Partial<UserProfile>): UserProfile {
    this.profile = {
      ...this.getProfile(),
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(this.profile));
    
    this.dispatchEvent(new CustomEvent('profile-updated', {
      detail: this.profile,
    }));
    
    return this.profile;
  }

  clearProfile(): void {
    this.profile = { ...DEFAULT_USER_PROFILE };
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(this.profile));
    
    this.dispatchEvent(new CustomEvent('profile-updated', {
      detail: this.profile,
    }));
  }

  getSystemPromptContext(): string {
    const profile = this.getProfile();
    const parts: string[] = [];

    if (profile.name && profile.name !== 'User') {
      parts.push(`You are speaking with ${profile.name}`);
      
      if (profile.pronouns) {
        parts.push(`whose pronouns are ${profile.pronouns}`);
      }
      
      parts.push('.');
    }

    if (profile.customContext) {
      parts.push(`\nUser context: ${profile.customContext}`);
    }

    if (profile.timezone) {
      parts.push(`\nUser's timezone: ${profile.timezone}`);
    }

    return parts.length > 0 ? parts.join(' ') : '';
  }
}

export const userProfileManager = new UserProfileManager();
