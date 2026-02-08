#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { entriesTools } from "./tools/entries.js";
import { notebooksTools } from "./tools/notebooks.js";
import { tagsTools } from "./tools/tags.js";
import { relationsTools } from "./tools/relations.js";
import { utilsTools } from "./tools/utils.js";
import { resources } from "./resources/index.js";

// Create MCP server
const server = new McpServer({
  name: "notebrain",
  version: "0.1.0",
});

// ============================================================
// Register all tools
// ============================================================
const allTools = {
  ...entriesTools,
  ...notebooksTools,
  ...tagsTools,
  ...relationsTools,
  ...utilsTools,
};

for (const [name, tool] of Object.entries(allTools)) {
  server.tool(
    name,
    tool.description,
    tool.inputSchema.shape,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tool.handler as any
  );
}

// ============================================================
// Register all resources
// ============================================================
for (const [, resource] of Object.entries(resources)) {
  server.resource(
    resource.name,
    resource.uri,
    { mimeType: resource.mimeType, description: resource.description },
    async () => ({
      contents: [
        {
          uri: resource.uri,
          mimeType: resource.mimeType,
          text: await resource.handler(),
        },
      ],
    })
  );
}

// ============================================================
// Start server
// ============================================================
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("NoteBrain MCP Server started");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
