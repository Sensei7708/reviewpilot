#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { prCommand } from './commands/pr.js';
import { diffCommand } from './commands/diff.js';
import { localCommand } from './commands/local.js';
import { checkCommand } from './commands/check.js';
import { initCommand } from './commands/init.js';
import { licenseCommand } from './commands/license.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getVersion(): string {
  try {
    const pkgPath = join(__dirname, '..', '..', '..', 'package.json');
    if (existsSync(pkgPath)) {
      return JSON.parse(readFileSync(pkgPath, 'utf-8')).version;
    }
  } catch {
    // fallback
  }
  return '1.0.0';
}

const program = new Command();

program
  .name('reviewpilot')
  .description('AI-powered code review CLI — runs locally with Ollama')
  .version(getVersion());

program.addCommand(prCommand);
program.addCommand(diffCommand);
program.addCommand(localCommand);
program.addCommand(checkCommand);
program.addCommand(initCommand);
program.addCommand(licenseCommand);

program.parse(process.argv);
