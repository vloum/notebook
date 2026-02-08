import { z } from "zod";
import { apiGet, apiPost, apiPut, apiDelete } from "../client.js";

export const notebooksTools = {
  notebooks_list: {
    description: "列出当前用户的所有笔记本（名称、描述、文档数量）。",
    inputSchema: z.object({}),
    handler: async () => {
      const res = await apiGet("/notebooks");
      return res.success
        ? { content: [{ type: "text" as const, text: JSON.stringify(res.data, null, 2) }] }
        : { content: [{ type: "text" as const, text: `错误：${res.error}` }], isError: true };
    },
  },

  notebook_create: {
    description: "创建新笔记本。",
    inputSchema: z.object({
      name: z.string().describe("笔记本名称"),
      description: z.string().optional().describe("描述"),
      icon: z.string().optional().describe("图标 emoji"),
    }),
    handler: async (args: {
      name: string;
      description?: string;
      icon?: string;
    }) => {
      const res = await apiPost("/notebooks", args);
      return res.success
        ? { content: [{ type: "text" as const, text: JSON.stringify(res.data, null, 2) }] }
        : { content: [{ type: "text" as const, text: `错误：${res.error}` }], isError: true };
    },
  },

  notebook_update: {
    description: "更新笔记本信息。",
    inputSchema: z.object({
      id: z.string().describe("笔记本 ID"),
      name: z.string().optional(),
      description: z.string().optional(),
      icon: z.string().optional(),
    }),
    handler: async (args: {
      id: string;
      name?: string;
      description?: string;
      icon?: string;
    }) => {
      const { id, ...body } = args;
      const res = await apiPut(`/notebooks/${id}`, body);
      return res.success
        ? { content: [{ type: "text" as const, text: JSON.stringify(res.data, null, 2) }] }
        : { content: [{ type: "text" as const, text: `错误：${res.error}` }], isError: true };
    },
  },

  notebook_delete: {
    description: "删除笔记本（其中的文档会移到默认笔记本，不会删除文档）。",
    inputSchema: z.object({
      id: z.string().describe("笔记本 ID"),
    }),
    handler: async (args: { id: string }) => {
      const res = await apiDelete(`/notebooks/${args.id}`);
      return res.success
        ? { content: [{ type: "text" as const, text: "笔记本已删除" }] }
        : { content: [{ type: "text" as const, text: `错误：${res.error}` }], isError: true };
    },
  },
};
