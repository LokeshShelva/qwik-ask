export type Theme = 'dark' | 'light' | 'system';
export type LlmProvider = 'gemini' | 'openai';

export interface GeneralSettings {
    auto_startup: boolean;
    theme: Theme;
}

export interface ShortcutSettings {
    toggle_launcher: string;
}

export const DEFAULT_SYSTEM_PROMPT = `You are Quick Assist, a fast and helpful AI assistant. You provide concise, accurate, and actionable responses.

Guidelines:
- Be direct and concise - users want quick answers
- Use markdown formatting for better readability
- For code, always specify the language in code blocks
- If a question is ambiguous, give the most likely answer first, then briefly mention alternatives
- Avoid unnecessary pleasantries - get straight to the point`;

export interface LlmSettings {
    provider: LlmProvider;
    api_key: string;
    system_prompt: string;
}

export interface AppSettings {
    general: GeneralSettings;
    shortcuts: ShortcutSettings;
    llm: LlmSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
    general: {
        auto_startup: false,
        theme: 'dark',
    },
    shortcuts: {
        toggle_launcher: 'Alt+Shift+Space',
    },
    llm: {
        provider: 'gemini',
        api_key: '',
        system_prompt: DEFAULT_SYSTEM_PROMPT,
    },
};
