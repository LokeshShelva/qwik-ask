use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub general: GeneralSettings,
    pub shortcuts: ShortcutSettings,
    pub llm: LlmSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneralSettings {
    pub auto_startup: bool,
    pub theme: Theme,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    Dark,
    Light,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShortcutSettings {
    pub toggle_launcher: String,
}

pub const DEFAULT_SYSTEM_PROMPT: &str = r#"You are Quick Assist, a fast and helpful AI assistant. You provide concise, accurate, and actionable responses.

Guidelines:
- Be direct and concise - users want quick answers
- Use markdown formatting for better readability
- For code, always specify the language in code blocks
- If a question is ambiguous, give the most likely answer first, then briefly mention alternatives
- Avoid unnecessary pleasantries - get straight to the point"#;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmSettings {
    pub provider: LlmProvider,
    pub api_key: String,
    #[serde(default = "default_system_prompt")]
    pub system_prompt: String,
}

fn default_system_prompt() -> String {
    DEFAULT_SYSTEM_PROMPT.to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LlmProvider {
    Gemini,
    OpenAI,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            general: GeneralSettings {
                auto_startup: false,
                theme: Theme::Dark,
            },
            shortcuts: ShortcutSettings {
                toggle_launcher: "Alt+Shift+Space".to_string(),
            },
            llm: LlmSettings {
                provider: LlmProvider::Gemini,
                api_key: String::new(),
                system_prompt: DEFAULT_SYSTEM_PROMPT.to_string(),
            },
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
