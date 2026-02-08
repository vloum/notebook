"use client";

import Link from "next/link";
import { FileText, Bot, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface EntryCardProps {
  id: string;
  title: string;
  summary: string | null;
  type: string;
  source: string;
  tags: { id: string; name: string; color: string | null }[];
  notebook: { id: string; name: string };
  updatedAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  note: "笔记",
  diary: "日记",
  experience: "经验",
  document: "文档",
};

export function EntryCard({
  id,
  title,
  summary,
  type,
  source,
  tags,
  updatedAt,
}: EntryCardProps) {
  return (
    <Link
      href={`/entries/${id}`}
      className="block p-4 rounded-lg border border-border bg-card hover:bg-accent/30 transition-colors group"
    >
      <div className="flex items-start gap-3">
        <FileText className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
            {title}
          </h3>
          {summary && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {summary}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="text-xs px-1.5 py-0"
              >
                {tag.name}
              </Badge>
            ))}
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              {TYPE_LABELS[type] || type}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
              {source === "agent" ? (
                <>
                  <Bot className="h-3 w-3" />
                  AI 更新于
                </>
              ) : (
                <>
                  <Pencil className="h-3 w-3" />
                  编辑于
                </>
              )}
              {formatDistanceToNow(new Date(updatedAt), {
                locale: zhCN,
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
