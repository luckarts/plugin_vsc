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
exports.SecretManager = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Secure secret manager using VSCode's SecretStorage API
 * Provides secure storage for Claude API keys
 */
class SecretManager {
    constructor(context) {
        this.secretStorage = context.secrets;
    }
    /**
     * Securely store the Claude API key
     * @param apiKey The API key to store
     */
    async storeApiKey(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            throw new Error('Invalid API key provided');
        }
        try {
            await this.secretStorage.store(SecretManager.API_KEY_SECRET_ID, apiKey.trim());
            vscode.window.showInformationMessage('Claude API key stored securely');
        }
        catch (error) {
            const errorMessage = `Failed to store API key: ${error instanceof Error ? error.message : 'Unknown error'}`;
            vscode.window.showErrorMessage(errorMessage);
            throw new Error(errorMessage);
        }
    }
    /**
     * Retrieve the stored Claude API key
     * @returns The stored API key or undefined if not found
     */
    async getApiKey() {
        try {
            const apiKey = await this.secretStorage.get(SecretManager.API_KEY_SECRET_ID);
            return apiKey?.trim();
        }
        catch (error) {
            const errorMessage = `Failed to retrieve API key: ${error instanceof Error ? error.message : 'Unknown error'}`;
            vscode.window.showErrorMessage(errorMessage);
            return undefined;
        }
    }
    /**
     * Delete the stored Claude API key
     */
    async deleteApiKey() {
        try {
            await this.secretStorage.delete(SecretManager.API_KEY_SECRET_ID);
            vscode.window.showInformationMessage('Claude API key removed from secure storage');
        }
        catch (error) {
            const errorMessage = `Failed to delete API key: ${error instanceof Error ? error.message : 'Unknown error'}`;
            vscode.window.showErrorMessage(errorMessage);
            throw new Error(errorMessage);
        }
    }
    /**
     * Check if an API key is stored
     * @returns True if an API key exists in storage
     */
    async hasApiKey() {
        try {
            const apiKey = await this.getApiKey();
            return !!apiKey && apiKey.length > 0;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get API key from environment variable
     * @param variableName Name of the environment variable
     * @returns The API key from environment or undefined
     */
    getApiKeyFromEnvironment(variableName = 'CLAUDE_API_KEY') {
        const apiKey = process.env[variableName];
        return apiKey?.trim();
    }
    /**
     * Migrate API key from configuration to secure storage
     * This helps users transition from the old insecure storage method
     */
    async migrateFromConfiguration() {
        try {
            const config = vscode.workspace.getConfiguration('codeAssist');
            const configApiKey = config.get('claudeApiKey');
            if (configApiKey && configApiKey.trim().length > 0) {
                // Store in secure storage
                await this.storeApiKey(configApiKey);
                // Clear from configuration
                await config.update('claudeApiKey', '', vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage('API key migrated to secure storage. The key has been removed from your settings.');
                return true;
            }
            return false;
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to migrate API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }
}
exports.SecretManager = SecretManager;
SecretManager.API_KEY_SECRET_ID = 'codeAssist.claudeApiKey';
//# sourceMappingURL=secretManager.js.map