"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { Save, Search, ShieldCheck, Trash2, UserPlus } from "lucide-react";

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
  AdminUserUpdatePayload,
  SystemConfigPayload,
  SystemConfigRecord,
  UserRecord,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type UserDraftMap = Record<number, AdminUserUpdatePayload & { password?: string }>;

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

export function AdminShell() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [drafts, setDrafts] = useState<UserDraftMap>({});
  const [search, setSearch] = useState("");
  const [createUserForm, setCreateUserForm] = useState<AdminUserCreatePayload>(emptyCreateUser);
  const [config, setConfig] = useState<SystemConfigRecord | null>(null);
  const [configForm, setConfigForm] = useState<SystemConfigPayload>(emptyConfig);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadAdminData();
  }, []);

  async function loadAdminData(query = search) {
    setLoading(true);
    setError("");
    try {
      const user = await getCurrentUser();
      if (!user.is_admin) {
        router.replace("/dashboard");
        return;
      }

      setCurrentUser(user);

      const [userResponse, configResponse] = await Promise.all([
        listAdminUsers(query, 1, 50),
        getAdminConfig().catch(() => null),
      ]);

      setUsers(userResponse.items);
      setDrafts(
        Object.fromEntries(
          userResponse.items.map((item) => [
            item.id,
            {
              email: item.email,
              preferred_language: item.preferred_language,
              preferred_theme: item.preferred_theme,
              is_admin: item.is_admin,
              password: "",
            },
          ]),
        ),
      );

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

  function updateDraft(userId: number, patch: Partial<AdminUserUpdatePayload>) {
    setDrafts((current) => ({
      ...current,
      [userId]: {
        ...current[userId],
        ...patch,
      },
    }));
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await createAdminUser(createUserForm);
      setCreateUserForm(emptyCreateUser);
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建用户失败");
    }
  }

  async function handleSaveUser(userId: number) {
    setError("");
    try {
      const draft = drafts[userId];
      const payload: AdminUserUpdatePayload = {
        email: draft.email,
        preferred_language: draft.preferred_language,
        preferred_theme: draft.preferred_theme,
        is_admin: draft.is_admin,
        password: draft.password || undefined,
      };
      await updateAdminUser(userId, payload);
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新用户失败");
    }
  }

  async function handleDeleteUser(userId: number) {
    setError("");
    try {
      await deleteAdminUser(userId);
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除用户失败");
    }
  }

  async function handleSaveConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const updated = await updateAdminConfig(configForm);
      setConfig(updated);
      setConfigForm((current) => ({ ...current, api_key: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存配置失败");
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-8">
        <Card className="w-full max-w-lg bg-white/88">
          <CardHeader>
            <CardTitle>后台加载中</CardTitle>
            <CardDescription>正在读取管理员数据和系统配置。</CardDescription>
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
              <CardTitle className="text-3xl">后台管理</CardTitle>
              <CardDescription>
                {currentUser ? currentUser.email : "管理用户和 AI 配置"}
              </CardDescription>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard">返回工作台</Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {error ? (
        <Card className="border-destructive/20 bg-destructive/10 shadow-none">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>用户管理</CardTitle>
            <CardDescription>搜索、创建和维护用户。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form
              className="flex flex-col gap-3 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                void loadAdminData(search);
              }}
            >
              <Input
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索邮箱"
                value={search}
              />
              <Button type="submit" variant="outline">
                <Search />
                搜索
              </Button>
            </form>

            <Separator />

            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateUser}>
              <Field label="新用户邮箱">
                <Input
                  onChange={(event) =>
                    setCreateUserForm((current) => ({ ...current, email: event.target.value }))
                  }
                  required
                  type="email"
                  value={createUserForm.email}
                />
              </Field>
              <Field label="初始密码">
                <Input
                  onChange={(event) =>
                    setCreateUserForm((current) => ({ ...current, password: event.target.value }))
                  }
                  required
                  value={createUserForm.password}
                />
              </Field>
              <Field label="语言">
                <select
                  className="flex h-11 w-full rounded-2xl border border-input bg-white/80 px-4 py-2 text-sm"
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
                  className="flex h-11 w-full rounded-2xl border border-input bg-white/80 px-4 py-2 text-sm"
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
              <label className="flex items-center gap-2 text-sm font-medium text-foreground md:col-span-2">
                <input
                  checked={Boolean(createUserForm.is_admin)}
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
              <div className="md:col-span-2">
                <Button type="submit">
                  <UserPlus />
                  创建用户
                </Button>
              </div>
            </form>

            <Separator />

            <div className="grid gap-4">
              {users.map((user) => {
                const draft = drafts[user.id];
                if (!draft) return null;

                return (
                  <Card key={user.id} className="border-border/70 bg-white/84 shadow-none">
                    <CardContent className="grid gap-4 p-5 md:grid-cols-2">
                      <Field label="邮箱">
                        <Input
                          onChange={(event) => updateDraft(user.id, { email: event.target.value })}
                          value={draft.email ?? ""}
                        />
                      </Field>
                      <Field label="重置密码">
                        <Input
                          onChange={(event) => updateDraft(user.id, { password: event.target.value })}
                          placeholder="留空表示不修改"
                          value={draft.password ?? ""}
                        />
                      </Field>
                      <Field label="语言">
                        <select
                          className="flex h-11 w-full rounded-2xl border border-input bg-white/80 px-4 py-2 text-sm"
                          onChange={(event) =>
                            updateDraft(user.id, { preferred_language: event.target.value })
                          }
                          value={draft.preferred_language ?? "zh"}
                        >
                          <option value="zh">中文</option>
                          <option value="en">English</option>
                        </select>
                      </Field>
                      <Field label="主题">
                        <select
                          className="flex h-11 w-full rounded-2xl border border-input bg-white/80 px-4 py-2 text-sm"
                          onChange={(event) =>
                            updateDraft(user.id, { preferred_theme: event.target.value })
                          }
                          value={draft.preferred_theme ?? "light"}
                        >
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                        </select>
                      </Field>
                      <label className="flex items-center gap-2 text-sm font-medium text-foreground md:col-span-2">
                        <input
                          checked={Boolean(draft.is_admin)}
                          onChange={(event) =>
                            updateDraft(user.id, { is_admin: event.target.checked })
                          }
                          type="checkbox"
                        />
                        管理员权限
                      </label>
                      <div className="flex flex-wrap gap-2 md:col-span-2">
                        <Button onClick={() => void handleSaveUser(user.id)} type="button">
                          <Save />
                          保存
                        </Button>
                        <Button
                          onClick={() => void handleDeleteUser(user.id)}
                          type="button"
                          variant="destructive"
                        >
                          <Trash2 />
                          删除
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
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
                  className="flex h-11 w-full rounded-2xl border border-input bg-white/80 px-4 py-2 text-sm"
                  onChange={(event) =>
                    setConfigForm((current) => ({ ...current, provider: event.target.value }))
                  }
                  value={configForm.provider}
                >
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Gemini</option>
                </select>
              </Field>

              <Field label="API URL">
                <Input
                  onChange={(event) =>
                    setConfigForm((current) => ({ ...current, api_url: event.target.value }))
                  }
                  placeholder="https://api.openai.com/v1"
                  value={configForm.api_url ?? ""}
                />
              </Field>

              <Field label="Model">
                <Input
                  onChange={(event) =>
                    setConfigForm((current) => ({ ...current, model: event.target.value }))
                  }
                  value={configForm.model ?? ""}
                />
              </Field>

              <Field label="API Key">
                <Input
                  onChange={(event) =>
                    setConfigForm((current) => ({ ...current, api_key: event.target.value }))
                  }
                  placeholder={
                    config?.api_key_configured
                      ? config.api_key_masked || "已配置"
                      : "sk-..."
                  }
                  value={configForm.api_key ?? ""}
                />
              </Field>

              <Field label="Temperature">
                <Input
                  max={2}
                  min={0}
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

              <Button type="submit">
                <Save />
                保存配置
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
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
