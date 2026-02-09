import { streamText, convertToModelMessages, stepCountIs, tool } from "ai";
import { z } from "zod";
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/api-key";
import { getChatModel } from "@/lib/ai/provider";
import { listEntries, getEntry, createEntry } from "@/lib/services/entry.service";
import { listNotebooks } from "@/lib/services/notebook.service";
import { listTags } from "@/lib/services/tag.service";
import { extractUrlContent } from "@/lib/services/url-extract.service";
import type { EntryType } from "@/generated/prisma/enums";

/*
 * AI SDK v6 tool() has a known TypeScript generics issue with zod v4:
 * The execute callback can't be inferred from zod v4 schemas.
 * The workaround is to type-assert the tool definition objects.
 * Runtime is fully correct — verified with direct JSON Schema output tests.
 */

// Helper to create a tool with zod v4 (bypasses the TS inference issue)
function defineTool<TParams, TResult>(def: {
  description: string;
  parameters: z.ZodType<TParams>;
  execute: (args: TParams) => Promise<TResult>;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return tool(def as any);
}

function createTools(userId: string) {
  return {
    search_documents: defineTool({
      description: "搜索用户的知识库文档。根据查询内容返回最相关的文档列表。",
      parameters: z.object({
        query: z.string().describe("搜索关键词或自然语言描述"),
        tags: z.array(z.string()).optional().describe("按标签过滤"),
        type: z.enum(["note", "diary", "experience", "document"]).optional().describe("文档类型"),
        limit: z.number().optional().describe("返回数量，默认5"),
      }),
      execute: async ({ query, tags, type, limit }) => {
        const result = await listEntries(userId, {
          tagNames: tags,
          type: type as EntryType | undefined,
          pageSize: limit || 5,
        });
        const lowerQuery = query.toLowerCase();
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
        return { results: scored.slice(0, limit || 5), totalInLibrary: result.total };
      },
    }),

    get_document: defineTool({
      description: "读取某篇文档的完整内容。在搜索到目标文档后使用。",
      parameters: z.object({
        id: z.string().describe("文档 ID"),
      }),
      execute: async ({ id }) => {
        const entry = await getEntry(userId, id, { mode: "full" });
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
    }),

    fetch_url: defineTool({
      description: "从 URL 链接中抓取内容并转换为 Markdown。用于用户提供链接让你整理的场景。",
      parameters: z.object({
        url: z.string().describe("要抓取的 URL 地址"),
      }),
      execute: async ({ url }) => {
        const result = await extractUrlContent(url);
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
    }),

    create_document: defineTool({
      description: "创建新文档保存到知识库。",
      parameters: z.object({
        title: z.string().describe("文档标题"),
        content: z.string().describe("Markdown 正文"),
        tags: z.array(z.string()).optional().describe("标签"),
        type: z.enum(["note", "diary", "experience", "document"]).optional().describe("文档类型，默认note"),
        notebook_id: z.string().optional().describe("笔记本 ID"),
      }),
      execute: async ({ title, content, tags, type, notebook_id }) => {
        const result = await createEntry(userId, {
          title,
          content,
          tags,
          type: (type || "note") as EntryType,
          notebookId: notebook_id,
          source: "agent",
        });
        return { id: result.id, title: result.title, message: `文档 "${result.title}" 已创建` };
      },
    }),

    list_notebooks: defineTool({
      description: "查看用户的笔记本和标签结构。",
      parameters: z.object({}),
      execute: async () => {
        const notebooks = await listNotebooks(userId);
        const tags = await listTags(userId);
        return {
          notebooks: notebooks.map((n) => ({ id: n.id, name: n.name, entryCount: n.entryCount })),
          tags: tags.map((t) => ({ name: t.name, count: t.count })),
        };
      },
    }),
  };
}

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
    tools: createTools(userId),
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
