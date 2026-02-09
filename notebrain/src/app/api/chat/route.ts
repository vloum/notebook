import { streamText, convertToModelMessages, stepCountIs, jsonSchema } from "ai";
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/api-key";
import { getChatModel } from "@/lib/ai/provider";
import { listEntries, getEntry, createEntry } from "@/lib/services/entry.service";
import { listNotebooks } from "@/lib/services/notebook.service";
import { listTags } from "@/lib/services/tag.service";
import { extractUrlContent } from "@/lib/services/url-extract.service";
import type { EntryType } from "@/generated/prisma/enums";

/**
 * Use jsonSchema() with explicit JSON Schema definitions.
 * This bypasses all zod-to-JSON-Schema conversion issues.
 */
const createTools = (userId: string) => ({
  search_documents: {
    description:
      "搜索用户的知识库文档。根据查询内容返回最相关的文档列表。",
    parameters: jsonSchema<{ query: string; tags?: string[]; type?: string; limit?: number }>({
      type: "object",
      properties: {
        query: { type: "string", description: "搜索关键词或自然语言描述" },
        tags: { type: "array", items: { type: "string" }, description: "按标签过滤" },
        type: { type: "string", enum: ["note", "diary", "experience", "document"], description: "文档类型" },
        limit: { type: "number", description: "返回数量，默认5" },
      },
      required: ["query"],
      additionalProperties: false,
    }),
    execute: async (args: { query: string; tags?: string[]; type?: string; limit?: number }) => {
      const result = await listEntries(userId, {
        tagNames: args.tags,
        type: args.type as EntryType | undefined,
        pageSize: args.limit || 5,
      });
      const lowerQuery = args.query.toLowerCase();
      const scored = result.entries
        .map((e) => ({
          id: e.id,
          title: e.title,
          summary: e.summary,
          tags: e.tags.map((t) => t.name),
          notebook: e.notebook.name,
          updatedAt: e.updatedAt,
          score:
            (e.title.toLowerCase().includes(lowerQuery) ? 0.5 : 0) +
            (e.summary?.toLowerCase().includes(lowerQuery) ? 0.3 : 0) +
            0.1,
        }))
        .sort((a, b) => b.score - a.score);
      return { results: scored.slice(0, args.limit || 5), totalInLibrary: result.total };
    },
  },

  get_document: {
    description: "读取某篇文档的完整内容。在搜索到目标文档后使用。",
    parameters: jsonSchema<{ id: string }>({
      type: "object",
      properties: {
        id: { type: "string", description: "文档 ID" },
      },
      required: ["id"],
      additionalProperties: false,
    }),
    execute: async (args: { id: string }) => {
      const entry = await getEntry(userId, args.id, { mode: "full" });
      if (!entry) return { error: "文档不存在" };
      if (entry.mode === "full") {
        return {
          id: entry.id,
          title: entry.title,
          content: entry.content,
          tags: entry.tags.map((t: { name: string }) => t.name),
          notebook: entry.notebook.name,
          wordCount: entry.wordCount,
          updatedAt: entry.updatedAt,
        };
      }
      return {
        id: entry.id,
        title: entry.title,
        summary: entry.summary,
        sections: entry.sections,
        wordCount: entry.wordCount,
        note: "文档较长，已返回大纲。",
      };
    },
  },

  fetch_url: {
    description: "从 URL 链接中抓取内容并转换为 Markdown。用于用户提供链接让你整理的场景。",
    parameters: jsonSchema<{ url: string }>({
      type: "object",
      properties: {
        url: { type: "string", description: "要抓取的 URL 地址" },
      },
      required: ["url"],
      additionalProperties: false,
    }),
    execute: async (args: { url: string }) => {
      const result = await extractUrlContent(args.url);
      if ("error" in result) return { error: result.error };
      return {
        title: result.title,
        content:
          result.content.length > 8000
            ? result.content.slice(0, 8000) + "\n\n...(内容已截断)"
            : result.content,
        url: result.url,
        wordCount: result.wordCount,
      };
    },
  },

  create_document: {
    description: "创建新文档保存到知识库。",
    parameters: jsonSchema<{ title: string; content: string; tags?: string[]; type?: string; notebook_id?: string }>({
      type: "object",
      properties: {
        title: { type: "string", description: "文档标题" },
        content: { type: "string", description: "Markdown 正文" },
        tags: { type: "array", items: { type: "string" }, description: "标签" },
        type: { type: "string", enum: ["note", "diary", "experience", "document"], description: "文档类型，默认note" },
        notebook_id: { type: "string", description: "笔记本 ID" },
      },
      required: ["title", "content"],
      additionalProperties: false,
    }),
    execute: async (args: { title: string; content: string; tags?: string[]; type?: string; notebook_id?: string }) => {
      const result = await createEntry(userId, {
        title: args.title,
        content: args.content,
        tags: args.tags,
        type: (args.type || "note") as EntryType,
        notebookId: args.notebook_id,
        source: "agent",
      });
      return { id: result.id, title: result.title, message: `文档 "${result.title}" 已创建` };
    },
  },

  list_notebooks: {
    description: "查看用户的笔记本和标签结构。",
    parameters: jsonSchema<Record<string, never>>({
      type: "object",
      properties: {},
      additionalProperties: false,
    }),
    execute: async () => {
      const notebooks = await listNotebooks(userId);
      const tags = await listTags(userId);
      return {
        notebooks: notebooks.map((n) => ({ id: n.id, name: n.name, entryCount: n.entryCount })),
        tags: tags.map((t) => ({ name: t.name, count: t.count })),
      };
    },
  },
});

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;

  const { messages } = await req.json();
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: getChatModel(),
    system: `你是 NoteBrain 的 AI 助手，帮助用户管理和检索他们的知识库文档。

你的能力：
1. 搜索用户的文档库，找到相关资料来回答问题
2. 读取具体文档内容
3. 从 URL 链接中抓取和整理内容
4. 创建新文档保存整理好的内容
5. 查看用户的笔记本和标签结构

工作原则：
- 回答问题时，优先搜索用户的知识库，引用具体文档
- 如果用户给了一个 URL，主动抓取内容并提供整理
- 引用文档时标注文档标题，方便用户查看原文
- 回答用中文，格式用 Markdown
- 如果知识库中没有相关内容，诚实说明`,

    messages: modelMessages,

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: createTools(userId) as any,

    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
