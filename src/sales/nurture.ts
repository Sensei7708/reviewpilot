import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { Lead, OutreachMessage } from './types.js';
import { getPipelineDir } from './coordinator.js';

const NURTURE_INTERVALS = {
  'follow-up-1': 3,
  'follow-up-2': 7,
  'follow-up-3': 14,
};

const FOLLOW_UP_TEMPLATES: Record<string, (lead: Lead) => { subject: string; body: string }> = {
  'follow-up-1': (lead) => ({
    subject: `Following up — ReviewPilot for ${lead.name}`,
    body: [
      `Hi ${lead.name} team,`,
      '',
      'Just checking in! Have you had a chance to try ReviewPilot?',
      '',
      'Quick reminder of what you get:',
      '- 100% local AI code review (no data leaves your machine)',
      '- Free tier: 5 reviews/day per repo',
      '- Pro: $199 one-time (no monthly fees)',
      '',
      'One command to get started:',
      '```',
      'npx @sensei7708/reviewpilot pr https://github.com/your/repo/pull/123',
      '```',
      '',
      'Happy to help with any questions.',
      '',
      'Cheers,',
      'ReviewPilot Team',
    ].join('\n'),
  }),
  'follow-up-2': (lead) => ({
    subject: `Still looking for a code review solution?`,
    body: [
      `Hi ${lead.name} team,`,
      '',
      `Since we last connected, ReviewPilot has helped teams save hours on PR reviews.`,
      'All running locally, privately, with zero API costs.',
      '',
      '**Recent updates:**',
      '- VS Code extension with inline annotations',
      '- GitHub Action for CI/CD',
      '- Custom review rules',
      '',
      'Try it free:',
      '```',
      'npx @sensei7708/reviewpilot pr https://github.com/your/repo/pull/123',
      '```',
      '',
      'Cheers,',
      'ReviewPilot Team',
    ].join('\n'),
  }),
  'follow-up-3': (lead) => ({
    subject: `Last chance — special offer on ReviewPilot Pro`,
    body: [
      `Hi ${lead.name} team,`,
      '',
      'I wanted to reach out one last time. ReviewPilot Pro is available for a one-time payment of $199 — no subscriptions, no hidden fees.',
      '',
      '**Pro features:**',
      '- Unlimited reviews',
      '- JSON/Markdown output formats',
      '- GitHub Action integration',
      '- VS Code annotations',
      '- Custom rules engine',
      '',
      'Get lifetime access: https://reviewpilot.dev',
      '',
      'Cheers,',
      'ReviewPilot Team',
    ].join('\n'),
  }),
};

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

function loadLeads(): Lead[] {
  const path = join(getPipelineDir(), 'leads.json');
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return [];
  }
}

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / 86400000);
}

export function getPendingFollowUps(): OutreachMessage[] {
  const messages = loadMessages();
  const leads = loadLeads();
  const pending: OutreachMessage[] = [];

  for (const msg of messages) {
    if (!msg.sent) continue;
    if (msg.type === 'follow-up-3') continue;

    const lead = leads.find(l => l.id === msg.leadId);
    if (!lead || lead.status === 'converted' || lead.status === 'closed') continue;

    const nextType = getNextFollowUpType(msg.type);
    if (!nextType) continue;
    const interval = NURTURE_INTERVALS[nextType as keyof typeof NURTURE_INTERVALS];
    if (!interval) continue;

    const lastSent = msg.sentAt || msg.createdAt;
    if (daysSince(lastSent) >= interval) {
      const nextMsg = generateFollowUp(lead, nextType);
      if (nextMsg) pending.push(nextMsg);
    }
  }

  return pending;
}

function getNextFollowUpType(currentType: string): string | null {
  const types = ['initial', 'follow-up-1', 'follow-up-2', 'follow-up-3'];
  const idx = types.indexOf(currentType);
  if (idx === -1 || idx >= types.length - 1) return null;
  return types[idx + 1];
}

export function generateFollowUp(lead: Lead, followUpType: string): OutreachMessage | null {
  const template = FOLLOW_UP_TEMPLATES[followUpType];
  if (!template) return null;

  const { subject, body } = template(lead);
  const messages = loadMessages();
  const existingCount = messages.filter(m => m.leadId === lead.id).length;

  const msg: OutreachMessage = {
    id: `${lead.id}_outreach_${existingCount}`,
    leadId: lead.id,
    subject,
    body,
    type: followUpType as OutreachMessage['type'],
    createdAt: new Date().toISOString(),
    sent: false,
  };

  messages.push(msg);
  saveMessages(messages);
  return msg;
}

export function getNurtureReport(): {
  active: number;
  pendingFollowUps: number;
  converted: number;
  stalled: number;
} {
  const leads = loadLeads();
  const messages = loadMessages();

  const active = leads.filter(l => l.status === 'contacted' || l.status === 'interested').length;
  const converted = leads.filter(l => l.status === 'converted').length;
  const stalled = leads.filter(l => {
    if (l.status === 'converted' || l.status === 'closed') return false;
    const lastContact = l.contactedAt || l.createdAt;
    return daysSince(lastContact) > 30;
  }).length;
  const pendingFollowUps = messages.filter(m => !m.sent).length;

  return { active, pendingFollowUps, converted, stalled };
}
