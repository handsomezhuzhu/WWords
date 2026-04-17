import { Suspense } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardPageFallback />}>
      <DashboardShell />
    </Suspense>
  );
}

function DashboardPageFallback() {
  return (
    <main className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg bg-white/88">
        <CardHeader>
          <CardTitle>工作台加载中…</CardTitle>
          <CardDescription>正在读取词库和复习数据。</CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
