import { apiGet } from "../client.js";

export const resources = {
  notebooks: {
    uri: "notebrain://notebooks",
    name: "笔记本列表",
    description: "当前用户的所有笔记本（名称、描述、文档数量）",
    mimeType: "application/json",
    handler: async () => {
      const res = await apiGet("/notebooks");
      return res.success
        ? JSON.stringify(res.data, null, 2)
        : JSON.stringify({ error: res.error });
    },
  },

  tags: {
    uri: "notebrain://tags",
    name: "标签列表",
    description: "当前用户的所有标签及使用次数",
    mimeType: "application/json",
    handler: async () => {
      const res = await apiGet("/tags");
      return res.success
        ? JSON.stringify(res.data, null, 2)
        : JSON.stringify({ error: res.error });
    },
  },

  recent_entries: {
    uri: "notebrain://recent-entries",
    name: "最近更新的文档",
    description: "最近更新的 10 篇文档摘要（标题、摘要、标签、更新时间）",
    mimeType: "application/json",
    handler: async () => {
      const res = await apiGet("/entries", {
        page_size: "10",
        sort_by: "updatedAt",
        sort_order: "desc",
      });
      return res.success
        ? JSON.stringify(res.data, null, 2)
        : JSON.stringify({ error: res.error });
    },
  },
};
