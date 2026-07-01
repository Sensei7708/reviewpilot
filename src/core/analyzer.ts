import { ParsedDiff, DiffHunk, getHunkSummary, filterIgnoredFiles } from './diff-parser.js';
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
  errors: string[];
}

export interface AnalyzeOptions {
  model?: string;
  rules?: string[];
  context?: string;
  ignorePatterns?: string[];
  concurrency?: number;
}

interface HunkResult {
  hunk: DiffHunk;
  response: string;
  findings: ReviewFinding[];
  error?: string;
}

async function processHunk(
  hunk: DiffHunk,
  llm: LLMClient,
  options: AnalyzeOptions
): Promise<HunkResult> {
  try {
    const response = await llm.review({
      diff: hunk.content,
      file: hunk.file,
      context: options.context,
      rules: options.rules,
    });
    const parsedFindings = parseFindings(response, hunk);
    return { hunk, response, findings: parsedFindings };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      hunk,
      response: '',
      findings: [],
      error: `Failed to review ${hunk.file}:${hunk.newStart}: ${message}`,
    };
  }
}

async function processWithConcurrency(
  items: DiffHunk[],
  concurrency: number,
  fn: (item: DiffHunk, index: number) => Promise<HunkResult>
): Promise<HunkResult[]> {
  const results: HunkResult[] = [];
  const queue = items.map((item, index) => ({ item, index }));
  let i = 0;

  async function worker(): Promise<void> {
    while (i < queue.length) {
      const { item, index } = queue[i++];
      results[index] = await fn(item, index);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function analyzeDiff(
  diff: ParsedDiff,
  llm: LLMClient,
  options: AnalyzeOptions = {}
): Promise<ReviewResult> {
  const filtered = options.ignorePatterns
    ? filterIgnoredFiles(diff, options.ignorePatterns)
    : diff;
  const concurrency = options.concurrency ?? 3;

  if (filtered.hunks.length === 0) {
    return {
      summary: `All hunks filtered by ignore patterns (${diff.filteredCount} filtered). Nothing to review.`,
      findings: [],
      filesReviewed: [],
      totalHunks: 0,
      totalFindings: 0,
      raw: '',
      errors: [],
    };
  }

  const filesReviewed = new Set<string>();
  const errors: string[] = [];
  const processed = await processWithConcurrency(
    filtered.hunks,
    concurrency,
    (hunk) => {
      filesReviewed.add(hunk.file);
      return processHunk(hunk, llm, options);
    }
  );

  const allFindings: ReviewFinding[] = [];
  const findings: string[] = [];

  for (const p of processed) {
    if (p.error) {
      errors.push(p.error);
      continue;
    }
    const summary = getHunkSummary(p.hunk);
    findings.push(`\n## ${summary}`);
    findings.push(p.response);
    allFindings.push(...p.findings);
  }

  return {
    summary: generateSummary(allFindings, filtered, errors),
    findings: allFindings,
    filesReviewed: [...filesReviewed],
    totalHunks: filtered.hunks.length,
    totalFindings: allFindings.length,
    raw: findings.join('\n'),
    errors,
  };
}

export function parseFindings(response: string, hunk: DiffHunk): ReviewFinding[] {
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

function generateSummary(findings: ReviewFinding[], diff: ParsedDiff, errors?: string[]): string {
  const critical = findings.filter(f => f.severity === 'critical').length;
  const high = findings.filter(f => f.severity === 'high').length;
  const medium = findings.filter(f => f.severity === 'medium').length;
  const low = findings.filter(f => f.severity === 'low').length;

  const total = findings.length;
  const files = [...new Set(findings.map(f => f.file))].length;

  const errorCount = errors?.length ?? 0;

  if (total === 0 && errorCount === 0) {
    return `✅ Review complete — no issues found across ${diff.hunks.length} hunk(s) in ${[...new Set(diff.hunks.map(h => h.file))].length} file(s).`;
  }

  const errorLine = errorCount > 0 ? `\n- ⚠️ Errors: ${errorCount} hunk(s) failed` : '';

  if (total === 0) {
    return `Review complete — no issues found.${errorLine}`;
  }

  return [
    `## Review Summary`,
    ``,
    `**${total}** issue(s) found across **${files}** file(s):`,
    `- 🔴 Critical: ${critical}`,
    `- 🟠 High: ${high}`,
    `- 🟡 Medium: ${medium}`,
    `- 🔵 Low: ${low}`,
    errorLine,
  ].filter(Boolean).join('\n');
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
