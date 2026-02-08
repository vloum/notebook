"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  Pencil,
  MoreHorizontal,
  Trash2,
  FolderInput,
  History,
  Download,
  Bot,
  PencilLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface EntryDetail {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  type: string;
  source: string;
  version: number;
  wordCount: number;
  totalLines: number;
  tags: { id: string; name: string; color: string | null }[];
  notebook: { id: string; name: string };
  relations: {
    relationId: string;
    targetId: string;
    targetTitle: string;
    type: string;
    direction: "outgoing" | "incoming";
  }[];
  createdAt: string;
  updatedAt: string;
  mode: "full" | "outline";
  sections?: { index: number; heading: string; wordCount: number }[];
}

const TYPE_LABELS: Record<string, string> = {
  note: "笔记",
  diary: "日记",
  experience: "经验",
  document: "文档",
};

const RELATION_LABELS: Record<string, string> = {
  references: "引用",
  continues: "续写",
  related: "相关",
  contradicts: "修正",
  summarizes: "总结",
};

export default function EntryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [entry, setEntry] = useState<EntryDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/entries/${params.id}?mode=full`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setEntry(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleDelete = async () => {
    if (!confirm("确定要删除这篇文档吗？")) return;
    const res = await fetch(`/api/entries/${params.id}`, { method: "DELETE" });
    if (res.ok) router.push("/");
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="h-8 w-64 bg-muted animate-pulse rounded mb-4" />
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-4 bg-muted animate-pulse rounded w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center py-16">
        <p className="text-muted-foreground">文档不存在</p>
        <Button variant="link" asChild className="mt-2">
          <Link href="/">返回列表</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回列表
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/entries/${entry.id}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              编辑
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <FolderInput className="mr-2 h-4 w-4" />
                移动到其他笔记本
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                导出 Markdown
              </DropdownMenuItem>
              <DropdownMenuItem>
                <History className="mr-2 h-4 w-4" />
                查看版本历史
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                删除文档
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Metadata */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          {entry.tags.map((tag) => (
            <Badge key={tag.id} variant="secondary">
              {tag.name}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
          <span>
            类型: {TYPE_LABELS[entry.type] || entry.type}
          </span>
          <span>笔记本: {entry.notebook.name}</span>
          <span>
            更新: {formatDistanceToNow(new Date(entry.updatedAt), { locale: zhCN, addSuffix: true })}
          </span>
          <span className="flex items-center gap-1">
            {entry.source === "agent" ? (
              <><Bot className="h-3 w-3" /> AI 更新</>
            ) : (
              <><PencilLine className="h-3 w-3" /> 手动编辑</>
            )}
          </span>
          <span>版本 #{entry.version}</span>
          <span>{entry.wordCount} 字</span>
        </div>
      </div>

      {/* Content */}
      <article className="prose prose-neutral dark:prose-invert max-w-none mb-8">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {entry.content}
        </ReactMarkdown>
      </article>

      {/* Relations */}
      {entry.relations.length > 0 && (
        <div className="rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">关联文档</h3>
          <div className="space-y-2">
            {entry.relations.map((rel) => (
              <Link
                key={rel.relationId}
                href={`/entries/${rel.targetId}`}
                className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
              >
                <Badge variant="outline" className="text-xs">
                  {rel.direction === "outgoing"
                    ? `${RELATION_LABELS[rel.type] || rel.type} →`
                    : `← 被${RELATION_LABELS[rel.type] || rel.type}`}
                </Badge>
                <span>{rel.targetTitle}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
