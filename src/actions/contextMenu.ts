import * as vscode from 'vscode';
import { ICodeAction, ActionType } from './types';

/**
 * Manages compact context menus for code actions
 * Provides Apply, Copy, Create, Go to options
 */
export class ContextMenuManager {
  private readonly context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Show context menu for code action
   * @param action The code action
   * @param position Position to show menu
   * @returns Promise resolving to selected action
   */
  async showActionMenu(
    action: ICodeAction,
    position?: vscode.Position
  ): Promise<string | undefined> {
    const menuItems = this.buildMenuItems(action);

    const selected = await vscode.window.showQuickPick(menuItems, {
      placeHolder: `Choose action for: ${action.description}`,
      matchOnDescription: true,
      matchOnDetail: true
    });

    return selected?.id;
  }

  /**
   * Show inline context menu in webview
   * @param action The code action
   * @param elementId Element ID to attach menu to
   * @returns HTML for inline menu
   */
  createInlineMenu(action: ICodeAction, elementId: string): string {
    const menuItems = this.buildMenuItems(action);

    return `
      <div class="context-menu" id="menu-${elementId}">
        <div class="menu-trigger" onclick="toggleMenu('${elementId}')">
          <span class="menu-icon">⋯</span>
        </div>
        <div class="menu-dropdown" id="dropdown-${elementId}">
          ${menuItems.map(item => this.renderMenuItem(item, elementId)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Build menu items based on action type
   */
  private buildMenuItems(action: ICodeAction): IMenuItem[] {
    const items: IMenuItem[] = [];

    // Apply action (for modifications)
    if (action.type === ActionType.APPLY_MODIFICATION ||
        action.type === ActionType.FIX_ERROR ||
        action.type === ActionType.REFACTOR_CODE) {
      items.push({
        id: 'apply',
        label: 'Apply',
        icon: '$(check)',
        description: 'Apply changes to file',
        detail: `Modify ${action.targetFile || 'current file'}`,
        primary: true
      });
    }

    // Create action (for new files)
    if (action.type === ActionType.CREATE_FILE ||
        action.type === ActionType.CREATE_FUNCTION ||
        action.type === ActionType.CREATE_CLASS ||
        action.type === ActionType.CREATE_COMPONENT) {
      items.push({
        id: 'create',
        label: 'Create',
        icon: '$(file-add)',
        description: 'Create new file',
        detail: `Create ${action.targetFile || 'new file'}`,
        primary: true
      });
    }

    // Copy action (always available)
    items.push({
      id: 'copy',
      label: 'Copy',
      icon: '$(copy)',
      description: 'Copy code to clipboard',
      detail: 'Copy generated code',
      primary: false
    });

    // Go to action (if target file exists)
    if (action.targetFile) {
      items.push({
        id: 'goto',
        label: 'Go to',
        icon: '$(go-to-file)',
        description: 'Open target file',
        detail: `Open ${action.targetFile}`,
        primary: false
      });
    }

    // Preview action (for complex changes)
    if (this.shouldShowPreview(action)) {
      items.push({
        id: 'preview',
        label: 'Preview',
        icon: '$(eye)',
        description: 'Preview changes',
        detail: 'Show diff before applying',
        primary: false
      });
    }

    // Edit action (for customization)
    items.push({
      id: 'edit',
      label: 'Edit',
      icon: '$(edit)',
      description: 'Edit before applying',
      detail: 'Customize the generated code',
      primary: false
    });

    // Save as template (for reusable actions)
    if (this.canSaveAsTemplate(action)) {
      items.push({
        id: 'template',
        label: 'Save as Template',
        icon: '$(bookmark)',
        description: 'Save as reusable template',
        detail: 'Create template for future use',
        primary: false
      });
    }

    return items;
  }

  /**
   * Render single menu item
   */
  private renderMenuItem(item: IMenuItem, elementId: string): string {
    const itemClass = `menu-item ${item.primary ? 'primary' : 'secondary'}`;

    return `
      <div class="${itemClass}" onclick="executeAction('${item.id}', '${elementId}')">
        <div class="item-icon">${this.getIconHtml(item.icon)}</div>
        <div class="item-content">
          <div class="item-label">${item.label}</div>
          <div class="item-description">${item.description}</div>
        </div>
        <div class="item-shortcut">${this.getShortcut(item.id)}</div>
      </div>
    `;
  }

  /**
   * Get CSS for context menu
   */
  getMenuCSS(): string {
    return `
      /* Context Menu Styles */
      .context-menu {
        position: relative;
        display: inline-block;
      }

      .menu-trigger {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
        background: transparent;
        border: 1px solid transparent;
      }

      .menu-trigger:hover {
        background: var(--vscode-toolbar-hoverBackground);
        border-color: var(--vscode-focusBorder);
      }

      .menu-icon {
        font-size: 14px;
        color: var(--vscode-foreground);
        font-weight: bold;
      }

      .menu-dropdown {
        position: absolute;
        top: 100%;
        right: 0;
        min-width: 200px;
        background: var(--vscode-menu-background);
        border: 1px solid var(--vscode-menu-border);
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-8px);
        transition: all 0.2s ease;
        overflow: hidden;
      }

      .menu-dropdown.show {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }

      .menu-item {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        cursor: pointer;
        transition: background-color 0.15s ease;
        border-bottom: 1px solid var(--vscode-menu-separatorBackground);
      }

      .menu-item:last-child {
        border-bottom: none;
      }

      .menu-item:hover {
        background: var(--vscode-menu-selectionBackground);
        color: var(--vscode-menu-selectionForeground);
      }

      .menu-item.primary {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
      }

      .menu-item.primary:hover {
        background: var(--vscode-button-hoverBackground);
      }

      .item-icon {
        width: 16px;
        height: 16px;
        margin-right: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
      }

      .item-content {
        flex: 1;
        min-width: 0;
      }

      .item-label {
        font-size: 13px;
        font-weight: 500;
        margin-bottom: 2px;
      }

      .item-description {
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .item-shortcut {
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        margin-left: 8px;
        font-family: var(--vscode-editor-font-family);
      }

      /* Compact menu variant */
      .context-menu.compact .menu-dropdown {
        min-width: 120px;
      }

      .context-menu.compact .menu-item {
        padding: 6px 8px;
      }

      .context-menu.compact .item-description {
        display: none;
      }

      .context-menu.compact .item-shortcut {
        display: none;
      }

      /* Animation for menu appearance */
      @keyframes menuSlideIn {
        from {
          opacity: 0;
          transform: translateY(-8px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .menu-dropdown.show {
        animation: menuSlideIn 0.2s ease-out;
      }

      /* Dark theme adjustments */
      .vscode-dark .menu-dropdown {
        background: var(--vscode-menu-background);
        border-color: var(--vscode-menu-border);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }

      /* High contrast theme */
      .vscode-high-contrast .menu-dropdown {
        border: 2px solid var(--vscode-contrastBorder);
      }

      .vscode-high-contrast .menu-item:hover {
        outline: 1px solid var(--vscode-contrastActiveBorder);
      }
    `;
  }

  /**
   * Get JavaScript for menu interactions
   */
  getMenuJavaScript(): string {
    return `
      // Context Menu JavaScript
      let activeMenu = null;

      function toggleMenu(elementId) {
        const dropdown = document.getElementById('dropdown-' + elementId);
        const isVisible = dropdown.classList.contains('show');

        // Close any open menu
        closeAllMenus();

        if (!isVisible) {
          dropdown.classList.add('show');
          activeMenu = elementId;

          // Close menu when clicking outside
          setTimeout(() => {
            document.addEventListener('click', handleOutsideClick);
          }, 0);
        }
      }

      function closeAllMenus() {
        document.querySelectorAll('.menu-dropdown').forEach(dropdown => {
          dropdown.classList.remove('show');
        });
        document.removeEventListener('click', handleOutsideClick);
        activeMenu = null;
      }

      function handleOutsideClick(event) {
        if (!event.target.closest('.context-menu')) {
          closeAllMenus();
        }
      }

      function executeAction(actionId, elementId) {
        closeAllMenus();

        // Send action to extension
        if (typeof vscode !== 'undefined') {
          vscode.postMessage({
            type: 'CONTEXT_MENU_ACTION',
            payload: {
              actionId,
              elementId
            }
          });
        }

        // Visual feedback
        showActionFeedback(actionId, elementId);
      }

      function showActionFeedback(actionId, elementId) {
        const trigger = document.querySelector('#menu-' + elementId + ' .menu-trigger');
        if (trigger) {
          trigger.style.background = 'var(--vscode-button-background)';
          trigger.style.color = 'var(--vscode-button-foreground)';

          setTimeout(() => {
            trigger.style.background = '';
            trigger.style.color = '';
          }, 200);
        }
      }

      // Keyboard navigation
      document.addEventListener('keydown', (event) => {
        if (activeMenu) {
          const dropdown = document.getElementById('dropdown-' + activeMenu);
          const items = dropdown.querySelectorAll('.menu-item');
          let selectedIndex = Array.from(items).findIndex(item =>
            item.classList.contains('selected')
          );

          switch (event.key) {
            case 'Escape':
              closeAllMenus();
              break;
            case 'ArrowDown':
              event.preventDefault();
              selectedIndex = (selectedIndex + 1) % items.length;
              updateSelection(items, selectedIndex);
              break;
            case 'ArrowUp':
              event.preventDefault();
              selectedIndex = selectedIndex <= 0 ? items.length - 1 : selectedIndex - 1;
              updateSelection(items, selectedIndex);
              break;
            case 'Enter':
              event.preventDefault();
              if (selectedIndex >= 0) {
                items[selectedIndex].click();
              }
              break;
          }
        }
      });

      function updateSelection(items, selectedIndex) {
        items.forEach((item, index) => {
          item.classList.toggle('selected', index === selectedIndex);
        });
      }

      // Initialize menus
      document.addEventListener('DOMContentLoaded', () => {
        // Add keyboard shortcuts
        document.addEventListener('keydown', (event) => {
          if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
              case 'Enter':
                // Quick apply
                const applyBtn = document.querySelector('[data-action="apply"]');
                if (applyBtn) {
                  event.preventDefault();
                  applyBtn.click();
                }
                break;
              case 'c':
                // Quick copy
                if (event.shiftKey) {
                  event.preventDefault();
                  const copyBtn = document.querySelector('[data-action="copy"]');
                  if (copyBtn) copyBtn.click();
                }
                break;
            }
          }
        });
      });
    `;
  }

  /**
   * Check if preview should be shown
   */
  private shouldShowPreview(action: ICodeAction): boolean {
    const hasHighRisk = action.metadata?.riskLevel === 'high' ||
                       action.metadata?.riskLevel === 'critical';
    const isRefactor = action.type === ActionType.REFACTOR_CODE;
    const isLongContent = action.content && action.content.split('\n').length > 20;

    return hasHighRisk || isRefactor || Boolean(isLongContent);
  }

  /**
   * Check if action can be saved as template
   */
  private canSaveAsTemplate(action: ICodeAction): boolean {
    return action.type === ActionType.CREATE_FUNCTION ||
           action.type === ActionType.CREATE_CLASS ||
           action.type === ActionType.CREATE_COMPONENT;
  }

  /**
   * Get icon HTML
   */
  private getIconHtml(icon: string): string {
    // Convert VSCode icons to emoji/symbols for webview
    const iconMap: Record<string, string> = {
      '$(check)': '✅',
      '$(file-add)': '📄',
      '$(copy)': '📋',
      '$(go-to-file)': '🔗',
      '$(eye)': '👁️',
      '$(edit)': '✏️',
      '$(bookmark)': '🔖'
    };

    return iconMap[icon] || icon;
  }

  /**
   * Get keyboard shortcut for action
   */
  private getShortcut(actionId: string): string {
    const shortcuts: Record<string, string> = {
      'apply': 'Ctrl+Enter',
      'copy': 'Ctrl+Shift+C',
      'goto': 'Ctrl+G',
      'preview': 'Ctrl+P',
      'edit': 'Ctrl+E'
    };

    return shortcuts[actionId] || '';
  }
}

// Interface for menu items
interface IMenuItem {
  id: string;
  label: string;
  icon: string;
  description: string;
  detail: string;
  primary: boolean;
}
