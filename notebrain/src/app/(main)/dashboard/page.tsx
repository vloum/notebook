"use client";

import { useEffect, useState } from "react";
import { EntryCard } from "@/components/entries/entry-card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, MessageSquare, BookOpen } from "lucide-react";
import Link from "next/link";

interface EntryItem {
  id: string;
  title: string;
  summary: string | null;
  type: string;
  source: string;
  wordCount: number;
  tags: { id: string; name: string; color: string | null }[];
  notebook: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export default function HomePage() {
  const [entries, setEntries] = useState<EntryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/entries?page=${page}&page_size=20&sort_by=updatedAt&sort_order=desc`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setEntries(res.data.entries);
          setTotal(res.data.total);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">全部笔记</h1>
          <p className="text-sm text-muted-foreground mt-1">
            共 {total} 篇文档
          </p>
        </div>
        <Button asChild>
          <Link href="/entries/new">
            <Plus className="h-4 w-4 mr-2" />
            新建文档
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-lg border border-border bg-muted/30 animate-pulse"
            />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-20 w-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-6">
            <FileText className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <h2 className="text-lg font-semibold mb-2">开始构建你的知识库</h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-sm text-center">
            创建第一篇文档，或者和 AI 助手对话让它帮你整理资料
          </p>
          <div className="flex gap-3">
            <Button asChild>
              <Link href="/entries/new">
                <Plus className="h-4 w-4 mr-2" />
                新建文档
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/chat">
                <MessageSquare className="h-4 w-4 mr-2" />
                AI 助手
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-6 mt-16 max-w-lg w-full">
            <div className="text-center">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">Markdown 文档</p>
            </div>
            <div className="text-center">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">AI 问答检索</p>
            </div>
            <div className="text-center">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">笔记本管理</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {entries.map((entry) => (
              <EntryCard key={entry.id} {...entry} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
