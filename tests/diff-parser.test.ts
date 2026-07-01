import { describe, it, expect } from '@jest/globals';
import { parseDiff, filterIgnoredFiles, getChangedFiles, getHunkSummary } from '../src/core/diff-parser.js';

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

describe('filterIgnoredFiles', () => {
  it('returns same diff when no patterns', () => {
    const parsed = parseDiff(`diff --git a/a.ts b/a.ts
@@ -1 +1,2 @@
+new
 old`);
    const result = filterIgnoredFiles(parsed, []);
    expect(result.hunks).toHaveLength(1);
    expect(result.filteredCount).toBe(0);
  });

  it('filters out hunks matching exact filename pattern', () => {
    const diff = `diff --git a/package-lock.json b/package-lock.json
@@ -1 +1,2 @@
+new
 old
diff --git a/src/app.ts b/src/app.ts
@@ -1 +1,2 @@
+added
 kept`;
    const parsed = parseDiff(diff);
    const result = filterIgnoredFiles(parsed, ['package-lock.json']);
    expect(result.hunks).toHaveLength(1);
    expect(result.hunks[0].file).toBe('src/app.ts');
    expect(result.filteredCount).toBe(1);
  });

  it('filters out hunks matching glob pattern', () => {
    const diff = `diff --git a/dist/bundle.min.js b/dist/bundle.min.js
@@ -1 +1,2 @@
+new
 old
diff --git a/src/app.ts b/src/app.ts
@@ -1 +1,2 @@
+added
 kept`;
    const parsed = parseDiff(diff);
    const result = filterIgnoredFiles(parsed, ['*.min.*']);
    expect(result.hunks).toHaveLength(1);
    expect(result.hunks[0].file).toBe('src/app.ts');
    expect(result.filteredCount).toBe(1);
  });

  it('filters multiple files with multiple patterns', () => {
    const diff = `diff --git a/package-lock.json b/package-lock.json
@@ -1 +1,2 @@
+new
 old
diff --git a/yarn.lock b/yarn.lock
@@ -1 +1,2 @@
+new
 old
diff --git a/src/app.ts b/src/app.ts
@@ -1 +1,2 @@
+added
 kept`;
    const parsed = parseDiff(diff);
    const result = filterIgnoredFiles(parsed, ['package-lock.json', 'yarn.lock']);
    expect(result.hunks).toHaveLength(1);
    expect(result.filteredCount).toBe(2);
  });

  it('returns empty when all files filtered', () => {
    const diff = `diff --git a/package-lock.json b/package-lock.json
@@ -1 +1,2 @@
+new
 old`;
    const parsed = parseDiff(diff);
    const result = filterIgnoredFiles(parsed, ['package-lock.json']);
    expect(result.hunks).toHaveLength(0);
    expect(result.filteredCount).toBe(1);
  });
});
