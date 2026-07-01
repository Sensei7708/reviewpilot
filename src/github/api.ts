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

export async function fetchPRDiff(info: PRInfo, token?: string): Promise<string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3.diff',
  };
  if (token) headers.Authorization = `token ${token}`;

  const response = await fetch(
    `https://api.github.com/repos/${info.owner}/${info.repo}/pulls/${info.number}`,
    { headers, signal: AbortSignal.timeout(30000) }
  );
  if (!response.ok) {
    throw new Error(`GitHub API error: HTTP ${response.status} ${response.statusText}`);
  }
  return response.text();
}

export async function postPRComment(info: PRInfo, body: string, token: string): Promise<void> {
  const response = await fetch(
    `https://api.github.com/repos/${info.owner}/${info.repo}/issues/${info.number}/comments`,
    {
      method: 'POST',
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body }),
      signal: AbortSignal.timeout(15000),
    }
  );
  if (!response.ok) {
    throw new Error(`GitHub API error posting comment: HTTP ${response.status} ${response.statusText}`);
  }
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
