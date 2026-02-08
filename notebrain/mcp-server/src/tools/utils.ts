import { z } from "zod";
import { apiPost } from "../client.js";

export const utilsTools = {
  fetch_url: {
    description:
      "从 URL 链接中抓取内容并转换为 Markdown 文本。" +
      "用于用户提供链接让 Agent 整理内容的场景。" +
      "抓取后可以配合 entry_create 将整理好的内容保存为文档。",
    inputSchema: z.object({
      url: z.string().url().describe("要抓取的 URL 地址"),
    }),
    handler: async (args: { url: string }) => {
      const res = await apiPost("/chat/extract-url", { url: args.url });
      return res.success
        ? { content: [{ type: "text" as const, text: JSON.stringify(res.data, null, 2) }] }
        : { content: [{ type: "text" as const, text: `错误：${res.error}` }], isError: true };
    },
  },
};
