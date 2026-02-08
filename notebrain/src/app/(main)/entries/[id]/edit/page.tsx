"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export default function EntryEditPage() {
  const params = useParams();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [version, setVersion] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/entries/${params.id}?mode=full`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setTitle(res.data.title);
          setContent(res.data.content);
          setVersion(res.data.version);
          setTags(res.data.tags.map((t: { name: string }) => t.name));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/entries/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          tags,
          version,
          change_summary: "手动编辑",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setVersion(data.data.version);
        router.push(`/entries/${params.id}`);
      } else {
        alert(data.error || "保存失败");
      }
    } catch {
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  }, [title, content, tags, version, params.id, router]);

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="h-8 w-64 bg-muted animate-pulse rounded mb-4" />
        <div className="h-12 bg-muted animate-pulse rounded mb-4" />
        <div className="h-96 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/entries/${params.id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回详情
          </Link>
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "保存中..." : "保存"}
        </Button>
      </div>

      {/* Title */}
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="文档标题"
        className="text-xl font-bold border-none bg-transparent px-0 focus-visible:ring-0 mb-4"
      />

      {/* Tags */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="cursor-pointer hover:bg-destructive/20"
            onClick={() => removeTag(tag)}
          >
            {tag} ×
          </Badge>
        ))}
        <Input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleAddTag}
          placeholder="添加标签 (回车确认)"
          className="w-40 h-6 text-xs border-dashed"
        />
      </div>

      {/* Content editor */}
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="开始用 Markdown 编写..."
        className="min-h-[600px] font-mono text-sm resize-y"
      />

      <p className="text-xs text-muted-foreground mt-2">
        版本 #{version} · 支持 Markdown 格式
      </p>
    </div>
  );
}
