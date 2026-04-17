"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { UserPlus } from "lucide-react";

import { ApiError, register } from "@/lib/api";
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

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);
    try {
      await register({
        email,
        password,
        preferred_language: "zh",
        preferred_theme: "light",
      });
      setSuccess("注册成功，现在可以登录");
      setTimeout(() => {
        router.push("/login");
      }, 800);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("注册失败，请稍后重试");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md bg-white">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">注册</CardTitle>
        <CardDescription>密码至少 12 位，需包含大小写、数字和符号。</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="register-email">邮箱</Label>
            <Input
              id="register-email"
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="register-password">密码</Label>
            <Input
              id="register-password"
              autoComplete="new-password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="register-confirm">确认密码</Label>
            <Input
              id="register-confirm"
              autoComplete="new-password"
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              type="password"
              value={confirmPassword}
            />
          </div>

          {error ? (
            <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
              {success}
            </p>
          ) : null}

          <Button className="w-full" disabled={loading} size="lg" type="submit">
            <UserPlus />
            {loading ? "注册中..." : "注册"}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          已有账号？{" "}
          <Link className="font-medium text-secondary hover:underline" href="/login">
            返回登录
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
