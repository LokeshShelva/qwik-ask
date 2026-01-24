//! Database migrations for chat history.
//!
//! Provides SQLite schema migrations for the `tauri-plugin-sql` plugin.
//! Migrations run automatically on app startup before the DB is used.
//!
//! # Schema
//!
//! ```sql
//! -- conversations: stores chat sessions
//! CREATE TABLE conversations (
//!     id TEXT PRIMARY KEY,
//!     title TEXT NOT NULL,
//!     created_at INTEGER NOT NULL,  -- Unix timestamp (ms)
//!     updated_at INTEGER NOT NULL   -- Unix timestamp (ms)
//! );
//!
//! -- messages: stores individual messages
//! CREATE TABLE messages (
//!     id TEXT PRIMARY KEY,
//!     conversation_id TEXT NOT NULL,
//!     role TEXT NOT NULL,           -- 'user' or 'assistant'
//!     content TEXT NOT NULL,
//!     created_at INTEGER NOT NULL,  -- Unix timestamp (ms)
//!     FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
//! );
//! ```
//!
//! # Adding New Migrations
//!
//! To add a new migration:
//!
//! 1. Add a new `Migration` struct to the vector in `get_migrations()`
//! 2. Increment the version number
//! 3. Write the SQL for the migration
//!
//! ```rust,ignore
//! Migration {
//!     version: 2,
//!     description: "add_index_on_content",
//!     sql: "CREATE INDEX idx_messages_content ON messages(content);",
//!     kind: MigrationKind::Up,
//! }
//! ```

use tauri_plugin_sql::{Migration, MigrationKind};

/// Get all database migrations.
///
/// Returns migrations in order. Each migration runs only once,
/// tracked by version number in the database.
///
/// # Returns
///
/// Vector of migrations to apply (if not already applied)
pub fn get_migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "create_history_tables",
        sql: r#"
                CREATE TABLE IF NOT EXISTS conversations (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL
                );

                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at INTEGER NOT NULL,
                    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_conversations_updated 
                    ON conversations(updated_at DESC);
                CREATE INDEX IF NOT EXISTS idx_messages_conversation 
                    ON messages(conversation_id);
            "#,
        kind: MigrationKind::Up,
    }]
}
