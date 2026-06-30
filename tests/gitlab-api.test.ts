import { describe, it, expect } from '@jest/globals';

describe('parseMRUrl', () => {
  it('parses a standard gitlab.com MR URL', async () => {
    const { parseMRUrl } = await import('../src/gitlab/api.js');
    const info = parseMRUrl('https://gitlab.com/gitlab-org/gitlab/-/merge_requests/1');
    expect(info.host).toBe('https://gitlab.com');
    expect(info.owner).toBe('gitlab-org');
    expect(info.repo).toBe('gitlab');
    expect(info.number).toBe(1);
  });

  it('parses MR URL with multi-part repo name', async () => {
    const { parseMRUrl } = await import('../src/gitlab/api.js');
    const info = parseMRUrl('https://gitlab.com/my-org/my-sub-group/my-project/-/merge_requests/42');
    expect(info.owner).toBe('my-org');
    expect(info.repo).toBe('my-sub-group/my-project');
    expect(info.number).toBe(42);
  });

  it('parses MR URL without the leading dash', async () => {
    const { parseMRUrl } = await import('../src/gitlab/api.js');
    const info = parseMRUrl('https://gitlab.com/user/repo/merge_requests/7');
    expect(info.owner).toBe('user');
    expect(info.repo).toBe('repo');
    expect(info.number).toBe(7);
    expect(info.host).toBe('https://gitlab.com');
  });

  it('parses self-hosted GitLab instance URL', async () => {
    const { parseMRUrl } = await import('../src/gitlab/api.js');
    const info = parseMRUrl('https://gitlab.example.com/team/project/-/merge_requests/99');
    expect(info.host).toBe('https://gitlab.example.com');
    expect(info.owner).toBe('team');
    expect(info.repo).toBe('project');
    expect(info.number).toBe(99);
  });

  it('parses self-hosted GitLab with sub-group path', async () => {
    const { parseMRUrl } = await import('../src/gitlab/api.js');
    const info = parseMRUrl('https://gitlab.internal.company.io/engineering/backend/api/-/merge_requests/3');
    expect(info.host).toBe('https://gitlab.internal.company.io');
    expect(info.owner).toBe('engineering');
    expect(info.repo).toBe('backend/api');
    expect(info.number).toBe(3);
  });

  it('throws for GitHub URL', async () => {
    const { parseMRUrl } = await import('../src/gitlab/api.js');
    expect(() => parseMRUrl('https://github.com/user/repo/pull/1')).toThrow();
  });

  it('throws for invalid URL', async () => {
    const { parseMRUrl } = await import('../src/gitlab/api.js');
    expect(() => parseMRUrl('not-a-url')).toThrow();
  });

  it('throws for empty string', async () => {
    const { parseMRUrl } = await import('../src/gitlab/api.js');
    expect(() => parseMRUrl('')).toThrow();
  });
});
