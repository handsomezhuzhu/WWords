import { Sparkles, Target, TimerReset } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const previewStats = [
  { label: "待复习", value: "14", icon: TimerReset },
  { label: "新词草稿", value: "08", icon: Sparkles },
  { label: "掌握率", value: "82%", icon: Target },
] as const;

const reviewQueue = [
  { prompt: "harbor", mode: "英 -> 中", eta: "现在" },
  { prompt: "细致的", mode: "中 -> 英", eta: "3 分钟后" },
  { prompt: "immerse", mode: "英 -> 中", eta: "中午前" },
] as const;

export function DashboardPreview() {
  return (
    <Card className="animate-float overflow-hidden bg-white/86">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge variant="secondary">Dashboard Snapshot</Badge>
            <CardTitle className="mt-4 text-3xl">今日复习板</CardTitle>
            <CardDescription>
              shadcn 组件拼出的工作台预览，后续对接真实 API。
            </CardDescription>
          </div>
          <div className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-secondary">
            mobile-first
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          {previewStats.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="border-border/70 bg-white/80 shadow-none">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-full bg-primary/12 p-2 text-primary">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">
                      {item.value}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">复习队列</p>
              <p className="text-sm text-muted-foreground">
                对接 `/review/start` 后替换为实时数据
              </p>
            </div>
            <Badge variant="outline">3 cards</Badge>
          </div>

          {reviewQueue.map((item) => (
            <div
              key={item.prompt}
              className="flex items-center justify-between rounded-[1.15rem] border border-border/80 bg-white/84 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{item.prompt}</p>
                <p className="text-xs text-muted-foreground">{item.mode}</p>
              </div>
              <span className="text-xs font-medium text-secondary">{item.eta}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
