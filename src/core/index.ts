export { parseDiff, filterIgnoredFiles, getChangedFiles, getHunkSummary } from './diff-parser.js';
export type { ParsedDiff, DiffHunk } from './diff-parser.js';

export { createOllamaClient, getAvailableModels } from './llm.js';
export type { LLMClient, LLMOptions } from './llm.js';

export { analyzeDiff, formatFindingsAsTable } from './analyzer.js';
export type { ReviewResult, ReviewFinding, AnalyzeOptions } from './analyzer.js';

export { report } from './reporter.js';
export type { OutputFormat } from './reporter.js';

export {
  loadConfig,
  saveLocalConfig,
  saveGlobalConfig,
  detectProjectLanguage,
  generateDefaultConfig,
} from './config.js';
export type { ReviewPilotConfig } from './config.js';
