import { Suspense } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminPageFallback />}>
      <AdminShell />
    </Suspense>
  );
}

function AdminPageFallback() {
  return (
    <main className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg bg-white/88">
        <CardHeader>
          <CardTitle>后台加载中…</CardTitle>
          <CardDescription>正在准备管理页面。</CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
