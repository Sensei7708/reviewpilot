import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { Lead, LeadSource, LeadTier, LeadStatus } from './types.js';
import { getPipelineDir } from './coordinator.js';

const COMPETITOR_KEYWORDS = [
  'coderabbit', 'codereviewbot', 'code-review-gpt', 'pr-agent',
  'code-review', 'codacy', 'sonarcloud', 'codeclimate', 'codeql',
  'deepcode', 'sider', 'reviewdog', 'lgtm', 'infer',
];

const COMPETITOR_CONFIG_FILES = [
  '.coderabbit.yaml', '.coderabbit.yml', '.codereviewbotrc',
  'codacy.yml', '.codeclimate.yml', 'sonar-project.properties',
  '.codeql.yml', 'codeql-analysis.yml',
];

const LEAD_SCORE_WEIGHTS = {
  hasCompetitor: 15,
  isActive: 10,
  hasRecentPRs: 8,
  isOpenSource: 5,
  hasManyContributors: 12,
  hasCodeReviewEnabled: 20,
};

async function getRepoActivity(repo: string): Promise<{ stars: number; openIssues: number; lastPush: string }> {
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return { stars: 0, openIssues: 0, lastPush: '' };
    const data = await response.json() as { stargazers_count?: number; open_issues_count?: number; pushed_at?: string };
    return {
      stars: data.stargazers_count || 0,
      openIssues: data.open_issues_count || 0,
      lastPush: data.pushed_at || '',
    };
  } catch {
    return { stars: 0, openIssues: 0, lastPush: '' };
  }
}

async function searchRepos(query: string): Promise<Array<{ full_name: string; description: string; html_url: string }>> {
  try {
    const encoded = encodeURIComponent(query);
    const response = await fetch(
      `https://api.github.com/search/repositories?q=${encoded}&sort=updated&per_page=20`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (!response.ok) return [];
    const data = await response.json() as { items?: Array<{ full_name: string; description?: string; html_url: string }> };
    return data.items?.map(i => ({
      full_name: i.full_name,
      description: i.description || '',
      html_url: i.html_url,
    })) || [];
  } catch {
    return [];
  }
}

async function checkRepoForCompetitor(repo: string): Promise<string | null> {
  for (const configFile of COMPETITOR_CONFIG_FILES) {
    try {
      const response = await fetch(
        `https://raw.githubusercontent.com/${repo}/main/${configFile}`,
        { method: 'HEAD', signal: AbortSignal.timeout(10000) }
      );
      if (response.ok) {
        const comp = COMPETITOR_KEYWORDS.find(k => configFile.includes(k));
        return comp || 'unknown';
      }
    } catch {
      continue;
    }
  }
  return null;
}

function calculateScore(features: Record<string, boolean>): number {
  let score = 0;
  if (features.hasCompetitor) score += LEAD_SCORE_WEIGHTS.hasCompetitor;
  if (features.isActive) score += LEAD_SCORE_WEIGHTS.isActive;
  if (features.hasRecentPRs) score += LEAD_SCORE_WEIGHTS.hasRecentPRs;
  if (features.isOpenSource) score += LEAD_SCORE_WEIGHTS.isOpenSource;
  if (features.hasManyContributors) score += LEAD_SCORE_WEIGHTS.hasManyContributors;
  if (features.hasCodeReviewEnabled) score += LEAD_SCORE_WEIGHTS.hasCodeReviewEnabled;
  return score;
}

function getLeadTier(score: number): LeadTier {
  if (score >= 40) return 'hot';
  if (score >= 20) return 'warm';
  return 'cold';
}

function loadExistingLeads(): Lead[] {
  const dir = getPipelineDir();
  const path = join(dir, 'leads.json');
  try {
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, 'utf-8'));
    }
  } catch {}
  return [];
}

function saveLeads(leads: Lead[]): void {
  const dir = getPipelineDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'leads.json'), JSON.stringify(leads, null, 2), 'utf-8');
}

function isDuplicate(leads: Lead[], repo: string): boolean {
  return leads.some(l => l.repo === repo);
}

function repoToId(repo: string): string {
  return repo.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export async function searchCompetitorUsers(): Promise<Lead[]> {
  const existing = loadExistingLeads();
  const newLeads: Lead[] = [];

  for (const keyword of COMPETITOR_KEYWORDS) {
    const repos = await searchRepos(`${keyword}+in:readme,+in:description`);
    for (const r of repos) {
      if (isDuplicate(existing, r.full_name)) continue;
      if (isDuplicate(newLeads, r.full_name)) continue;

      const competitor = await checkRepoForCompetitor(r.full_name);
      const activity = await getRepoActivity(r.full_name);

      const features = {
        hasCompetitor: competitor !== null,
        isActive: activity.lastPush > new Date(Date.now() - 90 * 86400000).toISOString(),
        hasRecentPRs: false,
        isOpenSource: true,
        hasManyContributors: activity.stars > 50,
        hasCodeReviewEnabled: competitor !== null,
      };

      await new Promise(r => setTimeout(r, 200));

      const score = calculateScore(features);
      newLeads.push({
        id: repoToId(r.full_name),
        name: r.full_name,
        repo: r.full_name,
        url: r.html_url,
        source: 'github-search',
        status: 'new',
        tier: getLeadTier(score),
        notes: competitor
          ? `Uses ${competitor}. Description: ${r.description}`
          : `Active repo. Description: ${r.description}`,
        competitor: competitor || undefined,
        score,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  const all = [...existing, ...newLeads];
  saveLeads(all);
  return newLeads;
}

export async function searchActiveRepos(query?: string): Promise<Lead[]> {
  const existing = loadExistingLeads();
  const searchQuery = query || 'pushed:>2026-03-01 stars:>10 language:typescript language:rust language:go';
  const repos = await searchRepos(searchQuery);
  const newLeads: Lead[] = [];

  for (const r of repos) {
    if (isDuplicate(existing, r.full_name)) continue;
    if (isDuplicate(newLeads, r.full_name)) continue;

    const competitor = await checkRepoForCompetitor(r.full_name);
    const activity = await getRepoActivity(r.full_name);

    const features = {
      hasCompetitor: competitor !== null,
      isActive: true,
      hasRecentPRs: activity.openIssues > 5,
      isOpenSource: true,
      hasManyContributors: activity.stars > 50,
      hasCodeReviewEnabled: competitor !== null,
    };

    const score = calculateScore(features);
    newLeads.push({
      id: repoToId(r.full_name),
      name: r.full_name,
      repo: r.full_name,
      url: r.html_url,
      source: 'github-search',
      status: 'new',
      tier: getLeadTier(score),
      notes: competitor
        ? `Uses ${competitor}. Stars: ${activity.stars}, Issues: ${activity.openIssues}`
        : `Active repo. Stars: ${activity.stars}, Issues: ${activity.openIssues}`,
      competitor: competitor || undefined,
      score,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await new Promise(r => setTimeout(r, 200));
  }

  const all = [...existing, ...newLeads];
  saveLeads(all);
  return newLeads;
}

export function getLeads(): Lead[] {
  return loadExistingLeads();
}

export function addManualLead(lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Lead {
  const existing = loadExistingLeads();
  const newLead: Lead = {
    ...lead,
    id: repoToId(lead.repo || lead.url),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  existing.push(newLead);
  saveLeads(existing);
  return newLead;
}

export function updateLeadStatus(leadId: string, status: LeadStatus): Lead | null {
  const leads = loadExistingLeads();
  const idx = leads.findIndex(l => l.id === leadId);
  if (idx === -1) return null;
  leads[idx].status = status;
  leads[idx].updatedAt = new Date().toISOString();
  if (status === 'contacted' && !leads[idx].contactedAt) {
    leads[idx].contactedAt = new Date().toISOString();
  }
  saveLeads(leads);
  return leads[idx];
}
