import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface ReviewPilotConfig {
  model: string;
  ollamaHost: string;
  rules: string[];
  githubToken?: string;
  gitlabToken?: string;
  defaultFormat: 'table' | 'json' | 'markdown' | 'summary';
  ignorePatterns: string[];
}

const DEFAULT_CONFIG: ReviewPilotConfig = {
  model: 'codellama',
  ollamaHost: 'http://127.0.0.1:11434',
  rules: ['bugs', 'security', 'performance', 'style'],
  defaultFormat: 'table',
  ignorePatterns: ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', '*.min.*'],
};

function getConfigPaths(): { local: string; global: string } {
  return {
    local: join(process.cwd(), '.reviewpilotrc'),
    global: join(homedir(), '.reviewpilot', 'config.json'),
  };
}

export function loadConfig(): ReviewPilotConfig {
  const paths = getConfigPaths();
  let config = { ...DEFAULT_CONFIG };

  if (existsSync(paths.local)) {
    try {
      const local = JSON.parse(readFileSync(paths.local, 'utf-8'));
      config = { ...config, ...local };
    } catch {
      // ignore invalid local config
    }
  }

  if (existsSync(paths.global)) {
    try {
      const global = JSON.parse(readFileSync(paths.global, 'utf-8'));
      config = { ...config, ...global };
    } catch {
      // ignore invalid global config
    }
  }

  config.model = process.env.REVIEWPILOT_MODEL || config.model;
  config.ollamaHost = process.env.REVIEWPILOT_OLLAMA_HOST || config.ollamaHost;
  config.githubToken = process.env.GITHUB_TOKEN || process.env.REVIEWPILOT_GITHUB_TOKEN || config.githubToken;

  return config;
}

export function saveLocalConfig(config: Partial<ReviewPilotConfig>): void {
  const paths = getConfigPaths();
  let existing: Record<string, unknown> = {};

  if (existsSync(paths.local)) {
    try {
      existing = JSON.parse(readFileSync(paths.local, 'utf-8'));
    } catch {
      // ignore
    }
  }

  const merged = { ...existing, ...config };
  writeFileSync(paths.local, JSON.stringify(merged, null, 2), 'utf-8');
}

export function saveGlobalConfig(config: Partial<ReviewPilotConfig>): void {
  const paths = getConfigPaths();
  const dir = join(homedir(), '.reviewpilot');

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  let existing: Record<string, unknown> = {};
  if (existsSync(paths.global)) {
    try {
      existing = JSON.parse(readFileSync(paths.global, 'utf-8'));
    } catch {
      // ignore
    }
  }

  const merged = { ...existing, ...config };
  writeFileSync(paths.global, JSON.stringify(merged, null, 2), 'utf-8');
}

export function detectProjectLanguage(): string {
  const files = ['package.json', 'Cargo.toml', 'go.mod', 'Gemfile', 'requirements.txt', 'pom.xml', 'build.gradle', '*.csproj'];
  for (const f of files) {
    if (existsSync(join(process.cwd(), f))) {
      return f;
    }
  }
  return 'unknown';
}

export function generateDefaultConfig(): ReviewPilotConfig {
  return { ...DEFAULT_CONFIG };
}
