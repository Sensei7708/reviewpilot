import { describe, it, expect } from '@jest/globals';
import { parseDiff, getChangedFiles, getHunkSummary } from '../src/core/diff-parser.js';

describe('parseDiff', () => {
  it('parses a simple diff with one hunk', () => {
    const diff = `diff --git a/src/index.ts b/src/index.ts
@@ -1,3 +1,4 @@
 line1
+added line
 line2
 line3`;
    const result = parseDiff(diff);
    expect(result.hunks).toHaveLength(1);
    expect(result.hunks[0].file).toBe('src/index.ts');
    expect(result.hunks[0].additions).toContain('added line');
  });

  it('parses multiple hunks', () => {
    const diff = `diff --git a/a.ts b/a.ts
@@ -1 +1,2 @@
+new
 old
diff --git a/b.ts b/b.ts
@@ -1 +1 @@
-old
+new`;
    const result = parseDiff(diff);
    expect(result.hunks).toHaveLength(2);
  });

  it('returns empty hunks for empty diff', () => {
    const result = parseDiff('');
    expect(result.hunks).toHaveLength(0);
  });

  it('tracks additions and removals', () => {
    const diff = `diff --git a/f.ts b/f.ts
@@ -1,2 +1,3 @@
-removed
 kept
+added`;
    const result = parseDiff(diff);
    expect(result.hunks[0].additions).toEqual(['added']);
    expect(result.hunks[0].removals).toEqual(['removed']);
  });
});

describe('getChangedFiles', () => {
  it('returns unique files from hunks', () => {
    const parsed = parseDiff(`diff --git a/a.ts b/a.ts
@@ -1 +1,2 @@
+new
 old
diff --git a/b.ts b/b.ts
@@ -1 +1 @@
-old
+new`);
    const files = getChangedFiles(parsed);
    expect(files).toEqual(['a.ts', 'b.ts']);
  });
});

describe('getHunkSummary', () => {
  it('returns formatted summary', () => {
    const parsed = parseDiff(`diff --git a/f.ts b/f.ts
@@ -1,2 +1,3 @@
-removed
 kept
+added`);
    const summary = getHunkSummary(parsed.hunks[0]);
    expect(summary).toContain('f.ts');
    expect(summary).toContain('+1/-1');
  });
});
