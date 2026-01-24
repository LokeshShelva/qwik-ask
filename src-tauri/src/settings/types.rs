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
    /// Model identifier (e.g., "gpt-4o", "gemini-2.0-flash")
    #[serde(default = "default_model")]
    pub model: String,
    /// Base URL for custom OpenAI-compatible endpoints
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub base_url: Option<String>,
    /// System prompt to customize AI behavior
    #[serde(default = "default_system_prompt")]
    pub system_prompt: String,
}

fn default_model() -> String {
    "gemini-2.0-flash".to_string()
}

fn default_system_prompt() -> String {
    DEFAULT_SYSTEM_PROMPT.to_string()
}

/// Supported LLM providers.
///
/// Serializes to lowercase strings: `"gemini"`, `"openai"`, `"anthropic"`, `"custom"`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LlmProvider {
    /// Google Gemini API
    Gemini,
    /// OpenAI API
    OpenAI,
    /// Anthropic Claude API
    Anthropic,
    /// Custom OpenAI-compatible endpoint
    Custom,
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
            auto_startup: true,
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
            model: default_model(),
            base_url: None,
            system_prompt: DEFAULT_SYSTEM_PROMPT.to_string(),
        }
    }
}

impl Default for LlmProvider {
    fn default() -> Self {
        LlmProvider::Gemini
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ===== Default Value Tests =====

    #[test]
    fn test_app_settings_default_values() {
        let settings = AppSettings::default();

        // General defaults
        assert!(!settings.general.auto_startup);
        assert!(matches!(settings.general.theme, Theme::Dark));

        // Shortcut defaults
        assert_eq!(settings.shortcuts.toggle_launcher, "Alt+Shift+Space");

        // LLM defaults
        assert!(matches!(settings.llm.provider, LlmProvider::Gemini));
        assert!(settings.llm.api_key.is_empty());
        assert!(!settings.llm.system_prompt.is_empty());
    }

    #[test]
    fn test_default_system_prompt_is_not_empty() {
        assert!(!DEFAULT_SYSTEM_PROMPT.is_empty());
        assert!(DEFAULT_SYSTEM_PROMPT.contains("Quick Assist"));
    }

    // ===== JSON Serialization Tests =====

    #[test]
    fn test_theme_serializes_to_lowercase() {
        let dark = serde_json::to_string(&Theme::Dark).unwrap();
        let light = serde_json::to_string(&Theme::Light).unwrap();
        let system = serde_json::to_string(&Theme::System).unwrap();

        assert_eq!(dark, "\"dark\"");
        assert_eq!(light, "\"light\"");
        assert_eq!(system, "\"system\"");
    }

    #[test]
    fn test_theme_deserializes_from_lowercase() {
        let dark: Theme = serde_json::from_str("\"dark\"").unwrap();
        let light: Theme = serde_json::from_str("\"light\"").unwrap();
        let system: Theme = serde_json::from_str("\"system\"").unwrap();

        assert!(matches!(dark, Theme::Dark));
        assert!(matches!(light, Theme::Light));
        assert!(matches!(system, Theme::System));
    }

    #[test]
    fn test_provider_serializes_to_lowercase() {
        let gemini = serde_json::to_string(&LlmProvider::Gemini).unwrap();
        let openai = serde_json::to_string(&LlmProvider::OpenAI).unwrap();

        assert_eq!(gemini, "\"gemini\"");
        assert_eq!(openai, "\"openai\"");
    }

    #[test]
    fn test_provider_deserializes_from_lowercase() {
        let gemini: LlmProvider = serde_json::from_str("\"gemini\"").unwrap();
        let openai: LlmProvider = serde_json::from_str("\"openai\"").unwrap();

        assert!(matches!(gemini, LlmProvider::Gemini));
        assert!(matches!(openai, LlmProvider::OpenAI));
    }

    // ===== Round-Trip Tests =====

    #[test]
    fn test_app_settings_json_round_trip() {
        let original = AppSettings::default();
        let json = serde_json::to_string(&original).unwrap();
        let restored: AppSettings = serde_json::from_str(&json).unwrap();

        assert_eq!(original.general.auto_startup, restored.general.auto_startup);
        assert_eq!(
            original.shortcuts.toggle_launcher,
            restored.shortcuts.toggle_launcher
        );
        assert_eq!(original.llm.api_key, restored.llm.api_key);
    }

    #[test]
    fn test_custom_settings_round_trip() {
        let custom = AppSettings {
            general: GeneralSettings {
                auto_startup: true,
                theme: Theme::Light,
            },
            shortcuts: ShortcutSettings {
                toggle_launcher: "Ctrl+Alt+Q".to_string(),
            },
            llm: LlmSettings {
                provider: LlmProvider::OpenAI,
                api_key: "test-api-key".to_string(),
                model: "gpt-4o".to_string(),
                base_url: None,
                system_prompt: "Custom prompt".to_string(),
            },
        };

        let json = serde_json::to_string(&custom).unwrap();
        let restored: AppSettings = serde_json::from_str(&json).unwrap();

        assert!(restored.general.auto_startup);
        assert!(matches!(restored.general.theme, Theme::Light));
        assert_eq!(restored.shortcuts.toggle_launcher, "Ctrl+Alt+Q");
        assert!(matches!(restored.llm.provider, LlmProvider::OpenAI));
        assert_eq!(restored.llm.api_key, "test-api-key");
        assert_eq!(restored.llm.system_prompt, "Custom prompt");
    }

    // ===== Missing Field Handling =====

    #[test]
    fn test_llm_settings_default_system_prompt() {
        // When system_prompt is missing, it should use the default
        let json = r#"{"provider":"gemini","api_key":"key123"}"#;
        let llm: LlmSettings = serde_json::from_str(json).unwrap();

        assert_eq!(llm.api_key, "key123");
        assert!(!llm.system_prompt.is_empty());
        assert!(llm.system_prompt.contains("Quick Assist"));
    }
}
