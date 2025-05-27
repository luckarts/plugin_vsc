import * as vscode from 'vscode';
import * as path from 'path';
import { VectorDatabase } from './vectorDb';
import { ClaudeClient } from './claudeClient';
import { ChatWebview } from './webview/chatWebview';
import { SmartContextManager } from './context/smartContextManager';
import { IntelligentMemoryManager } from './memory/memoryManager';
import { MemoryCommands } from './memory/commands';
import { registerDemoCommand } from './memory/demo';

export function activate(context: vscode.ExtensionContext) {
  // Initialize vector database
  const vectorDb = new VectorDatabase(context.globalStorageUri);
  // Initialize Claude client
  const claudeClient = new ClaudeClient(context);

  // Initialize intelligent memory system
  const memoryManager = new IntelligentMemoryManager(context.globalStorageUri);
  const memoryCommands = new MemoryCommands(memoryManager);

  // Initialize Claude client authentication
  claudeClient.initialize().catch(error => {
    console.error('Failed to initialize Claude client:', error);
  });

  // Initialize vector database
  vectorDb.initializeWithProgress().catch(error => {
    console.error('Failed to initialize vector database:', error);
  });

  // Initialize memory system
  memoryManager.initialize().catch(error => {
    console.error('Failed to initialize memory system:', error);
  });

  // Initialize smart context manager
  const smartContextManager = new SmartContextManager(vectorDb.getContextualRetriever());

  // Register memory commands
  memoryCommands.registerCommands(context);

  // Register demo command
  registerDemoCommand(context);

  // Register other commands
  context.subscriptions.push(
    vscode.commands.registerCommand('codeAssist.start', () => startAgent(claudeClient, vectorDb)),
    vscode.commands.registerCommand('codeAssist.indexCode', () => indexWorkspace(vectorDb)),
    vscode.commands.registerCommand('codeAssist.configureApiKey', () => configureApiKey(claudeClient)),
    vscode.commands.registerCommand('codeAssist.validateApiKey', () => validateApiKey(claudeClient)),
    vscode.commands.registerCommand('codeAssist.revokeApiKey', () => revokeApiKey(claudeClient)),
    vscode.commands.registerCommand('codeAssist.clearIndex', () => clearIndex(vectorDb)),
    vscode.commands.registerCommand('codeAssist.indexStats', () => showIndexStats(vectorDb)),
    vscode.commands.registerCommand('codeAssist.indexCurrentFile', () => indexCurrentFile(vectorDb)),
    vscode.commands.registerCommand('codeAssist.previewContext', () => previewContext(smartContextManager)),
    vscode.commands.registerCommand('codeAssist.explainContext', () => explainContext(smartContextManager)),
    vscode.commands.registerCommand('codeAssist.contextStats', () => showContextStats(smartContextManager))
  );

  // Create and show chat webview
  function startAgent(claudeClient: ClaudeClient, vectorDb: VectorDatabase) {
    try {
      const chatWebview = new ChatWebview(context, claudeClient, vectorDb);
      chatWebview.show();
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to start Code Assistant AI: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}



// Authentication command handlers
async function configureApiKey(claudeClient: ClaudeClient): Promise<void> {
  try {
    const authManager = claudeClient.getAuthManager();
    const success = await authManager.configureApiKey();
    if (success) {
      vscode.window.showInformationMessage('API key configured successfully!');
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to configure API key: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function validateApiKey(claudeClient: ClaudeClient): Promise<void> {
  try {
    const authManager = claudeClient.getAuthManager();
    vscode.window.showInformationMessage('Validating API key...');

    const result = await authManager.validateCurrentApiKey();

    if (result.isValid) {
      vscode.window.showInformationMessage('✅ API key is valid and working!');
    } else {
      vscode.window.showErrorMessage(`❌ API key validation failed: ${result.error}`);
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to validate API key: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function revokeApiKey(claudeClient: ClaudeClient): Promise<void> {
  try {
    const authManager = claudeClient.getAuthManager();
    await authManager.revokeApiKey();
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to revoke API key: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function indexWorkspace(vectorDb: VectorDatabase): Promise<void> {
  try {
    await vectorDb.indexWorkspaceWithProgress();
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to index workspace: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function clearIndex(vectorDb: VectorDatabase): Promise<void> {
  try {
    const confirmation = await vscode.window.showWarningMessage(
      'Are you sure you want to clear the entire vector index? This action cannot be undone.',
      'Yes, Clear Index',
      'Cancel'
    );

    if (confirmation === 'Yes, Clear Index') {
      await vectorDb.clear();
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to clear index: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function showIndexStats(vectorDb: VectorDatabase): Promise<void> {
  try {
    const stats = await vectorDb.getStats();
    const sizeInMB = (stats.indexSize / (1024 * 1024)).toFixed(2);
    const lastUpdated = new Date(stats.lastUpdated).toLocaleString();

    const message = `📊 Vector Index Statistics:

• Total chunks: ${stats.totalChunks}
• Total files: ${stats.totalFiles}
• Index size: ${sizeInMB} MB
• Last updated: ${lastUpdated}
• Languages: ${Object.keys(stats.languages).join(', ') || 'None'}`;

    vscode.window.showInformationMessage(message);
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to get index stats: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function indexCurrentFile(vectorDb: VectorDatabase): Promise<void> {
  try {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showWarningMessage('No active file to index');
      return;
    }

    const filePath = activeEditor.document.fileName;
    vscode.window.showInformationMessage(`Indexing ${path.basename(filePath)}...`);

    await vectorDb.indexFile(filePath);

    vscode.window.showInformationMessage(`✅ Successfully indexed ${path.basename(filePath)}`);
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to index current file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Context management command handlers
async function previewContext(smartContextManager: SmartContextManager): Promise<void> {
  try {
    const query = await vscode.window.showInputBox({
      prompt: 'Enter a query to preview context for',
      placeHolder: 'e.g., "authentication functions"'
    });

    if (!query) {
      return;
    }

    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "Generating context preview...",
      cancellable: false
    }, async (progress) => {
      progress.report({ increment: 0, message: "Analyzing workspace..." });

      const preview = await smartContextManager.previewContext(query);

      progress.report({ increment: 50, message: "Formatting preview..." });

      const { ContextPreview } = await import('./context/contextPreview');
      const contextPreview = new ContextPreview();
      const formattedPreview = contextPreview.formatForDisplay(preview);

      progress.report({ increment: 100, message: "Complete!" });

      // Show preview in a new document
      const doc = await vscode.workspace.openTextDocument({
        content: formattedPreview,
        language: 'markdown'
      });

      await vscode.window.showTextDocument(doc);
    });

  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to preview context: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function explainContext(smartContextManager: SmartContextManager): Promise<void> {
  try {
    const query = await vscode.window.showInputBox({
      prompt: 'Enter a query to explain context building for',
      placeHolder: 'e.g., "React component patterns"'
    });

    if (!query) {
      return;
    }

    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "Building and explaining context...",
      cancellable: false
    }, async (progress) => {
      progress.report({ increment: 0, message: "Building context..." });

      const context = await smartContextManager.buildContext(query);

      progress.report({ increment: 50, message: "Generating explanation..." });

      const explanation = smartContextManager.explainContext(context);

      progress.report({ increment: 100, message: "Complete!" });

      // Show explanation in a new document
      const doc = await vscode.workspace.openTextDocument({
        content: explanation.join('\n'),
        language: 'markdown'
      });

      await vscode.window.showTextDocument(doc);
    });

  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to explain context: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function showContextStats(smartContextManager: SmartContextManager): Promise<void> {
  try {
    const query = await vscode.window.showInputBox({
      prompt: 'Enter a query to analyze context statistics for',
      placeHolder: 'e.g., "database operations"'
    });

    if (!query) {
      return;
    }

    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "Analyzing context statistics...",
      cancellable: false
    }, async (progress) => {
      progress.report({ increment: 0, message: "Building context..." });

      const context = await smartContextManager.buildContext(query);

      progress.report({ increment: 50, message: "Calculating statistics..." });

      const stats = smartContextManager.getContextStatistics(context);

      progress.report({ increment: 100, message: "Complete!" });

      // Format statistics for display
      const statsText = [
        `📊 Context Statistics for: "${query}"`,
        '═'.repeat(50),
        '',
        `🎯 Token Usage: ${stats.tokenUsage.toLocaleString()}`,
        `📁 File Count: ${stats.fileCount}`,
        `📈 Average Relevance: ${(stats.averageRelevance * 100).toFixed(1)}%`,
        `🗜️ Compression Ratio: ${(stats.compressionRatio * 100).toFixed(1)}%`,
        '',
        '🌐 Language Distribution:',
        ...Object.entries(stats.languageDistribution).map(([lang, count]) =>
          `   ${lang}: ${count} files`
        ),
        '',
        '💡 Recommendations:',
        stats.tokenUsage > 8000 ? '   • Consider reducing context size for better performance' : '   • Context size is optimal',
        stats.averageRelevance < 0.5 ? '   • Consider increasing relevance threshold' : '   • Relevance levels are good',
        stats.fileCount > 15 ? '   • Consider filtering by language or file type' : '   • File count is manageable'
      ].join('\n');

      // Show statistics in a new document
      const doc = await vscode.workspace.openTextDocument({
        content: statsText,
        language: 'markdown'
      });

      await vscode.window.showTextDocument(doc);
    });

  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to show context statistics: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export function deactivate() {}
