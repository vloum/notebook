"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Tag,
  Plus,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface NotebookItem {
  id: string;
  name: string;
  icon: string | null;
  entryCount: number;
  isDefault: boolean;
}

interface TagItem {
  id: string;
  name: string;
  color: string | null;
  count: number;
}

interface SidebarProps {
  notebooks: NotebookItem[];
  tags: TagItem[];
  collapsed?: boolean;
}

export function Sidebar({ notebooks, tags, collapsed }: SidebarProps) {
  const pathname = usePathname();
  const [notebooksOpen, setNotebooksOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);

  if (collapsed) return null;

  return (
    <aside className="w-64 border-r border-border bg-muted/30 flex flex-col h-full">
      <ScrollArea className="flex-1 px-3 py-4">
        {/* All entries link */}
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            pathname === "/"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
        >
          <FileText className="h-4 w-4" />
          全部笔记
        </Link>

        {/* Notebooks section */}
        <div className="mt-6">
          <button
            onClick={() => setNotebooksOpen(!notebooksOpen)}
            className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-full hover:text-foreground transition-colors"
          >
            {notebooksOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <BookOpen className="h-3 w-3 mr-1" />
            笔记本
          </button>

          {notebooksOpen && (
            <div className="mt-1 space-y-0.5">
              {notebooks.map((nb) => (
                <Link
                  key={nb.id}
                  href={`/notebooks/${nb.id}`}
                  className={cn(
                    "flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors ml-2",
                    pathname === `/notebooks/${nb.id}`
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-2 truncate">
                    <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{nb.icon} {nb.name}</span>
                  </span>
                  <span className="text-xs text-muted-foreground/70">{nb.entryCount}</span>
                </Link>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start ml-2 text-muted-foreground hover:text-foreground"
                asChild
              >
                <Link href="/notebooks/new">
                  <Plus className="h-3.5 w-3.5 mr-2" />
                  新建笔记本
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Tags section */}
        <div className="mt-6">
          <button
            onClick={() => setTagsOpen(!tagsOpen)}
            className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-full hover:text-foreground transition-colors"
          >
            {tagsOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <Tag className="h-3 w-3 mr-1" />
            标签
          </button>

          {tagsOpen && (
            <div className="mt-1 space-y-0.5">
              {tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/tags/${tag.name}`}
                  className={cn(
                    "flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors ml-2",
                    pathname === `/tags/${tag.name}`
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color || "#6b7280" }}
                    />
                    <span className="truncate">{tag.name}</span>
                  </span>
                  <span className="text-xs text-muted-foreground/70">{tag.count}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
