// Composable for managing Tauri window resize animations

import { ref } from 'vue';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';

export interface WindowResizeOptions {
    minHeight: number;
    maxHeight: number;
    baseWidth: number;
    animationDuration?: number;
}

const DEFAULT_OPTIONS: WindowResizeOptions = {
    minHeight: 110,
    maxHeight: 500,
    baseWidth: 680,
    animationDuration: 250,
};

export function useWindowResize(options: Partial<WindowResizeOptions> = {}) {
    const config = { ...DEFAULT_OPTIONS, ...options };
    const appWindow = getCurrentWindow();
    const isAnimating = ref(false);

    /**
     * Cubic ease-out function for smooth deceleration
     */
    const easeOutCubic = (progress: number): number => {
        return 1 - Math.pow(1 - progress, 3);
    };

    /**
     * Animate window resize with smooth easing
     */
    const animateResize = async (targetWidth: number, targetHeight: number): Promise<void> => {
        if (isAnimating.value) return;

        try {
            const currentSize = await appWindow.innerSize();
            const startWidth = currentSize.width;
            const startHeight = currentSize.height;

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
     * Expand window to max height with animation
     */
    const expand = async (): Promise<void> => {
        await animateResize(config.baseWidth, config.maxHeight);
    };

    /**
     * Collapse window to min height instantly (for snappy feel)
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
     * Update window size based on expanded state
     */
    const updateSize = async (isExpanded: boolean): Promise<void> => {
        if (isExpanded) {
            await expand();
        } else {
            await collapse();
        }
    };

    /**
     * Hide the window
     */
    const hide = async (): Promise<void> => {
        await appWindow.hide();
    };

    return {
        appWindow,
        isAnimating,
        animateResize,
        expand,
        collapse,
        updateSize,
        hide,
        config,
    };
}
