/**
 * Local type stubs — replaces local backend type imports.
 * All ShadowTalk backend has been removed from ShadowTalk.
 */

export interface User {
  id: string;
  email: string | null;
  is_anonymous: boolean;
  app_metadata: Record<string, any>;
  user_metadata: Record<string, any>;
  aud: string;
  created_at: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  user: User;
}

export interface UserIdentity {
  id: string;
  provider: string;
  identity_data: Record<string, unknown>;
}

export interface Provider {
  id: string;
}

export interface RealtimeChannel {
  presenceState?: <T = any>() => Record<string, T[]>;
  track?: (payload: any) => Promise<any>;
  untrack?: () => Promise<any>;
  [key: string]: any;
  on?: (...args: any[]) => RealtimeChannel;
  subscribe?: (cb?: (...args: any[]) => any) => { unsubscribe: () => void };
  unsubscribe?: () => void;
  send?: (type: string, payload?: any) => { ok: boolean };
  state?: string;
}

export interface RealtimeChannelOptions {
  config?: { broadcast?: { self?: boolean }; presence?: { key?: string } };
}
