import * as vscode from 'vscode';
import { AuthenticationManager } from './auth/authenticationManager';
export declare class ClaudeClient {
    private authManager;
    constructor(context: vscode.ExtensionContext);
    /**
     * Initialize the Claude client
     */
    initialize(): Promise<void>;
    /**
     * Get completion from Claude API with enhanced context
     * @param query User query
     * @param enhancedContext Enhanced context with code and editor info
     * @returns Claude's response
     */
    getCompletion(query: string, enhancedContext: any): Promise<string>;
    /**
     * Test the connection to Claude API
     * @returns True if connection is successful
     */
    testConnection(): Promise<boolean>;
    /**
     * Build messages array for Claude API
     * @param query User query
     * @param enhancedContext Context information
     * @returns Messages array
     */
    private buildMessages;
    /**
     * Make API call to Claude
     * @param apiKey API key
     * @param messages Messages array
     * @returns API response
     */
    private callClaudeApi;
    /**
     * Extract content from Claude API response
     * @param response API response
     * @returns Extracted content
     */
    private extractContentFromResponse;
    /**
     * Get authentication manager instance
     * @returns Authentication manager
     */
    getAuthManager(): AuthenticationManager;
}
//# sourceMappingURL=claudeClient.d.ts.map