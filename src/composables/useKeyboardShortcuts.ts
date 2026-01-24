/**
 * @fileoverview Composable for declarative keyboard shortcut management.
 * 
 * Provides a clean API for registering global keyboard shortcuts with
 * automatic cleanup on component unmount.
 * 
 * @example Basic usage
 * ```typescript
 * useKeyboardShortcuts({
 *   shortcuts: [
 *     { key: 'Escape', handler: () => closeApp() },
 *     { key: 'k', ctrl: true, handler: () => openSettings() },
 *     { key: 's', ctrl: true, shift: true, handler: () => saveAs() },
 *   ]
 * });
 * ```
 * 
 * @module composables/useKeyboardShortcuts
 */

import { onMounted, onUnmounted } from 'vue';

/**
 * Configuration for a single keyboard shortcut.
 * 
 * @example Various shortcut patterns
 * ```typescript
 * // Simple key
 * { key: 'Escape', handler: closeModal }
 * 
 * // Ctrl + key
 * { key: 'k', ctrl: true, handler: openCommand }
 * 
 * // Ctrl + Shift + key
 * { key: 's', ctrl: true, shift: true, handler: saveAs }
 * 
 * // Allow default behavior
 * { key: 'Escape', handler: close, preventDefault: false }
 * ```
 */
export interface ShortcutHandler {
    /** The key to listen for (case-insensitive) */
    key: string;
    /** Require Ctrl/Cmd key (default: false, meaning Ctrl must NOT be pressed) */
    ctrl?: boolean;
    /** Require Alt key (default: false, meaning Alt must NOT be pressed) */
    alt?: boolean;
    /** Require Shift key (default: false, meaning Shift must NOT be pressed) */
    shift?: boolean;
    /** Handler function called when shortcut is triggered */
    handler: (e: KeyboardEvent) => void | Promise<void>;
    /** 
     * Whether to call preventDefault (default: true)
     * Set to false if you need browser default behavior
     */
    preventDefault?: boolean;
}

/**
 * Options for the useKeyboardShortcuts composable.
 */
export interface UseKeyboardShortcutsOptions {
    /** Array of shortcuts to register */
    shortcuts: ShortcutHandler[];
    /** 
     * Whether to attach listener to document (default: true)
     * Set to false if you want to use handleKeydown directly on an element
     */
    attachToDocument?: boolean;
}

/**
 * Composable for declarative keyboard shortcut registration.
 * 
 * **Design notes:**
 * - Shortcuts are matched in order; first match wins
 * - Modifier matching is strict: `ctrl: true` means Ctrl MUST be pressed,
 *   omitting `ctrl` means Ctrl must NOT be pressed
 * - Cleanup is automatic via onUnmounted
 * 
 * **Quirks:**
 * - Key matching is case-insensitive (both 'k' and 'K' match)
 * - Only the first matching shortcut's handler is called
 * - If `attachToDocument` is false, you must wire up `handleKeydown` yourself
 * 
 * @param options - Shortcut configuration
 * @returns Object containing the handler function (for manual use)
 * 
 * @example Full component example
 * ```typescript
 * // In a Vue component's <script setup>
 * import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts';
 * 
 * const closeModal = () => { isOpen.value = false; };
 * const openSettings = () => { router.push('/settings'); };
 * 
 * useKeyboardShortcuts({
 *   shortcuts: [
 *     { 
 *       key: 'Escape', 
 *       handler: closeModal,
 *       preventDefault: false  // Allow ESC to also blur inputs
 *     },
 *     { 
 *       key: 'k', 
 *       ctrl: true, 
 *       handler: openSettings 
 *     },
 *   ]
 * });
 * // Cleanup is automatic when component unmounts
 * ```
 * 
 * @example Manual attachment (for specific elements)
 * ```typescript
 * const { handleKeydown } = useKeyboardShortcuts({
 *   shortcuts: [{ key: 'Enter', handler: submit }],
 *   attachToDocument: false
 * });
 * 
 * // In template: <input @keydown="handleKeydown" />
 * ```
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions) {
    const { shortcuts, attachToDocument = true } = options;

    /**
     * Main keydown handler that checks all registered shortcuts.
     * Can be used directly on elements if attachToDocument is false.
     */
    const handleKeydown = async (e: KeyboardEvent): Promise<void> => {
        for (const shortcut of shortcuts) {
            // Case-insensitive key matching
            const keyMatches = e.key.toLowerCase() === shortcut.key.toLowerCase();

            // Strict modifier matching: undefined means "must not be pressed"
            const ctrlMatches = shortcut.ctrl ? e.ctrlKey : !e.ctrlKey;
            const altMatches = shortcut.alt ? e.altKey : !e.altKey;
            const shiftMatches = shortcut.shift ? e.shiftKey : !e.shiftKey;

            if (keyMatches && ctrlMatches && altMatches && shiftMatches) {
                // Default to preventing default unless explicitly false
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
