/**
 * Tests for Gemini service.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateTitle } from '../../services/gemini';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('gemini service', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    describe('generateTitle', () => {
        it('should generate a title from user and assistant messages', async () => {
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

            const title = await generateTitle(
                'test-api-key',
                'What is TypeScript?',
                'TypeScript is a typed superset of JavaScript...'
            );

            expect(title).toBe('TypeScript Basics');
            expect(mockFetch).toHaveBeenCalledOnce();
        });

        it('should return empty string on API error', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
            });

            const title = await generateTitle(
                'invalid-key',
                'Hello',
                'Hi there!'
            );

            expect(title).toBe('');
        });

        it('should return empty string on network error', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const title = await generateTitle(
                'test-api-key',
                'Hello',
                'Hi!'
            );

            expect(title).toBe('');
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

            const title = await generateTitle('key', 'msg', 'response');

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

            const title = await generateTitle('key', 'msg', 'response');

            expect(title).toBe('Quoted Title');
        });
    });
});
