import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

describe('checkOllama', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('returns false when Ollama is unreachable', async () => {
    const { checkOllama } = await import('../src/cli/utils/ollama-check.js');
    const config = { ollamaHost: 'http://127.0.0.1:1', model: 'codellama' } as any;
    const result = await checkOllama(config);
    expect(result).toBe(false);
  });

  it('returns false when connection check returns false', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Connection refused'));
    const { checkOllama } = await import('../src/cli/utils/ollama-check.js');
    const config = { ollamaHost: 'http://127.0.0.1:11434', model: 'codellama' } as any;
    const result = await checkOllama(config);
    expect(result).toBe(false);
    (global.fetch as jest.Mock).mockRestore();
  });

  it('returns true when connection succeeds and model exists', async () => {
    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [{ name: 'codellama:latest' }] }),
      } as Response);
    const { checkOllama } = await import('../src/cli/utils/ollama-check.js');
    const config = { ollamaHost: 'http://127.0.0.1:11434', model: 'codellama' } as any;
    const result = await checkOllama(config);
    expect(result).toBe(true);
    (global.fetch as jest.Mock).mockRestore();
  });

  it('returns true even when model not found (warns only)', async () => {
    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [{ name: 'llama3:latest' }] }),
      } as Response);
    const { checkOllama } = await import('../src/cli/utils/ollama-check.js');
    const config = { ollamaHost: 'http://127.0.0.1:11434', model: 'codellama' } as any;
    const result = await checkOllama(config);
    expect(result).toBe(true);
    (global.fetch as jest.Mock).mockRestore();
  });
});
