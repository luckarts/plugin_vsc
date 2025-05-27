import * as vscode from 'vscode';
import { ICodeAction } from './types';
/**
 * Manages compact context menus for code actions
 * Provides Apply, Copy, Create, Go to options
 */
export declare class ContextMenuManager {
    private readonly context;
    constructor(context: vscode.ExtensionContext);
    /**
     * Show context menu for code action
     * @param action The code action
     * @param position Position to show menu
     * @returns Promise resolving to selected action
     */
    showActionMenu(action: ICodeAction, position?: vscode.Position): Promise<string | undefined>;
    /**
     * Show inline context menu in webview
     * @param action The code action
     * @param elementId Element ID to attach menu to
     * @returns HTML for inline menu
     */
    createInlineMenu(action: ICodeAction, elementId: string): string;
    /**
     * Build menu items based on action type
     */
    private buildMenuItems;
    /**
     * Render single menu item
     */
    private renderMenuItem;
    /**
     * Get CSS for context menu
     */
    getMenuCSS(): string;
    /**
     * Get JavaScript for menu interactions
     */
    getMenuJavaScript(): string;
    /**
     * Check if preview should be shown
     */
    private shouldShowPreview;
    /**
     * Check if action can be saved as template
     */
    private canSaveAsTemplate;
    /**
     * Get icon HTML
     */
    private getIconHtml;
    /**
     * Get keyboard shortcut for action
     */
    private getShortcut;
}
//# sourceMappingURL=contextMenu.d.ts.map