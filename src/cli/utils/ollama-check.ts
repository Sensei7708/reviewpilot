import chalk from 'chalk';
import { createOllamaClient, getAvailableModels } from '../../core/llm.js';
import type { ReviewPilotConfig } from '../../core/config.js';

export async function checkOllama(config: ReviewPilotConfig): Promise<boolean> {
  const llm = createOllamaClient({
    host: config.ollamaHost,
  });

  const ok = await llm.checkConnection();
  if (!ok) {
    console.error(chalk.red('\n Ollama is not running!\n'));
    console.error(chalk.yellow('  Start Ollama and pull a code model:'));
    console.error(chalk.dim('    ollama pull codellama'));
    console.error(chalk.dim('    # Or: ollama pull deepseek-coder'));
    console.error(chalk.dim('    # Or: ollama pull llama3'));
    console.error('');
    return false;
  }

  const models = getAvailableModels();
  const hasModel = models.some(m => m.startsWith(config.model));

  if (!hasModel && models.length > 0) {
    console.warn(chalk.yellow(`\n Model "${config.model}" not found. Available: ${models.join(', ')}`));
    console.warn(chalk.yellow(`  Run: ollama pull ${config.model}\n`));
  }

  return true;
}
