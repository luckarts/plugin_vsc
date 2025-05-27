"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreviewManager = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
/**
 * Manages code modification previews before application
 * Shows diff view with line numbers and syntax highlighting
 */
class PreviewManager {
    constructor(context) {
        this.previewPanels = new Map();
        this.context = context;
    }
    /**
     * Show preview of code modification
     * @param action The action to preview
     * @param originalContent Current file content
     * @param modifiedContent Content after modification
     * @returns Promise resolving to user's choice
     */
    async showModificationPreview(action, originalContent, modifiedContent) {
        const previewId = `preview_${Date.now()}`;
        // Create webview panel for preview
        const panel = vscode.window.createWebviewPanel('codePreview', `Preview: ${action.description}`, vscode.ViewColumn.Beside, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'media')
            ]
        });
        this.previewPanels.set(previewId, panel);
        // Generate diff view
        const diffData = this.generateDiffData(originalContent, modifiedContent);
        // Set webview content
        panel.webview.html = this.getPreviewHTML(action, diffData);
        // Handle user interaction
        return new Promise((resolve) => {
            panel.webview.onDidReceiveMessage((message) => {
                switch (message.type) {
                    case 'apply':
                        resolve('apply');
                        panel.dispose();
                        break;
                    case 'cancel':
                        resolve('cancel');
                        panel.dispose();
                        break;
                    case 'edit':
                        resolve('edit');
                        panel.dispose();
                        break;
                }
            });
            panel.onDidDispose(() => {
                this.previewPanels.delete(previewId);
                resolve('cancel');
            });
        });
    }
    /**
     * Show preview for file creation
     * @param action The creation action
     * @param content Content to be created
     * @returns Promise resolving to user's choice
     */
    async showCreationPreview(action, content) {
        const previewId = `create_preview_${Date.now()}`;
        const panel = vscode.window.createWebviewPanel('fileCreationPreview', `Create: ${path.basename(action.targetFile || 'newFile')}`, vscode.ViewColumn.Beside, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'media')
            ]
        });
        this.previewPanels.set(previewId, panel);
        // Generate creation preview
        const previewData = this.generateCreationPreview(action, content);
        panel.webview.html = this.getCreationPreviewHTML(action, previewData);
        return new Promise((resolve) => {
            panel.webview.onDidReceiveMessage((message) => {
                switch (message.type) {
                    case 'create':
                        resolve('create');
                        panel.dispose();
                        break;
                    case 'cancel':
                        resolve('cancel');
                        panel.dispose();
                        break;
                    case 'edit':
                        resolve('edit');
                        panel.dispose();
                        break;
                }
            });
            panel.onDidDispose(() => {
                this.previewPanels.delete(previewId);
                resolve('cancel');
            });
        });
    }
    /**
     * Generate diff data for modification preview
     */
    generateDiffData(original, modified) {
        const originalLines = original.split('\n');
        const modifiedLines = modified.split('\n');
        const changes = [];
        let originalIndex = 0;
        let modifiedIndex = 0;
        // Simple diff algorithm (can be enhanced with proper diff library)
        while (originalIndex < originalLines.length || modifiedIndex < modifiedLines.length) {
            const originalLine = originalLines[originalIndex];
            const modifiedLine = modifiedLines[modifiedIndex];
            if (originalIndex >= originalLines.length) {
                // Addition
                changes.push({
                    type: 'addition',
                    lineNumber: modifiedIndex + 1,
                    content: modifiedLine,
                    originalLineNumber: null
                });
                modifiedIndex++;
            }
            else if (modifiedIndex >= modifiedLines.length) {
                // Deletion
                changes.push({
                    type: 'deletion',
                    lineNumber: originalIndex + 1,
                    content: originalLine,
                    originalLineNumber: originalIndex + 1
                });
                originalIndex++;
            }
            else if (originalLine === modifiedLine) {
                // No change
                changes.push({
                    type: 'unchanged',
                    lineNumber: modifiedIndex + 1,
                    content: modifiedLine,
                    originalLineNumber: originalIndex + 1
                });
                originalIndex++;
                modifiedIndex++;
            }
            else {
                // Modification
                changes.push({
                    type: 'deletion',
                    lineNumber: originalIndex + 1,
                    content: originalLine,
                    originalLineNumber: originalIndex + 1
                });
                changes.push({
                    type: 'addition',
                    lineNumber: modifiedIndex + 1,
                    content: modifiedLine,
                    originalLineNumber: null
                });
                originalIndex++;
                modifiedIndex++;
            }
        }
        return {
            changes,
            stats: this.calculateDiffStats(changes)
        };
    }
    /**
     * Generate creation preview data
     */
    generateCreationPreview(action, content) {
        const lines = content.split('\n');
        return {
            fileName: path.basename(action.targetFile || 'newFile'),
            filePath: action.targetFile || '',
            language: action.language,
            lines: lines.map((line, index) => ({
                number: index + 1,
                content: line
            })),
            stats: {
                totalLines: lines.length,
                estimatedSize: content.length,
                language: action.language
            }
        };
    }
    /**
     * Calculate diff statistics
     */
    calculateDiffStats(changes) {
        const additions = changes.filter(c => c.type === 'addition').length;
        const deletions = changes.filter(c => c.type === 'deletion').length;
        const modifications = Math.min(additions, deletions);
        return {
            additions: additions - modifications,
            deletions: deletions - modifications,
            modifications,
            totalChanges: additions + deletions
        };
    }
    /**
     * Generate HTML for modification preview
     */
    getPreviewHTML(action, diffData) {
        const nonce = this.generateNonce();
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>Code Modification Preview</title>
    <style>
        ${this.getPreviewCSS()}
    </style>
</head>
<body>
    <div class="preview-container">
        <header class="preview-header">
            <div class="header-info">
                <h2>📝 Code Modification Preview</h2>
                <p class="action-description">${action.description}</p>
                <div class="file-info">
                    <span class="file-path">📄 ${action.targetFile || 'Current file'}</span>
                    <span class="language-badge">${action.language}</span>
                </div>
            </div>
            <div class="diff-stats">
                <span class="stat additions">+${diffData.stats.additions}</span>
                <span class="stat deletions">-${diffData.stats.deletions}</span>
                <span class="stat modifications">~${diffData.stats.modifications}</span>
            </div>
        </header>

        <main class="diff-viewer">
            <div class="diff-content">
                ${this.renderDiffLines(diffData.changes)}
            </div>
        </main>

        <footer class="preview-actions">
            <div class="action-buttons">
                <button class="btn btn-primary" onclick="applyChanges()">
                    ✅ Apply Changes
                </button>
                <button class="btn btn-secondary" onclick="editChanges()">
                    ✏️ Edit First
                </button>
                <button class="btn btn-cancel" onclick="cancelChanges()">
                    ❌ Cancel
                </button>
            </div>
            <div class="risk-info">
                <span class="risk-level risk-${action.metadata.riskLevel}">
                    ${this.getRiskText(action.metadata.riskLevel)}
                </span>
                <span class="confidence">
                    Confidence: ${Math.round(action.metadata.confidence * 100)}%
                </span>
            </div>
        </footer>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        
        function applyChanges() {
            vscode.postMessage({ type: 'apply' });
        }
        
        function editChanges() {
            vscode.postMessage({ type: 'edit' });
        }
        
        function cancelChanges() {
            vscode.postMessage({ type: 'cancel' });
        }
    </script>
</body>
</html>`;
    }
    /**
     * Generate HTML for creation preview
     */
    getCreationPreviewHTML(action, previewData) {
        const nonce = this.generateNonce();
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>File Creation Preview</title>
    <style>
        ${this.getPreviewCSS()}
    </style>
</head>
<body>
    <div class="preview-container">
        <header class="preview-header">
            <div class="header-info">
                <h2>📄 File Creation Preview</h2>
                <p class="action-description">${action.description}</p>
                <div class="file-info">
                    <span class="file-path">📁 ${previewData.filePath}</span>
                    <span class="language-badge">${previewData.language}</span>
                </div>
            </div>
            <div class="creation-stats">
                <span class="stat">Lines: ${previewData.stats.totalLines}</span>
                <span class="stat">Size: ${this.formatFileSize(previewData.stats.estimatedSize)}</span>
            </div>
        </header>

        <main class="code-viewer">
            <div class="code-content">
                ${this.renderCodeLines(previewData.lines, previewData.language)}
            </div>
        </main>

        <footer class="preview-actions">
            <div class="action-buttons">
                <button class="btn btn-primary" onclick="createFile()">
                    📄 Create File
                </button>
                <button class="btn btn-secondary" onclick="editFirst()">
                    ✏️ Edit First
                </button>
                <button class="btn btn-cancel" onclick="cancel()">
                    ❌ Cancel
                </button>
            </div>
            <div class="risk-info">
                <span class="risk-level risk-${action.metadata.riskLevel}">
                    ${this.getRiskText(action.metadata.riskLevel)}
                </span>
                <span class="confidence">
                    Confidence: ${Math.round(action.metadata.confidence * 100)}%
                </span>
            </div>
        </footer>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        
        function createFile() {
            vscode.postMessage({ type: 'create' });
        }
        
        function editFirst() {
            vscode.postMessage({ type: 'edit' });
        }
        
        function cancel() {
            vscode.postMessage({ type: 'cancel' });
        }
    </script>
</body>
</html>`;
    }
    /**
     * Render diff lines with syntax highlighting
     */
    renderDiffLines(changes) {
        return changes.map(change => {
            const lineClass = `diff-line diff-${change.type}`;
            const lineNumber = change.type === 'deletion' ? change.originalLineNumber : change.lineNumber;
            const prefix = change.type === 'addition' ? '+' : change.type === 'deletion' ? '-' : ' ';
            return `
        <div class="${lineClass}">
          <span class="line-number">${lineNumber || ''}</span>
          <span class="line-prefix">${prefix}</span>
          <span class="line-content">${this.escapeHtml(change.content)}</span>
        </div>
      `;
        }).join('');
    }
    /**
     * Render code lines with line numbers
     */
    renderCodeLines(lines, language) {
        return lines.map(line => `
      <div class="code-line">
        <span class="line-number">${line.number}</span>
        <span class="line-content">${this.escapeHtml(line.content)}</span>
      </div>
    `).join('');
    }
    /**
     * Get CSS for preview
     */
    getPreviewCSS() {
        return `
      /* Preview styles with VSCode theme integration */
      :root {
        --bg-primary: var(--vscode-editor-background);
        --bg-secondary: var(--vscode-sideBar-background);
        --text-primary: var(--vscode-editor-foreground);
        --text-secondary: var(--vscode-descriptionForeground);
        --border-color: var(--vscode-panel-border);
        --accent-color: var(--vscode-focusBorder);
        --success-color: var(--vscode-terminal-ansiGreen);
        --warning-color: var(--vscode-terminal-ansiYellow);
        --error-color: var(--vscode-terminal-ansiRed);
      }

      body {
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
        color: var(--text-primary);
        background: var(--bg-primary);
        margin: 0;
        padding: 0;
        overflow-x: hidden;
      }

      .preview-container {
        display: flex;
        flex-direction: column;
        height: 100vh;
      }

      .preview-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        background: var(--bg-secondary);
        border-bottom: 1px solid var(--border-color);
        flex-shrink: 0;
      }

      .header-info h2 {
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: 600;
      }

      .action-description {
        margin: 0 0 8px 0;
        color: var(--text-secondary);
        font-size: 14px;
      }

      .file-info {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .file-path {
        font-family: var(--vscode-editor-font-family);
        font-size: 13px;
        color: var(--text-secondary);
      }

      .language-badge {
        background: var(--accent-color);
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 500;
      }

      .diff-stats, .creation-stats {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      .stat {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
        font-family: var(--vscode-editor-font-family);
      }

      .stat.additions {
        background: rgba(40, 167, 69, 0.2);
        color: var(--success-color);
      }

      .stat.deletions {
        background: rgba(220, 53, 69, 0.2);
        color: var(--error-color);
      }

      .stat.modifications {
        background: rgba(255, 193, 7, 0.2);
        color: var(--warning-color);
      }

      .diff-viewer, .code-viewer {
        flex: 1;
        overflow-y: auto;
        background: var(--bg-primary);
      }

      .diff-content, .code-content {
        font-family: var(--vscode-editor-font-family);
        font-size: var(--vscode-editor-font-size);
        line-height: 1.5;
      }

      .diff-line, .code-line {
        display: flex;
        align-items: center;
        min-height: 20px;
        padding: 0 8px;
        border-left: 3px solid transparent;
      }

      .diff-line.diff-addition {
        background: rgba(40, 167, 69, 0.1);
        border-left-color: var(--success-color);
      }

      .diff-line.diff-deletion {
        background: rgba(220, 53, 69, 0.1);
        border-left-color: var(--error-color);
      }

      .diff-line.diff-unchanged {
        background: transparent;
      }

      .line-number {
        width: 60px;
        text-align: right;
        color: var(--text-secondary);
        font-size: 12px;
        margin-right: 12px;
        user-select: none;
      }

      .line-prefix {
        width: 20px;
        text-align: center;
        font-weight: bold;
        margin-right: 8px;
      }

      .line-content {
        flex: 1;
        white-space: pre;
        overflow-x: auto;
      }

      .preview-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        background: var(--bg-secondary);
        border-top: 1px solid var(--border-color);
        flex-shrink: 0;
      }

      .action-buttons {
        display: flex;
        gap: 12px;
      }

      .btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .btn-primary {
        background: var(--accent-color);
        color: white;
      }

      .btn-secondary {
        background: var(--bg-primary);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
      }

      .btn-cancel {
        background: transparent;
        color: var(--text-secondary);
        border: 1px solid var(--border-color);
      }

      .btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }

      .risk-info {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 12px;
      }

      .risk-level {
        padding: 4px 8px;
        border-radius: 4px;
        font-weight: 600;
      }

      .risk-level.risk-low {
        background: rgba(40, 167, 69, 0.2);
        color: var(--success-color);
      }

      .risk-level.risk-medium {
        background: rgba(255, 193, 7, 0.2);
        color: var(--warning-color);
      }

      .risk-level.risk-high {
        background: rgba(255, 126, 20, 0.2);
        color: #fd7e14;
      }

      .risk-level.risk-critical {
        background: rgba(220, 53, 69, 0.2);
        color: var(--error-color);
      }

      .confidence {
        color: var(--text-secondary);
      }
    `;
    }
    getRiskText(riskLevel) {
        switch (riskLevel) {
            case 'low': return '🟢 Low Risk';
            case 'medium': return '🟡 Medium Risk';
            case 'high': return '🟠 High Risk';
            case 'critical': return '🔴 Critical Risk';
            default: return '⚪ Unknown Risk';
        }
    }
    formatFileSize(bytes) {
        if (bytes < 1024)
            return `${bytes} B`;
        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    generateNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
    /**
     * Dispose all preview panels
     */
    dispose() {
        this.previewPanels.forEach(panel => panel.dispose());
        this.previewPanels.clear();
    }
}
exports.PreviewManager = PreviewManager;
//# sourceMappingURL=previewManager.js.map