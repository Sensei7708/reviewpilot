import { describe, it, expect } from '@jest/globals';
import { execSync } from 'child_process';
import { join } from 'path';

const CLI_PATH = join(process.cwd(), 'dist', 'cli', 'index.js');

function runCLI(args: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`node "${CLI_PATH}" ${args}`, {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (err: any) {
    return {
      stdout: err.stdout || '',
      stderr: err.stderr || '',
      exitCode: err.status || 1,
    };
  }
}

describe('CLI integration', () => {
  it('--version shows package version', () => {
    const { stdout } = runCLI('--version');
    expect(stdout.trim()).toMatch(/\d+\.\d+\.\d+/);
  });

  it('--help lists all commands', () => {
    const { stdout } = runCLI('--help');
    expect(stdout).toContain('pr');
    expect(stdout).toContain('diff');
    expect(stdout).toContain('local');
    expect(stdout).toContain('check');
    expect(stdout).toContain('init');
    expect(stdout).toContain('license');
    expect(stdout).toContain('sales');
  });

  it('pr --help shows PR review options', () => {
    const { stdout } = runCLI('pr --help');
    expect(stdout).toContain('GitHub');
    expect(stdout).toContain('GitLab');
    expect(stdout).toContain('--post');
    expect(stdout).toContain('--format');
    expect(stdout).toContain('--model');
  });

  it('diff --help shows diff review options', () => {
    const { stdout } = runCLI('diff --help');
    expect(stdout).toContain('file');
    expect(stdout).toContain('--format');
    expect(stdout).toContain('--model');
  });

  it('local --help shows local review options', () => {
    const { stdout } = runCLI('local --help');
    expect(stdout).toContain('uncommitted');
    expect(stdout).toContain('--format');
    expect(stdout).toContain('--model');
  });

  it('check --help shows branch comparison options', () => {
    const { stdout } = runCLI('check --help');
    expect(stdout).toContain('branch');
    expect(stdout).toContain('--format');
    expect(stdout).toContain('--model');
  });

  it('init --help shows setup options', () => {
    const { stdout } = runCLI('init --help');
    expect(stdout).toContain('Set up');
    expect(stdout).toContain('--force');
  });

  it('license --help shows license management options', () => {
    const { stdout } = runCLI('license --help');
    expect(stdout).toContain('activate');
    expect(stdout).toContain('status');
  });

  it('sales --help shows all sales subcommands', () => {
    const { stdout } = runCLI('sales --help');
    expect(stdout).toContain('research');
    expect(stdout).toContain('leads');
    expect(stdout).toContain('add');
    expect(stdout).toContain('outreach');
    expect(stdout).toContain('nurture');
    expect(stdout).toContain('report');
  });

  it('license status --json outputs valid JSON', () => {
    const { stdout } = runCLI('license status --json');
    const parsed = JSON.parse(stdout);
    expect(parsed).toHaveProperty('tier');
    expect(parsed).toHaveProperty('isPro');
    expect(parsed).toHaveProperty('license');
  });
});
