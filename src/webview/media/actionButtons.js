/**
 * Action Buttons JavaScript
 * Handles interactions with Apply/Create buttons in chat messages
 */

class ActionButtonsManager {
  constructor() {
    this.vscode = acquireVsCodeApi();
    this.activeButtons = new Map();
    this.init();
  }

  init() {
    // Listen for messages from extension
    window.addEventListener('message', (event) => {
      const message = event.data;
      
      switch (message.type) {
        case 'ACTION_BUTTON_UPDATE':
          this.updateButtonStatus(message.payload.buttonId, message.payload.status);
          break;
      }
    });

    // Set up event delegation for button clicks
    document.addEventListener('click', (event) => {
      const button = event.target.closest('.action-button');
      if (button && !button.classList.contains('disabled')) {
        this.handleButtonClick(button);
      }
    });

    // Set up keyboard navigation
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        const button = event.target.closest('.action-button');
        if (button && !button.classList.contains('disabled')) {
          event.preventDefault();
          this.handleButtonClick(button);
        }
      }
    });
  }

  /**
   * Handle button click
   */
  handleButtonClick(buttonElement) {
    const buttonId = buttonElement.dataset.buttonId;
    const messageId = this.findMessageId(buttonElement);

    if (!buttonId || !messageId) {
      console.error('Missing button ID or message ID');
      return;
    }

    // Update button to loading state
    this.setButtonLoading(buttonElement, true);

    // Send message to extension
    this.vscode.postMessage({
      type: 'ACTION_BUTTON_CLICK',
      payload: {
        buttonId,
        messageId
      }
    });

    // Store button reference
    this.activeButtons.set(buttonId, buttonElement);
  }

  /**
   * Update button status
   */
  updateButtonStatus(buttonId, status) {
    const buttonElement = this.activeButtons.get(buttonId);
    if (!buttonElement) {
      return;
    }

    const statusElement = buttonElement.querySelector(`#status-${buttonId}`);
    if (!statusElement) {
      return;
    }

    // Update status based on type
    switch (status) {
      case 'loading':
        this.setButtonLoading(buttonElement, true);
        break;
      case 'success':
        this.setButtonSuccess(buttonElement);
        break;
      case 'error':
        this.setButtonError(buttonElement);
        break;
      case 'completed':
        this.setButtonCompleted(buttonElement);
        break;
      default:
        this.setButtonReady(buttonElement);
    }
  }

  /**
   * Set button to loading state
   */
  setButtonLoading(buttonElement, isLoading) {
    const statusElement = buttonElement.querySelector('.button-status');
    const iconElement = statusElement.querySelector('.status-icon');
    const textElement = statusElement.querySelector('.status-text');

    if (isLoading) {
      buttonElement.classList.add('loading');
      buttonElement.classList.add('disabled');
      statusElement.className = 'button-status loading';
      iconElement.textContent = '⏳';
      textElement.textContent = 'Processing...';
    } else {
      buttonElement.classList.remove('loading');
      buttonElement.classList.remove('disabled');
      this.setButtonReady(buttonElement);
    }
  }

  /**
   * Set button to success state
   */
  setButtonSuccess(buttonElement) {
    const statusElement = buttonElement.querySelector('.button-status');
    const iconElement = statusElement.querySelector('.status-icon');
    const textElement = statusElement.querySelector('.status-text');

    buttonElement.classList.remove('loading');
    buttonElement.classList.add('disabled');
    statusElement.className = 'button-status success';
    iconElement.textContent = '✅';
    textElement.textContent = 'Applied!';

    // Auto-hide success state after 3 seconds
    setTimeout(() => {
      this.setButtonCompleted(buttonElement);
    }, 3000);
  }

  /**
   * Set button to error state
   */
  setButtonError(buttonElement) {
    const statusElement = buttonElement.querySelector('.button-status');
    const iconElement = statusElement.querySelector('.status-icon');
    const textElement = statusElement.querySelector('.status-text');

    buttonElement.classList.remove('loading');
    buttonElement.classList.remove('disabled');
    statusElement.className = 'button-status error';
    iconElement.textContent = '❌';
    textElement.textContent = 'Failed';

    // Auto-reset error state after 5 seconds
    setTimeout(() => {
      this.setButtonReady(buttonElement);
    }, 5000);
  }

  /**
   * Set button to completed state
   */
  setButtonCompleted(buttonElement) {
    const statusElement = buttonElement.querySelector('.button-status');
    const iconElement = statusElement.querySelector('.status-icon');
    const textElement = statusElement.querySelector('.status-text');

    buttonElement.classList.remove('loading');
    buttonElement.classList.add('disabled');
    statusElement.className = 'button-status disabled';
    iconElement.textContent = '✓';
    textElement.textContent = 'Completed';
  }

  /**
   * Set button to ready state
   */
  setButtonReady(buttonElement) {
    const statusElement = buttonElement.querySelector('.button-status');
    const iconElement = statusElement.querySelector('.status-icon');
    const textElement = statusElement.querySelector('.status-text');

    buttonElement.classList.remove('loading', 'disabled');
    statusElement.className = 'button-status ready';
    iconElement.textContent = '⏳';
    textElement.textContent = 'Ready';
  }

  /**
   * Find message ID from button element
   */
  findMessageId(buttonElement) {
    const messageElement = buttonElement.closest('.message');
    return messageElement ? messageElement.dataset.messageId : null;
  }

  /**
   * Create action buttons HTML
   */
  static createActionButtonsHTML(buttons) {
    if (!buttons || buttons.length === 0) {
      return '';
    }

    const buttonElements = buttons.map(button => 
      ActionButtonsManager.createSingleButtonHTML(button)
    ).join('');

    return `
      <div class="action-buttons-container">
        <div class="action-buttons-header">
          <span class="action-buttons-title">💡 Quick Actions</span>
          <span class="action-buttons-count">${buttons.length} action${buttons.length > 1 ? 's' : ''} available</span>
        </div>
        <div class="action-buttons-list">
          ${buttonElements}
        </div>
      </div>
    `;
  }

  /**
   * Create single button HTML
   */
  static createSingleButtonHTML(button) {
    const riskClass = `risk-${button.action.metadata.riskLevel}`;
    const enabledClass = button.enabled ? 'enabled' : 'disabled';
    const confidencePercent = Math.round(button.action.metadata.confidence * 100);
    
    return `
      <div class="action-button ${riskClass} ${enabledClass}" 
           data-button-id="${button.id}"
           title="${button.tooltip}"
           tabindex="0"
           role="button"
           aria-label="${button.label}"
           ${button.enabled ? '' : 'aria-disabled="true"'}>
        <div class="button-main">
          <span class="button-icon">${button.icon}</span>
          <span class="button-label">${button.label}</span>
          <span class="button-confidence">${confidencePercent}%</span>
        </div>
        <div class="button-details">
          <span class="button-risk">${ActionButtonsManager.getRiskText(button.action.metadata.riskLevel)}</span>
          <span class="button-impact">${button.action.metadata.estimatedImpact}</span>
        </div>
        <div class="button-status" id="status-${button.id}">
          <span class="status-icon">⏳</span>
          <span class="status-text">Ready</span>
        </div>
      </div>
    `;
  }

  /**
   * Get human-readable risk text
   */
  static getRiskText(riskLevel) {
    switch (riskLevel) {
      case 'low':
        return '🟢 Low Risk';
      case 'medium':
        return '🟡 Medium Risk';
      case 'high':
        return '🟠 High Risk';
      case 'critical':
        return '🔴 Critical Risk';
      default:
        return '⚪ Unknown Risk';
    }
  }

  /**
   * Add action buttons to a message
   */
  static addActionButtonsToMessage(messageElement, buttons) {
    if (!buttons || buttons.length === 0) {
      return;
    }

    const buttonsHTML = ActionButtonsManager.createActionButtonsHTML(buttons);
    const contentElement = messageElement.querySelector('.message-content');
    
    if (contentElement) {
      contentElement.insertAdjacentHTML('afterend', buttonsHTML);
    }
  }

  /**
   * Remove action buttons from a message
   */
  static removeActionButtonsFromMessage(messageElement) {
    const buttonsContainer = messageElement.querySelector('.action-buttons-container');
    if (buttonsContainer) {
      buttonsContainer.remove();
    }
  }

  /**
   * Update button configuration
   */
  updateButtonConfig(buttonId, config) {
    const buttonElement = this.activeButtons.get(buttonId);
    if (!buttonElement) {
      return;
    }

    // Update enabled state
    if (config.enabled !== undefined) {
      if (config.enabled) {
        buttonElement.classList.remove('disabled');
        buttonElement.removeAttribute('aria-disabled');
      } else {
        buttonElement.classList.add('disabled');
        buttonElement.setAttribute('aria-disabled', 'true');
      }
    }

    // Update tooltip
    if (config.tooltip) {
      buttonElement.title = config.tooltip;
    }

    // Update label
    if (config.label) {
      const labelElement = buttonElement.querySelector('.button-label');
      if (labelElement) {
        labelElement.textContent = config.label;
      }
    }
  }

  /**
   * Get button statistics
   */
  getButtonStats() {
    return {
      totalButtons: this.activeButtons.size,
      enabledButtons: Array.from(this.activeButtons.values()).filter(btn => !btn.classList.contains('disabled')).length,
      loadingButtons: Array.from(this.activeButtons.values()).filter(btn => btn.classList.contains('loading')).length
    };
  }

  /**
   * Clear all buttons
   */
  clearAllButtons() {
    this.activeButtons.clear();
    document.querySelectorAll('.action-buttons-container').forEach(container => {
      container.remove();
    });
  }
}

// Initialize action buttons manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.actionButtonsManager = new ActionButtonsManager();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ActionButtonsManager;
}
