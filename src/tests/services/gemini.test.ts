/**
 * Tests for Gemini service.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { simpleCompletion } from '../../services/llm/gemini';
import { generateTitle } from '../../services/llm';
import type { LlmConfig } from '../../services/llm/types';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('gemini service', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    describe('simpleCompletion', () => {
        it('should return text from API response', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    candidates: [{
                        content: {
                            parts: [{ text: 'TypeScript Basics' }]
                        }
                    }]
                }),
            });

            const config: LlmConfig = { apiKey: 'test-api-key', model: 'gemini-1.5-flash' };
            const result = await simpleCompletion(config, 'Generate a title');

            expect(result).toBe('TypeScript Basics');
            expect(mockFetch).toHaveBeenCalledOnce();
        });

        it('should return empty string on API error', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
            });

            const config: LlmConfig = { apiKey: 'invalid-key', model: 'gemini-1.5-flash' };
            const result = await simpleCompletion(config, 'Hello');

            expect(result).toBe('');
        });

        it('should return empty string on network error', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const config: LlmConfig = { apiKey: 'test-api-key', model: 'gemini-1.5-flash' };
            const result = await simpleCompletion(config, 'Hello');

            expect(result).toBe('');
        });
    });

    describe('generateTitle', () => {
        it('should generate a title from user message', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    candidates: [{
                        content: {
                            parts: [{ text: 'TypeScript Basics' }]
                        }
                    }]
                }),
            });

            const config: LlmConfig = { apiKey: 'test-api-key', model: 'gemini-1.5-flash' };
            const title = await generateTitle(config, 'gemini', 'What is TypeScript?');

            expect(title).toBe('TypeScript Basics');
            expect(mockFetch).toHaveBeenCalledOnce();
        });

        it('should clean up "Title:" prefix from response', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    candidates: [{
                        content: {
                            parts: [{ text: 'Title: Clean Response Test' }]
                        }
                    }]
                }),
            });

            const config: LlmConfig = { apiKey: 'test-api-key', model: 'gemini-1.5-flash' };
            const title = await generateTitle(config, 'gemini', 'Some message');

            expect(title).toBe('Clean Response Test');
        });

        it('should remove quotes from title', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    candidates: [{
                        content: {
                            parts: [{ text: '"Quoted Title"' }]
                        }
                    }]
                }),
            });

            const config: LlmConfig = { apiKey: 'test-api-key', model: 'gemini-1.5-flash' };
            const title = await generateTitle(config, 'gemini', 'Some message');

            expect(title).toBe('Quoted Title');
        });
    });
});
