import { ParsedDiff, DiffHunk, getHunkSummary } from './diff-parser.js';
import { LLMClient } from './llm.js';

export interface ReviewFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  file: string;
  line: number;
  issue: string;
  suggestion: string;
}

export interface ReviewResult {
  summary: string;
  findings: ReviewFinding[];
  filesReviewed: string[];
  totalHunks: number;
  totalFindings: number;
  raw: string;
}

export interface AnalyzeOptions {
  model?: string;
  rules?: string[];
  context?: string;
}

export async function analyzeDiff(
  diff: ParsedDiff,
  llm: LLMClient,
  options: AnalyzeOptions = {}
): Promise<ReviewResult> {
  const allFindings: ReviewFinding[] = [];
  const filesReviewed = new Set<string>();
  const findings: string[] = [];

  for (const hunk of diff.hunks) {
    filesReviewed.add(hunk.file);
    const summary = getHunkSummary(hunk);
    findings.push(`\n## ${summary}`);

    const response = await llm.review({
      diff: hunk.content,
      file: hunk.file,
      context: options.context,
      rules: options.rules,
    });

    findings.push(response);
    const parsedFindings = parseFindings(response, hunk);
    allFindings.push(...parsedFindings);
  }

  return {
    summary: generateSummary(allFindings, diff),
    findings: allFindings,
    filesReviewed: [...filesReviewed],
    totalHunks: diff.hunks.length,
    totalFindings: allFindings.length,
    raw: findings.join('\n'),
  };
}

function parseFindings(response: string, hunk: DiffHunk): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  const lines = response.split('\n');
  let current: Partial<ReviewFinding> = {};

  for (const line of lines) {
    const severityMatch = line.match(/SEVERITY:\s*(critical|high|medium|low|info)/i);
    if (severityMatch) {
      current.severity = severityMatch[1].toLowerCase() as ReviewFinding['severity'];
    }

    const fileMatch = line.match(/FILE:\s*(.+)/i);
    if (fileMatch) {
      current.file = fileMatch[1].trim();
    }

    const lineMatch = line.match(/LINE:\s*(\d+)/i);
    if (lineMatch) {
      current.line = parseInt(lineMatch[1]);
    }

    const issueMatch = line.match(/ISSUE:\s*(.+)/i);
    if (issueMatch) {
      current.issue = issueMatch[1].trim();
    }

    const suggestionMatch = line.match(/SUGGESTION:\s*(.+)/i);
    if (suggestionMatch) {
      current.suggestion = suggestionMatch[1].trim();
    }

    if (current.severity && current.issue && current.suggestion) {
      findings.push({
        severity: current.severity,
        file: current.file || hunk.file,
        line: current.line || hunk.newStart,
        issue: current.issue,
        suggestion: current.suggestion,
      });
      current = {};
    }
  }

  return findings;
}

function generateSummary(findings: ReviewFinding[], diff: ParsedDiff): string {
  const critical = findings.filter(f => f.severity === 'critical').length;
  const high = findings.filter(f => f.severity === 'high').length;
  const medium = findings.filter(f => f.severity === 'medium').length;
  const low = findings.filter(f => f.severity === 'low').length;

  const total = findings.length;
  const files = [...new Set(findings.map(f => f.file))].length;

  if (total === 0) {
    return `✅ Review complete — no issues found across ${diff.hunks.length} hunk(s) in ${[...new Set(diff.hunks.map(h => h.file))].length} file(s).`;
  }

  return [
    `## Review Summary`,
    ``,
    `**${total}** issue(s) found across **${files}** file(s):`,
    `- 🔴 Critical: ${critical}`,
    `- 🟠 High: ${high}`,
    `- 🟡 Medium: ${medium}`,
    `- 🔵 Low: ${low}`,
  ].join('\n');
}

export function formatFindingsAsTable(findings: ReviewFinding[]): string {
  if (findings.length === 0) {
    return 'No issues found.';
  }

  const lines: string[] = [];
  const severityColors: Record<string, string> = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🔵',
    info: '⚪',
  };

  for (const f of findings) {
    const icon = severityColors[f.severity] || '⚪';
    lines.push(`${icon} [${f.severity.toUpperCase()}] ${f.file}:${f.line}`);
    lines.push(`   ${f.issue}`);
    lines.push(`   → ${f.suggestion}`);
    lines.push('');
  }

  return lines.join('\n');
}
