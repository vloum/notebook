"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NotebookOption {
  id: string;
  name: string;
}

export default function NewEntryPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("note");
  const [notebookId, setNotebookId] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [notebooks, setNotebooks] = useState<NotebookOption[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/notebooks")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data.notebooks.length > 0) {
          setNotebooks(res.data.notebooks);
          const defaultNb = res.data.notebooks.find(
            (n: { isDefault: boolean }) => n.isDefault
          );
          if (defaultNb) setNotebookId(defaultNb.id);
          else setNotebookId(res.data.notebooks[0].id);
        }
      })
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      alert("标题和内容不能为空");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content,
          notebook_id: notebookId || undefined,
          tags: tags.length > 0 ? tags : undefined,
          type,
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/entries/${data.data.id}`);
      } else {
        alert(data.error || "创建失败");
      }
    } catch {
      alert("创建失败");
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回列表
          </Link>
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "创建中..." : "创建文档"}
        </Button>
      </div>

      {/* Title */}
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="文档标题"
        className="text-xl font-bold border-none bg-transparent px-0 focus-visible:ring-0 mb-4"
        autoFocus
      />

      {/* Meta row */}
      <div className="flex items-center gap-4 mb-4">
        <Select value={notebookId} onValueChange={setNotebookId}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue placeholder="选择笔记本" />
          </SelectTrigger>
          <SelectContent>
            {notebooks.map((nb) => (
              <SelectItem key={nb.id} value={nb.id}>
                {nb.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="note">笔记</SelectItem>
            <SelectItem value="diary">日记</SelectItem>
            <SelectItem value="experience">经验</SelectItem>
            <SelectItem value="document">文档</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tags */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="cursor-pointer hover:bg-destructive/20"
            onClick={() => setTags(tags.filter((t) => t !== tag))}
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

      {/* Content */}
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="开始用 Markdown 编写..."
        className="min-h-[600px] font-mono text-sm resize-y"
      />
    </div>
  );
}
