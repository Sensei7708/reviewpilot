import { execSync } from 'child_process';

export interface MRInfo {
  host: string;
  owner: string;
  repo: string;
  number: number;
}

export function parseMRUrl(url: string): MRInfo {
  const patterns = [
    /(https?:\/\/[^/]+)\/(.+?)\/-\/merge_requests\/(\d+)/i,
    /(https?:\/\/[^/]+)\/(.+?)\/merge_requests\/(\d+)\/?/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const fullPath = match[2].replace(/\.git$/, '');
      const firstSlash = fullPath.indexOf('/');
      const owner = firstSlash === -1 ? fullPath : fullPath.slice(0, firstSlash);
      const repo = firstSlash === -1 ? '' : fullPath.slice(firstSlash + 1);
      return {
        host: match[1],
        owner,
        repo,
        number: parseInt(match[3]),
      };
    }
  }

  throw new Error(
    'Invalid GitLab MR URL. Expected: https://gitlab.com/owner/repo/-/merge_requests/123'
  );
}

function encodeProjectPath(owner: string, repo: string): string {
  return encodeURIComponent(`${owner}/${repo}`);
}

export function fetchMRDiff(info: MRInfo, token?: string): string {
  const project = encodeProjectPath(info.owner, info.repo);
  const auth = token ? `-H "PRIVATE-TOKEN: ${token}"` : '';
  const apiHost = info.host === 'https://gitlab.com'
    ? 'https://gitlab.com'
    : `${info.host}/api/v4`;
  const cmd = `curl -s ${auth} -H "Accept: text/plain" "${apiHost}/api/v4/projects/${project}/merge_requests/${info.number}/diff"`;
  return execSync(cmd, { encoding: 'utf-8', timeout: 30000 });
}

export function fetchMRDetails(info: MRInfo, token?: string): string {
  const project = encodeProjectPath(info.owner, info.repo);
  const auth = token ? `-H "PRIVATE-TOKEN: ${token}"` : '';
  const apiHost = info.host === 'https://gitlab.com'
    ? 'https://gitlab.com'
    : `${info.host}/api/v4`;
  const cmd = `curl -s ${auth} "${apiHost}/api/v4/projects/${project}/merge_requests/${info.number}"`;
  return execSync(cmd, { encoding: 'utf-8', timeout: 15000 });
}

export function postMRComment(info: MRInfo, body: string, token: string): void {
  const project = encodeProjectPath(info.owner, info.repo);
  const jsonBody = JSON.stringify({ body });
  const escaped = jsonBody.replace(/"/g, '\\"');
  const apiHost = info.host === 'https://gitlab.com'
    ? 'https://gitlab.com'
    : `${info.host}/api/v4`;
  const cmd = [
    `curl -s -X POST`,
    `-H "PRIVATE-TOKEN: ${token}"`,
    `-H "Content-Type: application/json"`,
    `-d "${escaped}"`,
    `"${apiHost}/api/v4/projects/${project}/merge_requests/${info.number}/notes"`,
  ].join(' ');
  execSync(cmd, { encoding: 'utf-8', timeout: 15000 });
}
