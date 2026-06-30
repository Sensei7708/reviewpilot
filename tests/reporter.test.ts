import { describe, it, expect } from '@jest/globals';
import { report } from '../src/core/reporter.js';
import type { ReviewResult } from '../src/core/analyzer.js';

const mockResult: ReviewResult = {
  summary: '## Review Summary\n\n**2** issue(s) found',
  findings: [
    { severity: 'high', file: 'src/app.ts', line: 10, issue: 'Bug', suggestion: 'Fix it' },
    { severity: 'low', file: 'src/utils.ts', line: 5, issue: 'Style', suggestion: 'Format' },
  ],
  filesReviewed: ['src/app.ts', 'src/utils.ts'],
  totalHunks: 2,
  totalFindings: 2,
  raw: '',
};

describe('reporter', () => {
  it('returns JSON output', () => {
    const output = report(mockResult, 'json');
    const parsed = JSON.parse(output);
    expect(parsed.totalFindings).toBe(2);
    expect(parsed.findings).toHaveLength(2);
  });

  it('returns markdown output', () => {
    const output = report(mockResult, 'markdown');
    expect(output).toContain('| Severity | File | Line | Issue | Suggestion |');
    expect(output).toContain('| HIGH | src/app.ts | 10 | Bug | Fix it |');
  });

  it('returns summary output', () => {
    const output = report(mockResult, 'summary');
    expect(output).toContain('Review Summary');
  });

  it('returns summary with zero issues', () => {
    const empty: ReviewResult = {
      summary: '✅ Review complete — no issues found',
      findings: [],
      filesReviewed: [],
      totalHunks: 1,
      totalFindings: 0,
      raw: '',
    };
    const output = report(empty, 'summary');
    expect(output).toContain('no issues found');
  });
});
