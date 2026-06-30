import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { LeadSource, LeadStatus, LeadTier } from '../src/sales/types.js';

const TEST_DIR = join(tmpdir(), `reviewpilot-sales-test-${Date.now()}`);

beforeEach(() => {
  process.env.REVIEWPILOT_SALES_DIR = TEST_DIR;
  if (!existsSync(TEST_DIR)) mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  delete process.env.REVIEWPILOT_SALES_DIR;
  try { rmSync(TEST_DIR, { recursive: true, force: true }); } catch {}
});

describe('addManualLead', () => {
  it('adds a lead with generated id and timestamps', async () => {
    const { addManualLead, getLeads } = await import('../src/sales/researcher.js');
    const lead = addManualLead({
      name: 'test-org/repo',
      url: 'https://github.com/test-org/repo',
      source: 'manual' as LeadSource,
      status: 'new' as LeadStatus,
      tier: 'warm' as LeadTier,
      score: 10,
      notes: 'test lead',
    });
    expect(lead.id).toBeDefined();
    expect(lead.createdAt).toBeDefined();
    expect(lead.updatedAt).toBeDefined();

    const all = getLeads();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(lead.id);
  });

  it('adds multiple leads', async () => {
    const { addManualLead, getLeads } = await import('../src/sales/researcher.js');
    addManualLead({ name: 'org/a', url: 'https://github.com/org/a', source: 'manual', status: 'new', tier: 'cold', score: 5, notes: '' });
    addManualLead({ name: 'org/b', url: 'https://github.com/org/b', source: 'manual', status: 'new', tier: 'hot', score: 50, notes: '' });
    expect(getLeads()).toHaveLength(2);
  });
});

describe('updateLeadStatus', () => {
  it('updates lead status and sets contactedAt', async () => {
    const { addManualLead, updateLeadStatus } = await import('../src/sales/researcher.js');
    const lead = addManualLead({ name: 'org/r', url: 'https://github.com/org/r', source: 'manual', status: 'new', tier: 'warm', score: 10, notes: '' });
    const updated = updateLeadStatus(lead.id, 'contacted');
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe('contacted');
    expect(updated!.contactedAt).toBeDefined();
  });

  it('returns null for non-existent lead', async () => {
    const { updateLeadStatus } = await import('../src/sales/researcher.js');
    const result = updateLeadStatus('nonexistent', 'converted');
    expect(result).toBeNull();
  });
});

describe('generateReport', () => {
  it('returns empty report when no leads exist', async () => {
    const { generateReport } = await import('../src/sales/coordinator.js');
    const report = generateReport();
    expect(report.pipeline.totalLeads).toBe(0);
    expect(report.topLeads).toHaveLength(0);
    expect(report.pendingFollowUps).toHaveLength(0);
  });

  it('computes correct pipeline metrics', async () => {
    const { addManualLead } = await import('../src/sales/researcher.js');
    const { generateReport } = await import('../src/sales/coordinator.js');

    addManualLead({ name: 'a', url: 'https://github.com/a', source: 'manual', status: 'new', tier: 'cold', score: 5, notes: '' });
    addManualLead({ name: 'b', url: 'https://github.com/b', source: 'github-search', status: 'converted', tier: 'hot', score: 45, notes: '' });
    addManualLead({ name: 'c', url: 'https://github.com/c', source: 'competitor', status: 'contacted', tier: 'warm', score: 25, notes: '' });

    const report = generateReport();
    expect(report.pipeline.totalLeads).toBe(3);
    expect(report.pipeline.byStatus.new).toBe(1);
    expect(report.pipeline.byStatus.converted).toBe(1);
    expect(report.pipeline.byStatus.contacted).toBe(1);
    expect(report.pipeline.byTier.hot).toBe(1);
    expect(report.pipeline.byTier.warm).toBe(1);
    expect(report.pipeline.byTier.cold).toBe(1);
    expect(report.pipeline.bySource.manual).toBe(1);
    expect(report.pipeline.bySource['github-search']).toBe(1);
    expect(report.pipeline.bySource.competitor).toBe(1);
  });

  it('ranks top leads by score descending', async () => {
    const { addManualLead } = await import('../src/sales/researcher.js');
    const { generateReport } = await import('../src/sales/coordinator.js');

    for (let i = 0; i < 15; i++) {
      addManualLead({ name: `org/repo-${i}`, url: `https://github.com/org/repo-${i}`, source: 'manual', status: 'new', tier: 'cold', score: i, notes: '' });
    }

    const report = generateReport();
    expect(report.topLeads).toHaveLength(10);
    expect(report.topLeads[0].score).toBe(14);
    expect(report.topLeads[9].score).toBe(5);
  });
});

describe('exportPipeline', () => {
  beforeEach(async () => {
    const { addManualLead } = await import('../src/sales/researcher.js');
    addManualLead({ name: 'org/r1', url: 'https://github.com/org/r1', source: 'manual', status: 'new', tier: 'cold', score: 5, notes: 'test note' });
    addManualLead({ name: 'org/r2', url: 'https://github.com/org/r2', source: 'competitor', status: 'contacted', tier: 'hot', score: 40, notes: '' });
  });

  it('exports to JSON', async () => {
    const { exportPipeline } = await import('../src/sales/coordinator.js');
    const json = exportPipeline('json');
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe('org/r1');
  });

  it('exports to CSV with headers', async () => {
    const { exportPipeline } = await import('../src/sales/coordinator.js');
    const csv = exportPipeline('csv');
    expect(csv).toContain('id,name');
    expect(csv).toContain('org/r1');
    expect(csv).toContain('org/r2');
  });

  it('exports to table format', async () => {
    const { exportPipeline } = await import('../src/sales/coordinator.js');
    const table = exportPipeline('table');
    expect(table).toContain('org/r1');
    expect(table).toContain('org/r2');
    expect(table).toContain('cold');
    expect(table).toContain('hot');
  });
});

describe('getLeads', () => {
  it('returns empty array when no leads file exists', async () => {
    const { getLeads } = await import('../src/sales/researcher.js');
    const leads = getLeads();
    expect(leads).toEqual([]);
  });
});

describe('getNurtureReport', () => {
  it('returns zero counts when no leads exist', async () => {
    const { getNurtureReport } = await import('../src/sales/nurture.js');
    const r = getNurtureReport();
    expect(r.active).toBe(0);
    expect(r.pendingFollowUps).toBe(0);
    expect(r.converted).toBe(0);
    expect(r.stalled).toBe(0);
  });
});

describe('getPipelineDir', () => {
  it('uses REVIEWPILOT_SALES_DIR env var when set', async () => {
    const { getPipelineDir } = await import('../src/sales/coordinator.js');
    expect(getPipelineDir()).toBe(TEST_DIR);
  });

  it('falls back to default dir when env var not set', async () => {
    delete process.env.REVIEWPILOT_SALES_DIR;
    const { getPipelineDir } = await import('../src/sales/coordinator.js');
    const dir = getPipelineDir();
    expect(dir).toContain('.reviewpilot');
    expect(dir).toContain('sales');
  });
});
