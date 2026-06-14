/** The authenticated user shape attached to requests and returned by /me. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  isActive: boolean;
  emailVerified: boolean;
  role: string; // role name
  permissions: string[]; // permission names
}

/** Per-request context passed into auth services. IP is stored hashed. */
export interface RequestContext {
  ipHash?: string;
  userAgent?: string;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string; // plaintext — set as cookie, never stored
  sessionId: string;
}

export interface AuthResult {
  user: AuthUser;
  tokens: IssuedTokens;
}
