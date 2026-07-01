import { ReviewPilotConfig } from './config.js';

export interface ValidationError {
  field: string;
  message: string;
  value: unknown;
}

const VALID_RULES = ['bugs', 'security', 'performance', 'style'];
const VALID_FORMATS = ['table', 'json', 'markdown', 'summary', 'text'];

export function validateConfig(
  input: Record<string, unknown>,
  source: string
): { errors: ValidationError[]; warnings: ValidationError[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (input.model !== undefined && typeof input.model !== 'string') {
    errors.push({ field: 'model', message: 'Must be a string', value: input.model });
  }

  if (input.ollamaHost !== undefined) {
    if (typeof input.ollamaHost !== 'string') {
      errors.push({ field: 'ollamaHost', message: 'Must be a string', value: input.ollamaHost });
    } else if (!/^https?:\/\/.+/.test(input.ollamaHost)) {
      errors.push({ field: 'ollamaHost', message: 'Must be a valid URL starting with http:// or https://', value: input.ollamaHost });
    }
  }

  if (input.rules !== undefined) {
    if (!Array.isArray(input.rules)) {
      errors.push({ field: 'rules', message: 'Must be an array of strings', value: input.rules });
    } else {
      for (const r of input.rules) {
        if (typeof r !== 'string') {
          errors.push({ field: 'rules', message: 'Each rule must be a string', value: r });
        } else if (!VALID_RULES.includes(r)) {
          warnings.push({ field: 'rules', message: `Unknown rule "${r}". Valid: ${VALID_RULES.join(', ')}`, value: r });
        }
      }
    }
  }

  if (input.githubToken !== undefined && typeof input.githubToken !== 'string') {
    errors.push({ field: 'githubToken', message: 'Must be a string', value: input.githubToken });
  }

  if (input.gitlabToken !== undefined && typeof input.gitlabToken !== 'string') {
    errors.push({ field: 'gitlabToken', message: 'Must be a string', value: input.gitlabToken });
  }

  if (input.defaultFormat !== undefined) {
    if (typeof input.defaultFormat !== 'string') {
      errors.push({ field: 'defaultFormat', message: 'Must be a string', value: input.defaultFormat });
    } else if (!VALID_FORMATS.includes(input.defaultFormat)) {
      errors.push({
        field: 'defaultFormat',
        message: `Must be one of: ${VALID_FORMATS.join(', ')}`,
        value: input.defaultFormat,
      });
    }
  }

  if (input.ignorePatterns !== undefined) {
    if (!Array.isArray(input.ignorePatterns)) {
      errors.push({ field: 'ignorePatterns', message: 'Must be an array of strings', value: input.ignorePatterns });
    } else {
      for (const p of input.ignorePatterns) {
        if (typeof p !== 'string') {
          errors.push({ field: 'ignorePatterns', message: 'Each pattern must be a string', value: p });
        }
      }
    }
  }

  for (const key of Object.keys(input)) {
    if (!['model', 'ollamaHost', 'rules', 'githubToken', 'gitlabToken', 'defaultFormat', 'ignorePatterns'].includes(key)) {
      warnings.push({ field: key, message: `Unknown config key "${key}"`, value: input[key] });
    }
  }

  return { errors, warnings };
}

export function formatValidationErrors(
  errors: ValidationError[],
  warnings: ValidationError[],
  source: string
): string | null {
  if (errors.length === 0 && warnings.length === 0) return null;

  const lines: string[] = [];
  lines.push(`Configuration issues in ${source}:`);

  for (const e of errors) {
    lines.push(`  ✖ ${e.field}: ${e.message} (got: ${JSON.stringify(e.value)})`);
  }
  for (const w of warnings) {
    lines.push(`  ⚠ ${w.field}: ${w.message} (got: ${JSON.stringify(w.value)})`);
  }

  return lines.join('\n');
}
