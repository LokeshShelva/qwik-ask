/**
 * Global test setup file.
 * 
 * Mocks Tauri APIs that aren't available in test environment.
 */

import { vi } from 'vitest';

// Mock @tauri-apps/api/core
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

// Mock @tauri-apps/api/window
vi.mock('@tauri-apps/api/window', () => ({
    getCurrentWindow: vi.fn(() => ({
        show: vi.fn(),
        hide: vi.fn(),
        setFocus: vi.fn(),
        setSize: vi.fn(),
        center: vi.fn(),
        innerSize: vi.fn(() => Promise.resolve({ width: 680, height: 110 })),
        minimize: vi.fn(),
        onCloseRequested: vi.fn(() => Promise.resolve(() => { })),
    })),
    LogicalSize: vi.fn((width, height) => ({ width, height })),
}));

// Mock @tauri-apps/plugin-sql
vi.mock('@tauri-apps/plugin-sql', () => ({
    default: {
        load: vi.fn(() => Promise.resolve({
            execute: vi.fn(),
            select: vi.fn(() => Promise.resolve([])),
        })),
    },
}));
