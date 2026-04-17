import type { UserRecord } from "@/lib/types/auth";

export interface AdminUserListResponse {
  items: UserRecord[];
  total: number;
  page: number;
  page_size: number;
  query?: string | null;
}

export interface AdminUserCreatePayload {
  email: string;
  password: string;
  preferred_language?: string;
  preferred_theme?: string;
  is_admin?: boolean;
}

export interface AdminUserUpdatePayload {
  email?: string;
  preferred_language?: string;
  preferred_theme?: string;
  is_admin?: boolean;
  password?: string;
}
