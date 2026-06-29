import { Command } from 'commander';
import chalk from 'chalk';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { loadConfig, generateDefaultConfig, detectProjectLanguage } from '../../core/config.js';

export const initCommand = new Command('init')
  .description('Set up ReviewPilot configuration in the current repo')
  .option('-f, --force', 'Overwrite existing config')
  .action((options: { force?: boolean }) => {
    const configPath = join(process.cwd(), '.reviewpilotrc');

    if (existsSync(configPath) && !options.force) {
      console.log(chalk.yellow('.reviewpilotrc already exists. Use --force to overwrite.'));
      return;
    }

    const lang = detectProjectLanguage();
    const config = generateDefaultConfig();

    const userConfig = {
      model: 'codellama',
      ollamaHost: 'http://127.0.0.1:11434',
      rules: ['bugs', 'security', 'performance', 'style'],
      project: lang,
    };

    writeFileSync(configPath, JSON.stringify(userConfig, null, 2) + '\n', 'utf-8');

    console.log(chalk.green('\n ReviewPilot initialized!'));
    console.log(chalk.dim('  Config written to: .reviewpilotrc\n'));
    console.log('  Next steps:');
    console.log('    1. Ensure Ollama is running');
    console.log('    2. Pull a code model: ollama pull codellama');
    console.log('    3. Run: reviewpilot check');
    console.log('');

    createGitignore();
  });

function createGitignore() {
  const gitignorePath = join(process.cwd(), '.gitignore');
  const entry = '\n# ReviewPilot\n.reviewpilot/\n';

  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, 'utf-8');
    if (!content.includes('.reviewpilot/')) {
      writeFileSync(gitignorePath, content + entry, 'utf-8');
    }
  }
}
