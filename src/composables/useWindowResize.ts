/**
 * @fileoverview Composable for managing Tauri window resize animations.
 * 
 * Provides smooth animated window resizing for the launcher-style UI.
 * Uses requestAnimationFrame for fluid animations with easing.
 * 
 * @example Basic usage
 * ```typescript
 * const { expand, collapse, updateSize, hide } = useWindowResize({
 *   minHeight: 110,
 *   maxHeight: 500,
 *   baseWidth: 680,
 * });
 * 
 * // Expand with animation
 * await expand();
 * 
 * // Collapse instantly
 * await collapse();
 * 
 * // Toggle based on state
 * await updateSize(hasMessages.value);
 * ```
 * 
 * @module composables/useWindowResize
 */

import { ref } from 'vue';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';

/**
 * Configuration options for window resize behavior.
 */
export interface WindowResizeOptions {
    /** Minimum (collapsed) height in logical pixels */
    minHeight: number;
    /** Maximum (expanded) height in logical pixels */
    maxHeight: number;
    /** Base width (constant, doesn't change during resize) */
    baseWidth: number;
    /** Animation duration in milliseconds (default: 250) */
    animationDuration?: number;
}

/** Default configuration values */
const DEFAULT_OPTIONS: WindowResizeOptions = {
    minHeight: 110,
    maxHeight: 500,
    baseWidth: 680,
    animationDuration: 250,
};

/**
 * Composable for animated Tauri window resizing.
 * 
 * **Design notes:**
 * - Animations use cubic ease-out for smooth deceleration
 * - Collapse is instant (no animation) for snappy feel
 * - Window is centered after resize operations
 * - Guards against concurrent animations (isAnimating flag)
 * 
 * @param options - Resize configuration (merged with defaults)
 * @returns Window control methods and state
 * 
 * @example With reactive state
 * ```typescript
 * const { updateSize } = useWindowResize();
 * 
 * // Watch for state changes and resize accordingly
 * watch(isExpanded, async (expanded) => {
 *   await updateSize(expanded);
 * });
 * ```
 */
export function useWindowResize(options: Partial<WindowResizeOptions> = {}) {
    const config = { ...DEFAULT_OPTIONS, ...options };
    const appWindow = getCurrentWindow();

    /** Whether an animation is currently in progress */
    const isAnimating = ref(false);

    /**
     * Cubic ease-out easing function.
     * Starts fast, decelerates towards the end.
     * 
     * @param progress - Value from 0 to 1
     * @returns Eased value from 0 to 1
     * @internal
     */
    const easeOutCubic = (progress: number): number => {
        return 1 - Math.pow(1 - progress, 3);
    };

    /**
     * Animate window to target size with smooth easing.
     * 
     * **Quirks:**
     * - No-op if already animating (prevents jank)
     * - No-op if already at target size
     * - Centers window after animation completes
     * 
     * @param targetWidth - Target width in logical pixels
     * @param targetHeight - Target height in logical pixels
     */
    const animateResize = async (targetWidth: number, targetHeight: number): Promise<void> => {
        if (isAnimating.value) return;

        try {
            const currentSize = await appWindow.innerSize();
            const startWidth = currentSize.width;
            const startHeight = currentSize.height;

            // Already at target, nothing to do
            if (startWidth === targetWidth && startHeight === targetHeight) return;

            isAnimating.value = true;
            const startTime = performance.now();
            const widthDiff = targetWidth - startWidth;
            const heightDiff = targetHeight - startHeight;

            const animate = async (currentTime: number): Promise<void> => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / config.animationDuration!, 1);

                const eased = easeOutCubic(progress);
                const newWidth = Math.round(startWidth + widthDiff * eased);
                const newHeight = Math.round(startHeight + heightDiff * eased);

                await appWindow.setSize(new LogicalSize(newWidth, newHeight));

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    // Ensure exact final size and center
                    await appWindow.setSize(new LogicalSize(targetWidth, targetHeight));
                    await appWindow.center();
                    isAnimating.value = false;
                }
            };

            requestAnimationFrame(animate);
        } catch (e) {
            console.error('Failed to animate resize:', e);
            isAnimating.value = false;
        }
    };

    /**
     * Expand window to maximum height with animation.
     */
    const expand = async (): Promise<void> => {
        await animateResize(config.baseWidth, config.maxHeight);
    };

    /**
     * Collapse window to minimum height instantly.
     * 
     * **Design choice:** Collapse is instant (not animated) for a snappy
     * feel when dismissing the launcher.
     */
    const collapse = async (): Promise<void> => {
        try {
            await appWindow.setSize(new LogicalSize(config.baseWidth, config.minHeight));
            await appWindow.center();
        } catch (e) {
            console.error('Failed to collapse window:', e);
        }
    };

    /**
     * Update window size based on expanded state.
     * Convenience method that chooses expand or collapse.
     * 
     * @param isExpanded - Whether the UI should be in expanded state
     * 
     * @example
     * ```typescript
     * // Use with Vue watcher
     * watch([hasMessages, historyOpen], async () => {
     *   const expanded = hasMessages.value || historyOpen.value;
     *   await updateSize(expanded);
     * });
     * ```
     */
    const updateSize = async (isExpanded: boolean): Promise<void> => {
        if (isExpanded) {
            await expand();
        } else {
            await collapse();
        }
    };

    /**
     * Hide the window completely.
     * 
     * **Note:** Window is hidden, not closed. Call `appWindow.show()`
     * to make it visible again (typically done by global shortcut).
     */
    const hide = async (): Promise<void> => {
        await appWindow.hide();
    };

    return {
        /** The underlying Tauri window instance for advanced operations */
        appWindow,
        isAnimating,
        /** The resolved configuration */
        config,
        animateResize,
        expand,
        collapse,
        updateSize,
        hide,
    };
}
