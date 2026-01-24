export type Theme = 'dark' | 'light' | 'system';
export type LlmProvider = 'gemini' | 'openai' | 'anthropic' | 'custom';

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
    model: string;
    base_url?: string;
    system_prompt: string;
}

export interface AppSettings {
    general: GeneralSettings;
    shortcuts: ShortcutSettings;
    llm: LlmSettings;
}

/**
 * Curated list of recommended models per provider.
 */
export const PROVIDER_MODELS: Record<LlmProvider, { id: string; name: string }[]> = {
    gemini: [
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Fast)' },
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Balanced)' },
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Smart)' },
    ],
    openai: [
        { id: 'gpt-4o', name: 'GPT-4o (Flagship)' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast)' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
        { id: 'o1', name: 'o1 (Reasoning)' },
    ],
    anthropic: [
        { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4 (Latest)' },
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Fast)' },
    ],
    custom: [],
};

/**
 * Preset configurations for common OpenAI-compatible endpoints.
 */
export const CUSTOM_PROVIDER_PRESETS = [
    { name: 'Ollama (Local)', baseUrl: 'http://localhost:11434/v1' },
    { name: 'LM Studio (Local)', baseUrl: 'http://localhost:1234/v1' },
    { name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1' },
    { name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1' },
    { name: 'Together.ai', baseUrl: 'https://api.together.xyz/v1' },
    { name: 'Other...', baseUrl: '' },
];

/**
 * Get the default model for a provider.
 */
export function getDefaultModel(provider: LlmProvider): string {
    const models = PROVIDER_MODELS[provider];
    return models.length > 0 ? models[0].id : '';
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
        model: 'gemini-2.0-flash',
        system_prompt: DEFAULT_SYSTEM_PROMPT,
    },
};
