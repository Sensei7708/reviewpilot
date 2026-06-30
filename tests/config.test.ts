import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('config', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('loads default config when no files exist', async () => {
    const { loadConfig } = await import('../src/core/config.js');
    const config = loadConfig();
    expect(config.model).toBe('codellama');
    expect(config.ollamaHost).toBe('http://127.0.0.1:11434');
    expect(config.rules).toEqual(['bugs', 'security', 'performance', 'style']);
  });

  it('overrides model from environment variable', async () => {
    process.env.REVIEWPILOT_MODEL = 'deepseek-coder';
    const { loadConfig } = await import('../src/core/config.js');
    const config = loadConfig();
    expect(config.model).toBe('deepseek-coder');
  });

  it('overrides ollama host from environment', async () => {
    process.env.REVIEWPILOT_OLLAMA_HOST = 'http://localhost:8080';
    const { loadConfig } = await import('../src/core/config.js');
    const config = loadConfig();
    expect(config.ollamaHost).toBe('http://localhost:8080');
  });
});

describe('getReviewCount', () => {
  it('returns default counts when no usage file exists', async () => {
    const { getReviewCount } = await import('../src/core/config.js');
    const counts = getReviewCount();
    expect(counts.total).toBe(0);
    expect(counts.remaining).toBe(5);
  });
});
