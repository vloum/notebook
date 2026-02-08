/**
 * AI Model Provider Configuration
 *
 * Supports any OpenAI-compatible API via environment variables:
 *   - AI_BASE_URL: Custom API base URL (default: https://api.openai.com/v1)
 *   - AI_API_KEY: API key for the provider
 *   - AI_MODEL: Model name (default: gpt-4o-mini)
 *
 * Compatible with: OpenAI, DeepSeek, Moonshot, Ollama, vLLM,
 *   Azure OpenAI (via compatible endpoint), any OpenAI-compatible API
 */

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

function getProvider() {
  const baseURL = process.env.AI_BASE_URL || "https://api.openai.com/v1";
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || "";
  const providerName = process.env.AI_PROVIDER_NAME || "custom";

  return createOpenAICompatible({
    name: providerName,
    baseURL,
    apiKey,
  });
}

/**
 * Get the configured chat model.
 * Uses AI_MODEL env var, or falls back to "gpt-4o-mini".
 */
export function getChatModel() {
  const provider = getProvider();
  const modelId = process.env.AI_MODEL || "gpt-4o-mini";
  return provider.chatModel(modelId);
}

/**
 * Get the configured embedding model (for Phase 2).
 * Uses AI_EMBEDDING_MODEL env var.
 */
export function getEmbeddingModel() {
  const provider = getProvider();
  const modelId = process.env.AI_EMBEDDING_MODEL || "text-embedding-3-small";
  return provider.textEmbeddingModel(modelId);
}
