import { apiFetch } from "@/lib/api/client";
import type {
  AdminUserCreatePayload,
  AdminUserListResponse,
  AdminUserUpdatePayload,
  SystemConfigPayload,
  SystemConfigRecord,
  UserRecord,
} from "@/lib/types";

export function listAdminUsers(query = "", page = 1, pageSize = 20) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });

  if (query.trim()) {
    params.set("q", query.trim());
  }

  return apiFetch<AdminUserListResponse>(`/admin/users?${params.toString()}`);
}

export function createAdminUser(payload: AdminUserCreatePayload) {
  return apiFetch<UserRecord>("/admin/users", {
    body: payload,
    method: "POST",
  });
}

export function updateAdminUser(userId: number, payload: AdminUserUpdatePayload) {
  return apiFetch<UserRecord>(`/admin/users/${userId}`, {
    body: payload,
    method: "PUT",
  });
}

export function deleteAdminUser(userId: number) {
  return apiFetch<UserRecord>(`/admin/users/${userId}`, {
    method: "DELETE",
  });
}

export function getAdminConfig() {
  return apiFetch<SystemConfigRecord>("/admin/ai-config");
}

export function updateAdminConfig(payload: SystemConfigPayload) {
  return apiFetch<SystemConfigRecord>("/admin/ai-config", {
    body: payload,
    method: "PUT",
  });
}
