import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { Lead, OutreachMessage } from './types.js';
import { getPipelineDir } from './coordinator.js';

const OUTREACH_TEMPLATES = {
  competitor_switch: (lead: Lead) => ({
    subject: `Ditch ${lead.competitor || 'paid tools'} — ReviewPilot runs 100% locally for free`,
    body: [
      `Hi ${lead.name} team,`,
      '',
      `I noticed ${lead.name} uses ${lead.competitor || 'a code review tool'} for PR reviews.`,
      'Have you checked out ReviewPilot?',
      '',
      '**Why switch?**',
      '- 100% local & private — code never leaves your machine',
      '- Zero API costs — works with Ollama models',
      '- Free tier: 5 reviews/day per repo, no limits on repos',
      '- Pro: $199 one-time (no monthly subscription)',
      '',
      `Try it on your next PR:`,
      '```',
      'npx @sensei7708/reviewpilot pr https://github.com/your/repo/pull/123',
      '```',
      '',
      'Docs: https://reviewpilot.dev',
      '',
      'Cheers,',
      'ReviewPilot Team',
    ].join('\n'),
  }),
  active_repo: (lead: Lead) => ({
    subject: `Free AI code review for ${lead.name}`,
    body: [
      `Hi ${lead.name} team,`,
      '',
      `I came across ${lead.name} — looks like an active project!`,
      'We built ReviewPilot, an AI code review tool that runs entirely on your machine.',
      '',
      '**Key benefits:**',
      '- Privacy-first: your code never leaves your computer',
      '- No API costs: uses local Ollama models',
      '- Free to start: 5 reviews/day per repo',
      '- One-time Pro: $199 (no monthly fees)',
      '',
      `Try it in one command:`,
      '```',
      'npx @sensei7708/reviewpilot pr https://github.com/your/repo/pull/123',
      '```',
      '',
      'Would love your feedback!',
      '',
      'Cheers,',
      'ReviewPilot Team',
    ].join('\n'),
  }),
  generic: (lead: Lead) => ({
    subject: `AI code review for ${lead.name} — 100% local, free to start`,
    body: [
      `Hi ${lead.name} team,`,
      '',
      'We built ReviewPilot — AI-powered code review that runs locally on your machine.',
      'No data leaks, no API costs, no monthly subscriptions.',
      '',
      '**Quick start:**',
      '```',
      'npx @sensei7708/reviewpilot pr https://github.com/your/repo/pull/123',
      '```',
      '',
      '**Pricing:**',
      '- Free: 5 reviews/day per repo',
      '- Pro: $199 one-time',
      '- Team: $499/year',
      '',
      'Learn more: https://reviewpilot.dev',
      '',
      'Cheers,',
      'ReviewPilot Team',
    ].join('\n'),
  }),
};

function getTemplateForLead(lead: Lead): (lead: Lead) => { subject: string; body: string } {
  if (lead.competitor) return OUTREACH_TEMPLATES.competitor_switch;
  if (lead.score >= 20) return OUTREACH_TEMPLATES.active_repo;
  return OUTREACH_TEMPLATES.generic;
}

export function getLeadById(leadId: string): Lead | null {
  const path = join(getPipelineDir(), 'leads.json');
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    return data.find((l: Lead) => l.id === leadId) || null;
  } catch {
    return null;
  }
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

function saveMessages(messages: OutreachMessage[]): void {
  const dir = getPipelineDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'outreach.json'), JSON.stringify(messages, null, 2), 'utf-8');
}

export function generateOutreach(leadId: string): OutreachMessage | null {
  const lead = getLeadById(leadId);
  if (!lead) return null;

  const template = getTemplateForLead(lead);
  const { subject, body } = template(lead);

  const messages = loadMessages();
  const existingCount = messages.filter(m => m.leadId === leadId).length;

  const msg: OutreachMessage = {
    id: `${leadId}_outreach_${existingCount}`,
    leadId,
    subject,
    body,
    type: existingCount === 0 ? 'initial' : 'follow-up-1',
    createdAt: new Date().toISOString(),
    sent: false,
  };

  messages.push(msg);
  saveMessages(messages);
  return msg;
}

export function generateAllOutreach(): OutreachMessage[] {
  const dir = getPipelineDir();
  const leadsPath = join(dir, 'leads.json');
  let leads: Lead[] = [];
  try {
    leads = JSON.parse(readFileSync(leadsPath, 'utf-8'));
  } catch {
    return [];
  }

  const generated: OutreachMessage[] = [];
  const existing = loadMessages();
  const existingLeadIds = new Set(existing.map(m => m.leadId));

  for (const lead of leads) {
    if (existingLeadIds.has(lead.id)) continue;
    if (lead.status === 'closed') continue;

    const msg = generateOutreach(lead.id);
    if (msg) generated.push(msg);
  }

  return generated;
}

export function markSent(messageId: string): OutreachMessage | null {
  const messages = loadMessages();
  const idx = messages.findIndex(m => m.id === messageId);
  if (idx === -1) return null;
  messages[idx].sent = true;
  messages[idx].sentAt = new Date().toISOString();
  saveMessages(messages);
  return messages[idx];
}

export function getPendingOutreach(): OutreachMessage[] {
  return loadMessages().filter(m => !m.sent);
}

export function getSentOutreach(): OutreachMessage[] {
  return loadMessages().filter(m => m.sent);
}

export function generateOutreachToFile(leadId: string, outputDir: string): string | null {
  const msg = generateOutreach(leadId);
  if (!msg) return null;

  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const lead = getLeadById(leadId);
  const filename = `outreach_${lead?.name?.replace(/[^a-zA-Z0-9_-]/g, '_') || leadId}.md`;
  const filePath = join(outputDir, filename);

  const content = [
    `# Outreach: ${msg.subject}`,
    '',
    `**Lead:** ${lead?.name || leadId}`,
    `**Type:** ${msg.type}`,
    `**Created:** ${msg.createdAt}`,
    `**Sent:** ${msg.sent ? 'Yes' : 'No'}`,
    '',
    '---',
    '',
    msg.body,
    '',
    '---',
    '',
    `_Generated by ReviewPilot Sales Agent_`,
  ].join('\n');

  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}
