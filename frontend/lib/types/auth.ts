export interface AuthToken {
  access_token: string;
  token_type: string;
}

export interface UserRecord {
  id: number;
  email: string;
  preferred_language: string;
  preferred_theme: string;
  is_admin: boolean;
}

export interface RegisterPayload {
  email: string;
  password: string;
  preferred_language?: string;
  preferred_theme?: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

