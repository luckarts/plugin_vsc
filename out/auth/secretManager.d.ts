import * as vscode from 'vscode';
import { ISecretManager } from './types';
/**
 * Secure secret manager using VSCode's SecretStorage API
 * Provides secure storage for Claude API keys
 */
export declare class SecretManager implements ISecretManager {
    private static readonly API_KEY_SECRET_ID;
    private readonly secretStorage;
    constructor(context: vscode.ExtensionContext);
    /**
     * Securely store the Claude API key
     * @param apiKey The API key to store
     */
    storeApiKey(apiKey: string): Promise<void>;
    /**
     * Retrieve the stored Claude API key
     * @returns The stored API key or undefined if not found
     */
    getApiKey(): Promise<string | undefined>;
    /**
     * Delete the stored Claude API key
     */
    deleteApiKey(): Promise<void>;
    /**
     * Check if an API key is stored
     * @returns True if an API key exists in storage
     */
    hasApiKey(): Promise<boolean>;
    /**
     * Get API key from environment variable
     * @param variableName Name of the environment variable
     * @returns The API key from environment or undefined
     */
    getApiKeyFromEnvironment(variableName?: string): string | undefined;
    /**
     * Migrate API key from configuration to secure storage
     * This helps users transition from the old insecure storage method
     */
    migrateFromConfiguration(): Promise<boolean>;
}
//# sourceMappingURL=secretManager.d.ts.map