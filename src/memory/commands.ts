/**
 * VSCode commands for the intelligent memory system
 */

import * as vscode from 'vscode';
import { IntelligentMemoryManager } from './memoryManager';
import { MemoryType, IMemoryFilters } from './types';

export class MemoryCommands {
  private memoryManager: IntelligentMemoryManager;

  constructor(memoryManager: IntelligentMemoryManager) {
    this.memoryManager = memoryManager;
  }

  /**
   * Register all memory-related commands
   */
  registerCommands(context: vscode.ExtensionContext): void {
    const commands = [
      // Core memory operations
      vscode.commands.registerCommand('codeAssist.addMemory', () => this.addMemory()),
      vscode.commands.registerCommand('codeAssist.addSelectionToMemory', () => this.addSelectionToMemory()),
      vscode.commands.registerCommand('codeAssist.searchMemories', () => this.searchMemories()),
      vscode.commands.registerCommand('codeAssist.openMemoryPanel', () => this.openMemoryPanel()),
      
      // Memory management
      vscode.commands.registerCommand('codeAssist.compressMemories', () => this.compressMemories()),
      vscode.commands.registerCommand('codeAssist.optimizeMemoryStorage', () => this.optimizeStorage()),
      vscode.commands.registerCommand('codeAssist.memoryStats', () => this.showMemoryStats()),
      
      // Import/Export
      vscode.commands.registerCommand('codeAssist.exportMemories', () => this.exportMemories()),
      vscode.commands.registerCommand('codeAssist.importMemories', () => this.importMemories()),
      
      // Backup/Restore
      vscode.commands.registerCommand('codeAssist.createMemoryBackup', () => this.createBackup()),
      vscode.commands.registerCommand('codeAssist.restoreMemoryBackup', () => this.restoreBackup()),
      
      // Memory types
      vscode.commands.registerCommand('codeAssist.addPersonalMemory', () => this.addMemoryOfType(MemoryType.PERSONAL)),
      vscode.commands.registerCommand('codeAssist.addRepositoryMemory', () => this.addMemoryOfType(MemoryType.REPOSITORY)),
      vscode.commands.registerCommand('codeAssist.addGuidelineMemory', () => this.addMemoryOfType(MemoryType.GUIDELINE)),
    ];

    context.subscriptions.push(...commands);
  }

  /**
   * Add a new memory through input dialog
   */
  private async addMemory(): Promise<void> {
    try {
      // Get memory type
      const typeOptions = [
        { label: '📝 Personal', value: MemoryType.PERSONAL, description: 'Personal coding preferences and patterns' },
        { label: '🏢 Repository', value: MemoryType.REPOSITORY, description: 'Project-specific knowledge and conventions' },
        { label: '📋 Guideline', value: MemoryType.GUIDELINE, description: 'Coding guidelines and best practices' },
        { label: '💬 Session', value: MemoryType.SESSION, description: 'Temporary session-specific information' }
      ];

      const selectedType = await vscode.window.showQuickPick(typeOptions, {
        placeHolder: 'Select memory type',
        title: 'Add New Memory'
      });

      if (!selectedType) {
        return;
      }

      // Get content
      const content = await vscode.window.showInputBox({
        prompt: 'Enter memory content',
        placeHolder: 'Describe what you want to remember...',
        validateInput: (value) => {
          if (!value || value.trim().length < 10) {
            return 'Memory content must be at least 10 characters long';
          }
          return null;
        }
      });

      if (!content) {
        return;
      }

      // Get tags
      const tagsInput = await vscode.window.showInputBox({
        prompt: 'Enter tags (comma-separated, optional)',
        placeHolder: 'typescript, testing, architecture'
      });

      const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];

      // Create memory
      const memoryId = await this.memoryManager.createMemory(content, selectedType.value, tags);
      
      vscode.window.showInformationMessage(`✅ Memory created successfully! ID: ${memoryId.substring(0, 8)}...`);

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to add memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add selected text as a memory
   */
  private async addSelectionToMemory(): Promise<void> {
    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.selection.isEmpty) {
        vscode.window.showWarningMessage('Please select some text to add as a memory');
        return;
      }

      const selectedText = editor.document.getText(editor.selection);
      const fileName = editor.document.fileName;
      const language = editor.document.languageId;

      // Get memory type
      const typeOptions = [
        { label: '📝 Personal', value: MemoryType.PERSONAL },
        { label: '🏢 Repository', value: MemoryType.REPOSITORY },
        { label: '📋 Guideline', value: MemoryType.GUIDELINE }
      ];

      const selectedType = await vscode.window.showQuickPick(typeOptions, {
        placeHolder: 'Select memory type for selected code',
        title: 'Add Selection to Memory'
      });

      if (!selectedType) {
        return;
      }

      // Get additional context
      const description = await vscode.window.showInputBox({
        prompt: 'Add description (optional)',
        placeHolder: 'Describe why this code is important...'
      });

      // Create enhanced content
      const content = description 
        ? `${description}\n\n\`\`\`${language}\n${selectedText}\n\`\`\``
        : `\`\`\`${language}\n${selectedText}\n\`\`\``;

      // Auto-generate tags
      const tags = [language];
      if (fileName.includes('test')) {
        tags.push('testing');
      }
      if (selectedText.includes('function') || selectedText.includes('const')) {
        tags.push('function');
      }
      if (selectedText.includes('class')) {
        tags.push('class');
      }

      // Create memory with metadata
      const memoryId = await this.memoryManager.createMemory(
        content, 
        selectedType.value, 
        tags,
        {
          source: fileName,
          language,
          category: 'code-snippet'
        }
      );

      vscode.window.showInformationMessage(`✅ Code snippet saved as memory! ID: ${memoryId.substring(0, 8)}...`);

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to add selection to memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search memories and display results
   */
  private async searchMemories(): Promise<void> {
    try {
      const query = await vscode.window.showInputBox({
        prompt: 'Search memories',
        placeHolder: 'Enter search terms...'
      });

      if (!query) {
        return;
      }

      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Searching memories...",
        cancellable: false
      }, async (progress) => {
        progress.report({ increment: 0, message: "Searching..." });

        const results = await this.memoryManager.searchMemories(query);

        progress.report({ increment: 100, message: "Complete!" });

        if (results.length === 0) {
          vscode.window.showInformationMessage(`No memories found for "${query}"`);
          return;
        }

        // Format results for display
        const formattedResults = results.map((result, index) => {
          const memory = result.memory;
          const snippet = result.snippet || memory.content.substring(0, 100) + '...';
          const score = (result.relevanceScore * 100).toFixed(1);
          
          return `## Result ${index + 1} (Score: ${score}%)

**Type:** ${memory.type}
**Tags:** ${memory.tags.join(', ')}
**Created:** ${memory.timestamp.toLocaleDateString()}
**Size:** ${memory.size} chars

**Content:**
${snippet}

---
`;
        }).join('\n');

        const content = `# Memory Search Results

**Query:** "${query}"
**Found:** ${results.length} memories

${formattedResults}`;

        // Show results in a new document
        const doc = await vscode.workspace.openTextDocument({
          content,
          language: 'markdown'
        });

        await vscode.window.showTextDocument(doc);
      });

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to search memories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Open memory panel (placeholder for webview)
   */
  private async openMemoryPanel(): Promise<void> {
    vscode.window.showInformationMessage('Memory panel will be implemented in the next phase!');
    // TODO: Implement webview panel
  }

  /**
   * Compress memories manually
   */
  private async compressMemories(): Promise<void> {
    try {
      const confirmation = await vscode.window.showWarningMessage(
        'This will compress memories to save space. Continue?',
        'Yes, Compress',
        'Cancel'
      );

      if (confirmation === 'Yes, Compress') {
        await this.memoryManager.compressMemories();
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to compress memories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Optimize memory storage
   */
  private async optimizeStorage(): Promise<void> {
    try {
      const confirmation = await vscode.window.showWarningMessage(
        'This will optimize memory storage (compress, cleanup, backup). Continue?',
        'Yes, Optimize',
        'Cancel'
      );

      if (confirmation === 'Yes, Optimize') {
        await this.memoryManager.optimizeStorage();
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to optimize storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Show memory statistics
   */
  private async showMemoryStats(): Promise<void> {
    try {
      const stats = await this.memoryManager.getStats();
      const sizeInKB = (stats.totalSize / 1024).toFixed(2);
      const compressionRatio = (stats.compressionRatio * 100).toFixed(1);

      const message = `📊 Memory System Statistics

• Total memories: ${stats.totalMemories}
• Total size: ${sizeInKB} KB
• Compressed: ${stats.compressedCount} (${compressionRatio}%)
• Average size: ${Math.round(stats.averageSize)} chars

📝 Personal: ${stats.memoryByType.personal}
🏢 Repository: ${stats.memoryByType.repository}
📋 Guidelines: ${stats.memoryByType.guideline}
💬 Session: ${stats.memoryByType.session}

${stats.oldestMemory ? `📅 Oldest: ${stats.oldestMemory.toLocaleDateString()}` : ''}
${stats.newestMemory ? `📅 Newest: ${stats.newestMemory.toLocaleDateString()}` : ''}`;

      vscode.window.showInformationMessage(message);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to get memory stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export memories
   */
  private async exportMemories(): Promise<void> {
    try {
      const formatOptions = [
        { label: 'JSON', value: 'json', description: 'Machine-readable format' },
        { label: 'Markdown', value: 'markdown', description: 'Human-readable format' },
        { label: 'CSV', value: 'csv', description: 'Spreadsheet format' }
      ];

      const selectedFormat = await vscode.window.showQuickPick(formatOptions, {
        placeHolder: 'Select export format',
        title: 'Export Memories'
      });

      if (!selectedFormat) {
        return;
      }

      const exportData = await this.memoryManager.exportMemories({
        format: selectedFormat.value as 'json' | 'markdown' | 'csv'
      });

      // Save to file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `memories-export-${timestamp}.${selectedFormat.value}`;
      
      const saveUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(fileName),
        filters: {
          [selectedFormat.label]: [selectedFormat.value]
        }
      });

      if (saveUri) {
        await vscode.workspace.fs.writeFile(saveUri, new TextEncoder().encode(exportData));
        vscode.window.showInformationMessage(`✅ Memories exported to ${saveUri.fsPath}`);
      }

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to export memories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Import memories
   */
  private async importMemories(): Promise<void> {
    try {
      const fileUri = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          'JSON': ['json'],
          'All Files': ['*']
        }
      });

      if (!fileUri || fileUri.length === 0) {
        return;
      }

      const data = await vscode.workspace.fs.readFile(fileUri[0]);
      const content = new TextDecoder().decode(data);

      const result = await this.memoryManager.importMemories(content);

      let message = `✅ Import complete!\n• Imported: ${result.imported}\n• Skipped: ${result.skipped}\n• Duplicates: ${result.duplicates}`;
      
      if (result.errors.length > 0) {
        message += `\n• Errors: ${result.errors.length}`;
      }

      vscode.window.showInformationMessage(message);

      if (result.errors.length > 0) {
        const showErrors = await vscode.window.showWarningMessage(
          `${result.errors.length} errors occurred during import. View details?`,
          'View Errors'
        );

        if (showErrors) {
          const errorDoc = await vscode.workspace.openTextDocument({
            content: `# Import Errors\n\n${result.errors.join('\n\n')}`,
            language: 'markdown'
          });
          await vscode.window.showTextDocument(errorDoc);
        }
      }

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to import memories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create backup
   */
  private async createBackup(): Promise<void> {
    try {
      const backup = await this.memoryManager.createBackup();
      vscode.window.showInformationMessage(`✅ Backup created with ${backup.memories.length} memories`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Restore from backup
   */
  private async restoreBackup(): Promise<void> {
    try {
      const fileUri = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          'JSON Backup': ['json']
        }
      });

      if (!fileUri || fileUri.length === 0) {
        return;
      }

      const data = await vscode.workspace.fs.readFile(fileUri[0]);
      const backup = JSON.parse(new TextDecoder().decode(data));

      const confirmation = await vscode.window.showWarningMessage(
        `Restore ${backup.memories.length} memories from backup? This may overwrite existing memories.`,
        'Yes, Restore',
        'Cancel'
      );

      if (confirmation === 'Yes, Restore') {
        const result = await this.memoryManager.restoreFromBackup(backup);
        vscode.window.showInformationMessage(`✅ Restored ${result.imported} memories (${result.skipped} skipped)`);
      }

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to restore backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add memory of specific type
   */
  private async addMemoryOfType(type: MemoryType): Promise<void> {
    try {
      const content = await vscode.window.showInputBox({
        prompt: `Enter ${type} memory content`,
        placeHolder: `Describe your ${type} knowledge...`,
        validateInput: (value) => {
          if (!value || value.trim().length < 10) {
            return 'Memory content must be at least 10 characters long';
          }
          return null;
        }
      });

      if (!content) {
        return;
      }

      const tagsInput = await vscode.window.showInputBox({
        prompt: 'Enter tags (comma-separated, optional)',
        placeHolder: 'typescript, testing, architecture'
      });

      const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];

      const memoryId = await this.memoryManager.createMemory(content, type, tags);
      
      vscode.window.showInformationMessage(`✅ ${type} memory created! ID: ${memoryId.substring(0, 8)}...`);

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to add ${type} memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
