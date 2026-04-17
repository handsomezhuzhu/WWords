const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "/api";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestBody = BodyInit | object | null | undefined;

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: RequestBody;
}

function resolveHeaders(body: RequestBody, headers?: HeadersInit) {
  const nextHeaders = new Headers(headers);

  if (
    body &&
    typeof body === "object" &&
    !(body instanceof FormData) &&
    !(body instanceof URLSearchParams) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer)
  ) {
    nextHeaders.set("Content-Type", "application/json");
  }

  return nextHeaders;
}

function resolveBody(body: RequestBody) {
  if (
    body &&
    typeof body === "object" &&
    !(body instanceof FormData) &&
    !(body instanceof URLSearchParams) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer)
  ) {
    return JSON.stringify(body);
  }

  return body;
}

export async function apiFetch<T>(
  path: string,
  { body, headers, ...init }: ApiRequestOptions = {},
) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    body: resolveBody(body),
    cache: "no-store",
    credentials: "include",
    headers: resolveHeaders(body, headers),
  });

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const detail =
      typeof data === "object" && data && "detail" in data
        ? String(data.detail)
        : response.statusText;

    throw new ApiError(detail || "Request failed", response.status);
  }

  return data as T;
}

export function apiForm<T, TBody extends object = Record<string, unknown>>(
  path: string,
  body: TBody,
  init: Omit<ApiRequestOptions, "body"> = {},
) {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined && value !== null) {
      form.set(key, String(value));
    }
  }

  return apiFetch<T>(path, {
    ...init,
    body: form,
    method: init.method ?? "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...init.headers,
    },
  });
}

export { API_BASE_URL };
