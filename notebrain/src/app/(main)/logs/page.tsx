"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CircleDot, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { zhCN } from "date-fns/locale";

interface LogItem {
  id: string;
  action: string;
  entryId: string | null;
  entryTitle: string | null;
  summary: string | null;
  diffStats: { addedWords?: number; removedWords?: number } | null;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  create: "text-green-500",
  update: "text-blue-500",
  delete: "text-red-500",
  add_tag: "text-yellow-500",
  add_relation: "text-yellow-500",
  remove_tag: "text-orange-500",
  move: "text-purple-500",
};

const ACTION_LABELS: Record<string, string> = {
  create: "创建",
  update: "更新",
  delete: "删除",
  add_tag: "添加标签",
  add_relation: "添加关联",
  remove_tag: "移除标签",
  move: "移动",
};

function groupByDate(logs: LogItem[]) {
  const groups: { label: string; logs: LogItem[] }[] = [];
  const map = new Map<string, LogItem[]>();

  for (const log of logs) {
    const date = new Date(log.createdAt);
    let label: string;
    if (isToday(date)) {
      label = "今天";
    } else if (isYesterday(date)) {
      label = "昨天";
    } else {
      label = format(date, "yyyy-MM-dd", { locale: zhCN });
    }
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(log);
  }

  for (const [label, logs] of map) {
    groups.push({ label, logs });
  }

  return groups;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/logs?page_size=100")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setLogs(res.data.logs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const groups = groupByDate(logs);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Agent 操作日志</h1>
      <p className="text-sm text-muted-foreground mb-6">
        记录 AI Agent 对文档的所有操作，日志保留 30 天
      </p>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg border border-border bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">暂无操作日志</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.label}>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                {group.label}
              </h2>
              <div className="space-y-2">
                {group.logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border"
                  >
                    <CircleDot
                      className={cn(
                        "h-4 w-4 mt-0.5 shrink-0",
                        ACTION_COLORS[log.action] || "text-muted-foreground"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                        <span className="text-muted-foreground">
                          {format(new Date(log.createdAt), "HH:mm")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {log.summary}
                      </p>
                      {log.diffStats && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {log.diffStats.addedWords
                            ? `+${log.diffStats.addedWords} 字`
                            : ""}
                          {log.diffStats.removedWords
                            ? ` -${log.diffStats.removedWords} 字`
                            : ""}
                        </p>
                      )}
                    </div>
                    {log.entryId && (
                      <Link
                        href={`/entries/${log.entryId}`}
                        className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
                      >
                        <FileText className="h-3 w-3" />
                        查看文档
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
