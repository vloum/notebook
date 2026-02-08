"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronRight, CircleDot } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface LogItem {
  id: string;
  action: string;
  entryId: string | null;
  entryTitle: string | null;
  summary: string | null;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  create: "text-green-500",
  update: "text-blue-500",
  delete: "text-red-500",
  add_tag: "text-yellow-500",
  add_relation: "text-yellow-500",
};

interface LogTickerProps {
  logs: LogItem[];
}

export function LogTicker({ logs }: LogTickerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (logs.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % logs.length);
        setIsAnimating(false);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, [logs.length, isPaused]);

  if (logs.length === 0) {
    return (
      <div className="h-10 border-t border-border bg-muted/30 flex items-center px-4 text-xs text-muted-foreground">
        <CircleDot className="h-3 w-3 mr-2" />
        暂无 Agent 操作日志
        <Link
          href="/logs"
          className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          查看全部
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  const currentLog = logs[currentIndex];

  return (
    <div
      className="h-10 border-t border-border bg-muted/30 flex items-center px-4 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className={cn(
          "flex items-center gap-2 text-xs flex-1 transition-all duration-300",
          isAnimating ? "opacity-0 -translate-y-2" : "opacity-100 translate-y-0"
        )}
      >
        <CircleDot
          className={cn(
            "h-3 w-3 shrink-0",
            ACTION_COLORS[currentLog.action] || "text-muted-foreground"
          )}
        />
        <span className="text-muted-foreground">
          [{formatDistanceToNow(new Date(currentLog.createdAt), { locale: zhCN, addSuffix: true })}]
        </span>
        <span className="text-foreground truncate">
          {currentLog.summary || `AI ${currentLog.action} 了文档`}
        </span>
        {currentLog.entryId && (
          <Link
            href={`/entries/${currentLog.entryId}`}
            className="text-primary hover:underline truncate shrink-0"
          >
            {currentLog.entryTitle || "查看文档"}
          </Link>
        )}
      </div>

      <Link
        href="/logs"
        className="ml-4 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        查看全部
        <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
