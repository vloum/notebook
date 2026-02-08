import type { SectionInfo } from "@/types";

/**
 * Count words in text (handles CJK characters and latin words)
 */
export function countWords(text: string): number {
  if (!text) return 0;
  // CJK characters count as 1 word each
  const cjk = text.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g);
  const cjkCount = cjk ? cjk.length : 0;
  // Latin words
  const stripped = text.replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g, " ");
  const words = stripped.split(/\s+/).filter((w) => w.length > 0);
  return cjkCount + words.length;
}

/**
 * Count total lines in content
 */
export function countLines(content: string): number {
  if (!content) return 0;
  return content.split("\n").length;
}

/**
 * Parse markdown content into sections based on ## headings.
 * 
 * Rules:
 * - # is treated as document title, not a section boundary
 * - ## headings define section boundaries
 * - ### and below belong to their parent ## section
 * - Content before the first ## is section 0 (intro)
 */
export function parseSections(content: string): SectionInfo[] {
  if (!content) return [];

  const lines = content.split("\n");
  const sections: SectionInfo[] = [];
  let currentSection: {
    heading: string;
    lineStart: number;
    lines: string[];
  } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h2Match = line.match(/^##\s+(.+)$/);

    if (h2Match) {
      // Close previous section
      if (currentSection) {
        sections.push(finishSection(currentSection, i - 1, sections.length));
      }
      // Start new section
      currentSection = {
        heading: h2Match[1].trim(),
        lineStart: i + 1, // 1-indexed
        lines: [line],
      };
    } else {
      // Skip # title line or add to current section
      const h1Match = line.match(/^#\s+(.+)$/);
      if (h1Match && sections.length === 0 && !currentSection) {
        // This is the document title, skip it for section purposes
        // but if there's content after it before first ##, that's section 0
        continue;
      }

      if (!currentSection) {
        // Content before first ## heading → section 0 (intro)
        currentSection = {
          heading: "(intro)",
          lineStart: i + 1,
          lines: [],
        };
      }
      currentSection.lines.push(line);
    }
  }

  // Close last section
  if (currentSection) {
    sections.push(finishSection(currentSection, lines.length - 1, sections.length));
  }

  return sections;
}

function finishSection(
  section: { heading: string; lineStart: number; lines: string[] },
  lastLineIndex: number,
  index: number
): SectionInfo {
  const content = section.lines.join("\n");
  return {
    index,
    heading: section.heading,
    lineStart: section.lineStart,
    lineEnd: lastLineIndex + 1, // 1-indexed
    wordCount: countWords(content),
  };
}

/**
 * Get content for specific line range (1-indexed, inclusive)
 * Returns content with line number prefixes: "  59| content here"
 */
export function getLineRange(
  content: string,
  offset: number,
  limit: number
): { content: string; hasMore: boolean } {
  const lines = content.split("\n");
  const startIdx = Math.max(0, offset - 1); // convert to 0-indexed
  const endIdx = Math.min(lines.length, startIdx + limit);
  const hasMore = endIdx < lines.length;

  const maxLineNum = endIdx;
  const padWidth = String(maxLineNum).length;

  const numberedLines = lines.slice(startIdx, endIdx).map((line, i) => {
    const lineNum = String(startIdx + i + 1).padStart(padWidth, " ");
    return `${lineNum}| ${line}`;
  });

  return {
    content: numberedLines.join("\n"),
    hasMore,
  };
}

/**
 * Get content for a specific section by index
 */
export function getSectionContent(
  content: string,
  sectionIndex: number
): { heading: string; content: string; lineStart: number; lineEnd: number; wordCount: number } | null {
  const sections = parseSections(content);
  const section = sections.find((s) => s.index === sectionIndex);
  if (!section) return null;

  const { content: lineContent } = getLineRange(
    content,
    section.lineStart,
    section.lineEnd - section.lineStart + 1
  );

  return {
    heading: section.heading,
    content: lineContent,
    lineStart: section.lineStart,
    lineEnd: section.lineEnd,
    wordCount: section.wordCount,
  };
}

/**
 * Replace a section's content in the full document
 */
export function replaceSectionContent(
  fullContent: string,
  sectionIndex: number,
  newSectionContent: string
): string | null {
  const sections = parseSections(fullContent);
  const section = sections.find((s) => s.index === sectionIndex);
  if (!section) return null;

  const lines = fullContent.split("\n");
  const before = lines.slice(0, section.lineStart - 1);
  const after = lines.slice(section.lineEnd);
  const newLines = newSectionContent.split("\n");

  return [...before, ...newLines, ...after].join("\n");
}

/**
 * Perform exact text replacement in content.
 * Returns null if old_text not found or found multiple times.
 */
export function replaceExactText(
  content: string,
  oldText: string,
  newText: string
): { content: string; error?: never } | { content?: never; error: string } {
  const count = content.split(oldText).length - 1;

  if (count === 0) {
    return { error: "未找到匹配文本" };
  }
  if (count > 1) {
    return { error: `匹配到 ${count} 处，请提供更长的上下文以唯一定位` };
  }

  return { content: content.replace(oldText, newText) };
}
