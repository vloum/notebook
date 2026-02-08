"use client";

import { useEffect, useState } from "react";
import { Key, Plus, Copy, Check, Trash2, Ban, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Create key dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyExpiry, setNewKeyExpiry] = useState("never");
  const [creating, setCreating] = useState(false);

  // Created key dialog
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const res = await fetch("/api/api-keys");
      const data = await res.json();
      if (data.success) setApiKeys(data.data.keys);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);

    let expiresAt: string | undefined;
    if (newKeyExpiry === "30d") {
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    } else if (newKeyExpiry === "90d") {
      expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    }

    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim(), expires_at: expiresAt }),
      });
      const data = await res.json();
      if (data.success) {
        setCreatedKey(data.data.key);
        setCreateOpen(false);
        setNewKeyName("");
        setNewKeyExpiry("never");
        fetchKeys();
      } else {
        alert(data.error);
      }
    } catch {
      alert("创建失败");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await fetch(`/api/api-keys/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !isActive }),
    });
    fetchKeys();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个密钥吗？使用该密钥的 MCP 连接将立即失效。")) return;
    await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
    fetchKeys();
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">个人设置</h1>

      {/* MCP API Keys */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                MCP API 密钥
              </CardTitle>
              <CardDescription className="mt-1">
                用于连接 MCP Client（如 Cursor、Claude Desktop 等）
              </CardDescription>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  生成新密钥
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>生成新的 API 密钥</DialogTitle>
                  <DialogDescription>
                    密钥生成后只会展示一次，请妥善保管。
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>密钥名称</Label>
                    <Input
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder='如 "Cursor MCP"、"办公电脑"'
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>过期时间</Label>
                    <Select value={newKeyExpiry} onValueChange={setNewKeyExpiry}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">永不过期</SelectItem>
                        <SelectItem value="30d">30 天后</SelectItem>
                        <SelectItem value="90d">90 天后</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleCreate} disabled={creating || !newKeyName.trim()}>
                    {creating ? "生成中..." : "生成"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              还没有 API 密钥，点击上方按钮生成一个
            </p>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Key className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{key.name}</span>
                        {!key.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            已禁用
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <code className="bg-muted px-1 rounded">{key.keyPrefix}</code>
                        <span>
                          创建于{" "}
                          {formatDistanceToNow(new Date(key.createdAt), {
                            locale: zhCN,
                            addSuffix: true,
                          })}
                        </span>
                        <span>
                          {key.lastUsedAt
                            ? `最后使用：${formatDistanceToNow(new Date(key.lastUsedAt), { locale: zhCN, addSuffix: true })}`
                            : "从未使用"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleToggle(key.id, key.isActive)}
                      title={key.isActive ? "禁用" : "启用"}
                    >
                      {key.isActive ? (
                        <Ban className="h-4 w-4" />
                      ) : (
                        <CircleCheck className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(key.id)}
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Created key dialog */}
      <Dialog open={!!createdKey} onOpenChange={(open) => !open && setCreatedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              密钥已生成
            </DialogTitle>
            <DialogDescription>
              请立即复制并妥善保管，此密钥只会展示一次！
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted p-3 rounded-lg text-sm font-mono break-all">
                {createdKey}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => createdKey && copyToClipboard(createdKey)}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="mt-4 bg-muted rounded-lg p-4">
              <p className="text-xs font-semibold mb-2">MCP 配置示例：</p>
              <pre className="text-xs overflow-x-auto">
{`{
  "mcpServers": {
    "notebrain": {
      "command": "npx",
      "args": ["notebrain-mcp"],
      "env": {
        "NOTEBRAIN_API_KEY": "${createdKey}",
        "NOTEBRAIN_API_URL": "${typeof window !== 'undefined' ? window.location.origin : ''}/api"
      }
    }
  }
}`}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreatedKey(null)}>完成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
