/**
 * @fileoverview Anthropic API service for LLM interactions.
 * 
 * Handles streaming chat completions and title generation using Anthropic's
 * Claude API. Uses Server-Sent Events (SSE) for streaming responses.
 * 
 * @module services/llm/anthropic
 */

import type { Message } from '../../types/chat';
import type { LlmConfig, StreamCallbacks } from './types';

/** Base URL for Anthropic API */
const ANTHROPIC_API_BASE = 'https://api.anthropic.com/v1';

/** Current API version */
const ANTHROPIC_VERSION = '2023-06-01';

/**
 * Anthropic message format.
 */
interface AnthropicMessage {
    role: 'user' | 'assistant';
    content: string;
}

/**
 * Convert our Message format to Anthropic's expected format.
 * Note: System prompt is handled separately in Anthropic's API.
 */
function convertToAnthropicMessages(messages: Message[]): AnthropicMessage[] {
    return messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
    }));
}

/**
 * Stream a chat completion from Anthropic API.
 * 
 * @param config - LLM configuration (apiKey and model)
 * @param messages - Conversation history
 * @param callbacks - Event handlers for streaming
 * @param systemPrompt - Optional system instructions
 */
export async function streamChat(
    config: LlmConfig,
    messages: Message[],
    callbacks: StreamCallbacks,
    systemPrompt?: string
): Promise<void> {
    if (!config.apiKey) {
        callbacks.onError('API key is not configured. Please add your API key in Settings.');
        return;
    }

    const url = `${ANTHROPIC_API_BASE}/messages`;
    const anthropicMessages = convertToAnthropicMessages(messages);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey,
                'anthropic-version': ANTHROPIC_VERSION,
                'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: JSON.stringify({
                model: config.model,
                messages: anthropicMessages,
                system: systemPrompt || undefined,
                max_tokens: 8192,
                stream: true,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData?.error?.message || `HTTP error ${response.status}`;
            callbacks.onError(errorMessage);
            return;
        }

        if (!response.body) {
            callbacks.onError('No response body received');
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                callbacks.onComplete();
                break;
            }

            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmedLine = line.trim();

                if (trimmedLine === '' || trimmedLine.startsWith(':')) {
                    continue;
                }

                if (trimmedLine.startsWith('data: ')) {
                    const jsonStr = trimmedLine.slice(6);

                    try {
                        const data = JSON.parse(jsonStr);

                        // Handle different event types
                        if (data.type === 'content_block_delta') {
                            const text = data.delta?.text;
                            if (text) {
                                callbacks.onToken(text);
                            }
                        } else if (data.type === 'error') {
                            callbacks.onError(data.error?.message || 'Unknown error');
                            return;
                        } else if (data.type === 'message_stop') {
                            // Stream complete, will be handled by done check
                        }
                    } catch (e) {
                        console.warn('Failed to parse SSE data:', jsonStr);
                    }
                }
            }
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        callbacks.onError(message);
    }
}

/**
 * Perform a simple, non-streaming completion.
 * Returns just the text response for a given prompt.
 * 
 * @param config - LLM configuration
 * @param prompt - The prompt to send
 * @returns The text response or empty string on error
 * @internal Used by the shared generateTitle utility
 */
export async function simpleCompletion(
    config: LlmConfig,
    prompt: string
): Promise<string> {
    const url = `${ANTHROPIC_API_BASE}/messages`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey,
                'anthropic-version': ANTHROPIC_VERSION,
                'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: JSON.stringify({
                model: config.model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 50,
            }),
        });

        if (!response.ok) {
            return "";
        }

        const data = await response.json();
        return data.content?.[0]?.text?.trim() || "";
    } catch (e) {
        console.error('Simple completion failed:', e);
        return "";
    }
}
