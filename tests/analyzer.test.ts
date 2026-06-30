import { describe, it, expect } from '@jest/globals';
import { parseDiff } from '../src/core/diff-parser.js';
import {
  parseFindings,
  formatFindingsAsTable,
} from '../src/core/analyzer.js';
import type { ReviewFinding } from '../src/core/analyzer.js';

describe('parseFindings', () => {
  it('parses a single finding from LLM response', () => {
    const response = `SEVERITY: high
FILE: src/app.ts
LINE: 42
ISSUE: Unhandled promise rejection
SUGGESTION: Add .catch() handler`;
    const hunk = { file: 'src/app.ts', oldStart: 40, newStart: 42, content: '', additions: [], removals: [] };
    const findings = parseFindings(response, hunk);
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('high');
    expect(findings[0].line).toBe(42);
    expect(findings[0].issue).toBe('Unhandled promise rejection');
  });

  it('parses multiple findings', () => {
    const response = `SEVERITY: critical
FILE: src/auth.ts
LINE: 10
ISSUE: SQL injection risk
SUGGESTION: Use parameterized queries

SEVERITY: low
FILE: src/auth.ts
LINE: 15
ISSUE: Missing type annotation
SUGGESTION: Add explicit return type`;
    const hunk = { file: 'src/auth.ts', oldStart: 8, newStart: 10, content: '', additions: [], removals: [] };
    const findings = parseFindings(response, hunk);
    expect(findings).toHaveLength(2);
    expect(findings[0].severity).toBe('critical');
    expect(findings[1].severity).toBe('low');
  });

  it('returns empty array for response with no findings', () => {
    const response = 'No issues found in this hunk.';
    const hunk = { file: 'f.ts', oldStart: 1, newStart: 1, content: '', additions: [], removals: [] };
    const findings = parseFindings(response, hunk);
    expect(findings).toHaveLength(0);
  });

  it('uses hunk defaults when parsed fields are missing', () => {
    const response = `SEVERITY: medium
ISSUE: Memory leak
SUGGESTION: Clean up event listeners`;
    const hunk = { file: 'f.ts', oldStart: 1, newStart: 5, content: '', additions: [], removals: [] };
    const findings = parseFindings(response, hunk);
    expect(findings).toHaveLength(1);
    expect(findings[0].file).toBe('f.ts');
    expect(findings[0].line).toBe(5);
  });
});

describe('formatFindingsAsTable', () => {
  it('formats findings as a readable table', () => {
    const findings: ReviewFinding[] = [
      { severity: 'high', file: 'src/app.ts', line: 10, issue: 'Bug', suggestion: 'Fix it' },
    ];
    const output = formatFindingsAsTable(findings);
    expect(output).toContain('HIGH');
    expect(output).toContain('src/app.ts');
    expect(output).toContain('Bug');
  });

  it('returns placeholder for empty findings', () => {
    expect(formatFindingsAsTable([])).toBe('No issues found.');
  });
});
