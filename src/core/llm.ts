import { execSync } from 'child_process';

export interface LLMOptions {
  model?: string;
  host?: string;
  temperature?: number;
}

export interface LLMClient {
  review(options: {
    diff: string;
    file: string;
    context?: string;
    rules?: string[];
  }): Promise<string>;

  checkConnection(): Promise<boolean>;
}

export function createOllamaClient(opts: LLMOptions = {}): LLMClient {
  const model = opts.model || 'codellama';
  const host = opts.host || 'http://127.0.0.1:11434';
  const temperature = opts.temperature ?? 0.1;

  const promptTemplate = `You are an expert code reviewer. Review the following code diff for bugs, security issues, performance problems, and code style violations.

Focus on:
- Logic errors and bugs
- Security vulnerabilities (XSS, SQL injection, path traversal, etc.)
- Performance issues (N+1 queries, memory leaks, etc.)
- Error handling gaps
- Race conditions or concurrency issues
- Code style and maintainability

For each issue found, provide:
1. SEVERITY: critical / high / medium / low
2. FILE: the file name
3. LINE: approximate line number
4. ISSUE: what the problem is
5. SUGGESTION: how to fix it

If no issues found, say "No issues found."

File: {{FILE}}
Context: {{CONTEXT}}
Rules: {{RULES}}

Diff:
\`\`\`diff
{{DIFF}}
\`\`\`

Review:`;

  async function review(options: {
    diff: string;
    file: string;
    context?: string;
    rules?: string[];
  }): Promise<string> {
    const prompt = promptTemplate
      .replace('{{FILE}}', options.file)
      .replace('{{CONTEXT}}', options.context || 'N/A')
      .replace('{{RULES}}', options.rules?.join(', ') || 'standard')
      .replace('{{DIFF}}', options.diff);

    const body = JSON.stringify({
      model,
      prompt,
      stream: false,
      options: {
        temperature,
      },
    });

    try {
      const result = execSync(
        `curl -s "${host}/api/generate" -d "${escapeJson(body)}"`,
        { encoding: 'utf-8', timeout: 120000 }
      );
      const parsed = JSON.parse(result);
      return parsed.response || '';
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Ollama request failed: ${message}`);
    }
  }

  async function checkConnection(): Promise<boolean> {
    try {
      const result = execSync(
        `curl -s "${host}/api/tags"`,
        { encoding: 'utf-8', timeout: 5000 }
      );
      JSON.parse(result);
      return true;
    } catch {
      return false;
    }
  }

  return { review, checkConnection };
}

function escapeJson(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

export function getAvailableModels(): string[] {
  try {
    const result = execSync(
      `curl -s "http://127.0.0.1:11434/api/tags"`,
      { encoding: 'utf-8', timeout: 5000 }
    );
    const parsed = JSON.parse(result);
    return (parsed.models || []).map((m: { name: string }) => m.name);
  } catch {
    return [];
  }
}
