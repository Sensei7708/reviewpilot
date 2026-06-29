import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { parseDiff } from '../../core/diff-parser.js';
import { createOllamaClient } from '../../core/llm.js';
import { analyzeDiff } from '../../core/analyzer.js';
import { report } from '../../core/reporter.js';
import { loadConfig } from '../../core/config.js';
import { checkOllama } from '../utils/ollama-check.js';

export const diffCommand = new Command('diff')
  .description('Analyze a diff file')
  .argument('[file]', 'Path to diff file (reads from stdin if not provided)')
  .option('-f, --format <format>', 'Output format: table|json|markdown|summary', 'table')
  .option('-m, --model <model>', 'Ollama model to use')
  .action(async (file: string | undefined, options: { format?: string; model?: string }) => {
    try {
      const config = loadConfig();

      const ollamaOk = await checkOllama(config);
      if (!ollamaOk) return;

      let diffText: string;

      if (file) {
        diffText = readFileSync(file, 'utf-8');
      } else {
        diffText = await readStdin();
      }

      if (!diffText || diffText.trim() === '') {
        console.log(chalk.yellow('No diff content provided.'));
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

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on('data', (chunk: Buffer) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    process.stdin.on('error', reject);
  });
}
