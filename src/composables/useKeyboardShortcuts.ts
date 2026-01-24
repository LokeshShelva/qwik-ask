// Composable for managing global keyboard shortcuts

import { onMounted, onUnmounted } from 'vue';

export interface ShortcutHandler {
    key: string;
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    handler: (e: KeyboardEvent) => void | Promise<void>;
    preventDefault?: boolean;
}

export interface UseKeyboardShortcutsOptions {
    /** Shortcuts to register */
    shortcuts: ShortcutHandler[];
    /** Whether to attach to document (default: true) */
    attachToDocument?: boolean;
}

/**
 * Composable for declarative keyboard shortcut registration
 * 
 * @example
 * ```ts
 * useKeyboardShortcuts({
 *   shortcuts: [
 *     { key: 'Escape', handler: () => closeApp() },
 *     { key: 'k', ctrl: true, handler: () => openSettings(), preventDefault: true },
 *     { key: 'h', ctrl: true, handler: () => toggleHistory(), preventDefault: true },
 *   ]
 * });
 * ```
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions) {
    const { shortcuts, attachToDocument = true } = options;

    const handleKeydown = async (e: KeyboardEvent): Promise<void> => {
        for (const shortcut of shortcuts) {
            const keyMatches = e.key.toLowerCase() === shortcut.key.toLowerCase();
            const ctrlMatches = shortcut.ctrl ? e.ctrlKey : !e.ctrlKey;
            const altMatches = shortcut.alt ? e.altKey : !e.altKey;
            const shiftMatches = shortcut.shift ? e.shiftKey : !e.shiftKey;

            if (keyMatches && ctrlMatches && altMatches && shiftMatches) {
                if (shortcut.preventDefault !== false) {
                    e.preventDefault();
                }
                await shortcut.handler(e);
                return; // Only handle first matching shortcut
            }
        }
    };

    onMounted(() => {
        if (attachToDocument) {
            document.addEventListener('keydown', handleKeydown);
        }
    });

    onUnmounted(() => {
        if (attachToDocument) {
            document.removeEventListener('keydown', handleKeydown);
        }
    });

    return {
        handleKeydown,
    };
}
