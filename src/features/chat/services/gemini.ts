import type { Message, GeminiMessage, GeminiStreamResponse } from '../types/chat';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL = 'gemini-2.0-flash';

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: () => void;
  onError: (error: string) => void;
}

function convertToGeminiMessages(messages: Message[]): GeminiMessage[] {
  return messages.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));
}

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

      // Parse SSE events
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

export function abortStream(): void {
  // For future implementation - would need AbortController
}
