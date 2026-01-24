// Database service for chat history using tauri-plugin-sql

import Database from '@tauri-apps/plugin-sql';
import type { Conversation, HistoryMessage } from '../types/history';

let db: Database | null = null;

async function getDb(): Promise<Database> {
    if (!db) {
        db = await Database.load('sqlite:history.db');
    }
    return db;
}

/**
 * Create a new conversation
 */
export async function createConversation(id: string, title: string): Promise<void> {
    const database = await getDb();
    const now = Date.now();
    await database.execute(
        'INSERT INTO conversations (id, title, created_at, updated_at) VALUES ($1, $2, $3, $4)',
        [id, title, now, now]
    );
}

/**
 * Add a message to a conversation
 */
export async function addMessage(
    id: string,
    conversationId: string,
    role: string,
    content: string
): Promise<void> {
    const database = await getDb();
    const now = Date.now();

    // Insert message
    await database.execute(
        'INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES ($1, $2, $3, $4, $5)',
        [id, conversationId, role, content, now]
    );

    // Update conversation's updated_at
    await database.execute(
        'UPDATE conversations SET updated_at = $1 WHERE id = $2',
        [now, conversationId]
    );
}

/**
 * Get list of conversations ordered by most recent
 */
export async function getConversations(limit = 50, offset = 0): Promise<Conversation[]> {
    const database = await getDb();
    return await database.select<Conversation[]>(
        'SELECT * FROM conversations ORDER BY updated_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
    );
}

/**
 * Search conversations by title
 */
export async function searchConversations(query: string): Promise<Conversation[]> {
    const database = await getDb();
    return await database.select<Conversation[]>(
        'SELECT * FROM conversations WHERE title LIKE $1 ORDER BY updated_at DESC LIMIT 50',
        [`%${query}%`]
    );
}

/**
 * Get all messages for a conversation
 */
export async function getMessages(conversationId: string): Promise<HistoryMessage[]> {
    const database = await getDb();
    return await database.select<HistoryMessage[]>(
        'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
        [conversationId]
    );
}

/**
 * Delete a conversation and all its messages
 */
export async function deleteConversation(id: string): Promise<void> {
    const database = await getDb();
    await database.execute('DELETE FROM conversations WHERE id = $1', [id]);
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(id: string, title: string): Promise<void> {
    const database = await getDb();
    await database.execute(
        'UPDATE conversations SET title = $1 WHERE id = $2',
        [title, id]
    );
}
