import { apiFetch } from "@/lib/api/client";
import type { ReviewAnswer, ReviewItem, ReviewRequest } from "@/lib/types";

export function startReview(payload: ReviewRequest) {
  return apiFetch<ReviewItem[]>("/review/start", {
    body: payload,
    method: "POST",
  });
}

export function submitReviewResult(wordId: number, payload: ReviewAnswer) {
  return apiFetch<{ detail: string }>(`/review/${wordId}/result`, {
    body: payload,
    method: "POST",
  });
}

