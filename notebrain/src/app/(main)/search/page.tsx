"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FileText, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface SearchResult {
  id: string;
  title: string;
  summary: string | null;
  type: string;
  tags: { id: string; name: string; color: string | null }[];
  notebook: { id: string; name: string };
  updatedAt: string;
  relevanceScore: number;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setTotalCount(0);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/entries/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, limit: 20 }),
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.data.results);
        setTotalCount(data.data.totalCount);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQuery) doSearch(initialQuery);
  }, [initialQuery, doSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(query);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索文档..."
            className="pl-9"
            autoFocus
          />
        </div>
      </form>

      {query && (
        <p className="text-sm text-muted-foreground mb-4">
          搜索 &quot;{query}&quot; — 共 {totalCount} 条结果
        </p>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-lg border border-border bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : results.length === 0 && query ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">未找到相关文档</p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((result) => (
            <Link
              key={result.id}
              href={`/entries/${result.id}`}
              className="block p-4 rounded-lg border border-border hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-medium truncate">{result.title}</h3>
                    {result.summary && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {result.summary}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {result.tags.map((tag) => (
                        <Badge key={tag.id} variant="secondary" className="text-xs">
                          {tag.name}
                        </Badge>
                      ))}
                      <span className="text-xs text-muted-foreground">
                        {result.notebook.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(result.updatedAt), {
                          locale: zhCN,
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0 ml-4">
                  {Math.round(result.relevanceScore * 100)}%
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
