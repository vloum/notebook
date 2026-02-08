import { z } from "zod";
import { apiGet } from "../client.js";

export const tagsTools = {
  tags_list: {
    description: "列出当前用户的所有标签及使用次数。",
    inputSchema: z.object({}),
    handler: async () => {
      const res = await apiGet("/tags");
      return res.success
        ? { content: [{ type: "text" as const, text: JSON.stringify(res.data, null, 2) }] }
        : { content: [{ type: "text" as const, text: `错误：${res.error}` }], isError: true };
    },
  },
};
