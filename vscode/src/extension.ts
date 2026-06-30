import * as vscode from 'vscode';
import { execSync } from 'child_process';
import { existsSync, writeFileSync, unlinkSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {
  diagnosticCollection = vscode.languages.createDiagnosticCollection('reviewpilot');
  context.subscriptions.push(diagnosticCollection);

  context.subscriptions.push(
    vscode.commands.registerCommand('reviewpilot.reviewFile', reviewFile),
    vscode.commands.registerCommand('reviewpilot.reviewWorkspace', reviewWorkspace),
    vscode.commands.registerCommand('reviewpilot.clearAnnotations', clearAnnotations),
    vscode.commands.registerCommand('reviewpilot.upgrade', showUpgrade)
  );

  const config = vscode.workspace.getConfiguration('reviewpilot');
  if (config.get('autoReviewOnSave') && !hasProLicense()) {
    vscode.window.showWarningMessage(
      'Auto-review on save requires ReviewPilot Pro. Upgrade to enable.',
      'Upgrade'
    ).then(selection => {
      if (selection === 'Upgrade') {
        vscode.env.openExternal(vscode.Uri.parse('https://reviewpilot.dev'));
      }
    });
  }

  vscode.window.showInformationMessage('ReviewPilot is ready');
}

function hasProLicense(): boolean {
  try {
    const licensePath = join(require('os').homedir(), '.reviewpilot', 'license.json');
    if (existsSync(licensePath)) {
      const data = JSON.parse(readFileSync(licensePath, 'utf-8'));
      if (data.tier === 'pro' || data.tier === 'team' || data.tier === 'enterprise') {
        if (data.expiresAt && new Date(data.expiresAt) < new Date()) return false;
        return true;
      }
    }
  } catch {}
  return false;
}

function showUpgrade() {
  const panel = vscode.window.createWebviewPanel(
    'reviewpilotUpgrade',
    'Upgrade to ReviewPilot Pro',
    vscode.ViewColumn.One,
    { enableScripts: true }
  );

  panel.webview.html = getUpgradeHtml();
}

function getUpgradeHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Upgrade ReviewPilot</title>
  <style>
    body { font-family: -apple-system, sans-serif; padding: 24px; color: #ccc; background: #1e1e1e; }
    h1 { color: #4fc3f7; }
    .plan { background: #2d2d2d; border-radius: 8px; padding: 16px; margin: 12px 0; }
    .plan h2 { margin: 0 0 8px; }
    .plan .price { font-size: 1.5em; color: #4fc3f7; }
    .btn { display: inline-block; background: #4fc3f7; color: #1e1e1e; padding: 10px 24px; border-radius: 6px; text-decoration: none; margin-top: 12px; font-weight: 600; cursor: pointer; }
    ul { list-style: none; padding: 0; }
    li { padding: 4px 0; }
    li::before { content: '✓ '; color: #4fc3f7; }
  </style>
</head>
<body>
  <h1>Upgrade ReviewPilot</h1>
  <p>Unlock the full power of local AI code review.</p>

  <div class="plan">
    <h2>Pro</h2>
    <div class="price">$199 <small>one-time</small></div>
    <ul>
      <li>Unlimited repositories</li>
      <li>GitHub Action integration</li>
      <li>Inline VS Code annotations</li>
      <li>JSON & Markdown output</li>
      <li>Auto-review on save</li>
      <li>Advanced custom rules</li>
      <li>Priority support</li>
    </ul>
    <a class="btn" href="https://reviewpilot.dev">Buy Pro</a>
  </div>

  <div class="plan">
    <h2>Team</h2>
    <div class="price">$499 <small>/year</small></div>
    <ul>
      <li>Everything in Pro</li>
      <li>Unlimited team members</li>
      <li>Shared review rules</li>
      <li>Team analytics dashboard</li>
      <li>Slack integration</li>
      <li>Dedicated support</li>
    </ul>
    <a class="btn" href="https://reviewpilot.dev">Buy Team</a>
  </div>

  <p style="margin-top: 24px;">
    Already have a license?
    <a href="https://reviewpilot.dev/activate" style="color: #4fc3f7;">Activate it here</a>.
  </p>
</body>
</html>`;
}

function getConfig() {
  const config = vscode.workspace.getConfiguration('reviewpilot');
  return {
    model: config.get<string>('model', 'codellama'),
    host: config.get<string>('ollamaHost', 'http://127.0.0.1:11434'),
  };
}

async function reviewFile() {
  if (!hasProLicense()) {
    vscode.window.showWarningMessage(
      'VS Code inline annotations require ReviewPilot Pro.',
      'Upgrade',
      'Learn More'
    ).then(selection => {
      if (selection === 'Upgrade') {
        vscode.env.openExternal(vscode.Uri.parse('https://reviewpilot.dev'));
      }
    });
    return;
  }

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No file open to review.');
    return;
  }

  await reviewDocument(editor.document.uri);
}

async function reviewWorkspace() {
  if (!hasProLicense()) {
    vscode.window.showWarningMessage(
      'VS Code inline annotations require ReviewPilot Pro.',
      'Upgrade',
      'Learn More'
    ).then(selection => {
      if (selection === 'Upgrade') {
        vscode.env.openExternal(vscode.Uri.parse('https://reviewpilot.dev'));
      }
    });
    return;
  }

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showWarningMessage('No workspace folder open.');
    return;
  }

  const config = getConfig();
  let diffText: string;

  try {
    diffText = execSync('git diff HEAD', {
      cwd: workspaceFolders[0].uri.fsPath,
      encoding: 'utf-8',
      timeout: 10000,
    });
  } catch {
    vscode.window.showErrorMessage('Failed to get git diff.');
    return;
  }

  if (!diffText.trim()) {
    vscode.window.showInformationMessage('No uncommitted changes found.');
    return;
  }

  const tmpFile = join(workspaceFolders[0].uri.fsPath, '.reviewpilot-tmp.diff');
  writeFileSync(tmpFile, diffText, 'utf-8');

  try {
    const result = execSync(
      `reviewpilot diff "${tmpFile}" --format json`,
      {
        cwd: workspaceFolders[0].uri.fsPath,
        encoding: 'utf-8',
        timeout: 60000,
        env: {
          ...process.env,
          REVIEWPILOT_MODEL: config.model,
          REVIEWPILOT_OLLAMA_HOST: config.host,
        },
      }
    );

    const parsed = JSON.parse(result);
    updateDiagnostics(parsed.findings || []);
    vscode.window.showInformationMessage(
      `ReviewPilot: ${parsed.totalFindings || 0} issues found`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`ReviewPilot failed: ${message}`);
  } finally {
    try { unlinkSync(tmpFile); } catch { }
  }
}

async function reviewDocument(uri: vscode.Uri) {
  const config = getConfig();
  const filePath = uri.fsPath;

  if (!filePath) return;

  const relativePath = vscode.workspace.asRelativePath(uri);
  let diffText: string;

  try {
    const root = vscode.workspace.getWorkspaceFolder(uri)?.uri.fsPath || '';
    diffText = execSync(
      `git diff HEAD -- "${relativePath}"`,
      { cwd: root, encoding: 'utf-8', timeout: 10000 }
    );
  } catch {
    return;
  }

  if (!diffText.trim()) return;

  const tmpFile = join(tmpdir(), `reviewpilot-diff-${Date.now()}.tmp`);
  writeFileSync(tmpFile, diffText, 'utf-8');

  try {
    const result = execSync(
      `reviewpilot diff "${tmpFile}" --format json`,
      {
        env: {
          ...process.env,
          REVIEWPILOT_MODEL: config.model,
          REVIEWPILOT_OLLAMA_HOST: config.host,
        },
        encoding: 'utf-8',
        timeout: 60000,
      }
    );

    const parsed = JSON.parse(result);
    const fileFindings = (parsed.findings || []).filter(
      (f: any) => f.file === relativePath || f.file.endsWith(filePath)
    );

    updateDiagnostics(fileFindings);
  } catch {
  } finally {
    try { unlinkSync(tmpFile); } catch { }
  }
}

function updateDiagnostics(findings: any[]) {
  const diagMap = new Map<string, vscode.Diagnostic[]>();

  for (const f of findings) {
    const uri = vscode.Uri.file(f.file);

    if (!diagMap.has(f.file)) {
      diagMap.set(f.file, []);
    }

    const line = Math.max(0, (f.line || 0) - 1);
    const range = new vscode.Range(line, 0, line, 1000);

    const severity = f.severity === 'critical' || f.severity === 'high'
      ? vscode.DiagnosticSeverity.Error
      : f.severity === 'medium'
        ? vscode.DiagnosticSeverity.Warning
        : vscode.DiagnosticSeverity.Information;

    const diagnostic = new vscode.Diagnostic(
      range,
      `${f.issue}\n→ ${f.suggestion}`,
      severity
    );
    diagnostic.source = 'ReviewPilot';

    diagMap.get(f.file)!.push(diagnostic);
  }

  diagnosticCollection.clear();

  for (const [filePath, diagnostics] of diagMap) {
    diagnosticCollection.set(
      vscode.Uri.file(filePath),
      diagnostics
    );
  }
}

function clearAnnotations() {
  diagnosticCollection.clear();
  vscode.window.showInformationMessage('ReviewPilot annotations cleared.');
}

export function deactivate() {
  diagnosticCollection?.dispose();
}
