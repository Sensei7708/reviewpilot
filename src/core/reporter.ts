import chalk from 'chalk';
import Table from 'cli-table3';
import { ReviewResult, ReviewFinding } from './analyzer.js';

export type OutputFormat = 'table' | 'json' | 'markdown' | 'summary' | 'text';

export function report(result: ReviewResult, format: OutputFormat = 'table'): string {
  let output = '';
  switch (format) {
    case 'json':
      output = reportJson(result);
      break;
    case 'markdown':
      output = reportMarkdown(result);
      break;
    case 'summary':
      output = result.summary;
      break;
    case 'text':
      output = reportText(result);
      break;
    case 'table':
    default:
      output = reportTable(result);
      break;
  }
  if (result.errors && result.errors.length > 0) {
    const header = format === 'json' ? '' : chalk.yellow('\n ⚠️ Review Errors:\n');
    const errorLines = result.errors.map(e => format === 'json' ? e : `   ${chalk.dim(e)}`).join('\n');
    output += `\n${header}${errorLines}\n`;
  }
  return output;
}

function reportTable(result: ReviewResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(chalk.bold(' ReviewPilot Results'));
  lines.push(chalk.dim('─'.repeat(60)));
  lines.push('');

  if (result.totalFindings === 0) {
    lines.push(chalk.green(' ✅ No issues found!'));
    lines.push('');
    return lines.join('\n');
  }

  const table = new Table({
    head: [
      chalk.bold('Severity'),
      chalk.bold('File'),
      chalk.bold('Line'),
      chalk.bold('Issue'),
    ],
    colWidths: [12, 20, 6, 40],
    wordWrap: true,
  });

  for (const f of result.findings) {
    const color = severityColor(f.severity);
    table.push([
      color(f.severity.toUpperCase()),
      f.file,
      String(f.line),
      f.issue,
    ]);
  }

  lines.push(table.toString());
  lines.push('');

  const counts = severityCounts(result.findings);
  lines.push(chalk.bold(`Summary: ${result.totalFindings} issue(s)`));
  if (counts.critical) lines.push(chalk.red(`  🔴 Critical: ${counts.critical}`));
  if (counts.high) lines.push(chalk.red(`  🟠 High: ${counts.high}`));
  if (counts.medium) lines.push(chalk.yellow(`  🟡 Medium: ${counts.medium}`));
  if (counts.low) lines.push(chalk.blue(`  🔵 Low: ${counts.low}`));
  lines.push('');

  return lines.join('\n');
}

function reportJson(result: ReviewResult): string {
  return JSON.stringify(
    {
      summary: result.summary,
      totalFindings: result.totalFindings,
      filesReviewed: result.filesReviewed,
      totalHunks: result.totalHunks,
      findings: result.findings.map(f => ({
        severity: f.severity,
        file: f.file,
        line: f.line,
        issue: f.issue,
        suggestion: f.suggestion,
      })),
    },
    null,
    2
  );
}

function reportMarkdown(result: ReviewResult): string {
  const lines: string[] = [];

  lines.push(result.summary);
  lines.push('');

  if (result.findings.length === 0) {
    return lines.join('\n');
  }

  lines.push('| Severity | File | Line | Issue | Suggestion |');
  lines.push('|----------|------|------|-------|------------|');

  for (const f of result.findings) {
    lines.push(
      `| ${f.severity.toUpperCase()} | ${f.file} | ${f.line} | ${f.issue} | ${f.suggestion} |`
    );
  }

  lines.push('');
  return lines.join('\n');
}

function reportText(result: ReviewResult): string {
  const lines: string[] = [];

  lines.push(result.summary);
  lines.push('');

  if (result.findings.length === 0) return lines.join('\n');

  for (const f of result.findings) {
    const icon = severityIcon(f.severity);
    lines.push(`${icon} [${f.severity.toUpperCase()}] ${f.file}:${f.line}`);
    lines.push(`   ${f.issue}`);
    lines.push(`   \u2192 ${f.suggestion}`);
    lines.push('');
  }

  return lines.join('\n');
}

function severityIcon(severity: string): string {
  switch (severity) {
    case 'critical': return '\u{1F534}';
    case 'high': return '\u{1F7E0}';
    case 'medium': return '\u{1F7E1}';
    case 'low': return '\u{1F535}';
    default: return '\u{26AA}';
  }
}

function severityColor(
  severity: string
): (text: string) => string {
  switch (severity) {
    case 'critical':
      return chalk.bgRed.white.bold;
    case 'high':
      return chalk.red;
    case 'medium':
      return chalk.yellow;
    case 'low':
      return chalk.blue;
    default:
      return chalk.gray;
  }
}

function severityCounts(findings: ReviewFinding[]) {
  const counts: Record<string, number> = {};
  for (const f of findings) {
    counts[f.severity] = (counts[f.severity] || 0) + 1;
  }
  return counts;
}
