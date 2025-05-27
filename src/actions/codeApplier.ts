import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
  ICodeApplier,
  ICodeAction,
  IActionResult,
  IRange,
  ActionException
} from './types';

/**
 * Applies code modifications to existing files
 * Handles merging, backup creation, and intelligent code placement
 */
export class CodeApplier implements ICodeApplier {
  private readonly backupDirectory: string;

  constructor() {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    this.backupDirectory = path.join(workspaceRoot, '.vscode', 'code-assist-backups');
  }

  /**
   * Apply modification to existing file
   * @param action The modification action
   * @returns Result of the modification
   */
  async applyModification(action: ICodeAction): Promise<IActionResult> {
    try {
      if (!action.targetFile) {
        throw new Error('Target file not specified for modification');
      }

      // Create backup if required
      let backupPath: string | undefined;
      if (action.metadata.backupRequired) {
        backupPath = await this.createBackup(action.targetFile);
      }

      // Read existing file content
      let existingContent = '';
      let fileExists = false;

      try {
        const document = await vscode.workspace.openTextDocument(action.targetFile);
        existingContent = document.getText();
        fileExists = true;
      } catch {
        // File doesn't exist, will create new
        fileExists = false;
      }

      // Determine target range if not specified
      let targetRange = action.targetRange;
      if (!targetRange && fileExists) {
        targetRange = await this.findTargetLocation(action.content, action.targetFile) || undefined;
      }

      // Merge the code
      const newContent = this.mergeCode(existingContent, action.content, targetRange);

      // Write the modified content
      const uri = vscode.Uri.file(action.targetFile);
      const encoder = new TextEncoder();
      await vscode.workspace.fs.writeFile(uri, encoder.encode(newContent));

      // Open the modified file and show changes
      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document);

      // Highlight the changes if possible
      if (targetRange) {
        this.highlightChanges(document, targetRange);
      }

      return {
        success: true,
        message: fileExists ? 'Code applied successfully' : 'New file created with code',
        filesModified: fileExists ? [action.targetFile] : [],
        filesCreated: fileExists ? [] : [action.targetFile],
        errors: [],
        warnings: [],
        backupPaths: backupPath ? [backupPath] : undefined
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to apply modification: ${error instanceof Error ? error.message : 'Unknown error'}`,
        filesModified: [],
        filesCreated: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: []
      };
    }
  }

  /**
   * Find the best location to insert new code
   * @param content The code to insert
   * @param targetFile The target file path
   * @returns Range where code should be inserted, or null for append
   */
  async findTargetLocation(content: string, targetFile: string): Promise<IRange | null> {
    try {
      const document = await vscode.workspace.openTextDocument(targetFile);
      const existingContent = document.getText();
      const lines = existingContent.split('\n');

      // Analyze the content to determine best insertion point
      const insertionPoint = this.analyzeInsertionPoint(content, existingContent, document.languageId);

      if (insertionPoint !== null) {
        return {
          startLine: insertionPoint,
          startCharacter: 0,
          endLine: insertionPoint,
          endCharacter: 0
        };
      }

      return null; // Append to end

    } catch (error) {
      console.error('Failed to find target location:', error);
      return null;
    }
  }

  /**
   * Merge new code with existing content
   * @param existingContent Current file content
   * @param newContent New code to add
   * @param range Optional range for insertion
   * @returns Merged content
   */
  mergeCode(existingContent: string, newContent: string, range?: IRange): string {
    if (!existingContent) {
      return newContent;
    }

    if (!range) {
      // Append to end with proper spacing
      const separator = existingContent.endsWith('\n') ? '\n' : '\n\n';
      return existingContent + separator + newContent;
    }

    // Insert at specific range
    const lines = existingContent.split('\n');
    const beforeLines = lines.slice(0, range.startLine);
    const afterLines = lines.slice(range.endLine);
    const newLines = newContent.split('\n');

    // Add proper indentation if inserting within a block
    const indentedNewLines = this.adjustIndentation(newLines, beforeLines, range.startLine);

    return [...beforeLines, ...indentedNewLines, ...afterLines].join('\n');
  }

  /**
   * Create backup of file before modification
   * @param filePath Path to file to backup
   * @returns Path to backup file
   */
  async createBackup(filePath: string): Promise<string> {
    try {
      // Ensure backup directory exists
      await this.ensureBackupDirectoryExists();

      // Generate backup filename with timestamp
      const fileName = path.basename(filePath);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `${fileName}.${timestamp}.backup`;
      const backupPath = path.join(this.backupDirectory, backupFileName);

      // Copy file to backup location
      const sourceUri = vscode.Uri.file(filePath);
      const backupUri = vscode.Uri.file(backupPath);

      await vscode.workspace.fs.copy(sourceUri, backupUri);

      return backupPath;

    } catch (error) {
      throw new ActionException('createBackup', `Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
    }
  }

  /**
   * Analyze where to insert new code
   */
  private analyzeInsertionPoint(newContent: string, existingContent: string, languageId: string): number | null {
    const existingLines = existingContent.split('\n');

    // Determine content type
    const contentType = this.analyzeContentType(newContent);

    switch (contentType) {
      case 'import':
        return this.findImportInsertionPoint(existingLines);

      case 'function':
        return this.findFunctionInsertionPoint(existingLines, languageId);

      case 'class':
        return this.findClassInsertionPoint(existingLines, languageId);

      case 'interface':
      case 'type':
        return this.findTypeInsertionPoint(existingLines, languageId);

      case 'export':
        return this.findExportInsertionPoint(existingLines);

      default:
        return this.findGeneralInsertionPoint(existingLines, languageId);
    }
  }

  /**
   * Analyze the type of content being inserted
   */
  private analyzeContentType(content: string): string {
    const trimmed = content.trim();

    if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
      return 'import';
    }

    if (trimmed.includes('function ') || trimmed.includes('=>')) {
      return 'function';
    }

    if (trimmed.includes('class ')) {
      return 'class';
    }

    if (trimmed.includes('interface ')) {
      return 'interface';
    }

    if (trimmed.includes('type ')) {
      return 'type';
    }

    if (trimmed.startsWith('export ')) {
      return 'export';
    }

    return 'general';
  }

  /**
   * Find insertion point for imports
   */
  private findImportInsertionPoint(lines: string[]): number {
    let lastImportLine = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('import ') || line.startsWith('from ')) {
        lastImportLine = i;
      } else if (line && !line.startsWith('//') && !line.startsWith('/*')) {
        // Found first non-import, non-comment line
        break;
      }
    }

    return lastImportLine + 1;
  }

  /**
   * Find insertion point for functions
   */
  private findFunctionInsertionPoint(lines: string[], languageId: string): number {
    // Look for end of imports and beginning of main code
    let insertionPoint = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip imports and comments
      if (line.startsWith('import ') || line.startsWith('//') || line.startsWith('/*') || !line) {
        insertionPoint = i + 1;
        continue;
      }

      // Found start of main code
      break;
    }

    return insertionPoint;
  }

  /**
   * Find insertion point for classes
   */
  private findClassInsertionPoint(lines: string[], languageId: string): number {
    // Classes usually go after imports but before functions
    return this.findFunctionInsertionPoint(lines, languageId);
  }

  /**
   * Find insertion point for types/interfaces
   */
  private findTypeInsertionPoint(lines: string[], languageId: string): number {
    // Types and interfaces usually go after imports
    return this.findImportInsertionPoint(lines);
  }

  /**
   * Find insertion point for exports
   */
  private findExportInsertionPoint(lines: string[]): number {
    // Exports usually go at the end
    return lines.length;
  }

  /**
   * Find general insertion point
   */
  private findGeneralInsertionPoint(lines: string[], languageId: string): number {
    // Default to end of file
    return lines.length;
  }

  /**
   * Adjust indentation of new lines based on context
   */
  private adjustIndentation(newLines: string[], beforeLines: string[], insertionLine: number): string[] {
    if (beforeLines.length === 0) {
      return newLines;
    }

    // Detect indentation of surrounding code
    const contextIndentation = this.detectIndentation(beforeLines, insertionLine);

    // Apply indentation to new lines
    return newLines.map((line, index) => {
      if (index === 0 || !line.trim()) {
        return line; // Don't indent first line or empty lines
      }

      return contextIndentation + line;
    });
  }

  /**
   * Detect indentation pattern from context
   */
  private detectIndentation(lines: string[], insertionLine: number): string {
    // Look at lines around insertion point to detect indentation
    const contextLines = lines.slice(Math.max(0, insertionLine - 3), insertionLine);

    for (const line of contextLines.reverse()) {
      if (line.trim()) {
        const match = line.match(/^(\s*)/);
        return match ? match[1] : '';
      }
    }

    return '';
  }

  /**
   * Highlight changes in the editor
   */
  private highlightChanges(document: vscode.TextDocument, range: IRange): void {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document === document) {
      const highlightRange = new vscode.Range(
        range.startLine,
        range.startCharacter,
        range.endLine,
        range.endCharacter
      );

      editor.selection = new vscode.Selection(highlightRange.start, highlightRange.end);
      editor.revealRange(highlightRange, vscode.TextEditorRevealType.InCenter);
    }
  }

  /**
   * Ensure backup directory exists
   */
  private async ensureBackupDirectoryExists(): Promise<void> {
    try {
      const uri = vscode.Uri.file(this.backupDirectory);

      try {
        await vscode.workspace.fs.stat(uri);
      } catch {
        // Directory doesn't exist, create it
        await vscode.workspace.fs.createDirectory(uri);
      }
    } catch (error) {
      throw new ActionException('ensureBackupDirectoryExists', 'Failed to create backup directory', error);
    }
  }
}
