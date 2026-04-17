import { apiFetch } from "@/lib/api/client";
import type {
  AICompletionRequest,
  AICompletionResponse,
  WordDraft,
  WordListResponse,
  WordRecord,
} from "@/lib/types";

export function listWords(page = 1, pageSize = 12) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });

  return apiFetch<WordListResponse>(`/words/?${params.toString()}`);
}

export function createWord(payload: WordDraft) {
  return apiFetch<WordRecord>("/words/", {
    body: payload,
    method: "POST",
  });
}

export function updateWord(wordId: number, payload: WordDraft) {
  return apiFetch<WordRecord>(`/words/${wordId}`, {
    body: payload,
    method: "PUT",
  });
}

export function deleteWord(wordId: number) {
  return apiFetch<{ detail: string }>(`/words/${wordId}`, {
    method: "DELETE",
  });
}

export function completeWord(payload: AICompletionRequest) {
  return apiFetch<AICompletionResponse>("/words/complete", {
    body: payload,
    method: "POST",
  });
}
