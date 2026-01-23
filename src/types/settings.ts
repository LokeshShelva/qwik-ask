export type Theme = 'dark' | 'light' | 'system';
export type LlmProvider = 'gemini' | 'openai';

export interface GeneralSettings {
  auto_startup: boolean;
  theme: Theme;
}

export interface ShortcutSettings {
  toggle_launcher: string;
}

export interface LlmSettings {
  provider: LlmProvider;
  api_key: string;
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
  },
};
