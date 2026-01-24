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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_migrations_returns_non_empty() {
        let migrations = get_migrations();
        assert!(!migrations.is_empty(), "Should have at least one migration");
    }

    #[test]
    fn test_migrations_start_at_version_1() {
        let migrations = get_migrations();
        assert_eq!(
            migrations[0].version, 1,
            "First migration should be version 1"
        );
    }

    #[test]
    fn test_migrations_have_sequential_versions() {
        let migrations = get_migrations();
        for (i, migration) in migrations.iter().enumerate() {
            let expected_version = (i + 1) as i64;
            assert_eq!(
                migration.version, expected_version,
                "Migration at index {} should have version {}",
                i, expected_version
            );
        }
    }

    #[test]
    fn test_migrations_have_descriptions() {
        let migrations = get_migrations();
        for migration in migrations {
            assert!(
                !migration.description.is_empty(),
                "Migration {} should have a description",
                migration.version
            );
        }
    }

    #[test]
    fn test_migrations_have_sql() {
        let migrations = get_migrations();
        for migration in migrations {
            assert!(
                !migration.sql.is_empty(),
                "Migration {} should have SQL content",
                migration.version
            );
        }
    }

    #[test]
    fn test_first_migration_creates_tables() {
        let migrations = get_migrations();
        let first = &migrations[0];

        assert!(
            first.sql.contains("CREATE TABLE"),
            "First migration should create tables"
        );
        assert!(
            first.sql.contains("conversations"),
            "First migration should create conversations table"
        );
        assert!(
            first.sql.contains("messages"),
            "First migration should create messages table"
        );
    }
}
