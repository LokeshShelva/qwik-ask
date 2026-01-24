/**
 * @fileoverview Gemini API service for LLM interactions.
 * 
 * Handles streaming chat completions and title generation using Google's
 * Gemini API. Uses Server-Sent Events (SSE) for streaming responses.
 * 
 * @example Streaming chat
 * ```typescript
 * import { streamChat } from './services/gemini';
 * 
 * await streamChat(apiKey, messages, {
 *   onToken: (token) => { response += token; },
 *   onComplete: () => { console.log('Done!'); },
 *   onError: (error) => { console.error(error); }
 * }, systemPrompt);
 * ```
 * 
 * @module services/gemini
 */

import type { Message, GeminiMessage, GeminiStreamResponse } from '../types/chat';

/** Base URL for Gemini API */
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/** 
 * Model to use for completions.
 * gemini-2.0-flash is optimized for speed while maintaining quality.
 */
const MODEL = 'gemini-2.0-flash';

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
 * **How it works:**
 * 1. Sends all messages as context to Gemini
 * 2. Receives SSE (Server-Sent Events) stream
 * 3. Calls `onToken` for each text chunk received
 * 4. Calls `onComplete` when stream ends or `onError` on failure
 * 
 * **Quirks:**
 * - Empty API key triggers immediate `onError` callback
 * - Partial JSON in SSE is buffered until complete
 * - Malformed JSON chunks are silently skipped (logged to console)
 * - The function returns a Promise but actual content comes via callbacks
 * 
 * @param apiKey - Gemini API key
 * @param messages - Conversation history (don't include the placeholder for the response)
 * @param callbacks - Event handlers for streaming
 * @param systemPrompt - Optional system instructions
 * 
 * @example With system prompt
 * ```typescript
 * await streamChat(
 *   'your-api-key',
 *   [{ id: '1', role: 'user', content: 'Hi!', timestamp: Date.now() }],
 *   {
 *     onToken: (t) => { buffer += t; updateUI(); },
 *     onComplete: () => { finalize(); },
 *     onError: (e) => { showError(e); }
 *   },
 *   'You are a helpful coding assistant. Be concise.'
 * );
 * ```
 * 
 * @example Error handling
 * ```typescript
 * await streamChat(apiKey, messages, {
 *   onToken: (t) => {},
 *   onComplete: () => {},
 *   onError: (error) => {
 *     // error is a user-friendly string, not an Error object
 *     if (error.includes('API key')) {
 *       promptForApiKey();
 *     } else {
 *       showToast(error);
 *     }
 *   }
 * });
 * ```
 */
export async function streamChat(
    apiKey: string,
    messages: Message[],
    callbacks: StreamCallbacks,
    systemPrompt?: string
): Promise<void> {
    if (!apiKey) {
        callbacks.onError('API key is not configured. Please add your API key in Settings.');
        return;
    }

    const url = `${GEMINI_API_BASE}/${MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`;

    const geminiMessages = convertToGeminiMessages(messages);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: geminiMessages,
                // System instruction is a separate field, not a message
                systemInstruction: systemPrompt ? {
                    parts: [{ text: systemPrompt }]
                } : undefined,
                generationConfig: {
                    temperature: 0.7,  // Balanced creativity
                    topP: 0.95,        // Nucleus sampling
                    topK: 40,          // Top-k sampling
                    maxOutputTokens: 8192,
                },
            }),
        });

        // Handle HTTP errors
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

        // Process SSE stream
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

            // Parse SSE events (each starts with "data: ")
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

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
                        // Skip malformed JSON (may be partial)
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
 * Generate a short title for a conversation based on the first exchange.
 * 
 * **Non-streaming:** Returns the complete title in one call.
 * 
 * **Quirks:**
 * - Returns empty string on any error (silent failure)
 * - Cleans up "Title: " prefix if the model includes it
 * - Removes quotes from the title
 * - Uses lower token limit (20) for efficiency
 * 
 * @param apiKey - Gemini API key
 * @param userMessage - The user's first message
 * @param assistantResponse - The assistant's first response
 * @returns Generated title (3-5 words) or empty string on error
 * 
 * @example
 * ```typescript
 * const title = await generateTitle(
 *   apiKey,
 *   'How do I center a div?',
 *   'You can center a div using flexbox...'
 * );
 * console.log(title); // "Centering Divs with Flexbox"
 * ```
 */
export async function generateTitle(
    apiKey: string,
    userMessage: string,
    assistantResponse: string
): Promise<string> {
    const url = `${GEMINI_API_BASE}/${MODEL}:generateContent?key=${apiKey}`;

    const prompt = `Generate a very short, concise title (3-5 words) for this conversation based on the following exchange.\nUser: ${userMessage}\nAssistant: ${assistantResponse}\nTitle:`;

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
                    maxOutputTokens: 20, // Titles should be very short
                },
            }),
        });

        if (!response.ok) {
            return ""; // Silent failure
        }

        const data = await response.json();
        let title = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

        // Clean up common model artifacts
        title = title.replace(/^Title:\s*/i, '').replace(/["']/g, '');

        return title;
    } catch (e) {
        console.error('Failed to generate title:', e);
        return "";
    }
}

/**
 * Abort an ongoing stream.
 * 
 * **TODO:** Not yet implemented. Would require AbortController integration.
 * 
 * @remarks
 * Future implementation would look like:
 * ```typescript
 * const controller = new AbortController();
 * // In streamChat: fetch(url, { signal: controller.signal, ... })
 * // In abortStream: controller.abort();
 * ```
 */
export function abortStream(): void {
    // For future implementation - would need AbortController
}
