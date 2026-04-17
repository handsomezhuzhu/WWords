import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LandingShell() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <Card className="w-full bg-white">
        <CardHeader className="space-y-2">
          <CardTitle className="text-4xl">WWords</CardTitle>
          <CardDescription>AI 单词本</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">登录后进入工作台。</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <Link href="/login">登录</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/register">注册</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
