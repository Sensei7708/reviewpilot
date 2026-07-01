import { Command } from 'commander';
import chalk from 'chalk';
import {
  searchCompetitorUsers, searchActiveRepos,
  getLeads, addManualLead, updateLeadStatus,
  generateOutreach, generateAllOutreach, getPendingOutreach, getSentOutreach,
  markSent, generateOutreachToFile,
  getPendingFollowUps, getNurtureReport,
  generateReport, exportPipeline,
} from '../../sales/index.js';

export const salesCommand = new Command('sales')
  .description('AI sales agent swarm — lead generation, outreach & pipeline management')
  .hook('preAction', () => {
    console.log(chalk.cyan('\n  ReviewPilot Sales Agent Swarm'));
    console.log(chalk.dim('  Manage leads, generate outreach, track pipeline\n'));
  });

salesCommand
  .command('research')
  .description('Search GitHub for potential leads')
  .option('-c, --competitors', 'Find repos using competitor tools', false)
  .option('-a, --active', 'Find active repos that need code review', false)
  .option('-q, --query <query>', 'Custom GitHub search query')
  .action(async (options: { competitors?: boolean; active?: boolean; query?: string }) => {
    try {
      if (options.competitors) {
        console.log(chalk.blue(' Searching for repos using competitor tools...'));
        const leads = await searchCompetitorUsers();
        console.log(chalk.green(` Found ${leads.length} new leads from competitor search.`));
      }

      if (options.active || options.query) {
        console.log(chalk.blue(' Searching for active repos...'));
        const leads = await searchActiveRepos(options.query);
        console.log(chalk.green(` Found ${leads.length} new active repo leads.`));
      }

      if (!options.competitors && !options.active && !options.query) {
        const total = getLeads().length;
        console.log(chalk.dim(` Total leads in pipeline: ${total}`));
      }

      const report = generateReport();
      printMetricsSummary(report);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(` Research error: ${msg}`));
    }
  });

salesCommand
  .command('leads')
  .description('List and manage leads')
  .option('-f, --format <format>', 'Output format: table|json|csv', 'table')
  .option('-s, --status <status>', 'Filter by status (new|contacted|interested|trial|converted|closed)')
  .option('-t, --tier <tier>', 'Filter by tier (hot|warm|cold)')
  .action((options: { format?: string; status?: string; tier?: string }) => {
    const leads = getLeads();
    let filtered = leads;

    if (options.status) {
      filtered = filtered.filter(l => l.status === options.status);
    }
    if (options.tier) {
      filtered = filtered.filter(l => l.tier === options.tier);
    }

    if (options.format === 'json') {
      console.log(JSON.stringify(filtered, null, 2));
      return;
    }

    if (filtered.length === 0) {
      console.log(chalk.yellow('  No leads found. Run `reviewpilot sales research` to find leads.'));
      return;
    }

    console.log(chalk.dim(`  Showing ${filtered.length} of ${leads.length} total leads\n`));

    const header = `│ ${'Lead'.padEnd(28)} │ ${'Score'.padEnd(5)} │ ${'Tier'.padEnd(5)} │ ${'Status'.padEnd(11)} │ ${'Source'.padEnd(14)} │`;
    const sep = `├${'─'.repeat(30)}┼${'─'.repeat(7)}┼${'─'.repeat(7)}┼${'─'.repeat(13)}┼${'─'.repeat(16)}┤`;
    const top = `┌${'─'.repeat(30)}┬${'─'.repeat(7)}┬${'─'.repeat(7)}┬${'─'.repeat(13)}┬${'─'.repeat(16)}┐`;
    const bottom = `└${'─'.repeat(30)}┴${'─'.repeat(7)}┴${'─'.repeat(7)}┴${'─'.repeat(13)}┴${'─'.repeat(16)}┘`;

    console.log(top);
    console.log(header);
    console.log(sep);

    for (const l of filtered.slice(0, 25)) {
      const name = l.name.length > 28 ? l.name.slice(0, 25) + '...' : l.name.padEnd(28);
      const score = String(l.score).padStart(5);
      const tierColor = l.tier === 'hot' ? chalk.red : l.tier === 'warm' ? chalk.yellow : chalk.dim;
      const statusColor = l.status === 'converted' ? chalk.green : l.status === 'closed' ? chalk.dim : chalk.white;
      console.log(`│ ${name} │ ${score} │ ${tierColor(l.tier.padEnd(5))} │ ${statusColor(l.status.padEnd(11))} │ ${l.source.padEnd(14)} │`);
    }

    console.log(bottom);
  });

salesCommand
  .command('add')
  .description('Add a manual lead')
  .requiredOption('-n, --name <name>', 'Lead name (org/repo or company name)')
  .option('-r, --repo <repo>', 'Repository URL')
  .option('-u, --url <url>', 'Website URL')
  .option('-e, --email <email>', 'Contact email')
  .option('-s, --source <source>', 'Lead source', 'manual')
  .option('--notes <notes>', 'Additional notes', '')
  .action((options: { name: string; repo?: string; url?: string; email?: string; source?: string; notes?: string }) => {
    const lead = addManualLead({
      name: options.name,
      repo: options.repo,
      url: options.url || options.repo || '',
      source: (options.source || 'manual') as any,
      status: 'new',
      tier: 'warm',
      score: 10,
      notes: options.notes || '',
    });
    console.log(chalk.green(` Added lead: ${lead.name} (${lead.id})`));
  });

salesCommand
  .command('outreach')
  .description('Generate outreach messages for leads')
  .option('-a, --all', 'Generate for all unc contacted leads', false)
  .option('-l, --lead <id>', 'Generate for specific lead ID')
  .option('-f, --file <path>', 'Save outreach to files in directory')
  .option('--mark-sent <id>', 'Mark outreach message as sent')
  .option('--pending', 'Show pending (unsent) outreach', false)
  .option('--sent', 'Show sent outreach', false)
  .action((options: { all?: boolean; lead?: string; file?: string; markSent?: string; pending?: boolean; sent?: boolean }) => {
    if (options.markSent) {
      const msg = markSent(options.markSent);
      if (msg) {
        console.log(chalk.green(` Marked message ${options.markSent} as sent.`));
      } else {
        console.log(chalk.red(` Message ${options.markSent} not found.`));
      }
      return;
    }

    if (options.pending) {
      const pending = getPendingOutreach();
      if (pending.length === 0) {
        console.log(chalk.yellow('  No pending outreach.'));
        return;
      }
      console.log(chalk.dim(`  ${pending.length} pending outreach messages:\n`));
      for (const m of pending) {
        console.log(`  [${m.id}] ${m.subject}`);
        console.log(`  ${chalk.dim(m.body.slice(0, 120))}...\n`);
      }
      return;
    }

    if (options.sent) {
      const sent = getSentOutreach();
      console.log(chalk.dim(`  ${sent.length} sent messages.`));
      for (const m of sent) {
        console.log(`  [${m.id}] ${m.subject} — ${chalk.dim(m.sentAt || '')}`);
      }
      return;
    }

    if (options.all) {
      const generated = generateAllOutreach();
      console.log(chalk.green(` Generated ${generated.length} outreach messages.`));

      if (options.file) {
        for (const m of generated) {
          const path = generateOutreachToFile(m.leadId, options.file);
          if (path) console.log(chalk.dim(`  Saved: ${path}`));
        }
      }
      return;
    }

    if (options.lead) {
      const path = options.file
        ? generateOutreachToFile(options.lead, options.file)
        : null;
      const msg = generateOutreach(options.lead);
      if (msg) {
        console.log(chalk.green(` Generated outreach for lead ${options.lead}:`));
        console.log(`  Subject: ${msg.subject}`);
        console.log(`  Body:\n${msg.body}`);
        if (path) console.log(chalk.dim(`  Saved to: ${path}`));
      } else {
        console.log(chalk.red(` Lead ${options.lead} not found.`));
      }
      return;
    }

    console.log(chalk.yellow('  Use --all, --lead <id>, --pending, or --sent'));
  });

salesCommand
  .command('nurture')
  .description('Check follow-up status and generate nurture sequences')
  .option('--follow-ups', 'Generate pending follow-ups', false)
  .option('--report', 'Show nurture report', false)
  .action((options: { followUps?: boolean; report?: boolean }) => {
    if (options.report) {
      const r = getNurtureReport();
      console.log(chalk.dim('\n  Nurture Report:\n'));
      console.log(`  Active leads:     ${chalk.cyan(String(r.active))}`);
      console.log(`  Pending followups: ${chalk.yellow(String(r.pendingFollowUps))}`);
      console.log(`  Converted:        ${chalk.green(String(r.converted))}`);
      console.log(`  Stalled (>30d):   ${chalk.red(String(r.stalled))}`);
      return;
    }

    if (options.followUps) {
      const pending = getPendingFollowUps();
      if (pending.length === 0) {
        console.log(chalk.green('  No follow-ups due yet.'));
        return;
      }
      console.log(chalk.cyan(`  ${pending.length} follow-up(s) due:\n`));
      for (const m of pending) {
        console.log(`  [${m.id}] ${m.subject}`);
        console.log(`  ${chalk.dim(m.body.slice(0, 100))}...\n`);
      }
      return;
    }

    const r = getNurtureReport();
    console.log(chalk.dim(`\n  Active: ${r.active} | Pending: ${r.pendingFollowUps} | Converted: ${r.converted} | Stalled: ${r.stalled}`));
    console.log(chalk.dim('  Use --follow-ups or --report for details.'));
  });

salesCommand
  .command('report')
  .description('Generate sales pipeline report')
  .option('-f, --format <format>', 'Output format: summary|json|csv|table', 'summary')
  .action((options: { format?: string }) => {
    const fmt = options.format || 'summary';

    if (fmt === 'json') {
      console.log(JSON.stringify(generateReport(), null, 2));
      return;
    }

    if (fmt === 'csv' || fmt === 'table') {
      console.log(exportPipeline(fmt as any));
      return;
    }

    const report = generateReport();
    const p = report.pipeline;

    console.log(chalk.cyan('\n  Sales Pipeline Report'));
    console.log(chalk.cyan(`  Generated: ${new Date(report.generatedAt).toLocaleString()}`));
    console.log('');

    console.log(chalk.bold('  Pipeline Overview'));
    console.log(`  Total leads:     ${chalk.cyan(String(p.totalLeads))}`);
    console.log(`  Conversion rate: ${chalk.green((p.conversionRate * 100).toFixed(1) + '%')}`);
    console.log(`  Contacted rate:  ${chalk.yellow((p.contactedRate * 100).toFixed(1) + '%')}`);
    console.log(`  Avg lead score:  ${chalk.cyan(String(p.averageScore))}`);
    console.log('');

    console.log(chalk.bold('  By Status'));
    for (const [status, count] of Object.entries(p.byStatus)) {
      const color = status === 'converted' ? chalk.green : status === 'closed' ? chalk.dim : chalk.white;
      console.log(`  ${color(`${status.padEnd(12)}: ${count}`)}`);
    }
    console.log('');

    console.log(chalk.bold('  By Tier'));
    for (const [tier, count] of Object.entries(p.byTier)) {
      const color = tier === 'hot' ? chalk.red : tier === 'warm' ? chalk.yellow : chalk.dim;
      console.log(`  ${color(`${tier.padEnd(6)}: ${count}`)}`);
    }
    console.log('');

    console.log(chalk.bold('  By Source'));
    for (const [source, count] of Object.entries(p.bySource)) {
      console.log(`  ${`${source.padEnd(14)}: ${count}`}`);
    }
    console.log('');

    console.log(chalk.bold('  Recent Activity'));
    console.log(`  New today:  ${chalk.cyan(String(report.dailyNewLeads))}`);
    console.log(`  This week:  ${chalk.cyan(String(report.weeklyNewLeads))}`);
    console.log(`  Pending outreach: ${chalk.yellow(String(report.pendingFollowUps.length))}`);
    console.log('');

    if (report.topLeads.length > 0) {
      console.log(chalk.bold('  Top Leads (by score)'));
      for (const l of report.topLeads.slice(0, 5)) {
        const tierIcon = l.tier === 'hot' ? '🔥' : l.tier === 'warm' ? '⭐' : '·';
        console.log(`  ${tierIcon} ${chalk.bold(l.name)} (${l.score}) — ${l.status}`);
      }
    }
  });

function printMetricsSummary(report: ReturnType<typeof generateReport>): void {
  const p = report.pipeline;
  console.log('');
  console.log(chalk.dim('─'.repeat(40)));
  console.log(`  Total: ${p.totalLeads} | Hot: ${p.byTier.hot} | Warm: ${p.byTier.warm} | Cold: ${p.byTier.cold}`);
  console.log(`  Converted: ${p.byStatus.converted} | Rate: ${(p.conversionRate * 100).toFixed(1)}%`);
  console.log(`  New this week: ${report.weeklyNewLeads}`);
  console.log(chalk.dim('─'.repeat(40)));
}
