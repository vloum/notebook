"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { EntryCard } from "@/components/entries/entry-card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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

export default function NotebookPage() {
  const params = useParams();
  const [entries, setEntries] = useState<EntryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [notebookName, setNotebookName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/entries?notebook_id=${params.id}&sort_by=updatedAt&sort_order=desc`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setEntries(res.data.entries);
          setTotal(res.data.total);
          if (res.data.entries.length > 0) {
            setNotebookName(res.data.entries[0].notebook.name);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{notebookName || "笔记本"}</h1>
          <p className="text-sm text-muted-foreground mt-1">共 {total} 篇文档</p>
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
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-lg border border-border bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">该笔记本暂无文档</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <EntryCard key={entry.id} {...entry} />
          ))}
        </div>
      )}
    </div>
  );
}
