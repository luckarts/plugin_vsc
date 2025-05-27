import * as vscode from 'vscode';
import { ICodeAction } from './types';
/**
 * Manages code modification previews before application
 * Shows diff view with line numbers and syntax highlighting
 */
export declare class PreviewManager {
    private readonly context;
    private previewPanels;
    constructor(context: vscode.ExtensionContext);
    /**
     * Show preview of code modification
     * @param action The action to preview
     * @param originalContent Current file content
     * @param modifiedContent Content after modification
     * @returns Promise resolving to user's choice
     */
    showModificationPreview(action: ICodeAction, originalContent: string, modifiedContent: string): Promise<'apply' | 'cancel' | 'edit'>;
    /**
     * Show preview for file creation
     * @param action The creation action
     * @param content Content to be created
     * @returns Promise resolving to user's choice
     */
    showCreationPreview(action: ICodeAction, content: string): Promise<'create' | 'cancel' | 'edit'>;
    /**
     * Generate diff data for modification preview
     */
    private generateDiffData;
    /**
     * Generate creation preview data
     */
    private generateCreationPreview;
    /**
     * Calculate diff statistics
     */
    private calculateDiffStats;
    /**
     * Generate HTML for modification preview
     */
    private getPreviewHTML;
    /**
     * Generate HTML for creation preview
     */
    private getCreationPreviewHTML;
    /**
     * Render diff lines with syntax highlighting
     */
    private renderDiffLines;
    /**
     * Render code lines with line numbers
     */
    private renderCodeLines;
    /**
     * Get CSS for preview
     */
    private getPreviewCSS;
    private getRiskText;
    private formatFileSize;
    private escapeHtml;
    private generateNonce;
    /**
     * Dispose all preview panels
     */
    dispose(): void;
}
//# sourceMappingURL=previewManager.d.ts.map