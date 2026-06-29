import { execSync } from 'child_process';

export interface PRInfo {
  owner: string;
  repo: string;
  number: number;
}

export interface PRFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

export function parsePRUrl(url: string): PRInfo {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i);
  if (!match) {
    throw new Error('Invalid GitHub PR URL. Expected: https://github.com/owner/repo/pull/123');
  }
  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ''),
    number: parseInt(match[3]),
  };
}

export function fetchPRDiff(info: PRInfo, token?: string): string {
  const auth = token ? `-H "Authorization: token ${token}"` : '';
  const cmd = `curl -s ${auth} -H "Accept: application/vnd.github.v3.diff" "https://api.github.com/repos/${info.owner}/${info.repo}/pulls/${info.number}"`;
  return execSync(cmd, { encoding: 'utf-8', timeout: 30000 });
}

export function postPRComment(info: PRInfo, body: string, token: string): void {
  const jsonBody = JSON.stringify({ body });
  const escaped = jsonBody.replace(/"/g, '\\"');
  const cmd = [
    `curl -s -X POST`,
    `-H "Authorization: token ${token}"`,
    `-H "Content-Type: application/json"`,
    `-d "${escaped}"`,
    `"https://api.github.com/repos/${info.owner}/${info.repo}/issues/${info.number}/comments"`,
  ].join(' ');

  execSync(cmd, { encoding: 'utf-8', timeout: 15000 });
}

export function getLocalDiff(branch?: string): string {
  const target = branch || 'main';
  try {
    return execSync(`git diff ${target}...HEAD`, { encoding: 'utf-8', timeout: 10000 });
  } catch {
    try {
      return execSync('git diff --cached', { encoding: 'utf-8', timeout: 10000 });
    } catch {
      return execSync('git diff', { encoding: 'utf-8', timeout: 10000 });
    }
  }
}

export function getUncommittedDiff(): string {
  try {
    return execSync('git diff HEAD', { encoding: 'utf-8', timeout: 10000 });
  } catch {
    return '';
  }
}
