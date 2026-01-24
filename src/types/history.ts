// Chat history types

export interface Conversation {
    id: string;
    title: string;
    created_at: number; // Unix timestamp ms
    updated_at: number;
}

export interface HistoryMessage {
    id: string;
    conversation_id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: number;
}

export interface GroupedHistory {
    today: Conversation[];
    yesterday: Conversation[];
    lastWeek: Conversation[];
    older: Conversation[];
}
