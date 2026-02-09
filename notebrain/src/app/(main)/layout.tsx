"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notebooks, setNotebooks] = useState<NotebookItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch sidebar data — also serves as auth check
    Promise.all([
      fetch("/api/notebooks"),
      fetch("/api/tags"),
      fetch("/api/logs?recent=10"),
    ]).then(async ([nbRaw, tagRaw, logRaw]) => {
      // If any API returns 401, middleware should have caught it
      // but handle gracefully just in case
      if (nbRaw.status === 401) {
        router.replace("/login");
        return;
      }

      const [nbRes, tagRes, logRes] = await Promise.all([
        nbRaw.json(),
        tagRaw.json(),
        logRaw.json(),
      ]);

      if (nbRes.success) setNotebooks(nbRes.data.notebooks);
      if (tagRes.success) setTags(tagRes.data.tags);
      if (logRes.success) setLogs(logRes.data.logs);
      setAuthed(true);
    }).catch(() => {
      router.replace("/login");
    }).finally(() => {
      setLoading(false);
    });
  }, [router]);

  // Show nothing while checking auth
  if (loading || !authed) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
