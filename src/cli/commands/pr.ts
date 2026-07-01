import { Command } from 'commander';
import chalk from 'chalk';
import { parseDiff } from '../../core/diff-parser.js';
import { createOllamaClient } from '../../core/llm.js';
import { analyzeDiff } from '../../core/analyzer.js';
import { report } from '../../core/reporter.js';
import { loadConfig, incrementReviewCount, getReviewCount } from '../../core/config.js';
import { parsePRUrl, fetchPRDiff, postPRComment } from '../../github/api.js';
import type { PRInfo } from '../../github/api.js';
import { parseMRUrl, fetchMRDiff, postMRComment } from '../../gitlab/api.js';
import type { MRInfo } from '../../gitlab/api.js';
import { isProLicense, canUseFormat, getUpgradePrompt, getUpgradeBanner } from '../../license/validator.js';
import { checkOllama } from '../utils/ollama-check.js';

export function isGitLabUrl(url: string): boolean {
  return /gitlab\./i.test(url) || url.includes('/merge_requests/');
}

export function isGitHubUrl(url: string): boolean {
  return /github\.com/i.test(url);
}

export const prCommand = new Command('pr')
  .description('Analyze a pull request on GitHub or GitLab')
  .argument('<url>', 'PR/MR URL (e.g. https://github.com/owner/repo/pull/123 or https://gitlab.com/owner/repo/-/merge_requests/1)')
  .option('-p, --post', 'Post results as a PR/MR comment (requires GITHUB_TOKEN or GITLAB_TOKEN)')
  .option('-f, --format <format>', 'Output format: table|json|markdown|summary|text', 'table')
  .option('-m, --model <model>', 'Ollama model to use')
  .option('-c, --concurrency <n>', 'Number of concurrent review requests', '3')
  .action(async (url: string, options: { post?: boolean; format?: string; model?: string; concurrency?: string }) => {
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

      const isGitLab = isGitLabUrl(url);
      const isGitHub = isGitHubUrl(url);

      if (!isGitLab && !isGitHub) {
        console.log(chalk.red('Unsupported platform. Use a GitHub or GitLab URL.'));
        return;
      }

      if (isGitLab) {
        const info = parseMRUrl(url);
        const ownerRepo = `${info.owner}/${info.repo}`;
        console.log(chalk.blue(`\n Fetching MR #${info.number} from ${ownerRepo}...`));

        const diffText = await fetchMRDiff(info, config.gitlabToken);
        if (!diffText || diffText.trim() === '') {
          console.log(chalk.yellow('MR diff is empty — nothing to review.'));
          return;
        }

        const diff = parseDiff(diffText);

        const llm = createOllamaClient({
          model: options.model || config.model,
          host: config.ollamaHost,
        });

        const result = await analyzeDiff(diff, llm, {
          rules: config.rules,
          ignorePatterns: config.ignorePatterns,
          concurrency: parseInt(options.concurrency || '3', 10),
        });

        const files = result.filesReviewed.length;
        const filtered = diff.hunks.length - result.totalHunks;
        const filteredNote = filtered > 0 ? chalk.dim(` (${filtered} filtered)`) : '';
        console.log(chalk.dim(`  ${result.totalHunks} hunk(s) in ${files} file(s)${filteredNote}\n`));

        incrementReviewCount();
        const output = report(result, format as any);
        console.log(output);

        const pro = isProLicense();
        if (options.post && pro && config.gitlabToken) {
          const markdown = report(result, 'markdown');
          await postMRComment(info, markdown, config.gitlabToken);
          console.log(chalk.green(' Results posted as MR comment.'));
        } else if (options.post && !pro) {
          console.log(getUpgradePrompt('Posting MR comments'));
        } else if (options.post && !config.gitlabToken) {
          console.log(chalk.yellow(' Set GITLAB_TOKEN env var to post comments.'));
        }
      } else {
        const info: PRInfo = parsePRUrl(url);
        console.log(chalk.blue(`\n Fetching PR #${info.number} from ${info.owner}/${info.repo}...`));

        const diffText = await fetchPRDiff(info, config.githubToken);
        if (!diffText || diffText.trim() === '') {
          console.log(chalk.yellow('PR diff is empty — nothing to review.'));
          return;
        }

        const diff = parseDiff(diffText);

        const llm = createOllamaClient({
          model: options.model || config.model,
          host: config.ollamaHost,
        });

        const result = await analyzeDiff(diff, llm, {
          rules: config.rules,
          ignorePatterns: config.ignorePatterns,
          concurrency: parseInt(options.concurrency || '3', 10),
        });

        const files = result.filesReviewed.length;
        const filtered = diff.hunks.length - result.totalHunks;
        const filteredNote = filtered > 0 ? chalk.dim(` (${filtered} filtered)`) : '';
        console.log(chalk.dim(`  ${result.totalHunks} hunk(s) in ${files} file(s)${filteredNote}\n`));

        incrementReviewCount();
        const output = report(result, format as any);
        console.log(output);

        const pro = isProLicense();
        if (options.post && pro && config.githubToken) {
          const markdown = report(result, 'markdown');
          await postPRComment(info, markdown, config.githubToken);
          console.log(chalk.green(' Results posted as PR comment.'));
        } else if (options.post && !pro) {
          console.log(getUpgradePrompt('Posting PR comments'));
        } else if (options.post && !config.githubToken) {
          console.log(chalk.yellow(' Set GITHUB_TOKEN env var to post comments.'));
        }
      }

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
