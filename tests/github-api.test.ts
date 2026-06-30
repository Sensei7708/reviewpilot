import { describe, it, expect } from '@jest/globals';

describe('parsePRUrl', () => {
  it('parses a standard GitHub PR URL', async () => {
    const { parsePRUrl } = await import('../src/github/api.js');
    const info = parsePRUrl('https://github.com/expressjs/express/pull/5678');
    expect(info.owner).toBe('expressjs');
    expect(info.repo).toBe('express');
    expect(info.number).toBe(5678);
  });

  it('parses PR URL with .git suffix in repo', async () => {
    const { parsePRUrl } = await import('../src/github/api.js');
    const info = parsePRUrl('https://github.com/user/repo.git/pull/42');
    expect(info.owner).toBe('user');
    expect(info.repo).toBe('repo');
    expect(info.number).toBe(42);
  });

  it('parses PR URL with single-digit number', async () => {
    const { parsePRUrl } = await import('../src/github/api.js');
    const info = parsePRUrl('https://github.com/org/project/pull/1');
    expect(info.owner).toBe('org');
    expect(info.repo).toBe('project');
    expect(info.number).toBe(1);
  });

  it('throws for invalid GitHub PR URL', async () => {
    const { parsePRUrl } = await import('../src/github/api.js');
    expect(() => parsePRUrl('https://example.com/repo')).toThrow();
  });

  it('throws for non-PR GitHub URL', async () => {
    const { parsePRUrl } = await import('../src/github/api.js');
    expect(() => parsePRUrl('https://github.com/user/repo/issues/1')).toThrow();
  });

  it('throws for empty string', async () => {
    const { parsePRUrl } = await import('../src/github/api.js');
    expect(() => parsePRUrl('')).toThrow();
  });
});

describe('getLocalDiff', () => {
  it('returns a string (empty if no git repo)', async () => {
    const { getLocalDiff } = await import('../src/github/api.js');
    const diff = getLocalDiff();
    expect(typeof diff).toBe('string');
  });
});

describe('getUncommittedDiff', () => {
  it('returns a string', async () => {
    const { getUncommittedDiff } = await import('../src/github/api.js');
    const diff = getUncommittedDiff();
    expect(typeof diff).toBe('string');
  });
});
