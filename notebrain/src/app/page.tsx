import Link from "next/link";
import Image from "next/image";
import {
  Brain,
  FileText,
  Search,
  MessageSquare,
  Link2,
  BookOpen,
  Tag,
  GitBranch,
  Shield,
  Zap,
  ArrowRight,
  Terminal,
  ChevronRight,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ==================== Navbar ==================== */}
      <nav className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="NoteBrain" width={32} height={32} />
            <span className="font-bold text-lg">NoteBrain</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
            >
              登录
            </Link>
            <Link
              href="/register"
              className="text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-4 py-1.5 rounded-lg font-medium"
            >
              免费注册
            </Link>
          </div>
        </div>
      </nav>

      {/* ==================== Hero ==================== */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 border border-border rounded-full px-4 py-1.5 text-sm text-muted-foreground mb-8">
            <Zap className="h-3.5 w-3.5 text-yellow-500" />
            AI + MCP 驱动的知识管理
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            让 AI 帮你管理
            <br />
            <span className="text-primary">每一篇笔记</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            通过 MCP 协议连接 Cursor、Claude Desktop 等 AI 工具，
            用一句话搜索、更新、整理你的知识库。
            支持任意 OpenAI 兼容模型。
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-6 py-3 rounded-lg font-medium text-base"
            >
              开始使用
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="https://github.com/vloum/notebook"
              target="_blank"
              className="inline-flex items-center gap-2 border border-border hover:bg-accent transition-colors px-6 py-3 rounded-lg font-medium text-base"
            >
              <Terminal className="h-4 w-4" />
              GitHub
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== Features ==================== */}
      <section className="py-20 px-6 border-t border-border/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">核心能力</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              不只是笔记本，而是一个 AI 能理解和操作的知识管理系统
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <FileText className="h-6 w-6" />,
                title: "Markdown 文档",
                desc: "用 Markdown 书写一切——笔记、日记、技术文档、经验总结。支持代码高亮、表格、GFM。",
              },
              {
                icon: <Search className="h-6 w-6" />,
                title: "语义搜索",
                desc: "一句话描述你要找的内容，AI 通过向量 + 全文混合检索帮你精准定位。",
              },
              {
                icon: <MessageSquare className="h-6 w-6" />,
                title: "AI 问答助手",
                desc: "在 Web 端直接和 AI 对话，它会搜索你的知识库来回答问题、整理资料。",
              },
              {
                icon: <Terminal className="h-6 w-6" />,
                title: "MCP 协议支持",
                desc: "在 Cursor / Claude Desktop 中通过 MCP 协议操作文档——搜索、读取、修改、创建。",
              },
              {
                icon: <Link2 className="h-6 w-6" />,
                title: "URL 内容抓取",
                desc: "给 AI 一个链接，自动抓取网页内容、去除广告导航、转为 Markdown 并保存。",
              },
              {
                icon: <BookOpen className="h-6 w-6" />,
                title: "笔记本组织",
                desc: "用笔记本分类、标签标记、文档间建立引用/续写/相关等关联关系。",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group rounded-xl border border-border p-6 hover:border-primary/30 hover:bg-accent/30 transition-all"
              >
                <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== How MCP Works ==================== */}
      <section className="py-20 px-6 bg-muted/30 border-t border-border/40">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Agent 怎么操作你的知识库</h2>
            <p className="text-muted-foreground">
              通过 MCP 协议，AI Agent 可以像你的助手一样管理文档
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                step: "1",
                title: "你对 Agent 说",
                content: '"帮我找一下上周写的 Redis 缓存策略，在踩坑记录里加一条新的坑"',
                color: "bg-blue-500",
              },
              {
                step: "2",
                title: "Agent 搜索知识库",
                content:
                  "调用 entries_search → 混合检索（语义 + 关键词 + 元数据过滤）→ 找到目标文档",
                color: "bg-yellow-500",
              },
              {
                step: "3",
                title: "Agent 读取并修改",
                content:
                  "调用 entry_get → 按 section 分段读取 → entry_replace 精确替换 → 只改需要改的部分",
                color: "bg-green-500",
              },
              {
                step: "4",
                title: "你在前端看到更新",
                content:
                  "底部日志滚动条实时显示操作记录，打开文档即可看到 AI 的修改 + 版本对比",
                color: "bg-purple-500",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex gap-4 items-start rounded-xl border border-border bg-background p-5"
              >
                <div
                  className={`${item.color} text-white h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0`}
                >
                  {item.step}
                </div>
                <div>
                  <h4 className="font-medium mb-1">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== Tech Stack ==================== */}
      <section className="py-20 px-6 border-t border-border/40">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">技术选型</h2>
            <p className="text-muted-foreground">生产级全栈 TypeScript 架构</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { name: "Next.js 16", desc: "全栈框架" },
              { name: "React 19", desc: "UI 层" },
              { name: "PostgreSQL 17", desc: "数据库" },
              { name: "pgvector", desc: "向量搜索" },
              { name: "Prisma 7", desc: "ORM" },
              { name: "AI SDK 6", desc: "LLM 集成" },
              { name: "MCP", desc: "Agent 协议" },
              { name: "Docker", desc: "容器化部署" },
            ].map((tech, i) => (
              <div
                key={i}
                className="rounded-lg border border-border p-4 text-center"
              >
                <p className="font-medium text-sm">{tech.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== MCP Config Preview ==================== */}
      <section className="py-20 px-6 bg-muted/30 border-t border-border/40">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">三步接入 MCP</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    1
                  </div>
                  <p className="text-sm">注册账号，在设置页生成 API 密钥</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    2
                  </div>
                  <p className="text-sm">复制 MCP 配置到 Cursor 或 Claude Desktop</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    3
                  </div>
                  <p className="text-sm">开始用自然语言管理你的知识库</p>
                </div>
              </div>
            </div>
            <div className="bg-background rounded-xl border border-border p-5 font-mono text-xs overflow-x-auto">
              <p className="text-muted-foreground mb-2">// Cursor MCP 配置</p>
              <pre className="text-foreground">{`{
  "mcpServers": {
    "notebrain": {
      "command": "npx",
      "args": ["-y", "notebrain-mcp"],
      "env": {
        "NOTEBRAIN_API_KEY": "nb_sk_...",
        "NOTEBRAIN_API_URL": "https://..."
      }
    }
  }
}`}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== Open Source ==================== */}
      <section className="py-20 px-6 border-t border-border/40">
        <div className="max-w-3xl mx-auto text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-4">开源 & 自托管</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto leading-relaxed">
            完整代码开源在 GitHub，你可以 Docker Compose 一键部署到自己的服务器。
            数据完全在你自己手里，支持定时备份和恢复。
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-6 py-3 rounded-lg font-medium"
            >
              立即开始
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              href="https://github.com/vloum/notebook"
              target="_blank"
              className="inline-flex items-center gap-2 border border-border hover:bg-accent transition-colors px-6 py-3 rounded-lg font-medium"
            >
              <GitBranch className="h-4 w-4" />
              查看源码
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== Footer ==================== */}
      <footer className="border-t border-border/40 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Brain className="h-4 w-4" />
            <span>NoteBrain</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link
              href="https://github.com/vloum/notebook"
              target="_blank"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </Link>
            <span>MIT License</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
