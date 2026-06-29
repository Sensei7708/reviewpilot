import { Command } from 'commander';
import chalk from 'chalk';
import { parseDiff } from '../../core/diff-parser.js';
import { createOllamaClient } from '../../core/llm.js';
import { analyzeDiff } from '../../core/analyzer.js';
import { report } from '../../core/reporter.js';
import { loadConfig } from '../../core/config.js';
import { parsePRUrl, fetchPRDiff, postPRComment } from '../../github/api.js';
import { isProLicense } from '../../license/validator.js';
import { checkOllama } from '../utils/ollama-check.js';

export const prCommand = new Command('pr')
  .description('Analyze a GitHub pull request')
  .argument('<url>', 'GitHub PR URL (https://github.com/owner/repo/pull/123)')
  .option('-p, --post', 'Post results as a PR comment (requires GITHUB_TOKEN)')
  .option('-f, --format <format>', 'Output format: table|json|markdown|summary', 'table')
  .option('-m, --model <model>', 'Ollama model to use')
  .action(async (url: string, options: { post?: boolean; format?: string; model?: string }) => {
    try {
      const config = loadConfig();

      const ollamaOk = await checkOllama(config);
      if (!ollamaOk) return;

      const info = parsePRUrl(url);
      console.log(chalk.blue(`\n Fetching PR #${info.number} from ${info.owner}/${info.repo}...`));

      const diffText = fetchPRDiff(info, config.githubToken);
      if (!diffText || diffText.trim() === '') {
        console.log(chalk.yellow('PR diff is empty — nothing to review.'));
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

      const output = report(result, options.format as any);
      console.log(output);

      const pro = isProLicense();
      if (options.post && pro && config.githubToken) {
        const markdown = report(result, 'markdown');
        postPRComment(info, markdown, config.githubToken);
        console.log(chalk.green(' Results posted as PR comment.'));
      } else if (options.post && !pro) {
        console.log(chalk.yellow(' Posting comments requires a Pro license. Run: reviewpilot license activate <key>'));
      } else if (options.post && !config.githubToken) {
        console.log(chalk.yellow(' Set GITHUB_TOKEN env var to post comments.'));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`\n Error: ${message}`));
      process.exit(1);
    }
  });
