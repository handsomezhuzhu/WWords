"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import {
  BookOpenText,
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
  WordRecord,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const emptyWordDraft: WordDraft = {
  english: "",
  chinese: "",
  part_of_speech: "",
  definition: "",
  examples: "",
  phonetics: "",
  parts_of_speech: "",
};

export function DashboardShell() {
  const router = useRouter();
  const [user, setUser] = useState<UserRecord | null>(null);
  const [words, setWords] = useState<WordRecord[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const [currentUser, currentWords] = await Promise.all([
        getCurrentUser(),
        listWords(),
      ]);
      setUser(currentUser);
      setWords(currentWords);
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
      const created = await createWord(wordDraft);
      setWords((current) => [created, ...current]);
      setWordDraft(emptyWordDraft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSavingWord(false);
    }
  }

  async function handleDeleteWord(wordId: number) {
    try {
      await deleteWord(wordId);
      setWords((current) => current.filter((item) => item.id !== wordId));
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
        await loadDashboard();
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

  const currentReview = reviewQueue[reviewIndex];
  const reviewFinished = reviewQueue.length > 0 && !currentReview;
  const dueWordsCount = words.filter((item) => new Date(item.next_review_at) <= new Date()).length;
  const activeWordsCount = words.filter((item) => item.success_streak >= 1).length;
  const stableWordsCount = words.filter((item) => item.interval_index >= 3).length;

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-8">
        <Card className="w-full max-w-lg bg-white/88">
          <CardHeader>
            <CardTitle>加载中</CardTitle>
            <CardDescription>正在读取你的词库和工作台数据。</CardDescription>
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
            <div className="space-y-1">
              <CardTitle className="text-3xl">工作台</CardTitle>
              <CardDescription>{user ? user.email : "词库和复习"}</CardDescription>
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

      <div className="grid gap-3 sm:grid-cols-3">
        <Button asChild className="h-12 justify-start px-4 text-base">
          <a href="#capture">加入词库</a>
        </Button>
        <Button asChild className="h-12 justify-start px-4 text-base" variant="secondary">
          <a href="#review">开始背单词</a>
        </Button>
        <Button asChild className="h-12 justify-start px-4 text-base" variant="outline">
          <a href="#library">查看词库</a>
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <Card id="capture" className="bg-white">
          <CardHeader>
            <SectionTitle description="优先录入并保存词条。" title="加入词库" />
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

        <Card id="review" className="bg-white">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <SectionTitle description="直接开始当前复习。" title="背单词" />
              <Badge variant="secondary">待复习 {dueWordsCount}</Badge>
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
                  <p>当前待复习词条：{dueWordsCount}</p>
                  <p>{dueWordsCount > 0 ? "可以直接开始本轮复习。" : "当前没有到期词条。"}</p>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "词条总数", value: words.length, hint: "当前个人词库" },
          {
            label: "待复习",
            value: dueWordsCount,
            hint: "到期即可复习",
          },
          {
            label: "掌握中",
            value: activeWordsCount,
            hint: "至少答对过一次",
          },
          {
            label: "高频稳固",
            value: stableWordsCount,
            hint: "间隔已拉开",
          },
        ].map((metric) => (
          <Card key={metric.label} className="bg-muted/20 shadow-none">
            <CardHeader className="space-y-1 pb-3">
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle className="text-2xl">{metric.value}</CardTitle>
              <CardDescription>{metric.hint}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card id="library" className="bg-white">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>词库</CardTitle>
            <CardDescription>查看、整理和删除现有词条。</CardDescription>
          </div>
          <Badge variant="outline">共 {words.length} 条</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {words.length === 0 ? (
            <Card className="border-border/70 bg-muted/20 shadow-none">
              <CardContent className="p-5 text-sm text-muted-foreground">
                当前词库为空，先去录入一些单词。
              </CardContent>
            </Card>
          ) : (
            words.map((item) => (
              <Card key={item.id} className="border-border/70 bg-white shadow-none">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-primary/12 p-2 text-primary">
                        <BookOpenText className="size-4" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-foreground">
                          {item.english || item.chinese || "未命名词条"}
                        </p>
                        <p className="text-sm text-muted-foreground">
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
        </CardContent>
      </Card>
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
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
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
