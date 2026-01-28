/**
 * @fileoverview LLM provider factory.
 * 
 * Provides a unified interface to access different LLM providers.
 * Use getProvider() to get the appropriate service for a given provider type.
 * 
 * @module services/llm
 * 
 * @example
 * ```typescript
 * import { getProvider, generateTitle } from './services/llm';
 * 
 * const provider = getProvider('openai');
 * await provider.streamChat(config, messages, callbacks, systemPrompt);
 * 
 * // Generate a title using the same provider
 * const title = await generateTitle(config, 'openai', userMsg, assistantMsg);
 * ```
 */

import * as gemini from './gemini';
import * as openai from './openai';
import * as anthropic from './anthropic';
import type { LlmProvider } from '../../types/settings';
import type { LlmConfig, StreamCallbacks } from './types';
import type { Message } from '../../types/chat';

export type { LlmConfig, StreamCallbacks } from './types';

/**
 * Provider interface returned by getProvider().
 */
export interface Provider {
    streamChat(
        config: LlmConfig,
        messages: Message[],
        callbacks: StreamCallbacks,
        systemPrompt?: string
    ): Promise<void>;

    simpleCompletion(
        config: LlmConfig,
        prompt: string
    ): Promise<string>;
}

/**
 * Get the LLM provider service for a given provider type.
 * 
 * @param provider - The provider type ('gemini', 'openai', 'anthropic', 'custom')
 * @returns The provider service module
 * @throws Error if provider is unknown
 */
export function getProvider(provider: LlmProvider): Provider {
    switch (provider) {
        case 'gemini':
            return gemini;
        case 'openai':
            return openai;
        case 'anthropic':
            return anthropic;
        case 'custom':
            // Custom uses OpenAI-compatible format
            return openai;
        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}

/**
 * The prompt used to generate conversation titles.
 * Centralized here to ensure consistency across all providers.
 */
const TITLE_PROMPT_TEMPLATE = (userMessage: string) =>
    `Generate a very short, concise title (3-5 words) for this user question. You should only output the title and nothing else. Even if the user message is vague or irrelevent, generate a title.\nUser: ${userMessage}`;

/**
 * Clean up the generated title by removing common artifacts.
 */
function cleanTitle(title: string): string {
    return title
        .replace(/^Title:\s*/i, '')
        .replace(/["']/g, '')
        .trim();
}

/**
 * Generate a short title for a conversation.
 * 
 * This is a shared utility that works with any provider.
 * Each provider's simpleCompletion handles the API specifics,
 * while this function handles the prompt and cleanup logic.
 * 
 * @param config - LLM configuration
 * @param provider - The provider type to use
 * @param userMessage - The user's first message
 * @returns Generated title (3-5 words) or empty string on error
 */
export async function generateTitle(
    config: LlmConfig,
    provider: LlmProvider,
    userMessage: string,
): Promise<string> {
    const llmProvider = getProvider(provider);
    const prompt = TITLE_PROMPT_TEMPLATE(userMessage);

    const rawTitle = await llmProvider.simpleCompletion(config, prompt);
    return cleanTitle(rawTitle);
}
