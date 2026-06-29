import * as vscode from 'vscode';
import { execSync } from 'child_process';
import { existsSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {
  diagnosticCollection = vscode.languages.createDiagnosticCollection('reviewpilot');
  context.subscriptions.push(diagnosticCollection);

  context.subscriptions.push(
    vscode.commands.registerCommand('reviewpilot.reviewFile', reviewFile),
    vscode.commands.registerCommand('reviewpilot.reviewWorkspace', reviewWorkspace),
    vscode.commands.registerCommand('reviewpilot.clearAnnotations', clearAnnotations)
  );

  if (vscode.workspace.getConfiguration('reviewpilot').get('autoReviewOnSave')) {
    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument((doc) => {
        if (doc.uri.scheme === 'file') {
          reviewDocument(doc.uri);
        }
      })
    );
  }

  vscode.window.showInformationMessage('ReviewPilot is ready');
}

function getConfig() {
  const config = vscode.workspace.getConfiguration('reviewpilot');
  return {
    model: config.get<string>('model', 'codellama'),
    host: config.get<string>('ollamaHost', 'http://127.0.0.1:11434'),
  };
}

async function reviewFile() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No file open to review.');
    return;
  }

  await reviewDocument(editor.document.uri);
}

async function reviewWorkspace() {
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
      `npx reviewpilot@latest diff "${tmpFile}" --format json`,
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
    try { unlinkSync(tmpFile); } catch { /* ignore */ }
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

  const tmpFile = join(require('os').tmpdir(), 'reviewpilot-diff.tmp');
  writeFileSync(tmpFile, diffText, 'utf-8');

  try {
    const result = execSync(
      `npx reviewpilot@latest diff "${tmpFile}" --format json`,
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
    // ignore review errors silently for auto-review
  } finally {
    try { unlinkSync(tmpFile); } catch { /* ignore */ }
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
