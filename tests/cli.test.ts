import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { existsSync, unlinkSync, writeFileSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

describe('Command registration', () => {
  it('pr command has correct name, description, and options', async () => {
    const { prCommand } = await import('../src/cli/commands/pr.js');
    expect(prCommand.name()).toBe('pr');
    expect(prCommand.description()).toContain('GitHub');
    expect(prCommand.description()).toContain('GitLab');
    const opts = prCommand.options.map(o => o.attributeName());
    expect(opts).toContain('post');
    expect(opts).toContain('format');
    expect(opts).toContain('model');
  });

  it('diff command has correct name, description, and options', async () => {
    const { diffCommand } = await import('../src/cli/commands/diff.js');
    expect(diffCommand.name()).toBe('diff');
    expect(diffCommand.description()).toBe('Analyze a diff file');
    const opts = diffCommand.options.map(o => o.attributeName());
    expect(opts).toContain('format');
    expect(opts).toContain('model');
  });

  it('local command has correct name and options', async () => {
    const { localCommand } = await import('../src/cli/commands/local.js');
    expect(localCommand.name()).toBe('local');
    expect(localCommand.description()).toBe('Analyze local uncommitted changes');
    const opts = localCommand.options.map(o => o.attributeName());
    expect(opts).toContain('format');
    expect(opts).toContain('model');
  });

  it('check command has correct name and options', async () => {
    const { checkCommand } = await import('../src/cli/commands/check.js');
    expect(checkCommand.name()).toBe('check');
    const opts = checkCommand.options.map(o => o.attributeName());
    expect(opts).toContain('format');
    expect(opts).toContain('model');
  });

  it('init command has correct name and options', async () => {
    const { initCommand } = await import('../src/cli/commands/init.js');
    expect(initCommand.name()).toBe('init');
    expect(initCommand.description()).toContain('Set up');
    const opts = initCommand.options.map(o => o.attributeName());
    expect(opts).toContain('force');
  });

  it('license command has correct name and subcommands', async () => {
    const { licenseCommand } = await import('../src/cli/commands/license.js');
    expect(licenseCommand.name()).toBe('license');
    expect(licenseCommand.description()).toBe('Manage your ReviewPilot license');
    const sub = licenseCommand.commands.map(c => c.name());
    expect(sub).toContain('activate');
    expect(sub).toContain('status');
  });
});

describe('URL detection', () => {
  it('detects standard GitHub URLs', async () => {
    const { isGitHubUrl } = await import('../src/cli/commands/pr.js');
    expect(isGitHubUrl('https://github.com/user/repo/pull/1')).toBe(true);
  });

  it('rejects non-GitHub URLs', async () => {
    const { isGitHubUrl } = await import('../src/cli/commands/pr.js');
    expect(isGitHubUrl('https://gitlab.com/user/repo/-/merge_requests/1')).toBe(false);
    expect(isGitHubUrl('https://example.com')).toBe(false);
    expect(isGitHubUrl('')).toBe(false);
  });

  it('detects standard GitLab URLs', async () => {
    const { isGitLabUrl } = await import('../src/cli/commands/pr.js');
    expect(isGitLabUrl('https://gitlab.com/user/repo/-/merge_requests/1')).toBe(true);
  });

  it('detects self-hosted GitLab URLs', async () => {
    const { isGitLabUrl } = await import('../src/cli/commands/pr.js');
    expect(isGitLabUrl('https://gitlab.example.com/team/project/-/merge_requests/99')).toBe(true);
  });

  it('detects GitLab URLs without dash', async () => {
    const { isGitLabUrl } = await import('../src/cli/commands/pr.js');
    expect(isGitLabUrl('https://gitlab.com/user/repo/merge_requests/7')).toBe(true);
  });

  it('rejects non-GitLab URLs', async () => {
    const { isGitLabUrl } = await import('../src/cli/commands/pr.js');
    expect(isGitLabUrl('https://github.com/user/repo/pull/1')).toBe(false);
    expect(isGitLabUrl('https://example.com')).toBe(false);
    expect(isGitLabUrl('')).toBe(false);
  });

  it('correctly routes gitlab.com vs github.com', async () => {
    const { isGitHubUrl, isGitLabUrl } = await import('../src/cli/commands/pr.js');
    const gitlabUrl = 'https://gitlab.com/owner/repo/-/merge_requests/1';
    const githubUrl = 'https://github.com/owner/repo/pull/1';
    expect(isGitHubUrl(gitlabUrl)).toBe(false);
    expect(isGitHubUrl(githubUrl)).toBe(true);
    expect(isGitLabUrl(githubUrl)).toBe(false);
    expect(isGitLabUrl(gitlabUrl)).toBe(true);
  });
});

describe('init command', () => {
  const testDir = join(tmpdir(), `reviewpilot-init-test-${Date.now()}`);

  beforeEach(() => {
    if (!existsSync(testDir)) mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    try { rmSync(testDir, { recursive: true, force: true }); } catch {}
  });

  it('creates .reviewpilotrc config file', async () => {
    const { initCommand } = await import('../src/cli/commands/init.js');
    const origCwd = process.cwd;
    process.cwd = () => testDir;

    try {
      initCommand.parse(['init'], { from: 'user' });
      const configPath = join(testDir, '.reviewpilotrc');
      expect(existsSync(configPath)).toBe(true);
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      expect(config.model).toBe('codellama');
      expect(config.ollamaHost).toBe('http://127.0.0.1:11434');
      expect(config.rules).toEqual(['bugs', 'security', 'performance', 'style']);
    } finally {
      process.cwd = origCwd;
    }
  });

  it('does not overwrite existing config without --force', async () => {
    const configPath = join(testDir, '.reviewpilotrc');
    writeFileSync(configPath, JSON.stringify({ custom: true }), 'utf-8');

    const { initCommand } = await import('../src/cli/commands/init.js');
    const origCwd = process.cwd;
    process.cwd = () => testDir;

    try {
      initCommand.parse(['init'], { from: 'user' });
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      expect(config.custom).toBe(true);
    } finally {
      process.cwd = origCwd;
    }
  });
});

describe('license status --json', () => {
  it('outputs valid JSON with correct structure', () => {
    const cliPath = join(process.cwd(), 'dist', 'cli', 'index.js');
    const result = execSync(`node "${cliPath}" license status --json`, {
      encoding: 'utf-8',
      timeout: 10000,
    });
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('tier');
    expect(parsed).toHaveProperty('isPro');
    expect(parsed).toHaveProperty('license');
    expect(typeof parsed.tier).toBe('string');
    expect(typeof parsed.isPro).toBe('boolean');
  });
});

describe('CLI help output', () => {
  it('main help lists all commands', () => {
    const cliPath = join(process.cwd(), 'dist', 'cli', 'index.js');
    const result = execSync(`node "${cliPath}" --help`, {
      encoding: 'utf-8',
      timeout: 10000,
    });
    expect(result).toContain('pr');
    expect(result).toContain('diff');
    expect(result).toContain('local');
    expect(result).toContain('check');
    expect(result).toContain('init');
    expect(result).toContain('license');
    expect(result).toContain('sales');
  });

  it('pr --help shows GitHub and GitLab', () => {
    const cliPath = join(process.cwd(), 'dist', 'cli', 'index.js');
    const result = execSync(`node "${cliPath}" pr --help`, {
      encoding: 'utf-8',
      timeout: 10000,
    });
    expect(result).toContain('GitHub');
    expect(result).toContain('GitLab');
  });
});

describe('sales command', () => {
  it('sales command has correct name and description', async () => {
    const { salesCommand } = await import('../src/cli/commands/sales.js');
    expect(salesCommand.name()).toBe('sales');
    expect(salesCommand.description()).toContain('sales');
  });

  it('sales has all subcommands', async () => {
    const { salesCommand } = await import('../src/cli/commands/sales.js');
    const subs = salesCommand.commands.map(c => c.name());
    expect(subs).toContain('research');
    expect(subs).toContain('leads');
    expect(subs).toContain('add');
    expect(subs).toContain('outreach');
    expect(subs).toContain('nurture');
    expect(subs).toContain('report');
  });

  it('sales research has competitor and active options', async () => {
    const { salesCommand } = await import('../src/cli/commands/sales.js');
    const research = salesCommand.commands.find(c => c.name() === 'research')!;
    expect(research).toBeDefined();
    const opts = research.options.map(o => o.attributeName());
    expect(opts).toContain('competitors');
    expect(opts).toContain('active');
    expect(opts).toContain('query');
  });

  it('sales leads has format, status, and tier options', async () => {
    const { salesCommand } = await import('../src/cli/commands/sales.js');
    const leads = salesCommand.commands.find(c => c.name() === 'leads')!;
    expect(leads).toBeDefined();
    const opts = leads.options.map(o => o.attributeName());
    expect(opts).toContain('format');
    expect(opts).toContain('status');
    expect(opts).toContain('tier');
  });

  it('sales add has required name and optional fields', async () => {
    const { salesCommand } = await import('../src/cli/commands/sales.js');
    const add = salesCommand.commands.find(c => c.name() === 'add')!;
    expect(add).toBeDefined();
    const opts = add.options.map(o => o.attributeName());
    expect(opts).toContain('name');
    expect(opts).toContain('repo');
    expect(opts).toContain('url');
    expect(opts).toContain('email');
    expect(opts).toContain('source');
  });

  it('sales outreach has all, lead, file, markSent, pending, sent options', async () => {
    const { salesCommand } = await import('../src/cli/commands/sales.js');
    const outreach = salesCommand.commands.find(c => c.name() === 'outreach')!;
    expect(outreach).toBeDefined();
    const opts = outreach.options.map(o => o.attributeName());
    expect(opts).toContain('all');
    expect(opts).toContain('lead');
    expect(opts).toContain('file');
    expect(opts).toContain('markSent');
    expect(opts).toContain('pending');
    expect(opts).toContain('sent');
  });

  it('sales nurture has followUps and report options', async () => {
    const { salesCommand } = await import('../src/cli/commands/sales.js');
    const nurture = salesCommand.commands.find(c => c.name() === 'nurture')!;
    expect(nurture).toBeDefined();
    const opts = nurture.options.map(o => o.attributeName());
    expect(opts).toContain('followUps');
    expect(opts).toContain('report');
  });

  it('sales help lists all subcommands', () => {
    const cliPath = join(process.cwd(), 'dist', 'cli', 'index.js');
    const result = execSync(`node "${cliPath}" sales --help`, {
      encoding: 'utf-8',
      timeout: 10000,
    });
    expect(result).toContain('research');
    expect(result).toContain('leads');
    expect(result).toContain('add');
    expect(result).toContain('outreach');
    expect(result).toContain('nurture');
    expect(result).toContain('report');
  });
});
