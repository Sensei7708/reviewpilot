import { describe, it, expect, jest } from '@jest/globals';
import { parseDiff } from '../src/core/diff-parser.js';
import {
  parseFindings,
  formatFindingsAsTable,
  analyzeDiff,
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

describe('parseFindings edge cases', () => {
  it('parses info severity', () => {
    const response = `SEVERITY: info
FILE: src/app.ts
LINE: 1
ISSUE: Consider refactoring
SUGGESTION: Extract to helper function`;
    const hunk = { file: 'src/app.ts', oldStart: 1, newStart: 1, content: '', additions: [], removals: [] };
    const findings = parseFindings(response, hunk);
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('info');
  });

  it('handles uppercase severity', () => {
    const response = `SEVERITY: CRITICAL
FILE: f.ts
LINE: 5
ISSUE: Bug
SUGGESTION: Fix it`;
    const hunk = { file: 'f.ts', oldStart: 1, newStart: 5, content: '', additions: [], removals: [] };
    const findings = parseFindings(response, hunk);
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('critical');
  });

  it('skips incomplete findings', () => {
    const response = `SEVERITY: high
FILE: f.ts
LINE: 1
ISSUE: Missing suggestion`;
    const hunk = { file: 'f.ts', oldStart: 1, newStart: 1, content: '', additions: [], removals: [] };
    const findings = parseFindings(response, hunk);
    expect(findings).toHaveLength(0);
  });
});

describe('analyzeDiff with ignore patterns', () => {
  it('recovers from per-hunk LLM errors', async () => {
    const diff = parseDiff(`diff --git a/good.ts b/good.ts
@@ -1 +1,2 @@
+ok
 old
diff --git a/bad.ts b/bad.ts
@@ -1 +1,2 @@
+err
 old`);
    let callCount = 0;
    const reviewMock = jest.fn<() => Promise<string>>().mockImplementation(async () => {
      callCount++;
      if (callCount === 2) throw new Error('LLM timeout');
      return 'SEVERITY: low\nFILE: good.ts\nLINE: 1\nISSUE: Minor\nSUGGESTION: Clean up';
    });
    const checkMock = jest.fn<() => Promise<boolean>>().mockResolvedValue(true);
    const llm: import('../src/core/llm.js').LLMClient = { review: reviewMock, checkConnection: checkMock };
    const result = await analyzeDiff(diff, llm);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].issue).toBe('Minor');
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('bad.ts');
    expect(result.errors[0]).toContain('LLM timeout');
  });

  it('returns early when all hunks filtered', async () => {
    const diff = parseDiff(`diff --git a/package-lock.json b/package-lock.json
@@ -1 +1,2 @@
+new
 old`);
    const reviewMock = jest.fn<() => Promise<string>>().mockResolvedValue('No issues found.');
    const checkMock = jest.fn<() => Promise<boolean>>().mockResolvedValue(true);
    const llm: import('../src/core/llm.js').LLMClient = { review: reviewMock, checkConnection: checkMock };
    const result = await analyzeDiff(diff, llm, {
      ignorePatterns: ['package-lock.json'],
    });
    expect(result.totalHunks).toBe(0);
    expect(result.totalFindings).toBe(0);
    expect(result.errors).toEqual([]);
    expect(llm.review).not.toHaveBeenCalled();
  });
});
