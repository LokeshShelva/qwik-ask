/**
 * @fileoverview SQLite database service for chat history persistence.
 * 
 * Uses tauri-plugin-sql to store conversations and messages in a local
 * SQLite database. The database file is stored in the app data directory.
 * 
 * **Database schema:**
 * ```sql
 * -- conversations table
 * CREATE TABLE conversations (
 *   id TEXT PRIMARY KEY,
 *   title TEXT NOT NULL,
 *   created_at INTEGER NOT NULL,  -- Unix timestamp ms
 *   updated_at INTEGER NOT NULL   -- Unix timestamp ms
 * );
 * 
 * -- messages table (with CASCADE delete on conversation)
 * CREATE TABLE messages (
 *   id TEXT PRIMARY KEY,
 *   conversation_id TEXT NOT NULL,
 *   role TEXT NOT NULL,           -- 'user' or 'assistant'
 *   content TEXT NOT NULL,
 *   created_at INTEGER NOT NULL,  -- Unix timestamp ms
 *   FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
 * );
 * ```
 * 
 * @example Basic usage
 * ```typescript
 * import * as historyDb from './services/historyDb';
 * 
 * // Create a conversation
 * await historyDb.createConversation('conv-123', 'My Chat');
 * 
 * // Add messages
 * await historyDb.addMessage('msg-1', 'conv-123', 'user', 'Hello!');
 * await historyDb.addMessage('msg-2', 'conv-123', 'assistant', 'Hi there!');
 * 
 * // Load conversations
 * const convs = await historyDb.getConversations();
 * ```
 * 
 * @module services/historyDb
 */

import Database from '@tauri-apps/plugin-sql';
import type { Conversation, HistoryMessage } from '../types/history';

/**
 * Singleton database instance.
 * Lazily initialized on first access via getDb().
 */
let db: Database | null = null;

/**
 * Get or initialize the database connection.
 * 
 * **Quirk:** The database is lazily initialized. First call will be slower
 * as it opens the connection. Subsequent calls return the cached instance.
 * 
 * **Note:** Database file is stored at: `{app_data}/history.db`
 * 
 * @returns Database instance
 * @internal
 */
async function getDb(): Promise<Database> {
    if (!db) {
        // 'sqlite:' prefix tells the plugin to use SQLite
        db = await Database.load('sqlite:history.db');
    }
    return db;
}

/**
 * Create a new conversation in the database.
 * 
 * **Note:** The title is usually the first ~50 chars of the first message,
 * but can be updated later via `updateConversationTitle()` with an AI-generated title.
 * 
 * @param id - Unique conversation ID (typically timestamp-based)
 * @param title - Initial conversation title
 * 
 * @example
 * ```typescript
 * const id = `${Date.now()}-${randomString()}`;
 * await createConversation(id, userMessage.substring(0, 50));
 * ```
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
 * Add a message to an existing conversation.
 * 
 * **Side effect:** Also updates the conversation's `updated_at` timestamp,
 * which affects sort order in the history panel.
 * 
 * @param id - Unique message ID
 * @param conversationId - Parent conversation ID
 * @param role - 'user' or 'assistant'
 * @param content - Message content
 * 
 * @example
 * ```typescript
 * // Add user message
 * await addMessage('msg-123', 'conv-456', 'user', 'What is 2+2?');
 * 
 * // Add assistant response
 * await addMessage('msg-124', 'conv-456', 'assistant', '2+2 equals 4.');
 * ```
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

    // Update conversation's updated_at so it appears at top of history
    await database.execute(
        'UPDATE conversations SET updated_at = $1 WHERE id = $2',
        [now, conversationId]
    );
}

/**
 * Get a list of conversations, ordered by most recently updated.
 * 
 * @param limit - Maximum number of conversations to return (default: 50)
 * @param offset - Number of conversations to skip for pagination (default: 0)
 * @returns Array of conversations
 * 
 * @example Pagination
 * ```typescript
 * // First page
 * const page1 = await getConversations(20, 0);
 * 
 * // Second page
 * const page2 = await getConversations(20, 20);
 * ```
 */
export async function getConversations(limit = 50, offset = 0): Promise<Conversation[]> {
    const database = await getDb();
    return await database.select<Conversation[]>(
        'SELECT * FROM conversations ORDER BY updated_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
    );
}

/**
 * Search conversations by title.
 * 
 * **Matching:** Uses SQL LIKE with wildcards, so partial matches work.
 * Search is case-insensitive on most SQLite configurations.
 * 
 * @param query - Search string (matches anywhere in title)
 * @returns Matching conversations, ordered by most recent
 * 
 * @example
 * ```typescript
 * // Find all conversations about TypeScript
 * const results = await searchConversations('typescript');
 * // Matches: "TypeScript basics", "Learning typescript", "My TYPESCRIPT project"
 * ```
 */
export async function searchConversations(query: string): Promise<Conversation[]> {
    const database = await getDb();
    return await database.select<Conversation[]>(
        'SELECT * FROM conversations WHERE title LIKE $1 ORDER BY updated_at DESC LIMIT 50',
        [`%${query}%`]
    );
}

/**
 * Get all messages for a specific conversation.
 * 
 * @param conversationId - Conversation ID to load
 * @returns Array of messages in chronological order (oldest first)
 * 
 * @example
 * ```typescript
 * const messages = await getMessages('conv-123');
 * messages.forEach(m => {
 *   console.log(`${m.role}: ${m.content}`);
 * });
 * ```
 */
export async function getMessages(conversationId: string): Promise<HistoryMessage[]> {
    const database = await getDb();
    return await database.select<HistoryMessage[]>(
        'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
        [conversationId]
    );
}

/**
 * Delete a conversation and all its messages.
 * 
 * **Note:** Messages are deleted automatically via ON DELETE CASCADE
 * foreign key constraint in the database schema.
 * 
 * @param id - Conversation ID to delete
 * 
 * @example
 * ```typescript
 * // Confirm before deleting
 * if (confirm('Delete this conversation?')) {
 *   await deleteConversation(id);
 * }
 * ```
 */
export async function deleteConversation(id: string): Promise<void> {
    const database = await getDb();
    await database.execute('DELETE FROM conversations WHERE id = $1', [id]);
}

/**
 * Update the title of an existing conversation.
 * 
 * **Typical use:** Called after AI generates a better title based on
 * the first message exchange.
 * 
 * @param id - Conversation ID
 * @param title - New title
 * 
 * @example
 * ```typescript
 * // After first exchange, generate and update title
 * const aiTitle = await generateTitle(apiKey, userMsg, assistantMsg);
 * if (aiTitle) {
 *   await updateConversationTitle(conversationId, aiTitle);
 * }
 * ```
 */
export async function updateConversationTitle(id: string, title: string): Promise<void> {
    const database = await getDb();
    await database.execute(
        'UPDATE conversations SET title = $1 WHERE id = $2',
        [title, id]
    );
}
