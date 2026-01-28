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
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Balances)' },
        { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite (Fast)' },
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Smart)' },
        { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Preview)' },
        { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Preview)' },
    ],
    openai: [
        { id: 'gpt-5-mini', name: 'GPT-5 Mini (Balanced)' },
        { id: 'gpt-5-nano', name: 'GPT-5 Nano (Fast)' },
        { id: 'gpt-5.2', name: 'GPT-5.2 (Smart)' },
        { id: 'gpt-5.2-pro', name: 'GPT-5.2 Pro (Smartest)' },
    ],
    anthropic: [
        { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5 (Fast)' },
        { id: 'claude-sonnet-4-5', name: 'Claude 4.5 Sonnet (Balanced)' },
        { id: 'claude-opus-4-5', name: 'Claude 4.5 Opus (Smart)' },
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
        model: 'gemini-2.5-flash',
        system_prompt: DEFAULT_SYSTEM_PROMPT,
    },
};
