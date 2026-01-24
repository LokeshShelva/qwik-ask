/**
 * @fileoverview OpenAI API service for LLM interactions.
 * 
 * Handles streaming chat completions and title generation using OpenAI's API.
 * Also used for OpenAI-compatible endpoints (Ollama, LM Studio, Groq, etc.)
 * via custom baseUrl.
 * 
 * @module services/llm/openai
 */

import type { Message } from '../../types/chat';
import type { LlmConfig, StreamCallbacks } from './types';

/** Default base URL for OpenAI API */
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

/**
 * OpenAI message format.
 */
interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/**
 * Convert our Message format to OpenAI's expected format.
 */
function convertToOpenAIMessages(messages: Message[], systemPrompt?: string): OpenAIMessage[] {
    const result: OpenAIMessage[] = [];

    if (systemPrompt) {
        result.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of messages) {
        result.push({
            role: msg.role,
            content: msg.content,
        });
    }

    return result;
}

/**
 * Stream a chat completion from OpenAI API (or compatible endpoint).
 * 
 * @param config - LLM configuration (apiKey, model, optional baseUrl)
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
    // Allow empty API key for local endpoints like Ollama
    const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    const isLocalEndpoint = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');

    if (!config.apiKey && !isLocalEndpoint) {
        callbacks.onError('API key is not configured. Please add your API key in Settings.');
        return;
    }

    const url = `${baseUrl}/chat/completions`;
    const openaiMessages = convertToOpenAIMessages(messages, systemPrompt);

    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (config.apiKey) {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: config.model,
                messages: openaiMessages,
                stream: true,
                temperature: 0.7,
                max_tokens: 8192,
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

                if (trimmedLine === '' || trimmedLine === 'data: [DONE]') {
                    continue;
                }

                if (trimmedLine.startsWith('data: ')) {
                    const jsonStr = trimmedLine.slice(6);

                    try {
                        const data = JSON.parse(jsonStr);

                        if (data.error) {
                            callbacks.onError(data.error.message || 'Unknown error');
                            return;
                        }

                        const content = data.choices?.[0]?.delta?.content;
                        if (content) {
                            callbacks.onToken(content);
                        }
                    } catch (e) {
                        // Skip malformed JSON
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
    const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    const url = `${baseUrl}/chat/completions`;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: config.model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 50,
            }),
        });

        if (!response.ok) {
            return "";
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() || "";
    } catch (e) {
        console.error('Simple completion failed:', e);
        return "";
    }
}
