import { z } from "zod";
import { apiGet, apiPost, apiDelete } from "../client.js";

export const relationsTools = {
  entry_relations_list: {
    description:
      "查看某文档的所有关联（出边 + 入边）。返回关联类型和方向。",
    inputSchema: z.object({
      id: z.string().describe("文档 ID"),
    }),
    handler: async (args: { id: string }) => {
      const res = await apiGet(`/entries/${args.id}/relations`);
      return res.success
        ? { content: [{ type: "text" as const, text: JSON.stringify(res.data, null, 2) }] }
        : { content: [{ type: "text" as const, text: `错误：${res.error}` }], isError: true };
    },
  },

  entry_relation_create: {
    description:
      "创建两篇文档之间的关联。类型：references(引用), continues(续写), " +
      "related(相关), contradicts(修正), summarizes(总结)。",
    inputSchema: z.object({
      from_id: z.string().describe("来源文档 ID"),
      to_id: z.string().describe("目标文档 ID"),
      type: z
        .enum([
          "references",
          "continues",
          "related",
          "contradicts",
          "summarizes",
        ])
        .describe("关联类型"),
    }),
    handler: async (args: {
      from_id: string;
      to_id: string;
      type: string;
    }) => {
      const res = await apiPost(`/entries/${args.from_id}/relations`, {
        to_id: args.to_id,
        type: args.type,
      });
      return res.success
        ? { content: [{ type: "text" as const, text: JSON.stringify(res.data, null, 2) }] }
        : { content: [{ type: "text" as const, text: `错误：${res.error}` }], isError: true };
    },
  },

  entry_relation_delete: {
    description: "删除文档关联。",
    inputSchema: z.object({
      entry_id: z.string().describe("文档 ID"),
      relation_id: z.string().describe("关联 ID"),
    }),
    handler: async (args: { entry_id: string; relation_id: string }) => {
      const res = await apiDelete(
        `/entries/${args.entry_id}/relations/${args.relation_id}`
      );
      return res.success
        ? { content: [{ type: "text" as const, text: "关联已删除" }] }
        : { content: [{ type: "text" as const, text: `错误：${res.error}` }], isError: true };
    },
  },
};
