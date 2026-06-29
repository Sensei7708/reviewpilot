import { Command } from 'commander';
import chalk from 'chalk';
import { parseDiff } from '../../core/diff-parser.js';
import { createOllamaClient } from '../../core/llm.js';
import { analyzeDiff } from '../../core/analyzer.js';
import { report } from '../../core/reporter.js';
import { loadConfig } from '../../core/config.js';
import { getUncommittedDiff } from '../../github/api.js';
import { checkOllama } from '../utils/ollama-check.js';

export const localCommand = new Command('local')
  .description('Analyze local uncommitted changes')
  .option('-f, --format <format>', 'Output format: table|json|markdown|summary', 'table')
  .option('-m, --model <model>', 'Ollama model to use')
  .action(async (options: { format?: string; model?: string }) => {
    try {
      const config = loadConfig();

      const ollamaOk = await checkOllama(config);
      if (!ollamaOk) return;

      const diffText = getUncommittedDiff();
      if (!diffText || diffText.trim() === '') {
        console.log(chalk.yellow('No uncommitted changes found.'));
        return;
      }

      const diff = parseDiff(diffText);
      console.log(chalk.dim(`  ${diff.hunks.length} hunk(s) in ${[...new Set(diff.hunks.map(h => h.file))].length} file(s)\n`));

      const llm = createOllamaClient({
        model: options.model || config.model,
        host: config.ollamaHost,
      });

      const result = await analyzeDiff(diff, llm, {
        rules: config.rules,
      });

      console.log(report(result, options.format as any));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`\n Error: ${message}`));
      process.exit(1);
    }
  });
