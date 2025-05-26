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
exports.AuthenticationManager = void 0;
const vscode = __importStar(require("vscode"));
const secretManager_1 = require("./secretManager");
const apiKeyValidator_1 = require("./apiKeyValidator");
const types_1 = require("./types");
/**
 * Main authentication manager for Claude API
 * Handles API key configuration, validation, and management
 */
class AuthenticationManager {
    constructor(context) {
        this.secretManager = new secretManager_1.SecretManager(context);
        this.validator = new apiKeyValidator_1.ApiKeyValidator();
        this.config = this.loadConfiguration();
    }
    /**
     * Initialize the authentication manager
     */
    async initialize() {
        try {
            // Migrate from old configuration if needed
            await this.secretManager.migrateFromConfiguration();
            // Auto-validate API key if enabled
            if (this.config.autoValidateApiKey) {
                const isAuthenticated = await this.isAuthenticated();
                if (!isAuthenticated) {
                    vscode.window.showWarningMessage('Claude API key not configured or invalid. Please configure your API key.', 'Configure Now').then(selection => {
                        if (selection === 'Configure Now') {
                            vscode.commands.executeCommand('codeAssist.configureApiKey');
                        }
                    });
                }
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Authentication initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get a valid API key, prompting user if necessary
     * @returns A valid API key
     */
    async getValidApiKey() {
        const apiKeySource = await this.getApiKeySource();
        if (!apiKeySource) {
            throw new types_1.AuthenticationException(types_1.AuthenticationError.NO_API_KEY, 'No API key configured. Please configure your Claude API key.');
        }
        if (!apiKeySource.isValid) {
            throw new types_1.AuthenticationException(types_1.AuthenticationError.INVALID_API_KEY, 'Configured API key is invalid. Please reconfigure your Claude API key.');
        }
        return apiKeySource.value;
    }
    /**
     * Configure API key through user interface
     * @returns True if configuration was successful
     */
    async configureApiKey() {
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
            }
            else {
                return await this.configureEnvironmentVariable();
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to configure API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }
    /**
     * Validate the currently configured API key
     * @returns Validation result
     */
    async validateCurrentApiKey() {
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
    async revokeApiKey() {
        const confirmation = await vscode.window.showWarningMessage('Are you sure you want to revoke the Claude API key? This will remove it from secure storage.', 'Yes, Revoke', 'Cancel');
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
    async isAuthenticated() {
        try {
            const apiKeySource = await this.getApiKeySource();
            return !!apiKeySource && apiKeySource.isValid;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get API key from the configured source
     * @returns API key source information
     */
    async getApiKeySource() {
        this.config = this.loadConfiguration(); // Reload config
        let apiKey;
        let sourceType;
        if (this.config.useEnvironmentVariable) {
            apiKey = this.secretManager.getApiKeyFromEnvironment(this.config.environmentVariableName);
            sourceType = 'environment';
        }
        else {
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
    async configureApiKeyManually() {
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
            vscode.window.showErrorMessage(`API key validation failed: ${apiKeyValidator_1.ApiKeyValidator.getValidationErrorMessage(validation)}`);
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
    async configureEnvironmentVariable() {
        const config = vscode.workspace.getConfiguration('codeAssist');
        const currentVarName = config.get('environmentVariableName') || 'CLAUDE_API_KEY';
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
            vscode.window.showErrorMessage(`Environment variable '${varName}' not found. Please set it and restart VSCode.`);
            return false;
        }
        // Validate the key from environment
        vscode.window.showInformationMessage('Validating API key from environment...');
        const validation = await this.validator.validateApiKey(apiKey);
        if (!validation.isValid) {
            vscode.window.showErrorMessage(`API key from environment variable is invalid: ${apiKeyValidator_1.ApiKeyValidator.getValidationErrorMessage(validation)}`);
            return false;
        }
        // Update configuration
        await config.update('useEnvironmentVariable', true, vscode.ConfigurationTarget.Global);
        await config.update('environmentVariableName', varName, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`Successfully configured to use environment variable '${varName}' for Claude API key!`);
        return true;
    }
    /**
     * Load current authentication configuration
     */
    loadConfiguration() {
        const config = vscode.workspace.getConfiguration('codeAssist');
        return {
            useEnvironmentVariable: config.get('useEnvironmentVariable') || false,
            environmentVariableName: config.get('environmentVariableName') || 'CLAUDE_API_KEY',
            autoValidateApiKey: config.get('autoValidateApiKey') || true,
            apiKeyValidationTimeout: config.get('apiKeyValidationTimeout') || 10000
        };
    }
}
exports.AuthenticationManager = AuthenticationManager;
//# sourceMappingURL=authenticationManager.js.map