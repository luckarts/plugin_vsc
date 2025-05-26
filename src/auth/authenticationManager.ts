import * as vscode from 'vscode';
import { SecretManager } from './secretManager';
import { ApiKeyValidator } from './apiKeyValidator';
import { 
  IAuthenticationManager, 
  IApiKeyValidationResult, 
  IAuthenticationConfig,
  AuthenticationError,
  AuthenticationException,
  IApiKeySource
} from './types';

/**
 * Main authentication manager for Claude API
 * Handles API key configuration, validation, and management
 */
export class AuthenticationManager implements IAuthenticationManager {
  private readonly secretManager: SecretManager;
  private readonly validator: ApiKeyValidator;
  private config: IAuthenticationConfig;

  constructor(context: vscode.ExtensionContext) {
    this.secretManager = new SecretManager(context);
    this.validator = new ApiKeyValidator();
    this.config = this.loadConfiguration();
  }

  /**
   * Initialize the authentication manager
   */
  async initialize(): Promise<void> {
    try {
      // Migrate from old configuration if needed
      await this.secretManager.migrateFromConfiguration();

      // Auto-validate API key if enabled
      if (this.config.autoValidateApiKey) {
        const isAuthenticated = await this.isAuthenticated();
        if (!isAuthenticated) {
          vscode.window.showWarningMessage(
            'Claude API key not configured or invalid. Please configure your API key.',
            'Configure Now'
          ).then(selection => {
            if (selection === 'Configure Now') {
              vscode.commands.executeCommand('codeAssist.configureApiKey');
            }
          });
        }
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Authentication initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get a valid API key, prompting user if necessary
   * @returns A valid API key
   */
  async getValidApiKey(): Promise<string> {
    const apiKeySource = await this.getApiKeySource();
    
    if (!apiKeySource) {
      throw new AuthenticationException(
        AuthenticationError.NO_API_KEY,
        'No API key configured. Please configure your Claude API key.'
      );
    }

    if (!apiKeySource.isValid) {
      throw new AuthenticationException(
        AuthenticationError.INVALID_API_KEY,
        'Configured API key is invalid. Please reconfigure your Claude API key.'
      );
    }

    return apiKeySource.value;
  }

  /**
   * Configure API key through user interface
   * @returns True if configuration was successful
   */
  async configureApiKey(): Promise<boolean> {
    try {
      const options = ['Enter API Key Manually', 'Use Environment Variable'];
      const choice = await vscode.window.showQuickPick(options, {
        placeHolder: 'How would you like to configure your Claude API key?'
      });

      if (!choice) {
        return false;
      }

      if (choice === 'Enter API Key Manually') {
        return await this.configureApiKeyManually();
      } else {
        return await this.configureEnvironmentVariable();
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to configure API key: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return false;
    }
  }

  /**
   * Validate the currently configured API key
   * @returns Validation result
   */
  async validateCurrentApiKey(): Promise<IApiKeyValidationResult> {
    const apiKeySource = await this.getApiKeySource();
    
    if (!apiKeySource) {
      return {
        isValid: false,
        error: 'No API key configured'
      };
    }

    return await this.validator.validateApiKey(apiKeySource.value);
  }

  /**
   * Revoke the current API key
   */
  async revokeApiKey(): Promise<void> {
    const confirmation = await vscode.window.showWarningMessage(
      'Are you sure you want to revoke the Claude API key? This will remove it from secure storage.',
      'Yes, Revoke',
      'Cancel'
    );

    if (confirmation === 'Yes, Revoke') {
      await this.secretManager.deleteApiKey();
      
      // Also clear environment variable setting if enabled
      const config = vscode.workspace.getConfiguration('codeAssist');
      await config.update('useEnvironmentVariable', false, vscode.ConfigurationTarget.Global);
      
      vscode.window.showInformationMessage('Claude API key has been revoked successfully.');
    }
  }

  /**
   * Check if user is authenticated with a valid API key
   * @returns True if authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const apiKeySource = await this.getApiKeySource();
      return !!apiKeySource && apiKeySource.isValid;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get API key from the configured source
   * @returns API key source information
   */
  private async getApiKeySource(): Promise<IApiKeySource | null> {
    this.config = this.loadConfiguration(); // Reload config

    let apiKey: string | undefined;
    let sourceType: 'environment' | 'secure_storage' | 'configuration';

    if (this.config.useEnvironmentVariable) {
      apiKey = this.secretManager.getApiKeyFromEnvironment(this.config.environmentVariableName);
      sourceType = 'environment';
    } else {
      apiKey = await this.secretManager.getApiKey();
      sourceType = 'secure_storage';
    }

    if (!apiKey) {
      return null;
    }

    // Validate the key
    const validation = await this.validator.validateApiKey(apiKey);

    return {
      type: sourceType,
      value: apiKey,
      isValid: validation.isValid
    };
  }

  /**
   * Configure API key manually through input box
   */
  private async configureApiKeyManually(): Promise<boolean> {
    const apiKey = await vscode.window.showInputBox({
      prompt: 'Enter your Claude API key',
      password: true,
      placeHolder: 'sk-ant-...',
      validateInput: (value) => {
        if (!value || !value.trim()) {
          return 'API key cannot be empty';
        }
        if (!value.startsWith('sk-ant-')) {
          return 'Claude API keys should start with "sk-ant-"';
        }
        return null;
      }
    });

    if (!apiKey) {
      return false;
    }

    // Validate the key
    vscode.window.showInformationMessage('Validating API key...');
    const validation = await this.validator.validateApiKey(apiKey);

    if (!validation.isValid) {
      vscode.window.showErrorMessage(
        `API key validation failed: ${ApiKeyValidator.getValidationErrorMessage(validation)}`
      );
      return false;
    }

    // Store the key
    await this.secretManager.storeApiKey(apiKey);
    
    // Ensure environment variable option is disabled
    const config = vscode.workspace.getConfiguration('codeAssist');
    await config.update('useEnvironmentVariable', false, vscode.ConfigurationTarget.Global);

    vscode.window.showInformationMessage('Claude API key configured successfully!');
    return true;
  }

  /**
   * Configure to use environment variable
   */
  private async configureEnvironmentVariable(): Promise<boolean> {
    const config = vscode.workspace.getConfiguration('codeAssist');
    const currentVarName = config.get<string>('environmentVariableName') || 'CLAUDE_API_KEY';

    const varName = await vscode.window.showInputBox({
      prompt: 'Enter the name of the environment variable containing your Claude API key',
      value: currentVarName,
      validateInput: (value) => {
        if (!value || !value.trim()) {
          return 'Environment variable name cannot be empty';
        }
        return null;
      }
    });

    if (!varName) {
      return false;
    }

    // Check if environment variable exists
    const apiKey = process.env[varName];
    if (!apiKey) {
      vscode.window.showErrorMessage(
        `Environment variable '${varName}' not found. Please set it and restart VSCode.`
      );
      return false;
    }

    // Validate the key from environment
    vscode.window.showInformationMessage('Validating API key from environment...');
    const validation = await this.validator.validateApiKey(apiKey);

    if (!validation.isValid) {
      vscode.window.showErrorMessage(
        `API key from environment variable is invalid: ${ApiKeyValidator.getValidationErrorMessage(validation)}`
      );
      return false;
    }

    // Update configuration
    await config.update('useEnvironmentVariable', true, vscode.ConfigurationTarget.Global);
    await config.update('environmentVariableName', varName, vscode.ConfigurationTarget.Global);

    vscode.window.showInformationMessage(
      `Successfully configured to use environment variable '${varName}' for Claude API key!`
    );
    return true;
  }

  /**
   * Load current authentication configuration
   */
  private loadConfiguration(): IAuthenticationConfig {
    const config = vscode.workspace.getConfiguration('codeAssist');
    
    return {
      useEnvironmentVariable: config.get<boolean>('useEnvironmentVariable') || false,
      environmentVariableName: config.get<string>('environmentVariableName') || 'CLAUDE_API_KEY',
      autoValidateApiKey: config.get<boolean>('autoValidateApiKey') || true,
      apiKeyValidationTimeout: config.get<number>('apiKeyValidationTimeout') || 10000
    };
  }
}
