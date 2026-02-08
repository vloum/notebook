"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Loader2,
  FileText,
  Globe,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";

export default function ChatPage() {
  const { messages, sendMessage, status, error } = useChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ parts: [{ type: "text" as const, text: input.trim() }] });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-20">
              <Sparkles className="h-12 w-12 text-primary/30 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">AI 知识助手</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                我可以帮你搜索知识库、回答问题、从链接中整理内容、创建新文档
              </p>
              <div className="grid gap-3 max-w-md mx-auto">
                {[
                  "帮我找一下之前写的关于 Redis 缓存的笔记",
                  "帮我整理这个链接的内容并保存",
                  "我的知识库里有哪些笔记本？",
                  "对比一下我最近的两篇技术文档的核心观点",
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    className="text-left text-sm p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors text-muted-foreground hover:text-foreground"
                    onClick={() => setInput(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className="flex gap-3">
              <div
                className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {message.role === "user" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {message.parts.map((part: any, i: number) => {
                  // Tool invocation parts (v6: type starts with "tool-")
                  if (part.type?.startsWith("tool-")) {
                    const toolName = part.toolName || part.toolInvocation?.toolName || "";
                    const args = part.args || part.input || part.toolInvocation?.args || {};
                    const state = part.state || part.toolInvocation?.state || "call";

                    const icons: Record<string, React.ReactNode> = {
                      search_documents: <FileText className="h-3 w-3" />,
                      get_document: <FileText className="h-3 w-3" />,
                      fetch_url: <Globe className="h-3 w-3" />,
                      create_document: <FileText className="h-3 w-3" />,
                      list_notebooks: <FileText className="h-3 w-3" />,
                    };

                    const labels: Record<string, string> = {
                      search_documents: `搜索: "${args.query || ""}"`,
                      get_document: "读取文档...",
                      fetch_url: `抓取: ${args.url || ""}`,
                      create_document: `创建: "${args.title || ""}"`,
                      list_notebooks: "查看笔记本",
                    };

                    return (
                      <div
                        key={i}
                        className="mb-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 flex items-center gap-2"
                      >
                        {icons[toolName] || <FileText className="h-3 w-3" />}
                        <span>{labels[toolName] || toolName}</span>
                        {(state === "call" || state === "input-streaming") && (
                          <Loader2 className="h-3 w-3 animate-spin ml-auto" />
                        )}
                        {state === "result" && (
                          <span className="ml-auto text-green-500">完成</span>
                        )}
                      </div>
                    );
                  }

                  // Text parts
                  if (part.type === "text" && part.text) {
                    return (
                      <div
                        key={i}
                        className="prose prose-neutral dark:prose-invert prose-sm max-w-none"
                      >
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({ href, children }) => {
                              if (href?.startsWith("/entries/")) {
                                return (
                                  <Link
                                    href={href}
                                    className="text-primary hover:underline inline-flex items-center gap-1"
                                  >
                                    <FileText className="h-3 w-3" />
                                    {children}
                                  </Link>
                                );
                              }
                              return (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  {children}
                                </a>
                              );
                            },
                          }}
                        >
                          {part.text}
                        </ReactMarkdown>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-3">
              <div className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-muted">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                思考中...
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              {error.message || "请求失败，请检查 AI 模型配置"}
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto flex items-end gap-2"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="问我任何关于你知识库的问题...（Enter 发送，Shift+Enter 换行）"
            className="resize-none min-h-[44px] max-h-[200px]"
            rows={1}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground text-center mt-2">
          AI 助手会搜索你的知识库来回答问题，也可以抓取链接内容
        </p>
      </div>
    </div>
  );
}
