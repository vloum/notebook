import { z } from "zod";
import { apiGet, apiPost, apiPut, apiDelete } from "../client.js";

export const entriesTools = {
  entries_search: {
    description:
      "搜索文档。支持自然语言查询 + 元数据过滤（笔记本、标签、类型、时间范围）。返回最相关的文档列表。",
    inputSchema: z.object({
      query: z.string().describe("自然语言查询"),
      filters: z
        .object({
          notebook_id: z.string().optional().describe("笔记本 ID"),
          tags: z.array(z.string()).optional().describe("标签名数组"),
          type: z
            .enum(["note", "diary", "experience", "document"])
            .optional()
            .describe("文档类型"),
          date_from: z.string().optional().describe("起始日期 (ISO)"),
          date_to: z.string().optional().describe("结束日期 (ISO)"),
        })
        .optional()
        .describe("过滤条件"),
      limit: z.number().optional().default(5).describe("返回数量，默认 5"),
    }),
    handler: async (args: {
      query: string;
      filters?: Record<string, unknown>;
      limit?: number;
    }) => {
      const res = await apiPost("/entries/search", args);
      return res.success
        ? { content: [{ type: "text" as const, text: JSON.stringify(res.data, null, 2) }] }
        : { content: [{ type: "text" as const, text: `错误：${res.error}` }], isError: true };
    },
  },

  entries_list: {
    description:
      "列出文档（纯元数据，不走语义搜索）。支持按笔记本、标签、类型过滤，分页和排序。",
    inputSchema: z.object({
      notebook_id: z.string().optional().describe("笔记本 ID"),
      tags: z.string().optional().describe("标签名，逗号分隔"),
      type: z
        .enum(["note", "diary", "experience", "document"])
        .optional(),
      sort_by: z
        .enum(["updatedAt", "createdAt", "title"])
        .optional()
        .default("updatedAt"),
      sort_order: z.enum(["asc", "desc"]).optional().default("desc"),
      page: z.number().optional().default(1),
      page_size: z.number().optional().default(20),
    }),
    handler: async (args: Record<string, string | number | undefined>) => {
      const params: Record<string, string> = {};
      for (const [k, v] of Object.entries(args)) {
        if (v !== undefined) params[k] = String(v);
      }
      const res = await apiGet("/entries", params);
      return res.success
        ? { content: [{ type: "text" as const, text: JSON.stringify(res.data, null, 2) }] }
        : { content: [{ type: "text" as const, text: `错误：${res.error}` }], isError: true };
    },
  },

  entry_get: {
    description:
      "获取单篇文档。短文档返回全文；长文档默认返回大纲（含 section 列表和行号）。" +
      "传 offset+limit 可分页读取指定行范围（内容带行号前缀）。",
    inputSchema: z.object({
      id: z.string().describe("文档 ID"),
      mode: z
        .enum(["full", "outline"])
        .optional()
        .describe("读取模式：full=全文, outline=大纲。不传则自动判断"),
      offset: z
        .number()
        .optional()
        .describe("起始行号（从 1 开始）。传入时忽略 mode，返回指定行范围"),
      limit: z
        .number()
        .optional()
        .describe("读取行数，默认 100。需配合 offset 使用"),
    }),
    handler: async (args: {
      id: string;
      mode?: string;
      offset?: number;
      limit?: number;
    }) => {
      const params: Record<string, string> = {};
      if (args.mode) params.mode = args.mode;
      if (args.offset !== undefined) params.offset = String(args.offset);
      if (args.limit !== undefined) params.limit = String(args.limit);

      const res = await apiGet(`/entries/${args.id}`, params);
      return res.success
        ? { content: [{ type: "text" as const, text: JSON.stringify(res.data, null, 2) }] }
        : { content: [{ type: "text" as const, text: `错误：${res.error}` }], isError: true };
    },
  },

  entry_get_section: {
    description:
      "获取文档的某个 section（按大纲中的 section index）。返回内容带行号前缀。" +
      "是 entry_get(offset, limit) 的语法糖。",
    inputSchema: z.object({
      id: z.string().describe("文档 ID"),
      section_index: z.number().describe("section 序号（从大纲的 sections 列表获取）"),
    }),
    handler: async (args: { id: string; section_index: number }) => {
      const res = await apiGet(
        `/entries/${args.id}/sections/${args.section_index}`
      );
      return res.success
        ? { content: [{ type: "text" as const, text: JSON.stringify(res.data, null, 2) }] }
        : { content: [{ type: "text" as const, text: `错误：${res.error}` }], isError: true };
    },
  },

  entry_create: {
    description: "创建新文档。标题和内容为必填，标签会自动创建（如果不存在）。",
    inputSchema: z.object({
      title: z.string().describe("文档标题"),
      content: z.string().describe("Markdown 正文"),
      notebook_id: z.string().optional().describe("笔记本 ID，不传则放入默认笔记本"),
      tags: z.array(z.string()).optional().describe("标签名数组"),
      type: z
        .enum(["note", "diary", "experience", "document"])
        .optional()
        .default("note"),
      summary: z.string().optional().describe("摘要，不传则自动生成"),
    }),
    handler: async (args: Record<string, unknown>) => {
      const res = await apiPost("/entries", { ...args, source: "agent" });
      return res.success
        ? { content: [{ type: "text" as const, text: JSON.stringify(res.data, null, 2) }] }
        : { content: [{ type: "text" as const, text: `错误：${res.error}` }], isError: true };
    },
  },

  entry_update: {
    description:
      "更新文档（整篇替换或修改字段）。version 为必填（乐观锁）。" +
      "可同时更新 title, content, tags, notebook_id, type。",
    inputSchema: z.object({
      id: z.string().describe("文档 ID"),
      version: z.number().describe("当前版本号（乐观锁，从 entry_get 获取）"),
      title: z.string().optional(),
      content: z.string().optional().describe("新的完整 Markdown 正文"),
      summary: z.string().optional(),
      tags: z.array(z.string()).optional().describe("标签数组，传则整体替换"),
      notebook_id: z.string().optional(),
      type: z.enum(["note", "diary", "experience", "document"]).optional(),
      change_summary: z.string().optional().describe("变更说明"),
    }),
    handler: async (args: { id: string; [key: string]: unknown }) => {
      const { id, ...body } = args;
      const res = await apiPut(`/entries/${id}`, { ...body, source: "agent" });
      return res.success
        ? { content: [{ type: "text" as const, text: JSON.stringify(res.data, null, 2) }] }
        : { content: [{ type: "text" as const, text: `错误：${res.error}` }], isError: true };
    },
  },

  entry_append: {
    description: "追加内容到文档末尾。",
    inputSchema: z.object({
      id: z.string().describe("文档 ID"),
      content: z.string().describe("追加的 Markdown 内容"),
      version: z.number().describe("当前版本号"),
    }),
    handler: async (args: {
      id: string;
      content: string;
      version: number;
    }) => {
      const res = await apiPost(`/entries/${args.id}/append`, {
        content: args.content,
        version: args.version,
        source: "agent",
      });
      return res.success
        ? { content: [{ type: "text" as const, text: JSON.stringify(res.data, null, 2) }] }
        : { content: [{ type: "text" as const, text: `错误：${res.error}` }], isError: true };
    },
  },

  entry_update_section: {
    description: "更新文档的某个 section（按 section index 替换整段内容）。",
    inputSchema: z.object({
      id: z.string().describe("文档 ID"),
      section_index: z.number().describe("section 序号"),
      content: z.string().describe("该 section 的新内容"),
      version: z.number().describe("当前版本号"),
    }),
    handler: async (args: {
      id: string;
      section_index: number;
      content: string;
      version: number;
    }) => {
      const res = await apiPut(
        `/entries/${args.id}/sections/${args.section_index}`,
        { content: args.content, version: args.version, source: "agent" }
      );
      return res.success
        ? { content: [{ type: "text" as const, text: JSON.stringify(res.data, null, 2) }] }
        : { content: [{ type: "text" as const, text: `错误：${res.error}` }], isError: true };
    },
  },

  entry_replace: {
    description:
      "在文档中做精确文本替换（类似 StrReplace）。old_text 必须在文档中唯一匹配。" +
      "建议先用 entry_get(offset, limit) 看到带行号的内容，再精确拷贝 old_text。",
    inputSchema: z.object({
      id: z.string().describe("文档 ID"),
      old_text: z
        .string()
        .describe("要替换的原文（必须在文档中唯一匹配）"),
      new_text: z.string().describe("替换后的内容"),
      version: z.number().describe("当前版本号"),
    }),
    handler: async (args: {
      id: string;
      old_text: string;
      new_text: string;
      version: number;
    }) => {
      const res = await apiPost(`/entries/${args.id}/replace`, {
        old_text: args.old_text,
        new_text: args.new_text,
        version: args.version,
        source: "agent",
      });
      return res.success
        ? { content: [{ type: "text" as const, text: JSON.stringify(res.data, null, 2) }] }
        : { content: [{ type: "text" as const, text: `错误：${res.error}` }], isError: true };
    },
  },

  entry_delete: {
    description: "删除文档。",
    inputSchema: z.object({
      id: z.string().describe("文档 ID"),
    }),
    handler: async (args: { id: string }) => {
      const res = await apiDelete(`/entries/${args.id}`);
      return res.success
        ? { content: [{ type: "text" as const, text: "文档已删除" }] }
        : { content: [{ type: "text" as const, text: `错误：${res.error}` }], isError: true };
    },
  },
};
