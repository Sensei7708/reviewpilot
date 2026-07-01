import { describe, it, expect } from '@jest/globals';

describe('createOllamaClient', () => {
  it('returns a client with review and checkConnection methods', async () => {
    const { createOllamaClient } = await import('../src/core/llm.js');
    const client = createOllamaClient();
    expect(client).toHaveProperty('review');
    expect(client).toHaveProperty('checkConnection');
    expect(typeof client.review).toBe('function');
    expect(typeof client.checkConnection).toBe('function');
  });

  it('uses default model and host when no options provided', async () => {
    const { createOllamaClient } = await import('../src/core/llm.js');
    const client = createOllamaClient();
    expect(client).toBeDefined();
  });

  it('accepts custom model option', async () => {
    const { createOllamaClient } = await import('../src/core/llm.js');
    const client = createOllamaClient({ model: 'deepseek-coder', host: 'http://localhost:11434' });
    expect(client).toBeDefined();
  });

  it('checkConnection returns false when Ollama is not running', async () => {
    const { createOllamaClient } = await import('../src/core/llm.js');
    const client = createOllamaClient({ host: 'http://127.0.0.1:1' });
    const connected = await client.checkConnection();
    expect(connected).toBe(false);
  });

  it('review throws a descriptive error when Ollama is unreachable', async () => {
    expect.assertions(1);
    const { createOllamaClient } = await import('../src/core/llm.js');
    const client = createOllamaClient({ host: 'http://127.0.0.1:1' });
    try {
      await client.review({ diff: 'test', file: 'test.ts' });
    } catch (err) {
      expect((err as Error).message).toMatch(/Ollama request failed/);
    }
  });
});

describe('getAvailableModels', () => {
  it('returns empty array when Ollama is not reachable', async () => {
    const { getAvailableModels } = await import('../src/core/llm.js');
    const models = await getAvailableModels('http://127.0.0.1:1');
    expect(Array.isArray(models)).toBe(true);
    expect(models).toHaveLength(0);
  });

  it('uses default host when none provided', async () => {
    const { getAvailableModels } = await import('../src/core/llm.js');
    const models = await getAvailableModels();
    expect(Array.isArray(models)).toBe(true);
  });
});
