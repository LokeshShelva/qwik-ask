/**
 * @fileoverview Gemini API service for LLM interactions.
 * 
 * Handles streaming chat completions and title generation using Google's
 * Gemini API. Uses Server-Sent Events (SSE) for streaming responses.
 * 
 * @module services/llm/gemini
 */

import type { Message, GeminiMessage, GeminiStreamResponse } from '../../types/chat';
import type { LlmConfig, StreamCallbacks } from './types';

/** Base URL for Gemini API */
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Convert our Message format to Gemini's expected format.
 * 
 * **Quirk:** Gemini uses 'model' instead of 'assistant' for AI responses.
 * 
 * @param messages - Array of messages in our format
 * @returns Array of messages in Gemini format
 * @internal
 */
function convertToGeminiMessages(messages: Message[]): GeminiMessage[] {
    return messages.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
    }));
}

/**
 * Stream a chat completion from Gemini API.
 * 
 * @param config - LLM configuration (apiKey and model)
 * @param messages - Conversation history (don't include the placeholder for the response)
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

    const url = `${GEMINI_API_BASE}/${config.model}:streamGenerateContent?alt=sse&key=${config.apiKey}`;

    const geminiMessages = convertToGeminiMessages(messages);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: geminiMessages,
                systemInstruction: systemPrompt ? {
                    parts: [{ text: systemPrompt }]
                } : undefined,
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 8192,
                },
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
                if (line.startsWith('data: ')) {
                    const jsonStr = line.slice(6).trim();
                    if (!jsonStr) continue;

                    try {
                        const data: GeminiStreamResponse = JSON.parse(jsonStr);

                        if (data.error) {
                            callbacks.onError(data.error.message);
                            return;
                        }

                        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (text) {
                            callbacks.onToken(text);
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
 * @param config - LLM configuration (apiKey and model)
 * @param prompt - The prompt to send
 * @returns The text response or empty string on error
 * @internal Used by the shared generateTitle utility
 */
export async function simpleCompletion(
    config: LlmConfig,
    prompt: string
): Promise<string> {
    const url = `${GEMINI_API_BASE}/${config.model}:generateContent?key=${config.apiKey}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    role: 'user',
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 50,
                },
            }),
        });

        if (!response.ok) {
            return "";
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    } catch (e) {
        console.error('Simple completion failed:', e);
        return "";
    }
}
