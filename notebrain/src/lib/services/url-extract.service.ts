/**
 * URL Content Extraction Service
 *
 * Fetches a URL and extracts the main text content as Markdown.
 * Uses built-in fetch + DOM parsing to avoid heavy dependencies.
 */

/**
 * Fetch URL and extract main content as clean text / markdown.
 */
export async function extractUrlContent(url: string): Promise<{
  title: string;
  content: string;
  url: string;
  wordCount: number;
} | { error: string }> {
  try {
    // Validate URL
    const parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return { error: "仅支持 HTTP/HTTPS 链接" };
    }

    // Fetch with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "NoteBrain/1.0 (Knowledge Management Bot)",
        Accept: "text/html,application/xhtml+xml,text/plain,application/json",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const contentType = response.headers.get("content-type") || "";
    const body = await response.text();

    // Handle JSON responses
    if (contentType.includes("application/json")) {
      const title = `JSON from ${parsedUrl.hostname}`;
      const content = "```json\n" + body.slice(0, 10000) + "\n```";
      return { title, content, url, wordCount: body.length };
    }

    // Handle plain text
    if (contentType.includes("text/plain")) {
      return {
        title: `Text from ${parsedUrl.hostname}`,
        content: body.slice(0, 50000),
        url,
        wordCount: body.split(/\s+/).length,
      };
    }

    // Handle HTML - extract main content
    const { title, content } = extractFromHtml(body, parsedUrl.hostname);

    return {
      title,
      content,
      url,
      wordCount: content.split(/\s+/).length,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "请求超时（15 秒）" };
    }
    return { error: `抓取失败: ${err instanceof Error ? err.message : "未知错误"}` };
  }
}

/**
 * Extract main content from HTML string.
 * Simple but effective: remove scripts/styles/nav, extract text blocks.
 */
function extractFromHtml(
  html: string,
  hostname: string
): { title: string; content: string } {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch
    ? decodeHtmlEntities(titleMatch[1].trim())
    : `Page from ${hostname}`;

  // Remove unwanted elements
  let cleaned = html
    // Remove scripts, styles, head, nav, footer, aside
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Convert headings to Markdown
  cleaned = cleaned.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n");
  cleaned = cleaned.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n");
  cleaned = cleaned.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n");
  cleaned = cleaned.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n#### $1\n");

  // Convert basic formatting
  cleaned = cleaned.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**");
  cleaned = cleaned.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**");
  cleaned = cleaned.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*");
  cleaned = cleaned.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*");
  cleaned = cleaned.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");

  // Convert links
  cleaned = cleaned.replace(
    /<a[^>]+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    "[$2]($1)"
  );

  // Convert lists
  cleaned = cleaned.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n");

  // Convert paragraphs and line breaks
  cleaned = cleaned.replace(/<p[^>]*>/gi, "\n\n");
  cleaned = cleaned.replace(/<\/p>/gi, "");
  cleaned = cleaned.replace(/<br\s*\/?>/gi, "\n");
  cleaned = cleaned.replace(/<hr\s*\/?>/gi, "\n---\n");

  // Convert pre/code blocks
  cleaned = cleaned.replace(
    /<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
    "\n```\n$1\n```\n"
  );
  cleaned = cleaned.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "\n```\n$1\n```\n");

  // Remove all remaining HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, "");

  // Decode HTML entities
  cleaned = decodeHtmlEntities(cleaned);

  // Clean up whitespace
  cleaned = cleaned
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Truncate if too long
  if (cleaned.length > 50000) {
    cleaned = cleaned.slice(0, 50000) + "\n\n...(内容已截断)";
  }

  return { title, content: cleaned };
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
}
