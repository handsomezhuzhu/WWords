import { apiFetch, apiForm } from "@/lib/api/client";
import type {
  AuthToken,
  LoginPayload,
  RegisterPayload,
  UserRecord,
} from "@/lib/types";

export function register(payload: RegisterPayload) {
  return apiFetch<UserRecord>("/auth/register", {
    body: payload,
    method: "POST",
  });
}

export function login(payload: LoginPayload) {
  return apiForm<AuthToken, LoginPayload>("/auth/token", payload);
}

export function getCurrentUser() {
  return apiFetch<UserRecord>("/users/me");
}
