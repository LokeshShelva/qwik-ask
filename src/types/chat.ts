export type MessageRole = 'user' | 'assistant';

export interface Message {
    id: string;
    role: MessageRole;
    content: string;
    timestamp: number;
}

export interface ChatSession {
    messages: Message[];
    isStreaming: boolean;
}

export interface GeminiMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

export interface GeminiStreamResponse {
    candidates?: {
        content?: {
            parts?: { text?: string }[];
        };
        finishReason?: string;
    }[];
    error?: {
        message: string;
        code: number;
    };
}
