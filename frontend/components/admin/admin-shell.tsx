"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, type FormEvent, type ReactNode, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, PencilLine, Save, Search, ShieldCheck, Trash2, UserPlus } from "lucide-react";

import {
  ApiError,
  createAdminUser,
  deleteAdminUser,
  getAdminConfig,
  getCurrentUser,
  listAdminUsers,
  updateAdminConfig,
  updateAdminUser,
} from "@/lib/api";
import type {
  AdminUserCreatePayload,
  AdminUserListResponse,
  AdminUserUpdatePayload,
  SystemConfigPayload,
  SystemConfigRecord,
  UserRecord,
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type EditableUserDraft = AdminUserUpdatePayload & { password: string };

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
const numberFormatter = new Intl.NumberFormat("zh-CN");

const emptyCreateUser: AdminUserCreatePayload = {
  email: "",
  password: "",
  preferred_language: "zh",
  preferred_theme: "light",
  is_admin: false,
};

const emptyConfig: SystemConfigPayload = {
  provider: "openai",
  api_key: "",
  api_url: "",
  model: "gpt-4o-mini",
  temperature: 0,
};

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildEditorDraft(user: UserRecord): EditableUserDraft {
  return {
    email: user.email,
    preferred_language: user.preferred_language,
    preferred_theme: user.preferred_theme,
    is_admin: user.is_admin,
    password: "",
  };
}

export function AdminShell() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = searchParams.get("q")?.trim() ?? "";
  const page = parsePositiveInt(searchParams.get("page"), 1);
  const pageSize = parsePositiveInt(searchParams.get("page_size"), DEFAULT_PAGE_SIZE);

  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null);
  const [searchDraft, setSearchDraft] = useState(query);
  const [usersResponse, setUsersResponse] = useState<AdminUserListResponse>({
    items: [],
    total: 0,
    page,
    page_size: pageSize,
    query,
  });
  const [createUserForm, setCreateUserForm] = useState<AdminUserCreatePayload>(emptyCreateUser);
  const [config, setConfig] = useState<SystemConfigRecord | null>(null);
  const [configForm, setConfigForm] = useState<SystemConfigPayload>(emptyConfig);
  const [editorUser, setEditorUser] = useState<UserRecord | null>(null);
  const [editorDraft, setEditorDraft] = useState<EditableUserDraft | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<UserRecord | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [createUserSubmitting, setCreateUserSubmitting] = useState(false);
  const [saveUserSubmitting, setSaveUserSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [saveConfigSubmitting, setSaveConfigSubmitting] = useState(false);

  const totalPages = Math.max(1, Math.ceil((usersResponse.total || 0) / pageSize));
  const rangeStart = usersResponse.total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = usersResponse.total === 0 ? 0 : Math.min(page * pageSize, usersResponse.total);

  useEffect(() => {
    setSearchDraft(query);
  }, [query]);

  useEffect(() => {
    void bootstrapAdmin();
  }, []);

  useEffect(() => {
    if (!currentUser?.is_admin) {
      return;
    }

    void loadUsersPage(query, page, pageSize);
  }, [currentUser?.id, currentUser?.is_admin, query, page, pageSize]);

  async function bootstrapAdmin() {
    setLoading(true);
    setError("");

    try {
      const user = await getCurrentUser();
      if (!user.is_admin) {
        router.replace("/dashboard");
        return;
      }

      setCurrentUser(user);

      const configResponse = await getAdminConfig().catch(() => null);
      setConfig(configResponse);
      if (configResponse) {
        setConfigForm({
          provider: configResponse.provider,
          api_key: "",
          api_url: configResponse.api_url ?? "",
          model: configResponse.model,
          temperature: configResponse.temperature,
        });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }

      setError(err instanceof Error ? err.message : "加载后台失败");
    } finally {
      setLoading(false);
    }
  }

  async function loadUsersPage(nextQuery: string, nextPage: number, nextPageSize: number) {
    setUsersLoading(true);
    setError("");

    try {
      const response = await listAdminUsers(nextQuery, nextPage, nextPageSize);
      setUsersResponse(response);

      const maxPage = Math.max(1, Math.ceil((response.total || 0) / nextPageSize));
      if (nextPage > maxPage) {
        syncListState({ page: maxPage });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载用户失败");
    } finally {
      setUsersLoading(false);
    }
  }

  function syncListState(updates: {
    q?: string | null;
    page?: number | null;
    pageSize?: number | null;
  }) {
    const params = new URLSearchParams(searchParams.toString());

    if (updates.q !== undefined) {
      const nextQuery = updates.q?.trim();
      if (nextQuery) {
        params.set("q", nextQuery);
      } else {
        params.delete("q");
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
      const nextPageSize = updates.pageSize ?? DEFAULT_PAGE_SIZE;
      if (nextPageSize !== DEFAULT_PAGE_SIZE) {
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

  function openUserEditor(user: UserRecord) {
    setEditorUser(user);
    setEditorDraft(buildEditorDraft(user));
  }

  function closeUserEditor() {
    setEditorUser(null);
    setEditorDraft(null);
    setDeleteCandidate(null);
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateUserSubmitting(true);
    setError("");

    try {
      await createAdminUser(createUserForm);
      setCreateUserForm(emptyCreateUser);
      setCreateDialogOpen(false);
      await loadUsersPage(query, page, pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建用户失败");
    } finally {
      setCreateUserSubmitting(false);
    }
  }

  async function handleSaveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editorUser || !editorDraft) {
      return;
    }

    setSaveUserSubmitting(true);
    setError("");

    try {
      const payload: AdminUserUpdatePayload = {
        email: editorDraft.email,
        preferred_language: editorDraft.preferred_language,
        preferred_theme: editorDraft.preferred_theme,
        is_admin: editorDraft.is_admin,
        password: editorDraft.password || undefined,
      };

      await updateAdminUser(editorUser.id, payload);
      closeUserEditor();
      await loadUsersPage(query, page, pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新用户失败");
    } finally {
      setSaveUserSubmitting(false);
    }
  }

  async function handleDeleteUser() {
    if (!deleteCandidate) {
      return;
    }

    setDeleteSubmitting(true);
    setError("");

    try {
      await deleteAdminUser(deleteCandidate.id);
      setDeleteCandidate(null);
      closeUserEditor();

      if (usersResponse.items.length === 1 && page > 1) {
        syncListState({ page: page - 1 });
      } else {
        await loadUsersPage(query, page, pageSize);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除用户失败");
    } finally {
      setDeleteSubmitting(false);
    }
  }

  async function handleSaveConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveConfigSubmitting(true);
    setError("");

    try {
      const updated = await updateAdminConfig(configForm);
      setConfig(updated);
      setConfigForm((current) => ({ ...current, api_key: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存配置失败");
    } finally {
      setSaveConfigSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-8">
        <Card className="w-full max-w-lg bg-white/88">
          <CardHeader>
            <CardTitle>后台加载中…</CardTitle>
            <CardDescription>正在读取管理员数据和系统配置。</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
      <Card className="bg-white">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 min-w-0">
              <CardTitle className="text-3xl text-balance">后台管理</CardTitle>
              <CardDescription className="truncate" translate="no">
                {currentUser ? currentUser.email : "管理用户与 AI 配置"}
              </CardDescription>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard">返回工作台</Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {error ? (
        <Card aria-live="polite" className="border-destructive/20 bg-destructive/10 shadow-none">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card className="bg-white">
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <CardTitle>用户管理</CardTitle>
                <CardDescription>
                  共 {numberFormatter.format(usersResponse.total)} 个用户。
                </CardDescription>
              </div>

              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus />
                    创建用户
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[calc(100vh-2rem)] max-w-lg overflow-y-auto overscroll-contain">
                  <DialogHeader>
                    <DialogTitle>创建用户</DialogTitle>
                    <DialogDescription>创建普通用户或管理员账号。</DialogDescription>
                  </DialogHeader>

                  <form className="space-y-4" onSubmit={handleCreateUser}>
                    <Field label="邮箱">
                      <Input
                        autoComplete="email"
                        name="email"
                        onChange={(event) =>
                          setCreateUserForm((current) => ({ ...current, email: event.target.value }))
                        }
                        placeholder="user@example.com…"
                        required
                        spellCheck={false}
                        type="email"
                        value={createUserForm.email}
                      />
                    </Field>

                    <Field label="初始密码">
                      <Input
                        autoComplete="new-password"
                        name="password"
                        onChange={(event) =>
                          setCreateUserForm((current) => ({ ...current, password: event.target.value }))
                        }
                        placeholder="StrongPassword123!…"
                        required
                        type="text"
                        value={createUserForm.password}
                      />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="语言">
                        <select
                          className="flex h-11 w-full rounded-2xl border border-input bg-white px-4 py-2 text-sm"
                          name="preferred_language"
                          onChange={(event) =>
                            setCreateUserForm((current) => ({
                              ...current,
                              preferred_language: event.target.value,
                            }))
                          }
                          value={createUserForm.preferred_language}
                        >
                          <option value="zh">中文</option>
                          <option value="en">English</option>
                        </select>
                      </Field>

                      <Field label="主题">
                        <select
                          className="flex h-11 w-full rounded-2xl border border-input bg-white px-4 py-2 text-sm"
                          name="preferred_theme"
                          onChange={(event) =>
                            setCreateUserForm((current) => ({
                              ...current,
                              preferred_theme: event.target.value,
                            }))
                          }
                          value={createUserForm.preferred_theme}
                        >
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                        </select>
                      </Field>
                    </div>

                    <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <input
                        checked={Boolean(createUserForm.is_admin)}
                        name="is_admin"
                        onChange={(event) =>
                          setCreateUserForm((current) => ({
                            ...current,
                            is_admin: event.target.checked,
                          }))
                        }
                        type="checkbox"
                      />
                      创建为管理员
                    </label>

                    <DialogFooter>
                      <Button disabled={createUserSubmitting} type="submit">
                        <UserPlus />
                        {createUserSubmitting ? "创建中…" : "创建用户"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <form
              className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_120px]"
              onSubmit={(event) => {
                event.preventDefault();
                syncListState({ q: searchDraft, page: 1 });
              }}
            >
              <Field label="搜索">
                <Input
                  autoComplete="off"
                  name="query"
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="按邮箱搜索…"
                  spellCheck={false}
                  value={searchDraft}
                />
              </Field>

              <Field label="每页数量">
                <select
                  className="flex h-11 w-full rounded-2xl border border-input bg-white px-4 py-2 text-sm"
                  name="page_size"
                  onChange={(event) => {
                    syncListState({
                      pageSize: Number(event.target.value),
                      page: 1,
                    });
                  }}
                  value={pageSize}
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option} / 页
                    </option>
                  ))}
                </select>
              </Field>

              <div className="flex items-end">
                <Button className="w-full" type="submit" variant="outline">
                  <Search />
                  搜索
                </Button>
              </div>
            </form>
          </CardHeader>

          <CardContent className="space-y-4">
            {usersLoading ? (
              <Card className="border-border/70 bg-muted/20 shadow-none">
                <CardContent className="p-5 text-sm text-muted-foreground">
                  正在加载用户列表…
                </CardContent>
              </Card>
            ) : usersResponse.items.length === 0 ? (
              <Card className="border-border/70 bg-muted/20 shadow-none">
                <CardContent className="p-5 text-sm text-muted-foreground">
                  没有找到匹配的用户。
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[720px] table-fixed border-separate border-spacing-y-2">
                    <thead>
                      <tr className="text-left text-sm text-muted-foreground">
                        <th className="px-4 py-2 font-medium">邮箱</th>
                        <th className="px-4 py-2 font-medium">角色</th>
                        <th className="px-4 py-2 font-medium">语言</th>
                        <th className="px-4 py-2 font-medium">主题</th>
                        <th className="px-4 py-2 text-right font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersResponse.items.map((user) => (
                        <tr key={user.id} className="rounded-[1.25rem] bg-muted/20">
                          <td className="rounded-l-[1.25rem] px-4 py-4">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground" translate="no">
                                {user.email}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">ID {user.id}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <RoleBadge isAdmin={user.is_admin} />
                          </td>
                          <td className="px-4 py-4 text-sm text-foreground">
                            {user.preferred_language === "zh" ? "中文" : "English"}
                          </td>
                          <td className="px-4 py-4 text-sm text-foreground">
                            {user.preferred_theme === "dark" ? "Dark" : "Light"}
                          </td>
                          <td className="rounded-r-[1.25rem] px-4 py-4 text-right">
                            <Button onClick={() => openUserEditor(user)} type="button" variant="outline">
                              <PencilLine />
                              编辑
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-3 md:hidden">
                  {usersResponse.items.map((user) => (
                    <Card key={user.id} className="border-border/70 bg-muted/20 shadow-none">
                      <CardContent className="space-y-4 p-4">
                        <div className="min-w-0 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground" translate="no">
                                {user.email}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">ID {user.id}</p>
                            </div>
                            <RoleBadge isAdmin={user.is_admin} />
                          </div>

                          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                            <span>语言：{user.preferred_language === "zh" ? "中文" : "English"}</span>
                            <span>主题：{user.preferred_theme === "dark" ? "Dark" : "Light"}</span>
                          </div>
                        </div>

                        <Button className="w-full" onClick={() => openUserEditor(user)} type="button" variant="outline">
                          <PencilLine />
                          编辑
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}

            <Separator />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                显示 {numberFormatter.format(rangeStart)} - {numberFormatter.format(rangeEnd)} / {numberFormatter.format(usersResponse.total)}
              </p>

              <div className="flex items-center gap-2">
                <Button
                  disabled={page <= 1 || usersLoading}
                  onClick={() => syncListState({ page: page - 1 })}
                  type="button"
                  variant="outline"
                >
                  <ChevronLeft />
                  上一页
                </Button>
                <div className="min-w-[88px] text-center text-sm text-muted-foreground">
                  第 {page} / {totalPages} 页
                </div>
                <Button
                  disabled={page >= totalPages || usersLoading}
                  onClick={() => syncListState({ page: page + 1 })}
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

        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-secondary" />
              AI 配置
            </CardTitle>
            <CardDescription>留空不会覆盖现有 API Key。</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSaveConfig}>
              <Field label="Provider">
                <select
                  className="flex h-11 w-full rounded-2xl border border-input bg-white px-4 py-2 text-sm"
                  name="provider"
                  onChange={(event) =>
                    setConfigForm((current) => ({ ...current, provider: event.target.value }))
                  }
                  value={configForm.provider}
                >
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Gemini</option>
                  <option value="deepseek">DeepSeek</option>
                </select>
              </Field>

              <Field label="API URL">
                <Input
                  autoComplete="url"
                  name="api_url"
                  onChange={(event) =>
                    setConfigForm((current) => ({ ...current, api_url: event.target.value }))
                  }
                  placeholder="https://api.openai.com/v1…"
                  spellCheck={false}
                  type="url"
                  value={configForm.api_url ?? ""}
                />
              </Field>

              <Field label="Model">
                <Input
                  autoComplete="off"
                  name="model"
                  onChange={(event) =>
                    setConfigForm((current) => ({ ...current, model: event.target.value }))
                  }
                  placeholder="gpt-4o-mini…"
                  spellCheck={false}
                  value={configForm.model ?? ""}
                />
              </Field>

              <Field label="API Key">
                <Input
                  autoComplete="off"
                  name="api_key"
                  onChange={(event) =>
                    setConfigForm((current) => ({ ...current, api_key: event.target.value }))
                  }
                  placeholder={
                    config?.api_key_configured ? config.api_key_masked || "已配置" : "sk-…"
                  }
                  spellCheck={false}
                  value={configForm.api_key ?? ""}
                />
              </Field>

              <Field label="Temperature">
                <Input
                  inputMode="numeric"
                  max={2}
                  min={0}
                  name="temperature"
                  onChange={(event) =>
                    setConfigForm((current) => ({
                      ...current,
                      temperature: Number(event.target.value || 0),
                    }))
                  }
                  type="number"
                  value={configForm.temperature ?? 0}
                />
              </Field>

              <Button disabled={saveConfigSubmitting} type="submit">
                <Save />
                {saveConfigSubmitting ? "保存中…" : "保存 AI 配置"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Sheet
        onOpenChange={(open) => {
          if (!open) {
            closeUserEditor();
          }
        }}
        open={Boolean(editorUser && editorDraft)}
      >
        <SheetContent className="w-full overflow-y-auto overscroll-contain sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>编辑用户</SheetTitle>
            <SheetDescription>
              {editorUser ? `ID ${editorUser.id}` : "更新用户资料、权限与密码。"}
            </SheetDescription>
          </SheetHeader>

          {editorUser && editorDraft ? (
            <form className="mt-6 space-y-4" onSubmit={handleSaveUser}>
              <Field label="邮箱">
                <Input
                  autoComplete="email"
                  name="email"
                  onChange={(event) =>
                    setEditorDraft((current) =>
                      current ? { ...current, email: event.target.value } : current,
                    )
                  }
                  required
                  spellCheck={false}
                  type="email"
                  value={editorDraft.email ?? ""}
                />
              </Field>

              <Field label="重置密码">
                <Input
                  autoComplete="new-password"
                  name="password"
                  onChange={(event) =>
                    setEditorDraft((current) =>
                      current ? { ...current, password: event.target.value } : current,
                    )
                  }
                  placeholder="留空表示不修改…"
                  type="text"
                  value={editorDraft.password}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="语言">
                  <select
                    className="flex h-11 w-full rounded-2xl border border-input bg-white px-4 py-2 text-sm"
                    name="preferred_language"
                    onChange={(event) =>
                      setEditorDraft((current) =>
                        current ? { ...current, preferred_language: event.target.value } : current,
                      )
                    }
                    value={editorDraft.preferred_language ?? "zh"}
                  >
                    <option value="zh">中文</option>
                    <option value="en">English</option>
                  </select>
                </Field>

                <Field label="主题">
                  <select
                    className="flex h-11 w-full rounded-2xl border border-input bg-white px-4 py-2 text-sm"
                    name="preferred_theme"
                    onChange={(event) =>
                      setEditorDraft((current) =>
                        current ? { ...current, preferred_theme: event.target.value } : current,
                      )
                    }
                    value={editorDraft.preferred_theme ?? "light"}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </Field>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <input
                  checked={Boolean(editorDraft.is_admin)}
                  name="is_admin"
                  onChange={(event) =>
                    setEditorDraft((current) =>
                      current ? { ...current, is_admin: event.target.checked } : current,
                    )
                  }
                  type="checkbox"
                />
                管理员权限
              </label>

              <SheetFooter className="pt-4">
                <Button
                  disabled={saveUserSubmitting}
                  onClick={() => setDeleteCandidate(editorUser)}
                  type="button"
                  variant="destructive"
                >
                  <Trash2 />
                  删除用户
                </Button>
                <Button disabled={saveUserSubmitting} type="submit">
                  <Save />
                  {saveUserSubmitting ? "保存中…" : "保存用户"}
                </Button>
              </SheetFooter>
            </form>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog onOpenChange={(open) => !open && setDeleteCandidate(null)} open={Boolean(deleteCandidate)}>
        <DialogContent className="max-w-md overscroll-contain">
          <DialogHeader>
            <DialogTitle>确认删除用户</DialogTitle>
            <DialogDescription>
              删除后无法恢复。
              {deleteCandidate ? ` 用户：${deleteCandidate.email}` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setDeleteCandidate(null)} type="button" variant="outline">
              取消
            </Button>
            <Button disabled={deleteSubmitting} onClick={handleDeleteUser} type="button" variant="destructive">
              <Trash2 />
              {deleteSubmitting ? "删除中…" : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

function RoleBadge({ isAdmin }: { isAdmin: boolean }) {
  return (
    <Badge variant={isAdmin ? "secondary" : "outline"}>
      {isAdmin ? "管理员" : "普通用户"}
    </Badge>
  );
}
