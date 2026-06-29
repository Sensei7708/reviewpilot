import { Command } from 'commander';
import chalk from 'chalk';
import { parseDiff } from '../../core/diff-parser.js';
import { createOllamaClient } from '../../core/llm.js';
import { analyzeDiff } from '../../core/analyzer.js';
import { report } from '../../core/reporter.js';
import { loadConfig, incrementReviewCount, getReviewCount } from '../../core/config.js';
import { getLocalDiff } from '../../github/api.js';
import { checkOllama } from '../utils/ollama-check.js';
import { canUseFormat, getUpgradePrompt, getUpgradeBanner } from '../../license/validator.js';

export const checkCommand = new Command('check')
  .description('Analyze current branch vs main (or specified branch)')
  .argument('[branch]', 'Branch to compare against', 'main')
  .option('-f, --format <format>', 'Output format: table|json|markdown|summary', 'table')
  .option('-m, --model <model>', 'Ollama model to use')
  .action(async (branch: string, options: { format?: string; model?: string }) => {
    try {
      const config = loadConfig();

      const format = options.format || 'table';
      if (!canUseFormat(format)) {
        console.log(getUpgradePrompt('JSON/Markdown output'));
        return;
      }

      const { remaining } = getReviewCount();
      if (remaining <= 0) {
        console.log(chalk.yellow('\n  You\'ve used all 5 free daily reviews.'));
        console.log(getUpgradeBanner());
        return;
      }

      const ollamaOk = await checkOllama(config);
      if (!ollamaOk) return;

      const diffText = getLocalDiff(branch);
      if (!diffText || diffText.trim() === '') {
        console.log(chalk.yellow(`No diff found between current branch and ${branch}.`));
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

      incrementReviewCount();
      console.log(report(result, format as any));

      const { remaining: remainingAfter } = getReviewCount();
      if (remainingAfter <= 2) {
        console.log(chalk.dim(`\n  ${remainingAfter} free review(s) remaining today.`));
        console.log(getUpgradeBanner());
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`\n Error: ${message}`));
      process.exit(1);
    }
  });
