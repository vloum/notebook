# Agent 架构设计

> 分析 MCP 的定位、是否引入 LangChain/LangGraph、Q&A 能力设计

---

## 一、当前架构的问题

目前的 MCP Server 是一个 **被动工具集** —— Agent（如 Cursor 中的 Claude）调用 MCP Tools 来操作文档，但：

1. **MCP 只是工具层**：MCP 不负责"思考"，它只暴露 CRUD 能力，智能在 Agent 端
2. **没有内置 Q&A**：用户不能在 Web 端直接问"我之前写的 Redis 方案是什么"
3. **不能处理链接**：如果资料是一个 URL，没有能力抓取和整理内容
4. **没有多步推理**：简单搜索够用，但复杂任务（如"帮我对比这三篇文档的观点"）需要多步推理

---

## 二、要不要用 LangChain / LangGraph？

### LangChain

| 维度 | 评估 |
|------|------|
| 优点 | 成熟的 RAG 链、Document Loader 生态丰富（URL/PDF/HTML）、易接入多种 LLM |
| 缺点 | 库偏重（TypeScript 版 langchain.js 依赖多）、抽象层太厚容易过度封装 |
| **结论** | **不引入整个 LangChain，只用它的思路**。RAG 管道我们手写（就几十行），Document Loader 用轻量替代 |

### LangGraph

| 维度 | 评估 |
|------|------|
| 优点 | 有状态的多步 Agent 工作流、支持分支/循环/人工介入 |
| 缺点 | 复杂度高、TypeScript 支持弱于 Python 版、当前场景不需要 |
| **结论** | **Phase 1 不用**。当前场景（Q&A、URL 抓取、文档对比）用 Vercel AI SDK 的 Tool Calling 就够了。后续如果要做"自动每日整理""多 Agent 协作"再引入 |

### DeepAgent / Deep Research

| 维度 | 评估 |
|------|------|
| 优点 | 深度研究能力，多轮搜索+综合 |
| 缺点 | 通常是封装好的产品/API，不是框架；自建需要大量 prompt 工程 |
| **结论** | **不直接引入**。我们自建一个轻量的"深度搜索"链：多轮检索 + 综合回答，本质上就是 RAG + 迭代 |

---

## 三、推荐架构：Vercel AI SDK + 自建 RAG

### 为什么选 Vercel AI SDK (`ai` 包)

1. **Next.js 原生**：流式响应、Server Action、Edge Runtime 天然支持
2. **轻量**：不像 LangChain 那样层层包装，核心就是 `streamText()` + `tool()`
3. **多 LLM 支持**：OpenAI / Anthropic / 本地模型 都能接
4. **Tool Calling 内置**：Agent 可以在对话中调用我们的文档 API，实现多步推理

### 架构图

```
用户在 Web 端提问
    │
    ▼
/api/chat（Next.js Route Handler）
    │
    ├─ 1. 理解用户意图
    │
    ├─ 2. Tool Calling（AI 自主决定是否调用）
    │     ├─ search_documents  → 搜索知识库
    │     ├─ get_document      → 读取具体文档
    │     ├─ fetch_url         → 抓取 URL 内容
    │     └─ create_document   → 创建新文档（整理后保存）
    │
    ├─ 3. RAG 增强（检索到的文档注入上下文）
    │
    └─ 4. 流式生成回答 → 前端实时显示

MCP Server（不变）
    │
    └─ 外部 Agent（Cursor/Claude Desktop）通过 MCP 协议调用同一套 API
```

### 关键点

- **`/api/chat` 和 MCP Server 共享同一个后端 API**，不重复实现逻辑
- **Tool Calling 让 AI 自主决定**要不要搜索、要不要读文档、要不要抓 URL
- **流式输出**：用户看到 AI "边想边答"，体验好
- **URL 抓取**：作为一个 Tool 暴露给 AI，AI 判断需要时自动调用

---

## 四、新增的能力

### 4.1 Chat API (`/api/chat`)

流式对话接口，支持：
- 普通问答（纯 LLM 回答）
- RAG 问答（先搜索知识库再回答）
- 带 Tool 的多步推理（AI 自主调用搜索、读文档、抓 URL）
- 对话历史（前端维护，每次请求带上 messages）

### 4.2 URL 内容提取 (`fetch_url` tool)

当用户说"帮我整理这个链接的内容"时：
1. AI 调用 `fetch_url` tool
2. 后端抓取 URL → 提取正文（去掉导航、广告等）
3. 返回 Markdown 格式的正文
4. AI 整理后可以调用 `create_document` 保存为文档

### 4.3 前端 Chat 页面

在侧边栏加一个"AI 助手"入口，打开对话界面：
- 流式消息显示
- 支持引用文档（AI 回答中引用的文档可点击跳转）
- 对话历史（本地存储）
