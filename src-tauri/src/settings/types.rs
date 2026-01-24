//! Settings type definitions.
//!
//! Contains all data structures for application settings, including
//! serialization attributes for JSON persistence.
//!
//! # Type Hierarchy
//!
//! ```text
//! AppSettings
//! ├── GeneralSettings
//! │   ├── auto_startup: bool
//! │   └── theme: Theme (dark/light/system)
//! ├── ShortcutSettings
//! │   └── toggle_launcher: String
//! └── LlmSettings
//!     ├── provider: LlmProvider (gemini/openai)
//!     ├── api_key: String
//!     └── system_prompt: String
//! ```

use serde::{Deserialize, Serialize};

/// Root settings structure containing all application configuration.
///
/// Serialized to JSON for persistence via `tauri-plugin-store`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    /// General application preferences
    pub general: GeneralSettings,
    /// Keyboard shortcut configuration
    pub shortcuts: ShortcutSettings,
    /// LLM provider configuration
    pub llm: LlmSettings,
}

/// General application preferences.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneralSettings {
    /// Whether to start the app at system login
    pub auto_startup: bool,
    /// UI color theme
    pub theme: Theme,
}

/// UI color theme options.
///
/// Serializes to lowercase strings: `"dark"`, `"light"`, `"system"`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    /// Always use dark theme
    Dark,
    /// Always use light theme
    Light,
    /// Follow system preference
    System,
}

/// Keyboard shortcut configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShortcutSettings {
    /// Global hotkey to show/hide the launcher.
    ///
    /// Format: `"Modifier+Modifier+Key"` (e.g., `"Alt+Shift+Space"`)
    pub toggle_launcher: String,
}

/// Default system prompt for AI interactions.
///
/// Provides guidelines for concise, helpful responses.
pub const DEFAULT_SYSTEM_PROMPT: &str = r#"You are Quick Assist, a fast and helpful AI assistant. You provide concise, accurate, and actionable responses.

Guidelines:
- Be direct and concise - users want quick answers
- Use markdown formatting for better readability
- For code, always specify the language in code blocks
- If a question is ambiguous, give the most likely answer first, then briefly mention alternatives
- Avoid unnecessary pleasantries - get straight to the point"#;

/// LLM provider configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmSettings {
    /// Which AI provider to use
    pub provider: LlmProvider,
    /// API key for the selected provider (stored locally, never sent to our servers)
    pub api_key: String,
    /// System prompt to customize AI behavior
    #[serde(default = "default_system_prompt")]
    pub system_prompt: String,
}

fn default_system_prompt() -> String {
    DEFAULT_SYSTEM_PROMPT.to_string()
}

/// Supported LLM providers.
///
/// Serializes to lowercase strings: `"gemini"`, `"openai"`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LlmProvider {
    /// Google Gemini API
    Gemini,
    /// OpenAI API (planned, not yet implemented)
    OpenAI,
}

// ============================================================================
// Default Implementations
// ============================================================================

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            general: GeneralSettings::default(),
            shortcuts: ShortcutSettings::default(),
            llm: LlmSettings::default(),
        }
    }
}

impl Default for GeneralSettings {
    fn default() -> Self {
        Self {
            auto_startup: false,
            theme: Theme::Dark,
        }
    }
}

impl Default for Theme {
    fn default() -> Self {
        Theme::Dark
    }
}

impl Default for ShortcutSettings {
    fn default() -> Self {
        Self {
            toggle_launcher: "Alt+Shift+Space".to_string(),
        }
    }
}

impl Default for LlmSettings {
    fn default() -> Self {
        Self {
            provider: LlmProvider::Gemini,
            api_key: String::new(),
            system_prompt: DEFAULT_SYSTEM_PROMPT.to_string(),
        }
    }
}

impl Default for LlmProvider {
    fn default() -> Self {
        LlmProvider::Gemini
    }
}
