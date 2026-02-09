"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { EntryCard } from "@/components/entries/entry-card";
import { Button } from "@/components/ui/button";
import { Tag } from "lucide-react";
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

export default function TagPage() {
  const params = useParams();
  const tagName = decodeURIComponent(params.name as string);
  const [entries, setEntries] = useState<EntryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/entries?tags=${encodeURIComponent(tagName)}&sort_by=updatedAt&sort_order=desc`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setEntries(res.data.entries);
          setTotal(res.data.total);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tagName]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Tag className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{tagName}</h1>
            <p className="text-sm text-muted-foreground">共 {total} 篇文档</p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard">返回全部</Link>
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
          <p className="text-muted-foreground">该标签下暂无文档</p>
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
