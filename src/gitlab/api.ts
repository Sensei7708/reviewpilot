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

function getApiHost(info: MRInfo): string {
  return info.host === 'https://gitlab.com'
    ? 'https://gitlab.com'
    : `${info.host}/api/v4`;
}

export async function fetchMRDiff(info: MRInfo, token?: string): Promise<string> {
  const project = encodeProjectPath(info.owner, info.repo);
  const headers: Record<string, string> = { Accept: 'text/plain' };
  if (token) headers['PRIVATE-TOKEN'] = token;

  const response = await fetch(
    `${getApiHost(info)}/api/v4/projects/${project}/merge_requests/${info.number}/diff`,
    { headers, signal: AbortSignal.timeout(30000) }
  );
  if (!response.ok) {
    throw new Error(`GitLab API error: HTTP ${response.status} ${response.statusText}`);
  }
  return response.text();
}

export async function fetchMRDetails(info: MRInfo, token?: string): Promise<string> {
  const project = encodeProjectPath(info.owner, info.repo);
  const headers: Record<string, string> = {};
  if (token) headers['PRIVATE-TOKEN'] = token;

  const response = await fetch(
    `${getApiHost(info)}/api/v4/projects/${project}/merge_requests/${info.number}`,
    { headers, signal: AbortSignal.timeout(15000) }
  );
  if (!response.ok) {
    throw new Error(`GitLab API error: HTTP ${response.status} ${response.statusText}`);
  }
  return response.text();
}

export async function postMRComment(info: MRInfo, body: string, token: string): Promise<void> {
  const project = encodeProjectPath(info.owner, info.repo);

  const response = await fetch(
    `${getApiHost(info)}/api/v4/projects/${project}/merge_requests/${info.number}/notes`,
    {
      method: 'POST',
      headers: {
        'PRIVATE-TOKEN': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body }),
      signal: AbortSignal.timeout(15000),
    }
  );
  if (!response.ok) {
    throw new Error(`GitLab API error posting comment: HTTP ${response.status} ${response.statusText}`);
  }
}
