export interface DiffHunk {
  file: string;
  oldStart: number;
  newStart: number;
  content: string;
  additions: string[];
  removals: string[];
}

export interface ParsedDiff {
  hunks: DiffHunk[];
  raw: string;
}

export function parseDiff(raw: string): ParsedDiff {
  const hunks: DiffHunk[] = [];
  let currentFile = '';
  let currentHunk: DiffHunk | null = null;

  const lines = raw.split('\n');

  for (const line of lines) {
    const fileHeader = line.match(/^diff --git a\/(.+?) b\//);
    if (fileHeader) {
      currentFile = fileHeader[1];
      continue;
    }

    const hunkHeader = line.match(/^@@ -(\d+),\d+ \+(\d+),\d+ @@/);
    if (hunkHeader) {
      if (currentHunk) {
        hunks.push(currentHunk);
      }
      currentHunk = {
        file: currentFile,
        oldStart: parseInt(hunkHeader[1]),
        newStart: parseInt(hunkHeader[2]),
        content: line + '\n',
        additions: [],
        removals: [],
      };
      continue;
    }

    if (currentHunk) {
      currentHunk.content += line + '\n';
      if (line.startsWith('+') && !line.startsWith('+++')) {
        currentHunk.additions.push(line.slice(1));
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        currentHunk.removals.push(line.slice(1));
      }
    }
  }

  if (currentHunk) {
    hunks.push(currentHunk);
  }

  return { hunks, raw };
}

export function getChangedFiles(diff: ParsedDiff): string[] {
  return [...new Set(diff.hunks.map(h => h.file))];
}

export function getHunkSummary(hunk: DiffHunk): string {
  const added = hunk.additions.length;
  const removed = hunk.removals.length;
  return `${hunk.file}:+${added}/-${removed} (lines ${hunk.newStart}-${hunk.newStart + added})`;
}
