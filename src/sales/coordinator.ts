import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { Lead, LeadStatus, LeadTier, LeadSource, PipelineMetrics, SalesReport, OutreachMessage } from './types.js';

export function getPipelineDir(): string {
  return process.env.REVIEWPILOT_SALES_DIR || join(homedir(), '.reviewpilot', 'sales');
}

function loadLeads(): Lead[] {
  const path = join(getPipelineDir(), 'leads.json');
  try {
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, 'utf-8'));
    }
  } catch {}
  return [];
}

function loadMessages(): OutreachMessage[] {
  const path = join(getPipelineDir(), 'outreach.json');
  try {
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, 'utf-8'));
    }
  } catch {}
  return [];
}

function getPipelineMetrics(leads: Lead[]): PipelineMetrics {
  const byStatus: Record<string, number> = {};
  const byTier: Record<string, number> = {};
  const bySource: Record<string, number> = {};

  for (const s of ['new', 'contacted', 'interested', 'trial', 'converted', 'closed'] as LeadStatus[]) {
    byStatus[s] = 0;
  }
  for (const t of ['hot', 'warm', 'cold'] as LeadTier[]) {
    byTier[t] = 0;
  }
  for (const s of ['github-search', 'manual', 'referral', 'website', 'competitor'] as LeadSource[]) {
    bySource[s] = 0;
  }

  for (const lead of leads) {
    byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;
    byTier[lead.tier] = (byTier[lead.tier] || 0) + 1;
    bySource[lead.source] = (bySource[lead.source] || 0) + 1;
  }

  const total = leads.length;
  const converted = byStatus.converted || 0;
  const contacted = total - (byStatus.new || 0) - (byStatus.closed || 0);
  const totalScore = leads.reduce((sum, l) => sum + l.score, 0);

  return {
    totalLeads: total,
    byStatus: byStatus as Record<LeadStatus, number>,
    byTier: byTier as Record<LeadTier, number>,
    bySource: bySource as Record<LeadSource, number>,
    conversionRate: total > 0 ? converted / total : 0,
    contactedRate: total > 0 ? contacted / total : 0,
    averageScore: total > 0 ? Math.round(totalScore / total) : 0,
  };
}

function getDailyNewLeads(leads: Lead[]): number {
  const today = new Date().toISOString().split('T')[0];
  return leads.filter(l => l.createdAt.startsWith(today)).length;
}

function getWeeklyNewLeads(leads: Lead[]): number {
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  return leads.filter(l => l.createdAt >= weekAgo).length;
}

export function generateReport(): SalesReport {
  const leads = loadLeads();
  const messages = loadMessages();

  const sorted = [...leads].sort((a, b) => b.score - a.score);
  const topLeads = sorted.slice(0, 10);
  const pending = messages.filter(m => !m.sent);

  return {
    generatedAt: new Date().toISOString(),
    pipeline: getPipelineMetrics(leads),
    topLeads,
    pendingFollowUps: pending,
    dailyNewLeads: getDailyNewLeads(leads),
    weeklyNewLeads: getWeeklyNewLeads(leads),
  };
}

export function exportPipeline(format: 'json' | 'csv' | 'table'): string {
  const leads = loadLeads();

  if (format === 'json') {
    return JSON.stringify(leads, null, 2);
  }

  if (format === 'csv') {
    const headers = ['id', 'name', 'repo', 'source', 'status', 'tier', 'score', 'competitor', 'email', 'notes', 'createdAt'];
    const rows = leads.map(l => [
      l.id, l.name, l.repo || '', l.source, l.status, l.tier, l.score,
      l.competitor || '', l.email || '', l.notes, l.createdAt,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    return [headers.join(','), ...rows].join('\n');
  }

  const header = '│ Lead                    │ Score │ Tier  │ Status      │ Source        │';
  const sep = '├─────────────────────────┼───────┼───────┼─────────────┼───────────────┤';
  const top = '┌─────────────────────────┬───────┬───────┬─────────────┬───────────────┐';
  const bottom = '└─────────────────────────┴───────┴───────┴─────────────┴───────────────┘';
  const rows = leads.slice(0, 20).map(l => {
    const name = l.name.padEnd(23).slice(0, 23);
    const score = String(l.score).padStart(5);
    const tier = l.tier.padEnd(5);
    const status = l.status.padEnd(11);
    const source = l.source.padEnd(13);
    return `│ ${name} │ ${score} │ ${tier} │ ${status} │ ${source} │`;
  });
  return [top, header, sep, ...rows, bottom].join('\n');
}
