/**
 * @fileoverview Common types for LLM service abstraction.
 * 
 * Defines interfaces shared across all LLM providers (Gemini, OpenAI, Anthropic, Custom).
 * 
 * @module services/llm/types
 */

import type { Message } from '../../types/chat';

/**
 * Callbacks for handling streaming response events.
 */
export interface StreamCallbacks {
    /** Called for each token/chunk received */
    onToken: (token: string) => void;
    /** Called when the stream completes successfully */
    onComplete: () => void;
    /** Called when an error occurs (API or network) */
    onError: (error: string) => void;
}

/**
 * Configuration for LLM provider.
 */
export interface LlmConfig {
    /** API key for authentication */
    apiKey: string;
    /** Model identifier (e.g., "gpt-4o", "gemini-2.0-flash") */
    model: string;
    /** Base URL for API (used for custom OpenAI-compatible endpoints) */
    baseUrl?: string;
}

/**
 * Interface that all LLM providers must implement.
 */
export interface LlmProviderInterface {
    /**
     * Stream a chat completion from the LLM.
     */
    streamChat(
        config: LlmConfig,
        messages: Message[],
        callbacks: StreamCallbacks,
        systemPrompt?: string
    ): Promise<void>;

    /**
     * Generate a short title for a conversation.
     */
    generateTitle(
        config: LlmConfig,
        userMessage: string,
        assistantResponse: string
    ): Promise<string>;
}
