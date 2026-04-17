"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, type FormEvent, type ReactNode, useEffect, useState } from "react";
import {
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";

import {
  ApiError,
  completeWord,
  createWord,
  deleteWord,
  getCurrentUser,
  listWords,
  startReview,
  submitReviewResult,
} from "@/lib/api";
import type {
  AICompletionResponse,
  ReviewItem,
  ReviewMode,
  UserRecord,
  WordDraft,
  WordListResponse,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type DashboardTab = "capture" | "review" | "library";

const DASHBOARD_TABS: DashboardTab[] = ["capture", "review", "library"];
const DEFAULT_LIBRARY_PAGE_SIZE = 12;
const LIBRARY_PAGE_SIZE_OPTIONS = [12, 24, 50] as const;
const numberFormatter = new Intl.NumberFormat("zh-CN");

const emptyWordDraft: WordDraft = {
  english: "",
  chinese: "",
  part_of_speech: "",
  definition: "",
  examples: "",
  phonetics: "",
  parts_of_speech: "",
};

const emptyWordListResponse: WordListResponse = {
  items: [],
  total: 0,
  page: 1,
  page_size: DEFAULT_LIBRARY_PAGE_SIZE,
  due_total: 0,
  active_total: 0,
  stable_total: 0,
};

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseDashboardTab(value: string | null): DashboardTab {
  return DASHBOARD_TABS.includes(value as DashboardTab) ? (value as DashboardTab) : "capture";
}

export function DashboardShell() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab = parseDashboardTab(searchParams.get("tab"));
  const page = parsePositiveInt(searchParams.get("page"), 1);
  const pageSize = parsePositiveInt(searchParams.get("page_size"), DEFAULT_LIBRARY_PAGE_SIZE);

  const [user, setUser] = useState<UserRecord | null>(null);
  const [wordsResponse, setWordsResponse] = useState<WordListResponse>(emptyWordListResponse);
  const [loading, setLoading] = useState(true);
  const [wordsLoading, setWordsLoading] = useState(false);
  const [error, setError] = useState("");
  const [wordDraft, setWordDraft] = useState<WordDraft>(emptyWordDraft);
  const [savingWord, setSavingWord] = useState(false);
  const [completingWord, setCompletingWord] = useState(false);
  const [completion, setCompletion] = useState<AICompletionResponse | null>(null);
  const [reviewMode, setReviewMode] = useState<ReviewMode>("en_to_zh");
  const [reviewCount, setReviewCount] = useState(5);
  const [reviewQueue, setReviewQueue] = useState<ReviewItem[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [answerVisible, setAnswerVisible] = useState(false);

  const totalPages = Math.max(1, Math.ceil((wordsResponse.total || 0) / pageSize));
  const currentReview = reviewQueue[reviewIndex];
  const reviewFinished = reviewQueue.length > 0 && !currentReview;

  useEffect(() => {
    void bootstrapDashboard();
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    void loadWordsPage(page, pageSize);
  }, [user?.id, page, pageSize]);

  async function bootstrapDashboard() {
    setLoading(true);
    setError("");

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }

      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function loadWordsPage(nextPage: number, nextPageSize: number) {
    setWordsLoading(true);
    setError("");

    try {
      const response = await listWords(nextPage, nextPageSize);
      setWordsResponse(response);

      const maxPage = Math.max(1, Math.ceil((response.total || 0) / nextPageSize));
      if (nextPage > maxPage) {
        syncDashboardState({ page: maxPage });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "词库加载失败");
    } finally {
      setWordsLoading(false);
    }
  }

  function syncDashboardState(updates: {
    tab?: DashboardTab | null;
    page?: number | null;
    pageSize?: number | null;
  }) {
    const params = new URLSearchParams(searchParams.toString());

    if (updates.tab !== undefined) {
      const nextTab = updates.tab ?? "capture";
      if (nextTab !== "capture") {
        params.set("tab", nextTab);
      } else {
        params.delete("tab");
      }
    }

    if (updates.page !== undefined) {
      const nextPage = updates.page ?? 1;
      if (nextPage > 1) {
        params.set("page", String(nextPage));
      } else {
        params.delete("page");
      }
    }

    if (updates.pageSize !== undefined) {
      const nextPageSize = updates.pageSize ?? DEFAULT_LIBRARY_PAGE_SIZE;
      if (nextPageSize !== DEFAULT_LIBRARY_PAGE_SIZE) {
        params.set("page_size", String(nextPageSize));
      } else {
        params.delete("page_size");
      }
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    startTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  }

  function updateDraft<K extends keyof WordDraft>(key: K, value: WordDraft[K]) {
    setWordDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleCompleteWord() {
    const english = wordDraft.english?.trim();
    const chinese = wordDraft.chinese?.trim();
    const word = english || chinese;

    if (!word) {
      setError("请先输入英文或中文");
      return;
    }

    setCompletingWord(true);
    setError("");

    try {
      const result = await completeWord({
        word,
        direction: english ? "en_to_zh" : "zh_to_en",
      });

      setCompletion(result);
      setWordDraft((current) => ({
        ...current,
        english: result.word ?? current.english,
        chinese:
          result.partsOfSpeech.length > 0
            ? result.partsOfSpeech.map((item) => item.meaningZh).filter(Boolean).join("; ")
            : current.chinese,
        part_of_speech:
          result.partsOfSpeech.length > 0
            ? result.partsOfSpeech.map((item) => item.pos).join(", ")
            : current.part_of_speech,
        definition:
          result.partsOfSpeech.length > 0
            ? result.partsOfSpeech
                .map((item) => `${item.pos}: ${item.meaningEn ?? ""}`.trim())
                .join("\n")
            : current.definition,
        examples:
          result.examples.length > 0
            ? result.examples
                .map((item) => `${item.sentenceEn}\n${item.sentenceZh}`)
                .join("\n\n")
            : current.examples,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 补全失败");
    } finally {
      setCompletingWord(false);
    }
  }

  async function handleCreateWord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingWord(true);
    setError("");

    try {
      await createWord(wordDraft);
      setWordDraft(emptyWordDraft);
      await loadWordsPage(page, pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSavingWord(false);
    }
  }

  async function handleDeleteWord(wordId: number) {
    setError("");

    try {
      await deleteWord(wordId);

      if (wordsResponse.items.length === 1 && page > 1) {
        syncDashboardState({ page: page - 1 });
      } else {
        await loadWordsPage(page, pageSize);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  }

  async function handleStartReview() {
    setError("");

    try {
      const queue = await startReview({
        count: reviewCount,
        mode: reviewMode,
      });
      setReviewQueue(queue);
      setReviewIndex(0);
      setAnswerVisible(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "启动复习失败");
    }
  }

  async function handleSubmitReview(grade: 0 | 1 | 2) {
    const currentItem = reviewQueue[reviewIndex];
    if (!currentItem) {
      return;
    }

    try {
      await submitReviewResult(currentItem.id, { grade });
      const nextIndex = reviewIndex + 1;
      setReviewIndex(nextIndex);
      setAnswerVisible(false);

      if (nextIndex >= reviewQueue.length) {
        await loadWordsPage(page, pageSize);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交复习结果失败");
    }
  }

  function logout() {
    document.cookie = "access_token=; Max-Age=0; path=/";
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-8">
        <Card className="w-full max-w-lg bg-white/88">
          <CardHeader>
            <CardTitle>工作台加载中…</CardTitle>
            <CardDescription>正在读取词库和复习数据。</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <Card className="bg-white">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 min-w-0">
              <CardTitle className="text-3xl">工作台</CardTitle>
              <CardDescription className="truncate" translate="no">
                {user ? user.email : "词库和复习"}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {user?.is_admin ? (
                <Button asChild variant="outline">
                  <Link href="/admin">
                    <ShieldCheck />
                    后台管理
                  </Link>
                </Button>
              ) : null}
              <Button onClick={logout} variant="ghost">
                <LogOut />
                退出登录
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {error ? (
        <Card className="border-destructive/20 bg-destructive/10 shadow-none">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <Tabs
        onValueChange={(value) => syncDashboardState({ tab: value as DashboardTab })}
        value={tab}
      >
        <TabsList className="grid h-auto w-full grid-cols-3 rounded-[1.5rem] bg-muted/70 p-1">
          <TabsTrigger className="min-w-0 px-3 py-3 text-sm sm:text-base" value="capture">
            加入词库
          </TabsTrigger>
          <TabsTrigger className="min-w-0 px-3 py-3 text-sm sm:text-base" value="review">
            开始背单词
          </TabsTrigger>
          <TabsTrigger className="min-w-0 px-3 py-3 text-sm sm:text-base" value="library">
            查看词库
          </TabsTrigger>
        </TabsList>

        <TabsContent value="capture">
          <Card className="bg-white">
            <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
              <SectionTitle description="录入并保存新词条。" title="加入词库" />
              <Badge variant="outline">总词条 {numberFormatter.format(wordsResponse.total)}</Badge>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleCreateWord}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="英文">
                    <Input
                      onChange={(event) => updateDraft("english", event.target.value)}
                      placeholder="meticulous"
                      value={wordDraft.english ?? ""}
                    />
                  </Field>
                  <Field label="中文">
                    <Input
                      onChange={(event) => updateDraft("chinese", event.target.value)}
                      placeholder="一丝不苟的"
                      value={wordDraft.chinese ?? ""}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="词性">
                    <Input
                      onChange={(event) => updateDraft("part_of_speech", event.target.value)}
                      placeholder="adjective"
                      value={wordDraft.part_of_speech ?? ""}
                    />
                  </Field>
                  <Field label="音标">
                    <Input
                      onChange={(event) => updateDraft("phonetics", event.target.value)}
                      placeholder="/məˈtɪkjələs/"
                      value={wordDraft.phonetics ?? ""}
                    />
                  </Field>
                </div>

                <Field label="定义">
                  <Textarea
                    onChange={(event) => updateDraft("definition", event.target.value)}
                    placeholder="showing great attention to detail"
                    value={wordDraft.definition ?? ""}
                  />
                </Field>

                <Field label="例句">
                  <Textarea
                    onChange={(event) => updateDraft("examples", event.target.value)}
                    placeholder={"She kept meticulous notes.\n她做了非常细致的笔记。"}
                    value={wordDraft.examples ?? ""}
                  />
                </Field>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    className="w-full sm:w-auto"
                    disabled={completingWord}
                    onClick={handleCompleteWord}
                    type="button"
                  >
                    <Sparkles />
                    {completingWord ? "补全中..." : "AI 补全"}
                  </Button>
                  <Button
                    className="w-full sm:w-auto"
                    disabled={savingWord}
                    type="submit"
                    variant="secondary"
                  >
                    {savingWord ? "保存中..." : "保存词条"}
                  </Button>
                </div>
              </form>

              {completion ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="mt-4 w-full sm:w-auto" variant="outline">
                      查看 AI 结构化结果
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>AI 补全结果</DialogTitle>
                      <DialogDescription>结构化返回内容。</DialogDescription>
                    </DialogHeader>
                    <pre className="max-h-[60vh] overflow-auto rounded-2xl bg-muted/70 p-4 text-xs leading-6 text-muted-foreground">
                      {JSON.stringify(completion, null, 2)}
                    </pre>
                  </DialogContent>
                </Dialog>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review">
          <Card className="bg-white">
            <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
              <SectionTitle description="开始当前复习并提交结果。" title="开始背单词" />
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">待复习 {numberFormatter.format(wordsResponse.due_total)}</Badge>
                <Badge variant="outline">掌握中 {numberFormatter.format(wordsResponse.active_total)}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="模式">
                  <select
                    className="flex h-11 w-full rounded-2xl border border-input bg-white px-4 py-2 text-sm"
                    onChange={(event) => setReviewMode(event.target.value as ReviewMode)}
                    value={reviewMode}
                  >
                    <option value="en_to_zh">英译中</option>
                    <option value="zh_to_en">中译英</option>
                  </select>
                </Field>
                <Field label="数量">
                  <Input
                    max={20}
                    min={1}
                    onChange={(event) => setReviewCount(Number(event.target.value || 5))}
                    type="number"
                    value={reviewCount}
                  />
                </Field>
              </div>

              <Button className="w-full" onClick={handleStartReview} type="button">
                开始复习
              </Button>

              {currentReview ? (
                <Card className="border-border/70 bg-muted/20 shadow-none">
                  <CardHeader className="space-y-3">
                    <Badge variant="secondary">第 {reviewIndex + 1} / {reviewQueue.length} 题</Badge>
                    <CardTitle className="text-3xl">{currentReview.question}</CardTitle>
                    <CardDescription>先回忆，再显示答案。</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {answerVisible ? (
                      <>
                        <div className="rounded-[1.25rem] border border-secondary/20 bg-secondary/10 p-4">
                          <p className="text-sm text-muted-foreground">答案</p>
                          <p className="mt-2 text-2xl font-semibold text-secondary">
                            {currentReview.answer}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button className="w-full sm:w-auto" onClick={() => handleSubmitReview(0)} variant="destructive">
                            不认识
                          </Button>
                          <Button className="w-full sm:w-auto" onClick={() => handleSubmitReview(1)} variant="outline">
                            模糊
                          </Button>
                          <Button className="w-full sm:w-auto" onClick={() => handleSubmitReview(2)}>
                            认识
                          </Button>
                        </div>
                      </>
                    ) : (
                      <Button className="w-full sm:w-auto" onClick={() => setAnswerVisible(true)}>
                        显示答案
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : reviewFinished ? (
                <Card className="border-success/20 bg-success/10 shadow-none">
                  <CardContent className="p-5 text-sm text-success">本轮复习已完成。</CardContent>
                </Card>
              ) : (
                <Card className="border-border/70 bg-muted/20 shadow-none">
                  <CardContent className="space-y-2 p-5 text-sm text-muted-foreground">
                    <p>当前待复习词条：{numberFormatter.format(wordsResponse.due_total)}</p>
                    <p>
                      {wordsResponse.due_total > 0 ? "可以直接开始本轮复习。" : "当前没有到期词条。"}
                    </p>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="library">
          <Card className="bg-white">
            <CardHeader className="gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <SectionTitle description="分页查看和删除现有词条。" title="查看词库" />
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">共 {numberFormatter.format(wordsResponse.total)} 条</Badge>
                  <Badge variant="outline">高频稳固 {numberFormatter.format(wordsResponse.stable_total)}</Badge>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[160px_1fr] sm:items-end sm:justify-between">
                <Field label="每页数量">
                  <select
                    className="flex h-11 w-full rounded-2xl border border-input bg-white px-4 py-2 text-sm"
                    onChange={(event) =>
                      syncDashboardState({
                        pageSize: Number(event.target.value),
                        page: 1,
                      })
                    }
                    value={pageSize}
                  >
                    {LIBRARY_PAGE_SIZE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option} / 页
                      </option>
                    ))}
                  </select>
                </Field>

                <p className="text-sm text-muted-foreground sm:text-right">
                  当前第 {page} / {totalPages} 页
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {wordsLoading ? (
                <Card className="border-border/70 bg-muted/20 shadow-none">
                  <CardContent className="p-5 text-sm text-muted-foreground">
                    正在加载词库…
                  </CardContent>
                </Card>
              ) : wordsResponse.items.length === 0 ? (
                <Card className="border-border/70 bg-muted/20 shadow-none">
                  <CardContent className="p-5 text-sm text-muted-foreground">
                    当前词库为空，先去录入一些单词。
                  </CardContent>
                </Card>
              ) : (
                wordsResponse.items.map((item) => (
                  <Card key={item.id} className="border-border/70 bg-white shadow-none">
                    <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="rounded-full bg-primary/12 p-2 text-primary">
                            <BookOpenText className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-lg font-semibold text-foreground">
                              {item.english || item.chinese || "未命名词条"}
                            </p>
                            <p className="truncate text-sm text-muted-foreground">
                              {item.chinese || item.definition || "暂无释义"}
                            </p>
                          </div>
                        </div>
                        {item.part_of_speech ? <Badge variant="outline">{item.part_of_speech}</Badge> : null}
                        <p className="text-sm leading-6 text-muted-foreground">
                          下次复习：{new Date(item.next_review_at).toLocaleString()}
                        </p>
                      </div>
                      <Button className="w-full sm:w-auto" onClick={() => handleDeleteWord(item.id)} variant="destructive">
                        <Trash2 />
                        删除
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}

              <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  显示 {(page - 1) * pageSize + (wordsResponse.items.length > 0 ? 1 : 0)} -{" "}
                  {(page - 1) * pageSize + wordsResponse.items.length} / {numberFormatter.format(wordsResponse.total)}
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    disabled={page <= 1 || wordsLoading}
                    onClick={() => syncDashboardState({ page: page - 1 })}
                    type="button"
                    variant="outline"
                  >
                    <ChevronLeft />
                    上一页
                  </Button>
                  <Button
                    disabled={page >= totalPages || wordsLoading}
                    onClick={() => syncDashboardState({ page: page + 1 })}
                    type="button"
                    variant="outline"
                  >
                    下一页
                    <ChevronRight />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function Field({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </div>
  );
}
