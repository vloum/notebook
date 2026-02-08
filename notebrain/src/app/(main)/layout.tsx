"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { LogTicker } from "@/components/layout/log-ticker";

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

interface LogItem {
  id: string;
  action: string;
  entryId: string | null;
  entryTitle: string | null;
  summary: string | null;
  createdAt: string;
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notebooks, setNotebooks] = useState<NotebookItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);

  useEffect(() => {
    // Fetch sidebar data
    Promise.all([
      fetch("/api/notebooks").then((r) => r.json()),
      fetch("/api/tags").then((r) => r.json()),
      fetch("/api/logs?recent=10").then((r) => r.json()),
    ]).then(([nbRes, tagRes, logRes]) => {
      if (nbRes.success) setNotebooks(nbRes.data.notebooks);
      if (tagRes.success) setTags(tagRes.data.tags);
      if (logRes.success) setLogs(logRes.data.logs);
    }).catch(() => {
      // Not authenticated or API error - will be handled by auth redirect
    });
  }, []);

  return (
    <div className="h-screen flex flex-col">
      <Topbar
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          notebooks={notebooks}
          tags={tags}
          collapsed={sidebarCollapsed}
        />

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      <LogTicker logs={logs} />
    </div>
  );
}
