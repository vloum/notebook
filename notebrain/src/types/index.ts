import type { EntryType, EntrySource, RelationType } from "@/generated/prisma/enums";

// ============================================================
// API Response types
// ============================================================
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================
// Entry types
// ============================================================
export interface EntryListItem {
  id: string;
  title: string;
  summary: string | null;
  type: EntryType;
  source: EntrySource;
  wordCount: number;
  isPinned: boolean;
  tags: { id: string; name: string; color: string | null }[];
  notebook: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface SectionInfo {
  index: number;
  heading: string;
  lineStart: number;
  lineEnd: number;
  wordCount: number;
}

export interface EntryFull {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  type: EntryType;
  source: EntrySource;
  version: number;
  wordCount: number;
  totalLines: number;
  tags: { id: string; name: string; color: string | null }[];
  notebook: { id: string; name: string };
  relations: EntryRelationItem[];
  createdAt: string;
  updatedAt: string;
}

export interface EntryOutline {
  id: string;
  title: string;
  summary: string | null;
  type: EntryType;
  source: EntrySource;
  version: number;
  wordCount: number;
  totalLines: number;
  sections: SectionInfo[];
  tags: { id: string; name: string; color: string | null }[];
  notebook: { id: string; name: string };
  relations: EntryRelationItem[];
  createdAt: string;
  updatedAt: string;
}

export interface EntryPage {
  id: string;
  title: string;
  version: number;
  totalLines: number;
  showing: { offset: number; limit: number; hasMore: boolean };
  content: string;
}

export interface EntryRelationItem {
  relationId: string;
  targetId: string;
  targetTitle: string;
  targetSummary: string | null;
  type: RelationType;
  direction: "outgoing" | "incoming";
  createdAt: string;
}

// ============================================================
// Notebook types
// ============================================================
export interface NotebookItem {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  isDefault: boolean;
  entryCount: number;
  createdAt: string;
}

// ============================================================
// Tag types
// ============================================================
export interface TagItem {
  id: string;
  name: string;
  color: string | null;
  count: number;
}

// ============================================================
// Agent Log types
// ============================================================
export interface AgentLogItem {
  id: string;
  action: string;
  entryId: string | null;
  entryTitle: string | null;
  summary: string | null;
  diffStats: { addedWords?: number; removedWords?: number } | null;
  createdAt: string;
}

// ============================================================
// API Key types
// ============================================================
export interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ApiKeyCreated {
  id: string;
  name: string;
  key: string; // full key, shown only once
  keyPrefix: string;
  createdAt: string;
}

// Re-export enums
export type { EntryType, EntrySource, RelationType };
